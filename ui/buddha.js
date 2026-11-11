/* Tượng Đức Phật ngồi thiền, dùng chung cho cảnh Nghe pháp (áo vàng cam) và sảnh thư viện (tượng vàng).
   makeBuddha({ robe, metal }) -> Group, gốc ở chỗ ngồi (y=0), mặt hướng +z, cao ~1.55.
   Tóc: ốc kết xoắn nhỏ phủ kín đầu, nhục kế tròn trên đỉnh, bạch hào giữa trán, mắt nhắm, dái tai dài. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const S = new THREE.SphereGeometry(1, 20, 14), CURL = new THREE.SphereGeometry(1, 7, 5);

export function makeBuddha({ robe = 0xd9822b, metal = false } = {}) {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a93a, metalness: .8, roughness: .35, emissive: 0x4a3000, emissiveIntensity: .6 });
  const R = metal ? gold : new THREE.MeshStandardMaterial({ color: robe, roughness: .85 });
  const skin = metal ? gold : new THREE.MeshStandardMaterial({ color: 0xd9a77a, roughness: .6 });
  const hair = new THREE.MeshStandardMaterial({ color: metal ? 0x5a3d10 : 0x2a1d16, roughness: .7 });
  const line = new THREE.MeshBasicMaterial({ color: 0x2a1a12, side: THREE.DoubleSide }), lip = new THREE.MeshBasicMaterial({ color: 0x9a4a40, side: THREE.DoubleSide });
  const add = (geo, mat, x, y, z, sc, rot) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (sc) m.scale.set(...sc); if (rot) m.rotation.set(...rot); g.add(m); return m; };
  const limb = (a, b, r) => { const d = new THREE.Vector3().subVectors(b, a), len = d.length(), c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .85, len, 10), R);
    c.position.copy(a).addScaledVector(d, .5); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); g.add(c); };
  // thân, chân xếp bằng, áo
  add(S, R, 0, .2, 0, [.85, .2, .6]);
  add(new THREE.LatheGeometry([[0, 0], [.34, 0], [.38, .3], [.32, .65], [.25, .82], [0, .86]].map(p => new THREE.Vector2(...p)), 24), R, 0, .25, 0, [1, 1, .8]);
  add(new THREE.CylinderGeometry(.07, .08, .14, 12), skin, 0, 1.1, 0);
  [-1, 1].forEach(s => {
    add(S, R, s * .3, .98, 0, [.12, .09, .12]);
    limb(new THREE.Vector3(s * .33, .95, 0), new THREE.Vector3(s * .1, .45, .3), .075);
    add(S, skin, s * .05, .43, .33, [.06, .04, .06]);
  });
  // đầu
  const HY = 1.27;
  add(S, skin, 0, HY, 0, [.17, .19, .17]);
  add(S, skin, 0, HY - .005, .15, [.02, .02, .02]);                                   // mũi
  [-1, 1].forEach(s => {
    add(S, skin, s * .172, HY - .015, -.005, [.028, .08, .035]);                    // tai, dái tai dài
    add(new THREE.TorusGeometry(.03, .004, 6, 12, Math.PI), line, s * .058, HY + .03, .158, null, [0, s * .35, Math.PI]);       // mắt nhắm ∪
    const b = add(new THREE.TorusGeometry(.05, .004, 6, 12, 1.0), line, s * .062, HY + .066, .154, null, [0, s * .35, Math.PI / 2 - .5]); if (s < 0) b.scale.x = -1;  // lông mày
  });
  add(new THREE.TorusGeometry(.03, .004, 6, 12, 1.0), lip, 0, HY - .055, .162, null, [0, 0, -Math.PI / 2 - .5]);                   // miệng
  add(S, new THREE.MeshBasicMaterial({ color: 0xffd36a }), 0, HY + .075, .168, [.009, .009, .009]);                               // bạch hào
  // tóc: mũ tóc nghiêng ra sau (đường chân tóc cao ở trán, thấp ở gáy) + các ốc kết
  const capRot = new THREE.Euler(-.35, 0, 0), capPos = new THREE.Vector3(0, HY - .005, -.01), capSc = [.178, .2, .178];
  const cap = add(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, 1.5), hair, capPos.x, capPos.y, capPos.z, capSc, [capRot.x, 0, 0]);
  const M = new THREE.Matrix4().compose(capPos, new THREE.Quaternion().setFromEuler(capRot), new THREE.Vector3(1, 1, 1)), D = new THREE.Object3D();
  const curls = (n, thetaMax, sc, center, radii, tilted, size) => {
    const im = new THREE.InstancedMesh(CURL, hair, n), c0 = Math.cos(thetaMax), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const th = Math.acos(1 - (i + .5) / n * (1 - c0)), ph = i * 2.39996;
      p.set(Math.sin(th) * Math.cos(ph) * radii[0], Math.cos(th) * radii[1], Math.sin(th) * Math.sin(ph) * radii[2]).multiplyScalar(1.07);
      if (tilted) p.applyMatrix4(M); else p.add(center);
      D.position.copy(p); D.scale.set(size, size * .9, size); D.rotation.set(0, ph, 0); D.updateMatrix(); im.setMatrixAt(i, D.matrix);
    }
    g.add(im);
  };
  curls(190, 1.5, capSc, null, capSc, true, .021);
  add(S, hair, 0, HY + .19, -.01, [.1, .085, .1]);                                     // nhục kế
  curls(46, 1.35, null, new THREE.Vector3(0, HY + .19, -.01), [.1, .085, .1], false, .017);
  return g;
}
