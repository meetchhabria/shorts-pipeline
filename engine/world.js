// world.js — Phan Thiết dunes, a single metre-gauge line to the horizon, the trader camp, a small steam train.
// Everything toon + ink hulls (stickrig's toon/rim material), heights from H(x, z) so props sit on the sand.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const sm = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
export const RAILTOP = 0.32, GAUGE = 1.0, HILLZ = -150;
export function H(x, z) {
  const ax = Math.abs(x), flat = sm(5, 18, ax), amp = 1 + Math.min(2.2, ax / 70);
  const d = 2.4 * Math.sin(x * 0.043 + z * 0.021) + 1.7 * Math.sin(x * 0.088 - z * 0.034 + 1.3) + 0.8 * Math.sin(x * 0.17 + z * 0.09 + 0.4) + 1.2 * Math.abs(Math.sin(z * 0.012 + x * 0.01));
  const hill = 11 * Math.exp(-(((z - HILLZ) / 26) ** 2)) * sm(3.4, 7, ax) * (1 + 0.3 * Math.sin(x * 0.05));
  const land = flat * (d + 2.6) * amp + hill, beach = sm(300, 420, x);
  return land * (1 - beach) - 4 * beach;
}
export function buildWorld(scene, SR) {
  const { toon } = SR, INK = '#16110f';
  const inkM = (w) => { const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${w.toFixed(4)};`); }; m.customProgramCacheKey = () => 'wink' + w; return m; };
  const mesh = (g, m, o = {}) => { const x = new THREE.Mesh(g, m); x.castShadow = o.cast ?? true; x.receiveShadow = o.recv ?? true; if (o.ink) { const h = new THREE.Mesh(g, inkM(o.ink)); h.castShadow = false; x.add(h); } return x; };
  const W = {};
  // ---------- sky: deep blue zenith → warm haze horizon, flat cartoon clouds ----------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vp; void main(){ float h = vp.y; vec3 sd = normalize(vec3(-0.7, 0.0, 0.6)); float toward = max(0.0, dot(normalize(vec3(vp.x, 0.0, vp.z)), sd));
      // bright cartoon day like the "Nghe tàu tới" test (owner 2026-11-10): pale horizon → clear saturated blue
      vec3 c = mix(vec3(0.86,0.94,1.0), vec3(0.52,0.78,1.0), smoothstep(0.0, 0.12, h));
      c = mix(c, vec3(0.27,0.6,0.98), smoothstep(0.1, 0.4, h));
      c = mix(c, vec3(0.16,0.45,0.92), smoothstep(0.4, 0.9, h)); c += toward * 0.0;
      c = mix(c, vec3(0.7,0.82,0.9), smoothstep(0.0, -0.05, h)); gl_FragColor = vec4(c, 1.0); }` }));
  sky.renderOrder = -1; scene.add(sky); W.sky = sky;
  scene.fog = new THREE.Fog('#cfe6fa', 260, 2200);
  let sd = 11; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const cloudM = (fade) => new THREE.ShaderMaterial({ fog: false, uniforms: { fade: { value: fade } },
    vertexShader: 'varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float fade; varying vec3 vN; varying vec3 vW; void main(){ float l = dot(normalize(vN), normalize(vec3(-0.7, 0.15, 0.6)));
      vec3 top = vec3(1.0, 1.0, 1.0), mid = vec3(0.95, 0.97, 1.0), bot = vec3(0.74, 0.82, 0.94); vec3 c = l > 0.35 ? top : (l > -0.1 ? mid : bot);
      c = mix(c, bot * 0.92, smoothstep(0.2, -0.6, vN.y) * 0.5); c = mix(c, vec3(0.86, 0.92, 1.0), fade); gl_FragColor = vec4(c, 1.0); }` });
  W.clouds = new THREE.Group(); scene.add(W.clouds);
  for (const [n, d0, d1, sz, fade] of [[10, 500, 800, 1.0, 0.0], [14, 1000, 1500, 1.5, 0.25], [16, 1800, 2400, 2.0, 0.5]]) { const m = cloudM(fade);
    for (let i = 0; i < n; i++) { const g = new THREE.Group(), a = R() * Math.PI * 2, dist = d0 + R() * (d1 - d0); g.position.set(Math.sin(a) * dist, 110 + R() * 160 * sz, Math.cos(a) * dist);
      const w = (60 + R() * 70) * sz, puffs = 9 + Math.floor(R() * 8);
      for (let k = 0; k < puffs; k++) { const u = R() * 2 - 1, r = w * (0.22 + R() * 0.2) * (1 - Math.abs(u) * 0.45); const s2 = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), m); s2.scale.set(r * 1.15, r, r);
        s2.position.set(u * w, Math.max(0, r * 0.55 - Math.abs(u) * w * 0.12) + R() * r * 0.4, (R() - 0.5) * w * 0.35); g.add(s2); }
      const base = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), m); base.scale.set(w * 1.15, w * 0.12, w * 0.32); g.add(base);
      g.lookAt(0, g.position.y, 0); W.clouds.add(g); } }
  // ---------- dunes ----------
  const NX = 300, NZ = 560, geo = new THREE.PlaneGeometry(1, 1, NX, NZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cA = new THREE.Color('#86cc3e'), cB = new THREE.Color('#62b032'), cC = new THREE.Color('#a9dc5e'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) * 2, v = pos.getZ(i) + 0.5;   // u ∈ [-1,1], v ∈ [0,1] (front → back)
    const x = Math.sign(u) * 800 * Math.pow(Math.abs(u), 1.8), z = 240 - 2700 * Math.pow(v, 1.6), y = H(x, z);
    pos.setXYZ(i, x, y, z); const k = sm(-1, 6, y + 0.6 * Math.sin(x * 0.3) * Math.sin(z * 0.27)); c.copy(cB).lerp(cA, k); if (y > 5) c.lerp(cC, sm(5, 12, y) * 0.6); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } } geo.computeVertexNormals();
  const sandTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 6000; i++) { const v = 200 + Math.random() * 55 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    g.strokeStyle = 'rgba(140,110,80,0.16)'; g.lineWidth = 3; for (let y = 0; y < 256; y += 18) { g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + Math.sin(x / 256 * Math.PI * 4 + y) * 5); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(500, 900); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const sandM = toon('#ffffff', { rim: 0, kick: 0, map: sandTex }); sandM.vertexColors = true;
  const ground = mesh(geo, sandM, { cast: false }); scene.add(ground); W.ground = ground;
  // ripple stripes on the sand near the camp (decal plane with alpha)
  { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.strokeStyle = 'rgba(170,100,40,0.18)'; g.lineWidth = 5;
    for (let y = 0; y < 256; y += 22) { g.beginPath(); for (let x = 0; x <= 256; x += 8) g.lineTo(x, y + Math.sin(x / 256 * Math.PI * 2 * 2) * 6); g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 60); t.colorSpace = THREE.SRGBColorSpace;
    for (const sx of []) { const p = new THREE.Mesh(new THREE.PlaneGeometry(9, 400), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.set(sx * 6.2, 0.02, -80); p.renderOrder = 1; scene.add(p); } }
  // ---------- the line: ballast, sleepers, two rails (metre gauge) ----------
  const Z0 = 140, Z1 = -2300, LEN = Z0 - Z1, ZM = (Z0 + Z1) / 2;
  const gv = document.createElement('canvas'); gv.width = gv.height = 256; { const g = gv.getContext('2d'); g.fillStyle = '#8f8c88'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { const x = Math.random() * 256, y = Math.random() * 256, r = 2 + Math.random() * 5; g.fillStyle = ['#a3a09b', '#c4c1bb', '#7f7c78', '#b2aea8', '#94918c', '#d6d3cd'][i % 6]; g.beginPath(); g.ellipse(x, y, r, r * 0.75, Math.random() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,245,225,0.35)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, 7); g.fill(); } }
  const gt = new THREE.CanvasTexture(gv); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(2, LEN / 2.5); gt.colorSpace = THREE.SRGBColorSpace;
  const bal = mesh(new THREE.BoxGeometry(2.3, 0.1, LEN), toon('#d7d2cc', { rim: 0, kick: 0, map: gt }), { cast: false }); bal.position.set(0, 0.05, ZM); scene.add(bal);
  for (const sx of [-1, 1]) { const sl = mesh(new THREE.BoxGeometry(0.5, 0.1, LEN), toon('#b3afa8', { rim: 0, kick: 0 }), { cast: false }); sl.position.set(sx * 1.3, 0.02, ZM); sl.rotation.z = sx * 0.25; scene.add(sl); }
  const N = Math.floor(LEN / 0.62), sg = new THREE.BoxGeometry(1.75, 0.1, 0.2), sMat = toon('#7b4a2a', { rim: 0.2, kick: 0 });
  const sleepers = new THREE.InstancedMesh(sg, sMat, N); const mm = new THREE.Matrix4();
  for (let i = 0; i < N; i++) { mm.makeTranslation(0, 0.15, Z0 - i * 0.62); sleepers.setMatrixAt(i, mm); } sleepers.receiveShadow = true; sleepers.castShadow = false; scene.add(sleepers);
  const railM = toon('#8b9097', { rim: 0.5, kick: 0.3 }), headM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.12, 1.08) });
  W.rails = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * GAUGE / 2, 0, ZM);
    const web = mesh(new THREE.BoxGeometry(0.03, 0.09, LEN), railM, { cast: false }); web.position.y = 0.245; g.add(web);
    const foot = mesh(new THREE.BoxGeometry(0.1, 0.02, LEN), railM, { cast: false }); foot.position.y = 0.21; g.add(foot);
    const hd = mesh(new THREE.BoxGeometry(0.065, 0.035, LEN), railM, { cast: false }); hd.position.y = RAILTOP - 0.018; g.add(hd);
    const top = mesh(new THREE.BoxGeometry(0.045, 0.004, LEN), headM, { cast: false }); top.position.y = RAILTOP + 0.001; g.add(top);
    scene.add(g); W.rails.push(g); }
  // ---------- telegraph poles + wires along the line ----------
  const poleM = toon('#5b3e2a', { rim: 0.4 }), insM = toon('#dfe7ea', { rim: 0.3 }), wireM = new THREE.LineBasicMaterial({ color: '#2a2220' });
  const tops = [];
  for (let z = 120; z > -2000; z -= 42) { const x = -4.2, y0 = H(x, z); const p = mesh(new THREE.CylinderGeometry(0.07, 0.1, 6.4, 7), poleM, { ink: 0.012 }); p.position.set(x, y0 + 3.2, z); scene.add(p);
    const arm = mesh(new THREE.BoxGeometry(1.3, 0.1, 0.1), poleM, { ink: 0.01 }); arm.position.set(x, y0 + 5.9, z); scene.add(arm);
    for (const ax of [-0.5, 0.5]) { const ins = mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6), insM, { cast: false }); ins.position.set(x + ax, y0 + 6.02, z); scene.add(ins); }
    tops.push([x, y0 + 6.08, z]); }
  for (const ax of [-0.5, 0.5]) { const pts = []; for (let i = 0; i + 1 < tops.length; i++) { const [x, y, z] = tops[i], [, y2, z2] = tops[i + 1]; for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push(V(x + ax, y + (y2 - y) * f - Math.sin(f * Math.PI) * 0.55, z + (z2 - z) * f)); } }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireM)); }
  // ---------- scrub bushes on the dunes ----------
  { const bg = new THREE.IcosahedronGeometry(1, 1), bm = toon('#5f8a3e', { rim: 0.4 }); const n = 520, inst = new THREE.InstancedMesh(bg, bm, n); const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let k = 0; sd = 5; while (k < n) { const x = (R() - 0.5) * 300, z = 60 - R() * 520; if (Math.abs(x) < 6) continue; const r = 0.35 + R() * 0.9; p.set(x, H(x, z) + r * 0.3, z); s.set(r * 1.3, r * 0.7, r); mm.compose(p, q, s); inst.setMatrixAt(k++, mm); }
    inst.castShadow = true; inst.receiveShadow = true; scene.add(inst); }

  // ---------- camp props ----------
  const wood = toon('#8b5e3c', { rim: 0.45 }), wood2 = toon('#6d4529', { rim: 0.4 }), bam = toon('#c9a560', { rim: 0.5 });
  // lean-to (lán): four bamboo poles, striped canvas roof sloping to one side, straddling the rail
  const lan = new THREE.Group(); scene.add(lan); W.lan = lan;
  { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 16; const g = cv.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f3e7cf' : '#c8453a'; g.fillRect(i * 32, 0, 32, 16); }
    const tt = new THREE.CanvasTexture(cv); tt.colorSpace = THREE.SRGBColorSpace;
    for (const [x, z, h] of [[-1.8, -1.2, 2.5], [1.8, -1.2, 1.7], [-1.8, 1.2, 2.5], [1.8, 1.2, 1.7]]) { const p = mesh(new THREE.CylinderGeometry(0.045, 0.05, h, 7), bam, { ink: 0.008 }); p.position.set(x, h / 2, z); lan.add(p); }
    const roof = mesh(new THREE.BoxGeometry(4.3, 0.04, 3.0), toon('#ffffff', { rim: 0.3, map: tt, side: THREE.DoubleSide }), { ink: 0.01 }); roof.position.set(0, 2.12, 0); roof.rotation.z = -0.2; lan.add(roof);
    const mat = mesh(new THREE.BoxGeometry(2.6, 0.03, 1.8), toon('#d9b46a', { rim: 0 }), { cast: false }); mat.position.set(-0.2, RAILTOP + 0.02, 0); lan.add(mat);
    for (const [x, z, s, cc] of [[-1.3, 0.6, 0.45, '#cdb48a'], [-1.0, -0.5, 0.38, '#b8956a'], [1.2, 0.5, 0.42, '#d8c39c'], [1.35, -0.6, 0.34, '#a8835a']]) { const b = mesh(new RoundedBoxGeometry(s * 1.4, s, s, 3, s * 0.3), toon(cc, { rim: 0.4 }), { ink: 0.006 }); b.position.set(x, RAILTOP + s / 2, z); lan.add(b); } }
  lan.position.set(0, 0, -4);
  // ox cart (xe bò), across the rail: two big spoked wheels, plank bed, shafts on the ground (unhitched)
  const cart = new THREE.Group(); scene.add(cart); W.cart = cart;
  { const bed = mesh(new RoundedBoxGeometry(2.4, 0.12, 1.3, 2, 0.03), wood, { ink: 0.008 }); bed.position.set(0, 0.95, 0); cart.add(bed);
    for (const sz of [-1, 1]) { const side = mesh(new THREE.BoxGeometry(2.4, 0.32, 0.06), wood2, { ink: 0.007 }); side.position.set(0, 1.17, sz * 0.63); cart.add(side); }
    for (const sz of [-1, 1]) { const w = new THREE.Group(); w.position.set(0, 0.62, sz * 0.82); cart.add(w);
      const rim = mesh(new THREE.TorusGeometry(0.6, 0.05, 8, 24), wood2, { ink: 0.008 }); w.add(rim); const hub = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 10), wood2); hub.rotation.x = Math.PI / 2; w.add(hub);
      for (let k = 0; k < 8; k++) { const sp = mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 5), wood, { cast: false }); sp.rotation.z = k * Math.PI / 8; w.add(sp); } }
    const ax = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), wood2); ax.rotation.x = Math.PI / 2; ax.position.y = 0.62; cart.add(ax);
    for (const sz of [-0.35, 0.35]) { const sh = mesh(new THREE.CylinderGeometry(0.04, 0.035, 2.6, 6), wood, { ink: 0.007 }); sh.rotation.z = Math.PI / 2 - 0.36; sh.position.set(2.2, 0.48, sz); cart.add(sh); }
    for (const [x, z, s] of [[-0.6, 0.2, 0.42], [0.3, -0.25, 0.38], [0.1, 0.3, 0.34]]) { const b = mesh(new RoundedBoxGeometry(s * 1.3, s, s, 3, s * 0.3), toon('#c9a77a', { rim: 0.4 }), { ink: 0.006 }); b.position.set(x, 1.01 + s / 2, z); cart.add(b); } }
  // ox (resting beside the camp)
  const ox = new THREE.Group(); scene.add(ox); W.ox = ox;
  { const om = toon('#c58a52', { rim: 0.6 }), dk = toon('#3b2a20', { rim: 0.3 }), hornM = toon('#efe6d2', { rim: 0.3 });
    const body = mesh(new THREE.SphereGeometry(0.6, 20, 14), om, { ink: 0.012 }); body.scale.set(0.85, 0.7, 1.55); body.position.y = 0.55; ox.add(body);
    const hump = mesh(new THREE.SphereGeometry(0.28, 14, 10), om, { ink: 0.01 }); hump.position.set(0, 0.95, 0.55); ox.add(hump);
    const head = mesh(new THREE.SphereGeometry(0.3, 16, 12), om, { ink: 0.01 }); head.scale.set(0.8, 0.85, 1.25); head.position.set(0, 0.85, 1.25); ox.add(head);
    const muz = mesh(new THREE.SphereGeometry(0.17, 12, 10), toon('#e9c9a8', { rim: 0.3 }), { ink: 0.008 }); muz.position.set(0, 0.74, 1.55); ox.add(muz);
    for (const sd2 of [-1, 1]) { const hn = mesh(new THREE.ConeGeometry(0.05, 0.32, 8), hornM, { ink: 0.006 }); hn.position.set(sd2 * 0.2, 1.12, 1.15); hn.rotation.z = -sd2 * 0.9; ox.add(hn);
      const e = mesh(new THREE.SphereGeometry(0.035, 8, 6), dk, { cast: false }); e.position.set(sd2 * 0.16, 0.92, 1.45); ox.add(e);
      for (const lz of [-0.6, 0.6]) { const lg = mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.3, 7), om, { ink: 0.006 }); lg.rotation.x = Math.PI / 2; lg.position.set(sd2 * 0.42, 0.12, lz + 0.25); ox.add(lg); } } }
  ox.position.set(-5.2, 0, 1.5); ox.rotation.y = 0.5;
  // porridge pot on a wood fire beside the rail
  const pot = new THREE.Group(); scene.add(pot); W.pot = pot; const fire = new THREE.Group(); scene.add(fire); W.fire = fire;
  { const pm = toon('#2c2a2e', { rim: 0.8, kick: 0.5 }); const prof = [[0, 0], [0.2, 0.01], [0.3, 0.1], [0.32, 0.25], [0.29, 0.4], [0.3, 0.42]].map(([r, y]) => new THREE.Vector2(r, y));
    const body = mesh(new THREE.LatheGeometry(prof, 24), toon('#2c2a2e', { rim: 0.8, kick: 0.5, side: THREE.DoubleSide }), { ink: 0.008 }); pot.add(body);
    const por = mesh(new THREE.CircleGeometry(0.28, 24), toon('#f4ead2', { rim: 0 }), { cast: false }); por.rotation.x = -Math.PI / 2; por.position.y = 0.36; pot.add(por); W.porridge = por;
    for (const sd2 of [-1, 1]) { const ear = mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 10), pm); ear.position.set(sd2 * 0.33, 0.36, 0); ear.rotation.y = Math.PI / 2; pot.add(ear); }
    for (let k = 0; k < 3; k++) { const a = k * 2.1, st = mesh(new THREE.DodecahedronGeometry(0.13), toon('#8d8378', { rim: 0.4 }), { ink: 0.006 }); st.position.set(Math.cos(a) * 0.3, 0.1, Math.sin(a) * 0.3); fire.add(st); }
    for (let k = 0; k < 4; k++) { const lg = mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.7, 6), wood2, { ink: 0.006 }); lg.rotation.set(Math.PI / 2, 0, k * 0.8); lg.position.y = 0.06; fire.add(lg); }
    W.flames = []; for (let k = 0; k < 5; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(k % 2 ? 2.4 : 2.0, k % 2 ? 1.1 : 0.55, 0.15) })); const a = k * 1.3; f.position.set(Math.cos(a) * 0.12, 0.2, Math.sin(a) * 0.12); fire.add(f); W.flames.push(f); } }
  W.steam = []; { const stM = new THREE.MeshBasicMaterial({ color: '#fffaf0', transparent: true, opacity: 0.55, depthWrite: false }); for (let k = 0; k < 7; k++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), stM); scene.add(s); W.steam.push(s); } }
  W.bowl = (() => { const g = new THREE.Group(); const b = mesh(new THREE.SphereGeometry(0.14, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#f3f6f8', { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.008 }); g.add(b);
    const band = mesh(new THREE.TorusGeometry(0.135, 0.012, 6, 24), toon('#2f6fb0', { rim: 0.3 }), { cast: false }); band.rotation.x = Math.PI / 2; band.position.y = -0.03; g.add(band);
    const f = mesh(new THREE.CircleGeometry(0.12, 18), toon('#f4ead2', { rim: 0 }), { cast: false }); f.rotation.x = -Math.PI / 2; f.position.y = -0.02; g.add(f); g.userData.fill = f; scene.add(g); return g; })();
  W.ladle = (() => { const g = new THREE.Group(); const h = mesh(new THREE.CylinderGeometry(0.018, 0.022, 1, 8), wood, { ink: 0.006 }); h.geometry.translate(0, 0.5, 0); g.add(h); g.userData.h = h;
    const cup = new THREE.Group(); g.add(cup); g.userData.cup = cup; const cb = mesh(new THREE.SphereGeometry(0.1, 16, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#8a5a34', { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.007 }); cup.add(cb);
    const cf = mesh(new THREE.CircleGeometry(0.085, 14), toon('#f4ead2', { rim: 0 }), { cast: false }); cf.rotation.x = -Math.PI / 2; cf.position.y = -0.02; cup.add(cf); g.userData.fill = cf; scene.add(g); return g; })();
  W.stream = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.012, 1, 8).translate(0, -0.5, 0), toon('#f4ead2', { rim: 0.2 })); W.stream.visible = false; scene.add(W.stream);
  W.hammer = (() => { const g = new THREE.Group(); const h = mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.6, 6), wood, { ink: 0.003 }); h.position.y = 0.3; g.add(h);
    const hd = mesh(new THREE.BoxGeometry(0.18, 0.07, 0.07), toon('#55575e', { rim: 0.7 }), { ink: 0.004 }); hd.position.y = 0.6; g.add(hd); scene.add(g); return g; })();
  W.rope = mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 6), toon('#c7a46a', { rim: 0.3 }), { cast: false }); scene.add(W.rope);
  // sand grains that hop on the rail head (shot 8)
  W.grains = []; { const gm = toon('#f0c27e', { rim: 0.3 }); for (let k = 0; k < 40; k++) { const g = mesh(new THREE.IcosahedronGeometry(0.008 + (k % 3) * 0.003, 0), gm, { cast: false }); scene.add(g); W.grains.push(g); } }

  // ---------- set dressing: rocks, dry shrubs, cactus-like plants, grass tufts, footprints, camp clutter, markers, birds, dust ----------
  { sd = 21; const q = new THREE.Quaternion(), sc3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e = new THREE.Euler();
    const scatter = (geo, mat, n, fn) => { const im = new THREE.InstancedMesh(geo, mat, n); let k = 0, guard = 0; while (k < n && guard++ < n * 20) { const r = fn(); if (!r) continue; e.set(r.rx || 0, r.ry || R() * 6.28, r.rz || 0); q.setFromEuler(e); p3.set(r.x, r.y, r.z); sc3.set(...r.s); mm.compose(p3, q, sc3); im.setMatrixAt(k++, mm); } im.count = k; im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; };
    const nearTrack = () => { const side = R() < 0.5 ? -1 : 1, x = side * (1.5 + Math.pow(R(), 1.6) * 40), z = 70 - R() * 330; if (Math.abs(x) < 1.45) return null; if (Math.abs(x) < 7 && z > -7 && z < 7) return null; return [x, z]; };
    scatter(new THREE.DodecahedronGeometry(1, 0), toon('#8f877c', { rim: 0.4 }), 520, () => { const p = nearTrack(); if (!p) return null; const r = 0.06 + Math.pow(R(), 3) * 0.6; return { x: p[0], y: H(p[0], p[1]) + r * 0.3, z: p[1], s: [r * 1.3, r * 0.8, r], rx: R(), rz: R() }; });
    scatter(new THREE.DodecahedronGeometry(1, 0), toon('#c8b49a', { rim: 0.3 }), 300, () => { const side = R() < 0.5 ? -1 : 1, x = side * (1.18 + R() * 0.5), z = 60 - R() * 200; const r = 0.03 + R() * 0.07; return { x, y: 0.03, z, s: [r, r * 0.7, r] }; });
    const twig = (() => { const gs = []; for (let i = 0; i < 9; i++) { const g = new THREE.CylinderGeometry(0.008, 0.018, 0.55 + (i % 3) * 0.15, 4); g.translate(0, 0.3, 0); g.rotateZ((i % 2 ? 1 : -1) * (0.35 + (i % 4) * 0.15)); g.rotateY(i * 0.7); gs.push(g); } return mergeGeometries(gs); })();
    scatter(twig, toon('#8a6a44', { rim: 0.3 }), 260, () => { const p = nearTrack(); if (!p) return null; const s2 = 0.6 + R() * 1.2; return { x: p[0], y: H(p[0], p[1]), z: p[1], s: [s2, s2 * (0.8 + R() * 0.5), s2] }; });
    const tuft = (() => { const gs = []; for (let i = 0; i < 7; i++) { const g = new THREE.ConeGeometry(0.025, 0.35, 3); g.translate(0, 0.17, 0); g.rotateZ((i - 3) * 0.16); g.rotateY(i * 0.9); gs.push(g); } return mergeGeometries(gs); })();
    scatter(tuft, toon('#9cad52', { rim: 0.4 }), 1100, () => { const p = nearTrack(); if (!p) return null; const s2 = 0.7 + R() * 1.0; return { x: p[0], y: H(p[0], p[1]), z: p[1], s: [s2, s2, s2] }; });
    const cact = (() => { const gs = [new THREE.CylinderGeometry(0.12, 0.14, 1.4, 8).translate(0, 0.7, 0), new THREE.SphereGeometry(0.12, 8, 6).translate(0, 1.4, 0)];
      for (const sx of [-1, 1]) { gs.push(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6).rotateZ(Math.PI / 2).translate(sx * 0.25, 0.6 + sx * 0.12, 0)); gs.push(new THREE.CylinderGeometry(0.07, 0.07, 0.45, 6).translate(sx * 0.38, 0.85 + sx * 0.12, 0)); gs.push(new THREE.SphereGeometry(0.07, 6, 5).translate(sx * 0.38, 1.08 + sx * 0.12, 0)); }
      return mergeGeometries(gs.map(g => g.toNonIndexed())); })();
    scatter(cact, toon('#5f8448', { rim: 0.5 }), 40, () => { const side = R() < 0.5 ? -1 : 1, x = side * (6 + R() * 30), z = 50 - R() * 250; if (z > -9 && z < 9 && Math.abs(x) < 9) return null; const s2 = 0.7 + R() * 0.8; return { x, y: H(x, z), z, s: [s2, s2, s2] }; });
    // footprints around the camp and along the track
    const fp = new THREE.InstancedMesh(new THREE.CircleGeometry(0.06, 10), new THREE.MeshBasicMaterial({ color: '#8e6232', transparent: true, opacity: 0.35, depthWrite: false }), 260); let k = 0;
    for (const [x0, z0, x1, z1] of [[-1.4, 6, -1.3, -16], [2.0, 2, 4.5, -6], [-2.5, 3, -5.0, 1.5], [1.2, -2, 6, 5], [-3, -3, -9, -8]]) { const n = 50; for (let i = 0; i < n && k < 260; i++) { const f = i / n, x = x0 + (x1 - x0) * f + (i % 2 ? 0.12 : -0.12), z = z0 + (z1 - z0) * f; if (Math.abs(x) < 1.2) continue; e.set(-Math.PI / 2, 0, Math.atan2(x1 - x0, z1 - z0)); q.setFromEuler(e); p3.set(x, Math.max(0, H(x, z)) + 0.012, z); sc3.set(0.7, 1.3, 1); mm.compose(p3, q, sc3); fp.setMatrixAt(k++, mm); } }
    fp.count = k; scene.add(fp); }
  // camp clutter: crates, baskets, water jars, kettle + bowls on a mat, rope coil, hitching post, laundry line, tarp
  const clutter = new THREE.Group(); scene.add(clutter); W.clutter = clutter;
  { const plank = toon('#a87a4c', { rim: 0.45 }), plank2 = toon('#7e5634', { rim: 0.4 }), clay = toon('#b8643c', { rim: 0.5 }), wick = toon('#c9a15e', { rim: 0.4 });
    const crate = (x, z, s, ry = 0, y = 0) => { const g = new THREE.Group(); const b = mesh(new THREE.BoxGeometry(s, s * 0.75, s * 0.8), plank, { ink: 0.008 }); b.position.y = s * 0.375; g.add(b);
      for (const yy of [0.12, 0.62]) { const sl = mesh(new THREE.BoxGeometry(s * 1.02, s * 0.06, s * 0.82), plank2, { cast: false }); sl.position.y = s * yy; g.add(sl); }
      g.position.set(x, y + Math.max(0, H(x, z)), z); g.rotation.y = ry; clutter.add(g); return g; };
    crate(-2.9, -3.2, 0.6, 0.3); crate(-2.85, -3.15, 0.45, 0.6, 0.45); crate(2.9, -5.6, 0.55, -0.2); crate(-3.6, 2.6, 0.5, 0.9);
    const basket = (x, z, r2) => { const b = mesh(new THREE.CylinderGeometry(r2, r2 * 0.8, r2 * 1.1, 14, 1, true), wick, { ink: 0.006 }); b.material.side = THREE.DoubleSide; b.position.set(x, r2 * 0.55, z); clutter.add(b);
      const f = mesh(new THREE.SphereGeometry(r2 * 0.9, 12, 8), toon(['#d64a2c', '#e6c04a', '#6aa04a'][Math.floor(Math.abs(x * 7)) % 3], { rim: 0.4 }), { cast: false }); f.scale.y = 0.4; f.position.set(x, r2 * 1.05, z); clutter.add(f); };
    basket(2.6, -2.7, 0.24); basket(3.1, -2.4, 0.2); basket(-2.4, 4.6, 0.22);
    const jar = (x, z, h2) => { const pr = [[0, 0], [0.12, 0.01], [0.2, 0.12], [0.22, 0.3], [0.16, 0.48], [0.08, 0.55], [0.1, 0.6]].map(([a, b]) => new THREE.Vector2(a * h2, b * h2)); const j = mesh(new THREE.LatheGeometry(pr, 16), clay, { ink: 0.008 }); j.position.set(x, Math.max(0, H(x, z)), z); clutter.add(j); };
    jar(3.3, 0.1, 1.2); jar(3.6, 0.5, 1.0); jar(-3.2, -0.6, 1.3);
    const mat2 = mesh(new THREE.BoxGeometry(1.4, 0.02, 1.0), toon('#c7a35a', { rim: 0 }), { cast: false }); mat2.position.set(2.7, 0.01, 1.9); clutter.add(mat2);
    for (let i = 0; i < 4; i++) { const b = mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#e7eef3', { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); b.position.set(2.4 + (i % 2) * 0.2, 0.09 + Math.floor(i / 2) * 0.05, 1.7); b.rotation.x = Math.PI; clutter.add(b); }
    const ket = mesh(new THREE.SphereGeometry(0.13, 14, 10), toon('#4a4a52', { rim: 0.8 }), { ink: 0.005 }); ket.scale.y = 0.8; ket.position.set(3.0, 0.12, 2.1); clutter.add(ket);
    const coil = mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 18), toon('#c7a46a', { rim: 0.4 }), { ink: 0.005 }); coil.rotation.x = Math.PI / 2; coil.position.set(-2.2, 0.04, 4.3); clutter.add(coil);
    const coil2 = coil.clone(); coil2.position.y = 0.11; coil2.scale.setScalar(0.85); clutter.add(coil2);
    // hitching post next to the ox
    const hp = new THREE.Group(); hp.position.set(-6.6, 0, 3.2); clutter.add(hp);
    for (const sx of [-0.6, 0.6]) { const p2 = mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.2, 7), plank2, { ink: 0.008 }); p2.position.set(sx, 0.6, 0); hp.add(p2); }
    const bar = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5, 7), plank, { ink: 0.008 }); bar.rotation.z = Math.PI / 2; bar.position.y = 1.0; hp.add(bar);
    // laundry line between two poles with cloths
    const ll = new THREE.Group(); ll.position.set(-4.4, 0, -6.2); ll.rotation.y = 0.35; clutter.add(ll); W.laundry = [];
    for (const sx of [-1.6, 1.6]) { const p2 = mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.0, 6), toon('#c9a560', { rim: 0.4 }), { ink: 0.008 }); p2.position.set(sx, 1.0, 0); ll.add(p2); }
    const ln = mesh(new THREE.CylinderGeometry(0.006, 0.006, 3.2, 4), toon('#e9e1cf', { rim: 0 }), { cast: false }); ln.rotation.z = Math.PI / 2; ln.position.y = 1.9; ll.add(ln);
    [['#3a6fb0', -1.1, 0.5], ['#d0c39a', -0.3, 0.6], ['#b0453a', 0.5, 0.45], ['#e8e2d4', 1.15, 0.55]].forEach(([cc, x, h2]) => { const cl = mesh(new THREE.PlaneGeometry(0.5, h2, 2, 4), toon(cc, { rim: 0.3, side: THREE.DoubleSide }), { ink: 0.006 }); cl.geometry.translate(0, -h2 / 2, 0); cl.position.set(x, 1.9, 0); ll.add(cl); W.laundry.push(cl); });
    // tarp over sacks behind the lean-to
    const tarp = mesh(new THREE.SphereGeometry(0.9, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#6f7a4a', { rim: 0.4 }), { ink: 0.01 }); tarp.scale.set(1.2, 0.55, 0.8); tarp.position.set(3.4, 0, -6.4); clutter.add(tarp);
    // ox yoke + harness (unhitched, on the ox's neck)
    const yoke = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 7), plank2, { ink: 0.008 }); yoke.rotation.z = Math.PI / 2; yoke.position.set(0, 1.0, 1.05); ox.add(yoke);
    const strap = mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 16), toon('#5a3a22', { rim: 0.3 })); strap.position.set(0, 0.85, 1.0); ox.add(strap);
    const tether = mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.8, 4), toon('#c7a46a', { rim: 0 }), { cast: false }); tether.rotation.set(0, 0, Math.PI / 2 - 0.3); tether.position.set(-0.9, 0.8, 1.4); ox.add(tether); }
  // km marker + signal post along the line
  { const km = new THREE.Group(); km.position.set(-1.75, 0, -22); scene.add(km);
    const post = mesh(new THREE.BoxGeometry(0.22, 0.8, 0.12), toon('#f1ece2', { rim: 0.4 }), { ink: 0.008 }); post.position.y = 0.4; km.add(post);
    const top = mesh(new THREE.BoxGeometry(0.23, 0.12, 0.13), toon('#c8352f', { rim: 0.4 }), { cast: false }); top.position.y = 0.76; km.add(top);
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#1a1a1a'; g.font = 'bold 74px sans-serif'; g.textAlign = 'center'; g.fillText('KM', 64, 100); g.fillText('196', 64, 190);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.36), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); lab.position.set(0, 0.42, 0.065); km.add(lab); lab.rotation.y = 0; km.rotation.y = Math.PI * 0.15;
    const sg = new THREE.Group(); sg.position.set(1.9, 0, -48); scene.add(sg); const pm = toon('#2e2e33', { rim: 0.7 });
    const pole = mesh(new THREE.CylinderGeometry(0.06, 0.08, 5, 8), pm, { ink: 0.01 }); pole.position.y = 2.5; sg.add(pole);
    const armS = mesh(new THREE.BoxGeometry(1.1, 0.16, 0.05), toon('#c8352f', { rim: 0.5 }), { ink: 0.006 }); armS.position.set(-0.5, 4.4, 0.08); armS.rotation.z = -0.4; sg.add(armS);
    const band = mesh(new THREE.BoxGeometry(0.16, 0.17, 0.06), toon('#f1ece2', { rim: 0.3 }), { cast: false }); band.position.set(-0.85, 4.54, 0.09); band.rotation.z = -0.4; sg.add(band);
    const lampS = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 10), pm, { ink: 0.006 }); lampS.position.y = 5.1; sg.add(lampS);
    const lad = mesh(new THREE.BoxGeometry(0.04, 4.5, 0.25), pm, { cast: false }); lad.position.set(0.1, 2.3, -0.1); sg.add(lad); }
  // far dune ridges (layers toward the horizon)
  { const rm = toon('#d9c8a8', { rim: 0.2 }); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, d = 1100 + (i % 3) * 260; const rd = mesh(new THREE.SphereGeometry(1, 20, 10), rm, { cast: false }); rd.scale.set(260 + (i % 4) * 80, 60 + (i % 3) * 35, 120); rd.position.set(Math.sin(a) * d, -15, Math.cos(a) * d); rd.rotation.y = a; scene.add(rd); } }
  // birds
  W.birds = []; { const bm = new THREE.MeshBasicMaterial({ color: '#2a2220', side: THREE.DoubleSide }); for (let i = 0; i < 9; i++) { const b = new THREE.Group(); for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.12), bm); w.geometry.translate(sx * 0.35, 0, 0); w.userData.sx = sx; b.add(w); } scene.add(b); W.birds.push(b); } }
  // dust motes in the air (follow the camera focus)
  { const n = 500, pg = new THREE.BufferGeometry(), arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = (R() - 0.5) * 30; arr[i * 3 + 1] = R() * 6; arr[i * 3 + 2] = (R() - 0.5) * 30; } pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    W.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#fff0d0', size: 0.035, transparent: true, opacity: 0.55, depthWrite: false })); scene.add(W.dust); }
  W.update = (t, focus) => {
    if (W.clouds) W.clouds.rotation.y = t * 0.0015; if (W.kites) W.kites.forEach((k, i) => { k.rotation.z = Math.sin(t * 1.3 + i) * 0.25; k.position.y += Math.sin(t * 0.9 + i) * 0.01; });
    W.birds.forEach((b, i) => { const a = t * (0.18 + i * 0.01) + i * 0.7, rr = 40 + i * 7; b.position.set(Math.sin(a) * rr - 10, 26 + (i % 4) * 5 + Math.sin(t + i) * 1.5, -60 + Math.cos(a) * rr * 0.6); b.rotation.y = -a; b.children.forEach(w => { w.rotation.z = w.userData.sx * Math.sin(t * 9 + i) * 0.6; }); });
    if (W.laundry) W.laundry.forEach((c, i) => { c.rotation.x = Math.sin(t * 2.3 + i) * 0.18 + 0.1; });
    if (focus) { W.dust.position.set(focus.x, Math.max(0, focus.y - 2), focus.z); W.dust.rotation.y = t * 0.05; }
  };
  // ---------- Phan Thiết scenery: phi lao rows, coconut palms, huts, fence, stacked sleepers, water tank, signal box, goats + cows, kites, the sea ----------
  { const q = new THREE.Quaternion(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3(), e = new THREE.Euler(); sd = 77;
    const canopy = (() => { const gs = []; for (let i = 0; i < 5; i++) { const g = new THREE.ConeGeometry(1.25 - i * 0.18, 1.6, 9); g.translate(0, 3.0 + i * 0.95, 0); gs.push(g); } return mergeGeometries(gs); })();
    const trunkG = new THREE.CylinderGeometry(0.07, 0.13, 4.0, 6).translate(0, 2.0, 0); const spots = [];
    for (let z = 70; z > -260; z -= 4.2) for (const x0 of [-17, -21.5, 23, 27]) spots.push([x0 + (R() - 0.5) * 2.2, z + (R() - 0.5) * 2]);
    for (let i = 0; i < 70; i++) { const x = (R() < 0.5 ? -1 : 1) * (35 + R() * 120), z = 80 - R() * 400; spots.push([x, z]); }
    const tI = new THREE.InstancedMesh(trunkG, toon('#6b4f3a', { rim: 0.3 }), spots.length), cI = new THREE.InstancedMesh(canopy, toon('#3e6b47', { rim: 0.5, kick: 0.3 }), spots.length);
    spots.forEach(([x, z], i) => { const h = 1.1 + R() * 0.7; e.set((R() - 0.5) * 0.08, R() * 6, (R() - 0.5) * 0.08); q.setFromEuler(e); p3.set(x, H(x, z) - 0.1, z); s3.set(h * 0.9, h, h * 0.9); mm.compose(p3, q, s3); tI.setMatrixAt(i, mm); cI.setMatrixAt(i, mm); });
    for (const im of [tI, cI]) { im.castShadow = true; im.receiveShadow = true; scene.add(im); }
    // coconut palms toward the sea
    const palm = (x, z, h) => { const g = new THREE.Group(); g.position.set(x, H(x, z), z); scene.add(g); const pts = []; for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push(V(Math.sin(f * 1.4) * h * 0.18, f * h, 0)); }
      const tr = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.16, 7), toon('#8a6a4c', { rim: 0.4 }), { ink: 0.02 }); g.add(tr); const top = pts[8];
      for (let k = 0; k < 8; k++) { const fr = mesh(new THREE.ConeGeometry(0.45, 3.6, 4, 1, true), toon('#4f8a3c', { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.015 }); fr.scale.set(1, 1, 0.15); fr.geometry.translate(0, 1.8, 0); fr.position.copy(top); fr.rotation.set(0, k * 0.8, 1.15 + (k % 2) * 0.25, 'YXZ'); g.add(fr); }
      for (let k = 0; k < 3; k++) { const nut = mesh(new THREE.SphereGeometry(0.18, 8, 6), toon('#6a4a2a', { rim: 0.4 }), { ink: 0.01 }); nut.position.copy(top).add(V(Math.cos(k * 2) * 0.25, -0.25, Math.sin(k * 2) * 0.25)); g.add(nut); }
      g.rotation.y = R() * 6; };
    for (let i = 0; i < 26; i++) { const x = 40 + R() * 200, z = 60 - R() * 360; palm(x, z, 7 + R() * 4); } palm(14, -26, 8); palm(16.5, -22, 9.5); palm(-15, 18, 8);
    // huts / roadside shacks
    const hut = (x, z, ry, s2 = 1) => { const g = new THREE.Group(); g.position.set(x, H(x, z), z); g.rotation.y = ry; g.scale.setScalar(s2); scene.add(g);
      const w = mesh(new THREE.BoxGeometry(3.2, 2.0, 2.6), toon('#b08a5e', { rim: 0.4 }), { ink: 0.02 }); w.position.y = 1.0; g.add(w);
      const rf = mesh(new THREE.ConeGeometry(2.6, 1.6, 4), toon('#d8bf86', { rim: 0.5 }), { ink: 0.02 }); rf.rotation.y = Math.PI / 4; rf.scale.set(1.15, 1, 0.95); rf.position.y = 2.75; g.add(rf);
      const dr = mesh(new THREE.BoxGeometry(0.8, 1.4, 0.05), toon('#4a3524', { rim: 0.2 }), { cast: false }); dr.position.set(0.4, 0.7, 1.31); g.add(dr);
      const wi = mesh(new THREE.BoxGeometry(0.6, 0.5, 0.05), toon('#2b2622', { rim: 0 }), { cast: false }); wi.position.set(-0.9, 1.25, 1.31); g.add(wi); };
    hut(-30, -24, 0.5); hut(-27, -30, 0.2, 0.8); hut(34, 14, -0.6); hut(-24, 42, 2.4); hut(30, -70, -0.3, 1.2); hut(-40, -95, 0.8);
    // fence along the camp side
    const fm = toon('#8b6a48', { rim: 0.4 }); for (let z = 22; z > -44; z -= 1.8) { const x = -10.5 + Math.sin(z * 0.2) * 0.3; const p = mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), fm, { ink: 0.008 }); p.position.set(x, H(x, z) + 0.6, z); p.rotation.z = Math.sin(z) * 0.06; scene.add(p);
      for (const yy of [0.45, 0.95]) { const r2 = mesh(new THREE.BoxGeometry(0.05, 0.06, 1.85), fm, { cast: false }); r2.position.set(x, H(x, z) + yy, z - 0.9); scene.add(r2); } }
    // stacked old sleepers by the line
    const sl2 = toon('#6a5848', { rim: 0.3 }); for (let L2 = 0; L2 < 4; L2++) for (let k = 0; k < 4 - (L2 > 2 ? 1 : 0); k++) { const b2 = mesh(new THREE.BoxGeometry(1.75, 0.16, 0.24), sl2, { ink: 0.006 }); b2.position.set(2.6, 0.08 + L2 * 0.17, -13.5 + k * 0.3 + (L2 % 2) * 0.12); b2.rotation.y = L2 % 2 ? 0.05 : -0.04; scene.add(b2); }
    // water tank on legs + signal box
    const wt = new THREE.Group(); wt.position.set(5.5, 0, -36); scene.add(wt); const tm = toon('#5d7f96', { rim: 0.6 }), lm = toon('#3b3a3c', { rim: 0.5 });
    for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lg = mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6), lm, { ink: 0.01 }); lg.position.set(lx * 0.9, 2.25, lz * 0.9); wt.add(lg); }
    const tank = mesh(new THREE.CylinderGeometry(1.4, 1.4, 2.0, 20), tm, { ink: 0.02 }); tank.position.y = 5.4; wt.add(tank); const tc = mesh(new THREE.ConeGeometry(1.5, 0.7, 20), lm, { ink: 0.015 }); tc.position.y = 6.75; wt.add(tc);
    const spout = mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.2, 8), lm, { ink: 0.008 }); spout.rotation.z = Math.PI / 2 - 0.4; spout.position.set(-1.9, 4.6, 0); wt.add(spout);
    const sb = new THREE.Group(); sb.position.set(-3.6, 0, -62); scene.add(sb); const sbw = mesh(new THREE.BoxGeometry(2.2, 2.4, 2.0), toon('#ece6da', { rim: 0.4 }), { ink: 0.02 }); sbw.position.y = 1.2; sb.add(sbw);
    const sbr = mesh(new THREE.ConeGeometry(1.8, 0.9, 4), toon('#b2402f', { rim: 0.5 }), { ink: 0.015 }); sbr.rotation.y = Math.PI / 4; sbr.position.y = 2.85; sb.add(sbr);
    const sbwin = mesh(new THREE.BoxGeometry(1.6, 0.6, 0.05), toon('#2b3a4a', { rim: 0.6 }), { cast: false }); sbwin.position.set(0, 1.6, 1.01); sb.add(sbwin);
    // goats and cows grazing
    const beast = (x, z, s2, col, ry) => { const g = new THREE.Group(); g.position.set(x, H(x, z), z); g.rotation.y = ry; g.scale.setScalar(s2); scene.add(g); const m = toon(col, { rim: 0.5 });
      const b2 = mesh(new THREE.SphereGeometry(0.5, 14, 10), m, { ink: 0.02 }); b2.scale.set(0.7, 0.65, 1.3); b2.position.y = 0.9; g.add(b2); const hd = mesh(new THREE.SphereGeometry(0.25, 12, 8), m, { ink: 0.015 }); hd.scale.set(0.8, 0.9, 1.3); hd.position.set(0, 0.85, 0.75); hd.rotation.x = 0.6; g.add(hd);
      for (const [lx, lz] of [[-0.2, -0.4], [0.2, -0.4], [-0.2, 0.4], [0.2, 0.4]]) { const lg = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.65, 6), m, { ink: 0.01 }); lg.position.set(lx, 0.33, lz); g.add(lg); } };
    [[-21, -10], [-19.5, -13], [-23, -14.5], [-20, -8], [-24, -11]].forEach(([x, z], i) => beast(x, z, 0.55, i % 2 ? '#f2eee6' : '#4a3f36', i * 1.3));
    beast(29, -30, 1.2, '#b9845a', 0.7); beast(32, -26, 1.1, '#e8e2d6', 2.1); beast(-35, 8, 1.15, '#a8744a', 4.0);
    // kites
    W.kites = []; for (const [x, y, z, c1] of [[16, 30, -45, '#d64a3a'], [-26, 38, -80, '#3a8fd6'], [40, 26, 10, '#e6c04a']]) { const k = new THREE.Group(); k.position.set(x, y, z); scene.add(k);
      const dm = mesh(new THREE.PlaneGeometry(1.6, 1.6), toon(c1, { rim: 0.3, side: THREE.DoubleSide }), { cast: false, ink: 0.02 }); dm.rotation.z = Math.PI / 4; dm.scale.y = 1.4; k.add(dm);
      const tail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, -1.2, 0), V(0.4, -3, 0), V(-0.3, -5, 0), V(0.3, -7, 0)]), new THREE.LineBasicMaterial({ color: '#222' })); k.add(tail);
      const str = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(-x * 0.6, -y * 0.98, -z * 0.3)]), new THREE.LineBasicMaterial({ color: '#555' })); k.add(str); W.kites.push(k); }
    // the sea (+x side, beyond the beach)
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(2600, 4000), toon('#3f8fc2', { rim: 0, kick: 0 })); sea.rotation.x = -Math.PI / 2; sea.position.set(330 + 1300, -0.5, -800); sea.receiveShadow = false; scene.add(sea);
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(14, 4000), new THREE.MeshBasicMaterial({ color: '#f4f7f8', transparent: true, opacity: 0.7 })); surf.rotation.x = -Math.PI / 2; surf.position.set(338, -0.45, -800); scene.add(surf); }
  // ---------- tàu Thống Nhất: D19E diesel (Đường sắt Việt Nam) + 5 passenger coaches; faces +z, nose at local z 4.2 ----------
  const train = new THREE.Group(); scene.add(train); W.train = train;
  { const navy = toon('#1f3f7a', { rim: 0.7, kick: 0.4 }), white = toon('#f1efe8', { rim: 0.5 }), yellow = toon('#f1c232', { rim: 0.6 }), dark = toon('#22252b', { rim: 0.8, kick: 0.4 }), grey = toon('#9ea3aa', { rim: 0.6 }),
      redM = toon('#c8352f', { rim: 0.5 }), glass = toon('#1b2a3a', { rim: 0.9, kick: 0.6 }), roofM = toon('#b9bcc2', { rim: 0.6 });
    const T = (geo, m, x, y, z, o = {}) => { const me = mesh(geo, m, { ink: o.ink ?? 0.014 }); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz; (o.to || train).add(me); return me; };
    const tex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
    const plane = (t, w, h, x, y, z, ry, to = train) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true })); m.position.set(x, y, z); m.rotation.y = ry; to.add(m); return m; };
    W.wheels = [];
    const bogie = (z, axles, r, to = train, y0 = 0) => { const g = new THREE.Group(); g.position.set(0, y0, z); to.add(g); const L = (axles - 1) * r * 2.3;
      T(new THREE.BoxGeometry(2.2, 0.35, L + r * 2.2), dark, 0, r + 0.15, 0, { to: g, ink: 0.008 });
      for (let k = 0; k < axles; k++) for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * 0.62, r, -L / 2 + k * r * 2.3); g.add(w); w.userData.r = r;
        const d = mesh(new THREE.CylinderGeometry(r, r, 0.1, 22), dark, { ink: 0.006 }); d.rotation.z = Math.PI / 2; w.add(d);
        for (let q = 0; q < 3; q++) { const sp = mesh(new THREE.BoxGeometry(0.03, r * 1.5, 0.06), grey, { cast: false }); sp.position.x = sx * 0.06; sp.rotation.x = q * Math.PI / 3; w.add(sp); }
        const hub = mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, 0.16, 10), yellow, { ink: 0.004 }); hub.rotation.z = Math.PI / 2; hub.position.x = sx * 0.05; w.add(hub); W.wheels.push(w); }
      for (const sx of [-1, 1]) { T(new THREE.BoxGeometry(0.12, 0.3, L + r * 2.4), dark, sx * 1.05, r + 0.05, 0, { to: g, ink: 0.006 }); for (let k = 0; k < axles; k++) T(new THREE.CylinderGeometry(0.11, 0.11, 0.35, 10), yellow, sx * 1.12, r + 0.25, -L / 2 + k * r * 2.3, { to: g, ink: 0.004 }); }
      return g; };
    // --- D19E locomotive: body z 4.2 → -10.6 ---
    const LZ = -3.2, LL = 14.8;
    T(new RoundedBoxGeometry(2.8, 2.55, LL, 3, 0.18), navy, 0, 2.38, LZ);
    T(new THREE.BoxGeometry(2.86, 0.42, LL - 0.4), white, 0, 2.15, LZ, { ink: 0.006 }); T(new THREE.BoxGeometry(2.88, 0.07, LL - 0.4), redM, 0, 1.9, LZ, { ink: 0 });
    T(new THREE.BoxGeometry(3.0, 0.22, LL + 0.2), dark, 0, 1.0, LZ); T(new RoundedBoxGeometry(2.6, 0.3, LL - 0.6, 2, 0.1), roofM, 0, 3.75, LZ, { ink: 0.01 });
    for (const zz of [-1.2, -4.0, -6.8]) { T(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20), dark, 0, 3.94, zz, { ink: 0.006 }); for (let q = 0; q < 4; q++) T(new THREE.BoxGeometry(0.85, 0.02, 0.06), grey, 0, 4.01, zz, { ry: q * 0.78, ink: 0 }); }
    T(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 12), dark, 0.5, 4.1, 0.9, { ink: 0.008 }); T(new THREE.CylinderGeometry(0.18, 0.22, 0.5, 12), dark, -0.5, 4.1, 0.9, { ink: 0.008 }); W.stackLocal = V(0, 4.4, 0.9);
    // front cab: yellow nose, raked windscreens, headlights, number plate, horn, handrails, coupler
    T(new RoundedBoxGeometry(2.84, 1.25, 0.6, 3, 0.15), yellow, 0, 1.65, 4.0, { ink: 0.012 });
    const ws = T(new THREE.BoxGeometry(2.5, 1.0, 0.12), glass, 0, 2.95, 4.12, { rx: -0.22, ink: 0.008 }); T(new THREE.BoxGeometry(0.1, 1.05, 0.14), navy, 0, 2.95, 4.14, { rx: -0.22, ink: 0 });
    for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.6, 2.4) })); hl.rotation.x = Math.PI / 2; hl.position.set(sx * 0.95, 1.7, 4.32); train.add(hl); T(new THREE.TorusGeometry(0.16, 0.03, 6, 18), dark, sx * 0.95, 1.7, 4.32, { ink: 0 });
      const tl = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), new THREE.MeshBasicMaterial({ color: '#ff3b2e' })); tl.position.set(sx * 1.25, 1.45, 4.31); train.add(tl);
      T(new THREE.BoxGeometry(0.04, 1.1, 0.04), grey, sx * 1.43, 2.0, 4.1, { ink: 0 }); T(new THREE.BoxGeometry(0.25, 0.5, 0.05), dark, sx * 1.48, 2.85, 3.95, { ry: sx * 0.4, ink: 0.004 }); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 4, 2.8) })); top.rotation.x = Math.PI / 2; top.position.set(0, 3.6, 4.2); train.add(top); W.lamp = top;
    const np = tex(512, 128, g => { g.fillStyle = '#f4f1e8'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#1f3f7a'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 118); g.fillStyle = '#1f3f7a'; g.font = 'bold 80px sans-serif'; g.textAlign = 'center'; g.fillText('D19E-959', 256, 94); });
    plane(np, 0.9, 0.23, 0, 2.05, 4.32, 0);
    T(new THREE.CylinderGeometry(0.06, 0.1, 0.35, 10), grey, -0.6, 3.95, 3.4, { rx: Math.PI / 2 + 0.3, ink: 0.004 });
    T(new THREE.BoxGeometry(0.4, 0.3, 0.5), dark, 0, 1.05, 4.45, { ink: 0.006 }); T(new THREE.BoxGeometry(2.6, 0.12, 0.3), dark, 0, 0.75, 4.35, { rx: 0.5, ink: 0.006 });
    // sides: grilles, doors, lettering
    const side = tex(2048, 256, g => { g.clearRect(0, 0, 2048, 256);
      for (let k = 0; k < 7; k++) { const x = 560 + k * 190; g.fillStyle = '#16305e'; g.fillRect(x, 30, 150, 100); g.strokeStyle = '#7f93b8'; g.lineWidth = 3; for (let y = 38; y < 128; y += 10) { g.beginPath(); g.moveTo(x + 6, y); g.lineTo(x + 144, y); g.stroke(); } }
      g.fillStyle = '#16305e'; g.fillRect(60, 22, 120, 190); g.fillStyle = '#1b2a3a'; g.fillRect(200, 30, 170, 95); g.strokeStyle = '#f1efe8'; g.lineWidth = 6; g.strokeRect(200, 30, 170, 95);
      g.fillStyle = '#ffffff'; g.font = 'bold 54px sans-serif'; g.textAlign = 'center'; g.fillText('ĐƯỜNG SẮT VIỆT NAM', 1220, 232); g.font = 'bold 40px sans-serif'; g.fillText('D19E-959', 300, 232); });
    for (const sx of [-1, 1]) plane(side, LL - 0.2, 1.85, sx * 1.42, 2.65, LZ, sx * Math.PI / 2);
    bogie(-0.2, 3, 0.5); bogie(-7.4, 3, 0.5);
    for (const sx of [-1, 1]) T(new THREE.BoxGeometry(0.5, 0.55, 3.2), dark, sx * 1.1, 0.75, -3.8, { ink: 0.006 });
    // --- coaches (Thống Nhất): cream upper, blue lower + red stripe, square windows with passengers, doors, gangway, AC units ---
    const coachTex = (n) => tex(2048, 320, g => { g.fillStyle = '#f2efe6'; g.fillRect(0, 0, 2048, 320); g.fillStyle = '#2a5aa8'; g.fillRect(0, 196, 2048, 124); g.fillStyle = '#c8352f'; g.fillRect(0, 186, 2048, 10); g.fillStyle = '#2a5aa8'; g.fillRect(0, 22, 2048, 8);
      for (const dx of [70, 1860]) { g.fillStyle = '#d9d4c6'; g.fillRect(dx, 40, 118, 270); g.strokeStyle = '#555'; g.lineWidth = 5; g.strokeRect(dx, 40, 118, 270); g.fillStyle = '#1b2a3a'; g.fillRect(dx + 22, 60, 74, 90); }
      for (let i = 0; i < 9; i++) { const x = 250 + i * 176; g.fillStyle = '#1b2a3a'; g.fillRect(x, 52, 130, 112); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 8, 58, 30, 100);
        if (i % 4 !== 2) { g.fillStyle = '#f4ede2'; g.beginPath(); g.arc(x + 62 + (i % 2) * 10, 128, 30, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 5; g.stroke(); g.fillStyle = '#000'; g.fillRect(x + 52 + (i % 2) * 10, 122, 6, 9); g.fillRect(x + 70 + (i % 2) * 10, 122, 6, 9);
          g.fillStyle = ['#c8352f', '#3f7f9e', '#e0a83a', '#6a8a3c'][i % 4]; g.fillRect(x + 30 + (i % 2) * 10, 158, 64, 8); } }
      g.fillStyle = '#ffffff'; g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.fillText('ĐƯỜNG SẮT VIỆT NAM', 860, 270); g.font = 'bold 44px sans-serif'; g.fillText('SE1 · ' + n, 1600, 270); });
    for (let c = 0; c < 5; c++) { const zc = -11.8 - 6.4 - c * 12.8, car = new THREE.Group(); car.position.z = zc; train.add(car); const tx = coachTex(c + 1);
      T(new RoundedBoxGeometry(2.8, 2.7, 12.0, 3, 0.16), toon('#f2efe6', { rim: 0.5 }), 0, 2.3, 0, { to: car });
      for (const sx of [-1, 1]) plane(tx, 11.8, 1.84, sx * 1.415, 2.3, 0, sx * Math.PI / 2, car);
      T(new RoundedBoxGeometry(2.6, 0.25, 11.6, 2, 0.1), roofM, 0, 3.72, 0, { to: car, ink: 0.01 }); for (const zz of [-4, 4]) T(new RoundedBoxGeometry(1.6, 0.35, 1.6, 2, 0.1), grey, 0, 3.98, zz, { to: car, ink: 0.008 });
      T(new THREE.BoxGeometry(2.0, 2.3, 0.8), dark, 0, 2.2, 6.4, { to: car, ink: 0.008 }); T(new THREE.BoxGeometry(2.9, 0.2, 12.0), dark, 0, 0.95, 0, { to: car, ink: 0.006 });
      bogie(-4.3, 2, 0.42, car); bogie(4.3, 2, 0.42, car); }
    // exhaust / dust pools
    W.sparks = []; W.cylSteam = []; { const dm = new THREE.MeshBasicMaterial({ color: '#d9b27a', transparent: true, opacity: 0.6, depthWrite: false }); for (let k = 0; k < 30; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), dm.clone()); p.visible = false; scene.add(p); W.cylSteam.push(p); } }
  }
  // trainAnim(zf, t, speed): nose at zf; wheels turn, slight sway, sand dust kicked up at speed
  W.trainAnim = (zf, t, speed = 10) => { const tr = W.train; tr.visible = true; const k = Math.min(1, speed / 25); tr.position.set(Math.sin(t * 2.1) * 0.02 * k, 0.2 + Math.sin(t * 7) * 0.01 * k, zf - 4.2); tr.rotation.z = Math.sin(t * 1.7) * 0.006 * k;
    W.wheels.forEach(w => { w.rotation.x = zf / w.userData.r; });
    W.cylSteam.forEach((p, i) => { const per = 0.9, ph = ((t + i * per / 30) % per) / per; p.visible = speed > 15; if (!p.visible) return; const sx = i % 2 ? 1 : -1, z0 = zf - 4.2 - 2 - (i % 10) * 7;
      p.position.set(sx * (1.3 + ph * 1.8), 0.25 + ph * 0.8, z0 - ph * 3); p.scale.setScalar(0.5 + ph * 2.2); p.material.opacity = 0.5 * (1 - ph); }); };
  train.traverse(o => { if (o.isMesh) o.castShadow = true; });
  W.puffs = []; { const pm = toon('#5a5650', { rim: 0.6, kick: 0.2 }), pm2 = toon('#3d3a36', { rim: 0.4 }); for (let k = 0; k < 70; k++) { const p = mesh(new THREE.IcosahedronGeometry(1, 2), k % 3 ? pm : pm2, { cast: false }); p.visible = false; scene.add(p); W.puffs.push(p); } }
  // ---------- diagram pieces (shot 9): air dots (sparse) and steel beads (dense) ----------
  W.airDots = []; W.steelDots = [];
  { const am = new THREE.MeshBasicMaterial({ color: '#9fd8ff' }), smt = toon('#d9dde6', { rim: 0.7, kick: 0.4 });
    for (let k = 0; k < 16; k++) { const d = mesh(new THREE.SphereGeometry(0.09, 12, 8), am.clone(), { cast: false }); d.visible = false; scene.add(d); W.airDots.push(d); }
    for (let k = 0; k < 160; k++) { const d = mesh(new THREE.SphereGeometry(0.06, 10, 8), smt.clone(), { cast: false }); d.visible = false; scene.add(d); W.steelDots.push(d); } }
  W.pulse = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3, 0.8), transparent: true })); W.pulse.visible = false; scene.add(W.pulse);
  W.airRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.2, 2.2, 3.0), transparent: true })); W.airRing.visible = false; scene.add(W.airRing);
  return W;
}

// =====================================================================================================================
// 1932 Australian outback (Great Emu War): drought plain, cracked red earth, dead wheat, gum trees, windmill, fence;
// toon emus, Vickers guns on tripods, a 1930s lorry, tracer/dust pools, the "red zone" decal. Same toon + ink look as above.
// =====================================================================================================================
export function HO(x, z) {
  const near = 1 - sm(60, 160, Math.hypot(x, z - 10));
  const d = 0.45 * Math.sin(x * 0.05 + z * 0.031) + 0.3 * Math.sin(x * 0.11 - z * 0.07 + 1.3);
  const far = sm(120, 520, Math.hypot(x, z)) * (7 * (0.5 + 0.5 * Math.sin(x * 0.011 + 1)) + 5 * (0.5 + 0.5 * Math.sin(z * 0.009)));
  return d * (1 - 0.85 * near) + far;
}
export function buildOutback(scene, SR) {
  const { toon } = SR, INK = '#2a1612', UPV = V(0, 1, 0);
  const inkM = (w) => { const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${w.toFixed(4)};`); }; m.customProgramCacheKey = () => 'oink' + w; return m; };
  const mesh = (g, m, o = {}) => { const x = new THREE.Mesh(g, m); x.castShadow = o.cast ?? true; x.receiveShadow = o.recv ?? true; if (o.ink) { const h = new THREE.Mesh(g, inkM(o.ink)); h.castShadow = false; x.add(h); } return x; };
  const seg = (a, b, r, m, o = {}) => { const d = b.clone().sub(a), L = d.length(), s = mesh(new THREE.CylinderGeometry(r, r, L, 6), m, o); s.position.copy(a).addScaledVector(d, 0.5); s.quaternion.setFromUnitVectors(UPV, d.normalize()); return s; };
  const W = {}; let sd = 31; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  // ---------- sky: hot pale horizon → deep blue; dusk uniform blends to a low orange sun ----------
  const skyU = { dusk: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(2600, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float dusk; varying vec3 vp; void main(){ float h = vp.y;
      vec3 hz = mix(vec3(0.98,0.88,0.72), vec3(1.0,0.62,0.34), dusk), md = mix(vec3(0.55,0.78,0.97), vec3(0.86,0.5,0.5), dusk), zn = mix(vec3(0.16,0.44,0.9), vec3(0.2,0.24,0.5), dusk);
      vec3 c = mix(hz, md, smoothstep(0.0,0.2,h)); c = mix(c, zn, smoothstep(0.15,0.75,h));
      vec3 sd = normalize(mix(vec3(-0.35,0.85,0.4), vec3(-0.8,0.22,0.5), dusk)); float s = dot(normalize(vp), sd);
      c += vec3(1.0,0.9,0.7) * smoothstep(0.9985,0.9992,s) * 1.2; c += vec3(1.0,0.8,0.5) * pow(max(s,0.0), 40.0) * (0.25 + 0.35*dusk);
      c = mix(c, vec3(0.75,0.55,0.4), smoothstep(0.0,-0.05,h)); gl_FragColor = vec4(c,1.0); }` }));
  sky.renderOrder = -1; scene.add(sky); W.sky = sky; W.setSky = k => { skyU.dusk.value = k; };
  scene.fog = new THREE.Fog('#f3dcc0', 110, 1700);
  // ---------- parched red earth with cracks ----------
  const NX = 220, NZ = 220, geo = new THREE.PlaneGeometry(1, 1, NX, NZ); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cA = new THREE.Color('#b9784c'), cB = new THREE.Color('#a4643f'), cC = new THREE.Color('#cfa675'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) * 2, v = pos.getZ(i) * 2, x = Math.sign(u) * 900 * Math.pow(Math.abs(u), 2.2), z = 20 + Math.sign(v) * 900 * Math.pow(Math.abs(v), 2.2), y = HO(x, z);
    pos.setXYZ(i, x, y, z); const k = 0.5 + 0.5 * Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2) * Math.sin(z * 0.06 + 1); c.copy(cB).lerp(cA, k).lerp(cC, sm(0.55, 1, 0.5 + 0.5 * Math.sin(x * 0.021 + z * 0.017)) * 0.5); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  if (geo.attributes.normal.getY(Math.floor(pos.count / 2)) < 0) { const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } geo.computeVertexNormals(); }
  const crackT = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4000; i++) { const v = 215 + R() * 40 | 0; g.fillStyle = `rgb(${v},${v - 8},${v - 18})`; g.fillRect(R() * 512, R() * 512, 2, 2); }
    g.strokeStyle = 'rgba(90,38,18,0.42)'; g.lineCap = 'round'; for (let i = 0; i < 70; i++) { let x = R() * 512, y = R() * 512, a = R() * 6.28; g.lineWidth = 1.5 + R() * 2.2; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (R() - 0.5) * 1.3; x += Math.cos(a) * (14 + R() * 26); y += Math.sin(a) * (14 + R() * 26); g.lineTo(x, y); } g.stroke(); }
    const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(260, 260); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; })();
  const gm = toon('#ffffff', { rim: 0, kick: 0, map: crackT }); gm.vertexColors = true;
  const ground = mesh(geo, gm, { cast: false }); scene.add(ground); W.ground = ground;
  // ---------- scatter: rocks, dry tufts, saltbush, dead wheat ----------
  const q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), e3 = new THREE.Euler(), mm = new THREE.Matrix4();
  const scatter = (g, m, n, fn) => { const im = new THREE.InstancedMesh(g, m, n); let k = 0, guard = 0; while (k < n && guard++ < n * 30) { const r = fn(); if (!r) continue; e3.set(r.rx || 0, r.ry ?? R() * 6.28, r.rz || 0); q.setFromEuler(e3); p3.set(r.x, r.y, r.z); s3.set(...r.s); mm.compose(p3, q, s3); im.setMatrixAt(k++, mm); } im.count = k; im.castShadow = true; im.receiveShadow = true; scene.add(im); return im; };
  const open = () => { const x = (R() - 0.5) * 240, z = -40 + R() * 220; return [x, z]; };
  scatter(new THREE.DodecahedronGeometry(1, 0), toon('#9a5a3a', { rim: 0.4 }), 200, () => { const [x, z] = open(); const r = 0.08 + Math.pow(R(), 3) * 0.7; return { x, y: HO(x, z) + r * 0.3, z, s: [r * 1.3, r * 0.8, r], rx: R(), rz: R() }; });
  const tuft = (() => { const gs = []; for (let i = 0; i < 7; i++) { const g = new THREE.ConeGeometry(0.025, 0.4, 3); g.translate(0, 0.2, 0); g.rotateZ((i - 3) * 0.18); g.rotateY(i * 0.9); gs.push(g); } return mergeGeometries(gs); })();
  scatter(tuft, toon('#cdb36a', { rim: 0.4 }), 1400, () => { const [x, z] = open(); const s2 = 0.7 + R() * 1.1; return { x, y: HO(x, z), z, s: [s2, s2, s2] }; });
  scatter(new THREE.IcosahedronGeometry(1, 1), toon('#a29a68', { rim: 0.4 }), 160, () => { const [x, z] = open(); if (Math.abs(x) < 10 && z > -14 && z < 30) return null; const r = 0.35 + R() * 0.6; return { x, y: HO(x, z) + r * 0.3, z, s: [r * 1.3, r * 0.7, r] }; });
  const stalk = (() => { const gs = []; for (let i = 0; i < 4; i++) { const g = new THREE.ConeGeometry(0.018, 0.9, 3); g.translate(0, 0.45, 0); g.rotateZ((i - 1.5) * 0.12); g.rotateY(i * 1.7); gs.push(g); } return mergeGeometries(gs); })();
  scatter(stalk, toon('#d6b04a', { rim: 0.35 }), 5200, () => { const x = -24 + R() * 48, z = 18 + R() * 32; const s2 = 0.55 + R() * 0.7; return { x, y: HO(x, z), z, s: [s2, s2 * (0.6 + R() * 0.7), s2], rz: (R() - 0.5) * 0.3 }; });
  // ---------- gum trees (pale trunks, thin foliage) ----------
  const gum = (x, z, s) => { const g = new THREE.Group(); g.position.set(x, HO(x, z), z); g.rotation.y = R() * 6; scene.add(g);
    const tm = toon('#e4d8bd', { rim: 0.4 }), lm = toon('#8a9a5e', { rim: 0.5, kick: 0.2 });
    const tr = mesh(new THREE.CylinderGeometry(0.1 * s, 0.22 * s, 4.4 * s, 7), tm, { ink: 0.02 }); tr.position.y = 2.2 * s; tr.rotation.z = (R() - 0.5) * 0.12; g.add(tr);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + R(), top = V(Math.cos(a) * 1.7 * s, 5.4 * s + R() * s, Math.sin(a) * 1.7 * s); g.add(seg(V(0, 3.4 * s, 0), top, 0.05 * s, tm, { ink: 0.012 }));
      const f = mesh(new THREE.IcosahedronGeometry(1, 1), lm, { ink: 0.02 }); f.scale.set(1.3 * s, 0.5 * s, 1.1 * s); f.position.copy(top).add(V(0, 0.2 * s, 0)); g.add(f); } };
  for (let i = 0; i < 34; i++) { const side = R() < 0.5 ? -1 : 1, x = side * (20 + R() * 90), z = -30 + R() * 190; gum(x, z, 0.9 + R() * 0.7); }
  gum(-15, 30, 1.2); gum(16, 34, 1.1);
  // ---------- farm: post-and-wire fence with a gate gap, windmill + tank, tin shed ----------
  { const pm = toon('#8b6a48', { rim: 0.4 }), wm = toon('#4a4038', { rim: 0.2 });
    for (const sx of [-1, 1]) { const x0 = sx * 5.5, x1 = sx * 34, L = Math.abs(x1 - x0);
      for (let x = x0; Math.abs(x) <= Math.abs(x1) + 0.01; x += sx * 3) { const p = mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 6), pm, { ink: 0.01 }); p.position.set(x, HO(x, 17) + 0.65, 17); p.rotation.z = (R() - 0.5) * 0.08; scene.add(p); }
      for (const y of [0.45, 0.8, 1.15]) { const w = mesh(new THREE.BoxGeometry(L, 0.014, 0.014), wm, { cast: false }); w.position.set((x0 + x1) / 2, y, 17); scene.add(w); } }
    const mill = new THREE.Group(); mill.position.set(-26, HO(-26, 48), 48); scene.add(mill); const mt = toon('#c9cdc8', { rim: 0.5 });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mill.add(seg(V(sx * 1.4, 0, sz * 1.4), V(sx * 0.35, 10, sz * 0.35), 0.07, mt, { ink: 0.012 }));
    for (const y of [3, 6]) { const r = mesh(new THREE.BoxGeometry(2.2 - y * 0.12, 0.06, 0.05), mt, { cast: false }); r.position.y = y; mill.add(r); }
    const wheel = new THREE.Group(); wheel.position.set(0, 10.4, 0.7); mill.add(wheel); W.millWheel = wheel;
    for (let k = 0; k < 16; k++) { const b = mesh(new THREE.BoxGeometry(0.22, 1.6, 0.03), mt, { ink: 0.006 }); const a = k / 16 * 6.283; b.position.set(Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0); b.rotation.z = -a; wheel.add(b); }
    const hub = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.3, 10), mt, { ink: 0.01 }); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    const vane = mesh(new THREE.BoxGeometry(0.03, 0.9, 1.8), toon('#b2402f', { rim: 0.4 }), { ink: 0.008 }); vane.position.set(0, 10.4, -1.6); mill.add(vane);
    const tank = mesh(new THREE.CylinderGeometry(1.7, 1.7, 1.9, 20), toon('#a7b0b3', { rim: 0.5 }), { ink: 0.02 }); tank.position.set(-31, HO(-31, 46) + 0.95, 46); scene.add(tank);
    const shed = new THREE.Group(); shed.position.set(32, HO(32, 56), 56); shed.rotation.y = -0.3; scene.add(shed);
    const sw = mesh(new THREE.BoxGeometry(8, 3.2, 5), toon('#a98558', { rim: 0.4 }), { ink: 0.03 }); sw.position.y = 1.6; shed.add(sw);
    const sr = mesh(new THREE.BoxGeometry(8.8, 0.18, 5.8), toon('#b9bdb8', { rim: 0.6 }), { ink: 0.02 }); sr.position.y = 3.4; sr.rotation.z = 0.08; shed.add(sr);
    const sdr = mesh(new THREE.BoxGeometry(1.4, 2.2, 0.06), toon('#5b4030', { rim: 0.2 }), { cast: false }); sdr.position.set(0, 1.1, -2.52); shed.add(sdr); }
  // ---------- soldiers' camp: tents + ammunition crate pile (visible in the gun-line shots) ----------
  { const plank = toon('#8a7a4a', { rim: 0.4 }), plank2 = toon('#5f5530', { rim: 0.3 });
    for (const [x, z, ry] of [[-15, -11, 0.4], [-18.5, -8, -0.2], [15.5, -12, 0.3]]) { const t = mesh(new THREE.ConeGeometry(2.0, 2.2, 4), toon('#d3c9a2', { rim: 0.5 }), { ink: 0.02 }); t.rotation.y = Math.PI / 4 + ry; t.position.set(x, HO(x, z) + 1.1, z); t.scale.set(1, 1, 1.3); scene.add(t); }
    const crates = new THREE.Group(); crates.position.set(11, 0, -9.5); scene.add(crates); W.crates = crates;
    [[0, 0, 0], [0.75, 0, 0.1], [1.5, 0, -0.05], [0.35, 0.55, 0.05], [1.1, 0.55, 0.05], [0.75, 1.1, 0.05], [-0.8, 0, 0.5], [2.4, 0, 0.3]].forEach(([x, y, z], i) => { const b = mesh(new THREE.BoxGeometry(0.7, 0.52, 0.5), plank, { ink: 0.01 }); b.position.set(x, y + 0.26, z); b.rotation.y = (i % 3 - 1) * 0.12; crates.add(b);
      const st = mesh(new THREE.BoxGeometry(0.72, 0.06, 0.52), plank2, { cast: false }); st.position.set(x, y + 0.34, z); st.rotation.y = b.rotation.y; crates.add(st); }); }
  // ---------- far red ranges ----------
  { const rm = toon('#c0825a', { rim: 0.2 }); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, d = 1150 + (i % 3) * 200; const rd = mesh(new THREE.SphereGeometry(1, 20, 10), rm, { cast: false }); rd.scale.set(240 + (i % 4) * 90, 40 + (i % 3) * 28, 110); rd.position.set(Math.sin(a) * d, -12, Math.cos(a) * d); rd.rotation.y = a; scene.add(rd); } }
  // ---------- dust motes ----------
  { const n = 400, pg = new THREE.BufferGeometry(), arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = (R() - 0.5) * 30; arr[i * 3 + 1] = R() * 6; arr[i * 3 + 2] = (R() - 0.5) * 30; } pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    W.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#ffe3b0', size: 0.015, transparent: true, opacity: 0.3, depthWrite: false })); scene.add(W.dust); }
  // ---------- EMU (faces +z, ~2.4 units tall before the 0.72 scale): shaggy brown body, blue-grey neck, deadpan heavy brow ----------
  W.makeEmu = (k = 0) => {
    const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot); root.visible = false;
    const fe = toon(['#7a6450', '#6b5746', '#86705a'][k % 3], { rim: 0.45, kick: 0.2 }), fd = toon('#4a3b30', { rim: 0.35 }), fl = toon('#8f7861', { rim: 0.4 }), skin = toon('#9cb3c3', { rim: 0.4 }), lg = toon('#8b7b6c', { rim: 0.3 }), bk = toon('#3a332e', { rim: 0.3 }), eyeW = toon('#f1e6c8', { rim: 0 }), blk = new THREE.MeshBasicMaterial({ color: '#111' });
    const body = mesh(new THREE.SphereGeometry(0.5, 18, 12), fe, { ink: 0.02 }); body.scale.set(0.95, 0.88, 1.15); body.position.set(0, 1.0, 0); pivot.add(body);
    for (let q2 = 0; q2 < 7; q2++) { const a = q2 / 7 * 6.283, tf = mesh(new THREE.SphereGeometry(0.2, 10, 8), q2 % 2 ? fd : fe, { ink: 0.014 }); tf.scale.set(0.9, 0.7, 1.2); tf.position.set(Math.cos(a) * 0.48, 0.92 + (q2 % 3) * 0.12, Math.sin(a) * 0.5); tf.rotation.y = a; pivot.add(tf); }
    const rump = mesh(new THREE.SphereGeometry(0.38, 14, 10), fd, { ink: 0.016 }); rump.scale.set(0.95, 0.95, 0.9); rump.position.set(0, 1.18, -0.5); pivot.add(rump);
    const belly = mesh(new THREE.SphereGeometry(0.34, 14, 10), fl, { ink: 0.014 }); belly.scale.set(1.0, 0.8, 1.0); belly.position.set(0, 0.82, 0.1); pivot.add(belly);
    const neck = new THREE.Group(); neck.position.set(0, 1.28, 0.42); pivot.add(neck);
    const curve = new THREE.CatmullRomCurve3([V(0, 0, 0), V(0, 0.2, 0.1), V(0, 0.5, 0.1), V(0, 0.78, 0.2), V(0, 0.96, 0.3)]);
    neck.add(mesh(new THREE.TubeGeometry(curve, 14, 0.14, 8), skin, { ink: 0.016 }));
    for (const [ny, nz, nr] of [[0.12, 0.05, 0.19], [0.32, 0.1, 0.17], [0.55, 0.11, 0.15], [0.75, 0.18, 0.13]]) { const ru = mesh(new THREE.SphereGeometry(nr, 10, 8), fe, { ink: 0.012 }); ru.position.set(0, ny, nz); ru.scale.set(1, 0.7, 1); neck.add(ru); }
    const head = new THREE.Group(); head.position.set(0, 1.0, 0.34); neck.add(head);
    const hd = mesh(new THREE.SphereGeometry(0.13, 12, 10), skin, { ink: 0.014 }); hd.scale.set(0.9, 0.9, 1.25); head.add(hd);
    const bq = mesh(new THREE.ConeGeometry(0.04, 0.18, 8), bk, { ink: 0.008 }); bq.rotation.x = Math.PI / 2; bq.position.set(0, -0.02, 0.2); head.add(bq);
    for (const sx of [-1, 1]) { const ey = mesh(new THREE.SphereGeometry(0.036, 10, 8), eyeW, { cast: false }); ey.position.set(sx * 0.075, 0.03, 0.06); head.add(ey);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), blk); pu.position.set(sx * 0.092, 0.03, 0.085); head.add(pu);
      const br = mesh(new THREE.BoxGeometry(0.1, 0.022, 0.05), fd, { cast: false }); br.position.set(sx * 0.08, 0.075, 0.07); br.rotation.z = -sx * 0.35; head.add(br); }
    const hip = [], knee = [];
    for (const sx of [-1, 1]) { const h = new THREE.Group(); h.position.set(sx * 0.26, 0.92, -0.05); pivot.add(h); const th = mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.5, 7), lg, { ink: 0.01 }); th.position.y = -0.25; h.add(th);
      const kn = new THREE.Group(); kn.position.set(0, -0.5, 0); h.add(kn); const sh = mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.5, 7), lg, { ink: 0.01 }); sh.position.y = -0.25; kn.add(sh);
      const ft = mesh(new THREE.BoxGeometry(0.13, 0.05, 0.3), bk, { ink: 0.008 }); ft.position.set(0, -0.5, 0.1); kn.add(ft); hip.push(h); knee.push(kn); }
    root.userData = { pivot, neck, head, hip, knee }; Object.assign(root, { pivot, neck, head, hip, knee, root }); return root; };
  // ---------- Vickers gun on a tripod: origin = rear grips at waist height, barrel toward +z ----------
  W.makeGun = () => { const g = new THREE.Group(), dk = toon('#2e2f2a', { rim: 0.6, kick: 0.3 }), ol = toon('#5b6046', { rim: 0.5 }), wd = toon('#4d5233', { rim: 0.4 });
    const bd = mesh(new THREE.BoxGeometry(0.11, 0.13, 0.36), dk, { ink: 0.01 }); bd.position.set(0, 0, 0.18); g.add(bd);
    const jk = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.62, 10), ol, { ink: 0.012 }); jk.rotation.x = Math.PI / 2; jk.position.set(0, 0.02, 0.62); g.add(jk);
    const br = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8), dk, { ink: 0.006 }); br.rotation.x = Math.PI / 2; br.position.set(0, 0.02, 1.07); g.add(br);
    for (const sx of [-1, 1]) { const gr = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 6), dk, { cast: false }); gr.position.set(sx * 0.07, 0.04, 0.02); g.add(gr); }
    const am = mesh(new THREE.BoxGeometry(0.1, 0.16, 0.2), wd, { ink: 0.008 }); am.position.set(0.14, -0.04, 0.2); g.add(am);
    const hub = V(0, -0.06, 0.4); for (const [x, z] of [[-0.55, 0.95], [0.55, 0.95], [0, -0.35]]) g.add(seg(hub, V(x, -GHT(), z), 0.022, dk, { ink: 0.008 }));
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 0.6) }), fg = new THREE.Group(); fg.position.set(0, 0.02, 1.25); fg.visible = false;
    const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 8), fm); f1.rotation.x = Math.PI / 2; f1.position.z = 0.2; fg.add(f1);
    const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.1, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.4, 1.4) })); f2.rotation.x = -Math.PI / 2; fg.add(f2); g.add(fg); g.userData.flash = fg; g.visible = false; return g; };
  function GHT() { return 0.95; }
  // ---------- 1930s army lorry (faces +z) ----------
  W.makeTruck = () => { const g = new THREE.Group(), ol = toon('#6f7442', { rim: 0.5 }), dk = toon('#2a2a2a', { rim: 0.5 }), cv = toon('#cfc7a2', { rim: 0.4 }), gl = toon('#26323a', { rim: 0.8 });
    const T = (geo, m, x, y, z, o = {}) => { const me = mesh(geo, m, { ink: o.ink ?? 0.02 }); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.rz) me.rotation.z = o.rz; g.add(me); return me; };
    T(new THREE.BoxGeometry(1.9, 0.3, 6.2), dk, 0, 0.75, 0); T(new RoundedBoxGeometry(1.9, 1.5, 1.6, 2, 0.12), ol, 0, 1.7, 1.3); T(new THREE.BoxGeometry(1.6, 0.7, 0.05), gl, 0, 2.0, 2.12, { ink: 0 });
    T(new RoundedBoxGeometry(1.7, 1.05, 1.5, 2, 0.12), ol, 0, 1.35, 2.7); T(new THREE.BoxGeometry(1.3, 0.8, 0.06), dk, 0, 1.3, 3.48, { ink: 0.01 });
    for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2) })); hl.position.set(sx * 0.65, 1.55, 3.45); g.add(hl); }
    T(new THREE.BoxGeometry(1.9, 0.14, 3.6), dk, 0, 1.0, -1.7);
    for (const sx of [-1, 1]) T(new THREE.BoxGeometry(0.08, 0.7, 3.5), ol, sx * 0.95, 1.4, -1.7);
    T(new THREE.BoxGeometry(1.9, 0.7, 0.08), ol, 0, 1.4, -3.45);
    for (const sx of [-1, 1]) { const pn = mesh(new THREE.BoxGeometry(1.15, 0.07, 3.5), cv, { ink: 0.015 }); pn.position.set(sx * 0.5, 2.05, -1.7); pn.rotation.z = sx * 0.5; g.add(pn); }
    for (const sx of [-1, 1]) { const sd2 = mesh(new THREE.BoxGeometry(0.06, 0.55, 3.5), cv, { cast: false }); sd2.position.set(sx * 0.95, 1.75, -1.7); g.add(sd2); }
    W.truckWheels = []; for (const [x, z, r] of [[-1.0, 2.3, 0.55], [1.0, 2.3, 0.55], [-1.0, -2.0, 0.6], [1.0, -2.0, 0.6]]) { const w = new THREE.Group(); w.position.set(x, r, z); g.add(w); const tire = mesh(new THREE.CylinderGeometry(r, r, 0.32, 18), dk, { ink: 0.02 }); tire.rotation.z = Math.PI / 2; w.add(tire);
      const hubc = mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.34, 10), toon('#b9b49a', { rim: 0.4 }), { cast: false }); hubc.rotation.z = Math.PI / 2; w.add(hubc); const sp = mesh(new THREE.BoxGeometry(0.36, 0.1, r * 0.8), dk, { cast: false }); w.add(sp); W.truckWheels.push(w); }
    g.visible = false; return g; };
  // ---------- pools: tracers, dust puffs, the red zone ----------
  W.tracers = []; { const tm = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.2, 1.0) }); for (let k = 0; k < 28; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 1.1), tm); m.visible = false; scene.add(m); W.tracers.push(m); } }
  W.dustP = []; { const dm = new THREE.MeshBasicMaterial({ color: '#e0b27a', transparent: true, opacity: 0.6, depthWrite: false }); for (let k = 0; k < 40; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), dm.clone()); p.visible = false; scene.add(p); W.dustP.push(p); } }
  W.zone = new THREE.Mesh(new THREE.CircleGeometry(1, 56), new THREE.MeshBasicMaterial({ color: '#ff2a1a', transparent: true, opacity: 0.14, depthWrite: false })); W.zone.rotation.x = -Math.PI / 2; W.zone.renderOrder = 2; W.zone.visible = false; scene.add(W.zone);
  W.zoneRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.5, 0.35), transparent: true, opacity: 0.9, depthWrite: false })); W.zoneRing.rotation.x = -Math.PI / 2; W.zoneRing.renderOrder = 3; W.zoneRing.visible = false; scene.add(W.zoneRing);
  W.zoneRing2 = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.645, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.5, 0.35), transparent: true, opacity: 0.8, depthWrite: false })); W.zoneRing2.rotation.x = -Math.PI / 2; W.zoneRing2.renderOrder = 3; W.zoneRing2.visible = false; scene.add(W.zoneRing2);
  W.zonePosts = new THREE.Group(); W.zonePosts.visible = false; scene.add(W.zonePosts);
  for (let k = 0; k < 32; k++) { const a = k / 32 * 6.283, p = mesh(new THREE.CylinderGeometry(0.012, 0.014, 1, 6), toon(k % 2 ? '#f4efe6' : '#d8301f', { rim: 0.3 }), { ink: 0.004 }); p.position.set(Math.cos(a), 0.5, Math.sin(a)); W.zonePosts.add(p); }
  // 12 s march dressing: roadside fence, crate stacks, sandbags
  W.marchProps = new THREE.Group(); W.marchProps.visible = false; scene.add(W.marchProps);
  { const pm = toon('#8b6a48', { rim: 0.4 }), wm = toon('#4a4038', { rim: 0.2 }), cr = toon('#8a7a4a', { rim: 0.4 }), sb = toon('#c9b98a', { rim: 0.4 });
    for (let x = -30; x <= 40; x += 3) { const p = mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 6), pm, { ink: 0.01 }); p.position.set(x, 0.65, 4.6); p.rotation.z = Math.sin(x) * 0.05; W.marchProps.add(p); }
    for (const y of [0.45, 0.8, 1.15]) { const w = mesh(new THREE.BoxGeometry(70, 0.014, 0.014), wm, { cast: false }); w.position.set(5, y, 4.6); W.marchProps.add(w); }
    for (let k = 0; k < 6; k++) { const x = -14 + k * 8 + Math.sin(k * 3) * 2, st = new THREE.Group(); st.position.set(x, 0, -6.5 - (k % 2) * 1.2); W.marchProps.add(st);
      for (const [cx, cy] of [[0, 0], [0.75, 0], [0.37, 0.52]]) { const b = mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), cr, { ink: 0.01 }); b.position.set(cx, cy + 0.25, 0); st.add(b); }
      for (let j = 0; j < 3; j++) { const s2 = mesh(new THREE.SphereGeometry(0.22, 10, 8), sb, { ink: 0.008 }); s2.scale.set(1.3, 0.6, 0.8); s2.position.set(1.6 + j * 0.5, 0.14, 0.1); st.add(s2); } } }
  W.update = (t, focus) => { if (W.millWheel) W.millWheel.rotation.z = -t * 0.9; if (focus) { W.dust.position.set(focus.x, Math.max(0, focus.y - 2), focus.z); W.dust.rotation.y = t * 0.05; } };
  return W;
}

// =====================================================================================================================
// CLEVER HANS — Berlin tenement courtyard, 1904–1907. Flat ground (HC = 0). Toon + ink hulls like the rest of the engine.
// W.makeHorse() = Hans (faces +z): chestnut Orlov trotter, white blaze, articulated legs (front-right hoof taps), ears, eyelids, blinkers prop.
// W.makeHat(kind, r) = period hats for stickrig heads. W.board / W.screen / W.notepad / W.easel props.
// =====================================================================================================================
export const HC = () => 0;
export function buildCourtyard(scene, SR) {
  const { toon } = SR, INK = '#2a1612', UPV = V(0, 1, 0);
  const inkM = (w) => { const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${w.toFixed(4)};`); }; m.customProgramCacheKey = () => 'oink' + w; return m; };
  const mesh = (g, m, o = {}) => { const x = new THREE.Mesh(g, m); x.castShadow = o.cast ?? true; x.receiveShadow = o.recv ?? true; if (o.ink) { const h = new THREE.Mesh(g, inkM(o.ink)); h.castShadow = false; x.add(h); } return x; };
  const seg = (a, b, r, m, o = {}) => { const d = b.clone().sub(a), L = d.length(), s = mesh(new THREE.CylinderGeometry(r, r, L, 8), m, o); s.position.copy(a).addScaledVector(d, 0.5); s.quaternion.setFromUnitVectors(UPV, d.normalize()); return s; };
  const W = {}; let sd = 77; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };

  // ---------- sky: soft Berlin overcast-blue day → warm amber late light (setSky k 0..1) ----------
  const skyU = { late: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float late; varying vec3 vp; void main(){ float h = clamp(vp.y,0.0,1.0);
      vec3 hz = mix(vec3(0.93,0.9,0.84), vec3(1.0,0.72,0.46), late), md = mix(vec3(0.66,0.8,0.94), vec3(0.93,0.66,0.55), late), zn = mix(vec3(0.34,0.56,0.86), vec3(0.3,0.34,0.6), late);
      vec3 c = mix(hz, md, smoothstep(0.0,0.25,h)); c = mix(c, zn, smoothstep(0.2,0.9,h)); gl_FragColor = vec4(c,1.0); }` }));
  sky.renderOrder = -1; scene.add(sky); W.sky = sky; W.setSky = k => { skyU.late.value = k; };
  scene.fog = new THREE.Fog('#e8e0d2', 40, 260);

  // ---------- cobbled ground + sandy practice ring + straw ----------
  const cobT = cv(512, 512, (g, w, h) => { g.fillStyle = '#7d756b'; g.fillRect(0, 0, w, h); const n = 8; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + (j % 2) * 0.5) * w / n, y = j * h / n, v = 150 + R() * 55 | 0; g.fillStyle = `rgb(${v},${v - 8},${v - 18})`; g.beginPath(); g.roundRect(x + 3, y + 3, w / n - 6, h / n - 6, 14); g.fill(); } });
  cobT.wrapS = cobT.wrapT = THREE.RepeatWrapping; cobT.repeat.set(8, 8);
  const floor = mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: cobT }), { cast: false }); floor.position.set(0, 0, 3); scene.add(floor); W.ground = floor;
  const sandT = cv(256, 256, (g, w, h) => { g.fillStyle = '#d9bf8f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const v = 185 + R() * 55 | 0; g.fillStyle = `rgba(${v},${v - 28},${v - 70},0.55)`; g.fillRect(R() * w, R() * h, 2, 2); } g.strokeStyle = 'rgba(120,90,50,0.25)'; g.lineWidth = 2; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(128, 128, 20 + i * 9, 0, 7); g.stroke(); } });
  const sand = mesh(new THREE.CircleGeometry(4.4, 48).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: sandT }), { cast: false }); sand.position.set(0, 0.012, 1.0); scene.add(sand);
  { const sm = toon('#d6b24e', { rim: 0.2 }); for (let i = 0; i < 70; i++) { const s = mesh(new THREE.BoxGeometry(0.4 + R() * 0.3, 0.012, 0.025), sm, { cast: false }); s.position.set((R() - 0.5) * 7, 0.025, -1.5 + R() * 6); s.rotation.y = R() * 6.28; scene.add(s); } }

  // ---------- tenement walls (Mietskaserne): plaster + window grids + cornice; open archway on the +z side ----------
  const facade = (plaster, trim, win, rep) => { const t = cv(512, 512, (g, w, h) => { g.fillStyle = plaster; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '90,70,50'},0.045)`; g.fillRect(R() * w, R() * h, 3 + R() * 9, 2 + R() * 6); }
      g.fillStyle = trim; g.fillRect(0, h - 22, w, 22); g.fillRect(0, 0, w, 10);   // string courses
      for (const cx of [128, 384]) { const wx = cx - 46, wy = 76, ww = 92, wh = 182; g.fillStyle = trim; g.fillRect(wx - 12, wy - 22, ww + 24, wh + 34); g.fillStyle = win; g.fillRect(wx, wy, ww, wh);
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.moveTo(wx, wy + wh * 0.5); g.lineTo(wx + ww * 0.6, wy); g.lineTo(wx + ww, wy); g.lineTo(wx + ww * 0.3, wy + wh * 0.62); g.fill();
        g.strokeStyle = '#f3ead8'; g.lineWidth = 7; g.strokeRect(wx, wy, ww, wh); g.beginPath(); g.moveTo(cx, wy); g.lineTo(cx, wy + wh); g.moveTo(wx, wy + wh * 0.42); g.lineTo(wx + ww, wy + wh * 0.42); g.stroke();
        g.fillStyle = '#3d4f46'; g.fillRect(wx - 34, wy, 24, wh); g.fillRect(wx + ww + 10, wy, 24, wh); g.fillStyle = trim; g.fillRect(wx - 16, wy + wh + 12, ww + 32, 12); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, 3); return t; };
  const walls = [['#d9b98c', '#b99a6c', '#2b3a4c', -9.5, 0, 0, 36], ['#c7835f', '#a9663f', '#26323f', 0, 0, Math.PI / 2, 22], ['#cfc3a3', '#aea184', '#2a3645', 0, 0, -Math.PI / 2, 22]];
  // back wall (z=-9.5, faces +z), left (x=-11, faces +x), right (x=+11, faces −x); front wall at z=17 with an arch gap
  const wallDef = [{ p: [0, 0, -9.5], ry: 0, w: 44, c: walls[0] }, { p: [-11.5, 0, 3], ry: Math.PI / 2, w: 40, c: walls[1] }, { p: [11.5, 0, 3], ry: -Math.PI / 2, w: 40, c: walls[2] }];
  for (const d of wallDef) { const Hh = 15, [pl, tr, wn] = d.c; const m = toon('#ffffff', { rim: 0.1, kick: 0, map: facade(pl, tr, wn, d.w / 6) }); const p = mesh(new THREE.PlaneGeometry(d.w, Hh), m, { cast: true }); p.position.set(d.p[0], Hh / 2, d.p[2]); p.rotation.y = d.ry; scene.add(p);
    const cor = mesh(new THREE.BoxGeometry(d.w, 0.6, 0.9), toon(tr, { rim: 0.2 }), { ink: 0.01 }); cor.position.set(d.p[0] + Math.sin(d.ry) * 0.2, Hh + 0.1, d.p[2] + Math.cos(d.ry) * 0.2); cor.rotation.y = d.ry; scene.add(cor);
    const slate = mesh(new THREE.BoxGeometry(d.w, 0.2, 6), toon('#4a4f5a', { rim: 0.3 }), { cast: false }); slate.position.set(d.p[0] - Math.sin(d.ry) * 3, Hh + 2, d.p[2] - Math.cos(d.ry) * 3); slate.rotation.set(0, d.ry, 0); slate.rotateX(-0.42); scene.add(slate); }
  { // front wall with a carriage arch (+z side)
    const fm = toon('#ffffff', { rim: 0.1, kick: 0, map: facade('#d3b48a', '#b2946a', '#2b3a4c', 2.5) });
    for (const sx of [-1, 1]) { const p = mesh(new THREE.PlaneGeometry(14, 15), fm, {}); p.position.set(sx * 11.5, 7.5, 17); p.rotation.y = Math.PI; scene.add(p); }
    const top = mesh(new THREE.PlaneGeometry(9, 9), fm, { cast: false }); top.position.set(0, 10.5, 17); top.rotation.y = Math.PI; scene.add(top);
    const arch = mesh(new THREE.TorusGeometry(2.4, 0.22, 8, 24, Math.PI), toon('#9c8460', { rim: 0.2 }), { ink: 0.01 }); arch.position.set(0, 3.0, 16.9); scene.add(arch);
    for (const sx of [-1, 1]) { const pl2 = mesh(new THREE.BoxGeometry(0.5, 3.0, 0.8), toon('#9c8460', { rim: 0.2 }), { ink: 0.01 }); pl2.position.set(sx * 2.4, 1.5, 16.9); scene.add(pl2); }
    const bkd = mesh(new THREE.PlaneGeometry(60, 18), toon('#ffffff', { rim: 0.05, kick: 0, map: facade('#c9a47a', '#a98660', '#2b3a4c', 10) }), { cast: false }); bkd.position.set(0, 9, 36); bkd.rotation.y = Math.PI; scene.add(bkd);
    const street = mesh(new THREE.PlaneGeometry(10, 16).rotateX(-Math.PI / 2), toon('#9a948a', { rim: 0 }), { cast: false }); street.position.set(0, 0.005, 25); scene.add(street); }

  // ---------- props: stable door + hay, barrels, hay bales, gas lamps, washing line ----------
  { const wood = toon('#8b5e3c', { rim: 0.3 }), wood2 = toon('#6c4a2f', { rim: 0.2 }), hay = toon('#d9b655', { rim: 0.3 });
    const door = new THREE.Group(); door.position.set(-6.5, 0, -9.2); scene.add(door);   // Dutch stable door, upper half open
    const fr = mesh(new THREE.BoxGeometry(2.4, 3.2, 0.25), wood2, { ink: 0.01 }); fr.position.y = 1.6; door.add(fr);
    const low = mesh(new THREE.BoxGeometry(1.9, 1.5, 0.12), wood, { ink: 0.01 }); low.position.set(0, 0.85, 0.17); door.add(low);
    const dark = mesh(new THREE.BoxGeometry(1.9, 1.3, 0.05), toon('#1c1612', { rim: 0 }), { cast: false }); dark.position.set(0, 2.28, 0.14); door.add(dark);
    const up = mesh(new THREE.BoxGeometry(0.06, 1.3, 0.8), wood, { ink: 0.008 }); up.position.set(0.98, 2.28, 0.5); up.rotation.y = -0.5; door.add(up);
    const bale = (x, z, ry, y = 0) => { const b = mesh(new THREE.BoxGeometry(0.9, 0.45, 0.45), hay, { ink: 0.01 }); b.position.set(x, 0.225 + y, z); b.rotation.y = ry; scene.add(b); const ts = mesh(new THREE.BoxGeometry(0.92, 0.03, 0.47), wood2, { cast: false }); ts.position.set(x, 0.225 + y, z); ts.rotation.y = ry; scene.add(ts); };
    bale(-5.4, -7.2, 0.2); bale(-4.6, -7.4, -0.15); bale(-5.0, -7.3, 0.1, 0.45); bale(9.2, -6.6, 0.3); bale(8.4, -6.8, 0); bale(8.8, -6.7, 0.2, 0.45);
    const barrel = (x, z) => { const b = mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 14), wood, { ink: 0.012 }); b.position.set(x, 0.4, z); scene.add(b); for (const y of [0.18, 0.62]) { const r = mesh(new THREE.TorusGeometry(0.325, 0.02, 6, 16), toon('#2c2c30', { rim: 0.3 }), { cast: false }); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); scene.add(r); } };
    barrel(6.3, -8.2); barrel(7.1, -8.0); barrel(-9.5, -5.5); barrel(9.9, 4.5);
    const lamp = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const iron = toon('#2e3036', { rim: 0.4 }); const po = mesh(new THREE.CylinderGeometry(0.05, 0.08, 4.2, 8), iron, { ink: 0.01 }); po.position.y = 2.1; g.add(po);
      const gl = mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.3) }), { cast: false }); gl.position.y = 4.5; g.add(gl); const cap = mesh(new THREE.ConeGeometry(0.28, 0.25, 4), iron, { ink: 0.008 }); cap.position.y = 4.9; cap.rotation.y = Math.PI / 4; g.add(cap); };
    lamp(-9.8, 9.5); lamp(9.8, 9.5);
    // washing line over the back of the yard (a little life in the frame)
    const rope = seg(V(-10, 8.2, -9), V(10, 8.0, -3), 0.012, toon('#c9b48a', { rim: 0.1 }), { cast: false }); scene.add(rope);
    for (let i = 0; i < 6; i++) { const u = (i + 0.7) / 6.8, c = new THREE.Color().setHSL([0.58, 0.08, 0.12, 0.0, 0.1, 0.05][i], 0.3, 0.8), x = -10 + 20 * u, z = -9 + 6 * u; const cl = mesh(new THREE.PlaneGeometry(0.7, 0.9), new THREE.MeshToonMaterial({ color: c, side: THREE.DoubleSide }), { cast: false }); cl.position.set(x, 7.55 - 0.2 * u, z); cl.rotation.y = 0.15; scene.add(cl); } }

  // ---------- easel + chalkboard (canvas: sum / spelling / tally) ----------
  { const e = new THREE.Group(); scene.add(e); W.easel = e; const wd = toon('#7b573a', { rim: 0.3 });
    for (const [x, z, rz] of [[-0.55, 0, 0.12], [0.55, 0, -0.12]]) { const l = mesh(new THREE.BoxGeometry(0.07, 2.1, 0.07), wd, { ink: 0.008 }); l.position.set(x, 1.0, z); l.rotation.z = rz; e.add(l); }
    const back = mesh(new THREE.BoxGeometry(0.07, 1.9, 0.07), wd, { ink: 0.008 }); back.position.set(0, 0.95, -0.55); back.rotation.x = 0.4; e.add(back);
    const frame = mesh(new THREE.BoxGeometry(1.62, 1.12, 0.08), wd, { ink: 0.01 }); frame.position.set(0, 1.45, 0.05); e.add(frame);
    const bc = document.createElement('canvas'); bc.width = 512; bc.height = 340; const bg = bc.getContext('2d'), bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; bt.anisotropy = 8;
    const sl = mesh(new THREE.PlaneGeometry(1.5, 1.0), new THREE.MeshBasicMaterial({ map: bt, toneMapped: false }), { cast: false }); sl.position.set(0, 1.45, 0.095); e.add(sl);
    const base = () => { bg.fillStyle = '#2f3b36'; bg.fillRect(0, 0, 512, 340); bg.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 30; i++) bg.fillRect(Math.random() * 512, Math.random() * 340, 90, 6); bg.strokeStyle = '#d8d3bf'; bg.fillStyle = '#efe9d2'; bg.lineCap = 'round'; };
    // mode 'sum' → "3 + 4 = ?"; 'word' → letters; 'tally' → n of total cells filled
    W.setBoard = (mode, a, b, c2) => { base(); if (mode === 'sum') { const fitT = (txt, sz) => { bg.font = `bold ${sz}px Anton, Impact, sans-serif`; const w = bg.measureText(txt).width; if (w > 440) bg.font = `bold ${Math.floor(sz * 440 / w)}px Anton, Impact, sans-serif`; }; bg.textAlign = 'center'; bg.textBaseline = 'middle'; fitT(a, 140); bg.fillText(a, 256, 130); fitT(b || '', 110); bg.fillStyle = b ? '#ffe36b' : '#efe9d2'; bg.fillText(b || '', 256, 260); }
      else if (mode === 'tally') { const n = a, tot = b, cols = tot > 40 ? 14 : 12, rows = Math.ceil(tot / cols), cw = 440 / cols, ch = 220 / rows; bg.font = 'bold 66px Anton, Impact, sans-serif'; bg.textAlign = 'center'; bg.textBaseline = 'middle'; bg.fillStyle = '#efe9d2'; bg.fillText(c2 || '', 256, 52);
        for (let i = 0; i < tot; i++) { const x = 36 + (i % cols) * cw, y = 100 + Math.floor(i / cols) * ch; bg.fillStyle = i < n ? (c2 && c2.includes('6%') ? '#ff8a5c' : '#7ddc7a') : 'rgba(255,255,255,0.14)'; bg.beginPath(); bg.roundRect(x + 3, y + 3, cw - 6, ch - 6, 5); bg.fill(); } }
      bt.needsUpdate = true; }; W.setBoard('sum', '3 + 4', ''); }

  // ---------- test props: wooden screen (questioner hidden), notepad ----------
  { const g = new THREE.Group(); g.visible = false; scene.add(g); W.screen = g; const wd = toon('#c79a5c', { rim: 0.2, kick: 0 }), fm = toon('#6a4a2c', { rim: 0.2, kick: 0 });
    const fr = mesh(new THREE.BoxGeometry(2.0, 2.4, 0.08), fm, { ink: 0.01 }); fr.position.y = 1.2; g.add(fr);
    for (let i = 0; i < 4; i++) { const p = mesh(new THREE.BoxGeometry(0.44, 2.2, 0.1), wd, { ink: 0.006 }); p.position.set(-0.75 + i * 0.5, 1.2, 0.02); g.add(p); }
    for (const sx of [-1, 1]) { const ft = mesh(new THREE.BoxGeometry(0.1, 0.12, 0.7), fm, { ink: 0.008 }); ft.position.set(sx * 0.9, 0.06, 0); g.add(ft); } }
  { const g = new THREE.Group(); g.visible = false; scene.add(g); W.notepad = g;
    const pg = cv(128, 170, (c, w, h) => { c.fillStyle = '#f6f0dc'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(70,90,140,0.55)'; c.lineWidth = 2; for (let y = 24; y < h; y += 16) { c.beginPath(); c.moveTo(8, y); c.lineTo(w - 8, y); c.stroke(); } c.fillStyle = '#222'; c.font = 'bold 15px Inter, sans-serif'; c.fillText('✓ ✓ ✗ ✓ ✓', 14, 20); });
    const cover = mesh(new THREE.BoxGeometry(0.22, 0.3, 0.025), toon('#3e2a1c', { rim: 0.2 }), { ink: 0.004 }); g.add(cover);
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.275), new THREE.MeshBasicMaterial({ map: pg, toneMapped: false })); page.position.z = 0.014; g.add(page);
    const pen = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6), toon('#1a1a1a', { rim: 0.3 }), {}); pen.rotation.z = 0.7; pen.position.set(0.1, 0.0, 0.03); g.add(pen); }
  // sun motes
  { const n = 300, pg = new THREE.BufferGeometry(), arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = (R() - 0.5) * 22; arr[i * 3 + 1] = R() * 8; arr[i * 3 + 2] = (R() - 0.5) * 22; } pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    W.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: '#fff0c8', size: 0.02, transparent: true, opacity: 0.35, depthWrite: false })); scene.add(W.dust); }
  // faint "cue" ring (tension pulse on the questioner's head in the science shots) + dotted look-line from Hans's eye
  W.cue = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.5), transparent: true, opacity: 0.0, depthWrite: false })); W.cue.visible = false; scene.add(W.cue);
  W.beam = []; { const bm = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.6, 0.5), transparent: true, opacity: 0.7, depthWrite: false }); for (let i = 0; i < 18; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), bm); d.visible = false; scene.add(d); W.beam.push(d); } }

  // ---------- period hats for stickrig heads (attach to c.head; r = head radius) ----------
  W.makeHat = (kind, col, r = 0.3) => { const g = new THREE.Group(), m = toon(col, { rim: 0.5 }), band = toon('#1c1a1e', { rim: 0.3 });
    const brimLathe = (r0, r1, drop) => new THREE.LatheGeometry([[r0, 0], [r1, -drop * 0.3], [r1 * 1.04, drop]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
    if (kind === 'bowler') { const dome = mesh(new THREE.SphereGeometry(r * 1.02, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); dome.scale.y = 0.95; dome.position.y = r * 0.3; g.add(dome);
      const br = mesh(brimLathe(r * 1.0, r * 1.38, 0.03), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; br.rotation.z = 0.04; g.add(br);
      const bd = mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.04, r * 0.16, 24, 1, true), band, { cast: false }); bd.position.y = r * 0.38; g.add(bd); }
    else if (kind === 'top') { const cy = mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.9, r * 1.5, 24), m, { ink: 0.005 }); cy.position.y = r * 1.05; g.add(cy);
      const br = mesh(brimLathe(r * 0.9, r * 1.3, 0.025), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; g.add(br);
      const bd = mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.92, r * 0.22, 24, 1, true), band, { cast: false }); bd.position.y = r * 0.45; g.add(bd); }
    else if (kind === 'flat') { const cp = mesh(new THREE.SphereGeometry(r * 1.06, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); cp.scale.set(1.04, 0.5, 1.12); cp.position.set(0, r * 0.3, r * 0.04); g.add(cp);
      const pk = mesh(new THREE.BoxGeometry(r * 1.2, r * 0.05, r * 0.5), m, { ink: 0.004 }); pk.position.set(0, r * 0.3, r * 1.0); pk.rotation.x = 0.1; g.add(pk); }
    else if (kind === 'trilby') { const dome = mesh(new THREE.SphereGeometry(r * 1.0, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); dome.scale.set(1, 1.05, 1.05); dome.position.y = r * 0.3; g.add(dome);
      const br = mesh(brimLathe(r * 1.0, r * 1.5, 0.05), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; br.rotation.x = -0.05; g.add(br);
      const bd = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.02, r * 0.18, 22, 1, true), toon('#6a2f2a', { rim: 0.3 }), { cast: false }); bd.position.y = r * 0.4; g.add(bd); }
    return g; };

  // ---------- HANS: chestnut Orlov trotter. Faces +z. Origin on the ground between the hooves. ----------
  W.makeHorse = () => {
    const root = new THREE.Group(), pivot = new THREE.Group(); root.add(pivot); root.visible = false;
    const coat = toon('#9a5f34', { rim: 0.5, kick: 0.25 }), coat2 = toon('#7e4a29', { rim: 0.4 }), belly = toon('#b4794a', { rim: 0.4 }), dark = toon('#2e1d14', { rim: 0.45 }), sock = toon('#f2ead9', { rim: 0.4 }), hoof = toon('#241a14', { rim: 0.3 }), eyeW = toon('#fbf5e8', { rim: 0 }), blk = new THREE.MeshBasicMaterial({ color: '#0c0a0b' }), blaze = toon('#fbf3e2', { rim: 0.3 }), nose = toon('#4a3326', { rim: 0.3 });
    const body = mesh(new THREE.SphereGeometry(0.5, 20, 14), coat, { ink: 0.02 }); body.scale.set(0.98, 1.0, 1.65); body.position.set(0, 1.08, 0); pivot.add(body);
    const chest = mesh(new THREE.SphereGeometry(0.44, 18, 12), coat, { ink: 0.018 }); chest.scale.set(0.95, 1.05, 0.95); chest.position.set(0, 1.1, 0.62); pivot.add(chest);
    const rump = mesh(new THREE.SphereGeometry(0.47, 18, 12), coat2, { ink: 0.018 }); rump.scale.set(1.0, 0.98, 1.0); rump.position.set(0, 1.12, -0.6); pivot.add(rump);
    const bel = mesh(new THREE.SphereGeometry(0.4, 14, 10), belly, { ink: 0.012 }); bel.scale.set(0.9, 0.55, 1.5); bel.position.set(0, 0.74, 0.0); pivot.add(bel);
    // legs: hip → knee → fetlock; front pair at z=+0.55, hind at z=-0.62. order [FL, FR, HL, HR]; right-front (x=-0.2) is the tapping leg
    const legs = [];
    for (const [sx, z, front] of [[1, 0.56, 1], [-1, 0.56, 1], [1, -0.62, 0], [-1, -0.62, 0]]) { const hip = new THREE.Group(); hip.position.set(sx * 0.22, 0.95, z); pivot.add(hip);
      const up = mesh(new THREE.CylinderGeometry(front ? 0.1 : 0.12, 0.07, 0.46, 10), coat, { ink: 0.012 }); up.position.y = -0.22; hip.add(up);
      const knee = new THREE.Group(); knee.position.y = -0.44; hip.add(knee); const kn = mesh(new THREE.SphereGeometry(0.075, 10, 8), coat2, { ink: 0.01 }); knee.add(kn);
      const lo = mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.4, 10), coat2, { ink: 0.01 }); lo.position.y = -0.2; knee.add(lo);
      const fet = new THREE.Group(); fet.position.y = -0.4; knee.add(fet); const sk = mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.17, 10), sock, { ink: 0.01 }); sk.position.y = -0.04; fet.add(sk);
      const hf = mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 10), hoof, { ink: 0.01 }); hf.position.y = -0.14; fet.add(hf); legs.push({ hip, knee, fet, front }); }
    // neck (tilts forward-up), mane, head
    const neck = new THREE.Group(); neck.position.set(0, 1.28, 0.78); pivot.add(neck); neck.rotation.x = 0.72;
    const nk = mesh(new THREE.CylinderGeometry(0.17, 0.3, 1.05, 14), coat, { ink: 0.016 }); nk.position.y = 0.5; nk.scale.z = 0.9; neck.add(nk);
    for (let i = 0; i < 8; i++) { const mn = mesh(new THREE.SphereGeometry(0.1, 8, 6), dark, { ink: 0.008 }); mn.scale.set(0.5, 1.0, 0.8); mn.position.set(0, 0.1 + i * 0.13, -0.17 + (i * 0.003)); mn.rotation.x = -0.4; neck.add(mn); }
    const head = new THREE.Group(); head.position.set(0, 1.04, 0.05); neck.add(head); head.rotation.x = 0.32;
    const cr = mesh(new THREE.SphereGeometry(0.17, 16, 12), coat, { ink: 0.014 }); cr.scale.set(0.95, 1.0, 1.0); cr.position.set(0, 0.0, 0.0); head.add(cr);
    const snout = mesh(new THREE.CylinderGeometry(0.1, 0.135, 0.56, 14), coat, { ink: 0.014 }); snout.rotation.x = Math.PI / 2 + 0.05; snout.position.set(0, -0.03, 0.3); snout.scale.set(1, 1, 0.82); head.add(snout);
    const muz = mesh(new THREE.SphereGeometry(0.108, 14, 10), nose, { ink: 0.01 }); muz.scale.set(1.0, 0.85, 1.0); muz.position.set(0, -0.06, 0.58); head.add(muz);
    for (const sx of [-1, 1]) { const nst = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), blk); nst.scale.set(1, 1.4, 0.5); nst.position.set(sx * 0.05, -0.04, 0.675); head.add(nst); }
    const bz = mesh(new THREE.BoxGeometry(0.055, 0.015, 0.4), blaze, { ink: 0.003, cast: false }); bz.position.set(0, 0.094, 0.27); bz.rotation.x = 0.08; head.add(bz);
    const bz2 = mesh(new THREE.SphereGeometry(0.05, 8, 6), blaze, { cast: false }); bz2.scale.set(1, 0.4, 1.2); bz2.position.set(0, 0.145, 0.1); head.add(bz2);
    const fore = mesh(new THREE.SphereGeometry(0.075, 8, 6), dark, { ink: 0.006 }); fore.scale.set(1.2, 1, 0.7); fore.position.set(0, 0.15, -0.05); head.add(fore);
    const ears = [], eyes = [];
    for (const sx of [-1, 1]) { const ear = new THREE.Group(); ear.position.set(sx * 0.085, 0.16, -0.06); head.add(ear); const ec = mesh(new THREE.ConeGeometry(0.05, 0.2, 8), coat2, { ink: 0.008 }); ec.position.y = 0.1; ear.add(ec); const ei = mesh(new THREE.ConeGeometry(0.03, 0.15, 6), dark, { cast: false }); ei.position.set(0, 0.09, 0.025); ear.add(ei); ear.userData.sx = sx; ears.push(ear);
      const eye = new THREE.Group(); eye.position.set(sx * 0.1, 0.1, 0.14); eye.rotation.x = -Math.PI / 2; head.add(eye);   // the head hangs nose-down: eye +z faces the head's forehead (+y), eye +y = world up (−z)
      const sc = mesh(new THREE.SphereGeometry(0.062, 14, 10), eyeW, { ink: 0.006, cast: false }); eye.add(sc);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), blk); pu.position.set(sx * 0.02, -0.004, 0.048); eye.add(pu); eye.userData.pu = pu;
      const lid = mesh(new THREE.SphereGeometry(0.068, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), coat2, { ink: 0.005, cast: false }); lid.scale.y = 0.75; lid.position.y = 0.015; eye.add(lid); eye.userData.lid = lid; eyes.push(eye); }
    // bridle + blinkers prop (toggle W.blinkers visible)
    const bridle = new THREE.Group(); head.add(bridle); const lea = toon('#2a1a12', { rim: 0.3 });
    const nb = mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 20), lea, { cast: false }); nb.position.set(0, -0.045, 0.43); nb.scale.set(1, 0.85, 1); bridle.add(nb);
    const bb = mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 20, Math.PI), lea, { cast: false }); bb.rotation.z = 0; bb.position.set(0, 0.11, 0.05); bb.scale.set(1, 0.6, 1); bridle.add(bb);
    for (const sx of [-1, 1]) { const ch = mesh(new THREE.BoxGeometry(0.014, 0.28, 0.02), lea, { cast: false }); ch.position.set(sx * 0.14, -0.04, 0.17); ch.rotation.z = sx * 0.05; bridle.add(ch); }
    const blinkers = new THREE.Group(); blinkers.visible = false; head.add(blinkers);
    for (const sx of [-1, 1]) { const dsk = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.022, 16), toon('#1c1410', { rim: 0.5 }), { ink: 0.006 }); dsk.rotation.z = Math.PI / 2; dsk.position.set(sx * 0.185, 0.045, 0.12); dsk.scale.set(1, 1.0, 1.15); blinkers.add(dsk); const st = mesh(new THREE.BoxGeometry(0.016, 0.02, 0.18), lea, { cast: false }); st.position.set(sx * 0.17, 0.13, 0.12); st.rotation.z = sx * 0.3; blinkers.add(st); }
    const tail = new THREE.Group(); tail.position.set(0, 1.35, -1.0); pivot.add(tail);
    for (let i = 0; i < 7; i++) { const tp = mesh(new THREE.SphereGeometry(0.1 - i * 0.008, 8, 6), dark, { ink: 0.008 }); tp.scale.set(0.8, 1.35, 0.8); tp.position.set(0, -0.12 - i * 0.14, -0.08 * Math.sin(i * 0.6) - i * 0.015); tail.add(tp); }
    Object.assign(root, { pivot, neck, head, ears, eyes, legs, tail, blinkers, bridle }); return root; };

  W.update = (t, focus) => { if (focus) { W.dust.position.set(focus.x, Math.max(0, focus.y - 1), focus.z); W.dust.rotation.y = t * 0.04; } };
  return W;
}

// =====================================================================================================================
// SOHO 1854 — John Snow and the Broad Street pump. Flat ground (HC = 0). Dots on maps, never bodies.
// Street (pump at 0,0,0; workhouse on the left at x<-7), Snow's study at (40,0,0) with a map on a standing desk,
// and a cross-section billboard at (-40,3,0). W.setMap({n,ring,wh}) / W.setSection(t,{...}) redraw canvases; W.handle is the pump handle.
// =====================================================================================================================
export function buildSoho(scene, SR) {
  const { toon } = SR, INK = '#2a1612', UPV = V(0, 1, 0);
  const inkM = (w) => { const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${w.toFixed(4)};`); }; m.customProgramCacheKey = () => 'oink' + w; return m; };
  const mesh = (g, m, o = {}) => { const x = new THREE.Mesh(g, m); x.castShadow = o.cast ?? true; x.receiveShadow = o.recv ?? true; if (o.ink) { const h = new THREE.Mesh(g, inkM(o.ink)); h.castShadow = false; x.add(h); } return x; };
  const seg = (a, b, r, m, o = {}) => { const d = b.clone().sub(a), L = d.length(), s = mesh(new THREE.CylinderGeometry(r, r, L, 8), m, o); s.position.copy(a).addScaledVector(d, 0.5); s.quaternion.setFromUnitVectors(UPV, d.normalize()); return s; };
  const W = {}; let sd = 91; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const live = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, g: c.getContext('2d'), t }; };

  // ---------- sky: London overcast → pale warm light (setSky k 0..1) ----------
  const skyU = { late: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float late; varying vec3 vp; void main(){ float h = clamp(vp.y,0.0,1.0);
      vec3 hz = mix(vec3(0.74,0.74,0.72), vec3(0.97,0.8,0.6), late), md = mix(vec3(0.6,0.64,0.68), vec3(0.78,0.7,0.68), late), zn = mix(vec3(0.44,0.5,0.58), vec3(0.42,0.5,0.68), late);
      vec3 c = mix(hz, md, smoothstep(0.0,0.3,h)); c = mix(c, zn, smoothstep(0.25,0.95,h)); gl_FragColor = vec4(c,1.0); }` }));
  sky.renderOrder = -1; scene.add(sky); W.sky = sky; W.setSky = k => { skyU.late.value = k; };
  scene.fog = new THREE.Fog('#b4b3ad', 26, 150);

  // ---------- cobbled street ----------
  const cobT = cv(512, 512, (g, w, h) => { g.fillStyle = '#6a655d'; g.fillRect(0, 0, w, h); const n = 9; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = (i + (j % 2) * 0.5) * w / n, y = j * h / n, v = 100 + R() * 45 | 0; g.fillStyle = `rgb(${v},${v - 4},${v - 10})`; g.beginPath(); g.roundRect(x + 3, y + 3, w / n - 6, h / n - 6, 16); g.fill(); } });
  cobT.wrapS = cobT.wrapT = THREE.RepeatWrapping; cobT.repeat.set(14, 14);
  const floor = mesh(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: cobT }), { cast: false }); floor.position.set(0, 0, 0); scene.add(floor); W.ground = floor;
  { const mud = mesh(new THREE.PlaneGeometry(1.0, 120).rotateX(-Math.PI / 2), toon('#4f4a42', { rim: 0, kick: 0 }), { cast: false }); mud.position.set(0, 0.006, 0); scene.add(mud);   // central gutter
    for (const sx of [-1, 1]) { const kb = mesh(new THREE.BoxGeometry(0.4, 0.14, 120), toon('#8a847a', { rim: 0.2 }), { ink: 0.006 }); kb.position.set(sx * 6.7, 0.07, 0); scene.add(kb); } }

  // ---------- facades (canvas per building) ----------
  const facade = (w, h, base, trim, shop) => cv(512, 512, (g, cw, ch) => { g.fillStyle = base; g.fillRect(0, 0, cw, ch);
    for (let y = 0; y < ch; y += 14) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, y, cw, 2); for (let x = (y / 14 % 2) * 20; x < cw; x += 40) g.fillRect(x, y, 2, 14); }
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(30,25,20,${0.03 + R() * 0.05})`; g.fillRect(R() * cw, R() * ch, 4 + R() * 18, 3 + R() * 10); }   // soot
    const nf = Math.max(3, Math.round(h / 3.1)), nw = Math.max(2, Math.round(w / 2.6)), fh = ch / nf;
    for (let f = 0; f < nf; f++) for (let k = 0; k < nw; k++) { const cx = (k + 0.5) * cw / nw, y0 = ch - (f + 1) * fh; if (f === 0) { if (k === 1 || (shop && k % 2 === 1)) { g.fillStyle = '#2a211b'; g.fillRect(cx - 34, y0 + fh * 0.2, 68, fh * 0.8); g.fillStyle = trim; g.fillRect(cx - 40, y0 + fh * 0.12, 80, 10); continue; } }
      const ww = Math.min(60, cw / nw * 0.46), wh = fh * 0.56, wy = y0 + fh * 0.18; g.fillStyle = trim; g.fillRect(cx - ww / 2 - 7, wy - 9, ww + 14, wh + 14); g.fillStyle = (f + k) % 5 === 0 ? '#c9a45a' : '#1f2933'; g.fillRect(cx - ww / 2, wy, ww, wh);
      g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.moveTo(cx - ww / 2, wy + wh * 0.6); g.lineTo(cx, wy); g.lineTo(cx + ww / 2, wy); g.lineTo(cx - ww * 0.1, wy + wh); g.lineTo(cx - ww / 2, wy + wh); g.fill();
      g.strokeStyle = '#ece3cf'; g.lineWidth = 5; g.strokeRect(cx - ww / 2, wy, ww, wh); g.beginPath(); g.moveTo(cx, wy); g.lineTo(cx, wy + wh); g.moveTo(cx - ww / 2, wy + wh * 0.45); g.lineTo(cx + ww / 2, wy + wh * 0.45); g.stroke(); }
    g.fillStyle = trim; for (let f = 1; f < nf; f++) g.fillRect(0, ch - f * fh - 4, cw, 8); });
  const PAL = [['#8b5a43', '#c9b79a'], ['#7c6a58', '#d1c3a6'], ['#936b4c', '#bfae90'], ['#6f5c52', '#cdbfa4'], ['#85604a', '#d4c6aa']];
  const house = (side, cz, w, d, h, pi, o = {}) => { const [bc, tc] = PAL[pi % PAL.length], fm = toon('#ffffff', { rim: 0.1, kick: 0, map: facade(w, h, o.base || bc, tc, o.shop) }), sm = toon(bc, { rim: 0.1, kick: 0 });
    const mats = [sm, sm, toon('#3d4048', { rim: 0.2 }), sm, sm, sm]; mats[side < 0 ? 0 : 1] = fm;   // +x face (left side houses) or −x face (right side)
    const b = mesh(new THREE.BoxGeometry(d, h, w), mats, { cast: true }); b.position.set(side * (6.8 + d / 2 + (o.setback || 0)), h / 2, cz); scene.add(b);
    const cor = mesh(new THREE.BoxGeometry(d + 0.3, 0.35, w + 0.3), toon(tc, { rim: 0.2 }), { ink: 0.008 }); cor.position.set(b.position.x, h + 0.1, cz); scene.add(cor);
    for (let i = 0; i < 2; i++) { const ch = mesh(new THREE.BoxGeometry(0.7, 1.6, 0.7), toon('#5a4a42', { rim: 0.2 }), { ink: 0.008 }); ch.position.set(b.position.x + side * 0.4, h + 0.9, cz + (i - 0.5) * w * 0.5); scene.add(ch); }
    return b; };
  { let z = -46, i = 0; while (z < 52) { const w = 6 + R() * 4; for (const side of [-1, 1]) { const zz = z + w / 2; if (side < 0 && zz > -19 && zz < -4) continue; house(side, zz + side * 0.0, w, 9, 10 + R() * 4, (i + (side > 0 ? 2 : 0)) % 5, { shop: i % 2 === 0 }); } z += w + 0.1; i++; }
  }
  // end-of-street blocks so the camera never sees the void
  for (const sz of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(34, 14, 2), toon('#7d6a5c', { rim: 0.1 }), { cast: false }); b.position.set(0, 7, sz * 56); scene.add(b); }

  // ---------- the workhouse (left side, z −19 … −4): taller, plainer, big gate + its own well in the yard ----------
  { const g = new THREE.Group(); scene.add(g); W.workhouse = g; const zc = -11.5, wh = 15, dd = 9, hh = 11;
    const fm = toon('#ffffff', { rim: 0.1, kick: 0, map: cv(512, 512, (c, cw, ch) => { c.fillStyle = '#9b8a72'; c.fillRect(0, 0, cw, ch); for (let y = 0; y < ch; y += 14) { c.fillStyle = 'rgba(0,0,0,0.07)'; c.fillRect(0, y, cw, 2); for (let x = (y / 14 % 2) * 20; x < cw; x += 40) c.fillRect(x, y, 2, 14); }
      for (let f = 0; f < 3; f++) for (let k = 0; k < 6; k++) { const cx = (k + 0.5) * cw / 6, wy = 30 + f * 150; if (f === 2 && (k === 2 || k === 3)) continue; c.fillStyle = '#d8ccb2'; c.fillRect(cx - 34, wy - 8, 68, 106); c.fillStyle = '#1f2933'; c.fillRect(cx - 27, wy, 54, 90); c.strokeStyle = '#ece3cf'; c.lineWidth = 5; c.strokeRect(cx - 27, wy, 54, 90); c.beginPath(); c.moveTo(cx, wy); c.lineTo(cx, wy + 90); c.moveTo(cx - 27, wy + 40); c.lineTo(cx + 27, wy + 40); c.stroke(); }
      c.fillStyle = '#d8ccb2'; c.fillRect(cw / 2 - 74, ch - 190, 148, 190); c.fillStyle = '#6a4d33'; c.fillRect(cw / 2 - 58, ch - 168, 116, 168); c.strokeStyle = '#18110c'; c.lineWidth = 6; c.beginPath(); c.moveTo(cw / 2, ch - 168); c.lineTo(cw / 2, ch); c.stroke(); }) }), sm = toon('#8d7c66', { rim: 0.1, kick: 0 });
    const b = mesh(new THREE.BoxGeometry(dd, hh, wh), [fm, sm, toon('#3d4048', { rim: 0.2 }), sm, sm, sm]); b.position.set(-6.8 - dd / 2 - 0.5, hh / 2, zc); g.add(b);
    const cor = mesh(new THREE.BoxGeometry(dd + 0.3, 0.4, wh + 0.3), toon('#cdbfa4', { rim: 0.2 }), { ink: 0.008 }); cor.position.set(b.position.x, hh + 0.1, zc); g.add(cor);
    const sg = mesh(new THREE.PlaneGeometry(6.4, 1.1), toon('#ffffff', { rim: 0, kick: 0, map: cv(512, 90, (c, cw, ch) => { c.fillStyle = '#d8ccb2'; c.fillRect(0, 0, cw, ch); c.strokeStyle = '#2a1612'; c.lineWidth = 6; c.strokeRect(4, 4, cw - 8, ch - 8); c.fillStyle = '#2a1612'; c.font = 'bold 58px Anton, Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('WORKHOUSE', cw / 2, ch / 2 + 3); }) }), { cast: false }); sg.rotation.y = Math.PI / 2; sg.position.set(-7.22, 4.6, zc); g.add(sg);
    // its own well (stone ring, little roof, bucket) in front of the gate
    const wl = new THREE.Group(); wl.position.set(-5.4, 0, -7.2); g.add(wl); W.ownWell = wl; const st = toon('#9a9488', { rim: 0.3 }), wd = toon('#7b573a', { rim: 0.3 });
    const ring = mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.75, 16), st, { ink: 0.012 }); ring.position.y = 0.375; wl.add(ring); const wat = mesh(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), toon('#3b6e92', { rim: 0 }), { cast: false }); wat.position.y = 0.7; wl.add(wat);
    for (const sx of [-1, 1]) { const p = mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), wd, { ink: 0.006 }); p.position.set(sx * 0.62, 1.2, 0); wl.add(p); }
    const rf = mesh(new THREE.ConeGeometry(1.05, 0.55, 4), toon('#5a3f2c', { rim: 0.3 }), { ink: 0.01 }); rf.position.y = 2.4; rf.rotation.y = Math.PI / 4; wl.add(rf); const bk = mesh(new THREE.CylinderGeometry(0.14, 0.11, 0.22, 10), wd, { ink: 0.006 }); bk.position.set(0, 1.35, 0); wl.add(bk); wl.add(seg(V(0, 1.45, 0), V(0, 2.2, 0), 0.01, toon('#c9b48a', { rim: 0.1 }), { cast: false })); }

  // ---------- street furniture: gas lamps, cart, crates ----------
  { const iron = toon('#2e3036', { rim: 0.4 }), glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.3) });
    for (const [x, z] of [[-6.1, 7], [6.1, -3], [-6.1, -22], [6.1, 14], [6.1, -18]]) { const po = mesh(new THREE.CylinderGeometry(0.05, 0.08, 4.2, 8), iron, { ink: 0.01 }); po.position.set(x, 2.1, z); scene.add(po); const gl = mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), glow, { cast: false }); gl.position.set(x, 4.5, z); scene.add(gl); const cap = mesh(new THREE.ConeGeometry(0.28, 0.25, 4), iron, { ink: 0.008 }); cap.position.set(x, 4.9, z); cap.rotation.y = Math.PI / 4; scene.add(cap); }
    const wood = toon('#7a5638', { rim: 0.3 }); const cart = new THREE.Group(); cart.position.set(4.6, 0, 6.5); cart.rotation.y = 0.4; scene.add(cart);
    const bed = mesh(new THREE.BoxGeometry(2.2, 0.35, 1.2), wood, { ink: 0.01 }); bed.position.y = 0.75; cart.add(bed);
    for (const sz of [-1, 1]) { const wl = mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 18), toon('#2c2c30', { rim: 0.3 }), { ink: 0.006 }); wl.position.set(0, 0.45, sz * 0.65); cart.add(wl); }
    const sh = seg(V(-1.1, 0.8, 0), V(-2.6, 0.5, 0), 0.04, wood, { ink: 0.005 }); cart.add(sh);
    const crate = (x, z, y = 0) => { const c = mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), wood, { ink: 0.01 }); c.position.set(x, 0.275 + y, z); c.rotation.y = R() * 1.2; scene.add(c); }; crate(5.4, -6, 0); crate(5.5, -6.8, 0); crate(5.45, -6.3, 0.55); crate(-5.8, 4.5); crate(-5.5, 5.3);
    const bar = (x, z) => { const b = mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 14), wood, { ink: 0.012 }); b.position.set(x, 0.4, z); scene.add(b); for (const y of [0.18, 0.62]) { const r = mesh(new THREE.TorusGeometry(0.325, 0.02, 6, 16), iron, { cast: false }); r.rotation.x = Math.PI / 2; r.position.set(x, y, z); scene.add(r); } }; bar(5.6, 2.5); bar(5.9, 3.2); bar(-5.9, -1.5); }

  // ---------- the Broad Street pump: cast iron, with a removable handle ----------
  { const g = new THREE.Group(); scene.add(g); W.pump = g; const iron = toon('#33403a', { rim: 0.5, kick: 0.2 }), iron2 = toon('#26302b', { rim: 0.4 }), stone = toon('#8d877b', { rim: 0.3 }), gold = toon('#b8923e', { rim: 0.4 });
    const pl = mesh(new THREE.BoxGeometry(1.5, 0.22, 1.5), stone, { ink: 0.012 }); pl.position.y = 0.11; g.add(pl); const st2 = mesh(new THREE.BoxGeometry(1.0, 0.16, 1.0), stone, { ink: 0.01 }); st2.position.y = 0.3; g.add(st2);
    const base = mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.55, 14), iron, { ink: 0.012 }); base.position.y = 0.66; g.add(base);
    const col = mesh(new THREE.CylinderGeometry(0.2, 0.28, 0.95, 14), iron, { ink: 0.012 }); col.position.y = 1.2; g.add(col);
    const ring = mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 18), gold, { ink: 0.005 }); ring.rotation.x = Math.PI / 2; ring.position.y = 0.95; g.add(ring);
    const cap = mesh(new THREE.SphereGeometry(0.25, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), iron2, { ink: 0.01 }); cap.position.y = 1.67; g.add(cap); const knob = mesh(new THREE.SphereGeometry(0.06, 8, 6), gold, { ink: 0.004 }); knob.position.y = 1.9; g.add(knob);
    const sp = mesh(new THREE.CylinderGeometry(0.075, 0.1, 0.62, 10), iron, { ink: 0.01 }); sp.rotation.z = -Math.PI / 2 + 0.3; sp.position.set(0.5, 1.12, 0); g.add(sp);   // spout toward +x
    const lug = mesh(new THREE.BoxGeometry(0.16, 0.34, 0.5), iron2, { ink: 0.008 }); lug.position.set(0, 1.5, 0); g.add(lug);   // handle mount
    const pu = mesh(new THREE.CircleGeometry(0.5, 16).rotateX(-Math.PI / 2), toon('#4a5d6b', { rim: 0 }), { cast: false }); pu.position.set(0.82, 0.215, 0); g.add(pu);   // puddle under the spout
    // handle: pivot at the mount (0,1.5,0); lever runs to −x, counterweight to +x. Lives in the scene so it can be carried.
    const h = new THREE.Group(); scene.add(h); W.handle = h; const bar = mesh(new THREE.BoxGeometry(1.5, 0.07, 0.07), iron, { ink: 0.008 }); bar.position.x = -0.5; h.add(bar);
    const grip = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), toon('#5a3f2c', { rim: 0.3 }), { ink: 0.005 }); grip.rotation.x = Math.PI / 2; grip.position.set(-1.12, 0, 0); h.add(grip);
    const cw = mesh(new THREE.SphereGeometry(0.1, 10, 8), iron2, { ink: 0.006 }); cw.position.x = 0.25; h.add(cw);
    W.handleOn = (rz = 0.18) => { h.visible = true; h.position.set(0, 1.5, 0); h.rotation.set(0, 0, rz); };
    // carried: bar centre → c, lever axis along world dir `ax` (unit vector)
    W.handleAt = (c, ry, rz = 0) => { h.visible = true; h.rotation.set(0, ry, rz, 'YXZ'); const off = V(0.5, 0, 0).applyEuler(h.rotation); h.position.copy(c).add(off); };
    W.handleOn(); }

  // ---------- Snow's study (x = 40): standing desk with the map ----------
  const RX = 40;
  { const rm = new THREE.Group(); rm.position.set(RX, 0, 0); scene.add(rm); W.room = rm;
    const fl = mesh(new THREE.PlaneGeometry(13, 13).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: cv(256, 256, (g, w, h) => { g.fillStyle = '#6b4a30'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = `rgb(${95 + R() * 25 | 0},${66 + R() * 15 | 0},${40 + R() * 10 | 0})`; g.fillRect(0, i * 32 + 1, w, 30); } }) }), { cast: false }); fl.position.y = 0.012; rm.add(fl);
    const wallM = toon('#6e7a62', { rim: 0.1, kick: 0 }), wallM2 = toon('#5d6a54', { rim: 0.1, kick: 0 });
    const bw = mesh(new THREE.PlaneGeometry(13, 5), wallM, { cast: false }); bw.position.set(0, 2.5, -4.6); rm.add(bw);
    const lw = mesh(new THREE.PlaneGeometry(13, 5), wallM2, { cast: false }); lw.rotation.y = Math.PI / 2; lw.position.set(-6.5, 2.5, 0); rm.add(lw);
    const rw = mesh(new THREE.PlaneGeometry(13, 5), wallM2, { cast: false }); rw.rotation.y = -Math.PI / 2; rw.position.set(6.5, 2.5, 0); rm.add(rw);
    const fw = mesh(new THREE.PlaneGeometry(13, 5), wallM, { cast: false }); fw.rotation.y = Math.PI; fw.position.set(0, 2.5, 6.0); rm.add(fw);
    const ceil = mesh(new THREE.PlaneGeometry(13, 13).rotateX(Math.PI / 2), toon('#aaa395', { rim: 0, kick: 0 }), { cast: false }); ceil.position.y = 5; rm.add(ceil);
    const wd = toon('#5b3d27', { rim: 0.3 }), wd2 = toon('#7b573a', { rim: 0.3 });
    // window with grey London daylight
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.45, 1.55, 1.7), toneMapped: false })); win.position.set(-2.2, 2.5, -4.58); rm.add(win);
    for (const [x, y, w2, h2] of [[-2.2, 2.5, 0.07, 2.7], [-2.2, 2.5, 2.1, 0.07], [-2.2, 3.8, 2.2, 0.1], [-2.2, 1.2, 2.2, 0.1]]) { const f = mesh(new THREE.BoxGeometry(w2, h2, 0.08), wd2, { ink: 0.004, cast: false }); f.position.set(x, y, -4.54); rm.add(f); }
    // desk: top surface at y = 0.96
    const top = mesh(new THREE.BoxGeometry(2.7, 0.12, 1.65), wd2, { ink: 0.01 }); top.position.set(0, 0.9, 0); rm.add(top);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), wd, { ink: 0.008 }); l.position.set(sx * 1.25, 0.45, sz * 0.75); rm.add(l); }
    // the map (canvas, redrawn by W.setMap)
    const MP = live(1024, 640); W.map = MP;
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: MP.t, toneMapped: false })); mp.position.set(0, 0.965, 0); rm.add(mp);
    W.mapPos = (px, py) => V(RX + (px / 1024 - 0.5) * 2.4, 0.97, (py / 640 - 0.5) * 1.5);
    // oil lamp, ink pot, books, shelf
    const lamp = new THREE.Group(); lamp.position.set(1.0, 0.96, -0.55); rm.add(lamp); { const b = mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.16, 10), toon('#b8923e', { rim: 0.5 }), { ink: 0.005 }); b.position.y = 0.08; lamp.add(b); const gl = mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 1.1) }), { cast: false }); gl.position.y = 0.27; lamp.add(gl); }
    const ink = mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.07, 8), toon('#1a1a22', { rim: 0.5 }), { ink: 0.004 }); ink.position.set(-0.95, 1.0, -0.55); rm.add(ink);
    const sh = new THREE.Group(); sh.position.set(3.2, 0, -4.2); rm.add(sh); for (const [y, n] of [[0.4, 9], [1.3, 8], [2.2, 9]]) { const sl = mesh(new THREE.BoxGeometry(3.0, 0.07, 0.5), wd, { ink: 0.006 }); sl.position.y = y; sh.add(sl); for (let i = 0; i < n; i++) { const hb = 0.38 + R() * 0.2; const bk = mesh(new THREE.BoxGeometry(0.22, hb, 0.34), toon(['#6a2f2a', '#2f4d6a', '#4a5a2f', '#7a6a3a', '#3a2f2f'][i % 5], { rim: 0.3 }), { ink: 0.004, cast: false }); bk.position.set(-1.3 + i * 0.3, y + 0.035 + hb / 2, 0); sh.add(bk); } }
    const side = mesh(new THREE.BoxGeometry(0.06, 2.6, 0.55), wd, { ink: 0.006 }); side.position.set(1.7, 1.3, -4.2); rm.add(side); const side2 = side.clone(); side2.position.x = 4.7; rm.add(side2); }

  // ---------- map drawing ----------
  const DOTS = []; { const gauss = () => { let s = 0; for (let i = 0; i < 4; i++) s += R(); return (s - 2) * 1.73; };
    while (DOTS.length < 300) { const far = DOTS.length % 9 === 8, x = 500 + gauss() * (far ? 260 : 85) + (far ? 0 : gauss() * 18), y = 330 + gauss() * (far ? 130 : 52); if (x < 60 || x > 960 || y < 60 || y > 600) continue; if (x > 120 && x < 310 && y > 380 && y < 540) continue;   // keep the workhouse empty
      const onSt = Math.abs(y - 330) < 18 || Math.abs(x - 500) < 14; if (onSt && R() < 0.7) continue; DOTS.push([x, y]); } }
  W.DOTS = DOTS;
  W.setMap = (o = {}) => { const g = W.map.g, n = o.n ?? 0, N = Math.round(n * DOTS.length);
    g.fillStyle = '#e8dab4'; g.fillRect(0, 0, 1024, 640);
    // house blocks
    g.fillStyle = '#d3c196'; g.strokeStyle = '#8a7650'; g.lineWidth = 3; for (const [x, y, w, h] of [[80, 70, 220, 200], [330, 70, 150, 200], [520, 70, 200, 200], [750, 70, 200, 200], [330, 360, 150, 210], [520, 360, 200, 210], [750, 360, 200, 210], [80, 360, 40, 210]]) { g.fillRect(x, y, w, h); g.strokeRect(x, y, w, h);
      g.fillStyle = 'rgba(120,100,60,0.18)'; for (let i = 0; i < w; i += 18) g.fillRect(x + i, y + 4, 8, h - 8); g.fillStyle = '#d3c196'; }
    // workhouse block
    const wh = o.wh ?? 0; g.fillStyle = '#c9b88c'; g.fillRect(120, 380, 190, 160); g.strokeStyle = '#7a6638'; g.lineWidth = 4; g.strokeRect(120, 380, 190, 160); g.fillStyle = 'rgba(100,80,40,0.22)'; for (let i = 0; i < 190; i += 12) g.fillRect(120 + i, 384, 5, 152);
    if (wh > 0) { g.save(); g.shadowColor = `rgba(90,230,120,${0.9 * wh})`; g.shadowBlur = 28; g.strokeStyle = `rgba(60,200,100,${wh})`; g.lineWidth = 9; g.strokeRect(116, 376, 198, 168); g.restore(); }
    g.fillStyle = '#3a2a14'; g.font = 'bold 30px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('WORKHOUSE', 215, 462);
    g.font = 'bold 26px Anton, Impact, sans-serif'; g.fillStyle = '#6b5a38'; g.fillText('BROAD ST.', 740, 330); g.textAlign = 'left';
    // own-supply well in the workhouse yard
    g.fillStyle = '#2f78b5'; g.strokeStyle = '#17202a'; g.lineWidth = 3; g.beginPath(); g.arc(160, 500, 9, 0, 7); g.fill(); g.stroke();
    // other pumps
    for (const [x, y] of [[230, 120], [830, 330], [660, 600], [410, 330]]) { g.fillStyle = '#4a90c9'; g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill(); g.strokeStyle = '#17202a'; g.lineWidth = 2; g.stroke(); }
    // Broad Street pump
    g.fillStyle = '#1f6fb5'; g.strokeStyle = '#0d2a44'; g.lineWidth = 4; g.beginPath(); g.arc(500, 330, 17, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(500, 330, 6, 0, 7); g.fill();
    // ring
    const rg = o.ring ?? 0; if (rg > 0) { g.save(); g.strokeStyle = `rgba(255,214,64,${Math.min(1, rg * 1.4)})`; g.lineWidth = 8; g.setLineDash([22, 14]); g.shadowColor = 'rgba(255,200,40,0.9)'; g.shadowBlur = 20; g.beginPath(); g.ellipse(500, 330, 175 * Math.min(1, rg * 1.2), 120 * Math.min(1, rg * 1.2), 0, 0, 7); g.stroke(); g.restore(); }
    // dots (each dot = a recorded death, plotted at the address)
    for (let i = 0; i < N; i++) { const [x, y] = DOTS[i], pop = i === N - 1 && o.pop ? 1 + 0.6 * o.pop : 1; g.fillStyle = '#c0242b'; g.strokeStyle = '#3a0a0c'; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 7 * pop, 0, 7); g.fill(); g.stroke(); }
    g.strokeStyle = '#5a4a2a'; g.lineWidth = 6; g.strokeRect(6, 6, 1012, 628);
    W.map.t.needsUpdate = true; };
  W.setMap({});

  // ---------- cross-section billboard (x = −40): cesspit, well shaft, clean water ----------
  { const SC = live(768, 1024); W.sec = SC; const bd = mesh(new THREE.PlaneGeometry(5.0, 6.6), new THREE.MeshBasicMaterial({ color: '#0d1117' }), { cast: false }); bd.position.set(-40, 3.2, -0.05); scene.add(bd);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(4.8, 6.4), new THREE.MeshBasicMaterial({ map: SC.t, toneMapped: false })); pl.position.set(-40, 3.2, 0.0); scene.add(pl); W.secPlane = pl; }
  const bez = (p0, p1, p2, u) => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * p2[1]];
  W.setSection = (t, o = {}) => { const g = W.sec.g, leak = o.leak ?? 0, flow = o.flow ?? 0, cloud = o.cloud ?? 0, xk = o.x ?? 0, clean = o.clean ?? 0, lab = o.lab ?? 1;
    const sk = g.createLinearGradient(0, 0, 0, 200); sk.addColorStop(0, '#9aa7b3'); sk.addColorStop(1, '#c7c8c2'); g.fillStyle = sk; g.fillRect(0, 0, 768, 210);
    g.fillStyle = '#6a6460'; for (const [x, w, h] of [[10, 110, 90], [130, 90, 120], [230, 130, 80], [560, 120, 110], [690, 90, 90]]) g.fillRect(x, 200 - h, w, h);
    g.fillStyle = '#4c4640'; for (const [x, w, h] of [[10, 110, 90], [130, 90, 120], [230, 130, 80], [560, 120, 110], [690, 90, 90]]) for (let i = 0; i < 3; i++) g.fillRect(x + 14 + i * 32, 200 - h + 16, 14, 20);
    const soil = g.createLinearGradient(0, 210, 0, 1024); soil.addColorStop(0, '#7b5a3c'); soil.addColorStop(0.5, '#5e4430'); soil.addColorStop(1, '#3d2e24'); g.fillStyle = soil; g.fillRect(0, 210, 768, 814);
    g.fillStyle = '#6a6a6e'; g.fillRect(0, 200, 768, 18);   // street surface
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '255,255,255' : '20,10,0'},0.07)`; g.beginPath(); g.arc((i * 83) % 768, 240 + (i * 131) % 760, 4 + (i % 5) * 3, 0, 7); g.fill(); }
    // aquifer (deep clean water)
    const aq = g.createLinearGradient(0, 780, 0, 960); aq.addColorStop(0, 'rgba(60,150,220,0.0)'); aq.addColorStop(0.3, 'rgba(60,150,220,0.85)'); aq.addColorStop(1, 'rgba(40,110,190,0.9)'); g.fillStyle = aq; g.fillRect(0, 780, 768, 190);
    // clean (separate) supply on the right: deep bored shaft into the aquifer
    g.fillStyle = '#8a8a8e'; g.fillRect(612, 200, 58, 620); g.fillStyle = '#2a6fb0'; g.fillRect(622, 240, 38, 590); g.fillStyle = '#4f5256'; g.fillRect(596, 190, 90, 16);
    if (clean > 0) { g.fillStyle = `rgba(190,235,255,${clean})`; for (let i = 0; i < 6; i++) { const y = 800 - ((i / 6 + t * 0.3) % 1) * 540; g.beginPath(); g.moveTo(641, y - 16); g.lineTo(630, y + 6); g.lineTo(652, y + 6); g.closePath(); g.fill(); } }
    // Broad St well shaft (brick) + water
    g.fillStyle = '#8c5a45'; g.fillRect(372, 200, 120, 520); g.fillStyle = '#1b1612'; g.fillRect(392, 218, 80, 502);
    const wy = 470, wc = leak; g.fillStyle = `rgb(${Math.round(47 + 70 * wc)},${Math.round(125 - 25 * wc)},${Math.round(180 - 120 * wc)})`; g.fillRect(392, wy, 80, 250);
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(392, wy, 80, 8);
    // brown plume spreading in the well
    if (wc > 0) { for (let i = 0; i < 9; i++) { const px = 396 + (i * 29) % 70, py = wy + 10 + ((i * 47 + t * 40) % 220); g.fillStyle = `rgba(95,62,24,${0.35 * wc})`; g.beginPath(); g.arc(px, py, 16 + (i % 3) * 6, 0, 7); g.fill(); } }
    // cracks in the old brick
    g.strokeStyle = '#1b1612'; g.lineWidth = 4; g.beginPath(); g.moveTo(372, 430); g.lineTo(386, 446); g.lineTo(374, 462); g.lineTo(390, 478); g.stroke();
    // pump above the well
    g.fillStyle = '#33403a'; g.fillRect(418, 120, 28, 82); g.fillRect(404, 190, 56, 14); g.beginPath(); g.arc(432, 120, 18, Math.PI, 0); g.fill(); g.fillRect(446, 140, 38, 10);
    if (o.handle !== false) { g.save(); g.translate(432, 128); g.rotate(-0.25); g.fillStyle = '#26302b'; g.fillRect(-92, -5, 112, 10); g.restore(); }
    // the cesspit
    g.fillStyle = '#9a6a52'; g.fillRect(70, 290, 220, 190); g.fillStyle = '#4b3b1c'; g.fillRect(86, 306, 188, 158); g.fillStyle = 'rgba(120,150,60,0.35)'; g.fillRect(86, 306, 188, 18);
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(30,22,8,0.5)'; g.beginPath(); g.arc(100 + (i * 37) % 160, 330 + (i * 53) % 120, 8 + i % 4 * 3, 0, 7); g.fill(); }
    g.strokeStyle = '#1b1612'; g.lineWidth = 4; g.beginPath(); g.moveTo(290, 380); g.lineTo(274, 396); g.lineTo(290, 410); g.stroke();   // crack on the cesspit wall
    // leak path: cesspit → well, seeping brown drops
    if (flow > 0) { const P0 = [280, 392], P1 = [330, 470], P2 = [380, 458]; for (let i = 0; i < 14; i++) { const u = (i / 14 + t * 0.22) % 1, [x, y] = bez(P0, P1, P2, u), r = 6 + 4 * Math.sin(u * 3.14); g.fillStyle = `rgba(112,72,24,${0.95 * flow})`; g.strokeStyle = `rgba(30,16,4,${flow})`; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); }
      g.strokeStyle = `rgba(210,150,60,${0.55 * flow})`; g.lineWidth = 5; g.setLineDash([12, 10]); g.beginPath(); g.moveTo(P0[0], P0[1]); g.quadraticCurveTo(P1[0], P1[1], P2[0], P2[1]); g.stroke(); g.setLineDash([]); }
    // "bad air" cloud (to be crossed out)
    if (cloud > 0) { g.save(); g.globalAlpha = cloud; g.fillStyle = 'rgba(150,175,110,0.8)'; for (const [x, y, r] of [[90, 90, 34], [128, 70, 42], [170, 90, 36], [120, 108, 38], [70, 112, 26]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      g.fillStyle = '#1b2a10'; g.font = 'bold 40px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BAD AIR?', 122, 94); g.restore();
      if (xk > 0) { g.save(); g.strokeStyle = '#ff3b3b'; g.lineWidth = 16; g.lineCap = 'round'; g.shadowColor = '#000'; g.shadowBlur = 6; const k = Math.min(1, xk * 2), k2 = Math.max(0, Math.min(1, xk * 2 - 1)); g.beginPath(); g.moveTo(30, 30); g.lineTo(30 + 190 * k, 30 + 150 * k); g.stroke(); if (k2 > 0) { g.beginPath(); g.moveTo(220, 30); g.lineTo(220 - 190 * k2, 30 + 150 * k2); g.stroke(); } g.restore(); } }
    // labels
    if (lab > 0) { g.save(); g.globalAlpha = lab; g.font = 'bold 40px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; const L = (txt, x, y, col = '#fff') => { g.lineWidth = 9; g.strokeStyle = '#000'; g.strokeText(txt, x, y); g.fillStyle = col; g.fillText(txt, x, y); };
      L('CESSPIT', 180, 520); L('BROAD ST. WELL', 432, 760, '#ffd400'); L('SEPARATE', 640, 876); L('CLEAN SUPPLY', 640, 920, '#9fe3ff'); g.restore(); }
    W.sec.t.needsUpdate = true; };
  W.setSection(0, {});

  // ---------- "foul air" mist (the miasma theory): drifting green-grey puffs ----------
  { const gp = new THREE.Group(); gp.visible = false; scene.add(gp); W.mist = gp; const mm = new THREE.MeshBasicMaterial({ color: '#9fb07a', transparent: true, opacity: 0.2, depthWrite: false, fog: false });
    for (let i = 0; i < 16; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.35 + R() * 0.35, 10, 8), mm); s.userData = { a: R() * 6.28, r: 0.4 + R() * 1.6, y: 0.2 + R() * 1.8, sp: 0.15 + R() * 0.25 }; gp.add(s); }
    W.mistAt = (t, c, on = 1) => { gp.visible = on > 0.01; if (!gp.visible) return; mm.opacity = 0.2 * on; gp.position.copy(c); gp.children.forEach(s => { const u = s.userData, a = u.a + t * u.sp; s.position.set(Math.cos(a) * u.r, u.y + 0.1 * Math.sin(t * 0.8 + u.a), Math.sin(a) * u.r); }); }; }

  // ---------- period hats (same as the courtyard set) ----------
  W.makeHat = (kind, col, r = 0.3) => { const g = new THREE.Group(), m = toon(col, { rim: 0.5 }), band = toon('#1c1a1e', { rim: 0.3 });
    const brimLathe = (r0, r1, drop) => new THREE.LatheGeometry([[r0, 0], [r1, -drop * 0.3], [r1 * 1.04, drop]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
    if (kind === 'bowler') { const dome = mesh(new THREE.SphereGeometry(r * 1.02, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); dome.scale.y = 0.95; dome.position.y = r * 0.3; g.add(dome);
      const br = mesh(brimLathe(r * 1.0, r * 1.38, 0.03), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; br.rotation.z = 0.04; g.add(br);
      const bd = mesh(new THREE.CylinderGeometry(r * 1.03, r * 1.04, r * 0.16, 24, 1, true), band, { cast: false }); bd.position.y = r * 0.38; g.add(bd); }
    else if (kind === 'top') { const cy = mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.9, r * 1.5, 24), m, { ink: 0.005 }); cy.position.y = r * 1.05; g.add(cy);
      const br = mesh(brimLathe(r * 0.9, r * 1.3, 0.025), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; g.add(br);
      const bd = mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.92, r * 0.22, 24, 1, true), band, { cast: false }); bd.position.y = r * 0.45; g.add(bd); }
    else if (kind === 'flat') { const cp = mesh(new THREE.SphereGeometry(r * 1.06, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); cp.scale.set(1.04, 0.5, 1.12); cp.position.set(0, r * 0.3, r * 0.04); g.add(cp);
      const pk = mesh(new THREE.BoxGeometry(r * 1.2, r * 0.05, r * 0.5), m, { ink: 0.004 }); pk.position.set(0, r * 0.3, r * 1.0); pk.rotation.x = 0.1; g.add(pk); }
    else if (kind === 'trilby') { const dome = mesh(new THREE.SphereGeometry(r * 1.0, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); dome.scale.set(1, 1.05, 1.05); dome.position.y = r * 0.3; g.add(dome);
      const br = mesh(brimLathe(r * 1.0, r * 1.5, 0.05), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; br.rotation.x = -0.05; g.add(br);
      const bd = mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.02, r * 0.18, 22, 1, true), toon('#6a2f2a', { rim: 0.3 }), { cast: false }); bd.position.y = r * 0.4; g.add(bd); }
    return g; };

  W.update = (t, focus) => { };
  return W;
}

// =====================================================================================================================
// THE PIG WAR (San Juan Island, 1859–1872). Sites are far apart on x so each shot sees only its own set:
//   island garden (0,0)  ·  standoff ridge (100,0)  ·  Kaiser's study (200,0)  ·  pier + bay (300,0). One shared sea plane.
// =====================================================================================================================
export function buildPigWar(scene, SR) {
  const { toon } = SR, INK = '#2a1612', UPV = V(0, 1, 0);
  const inkM = (w) => { const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }); m.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n transformed += normalize(normal) * ${w.toFixed(4)};`); }; m.customProgramCacheKey = () => 'oink' + w; return m; };
  const mesh = (g, m, o = {}) => { const x = new THREE.Mesh(g, m); x.castShadow = o.cast ?? true; x.receiveShadow = o.recv ?? true; if (o.ink) { const h = new THREE.Mesh(g, inkM(o.ink)); h.castShadow = false; x.add(h); } return x; };
  const seg = (a, b, r, m, o = {}) => { const d = b.clone().sub(a), L = d.length(), s = mesh(new THREE.CylinderGeometry(r, r, L, 8), m, o); s.position.copy(a).addScaledVector(d, 0.5); s.quaternion.setFromUnitVectors(UPV, d.normalize()); return s; };
  const W = {}; let sd = 1859; const R = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  const cv = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const live = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { c, g: c.getContext('2d'), t }; };
  const add = (o, p) => { o.position.set(...p); scene.add(o); return o; };

  // ---------- sky + sea ----------
  const skyU = { late: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float late; varying vec3 vp; void main(){ float h = clamp(vp.y,0.0,1.0);
      vec3 hz = mix(vec3(0.86,0.93,0.97), vec3(1.0,0.82,0.6), late), md = mix(vec3(0.55,0.78,0.97), vec3(0.78,0.7,0.78), late), zn = mix(vec3(0.24,0.5,0.88), vec3(0.32,0.42,0.7), late);
      vec3 c = mix(hz, md, smoothstep(0.0,0.25,h)); c = mix(c, zn, smoothstep(0.2,0.9,h)); gl_FragColor = vec4(c,1.0); }` }));
  sky.renderOrder = -1; scene.add(sky); W.sky = sky; W.setSky = k => { skyU.late.value = k; };
  scene.fog = new THREE.Fog('#cfe3ee', 50, 330);
  const seaG = new THREE.PlaneGeometry(900, 900, 120, 120).rotateX(-Math.PI / 2); const seaP = seaG.attributes.position, sea0 = Float32Array.from(seaP.array);
  const sea = mesh(seaG, toon('#2f8fb0', { rim: 0.3, kick: 0.2 }), { cast: false }); sea.position.set(150, -0.55, 0); scene.add(sea);
  const ripple = (t) => { for (let i = 0; i < seaP.count; i++) { const x = sea0[i * 3] + 150, z = sea0[i * 3 + 2]; seaP.setY(i, 0.06 * Math.sin(x * 0.5 + t * 0.9) + 0.05 * Math.sin(z * 0.43 - t * 0.7) + 0.03 * Math.sin((x + z) * 1.1 + t * 1.6)); } seaP.needsUpdate = true; };
  let rippleT = -9; W.rippleAt = t => { if (Math.abs(t - rippleT) > 0.05) { ripple(t); rippleT = t; } };

  // ---------- textures ----------
  const grassT = cv(512, 512, (g, w, h) => { g.fillStyle = '#74b552'; g.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${R() < 0.5 ? '40,110,50' : '170,215,100'},0.22)`; g.beginPath(); g.ellipse(R() * w, R() * h, 18 + R() * 50, 10 + R() * 30, R() * 3, 0, 7); g.fill(); } for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(30,90,40,${0.2 + R() * 0.3})`; g.fillRect(R() * w, R() * h, 2, 5 + R() * 5); } });
  grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(10, 10);
  const soilT = cv(256, 256, (g, w, h) => { g.fillStyle = '#7a5434'; g.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const v = 90 + R() * 60 | 0; g.fillStyle = `rgba(${v + 30},${v},${v - 40},0.5)`; g.fillRect(R() * w, R() * h, 3 + R() * 4, 2 + R() * 3); } });
  const land = (cx, cz, sx, sz, tex) => { const m = mesh(new THREE.CylinderGeometry(1, 1, 0.6, 48), toon('#ffffff', { rim: 0, kick: 0, map: tex || grassT }), { cast: false }); m.scale.set(sx, 1, sz); m.position.set(cx, -0.3, cz); scene.add(m); const beach = mesh(new THREE.CylinderGeometry(1.05, 1.1, 0.4, 48), toon('#e2cf9b', { rim: 0.1, kick: 0 }), { cast: false }); beach.scale.set(sx, 1, sz); beach.position.set(cx, -0.42, cz); scene.add(beach); return m; };

  // ---------- pines ----------
  const pine = (x, z, s = 1) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); const tr = mesh(new THREE.CylinderGeometry(0.18, 0.26, 1.6, 8), toon('#6a4a30', { rim: 0.2 }), { ink: 0.02 }); tr.position.y = 0.8; g.add(tr);
    const cols = ['#2f6f3e', '#3a7d47', '#2a6038']; for (let i = 0; i < 4; i++) { const c = mesh(new THREE.ConeGeometry(1.5 - i * 0.28, 1.9, 9), toon(cols[(i + (R() * 3 | 0)) % 3], { rim: 0.3 }), { ink: 0.025 }); c.position.y = 1.9 + i * 1.15; g.add(c); } return g; };
  const forest = (cx, cz, rx, rz, n, hole) => { for (let i = 0; i < n; i++) { const a = R() * 6.28, r = Math.sqrt(R()), x = cx + Math.cos(a) * rx * r, z = cz + Math.sin(a) * rz * r; if (hole && hole(x, z)) continue; pine(x, z, 0.8 + R() * 0.9); } };

  // ===== SITE A: the garden (origin) =====
  land(0, 0, 34, 28); W.garden = {};
  { const dirt = mesh(new THREE.PlaneGeometry(16, 11).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: soilT }), { cast: false }); dirt.position.set(0, 0.012, 1.0); scene.add(dirt);
    W.plants = [];
    const leafM = toon('#3f9a3c', { rim: 0.3 }), leaf2 = toon('#58b04a', { rim: 0.3 }), mound = toon('#6b4426', { rim: 0.2 }), tub = toon('#e0b872', { rim: 0.3 });
    for (let row = 0; row < 5; row++) for (let i = 0; i < 15; i++) { const x = -5.25 + i * 0.75, z = -3.2 + row * 1.6 + 0.0; const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
      const mo = mesh(new THREE.SphereGeometry(0.34, 10, 6), mound, { ink: 0.015 }); mo.scale.set(1, 0.42, 0.9); mo.position.y = 0.05; g.add(mo);
      const lf = new THREE.Group(); g.add(lf); for (let k = 0; k < 3; k++) { const l = mesh(new THREE.SphereGeometry(0.2, 8, 6), k % 2 ? leaf2 : leafM, { ink: 0.012 }); l.scale.set(1.2, 0.8, 1); l.position.set((k - 1) * 0.14, 0.32 + 0.05 * (k % 2), (R() - 0.5) * 0.12); lf.add(l); }
      const tu = new THREE.Group(); tu.visible = false; g.add(tu); for (let k = 0; k < 4; k++) { const p = mesh(new THREE.SphereGeometry(0.075, 8, 6), tub, { ink: 0.008, cast: false }); p.scale.set(1.3, 0.8, 1); p.position.set((R() - 0.5) * 0.9, 0.06, (R() - 0.5) * 0.7); p.rotation.y = R() * 3; tu.add(p); }
      const hole = mesh(new THREE.CircleGeometry(0.26, 10).rotateX(-Math.PI / 2), toon('#3b2512', { rim: 0 }), { cast: false }); hole.position.y = 0.025; hole.visible = false; g.add(hole);
      W.plants.push({ g, lf, tu, hole, mo, x, z, row, dig: 1e9 }); }
    W.setPlants = t => { for (const p of W.plants) { const d = p.dig <= t; p.lf.visible = !d; p.tu.visible = d; p.hole.visible = d; p.mo.scale.y = d ? 0.2 : 0.42; } };
    // cabin + fence + props
    const cab = new THREE.Group(); cab.position.set(-11, 0, -7.5); cab.rotation.y = 0.4; scene.add(cab);
    const lg = toon('#8b5e3c', { rim: 0.3 }); const body = mesh(new THREE.BoxGeometry(4.2, 2.3, 3.2), lg, { ink: 0.02 }); body.position.y = 1.15; cab.add(body);
    for (let k = 0; k < 7; k++) { const lo = mesh(new THREE.CylinderGeometry(0.13, 0.13, 4.3, 8), toon(k % 2 ? '#7a512f' : '#94683f', { rim: 0.3 }), { ink: 0.01 }); lo.rotation.z = Math.PI / 2; lo.position.set(0, 0.2 + k * 0.33, 1.62); cab.add(lo); }
    const roof = mesh(new THREE.ConeGeometry(3.3, 1.5, 4), toon('#5a3f2c', { rim: 0.3 }), { ink: 0.02 }); roof.rotation.y = Math.PI / 4; roof.scale.set(1.0, 1, 0.8); roof.position.y = 3.05; cab.add(roof);
    const door = mesh(new THREE.BoxGeometry(0.9, 1.6, 0.1), toon('#4a3020', { rim: 0.2 }), { ink: 0.008 }); door.position.set(0, 0.8, 1.66); cab.add(door); const chim = mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), toon('#8a8379', { rim: 0.3 }), { ink: 0.012 }); chim.position.set(1.4, 3.3, -0.4); cab.add(chim);
    const wood = toon('#9a7248', { rim: 0.3 }), post = (x, z) => { const p = mesh(new THREE.BoxGeometry(0.14, 1.0, 0.14), wood, { ink: 0.008 }); p.position.set(x, 0.5, z); scene.add(p); };
    const rail = (a, b) => { for (const y of [0.35, 0.75]) { const r = seg(V(a[0], y, a[1]), V(b[0], y, b[1]), 0.045, wood, { ink: 0.005 }); scene.add(r); } };
    for (let x = -8; x <= 8; x += 2) { post(x, 5.8); if (x < 8) rail([x, 5.8], [x + 2, 5.8]); } for (let z = -5; z <= 5.8; z += 2) { post(-8, z); post(8, z); if (z < 5.8) { rail([-8, z], [-8, z + 2]); rail([8, z], [8, z + 2]); } }
    for (let x = -8; x <= 8; x += 2) { post(x, -5.6); if (x < 8) rail([x, -5.6], [x + 2, -5.6]); }
    const bar = (x, z) => { const b = mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.8, 14), toon('#7b573a', { rim: 0.3 }), { ink: 0.012 }); b.position.set(x, 0.4, z); scene.add(b); }; bar(-7.3, 5.0); bar(-6.6, 5.4);
    forest(0, -26, 36, 12, 70, () => false); forest(-26, 0, 8, 22, 36, () => false); forest(30, -14, 10, 14, 26, () => false); forest(26, 22, 6, 6, 8, () => false); }
  // coastline + dock on the +x side of the island (water visible beyond the pines)
  { const sand = mesh(new THREE.PlaneGeometry(14, 40).rotateX(-Math.PI / 2), toon('#e5d3a0', { rim: 0, kick: 0 }), { cast: false }); sand.position.set(22, 0.01, 4); scene.add(sand); for (let i = 0; i < 12; i++) { const r = mesh(new THREE.SphereGeometry(0.5 + R() * 0.5, 8, 6), toon('#8e8a82', { rim: 0.3 }), { ink: 0.01 }); r.scale.y = 0.6; r.position.set(26 + R() * 3, 0.1, -10 + R() * 28); scene.add(r); } }

  // ---------- the pig: Berkshire, faces +z, origin on ground ----------
  W.makePig = () => { const root = new THREE.Group(), pv = new THREE.Group(); root.add(pv); root.visible = false; const blk = toon('#4a4550', { rim: 0.5, kick: 0.25 }), blk2 = toon('#3a3640', { rim: 0.4 }), wht = toon('#f6f1e6', { rim: 0.4 }), pk = toon('#efb3ab', { rim: 0.4 }), dk = new THREE.MeshBasicMaterial({ color: '#0c0a0b' });
    const body = mesh(new THREE.SphereGeometry(0.5, 20, 14), blk, { ink: 0.02 }); body.scale.set(0.78, 0.7, 1.18); body.position.set(0, 0.56, 0); pv.add(body);
    const rump = mesh(new THREE.SphereGeometry(0.4, 14, 10), blk2, { ink: 0.015 }); rump.position.set(0, 0.56, -0.38); rump.scale.set(0.95, 0.9, 0.9); pv.add(rump);
    const legs = []; for (const [sx, z] of [[1, 0.36], [-1, 0.36], [1, -0.38], [-1, -0.38]]) { const hip = new THREE.Group(); hip.position.set(sx * 0.2, 0.36, z); pv.add(hip); const up = mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.28, 8), blk, { ink: 0.01 }); up.position.y = -0.1; hip.add(up); const sk = mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.15, 8), wht, { ink: 0.008 }); sk.position.y = -0.25; hip.add(sk); legs.push(hip); }
    const head = new THREE.Group(); head.position.set(0, 0.58, 0.55); pv.add(head); const hd = mesh(new THREE.SphereGeometry(0.27, 16, 12), blk, { ink: 0.015 }); hd.scale.set(0.9, 0.88, 1.0); head.add(hd);
    const sn = mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.3, 12), blk, { ink: 0.012 }); sn.rotation.x = Math.PI / 2; sn.position.set(0, -0.06, 0.28); head.add(sn); const disc = mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.06, 12), pk, { ink: 0.01 }); disc.rotation.x = Math.PI / 2; disc.position.set(0, -0.06, 0.45); head.add(disc);
    for (const sx of [-1, 1]) { const ns = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), dk); ns.position.set(sx * 0.045, -0.06, 0.485); head.add(ns); }
    const bz = mesh(new THREE.BoxGeometry(0.07, 0.01, 0.34), wht, { cast: false }); bz.position.set(0, 0.2, 0.12); bz.rotation.x = 0.2; head.add(bz);
    const ears = []; for (const sx of [-1, 1]) { const ear = new THREE.Group(); ear.position.set(sx * 0.14, 0.2, 0.0); head.add(ear); const ec = mesh(new THREE.ConeGeometry(0.1, 0.2, 6), blk2, { ink: 0.008 }); ec.rotation.x = 1.1; ec.position.set(sx * 0.04, 0.0, 0.08); ear.add(ec); ear.rotation.z = -sx * 0.6; ears.push(ear);
      const eye = mesh(new THREE.SphereGeometry(0.04, 8, 6), wht, { cast: false }); eye.position.set(sx * 0.13, 0.08, 0.18); head.add(eye); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), dk); pu.position.set(sx * 0.15, 0.08, 0.205); head.add(pu); }
    const tail = new THREE.Group(); tail.position.set(0, 0.7, -0.78); pv.add(tail); const tc = mesh(new THREE.TorusGeometry(0.07, 0.02, 6, 12, Math.PI * 1.6), blk, { cast: false }); tc.rotation.y = Math.PI / 2; tail.add(tc); const tt = mesh(new THREE.SphereGeometry(0.035, 6, 5), wht, { cast: false }); tt.position.set(0, -0.06, 0.02); tail.add(tt);
    Object.assign(root, { pv, head, legs, ears, tail }); root.scale.setScalar(1.15); return root; };

  // ---------- props: rifle, spyglass, smoke puff ----------
  W.makeRifle = () => { const g = new THREE.Group(); g.visible = false; scene.add(g); const wd = toon('#7a4e2c', { rim: 0.3 }), st = toon('#3a3a40', { rim: 0.5, kick: 0.2 }); const stock = mesh(new THREE.BoxGeometry(0.07, 0.11, 0.42), wd, { ink: 0.006 }); stock.position.set(0, -0.02, -0.16); g.add(stock); const br = mesh(new THREE.CylinderGeometry(0.017, 0.02, 1.0, 8), st, { ink: 0.004 }); br.rotation.x = Math.PI / 2; br.position.z = 0.5; g.add(br);
    const fore = mesh(new THREE.BoxGeometry(0.05, 0.06, 0.5), wd, { ink: 0.004 }); fore.position.set(0, -0.02, 0.38); g.add(fore); const bay = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 5), st, { cast: false }); bay.rotation.x = Math.PI / 2; bay.position.set(0, 0.03, 1.1); g.add(bay); g.userData.muzzle = V(0, 0, 1.03); return g; };
  W.spyglass = (() => { const g = new THREE.Group(); g.visible = false; scene.add(g); const m = toon('#a6792f', { rim: 0.5 }), b = toon('#3a2f26', { rim: 0.3 }); const t1 = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.3, 10), b, { ink: 0.004 }); t1.rotation.x = Math.PI / 2; g.add(t1); const t2 = mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.22, 10), m, { ink: 0.004 }); t2.rotation.x = Math.PI / 2; t2.position.z = 0.24; g.add(t2); return g; })();
  { const sg = new THREE.Group(); sg.visible = false; scene.add(sg); W.smoke = sg; const mm = new THREE.MeshBasicMaterial({ color: '#efece6', transparent: true, opacity: 0.8, depthWrite: false, fog: false }); W.smokeMat = mm;
    for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mm); s.userData = { a: R() * 6.28, sp: 0.5 + R() * 0.9, up: 0.3 + R() * 0.8 }; sg.add(s); }
    const fl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 0.8), transparent: true, opacity: 1, depthWrite: false, fog: false })); fl.visible = false; scene.add(fl); W.flash = fl;
    // age a (seconds since the shot): puff expands, rises and fades
    W.smokeAt = (pos, dir, a) => { sg.visible = a >= 0 && a < 4; W.flash.visible = a >= 0 && a < 0.09; if (a < 0) return; W.flash.position.copy(pos).addScaledVector(dir, 0.15); W.flash.scale.setScalar(1 + a * 8); sg.position.copy(pos); const k = Math.min(1, a / 3.2); mm.opacity = 0.85 * (1 - k * k);
      sg.children.forEach(s => { const u = s.userData, r = Math.min(a, 2.5); s.position.copy(dir).multiplyScalar(0.2 + r * 0.55 * u.sp).add(V(Math.cos(u.a) * r * 0.12, 0.1 + r * u.up * 0.3, Math.sin(u.a) * r * 0.12)); s.scale.setScalar(0.25 + r * 0.45 * u.sp); }); }; }

  // ---------- flags (waving), tents ----------
  const flagTex = kind => cv(300, 190, (g, w, h) => { if (kind === 'us') { for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? '#f4f1ea' : '#b22234'; g.fillRect(0, i * h / 13, w, h / 13 + 1); } g.fillStyle = '#3c3b6e'; g.fillRect(0, 0, w * 0.45, h * 7 / 13); g.fillStyle = '#fff'; for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) { g.beginPath(); g.arc(14 + c * 18.5, 14 + r * 20, 3.6, 0, 7); g.fill(); } }
    else { g.fillStyle = '#1c2f6e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 36; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); g.strokeStyle = '#c8202e'; g.lineWidth = 12; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); g.strokeStyle = '#fff'; g.lineWidth = 58; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); g.strokeStyle = '#c8202e'; g.lineWidth = 32; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); } });
  const FT = { us: flagTex('us'), uk: flagTex('uk') }; W.flags = [];
  W.flagpole = (x, z, kind, hgt = 6, sz = 1.3) => { const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g); const po = mesh(new THREE.CylinderGeometry(0.05, 0.07, hgt, 8), toon('#8a6a40', { rim: 0.3 }), { ink: 0.01 }); po.position.y = hgt / 2; g.add(po); const gg = new THREE.PlaneGeometry(sz * 1.6, sz, 14, 6); const fl = mesh(gg, new THREE.MeshToonMaterial({ map: FT[kind], side: THREE.DoubleSide }), { cast: false }); fl.position.set(sz * 0.8, hgt - sz * 0.55, 0); g.add(fl); W.flags.push({ gg, fl, p0: Float32Array.from(gg.attributes.position.array), ph: R() * 6 }); return g; };
  const tent = (x, z, ry, col = '#e9dcc0') => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g); const tm = toon(col, { rim: 0.3, side: THREE.DoubleSide }); const c = mesh(new THREE.ConeGeometry(1.7, 2.1, 4, 1, true), tm, { ink: 0.02 }); c.rotation.y = Math.PI / 4; c.scale.set(1.15, 1, 0.9); c.position.y = 1.05; g.add(c); const door = mesh(new THREE.PlaneGeometry(0.7, 1.2), toon('#2a2018', { rim: 0 }), { cast: false }); door.position.set(0, 0.6, 1.2); door.rotation.x = -0.15; g.add(door); const pole = mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), toon('#7a5a35', { rim: 0.2 }), {}); pole.position.y = 1.2; g.add(pole); return g; };

  // ===== SITE B: the standoff ridge (x = 100) =====
  const SB = 100; land(SB, 0, 40, 38); W.standoff = SB;
  // camps face each other along z: British (red) at −z, US (blue) at +z — portrait frames stack them top to bottom
  { const hill = (x, z, r, h) => { const m = mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), toon('#ffffff', { rim: 0.1, kick: 0, map: grassT }), { cast: false }); m.scale.y = h / r; m.position.set(x, -0.05, z); scene.add(m); return m; };
    hill(SB - 36, 0, 16, 5); hill(SB + 36, 2, 15, 4.6); hill(SB - 14, 40, 12, 3); hill(SB + 12, -42, 11, 3);
    const S2 = (dx, dz) => [SB + dz, dx];
    for (const [dx, dz, ry] of [[12, -4, -1.9], [15, 0.5, -1.7], [12, 5, -1.5], [17.5, 4.5, -1.6], [17, -3.5, -1.8]]) { const [x, z] = S2(dx, dz); tent(x, z, ry - Math.PI / 2, '#e9dcc0'); }
    for (const [dx, dz, ry] of [[-12, -4, 1.9], [-15, 0.5, 1.7], [-12, 5, 1.5], [-17.5, 4.5, 1.6], [-17, -3.5, 1.8]]) { const [x, z] = S2(dx, dz); tent(x, z, ry - Math.PI / 2, '#eadfc9'); }
    { const f = (dx, dz, k, h, s) => { const [x, z] = S2(dx, dz); W.flagpole(x, z, k, h, s); }; f(10, 1.0, 'us', 7, 1.5); f(17, 8, 'us', 5.6, 1.2); f(-10, 1.0, 'uk', 7, 1.5); f(-17, 8, 'uk', 5.6, 1.2); }
    const wood = toon('#8a6a45', { rim: 0.3 }); for (const sx of [-1, 1]) for (let q = -7; q <= 8; q += 3) { const [x, z] = S2(sx * 7, q); const p = mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), wood, { ink: 0.006 }); p.position.set(x, 0.45, z); scene.add(p); if (q < 8) { const [x2, z2] = S2(sx * 7, q + 3); scene.add(seg(V(x, 0.7, z), V(x2, 0.7, z2), 0.04, wood, { ink: 0.004 })); } }
    forest(SB - 34, 0, 6, 22, 24, () => false); forest(SB + 34, 0, 6, 22, 24, () => false); forest(SB, 36, 26, 4, 22, () => false); forest(SB, -34, 26, 4, 22, () => false);
    // distant ship on the sea behind the British camp (a "warship")
    W.ship = (x, z, ry, s = 1) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g); const hm = toon('#3a2a20', { rim: 0.4 }), st = toon('#f1ead8', { rim: 0.3 }), dk = toon('#8a6a45', { rim: 0.3 });
      const hl = mesh(new THREE.BoxGeometry(2.6, 1.4, 8), hm, { ink: 0.03 }); hl.position.y = 0.1; g.add(hl); const bow = mesh(new THREE.BoxGeometry(1.7, 1.4, 1.7), hm, { ink: 0.03 }); bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.1, 4.55); g.add(bow);
      const stripe = mesh(new THREE.BoxGeometry(2.64, 0.2, 8.02), st, { cast: false }); stripe.position.y = 0.35; g.add(stripe); const deck = mesh(new THREE.BoxGeometry(2.4, 0.1, 7.6), dk, {}); deck.position.y = 0.84; g.add(deck);
      for (const z0 of [-2, 1.6]) { const ms = mesh(new THREE.CylinderGeometry(0.08, 0.11, 7, 8), dk, { ink: 0.01 }); ms.position.set(0, 4.3, z0); g.add(ms); for (const [y, w] of [[2.6, 3], [4.4, 2.4], [5.9, 1.7]]) { const yd = seg(V(-w / 2, y, z0), V(w / 2, y, z0), 0.04, dk, {}); g.add(yd); const sl = mesh(new THREE.PlaneGeometry(w, 1.3), new THREE.MeshToonMaterial({ color: '#f1ead8', side: THREE.DoubleSide }), { cast: false }); sl.position.set(0, y - 0.65, z0 + 0.06); sl.rotation.x = 0.06; g.add(sl); } }
      const cab = mesh(new THREE.BoxGeometry(2.0, 0.9, 1.6), dk, { ink: 0.01 }); cab.position.set(0, 1.35, -3.0); g.add(cab); return g; };
    W.ship(SB - 8, -49, 0.4, 1.5); }

  // ===== SITE C: Kaiser's study (x = 200) =====
  const SC = 200; W.study = SC;
  { const rm = new THREE.Group(); rm.position.set(SC, 0, 0); scene.add(rm); const fl = mesh(new THREE.PlaneGeometry(16, 14).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: cv(256, 256, (g, w, h) => { g.fillStyle = '#5a3a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#6a4529' : '#4a2f1b'; g.fillRect(i * 32, j * 32, 32, 32); } }) }), { cast: false }); fl.position.y = 0.012; rm.add(fl);
    const rug = mesh(new THREE.PlaneGeometry(6.4, 4.6).rotateX(-Math.PI / 2), toon('#ffffff', { rim: 0, kick: 0, map: cv(256, 180, (g, w, h) => { g.fillStyle = '#7a1d24'; g.fillRect(0, 0, w, h); g.strokeStyle = '#d9b45a'; g.lineWidth = 6; g.strokeRect(10, 10, w - 20, h - 20); g.lineWidth = 3; g.strokeRect(26, 26, w - 52, h - 52); g.fillStyle = '#d9b45a'; g.beginPath(); g.ellipse(w / 2, h / 2, 50, 30, 0, 0, 7); g.fill(); g.fillStyle = '#7a1d24'; g.beginPath(); g.ellipse(w / 2, h / 2, 34, 18, 0, 0, 7); g.fill(); }) }), { cast: false }); rug.position.y = 0.02; rm.add(rug);
    const wallT = cv(256, 256, (g, w, h) => { g.fillStyle = '#6e1f2a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let x = 0; x < w; x += 32) g.fillRect(x, 0, 16, h); g.fillStyle = 'rgba(217,180,90,0.16)'; for (let y = 16; y < h; y += 48) for (let x = 16; x < w; x += 32) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); } }); wallT.wrapS = wallT.wrapT = THREE.RepeatWrapping; wallT.repeat.set(5, 2);
    const wm = toon('#ffffff', { rim: 0.1, kick: 0, map: wallT }); const bw = mesh(new THREE.PlaneGeometry(16, 6), wm, { cast: false }); bw.position.set(0, 3, -5.2); rm.add(bw); const lw = mesh(new THREE.PlaneGeometry(14, 6), wm, { cast: false }); lw.rotation.y = Math.PI / 2; lw.position.set(-7, 3, 0); rm.add(lw); const rw = mesh(new THREE.PlaneGeometry(14, 6), wm, { cast: false }); rw.rotation.y = -Math.PI / 2; rw.position.set(7, 3, 0); rm.add(rw); const fw = mesh(new THREE.PlaneGeometry(16, 6), wm, { cast: false }); fw.rotation.y = Math.PI; fw.position.set(0, 3, 6); rm.add(fw);
    const ce = mesh(new THREE.PlaneGeometry(16, 14).rotateX(Math.PI / 2), toon('#d8c9a4', { rim: 0, kick: 0 }), { cast: false }); ce.position.y = 6; rm.add(ce);
    const pn = mesh(new THREE.PlaneGeometry(16, 1.3), toon('#3a2616', { rim: 0.2, kick: 0 }), { cast: false }); pn.position.set(0, 0.65, -5.18); rm.add(pn);
    const wd = toon('#4a2e1a', { rim: 0.3 }), wd2 = toon('#6a4428', { rim: 0.3 }), gold = toon('#d9b45a', { rim: 0.5 });
    // tall window with warm afternoon light
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.85, 1.2), toneMapped: false })); win.position.set(-3.6, 3.2, -5.16); rm.add(win); for (const [x, y, w2, h2] of [[-3.6, 3.2, 0.08, 3.7], [-3.6, 3.2, 2.5, 0.08], [-3.6, 5.05, 2.6, 0.14], [-3.6, 1.4, 2.6, 0.14]]) { const f = mesh(new THREE.BoxGeometry(w2, h2, 0.1), wd2, { ink: 0.004, cast: false }); f.position.set(x, y, -5.1); rm.add(f); }
    for (const sx of [-1, 1]) { const cu = mesh(new THREE.BoxGeometry(0.5, 4.2, 0.2), toon('#7a1d24', { rim: 0.2 }), { ink: 0.006, cast: false }); cu.position.set(-3.6 + sx * 1.55, 3.1, -5.0); rm.add(cu); }
    // heavy table + chart (W.setChart)
    const top = mesh(new THREE.BoxGeometry(3.4, 0.16, 2.0), wd2, { ink: 0.012 }); top.position.set(0, 0.92, 0); rm.add(top); const apron = mesh(new THREE.BoxGeometry(3.2, 0.22, 1.8), wd, { ink: 0.008 }); apron.position.set(0, 0.76, 0); rm.add(apron);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = mesh(new THREE.BoxGeometry(0.2, 0.84, 0.2), wd, { ink: 0.01 }); l.position.set(sx * 1.5, 0.42, sz * 0.85); rm.add(l); const kn = mesh(new THREE.SphereGeometry(0.13, 8, 6), gold, { cast: false }); kn.position.set(sx * 1.5, 0.85, sz * 0.85); rm.add(kn); }
    const CH = live(1024, 640); W.chart = CH; const cp = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.625).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: CH.t, toneMapped: false })); cp.position.set(0, 1.015, 0); rm.add(cp); W.chartPos = (px, py) => V(SC + (px / 1024 - 0.5) * 2.6, 1.02, (py / 640 - 0.5) * 1.625);
    // chandelier, bookshelves, globe, banner
    const ch = new THREE.Group(); ch.position.set(0, 4.7, 0); rm.add(ch); const ring = mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 24), gold, { ink: 0.005, cast: false }); ring.rotation.x = Math.PI / 2; ch.add(ring); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; const b = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.3, 1.1) })); b.position.set(Math.cos(a) * 0.7, 0.1, Math.sin(a) * 0.7); ch.add(b); } ch.add(seg(V(0, 0, 0), V(0, 1.3, 0), 0.02, gold, { cast: false }));
    const shelf = (x) => { const g = new THREE.Group(); g.position.set(x, 0, -4.9); rm.add(g); const bd = mesh(new THREE.BoxGeometry(2.8, 4.4, 0.5), wd, { ink: 0.01 }); bd.position.y = 2.2; g.add(bd); for (const y of [0.6, 1.5, 2.4, 3.3]) { const sl = mesh(new THREE.BoxGeometry(2.6, 0.06, 0.5), wd2, { cast: false }); sl.position.set(0, y, 0.06); g.add(sl); for (let i = 0; i < 10; i++) { const hb = 0.55 + R() * 0.25; const bk = mesh(new THREE.BoxGeometry(0.2, hb, 0.34), toon(['#6a2f2a', '#1f3a5a', '#2f4a32', '#8a6a2a', '#3a2a3a'][i % 5], { rim: 0.3 }), { ink: 0.003, cast: false }); bk.position.set(-1.15 + i * 0.26, y + 0.03 + hb / 2, 0.1); g.add(bk); } } }; shelf(3.5); shelf(6.0);
    const gl = new THREE.Group(); gl.position.set(-2.4, 0, -3.6); rm.add(gl); const gs = mesh(new THREE.SphereGeometry(0.45, 18, 12), toon('#3d7ab0', { rim: 0.4 }), { ink: 0.01 }); gs.position.y = 1.25; gl.add(gs); const gst = mesh(new THREE.CylinderGeometry(0.06, 0.2, 0.8, 10), wd, { ink: 0.006 }); gst.position.y = 0.4; gl.add(gst); const gr = mesh(new THREE.TorusGeometry(0.52, 0.02, 6, 24), gold, { cast: false }); gr.position.y = 1.25; gr.rotation.x = 0.3; gl.add(gr);
    const flg = new THREE.Group(); flg.position.set(1.2, 0, -4.9); rm.add(flg); const bn = mesh(new THREE.PlaneGeometry(1.1, 1.8), toon('#ffffff', { rim: 0, kick: 0, map: cv(128, 200, (g, w, h) => { g.fillStyle = '#1b1b1f'; g.fillRect(0, 0, w, h / 3); g.fillStyle = '#f4f1ea'; g.fillRect(0, h / 3, w, h / 3); g.fillStyle = '#c8202e'; g.fillRect(0, 2 * h / 3, w, h / 3); }) }), { cast: false }); bn.position.set(0, 3.6, 0); flg.add(bn); }
  // chart drawing: Pacific Northwest, San Juan Island between the two claimed channels
  W.setChart = (o = {}) => { const g = W.chart.g, ring = o.ring ?? 0, fin = o.final ?? 0;
    g.fillStyle = '#e8dab4'; g.fillRect(0, 0, 1024, 640); g.fillStyle = '#b7d3d3'; g.fillRect(24, 24, 976, 592);
    g.strokeStyle = 'rgba(70,110,130,0.35)'; g.lineWidth = 2; for (let y = 60; y < 620; y += 46) { g.beginPath(); g.moveTo(24, y); g.lineTo(1000, y); g.stroke(); } for (let x = 60; x < 1000; x += 64) { g.beginPath(); g.moveTo(x, 24); g.lineTo(x, 616); g.stroke(); }
    const land = (pts, c = '#cdb98a') => { g.fillStyle = c; g.strokeStyle = '#6f5a34'; g.lineWidth = 4; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); g.stroke(); };
    land([[24, 24], [1000, 24], [1000, 150], [900, 170], [820, 130], [740, 180], [650, 140], [560, 160], [470, 120], [380, 170], [300, 110], [220, 150], [150, 120], [24, 160]]);   // mainland coast
    land([[24, 200], [140, 190], [230, 240], [330, 300], [380, 380], [340, 470], [260, 560], [180, 616], [24, 616]], '#c4b183');   // Vancouver Island
    land([[640, 616], [1000, 616], [1000, 330], [900, 360], [820, 420], [760, 500], [700, 560]], '#c4b183');   // Olympic / Whidbey side
    const isl = (cx, cy, rx, ry, rot, c = '#cdb98a') => { g.save(); g.translate(cx, cy); g.rotate(rot); g.fillStyle = c; g.strokeStyle = '#6f5a34'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, 7); g.fill(); g.stroke(); g.restore(); };
    isl(640, 270, 52, 30, 0.5); isl(560, 350, 42, 92, 0.25, fin ? '#e8c85a' : '#cdb98a'); isl(650, 410, 38, 28, 0.2); isl(610, 240, 22, 16, 0); isl(700, 330, 22, 16, 0.6);   // Orcas, SAN JUAN, Lopez, small isles
    // claimed lines: British (Rosario, east of the islands) vs American (Haro, west) — the Kaiser's panel chose the Haro line, so San Juan went to America
    g.save(); g.setLineDash([16, 12]); g.lineWidth = 6; g.strokeStyle = '#2d4fa8'; g.beginPath(); g.moveTo(430, 170); g.quadraticCurveTo(470, 360, 450, 580); g.stroke(); g.strokeStyle = '#b3262a'; g.beginPath(); g.moveTo(760, 180); g.quadraticCurveTo(740, 380, 770, 560); g.stroke(); g.restore();
    g.font = 'bold 34px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.fillStyle = '#3a2a14'; g.fillText('SAN JUAN', 566, 352); g.font = 'bold 22px Anton, Impact, sans-serif'; g.fillStyle = '#2d4fa8'; g.fillText('HARO STRAIT', 400, 300); g.fillStyle = '#b3262a'; g.fillText('ROSARIO STRAIT', 820, 300);
    if (ring > 0) { g.save(); g.strokeStyle = `rgba(255,214,64,${Math.min(1, ring * 1.4)})`; g.lineWidth = 9; g.setLineDash([22, 14]); g.shadowColor = 'rgba(255,200,40,0.9)'; g.shadowBlur = 22; g.beginPath(); g.ellipse(566, 348, 96 * Math.min(1, ring * 1.2), 128 * Math.min(1, ring * 1.2), 0.25, 0, 7); g.stroke(); g.restore(); }
    if (fin > 0) { g.save(); g.globalAlpha = fin; g.strokeStyle = '#2d4fa8'; g.lineWidth = 12; g.beginPath(); g.moveTo(430, 170); g.quadraticCurveTo(470, 360, 450, 580); g.stroke(); g.restore(); }
    // compass rose
    g.save(); g.translate(930, 560); g.fillStyle = '#3a2a14'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 16 : 40; g.lineTo(Math.sin(a) * r, -Math.cos(a) * r); } g.closePath(); g.fill(); g.restore();
    g.strokeStyle = '#5a4a2a'; g.lineWidth = 8; g.strokeRect(6, 6, 1012, 628); W.chart.t.needsUpdate = true; }; W.setChart({});

  // ===== SITE D: pier + calm bay (x = 300) =====
  const SD = 300; W.pierX = SD;
  { land(SD, 40, 40, 30, null); const shore = mesh(new THREE.PlaneGeometry(40, 26).rotateX(-Math.PI / 2), toon('#e5d3a0', { rim: 0, kick: 0 }), { cast: false }); shore.position.set(SD, 0.02, 14); scene.add(shore);
    const wood = toon('#8a6a45', { rim: 0.3 }), wood2 = toon('#6a4e31', { rim: 0.3 });
    const deck = mesh(new THREE.BoxGeometry(3.6, 0.2, 34), wood, { ink: 0.012 }); deck.position.set(SD, 0.5, -3); scene.add(deck); for (let z = -19; z < 14; z += 1) { const pl = mesh(new THREE.BoxGeometry(3.5, 0.03, 0.04), wood2, { cast: false }); pl.position.set(SD, 0.62, z); scene.add(pl); }
    for (let z = -18; z <= 13; z += 3) for (const sx of [-1, 1]) { const p = mesh(new THREE.CylinderGeometry(0.15, 0.17, 2.6, 8), wood2, { ink: 0.01 }); p.position.set(SD + sx * 1.7, -0.7, z); scene.add(p); const bl = mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.35, 8), toon('#2e3036', { rim: 0.4 }), { ink: 0.006 }); if (z % 6 === 0) { bl.position.set(SD + sx * 1.6, 0.78, z); scene.add(bl); } }
    const ramp = mesh(new THREE.BoxGeometry(3.6, 0.2, 4), wood, { ink: 0.01 }); ramp.position.set(SD, 0.25, 15.5); ramp.rotation.x = -0.1; scene.add(ramp);
    W.ship(SD + 4.5, -14, 0, 1.15); W.flagpole(SD + 4.5, -17.6, 'uk', 5.5, 1.1);
    const rowb = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), wood, {}); rowb.visible = false;
    // gangplank from the pier end to the ship's deck
    const gp = mesh(new THREE.BoxGeometry(1.0, 0.07, 3.4), wood2, { ink: 0.006 }); gp.position.set(SD + 2.3, 0.85, -12.2); gp.rotation.z = -0.08; gp.rotation.y = -Math.PI / 2 + 0.0; scene.add(gp); W.gangplank = gp;
    forest(SD - 30, 30, 8, 12, 24, () => false); forest(SD + 28, 38, 6, 10, 18, () => false); forest(SD, 52, 28, 6, 30, () => false);
    // distant islands in the bay
    for (const [x, z, r] of [[SD - 60, -70, 18], [SD + 80, -90, 24], [SD + 30, -130, 30]]) { const h = mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#4d8a5a', { rim: 0.1, kick: 0 }), { cast: false }); h.scale.y = 0.4; h.position.set(x, -0.6, z); scene.add(h); } }

  // ---------- period hats ----------
  W.makeHat = (kind, col, r = 0.3) => { const g = new THREE.Group(), m = toon(col, { rim: 0.5 }), band = toon('#1c1a1e', { rim: 0.3 }), gold = toon('#d9b45a', { rim: 0.5 });
    const brimLathe = (r0, r1, drop) => new THREE.LatheGeometry([[r0, 0], [r1, -drop * 0.3], [r1 * 1.04, drop]].map(([a, b]) => new THREE.Vector2(a, b)), 28);
    if (kind === 'wide') { const cr = mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.92, r * 0.9, 22), m, { ink: 0.005 }); cr.position.y = r * 0.72; g.add(cr); const tp = mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.02, 22), m, {}); tp.position.y = r * 1.17; g.add(tp);
      const br = mesh(brimLathe(r * 0.92, r * 1.85, 0.08), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; g.add(br); const bd = mesh(new THREE.CylinderGeometry(r * 0.93, r * 0.95, r * 0.22, 22, 1, true), toon('#5a3a22', { rim: 0.3 }), { cast: false }); bd.position.y = r * 0.42; g.add(bd); }
    else if (kind === 'shako') { const cy = mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.95, r * 1.4, 20), m, { ink: 0.005 }); cy.position.y = r * 1.0; g.add(cy); const tp = mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.78, 0.03, 20), band, {}); tp.position.y = r * 1.72; g.add(tp); const pl = mesh(new THREE.CylinderGeometry(r * 0.08, r * 0.06, r * 0.7, 6), toon('#f1ead8', { rim: 0.3 }), { ink: 0.004 }); pl.position.y = r * 2.1; g.add(pl);
      const pt = mesh(new THREE.CylinderGeometry(r * 0.26, r * 0.26, 0.015, 12), gold, {}); pt.rotation.x = Math.PI / 2; pt.position.set(0, r * 1.05, r * 0.9); g.add(pt); const vs = mesh(new THREE.BoxGeometry(r * 1.3, 0.02, r * 0.5), band, {}); vs.position.set(0, r * 0.35, r * 1.0); vs.rotation.x = 0.15; g.add(vs); }
    else if (kind === 'kepi') { const cy = mesh(new THREE.CylinderGeometry(r * 0.82, r * 0.98, r * 0.62, 20), m, { ink: 0.005 }); cy.position.y = r * 0.62; cy.rotation.x = -0.12; g.add(cy); const tp = mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.82, 0.03, 20), m, {}); tp.position.set(0, r * 0.96, -r * 0.08); tp.rotation.x = -0.12; g.add(tp); const vs = mesh(new THREE.BoxGeometry(r * 1.1, 0.025, r * 0.55), band, { ink: 0.003 }); vs.position.set(0, r * 0.42, r * 1.05); vs.rotation.x = 0.2; g.add(vs); const bg = mesh(new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.012, 8), gold, {}); bg.rotation.x = Math.PI / 2; bg.position.set(0, r * 0.7, r * 0.97); g.add(bg); }
    else if (kind === 'hair') { const hm = toon(col, { rim: 0.3 }); const cp = mesh(new THREE.SphereGeometry(r * 1.03, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), hm, { ink: 0.004 }); cp.position.y = r * 0.35; cp.rotation.x = -0.18; g.add(cp); for (const sx of [-1, 1]) { const sb = mesh(new THREE.SphereGeometry(r * 0.22, 8, 6), hm, { ink: 0.003 }); sb.scale.set(0.7, 1.3, 0.8); sb.position.set(sx * r * 0.98, r * 0.02, r * 0.1); g.add(sb); } }
    else if (kind === 'bowler') { const dome = mesh(new THREE.SphereGeometry(r * 1.02, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), m, { ink: 0.005 }); dome.scale.y = 0.95; dome.position.y = r * 0.3; g.add(dome); const br = mesh(brimLathe(r * 1.0, r * 1.38, 0.03), toon(col, { rim: 0.5, side: THREE.DoubleSide }), { ink: 0.004 }); br.position.y = r * 0.3; g.add(br); }
    return g; };

  W.update = (t, focus) => { W.rippleAt(t); for (const f of W.flags) { const p = f.gg.attributes.position; for (let i = 0; i < p.count; i++) { const x = f.p0[i * 3], u = (x + 0.8 * 1.6 / 1.6) ; p.setZ(i, Math.sin(x * 4.0 - t * 5 + f.ph) * 0.06 * Math.abs(x + 1.2) + 0.0); p.setY(i, f.p0[i * 3 + 1] + Math.sin(x * 3.0 - t * 4 + f.ph) * 0.03); } p.needsUpdate = true; f.gg.computeVertexNormals(); } };
  return W;
}
