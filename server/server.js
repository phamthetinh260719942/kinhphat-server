// Server trung gian cho Thư Viện Kinh: (1) proxy giọng đọc /tts  (2) phòng nhiều người qua WebSocket /ws
import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import admin from 'firebase-admin';

/* ================= Cấu hình (biến môi trường trên Render) ================= */
const PORT = process.env.PORT || 3000;
const ORIGINS = (process.env.ALLOWED_ORIGIN || 'https://kinhphat.onrender.com').split(',').map(s => s.trim()).filter(Boolean);
const ALLOW_GUESTS = process.env.ALLOW_GUESTS !== 'false';
const CAP = +process.env.ROOM_CAPACITY || 30;
const TTS_PER_MIN = +process.env.TTS_RATE_PER_MIN || 60;
const okOrigin = o => !o || ORIGINS.includes(o) || (process.env.ALLOW_LOCALHOST === 'true' && /^http:\/\/localhost(:\d+)?$/.test(o));
const wsOriginOk = o => (o ? okOrigin(o) : process.env.ALLOW_NO_ORIGIN === 'true');

/* ================= Firebase Auth (chỉ để xác minh token) ================= */
let auth = null;
try {
  const { FIREBASE_PROJECT_ID: projectId, FIREBASE_CLIENT_EMAIL: clientEmail } = process.env;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
    auth = admin.auth(); console.log('Firebase Auth: bật');
  } else console.warn('Thiếu biến FIREBASE_*: chỉ cho khách vào phòng');
} catch (e) { console.error('Khởi tạo Firebase lỗi:', e.message); }

/* ================= HTTP: /health và /tts ================= */
const app = express();
app.set('trust proxy', 1);
const rooms = new Map();
app.get('/', (_q, r) => r.type('text').send('kinhphat server'));
app.get('/health', (_q, r) => r.json({ ok: true, rooms: rooms.size, players: [...rooms.values()].reduce((n, x) => n + x.players.size, 0), auth: !!auth }));

const cache = new Map(); let cacheBytes = 0; const CACHE_MAX = 40 * 1024 * 1024;     // cache LRU trong RAM
const cacheGet = k => { const v = cache.get(k); if (v) { cache.delete(k); cache.set(k, v); } return v; };
const cacheSet = (k, b) => { cache.set(k, b); cacheBytes += b.length; while (cacheBytes > CACHE_MAX) { const [kk, vv] = cache.entries().next().value; cache.delete(kk); cacheBytes -= vv.length; } };
const hits = new Map();
const limited = ip => { const now = Date.now(); let h = hits.get(ip); if (!h || now > h.reset) { h = { n: 0, reset: now + 60000 }; hits.set(ip, h); } return ++h.n > TTS_PER_MIN; };
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (now > v.reset) hits.delete(k); }, 60000).unref();
const LANGS = new Set(['vi', 'en']);

app.get('/tts', async (req, res) => {
  const origin = req.get('origin'); let refOrigin = null;
  try { if (req.get('referer')) refOrigin = new URL(req.get('referer')).origin; } catch {}
  if (!okOrigin(origin) || !okOrigin(refOrigin)) return res.status(403).send('Forbidden');
  if (origin) { res.set('Access-Control-Allow-Origin', origin); res.vary('Origin'); }
  const text = String(req.query.q || '').trim().slice(0, 200);
  if (!text) return res.status(400).send('Thiếu tham số q');
  const lang = LANGS.has(req.query.lang) ? req.query.lang : 'vi';
  if (limited(req.ip)) return res.status(429).send('Quá nhiều yêu cầu, thử lại sau');
  const key = lang + '|' + text; let buf = cacheGet(key);
  try {
    if (!buf) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
        Referer: 'https://translate.google.com/', Accept: '*/*' } });
      if (!r.ok) throw new Error('Google TTS ' + r.status);
      buf = Buffer.from(await r.arrayBuffer()); cacheSet(key, buf);
    }
    res.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=86400', 'Content-Length': buf.length }).send(buf);
  } catch (e) { console.error('TTS lỗi:', e.message); res.status(502).send('Không lấy được audio TTS'); }
});

/* ================= WebSocket: phòng nhiều người ================= */
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 2048,
  verifyClient: ({ origin }, cb) => (wsOriginOk(origin) ? cb(true) : cb(false, 403, 'Forbidden')) });
const BOUNDS = { lib: { x: 8, zmin: -260, zmax: 10 }, dharma: { x: 12, zmin: -14, zmax: 12 } };
const ROOM_RE = /^(lib|dharma:[\w-]{1,64})$/;
const EMOTE = { palms: 'chắp tay chào', bow: 'cúi đầu đảnh lễ', lay: 'lạy Phật' };
let nextId = 1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };
const bcast = (room, o, except) => { const s = JSON.stringify(o); for (const p of room.players.values()) if (p.id !== except && p.ws.readyState === 1) p.ws.send(s); };
const pub = p => ({ id: p.id, name: p.name, outfit: p.outfit, x: p.x, z: p.z, yaw: p.yaw, pose: p.pose, seat: p.seat });

function pickRoom(base) {                                   // mỗi phòng tối đa CAP người, đầy thì mở bản #2, #3…
  for (let i = 1; ; i++) {
    const name = `${base}#${i}`; let r = rooms.get(name);
    if (!r) { r = { name, kind: base.startsWith('dharma:') ? 'dharma' : 'lib', players: new Map(), seats: new Map(), dirty: new Set() }; rooms.set(name, r); }
    if (r.players.size < CAP) return r;
  }
}
function leave(ws) {
  const p = ws.p; if (!p) return; ws.p = null; const room = p.room;
  room.players.delete(p.id); if (p.seat != null) room.seats.delete(p.seat); room.dirty.delete(p.id);
  bcast(room, { t: 'leave', id: p.id }); if (!room.players.size) rooms.delete(room.name);
}
async function join(ws, m) {
  if (ws.p || ws.joining) return; ws.joining = true;
  try {
    if (typeof m.room !== 'string' || !ROOM_RE.test(m.room)) return send(ws, { t: 'error', msg: 'Phòng không hợp lệ' });
    let uid = null, tokenName = null;
    if (m.token) {
      if (!auth) return send(ws, { t: 'error', msg: 'Server chưa bật đăng nhập' });
      try { const d = await auth.verifyIdToken(String(m.token)); uid = d.uid; tokenName = d.name || null; }
      catch { return send(ws, { t: 'error', msg: 'Phiên đăng nhập không hợp lệ' }); }
    } else if (!ALLOW_GUESTS) return send(ws, { t: 'error', msg: 'Cần đăng nhập' });
    if (ws.readyState !== 1) return;
    if (uid) for (const r of rooms.values()) for (const o of r.players.values()) if (o.uid === uid) o.ws.close(4000, 'Đăng nhập nơi khác');
    const room = pickRoom(m.room), id = nextId++;
    const name = String(m.name || tokenName || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 20) || `Đạo hữu #${id}`;
    const p = { id, ws, uid, name, outfit: m.outfit === 'yellow' ? 'yellow' : 'brown', room, pose: 'stand', seat: null, lastMove: 0, lastEmote: 0,
      x: room.kind === 'dharma' ? (Math.random() - .5) * 6 : (Math.random() - .5) * 3, z: room.kind === 'dharma' ? 6 : 2.5, yaw: 0 };
    ws.p = p; room.players.set(id, p);
    send(ws, { t: 'welcome', id, room: room.name, players: [...room.players.values()].map(pub), cap: CAP });
    bcast(room, { t: 'join', p: pub(p) }, id); bcast(room, { t: 'notice', text: `${name} vào phòng` }, id);
  } finally { ws.joining = false; }
}
function act(ws, m) {
  const p = ws.p, room = p.room, now = Date.now();
  if (m.a === 'stand') {
    if (p.seat != null) room.seats.delete(p.seat); p.seat = null; p.pose = 'stand'; bcast(room, { t: 'act', id: p.id, a: 'stand' });
  } else if (m.a === 'sit' && room.kind === 'dharma') {
    if (p.seat != null) room.seats.delete(p.seat);
    let seat = Number.isInteger(m.seat) && m.seat >= 0 && m.seat < CAP ? m.seat : -1;
    if (seat < 0 || room.seats.has(seat)) { seat = -1; for (let i = 0; i < CAP; i++) if (!room.seats.has(i)) { seat = i; break; } }
    if (seat < 0) return send(ws, { t: 'error', msg: 'Hết chỗ ngồi' });
    room.seats.set(seat, p.id); p.seat = seat; p.pose = 'sit'; bcast(room, { t: 'act', id: p.id, a: 'sit', seat });
  } else if (EMOTE[m.a]) {
    if (now - p.lastEmote < 1500) return; p.lastEmote = now;
    bcast(room, { t: 'act', id: p.id, a: m.a }); bcast(room, { t: 'notice', text: `${p.name} ${EMOTE[m.a]}` });
  }
}
function move(ws, m) {
  const p = ws.p, b = BOUNDS[p.room.kind], x = num(m.x), z = num(m.z), yaw = num(m.yaw);
  if (x === null || z === null || yaw === null || p.pose === 'sit') return;
  const now = Date.now(), dt = Math.max(.05, (now - p.lastMove) / 1000); p.lastMove = now;
  const nx = clamp(x, -b.x, b.x), nz = clamp(z, b.zmin, b.zmax);
  if (Math.hypot(nx - p.x, nz - p.z) > 9 * dt + 1) return send(ws, { t: 'pos', x: p.x, z: p.z });   // đi quá nhanh: kéo về
  p.x = nx; p.z = nz; p.yaw = clamp(yaw, -100, 100); p.room.dirty.add(p.id);
}
wss.on('connection', ws => {
  ws.isAlive = true; ws.cnt = 0;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', raw => {
    if (++ws.cnt > 40) return;                               // tối đa 40 tin/giây mỗi kết nối
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'join') return join(ws, m);
    if (m.t === 'ping') return send(ws, { t: 'pong' });
    if (!ws.p) return;
    if (m.t === 'move') move(ws, m); else if (m.t === 'act') act(ws, m);
  });
  ws.on('close', () => leave(ws)); ws.on('error', () => {});
});
setInterval(() => {                                          // 10 lần/giây: gửi vị trí những người vừa đổi
  for (const r of rooms.values()) if (r.dirty.size) {
    const ps = [...r.dirty].map(id => r.players.get(id)).filter(Boolean).map(p => [p.id, +p.x.toFixed(2), +p.z.toFixed(2), +p.yaw.toFixed(2)]);
    r.dirty.clear(); bcast(r, { t: 'state', ps });
  }
}, 100);
setInterval(() => { for (const ws of wss.clients) ws.cnt = 0; }, 1000);
setInterval(() => { for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; ws.ping(); } }, 30000);

server.listen(PORT, () => console.log(`✅ kinhphat server chạy ở cổng ${PORT}`));
