/* CẢNH NGHE PHÁP: Đức Phật giảng trên bệ đá, đệ tử ngồi bên dưới, chữ kinh chạy theo giọng đọc.
   Giao diện: Dharma.enter(data,{app,start,onClassic}) exit() update(dt,keys,yaw,pitch) setReading(i) setState(s) toggleSit()
   scene, camera, active, index. Phần điều khiển (kéo nhìn, phím) do ui3d.js chuyển vào. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = new URL('./dharma.css', import.meta.url).href; document.head.append(link);
const h = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, ...o });
const SKIN = 0xd9a77a, HAIR = 0x1b1410, ROBE = 0xd9822b;
const SEAT = new THREE.Vector3(0, 1.0, -6), START = new THREE.Vector3(0, 1.6, 6), MAT_Z = -6;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(innerWidth < innerHeight ? 85 : 70, innerWidth / innerHeight, .05, 120);
scene.background = new THREE.Color(0xb9cdb4); scene.fog = new THREE.Fog(0xb9cdb4, 14, 60);
scene.add(new THREE.HemisphereLight(0xfff6df, 0x56663a, 1.05));
const sun = new THREE.DirectionalLight(0xffe6b0, 1.6); sun.position.set(-6, 10, 8); scene.add(sun);
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < 1 ? 85 : 70; camera.updateProjectionMatrix(); });

const swayers = []; let buddhaG;
const mesh = (geo, mat, x = 0, y = 0, z = 0, sc) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sc) m.scale.set(...sc); return m; };
const limb = (a, b, r, m) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), c = mesh(new THREE.CylinderGeometry(r, r * .85, len, 10), m);
  c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return c; };
const S = new THREE.SphereGeometry(1, 20, 14);

function buddha() {
  const g = new THREE.Group(), robe = M(ROBE), skin = M(SKIN, { roughness: .6 }), hair = M(HAIR);
  g.add(mesh(S, robe, 0, .2, 0, [.85, .2, .6]));
  const lathe = new THREE.LatheGeometry([[0, 0], [.34, 0], [.38, .3], [.32, .65], [.25, .82], [0, .86]].map(p => new THREE.Vector2(...p)), 24);
  g.add(mesh(lathe, robe, 0, .25, 0, [1, 1, .8]));
  g.add(mesh(new THREE.CylinderGeometry(.07, .08, .14, 12), skin, 0, 1.1, 0));
  g.add(mesh(S, skin, 0, 1.27, 0, [.17, .19, .17]));
  g.add(mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * .46), hair, 0, 1.28, 0, [.18, .2, .18]));
  g.add(mesh(S, hair, 0, 1.47, 0, [.06, .05, .06]));
  [-1, 1].forEach(s => {
    g.add(mesh(S, skin, s * .17, 1.24, 0, [.025, .07, .04]));
    g.add(mesh(new THREE.BoxGeometry(.06, .008, .01), hair, s * .06, 1.3, .16));
    g.add(limb(new THREE.Vector3(s * .33, .95, 0), new THREE.Vector3(s * .1, .45, .3), .075, robe));
    g.add(mesh(S, skin, s * .05, .43, .33, [.06, .04, .06]));
  });
  g.add(mesh(S, skin, 0, 1.27, .15, [.02, .02, .02])); g.add(mesh(new THREE.BoxGeometry(.05, .008, .01), M(0x8a3a30), 0, 1.2, .16));
  return g;
}
function disciple(color) {
  const g = new THREE.Group(), robe = M(color);
  g.add(mesh(S, robe, 0, .18, 0, [.5, .18, .38])); g.add(mesh(new THREE.CylinderGeometry(.2, .32, .7, 14), robe, 0, .52, 0));
  g.add(mesh(S, robe, 0, .88, 0, [.26, .15, .18])); g.add(mesh(S, M(SKIN), 0, 1.08, 0, [.14, .16, .14])); return g;
}
(function build() {
  const ground = mesh(new THREE.CircleGeometry(70, 48), M(0x66763f)); ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const dirt = mesh(new THREE.CircleGeometry(8, 40), M(0x8d7a52)); dirt.rotation.x = -Math.PI / 2; dirt.position.set(0, .01, -7); scene.add(dirt);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2, r = 14 + rnd() * 22, x = Math.cos(a) * r, z = -7 + Math.sin(a) * r, s = .8 + rnd() * .8;
    const t = new THREE.Group(); t.add(mesh(new THREE.CylinderGeometry(.16, .24, 2.4, 8), M(0x5a3e24), 0, 1.2, 0));
    t.add(mesh(new THREE.ConeGeometry(1.4, 3.4, 9), M(rnd() > .5 ? 0x3f6b35 : 0x2f5a2f), 0, 3.6, 0)); t.add(mesh(new THREE.ConeGeometry(1.0, 2.4, 9), M(0x4a7a3c), 0, 5.2, 0));
    t.position.set(x, 0, z); t.scale.setScalar(s * 1.2); scene.add(t);
  }
  scene.add(mesh(new THREE.CylinderGeometry(1.9, 2.1, .15, 28), M(0x7a7a72), 0, .075, -10), mesh(new THREE.CylinderGeometry(1.5, 1.7, .3, 28), M(0x8f8f86), 0, .3, -10));
  buddhaG = buddha(); buddhaG.position.set(0, .45, -10); buddhaG.scale.setScalar(1.35); scene.add(buddhaG);
  [[-2.2, -7.6, 0x8a4b22], [-.75, -7.6, 0xd9822b], [.75, -7.6, 0x7a2e22], [2.2, -7.6, 0x8a5a30], [-2.4, -6, 0xc9772a], [2.4, -6, 0x6a3a22]].forEach(([x, z, c], i) => {
    const d = disciple(c); d.position.set(x, 0, z); d.scale.setScalar(1.15); scene.add(d); swayers.push({ g: d, p: i * 1.3 });
  });
  scene.add(mesh(new THREE.BoxGeometry(.95, .06, .95), M(0x8a2a2a), 0, .03, MAT_Z));
})();

/* ---------- trạng thái & HUD ---------- */
let active = false, sitting = false, bowT = 0, T = 0, ctx = null, hud = null, paras = [], idx = 0, lines = [], cum = [], elapsed = 0, curLine = -1, timer = 0, base = 1, chant = false;
const split = t => {
  const out = []; (t.match(/[^.!?;:]+[.!?;:]*\s*/g) || [t]).forEach(p => { p = p.trim(); while (p.length > 75) { let i = p.lastIndexOf(',', 75); if (i < 30) i = p.lastIndexOf(' ', 75); if (i < 20) i = 75; out.push(p.slice(0, i + 1).trim()); p = p.slice(i + 1).trim(); } if (p) out.push(p); });
  return out.length ? out : [t];
};
function render() {
  if (!hud) return; hud.text.replaceChildren();
  const st = ctx.app.tts.state;
  if (!lines.length) { hud.text.append(h('div', { className: 'dh-line cur', textContent: 'Bấm ▶ để bắt đầu nghe pháp' })); return; }
  [curLine - 1, curLine, curLine + 1].forEach(k => { if (lines[k] != null) hud.text.append(h('div', { className: 'dh-line ' + (k < curLine ? 'prev' : k > curLine ? 'next' : 'cur'), textContent: lines[k] })); });
  hud.text.append(h('div', { className: 'dh-meta', textContent: `${ctx.title} · đoạn ${idx + 1}/${paras.length}` + (st === 'stop' ? ' · bấm ▶ để nghe' : '') }));
}
function tick() {
  if (!active || ctx.app.tts.state !== 'playing' || !lines.length) return;
  elapsed += .15; const cps = 14 * ctx.app.tts.rate; let k = cum.findIndex(c => elapsed < c / cps); if (k < 0) k = lines.length - 1;
  if (k !== curLine) { curLine = k; render(); }
}
function mk() {
  const tts = ctx.app.tts, text = h('div', { className: 'dh-text' });
  const play = h('button', { textContent: '▶ Nghe', onclick: () => { const s = tts.state; if (s === 'playing') tts.pause(); else if (s === 'paused') tts.resume(); else tts.play(idx); } });
  const rate = h('span', { textContent: '1.0x' });
  const setRate = () => tts.setRate(base * (chant ? .8 : 1));
  const chantB = h('button', { textContent: '🙏 Tụng theo', title: 'Đọc chậm hơn, nghỉ sau mỗi đoạn để đọc theo', onclick: e => { chant = !chant; e.target.classList.toggle('on', chant); tts.gap = chant ? 1500 : 0; setRate(); } });
  const bowB = h('button', { textContent: '🙇 Cúi đầu', title: 'Phím B', onclick: () => Dharma.bow() });
  const sit = h('button', { onclick: () => Dharma.toggleSit() });
  const hint = h('div', { className: 'dh-hint', textContent: matchMedia('(pointer:coarse)').matches ? 'Đi tới tọa cụ đỏ trước Đức Phật rồi bấm “Ngồi nghe”' : 'Đi tới tọa cụ đỏ trước Đức Phật · bấm E để ngồi · B để cúi đầu' });
  const bar = h('div', { className: 'dh-bar' }, play, h('button', { textContent: '■', onclick: () => tts.stop() }), '🐢',
    h('input', { type: 'range', min: .5, max: 2, step: .1, value: base, oninput: e => { base = +e.target.value; rate.textContent = base.toFixed(1) + 'x'; setRate(); } }), '🐇', rate, chantB, bowB, sit,
    h('button', { textContent: '📖 Đọc bằng mắt', onclick: () => ctx.onClassic() }));
  rate.textContent = base.toFixed(1) + 'x';
  document.body.append(text, bar, hint); document.body.classList.add('dh-on'); hud = { text, bar, hint, sit, play };
}
function toast(msg) { const t = h('div', { className: 'dh-toast', textContent: msg }); document.body.append(t); setTimeout(() => t.remove(), 2200); }
const near = () => Math.hypot(camera.position.x, camera.position.z - MAT_Z) < 2.4;

export const Dharma = {
  scene, camera,
  get active() { return active; }, get index() { return idx; },
  enter(d, o) {
    this.exit(); ctx = { ...o, title: d.title }; paras = d.paras; active = true; sitting = false; elapsed = 0; idx = Math.min(o.start || 0, paras.length - 1);
    camera.position.copy(START); mk(); this.setReading(idx, true); timer = setInterval(tick, 150);
  },
  exit() { if (!active) return; active = false; bowT = 0; clearInterval(timer); [hud.text, hud.bar, hud.hint].forEach(e => e.remove()); hud = null; document.body.classList.remove('dh-on'); },
  setReading(i, quiet) { if (!active) return; idx = i; lines = split(paras[i] || ''); let c = 0; cum = lines.map(l => c += l.length); elapsed = 0; curLine = 0; if (!quiet || true) render(); },
  setState(s) { if (hud) { hud.play.textContent = s === 'playing' ? '⏸ Tạm dừng' : s === 'paused' ? '▶ Tiếp tục' : '▶ Nghe'; render(); } },
  bow() { if (!active || bowT > 0) return; bowT = 1.8; toast('🙇 Bạn cúi đầu đảnh lễ'); },
  toggleSit() { if (!active) return; if (sitting) sitting = false; else if (near()) sitting = true; },
  update(dt, keys, yaw, pitch) {
    const p = camera.position; T += dt;
    if (sitting) p.lerp(SEAT, 1 - Math.exp(-4 * dt));
    else {
      const f = (keys.w || keys.up ? 1 : 0) - (keys.s || keys.down ? 1 : 0), r = (keys.d ? 1 : 0) - (keys.a ? 1 : 0), sp = 2.8 * dt;
      p.x += (-Math.sin(yaw) * f + Math.cos(yaw) * r) * sp; p.z += (-Math.cos(yaw) * f - Math.sin(yaw) * r) * sp;
      p.x = Math.max(-9, Math.min(9, p.x)); p.z = Math.max(-4.6, Math.min(9, p.z)); p.y += (1.6 - p.y) * (1 - Math.exp(-5 * dt));
    }
    const bw = bowT > 0 ? Math.sin(Math.PI * (1 - bowT / 1.8)) : 0; bowT = Math.max(0, bowT - dt);
    camera.rotation.set(pitch - bw * .75, yaw, 0, 'YXZ');
    if (hud) { const show = near() || sitting; hud.sit.style.display = show ? '' : 'none'; hud.sit.textContent = sitting ? '⬆ Đứng dậy (E)' : '🧘 Ngồi nghe (E)'; hud.hint.style.display = sitting ? 'none' : ''; }
    buddhaG.scale.y = 1.35 * (1 + Math.sin(T * 1.2) * .004); swayers.forEach(s => s.g.rotation.z = Math.sin(T * .8 + s.p) * .012);
  }
};
