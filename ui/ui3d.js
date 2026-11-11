/* GIAO DIỆN 3D (Three.js). Cùng hợp đồng với ui2d.js. Màn hình đọc dùng lại của ui2d (lớp phủ DOM). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { UI as U2 } from './ui2d.js';
import { Dharma } from './dharma.js';
import { makeBuddha } from './buddha.js';

const COLORS = ['#8b2e2e', '#2e5a8b', '#2e7a4f', '#7a4f2e', '#6a2e8b', '#8b6a2e', '#2e7a7a', '#5a2e3d', '#3d5a2e', '#4a4a7a'];
const FONT = '"Noto Serif","Times New Roman",serif';
const hash = s => [...s].reduce((a, c) => a + c.charCodeAt(0), 0);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .8, ...o });
const BOOK_GEO = new THREE.BoxGeometry(.9, 1, .32), SHARED = new Set([BOOK_GEO]);

let app, renderer, scene, camera, world, running = false, bookMeshes = [], hoverM = null;
let yaw = 0, pitch = 0, L = 14, keys = {}, tip, ov, crumbsEl, musBtn, musName, last = 0, drag = null;
const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();

/* ---------- nhớ vị trí đã đứng (mỗi trang một vị trí, nhớ cả khi tải lại) ---------- */
const VK = 'view:v1', views = new Map(), dviews = new Map(); let curKey = null, lastSave = 0;
try { Object.entries(JSON.parse(localStorage.getItem(VK)) || {}).forEach(([k, v]) => views.set(k, v)); } catch {}
function saveView() {
  if (!curKey || !camera) return; views.set(curKey, { x: camera.position.x, z: camera.position.z, yaw, pitch });
  try { const o = {}; [...views].slice(-40).forEach(([k, v]) => { o[k] = v; }); localStorage.setItem(VK, JSON.stringify(o)); } catch {}
}
addEventListener('pagehide', () => { if (running && !Dharma.active) saveView(); });

/* ---------- vật thể ---------- */
function labelTex(text, w, hgt, font, fg, bg) {
  const c = document.createElement('canvas'); c.width = w; c.height = hgt; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, hgt); x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  let size = font; do { x.font = `bold ${size}px ${FONT}`; size -= 2; } while (x.measureText(text).width > w - 24 && size > 12);
  x.fillText(text, w / 2, hgt / 2); return new THREE.CanvasTexture(c);
}
const TIER_H = .47, GAP = .004, PXM = 569, MEAS = document.createElement('canvas').getContext('2d'), LAYOUT = new Map();
const GLOW = { reading: { c: 0xffc94a, o: .8 }, done: { c: 0x6fe39a, o: .65 } };     // quầng sáng: đang đọc (vàng) / đã đọc xong (xanh)
const fit = (t, w) => { if (MEAS.measureText(t).width <= w) return t; while (t.length > 2 && MEAS.measureText(t + '…').width > w) t = t.slice(0, -1); return t.trimEnd() + '…'; };
function layoutTitle(title) {                       // tên sách xuống dòng (tối đa 3 dòng); sách dày theo số dòng
  if (LAYOUT.has(title)) return LAYOUT.get(title);
  MEAS.font = `bold 30px ${FONT}`; const W = 480, lines = []; let cur = '';
  for (const w of title.split(/\s+/)) { const t = cur ? cur + ' ' + w : w; if (!cur || MEAS.measureText(t).width <= W) cur = t; else { lines.push(cur); cur = w; } }
  lines.push(cur);
  const ls = lines.slice(0, 3).map(l => fit(l, W)); if (lines.length > 3) ls[2] = fit(lines.slice(2).join(' '), W);
  const r = { lines: ls, h: .04 + ls.length * .062 }; LAYOUT.set(title, r); return r;
}
function spineTex(col, L) {
  const H = Math.max(24, Math.round(L.h * PXM)), c = document.createElement('canvas'); c.width = 512; c.height = H; const x = c.getContext('2d');
  x.fillStyle = col; x.fillRect(0, 0, 512, H); x.fillStyle = '#e0b85a'; x.fillRect(0, 3, 512, 2); x.fillRect(0, H - 5, 512, 2);
  x.fillStyle = '#fff4d6'; x.font = `bold 30px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lh = (H - 12) / L.lines.length; L.lines.forEach((t, i) => x.fillText(t, 256, 6 + lh * (i + .5)));
  const tx = new THREE.CanvasTexture(c); tx.anisotropy = 8; return tx;
}
function pack(books) {                              // xếp sách vào tủ: 3 tầng x 2 chồng, mỗi chồng cao tối đa TIER_H
  const cs = []; let cur = null, pile = null, ph = 0;
  for (const b of books) {
    const L = layoutTitle(b.title), need = L.h + GAP;
    if (!pile || (ph + need > TIER_H && pile.length)) { if (!cur || cur.length >= 6) { cur = []; cs.push(cur); } pile = []; cur.push(pile); ph = 0; }
    pile.push({ b, L }); ph += need;
  }
  return cs;
}
function bookcase(title, piles) {
  const g = new THREE.Group(), W = 2.1, T = 3, TH = .5, H = T * TH + .2, wood = M(0x7a5230);
  const add = (w, hh, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), wood); m.position.set(x, y, z); g.add(m); };
  add(W + .1, H, .04, 0, H / 2, -.17); add(.05, H, .38, -W / 2 - .02, H / 2, 0); add(.05, H, .38, W / 2 + .02, H / 2, 0);
  for (let t = 0; t <= T; t++) add(W, .04, .38, 0, .15 + t * TH - .02, 0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(W, .4), new THREE.MeshBasicMaterial({ map: labelTex(title, 640, 125, 54, '#e0b85a', '#2b1409') }));
  sign.position.set(0, H + .24, .02); g.add(sign);
  piles.forEach((pile, pi) => {
    const tier = Math.floor(pi / 2), x = pi % 2 ? .5 : -.5; let y = .15 + tier * TH;
    pile.forEach(({ b, L }) => {
      const hs = hash(b.title), col = COLORS[hs % COLORS.length], side = M(col), gl = GLOW[b.state];
      const spine = new THREE.MeshStandardMaterial({ map: spineTex(col, L), roughness: .7, emissive: new THREE.Color(gl ? gl.c : 0).multiplyScalar(gl ? .28 : 0) });
      const m = new THREE.Mesh(BOOK_GEO, [side, side, side, side, spine, side]);
      m.scale.y = L.h; m.position.set(x + ((hs % 5) - 2) * .01, y + L.h / 2, .02); m.rotation.y = ((hs % 7) - 3) * .012; y += L.h + GAP;
      m.userData.book = b; m.userData.base = spine.emissive.clone();
      if (gl) { const o = new THREE.Mesh(BOOK_GEO, new THREE.MeshBasicMaterial({ color: gl.c, transparent: true, opacity: gl.o, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false }));
        o.scale.set(1.07, (L.h + .05) / L.h, 1.15); m.add(o); }
      g.add(m); bookMeshes.push(m);
    });
  });
  return g;
}
function buddha() {
  const g = new THREE.Group(), altar = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, .8, 32), M(0x6a1b1b)); altar.position.y = .4; g.add(altar);
  const pink = M(0xe7a6b8, { emissive: 0x2a0d14 });
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2, p = new THREE.Mesh(new THREE.SphereGeometry(.42, 12, 8), pink);
    p.scale.set(.5, .16, 1); p.position.set(Math.sin(a) * 1.45, .9, Math.cos(a) * 1.45); p.rotation.y = a; g.add(p);
  }
  const st = makeBuddha({ metal: true }); st.position.y = .85; st.scale.setScalar(1.6); g.add(st);
  const spot = new THREE.PointLight(0xffc65a, 18, 9); spot.position.set(0, 3.4, 1.5); g.add(spot);
  g.scale.setScalar(1.15); return g;
}
function build(sections, key) {
  if (world) { scene.remove(world); world.traverse(o => { if (o.geometry && !SHARED.has(o.geometry)) o.geometry.dispose(); [].concat(o.material || []).forEach(m => { m.map?.dispose(); m.dispose(); }); }); }
  world = new THREE.Group(); bookMeshes = []; scene.add(world);
  const groups = []; { const sm = [], bg = [];             // mục nhỏ trước, mục nhiều tủ nhất dồn về cuối
    sections.forEach(sc => { const cs = pack(sc.books), n = cs.length; if (!n) return;
      (n >= 3 ? bg : sm).push(cs.map((piles, i) => ({ title: n > 1 ? `${sc.title} (${i + 1}/${n})` : sc.title, piles }))); });
    groups.push(...sm, ...bg); }
  let gs = groups; if (gs.length === 1 && gs[0].length > 1) { const g0 = gs[0], k = Math.ceil(g0.length / 2); gs = [g0.slice(0, k), g0.slice(k)]; }
  const tot = gs.reduce((n, x) => n + x.length, 0); let split = 0, best = 1e9;      // cắt tại ranh giới mục để hai tường dài gần bằng nhau
  for (let k = 0, acc = 0; k <= gs.length; k++) { const d = Math.abs(tot - 2 * acc); if (d <= best) { best = d; split = k; } acc += gs[k]?.length || 0; }
  const wall = arr => { let z = -2.5; const out = []; arr.forEach((g0, gi) => { if (gi) z -= .8; g0.forEach(c => { out.push({ c, z }); z -= 2.4; }); }); return { out, len: -z }; };
  const Lw = wall(gs.slice(0, split)), Rw = wall(gs.slice(split)); L = Math.max(Lw.len, Rw.len) + 8;
  const plane = (w, d, mat, x, y, z, rx, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); world.add(m); };
  const wallM = M(0x7a5634, { side: THREE.DoubleSide });
  plane(12, L + 4, M(0x8a5a30), 0, 0, 2 - L / 2, -Math.PI / 2);
  plane(2.4, L + 4, M(0x7a1f1f), 0, .01, 2 - L / 2, -Math.PI / 2);
  plane(12, L + 4, M(0x5a4028), 0, 6.5, 2 - L / 2, Math.PI / 2);
  plane(L + 4, 6.5, wallM, -6, 3.25, 2 - L / 2, 0, Math.PI / 2); plane(L + 4, 6.5, wallM, 6, 3.25, 2 - L / 2, 0, Math.PI / 2);
  plane(12, 6.5, M(0x7a2222, { side: THREE.DoubleSide }), 0, 3.25, -L); plane(12, 6.5, wallM, 0, 3.25, 4);
  for (let z = 2; z > -L; z -= 3) { const b = new THREE.Mesh(new THREE.BoxGeometry(12, .25, .3), M(0x4a2a14)); b.position.set(0, 6.3, z); world.add(b); }
  for (let i = 0, z = 0; z > -L + 3; z -= 5, i++) {
    const l = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a3d })); l.position.set(0, 4.6, z); world.add(l);
    if (i % 2 == 0) { const p = new THREE.PointLight(0xffa860, 26, 14); p.position.set(0, 4.4, z); world.add(p); }
  }
  [[Lw, true], [Rw, false]].forEach(([w, left]) => w.out.forEach(({ c, z }) => {   // mỗi tường chạy liên tiếp từ cửa vào tới cuối sảnh
    const k = bookcase(c.title, c.piles); k.position.set(left ? -5.55 : 5.55, 0, z); k.rotation.y = left ? Math.PI / 2 : -Math.PI / 2; world.add(k); }));
  const b = buddha(); b.position.set(0, 0, -L + 2.6); world.add(b);
  const v = views.get(key);                           // quay lại trang cũ thì đứng đúng chỗ cũ
  if (v) { camera.position.set(Math.max(-4.6, Math.min(4.6, v.x)), 1.6, Math.max(-L + 4.5, Math.min(3.2, v.z))); yaw = v.yaw || 0; pitch = v.pitch || 0; }
  else { camera.position.set(0, 1.6, 2.5); yaw = 0; pitch = 0; }
}

/* ---------- vòng lặp & điều khiển ---------- */
function loop(t) {
  requestAnimationFrame(loop); const dt = Math.min(.05, (t - last) / 1000); last = t;
  yaw += ((keys.tl ? 1 : 0) - (keys.tr ? 1 : 0)) * 1.8 * dt;
  if (Dharma.active) { Dharma.update(dt, keys, yaw, pitch); renderer.render(Dharma.scene, Dharma.camera); return; }
  if (!running) return;
  if (t - lastSave > 2000) { lastSave = t; saveView(); }
  const f = (keys.w || keys.up ? 1 : 0) - (keys.s || keys.down ? 1 : 0), r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), sp = 3.2 * dt;
  camera.position.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * sp; camera.position.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * sp;
  camera.position.x = Math.max(-4.6, Math.min(4.6, camera.position.x)); camera.position.z = Math.max(-L + 4.5, Math.min(3.2, camera.position.z));
  camera.rotation.set(pitch, yaw, 0, 'YXZ'); renderer.render(scene, camera);
}
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(mouse, camera); return ray.intersectObjects(bookMeshes, false)[0]?.object;
}
function hover(m, e) {
  if (hoverM && hoverM !== m) hoverM.material[4].emissive.copy(hoverM.userData.base);
  hoverM = m; if (m) m.material[4].emissive.set(0x664411);
  tip.style.display = m ? 'block' : 'none'; renderer.domElement.style.cursor = m ? 'pointer' : 'grab';
  if (m) { tip.textContent = m.userData.book.title; tip.style.left = e.clientX + 14 + 'px'; tip.style.top = e.clientY + 14 + 'px'; }
}
const key = (e, v) => { if (v && e.key.toLowerCase() === 'e' && Dharma.active) return Dharma.toggleSit(); if (v && e.key.toLowerCase() === 'b' && Dharma.active) return Dharma.bow(); const k = { w: 'w', a: 'a', s: 's', d: 'd', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'a', ArrowRight: 'd' }[e.key.length > 1 ? e.key : e.key.toLowerCase()]; if (k && (running || Dharma.active)) keys[k] = v; };

function initScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight); renderer.domElement.style.cssText = 'position:fixed;inset:0;touch-action:none;cursor:grab'; document.body.prepend(renderer.domElement);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x120a05); scene.fog = new THREE.Fog(0x1a0f08, 14, 70);
  scene.add(new THREE.AmbientLight(0xffe2b8, .95), new THREE.HemisphereLight(0xffe0b0, 0x3a2412, .8));
  camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 85 : 70, innerWidth / innerHeight, .05, 80);
  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 85 : 70; camera.updateProjectionMatrix(); });
  addEventListener('keydown', e => key(e, true)); addEventListener('keyup', e => key(e, false));
  const el = renderer.domElement;
  el.onpointerdown = e => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; el.setPointerCapture(e.pointerId); };
  el.onpointermove = e => {
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.abs(dx) + Math.abs(dy); drag.x = e.clientX; drag.y = e.clientY; const k = e.pointerType === 'touch' ? .006 : .004; yaw -= dx * k; pitch = Math.max(-1.2, Math.min(1.2, pitch - dy * k)); }
    else if (e.pointerType === 'mouse' && !Dharma.active) hover(pick(e), e);
  };
  el.onpointerup = e => { if (drag && drag.moved < 6 && !Dharma.active) { const m = pick(e); if (m) { hover(null); app.open(m.userData.book); } } drag = null; };
}
function initHud() {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./ui3d.css', import.meta.url).href; document.head.append(css);
  tip = h('div', { id: 'tip' }); ov = h('div', { id: 'ov' });
  crumbsEl = h('div', { className: 'hud crumbs3d' });
  musBtn = h('button', { textContent: '♪', onclick: () => { if (!app.music.toggle()) alert('Chưa có nhạc. Bỏ mp3 vào thư mục music/ và khai báo trong music/list.json'); } });
  musName = h('span', { textContent: 'Chưa có nhạc', style: 'max-width:130px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:13px' });
  const mus = h('div', { className: 'hud musbox' }, musBtn, h('button', { textContent: '⏭', onclick: () => app.music.next() }), musName,
    h('input', { type: 'range', min: 0, max: 1, step: .05, value: .4, style: 'width:70px', oninput: e => app.music.setVolume(+e.target.value) }));
  const hold = (txt, k) => { const b = h('button', { textContent: txt, oncontextmenu: e => e.preventDefault() });
    b.onpointerdown = e => { e.preventDefault(); e.stopPropagation(); keys[k] = true; b.setPointerCapture?.(e.pointerId); };
    b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => { keys[k] = false; }; return b; };
  const mv = h('div', { className: 'mv' }, hold('◀', 'a'), hold('▲', 'up'), hold('▼', 'down'), hold('▶', 'd'));
  const help = h('div', { className: 'hud help', style: 'left:50%;bottom:10px;transform:translateX(-50%);font-size:12px;opacity:.75;text-align:center;pointer-events:none', textContent: matchMedia('(pointer:coarse)').matches ? 'Dùng 4 nút bên dưới để đi · chạm vào cuốn kinh để đọc' : 'Kéo để nhìn · W A S D / mũi tên để đi · bấm vào cuốn kinh để đọc' });
  document.body.append(tip, ov, crumbsEl, mus, mv, help);
  let idleT = 0; const wake = () => { document.body.classList.remove('ui-idle'); clearTimeout(idleT); idleT = setTimeout(sleepUI, 5000); };
  const sleepUI = () => { if (Object.values(keys).some(Boolean)) return wake(); document.body.classList.add('ui-idle'); };
  ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'].forEach(ev => addEventListener(ev, wake, { capture: true, passive: true })); wake();
}
const hud = c => { crumbsEl.textContent = ''; (c || []).forEach((t, i, a) => { if (i) crumbsEl.append('›'); crumbsEl.append(i === a.length - 1 ? h('b', { textContent: t }) : h('a', { textContent: i ? t : '🏯 ' + t, onclick: () => app.jump(i) })); });
  if (c?.length > 1) crumbsEl.prepend(h('button', { textContent: '←', onclick: () => app.back() })); };
const msg = (html, btn) => { ov.replaceChildren(h('div', { innerHTML: html })); if (btn) ov.append(btn); ov.style.display = html ? 'flex' : 'none'; };
const fontReady = document.fonts ? Promise.all(['400', '700'].map(w => document.fonts.load(`${w} 20px "Noto Serif"`, 'Thăng ắế ữ'))).catch(() => {}) : Promise.resolve();
async function enter(sections, c, key) { if (running && !Dharma.active) saveView(); Dharma.exit(); U2.closeReader(); msg('Đang dựng thư viện…'); hud(c); await fontReady; msg(''); curKey = key; build(sections, key); keys = {}; running = true; }

function openDharma(d, c, i) {
  if (running && !Dharma.active) saveView();
  running = false; U2.closeReader(); msg(''); hud(c); const v = dviews.get(d.url); yaw = v ? v.yaw : 0; pitch = v ? v.pitch : .05; keys = {};
  Dharma.enter(d, { app, start: i, view: v, onClassic: () => openClassic(d, c, Dharma.index) });
}
function openClassic(d, c, i) {
  dviews.set(d.url, { ...Dharma.getView(), yaw, pitch }); Dharma.exit(); U2.showReader(d, c, i);
  const bar = document.querySelector('.rd .rb');
  if (bar) bar.insertBefore(h('button', { textContent: '🧘 Nghe pháp', onclick: () => openDharma(d, c, i) }), bar.children[1]);
}
export const UI = {
  init(a) { app = a; U2.init(a); document.getElementById('app').style.display = 'none'; initScene(); initHud(); requestAnimationFrame(loop); },
  loading(m) { if (running && !Dharma.active) saveView(); running = false; Dharma.exit(); U2.closeReader(); msg(m); },
  error(m, canBack) { running = false; Dharma.exit(); msg('Lỗi: ' + m, h('button', { className: 'hud', style: 'position:static;background:#6b4423;color:#fff;border:1px solid #e0b85a;border-radius:8px;padding:8px 14px;font:inherit', textContent: canBack ? '← Quay lại' : 'Thử lại', onclick: () => canBack ? app.back() : app.home() })); },
  showHome(s, c) { enter(s, c, 'home'); },
  showShelf(d, c) { enter([{ title: d.title, books: d.books }], c, d.url || d.title); },
  showReader(d, c, i) { openDharma(d, c, i); },
  setReading: i => { U2.setReading(i); Dharma.setReading(i); },
  setTtsState: s => { U2.setTtsState(s); Dharma.setState(s); },
  setMusic(n, on) { if (musName) { musName.textContent = n; musBtn.textContent = on ? '⏸' : '♪'; } U2.setMusic(n, on); }
};
