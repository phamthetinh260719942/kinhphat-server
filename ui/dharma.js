/* CẢNH NGHE PHÁP: Đức Phật giảng trên bệ đá giữa rừng, đệ tử ngồi bên dưới, chữ kinh chạy theo giọng đọc.
   Dharma.enter(data,{app,start,view,onClassic}) exit() update(dt,keys,yaw,pitch) setReading(i) setState(s) toggleSit() bow() getView()
   scene, camera, active, index. Điều khiển (kéo nhìn, phím) do ui3d.js chuyển vào. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { makeBuddha } from './buddha.js';
const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./dharma.css', import.meta.url).href; document.head.append(link);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o });
const C = new THREE.Vector2(0, -4), RW = 13;                                  // vùng đi lại: hình tròn tâm C, bán kính RW
const START = new THREE.Vector3(0, 1.6, 6), sitPos = new THREE.Vector3();
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 85 : 70, innerWidth / innerHeight, .05, 140);
scene.background = new THREE.Color(0xbcd2bb); scene.fog = new THREE.Fog(0xbcd2bb, 16, 75);
scene.add(new THREE.HemisphereLight(0xfff6df, 0x56663a, 1.05));
const sun = new THREE.DirectionalLight(0xffe6b0, 1.6); sun.position.set(-6, 10, 8); scene.add(sun);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 85 : 70; camera.updateProjectionMatrix(); });

const swayers = [], OB = [];                                                  // OB: vật cản {x,z,r (va chạm), sit (cấm ngồi), msg}
const mesh = (geo, mat, x = 0, y = 0, z = 0, sc) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sc) m.scale.set(...sc); return m; };
const S = new THREE.SphereGeometry(1, 16, 12);
function disciple(color) {
  const g = new THREE.Group(), robe = M(color);
  g.add(mesh(S, robe, 0, .18, 0, [.5, .18, .38])); g.add(mesh(new THREE.CylinderGeometry(.2, .32, .7, 14), robe, 0, .52, 0));
  g.add(mesh(S, robe, 0, .88, 0, [.26, .15, .18])); g.add(mesh(S, M(0xd9a77a), 0, 1.08, 0, [.14, .16, .14])); return g;
}
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const D = new THREE.Object3D(), tc = new THREE.Color();
const inst = (geo, n) => { const m = new THREE.InstancedMesh(geo, M(0xffffff, { roughness: .9 }), n); m.userData.n = 0; m.frustumCulled = false; scene.add(m); return m; };
const put = (m, x, y, z, s, col, sy = s) => { const i = m.userData.n++; D.position.set(x, y, z); D.scale.set(s, sy, s); D.rotation.set(0, rnd() * 6.28, 0); D.updateMatrix(); m.setMatrixAt(i, D.matrix); m.setColorAt(i, tc.set(col)); };
const polar = (r0, r1, pw = 1) => { const a = rnd() * Math.PI * 2, r = r0 + Math.pow(rnd(), pw) * (r1 - r0); return [C.x + Math.cos(a) * r, C.y + Math.sin(a) * r]; };
const onDirt = (x, z) => Math.hypot(x, z + 7) < 8.2;
let buddhaG, cushion;
(function build() {
  const ground = mesh(new THREE.CircleGeometry(95, 48), M(0x5f7a3a)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const dirt = mesh(new THREE.CircleGeometry(8, 40), M(0x8d7a52)); dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, .01, -7); scene.add(dirt);
  const trunk = new THREE.CylinderGeometry(.14, .22, 2.2, 6), c1 = new THREE.ConeGeometry(1.3, 3, 8), c2 = new THREE.ConeGeometry(1, 2.2, 8), ball = new THREE.SphereGeometry(1, 10, 8);
  const NC = 95, NR = 75, NB = 130, NG = 380, NF = 120, GR = [0x3f6b35, 0x2f5a2f, 0x4a7a3c, 0x356b3a, 0x2c5a3a], LR = [0x5a9a3a, 0x4a8a34, 0x6aa03e, 0x3f8a4a];
  const tC = inst(trunk, NC), k1 = inst(c1, NC), k2 = inst(c2, NC), tR = inst(trunk, NR), b1 = inst(ball, NR), b2 = inst(ball, NR), bu = inst(ball, NB);
  const gr = inst(new THREE.ConeGeometry(.07, .5, 4), NG), fl = inst(new THREE.SphereGeometry(.07, 6, 5), NF);
  for (let i = 0; i < NC; i++) { const [x, z] = polar(15.5, 50, 1.4), s = .9 + rnd() * 1.1; put(tC, x, 1.1 * s, z, s, 0x5a3e24); put(k1, x, 3.1 * s, z, s, GR[i % 5]); put(k2, x, 4.5 * s, z, s, GR[(i + 2) % 5]); }
  for (let i = 0; i < NR; i++) { const [x, z] = polar(15.5, 46, 1.3), s = .9 + rnd() * .9; put(tR, x, 1.1 * s, z, s, 0x6a4a2a); put(b1, x, 3.2 * s, z, 1.7 * s, LR[i % 4], 1.4 * s); put(b2, x, 4.5 * s, z, 1.1 * s, LR[(i + 1) % 4]); }
  for (let i = 0; i < NB; i++) { const [x, z] = polar(13.4, 36, 1.1), s = .5 + rnd() * .8; put(bu, x, .45 * s, z, s, LR[i % 4], .75 * s); }
  for (let i = 0, n = 0; i < 2000 && n < NG; i++) { const [x, z] = polar(5, 14.5); if (onDirt(x, z)) continue; put(gr, x, .25, z, .6 + rnd() * .8, [0x6aa03e, 0x5a9a3a, 0x7ab04a][n++ % 3]); }
  for (let i = 0, n = 0; i < 2000 && n < NF; i++) { const [x, z] = polar(8.5, 14.5); if (onDirt(x, z)) continue; put(fl, x, .14, z, 1 + rnd() * .5, [0xffffff, 0xffe27a, 0xf4a6c8, 0xb39ae8][n++ % 4]); }
  [tC, k1, k2, tR, b1, b2, bu, gr, fl].forEach(m => { m.count = m.userData.n; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; });
  // cây bồ đề lớn phía sau Đức Phật
  const bo = new THREE.Group(); bo.add(mesh(new THREE.CylinderGeometry(.5, .9, 5.5, 10), M(0x5a4430), 0, 2.75, 0));
  [[0, 7.2, 0, 3.6], [-2.6, 6.2, .5, 2.8], [2.7, 6.4, -.3, 2.9], [-1.2, 8.6, -.4, 2.6], [1.4, 8.4, .6, 2.5], [0, 5.6, 2, 2.2], [-3.6, 5.6, -1, 2.2]].forEach(([x, y, z, r], i) => bo.add(mesh(ball, M(i % 2 ? 0x4b8a3a : 0x3f7a30), x, y, z, [r, r * .8, r])));
  bo.position.set(0, 0, -15.2); scene.add(bo); OB.push({ x: 0, z: -15.2, r: .9, sit: 1.8, msg: 'Gốc cây bồ đề không ngồi được' });
  scene.add(mesh(new THREE.CylinderGeometry(1.9, 2.1, .15, 28), M(0x7a7a72), 0, .075, -10), mesh(new THREE.CylinderGeometry(1.5, 1.7, .3, 28), M(0x8f8f86), 0, .3, -10));
  OB.push({ x: 0, z: -10, r: 2.45, sit: 3.0, msg: 'Không ngồi gần bệ của Đức Phật' });
  buddhaG = makeBuddha({ robe: 0xd9822b }); buddhaG.position.set(0, .45, -10); buddhaG.scale.setScalar(1.35); scene.add(buddhaG);
  [[-2.2, -7.6, 0x8a4b22], [-.75, -7.6, 0xd9822b], [.75, -7.6, 0x7a2e22], [2.2, -7.6, 0x8a5a30], [-2.4, -6, 0xc9772a], [2.4, -6, 0x6a3a22]].forEach(([x, z, c], i) => {
    const d = disciple(c); d.position.set(x, 0, z); d.scale.setScalar(1.15); scene.add(d); swayers.push({ g: d, p: i * 1.3 });
    OB.push({ x, z, r: .8, sit: 1.15, msg: 'Chỗ này đã có người ngồi' });
  });
  cushion = mesh(new THREE.CylinderGeometry(.5, .5, .12, 20), M(0xa02a2a), 0, .06, 0); cushion.visible = false; scene.add(cushion);   // bồ đoàn hiện ra dưới người ngồi
})();

/* ---------- trạng thái & HUD ---------- */
let active = false, sitting = false, bowT = 0, T = 0, ctx = null, hud = null, paras = [], idx = 0, lines = [], cum = [], elapsed = 0, curLine = -1, timer = 0, base = 1, chant = false;
const split = t => {
  const out = []; (t.match(/[^.!?;:]+[.!?;:]*\s*/g) || [t]).forEach(p => { p = p.trim(); while (p.length > 75) { let i = p.lastIndexOf(',', 75); if (i < 30) i = p.lastIndexOf(' ', 75); if (i < 20) i = 75; out.push(p.slice(0, i + 1).trim()); p = p.slice(i + 1).trim(); } if (p) out.push(p); });
  return out.length ? out : [t];
};
function render() {
  if (!hud) return; hud.text.replaceChildren(); const st = ctx.app.tts.state;
  if (!lines.length) { hud.text.append(h('div', { className: 'dh-line cur', textContent: 'Bấm ▶ để bắt đầu nghe pháp' })); return; }
  [curLine - 1, curLine, curLine + 1].forEach(k => { if (lines[k] != null) hud.text.append(h('div', { className: 'dh-line ' + (k < curLine ? 'prev' : k > curLine ? 'next' : 'cur'), textContent: lines[k] })); });
  hud.text.append(h('div', { className: 'dh-meta', textContent: `${ctx.title} · đoạn ${idx + 1}/${paras.length}` + (st === 'stop' ? ' · bấm ▶ để nghe' : '') }));
}
function tick() {
  if (!active || ctx.app.tts.state !== 'playing' || !lines.length) return;
  elapsed += .15; const cps = 14 * ctx.app.tts.rate; let k = cum.findIndex(c => elapsed < c / cps); if (k < 0) k = lines.length - 1;
  if (k !== curLine) { curLine = k; render(); }
}
function toast(msg) { const t = h('div', { className: 'dh-toast', textContent: msg }); document.body.append(t); setTimeout(() => t.remove(), 2400); }
function mk() {
  const tts = ctx.app.tts, text = h('div', { className: 'dh-text' });
  const play = h('button', { textContent: '▶ Nghe', onclick: () => { const s = tts.state; if (s === 'playing') tts.pause(); else if (s === 'paused') tts.resume(); else tts.play(idx); } });
  const rate = h('span', { textContent: base.toFixed(1) + 'x' }), setRate = () => tts.setRate(base * (chant ? .8 : 1));
  const chantB = h('button', { textContent: '🙏 Tụng theo', title: 'Đọc chậm hơn, nghỉ sau mỗi đoạn để đọc theo', onclick: e => { chant = !chant; e.target.classList.toggle('on', chant); tts.gap = chant ? 1500 : 0; setRate(); } });
  const bowB = h('button', { textContent: '🙇 Cúi đầu', title: 'Phím B', onclick: () => Dharma.bow() });
  const sit = h('button', { onclick: () => Dharma.toggleSit() });
  const hint = h('div', { className: 'dh-hint', textContent: matchMedia('(pointer:coarse)').matches ? 'Đi tới chỗ bạn muốn rồi bấm “Ngồi nghe”' : 'Bấm “Ngồi nghe” (hoặc phím E) ở bất cứ chỗ nào · B để cúi đầu' });
  const bar = h('div', { className: 'dh-bar' }, play, h('button', { textContent: '■', onclick: () => tts.stop() }), '🐢',
    h('input', { type: 'range', min: .5, max: 2, step: .1, value: base, oninput: e => { base = +e.target.value; rate.textContent = base.toFixed(1) + 'x'; setRate(); } }), '🐇', rate, chantB, bowB, sit,
    h('button', { textContent: '📖 Đọc bằng mắt', onclick: () => ctx.onClassic() }));
  document.body.append(text, bar, hint); document.body.classList.add('dh-on'); hud = { text, bar, hint, sit, play };
}
const canSit = () => { const { x, z } = camera.position; for (const o of OB) if (Math.hypot(x - o.x, z - o.z) < o.sit) return o.msg; return ''; };
const setSeat = (x, z) => { sitting = true; sitPos.set(x, 1.0, z); cushion.position.set(x, .06, z); cushion.visible = true; };

export const Dharma = {
  scene, camera,
  get active() { return active; }, get index() { return idx; },
  getView: () => ({ x: camera.position.x, z: camera.position.z, sit: sitting }),
  enter(d, o) {
    this.exit(); ctx = { ...o, title: d.title }; paras = d.paras; active = true; sitting = false; cushion.visible = false; elapsed = 0; idx = Math.min(o.start || 0, paras.length - 1);
    if (o.view) { camera.position.set(o.view.x, o.view.sit ? 1.0 : 1.6, o.view.z); if (o.view.sit) setSeat(o.view.x, o.view.z); } else camera.position.copy(START);
    mk(); this.setReading(idx); timer = setInterval(tick, 150);
  },
  exit() { if (!active) return; active = false; bowT = 0; clearInterval(timer); [hud.text, hud.bar, hud.hint].forEach(e => e.remove()); hud = null; document.body.classList.remove('dh-on'); },
  setReading(i) { if (!active) return; idx = i; lines = split(paras[i] || ''); let c = 0; cum = lines.map(l => c += l.length); elapsed = 0; curLine = 0; render(); },
  setState(s) { if (hud) { hud.play.textContent = s === 'playing' ? '⏸ Tạm dừng' : s === 'paused' ? '▶ Tiếp tục' : '▶ Nghe'; render(); } },
  bow() { if (!active || bowT > 0) return; bowT = 1.8; toast('🙇 Bạn cúi đầu đảnh lễ'); },
  toggleSit() {                                                               // ngồi ở đâu cũng được, trừ chỗ cấm
    if (!active) return;
    if (sitting) { sitting = false; cushion.visible = false; return; }
    const m = canSit(); if (m) return toast(m + ' — hãy chọn chỗ khác');
    setSeat(camera.position.x, camera.position.z);
  },
  update(dt, keys, yaw, pitch) {
    const p = camera.position; T += dt;
    if (sitting) p.lerp(sitPos, 1 - Math.exp(-4 * dt));
    else {
      const f = (keys.w || keys.up ? 1 : 0) - (keys.s || keys.down ? 1 : 0), r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), sp = 2.8 * dt;
      p.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * sp; p.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * sp;
      const dx = p.x - C.x, dz = p.z - C.y, d = Math.hypot(dx, dz); if (d > RW) { p.x = C.x + dx / d * RW; p.z = C.y + dz / d * RW; }
      for (const o of OB) { const ox = p.x - o.x, oz = p.z - o.z, od = Math.hypot(ox, oz), m = o.r + .35; if (od < m) { const k = m / (od || .001); p.x = o.x + ox * k; p.z = o.z + oz * k; } }
      p.y += (1.6 - p.y) * (1 - Math.exp(-5 * dt));
    }
    const bw = bowT > 0 ? Math.sin(Math.PI * (1 - bowT / 1.8)) : 0; bowT = Math.max(0, bowT - dt);
    camera.rotation.set(pitch - bw * .75, yaw, 0, 'YXZ');
    if (hud) { hud.sit.textContent = sitting ? '⬆ Đứng dậy (E)' : '🧘 Ngồi nghe (E)'; hud.hint.style.display = sitting ? 'none' : ''; }
    buddhaG.scale.y = 1.35 * (1 + Math.sin(T * 1.2) * .004); swayers.forEach(s => { s.g.rotation.z = Math.sin(T * .8 + s.p) * .012; });
  }
};
