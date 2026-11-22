// DIRECTOR — data-driven scenes: reads film/shots.json (a storyboard made from the vocabulary in kit/vocab.json) and stages it with the stickrig cast, kit sites and camera moves. No per-topic code.
// one shot block per voice line (lines.json L0–L7), every shot moving. window.frame(t) → jpeg dataURL; timings from film/words.json + film/lines.json.
// Captions come from cap/overlay.mov at compose time, so on-canvas captions are off (add &caps=1 to preview them). John Snow version: main.john-snow.bak.js; Clever Hans: main.clever-hans.bak.js; emu-war: main.emu-war.bak.js; rail-story original: main.vietnam-rail.bak.js
import * as THREE from 'three';
import { makeStickRig } from './stickrig.js';
import { makePost } from './post.js';
import { buildKit, HC } from './world.js';
const H = HC;

const Q = new URLSearchParams(location.search);
const WW = +(Q.get('w') || 540), HH = +(Q.get('h') || 960);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const eio = x => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const vl = (a, b, k) => a.clone().lerp(b, k);
for (const [fam, url] of [['Anton', './film/Anton.ttf'], ['InterB', './film/Inter-Black.otf']]) { const f = new FontFace(fam, `url(${url})`); await f.load(); document.fonts.add(f); }

// ---------- timing (words.json [{w,start,end}] + lines.json; placeholder until the voice arrives) ----------
const getJ = async u => { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } };
let WORDS = await getJ('./film/words.json'), LINES = await getJ('./film/lines.json');
if (!WORDS || !LINES) { WORDS = await getJ('./film/ph_words.json'); LINES = await getJ('./film/ph_lines.json'); }
if (LINES.lines) LINES = LINES.lines; if (WORDS.words) WORDS = WORDS.words;
const FL = LINES.map(l => ({ start: l.start, end: l.end, text: l.text, words: [] }));
for (const w of WORDS) { let i = FL.findIndex(l => w.start >= l.start - 0.06 && w.start < l.end + 0.06); if (i < 0) { let best = 0, bd = 1e9; FL.forEach((l, k) => { const d = Math.min(Math.abs(w.start - l.start), Math.abs(w.start - l.end)); if (d < bd) { bd = d; best = k; } }); i = best; }
  FL[i].words.push({ w: w.w ?? w.word, t: w.start, e: w.end }); }
const norm = s => s.toLowerCase().normalize('NFC').replace(/[^\p{L}\d-]/gu, '');
const wt = (li, word, nth = 0) => { const ws = FL[li].words.filter(x => norm(x.w).startsWith(word)); return ws[nth] ? ws[nth].t : FL[li].start; };
const we = (li, word, nth = 0) => { const ws = FL[li].words.filter(x => norm(x.w).startsWith(word)); return ws[nth] ? ws[nth].e : FL[li].end; };
const L = i => FL[i].start, E = i => FL[i].end;
const DUR = FL[FL.length - 1].end;   // voice length from film/lines.json
const talking = (li, t, a = -1, b = 1e9) => FL[li].words.some(w => w.t >= a && w.t < b && t >= w.t && t < w.t + Math.max(0.09, (w.e - w.t) * 0.6));

// ---------- renderer, light ----------
const canvas = document.createElement('canvas'); canvas.width = WW; canvas.height = HH; document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
renderer.setSize(WW, HH, false); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(45, WW / HH, 0.03, 6000);
const hemi = new THREE.HemisphereLight('#cfe4ff', '#c98f5a', 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d4', 3.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; scene.add(sun, sun.target);
const SUNDIR = V(-0.45, 0.75, 0.48).normalize();
const SR = await makeStickRig(scene, './assets/rigs/Xbot.glb'); SR.setInkRes(WW, HH);
const W = buildKit(scene, SR);
const post = makePost({ renderer, scene, camera, W: WW, H: HH });
const U = post.grade.uniforms;

// two grades: bright Berlin courtyard day (DAY) → low amber late light (LATE) for the closing shot; setLook(k) blends them. Sky + fog follow.
const DAY = { exp: 1.0, sat: 1.18, warm: 0.07, teal: 0.02, con: 1.1, sun: '#fff0cc', si: 3.1, hemi: 1.35, dir: V(-0.5, 0.72, 0.5), mul: [1.02, 1.0, 0.96], fog: '#cfe3ee', rim: '#fff0cc', hc: '#cfe6ff', hg: '#7a9a55' };   // sunny storybook island
const LATE = { exp: 0.98, sat: 1.15, warm: 0.16, teal: 0.04, con: 1.14, sun: '#ffb46a', si: 2.5, hemi: 1.1, dir: V(-0.8, 0.32, 0.45), mul: [1.05, 0.97, 0.92], fog: '#e3c9a6', rim: '#ffb77a', hc: '#ffd9b0', hg: '#8a6a4a' };   // amber study / pale gold pier
const mixC = (a, b, k) => new THREE.Color(a).lerp(new THREE.Color(b), k);
function setLook(n) { const k = typeof n === 'number' ? clamp(n) : 0, A = DAY, B = LATE, m = (x, y) => lerp(x, y, k);
  renderer.toneMappingExposure = m(A.exp, B.exp); U.uSat.value = m(A.sat, B.sat); U.uWarm.value = m(A.warm, B.warm); U.uTeal.value = m(A.teal, B.teal); U.uCon.value = m(A.con, B.con); U.uVig.value = 0.8;
  U.uMul.value.set(m(A.mul[0], B.mul[0]), m(A.mul[1], B.mul[1]), m(A.mul[2], B.mul[2]));
  sun.color.copy(mixC(A.sun, B.sun, k)); sun.intensity = m(A.si, B.si); hemi.intensity = m(A.hemi, B.hemi); hemi.color.copy(mixC(A.hc, B.hc, k)); hemi.groundColor.copy(mixC(A.hg, B.hg, k));
  SUNDIR.copy(A.dir).lerp(B.dir, k).normalize(); scene.fog.color.copy(mixC(A.fog, B.fog, k)); SR.RIM.col.value.copy(mixC(A.rim, B.rim, k)); W.setSky(k); }
let gk = 0; const G = k => { gk = k; };
const gradeAt = () => gk;
post.bloomPass.threshold = 0.95; post.bloomPass.strength = 0.3;

// ---------- faces (canvas decals, drawn in ink on the white head) ----------
const IK = '#17141a', WH = '#fbf7ef', PU = '#17141a';   // white heads like RicksClips (user 2026-11-10, after a black-head try)
const EX = 82, LW = 26;   // eyes close together like the RicksClips reference (2026-11-10 compare)   // eyes closer like RicksClips (was 200)
const dotsRing = (g, px = 0, py = 0, r = 1) => { for (const sd of [-1, 1]) { g.fillStyle = WH; g.strokeStyle = IK; g.lineWidth = 18; g.beginPath(); g.ellipse(sd * 150, -6, 72 * r, 80 * r, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = PU; g.beginPath(); g.arc(sd * 150 + px * 22, 4 + py * 22, 30 * r, 0, 7); g.fill(); } }; const dots = (g, px = 0, py = 0, r = 1) => { g.fillStyle = IK; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * EX + px * 20, py * 20, 24 * r, 30 * r, 0, 0, 7); g.fill(); g.fillStyle = WH; g.beginPath(); g.arc(sd * EX + px * 20 + 7, py * 20 - 10, 0.1 * r, 0, 7); g.fill(); g.fillStyle = IK; } };
const ringEyes = (g, pr = 22) => { for (const sd of [-1, 1]) { g.fillStyle = WH; g.strokeStyle = IK; g.lineWidth = 20; g.beginPath(); g.ellipse(sd * EX, -6, 68, 82, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = PU; g.beginPath(); g.arc(sd * EX, 0, pr, 0, 7); g.fill(); } };
const brows = (g, tilt = 0, y = -112, lw = 40) => { lw *= 0.85; g.strokeStyle = IK; g.lineWidth = lw; g.lineCap = 'round'; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * 125, y + tilt * 34); g.quadraticCurveTo(sd * 200, y - 16 - tilt * 2, sd * 275, y - tilt * 34); g.stroke(); } };
const mSmile = (g, w = 70, y = 205, d = 0.5) => { g.strokeStyle = IK; g.lineWidth = LW; g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y + w * d * 2, w, y); g.stroke(); };
const mFlat = (g, w = 55, y = 215) => { g.strokeStyle = IK; g.lineWidth = LW; g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y - 8, w, y); g.stroke(); };
const mFrownS = g => { g.strokeStyle = IK; g.lineWidth = 15; g.beginPath(); g.moveTo(-22, 100); g.quadraticCurveTo(2, 84, 26, 102); g.stroke(); };   // small deadpan frown (ref image 1)
const mFrown = (g, w = 60, y = 225) => { g.strokeStyle = IK; g.lineWidth = LW; g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y - 45, w, y); g.stroke(); };
const mOpen = (g, w = 80, h = 95, y = 185, tongue = true) => { w *= 0.75; h *= 0.8; g.fillStyle = '#5c1212'; g.strokeStyle = IK; g.lineWidth = 14; g.beginPath(); g.moveTo(-w, y - 10); g.quadraticCurveTo(0, y - 24, w, y - 10); g.quadraticCurveTo(w * 0.8, y + h, 0, y + h); g.quadraticCurveTo(-w * 0.8, y + h, -w, y - 10); g.fill(); g.stroke(); tongue = true;
  if (tongue) { g.save(); g.clip(); g.fillStyle = '#ef3b3b'; g.beginPath(); g.ellipse(0, y + h, w * 0.55, h * 0.45, 0, 0, 7); g.fill(); g.restore(); } };
const mO = (g, r = 30, y = 225) => { g.strokeStyle = IK; g.lineWidth = 24; g.beginPath(); g.ellipse(0, y, r, r * 1.2, 0, 0, 7); g.stroke(); };
const mWavy = (g, y = 225) => { g.strokeStyle = IK; g.lineWidth = 24; g.beginPath(); for (let i = 0; i <= 6; i++) g.lineTo(-72 + i * 24, y + (i % 2 ? -13 : 13)); g.stroke(); };
const happyEyes = g => { g.strokeStyle = IK; g.lineWidth = 30; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * EX - 55, 12); g.quadraticCurveTo(sd * EX, -58, sd * EX + 55, 12); g.stroke(); } };
const lidEyes = g => { for (const sd of [-1, 1]) { g.save(); g.beginPath(); g.rect(sd * EX - 60, -78, 120, 120); g.clip(); g.fillStyle = IK; g.beginPath(); g.ellipse(sd * EX + 3, -70, 27, 32, 0, 0, 7); g.fill(); g.restore();
  g.strokeStyle = IK; g.lineWidth = 14; g.beginPath(); g.moveTo(sd * EX - 36, -78); g.quadraticCurveTo(sd * EX, -84, sd * EX + 38, -76); g.stroke(); } };   // black oval under a flat heavy lid (ref image 1)
const nose = g => {}; const noseOld = g => { g.strokeStyle = IK; g.lineWidth = 18; g.beginPath(); g.moveTo(-14, 95); g.quadraticCurveTo(10, 130, -18, 140); g.stroke(); };
const cheeks = (g, a = 0.32) => {}; const cheeksOld = (g, a = 0.32) => { a *= 0.8; const gr = (x) => { const rg = g.createRadialGradient(x, 115, 5, x, 115, 75); rg.addColorStop(0, `rgba(150,110,120,${a})`); rg.addColorStop(1, 'rgba(150,110,120,0)'); return rg; }; for (const sd of [-1, 1]) { g.fillStyle = gr(sd * 265); g.beginPath(); g.ellipse(sd * 265, 115, 80, 50, 0, 0, 7); g.fill(); } };
const sweat = g => { g.fillStyle = '#6cc3ff'; g.strokeStyle = IK; g.lineWidth = 8; g.beginPath(); g.moveTo(330, -200); g.quadraticCurveTo(372, -110, 330, -95); g.quadraticCurveTo(288, -110, 330, -200); g.fill(); g.stroke(); };
const FACES = {
  calm: g => { lidEyes(g); g.lineWidth = 0; mFrownS(g); },   // RicksClips deadpan (reference image 1)
  talk: g => { cheeks(g, 0.22); dots(g); brows(g, 0.05); nose(g); mOpen(g, 52, 62, 195, false); },
  wide: g => { cheeks(g, 0.15); ringEyes(g, 20); brows(g, -0.5, -150, 34); mO(g, 26, 235); },
  shout: g => { cheeks(g, 0.35); dots(g, 0, 0, 0.85); brows(g, 0.7, -108); mOpen(g, 95, 115, 175); },
  listen: g => { cheeks(g, 0.2); lidEyes(g); brows(g, 0.5, -84); nose(g); mFlat(g, 34); },
  serious: g => { cheeks(g, 0.18); lidEyes(g); brows(g, 0.45, -88); nose(g); mFlat(g, 50); },
  serioust: g => { cheeks(g, 0.18); lidEyes(g); brows(g, 0.45, -88); nose(g); mOpen(g, 45, 48, 200, false); },
  laugh: g => { cheeks(g, 0.45); happyEyes(g); brows(g, -0.25, -120, 34); mOpen(g, 90, 105, 165); },
  smug: g => { cheeks(g, 0.3); lidEyes(g); brows(g, 0.2, -86); g.strokeStyle = IK; g.lineWidth = LW; g.beginPath(); g.moveTo(-55, 205); g.quadraticCurveTo(10, 240, 75, 180); g.stroke(); },
  smugt: g => { cheeks(g, 0.3); lidEyes(g); brows(g, 0.2, -86); mOpen(g, 60, 70, 190, true); },
  flat: g => { cheeks(g, 0.15); dots(g, 0, 0.2, 0.9); brows(g, -0.15); mFlat(g, 40); },
  pale: g => { ringEyes(g, 18); brows(g, -0.55, -152, 32); mWavy(g); sweat(g); },
  palet: g => { ringEyes(g, 18); brows(g, -0.55, -152, 32); mOpen(g, 55, 80, 190, false); sweat(g); },
  squint: g => { cheeks(g, 0.2); g.strokeStyle = IK; g.lineWidth = 30; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(sd * EX - 55, 6); g.lineTo(sd * EX + 55, 0); g.stroke(); } brows(g, 0.4, -70); nose(g); mFrown(g); },
  grin: g => { cheeks(g, 0.4); dots(g); brows(g, -0.2, -125); nose(g); mSmile(g, 85, 190, 0.6); },
};
const moust = g => { g.fillStyle = IK; g.beginPath(); g.moveTo(-10, 150); g.quadraticCurveTo(-90, 140, -130, 215); g.quadraticCurveTo(-80, 175, -10, 182); g.closePath(); g.fill(); g.beginPath(); g.moveTo(10, 150); g.quadraticCurveTo(90, 140, 130, 215); g.quadraticCurveTo(80, 175, 10, 182); g.closePath(); g.fill();
  g.strokeStyle = '#d8d0c4'; g.lineWidth = 26; g.beginPath(); g.moveTo(-40, 300); g.quadraticCurveTo(0, 360, 40, 300); g.stroke(); g.strokeStyle = IK; g.lineWidth = 10; g.beginPath(); g.moveTo(-58, 296); g.quadraticCurveTo(0, 385, 58, 296); g.stroke(); };
// every face stroke ×1.5 (owner 2026-11-10: "đường nét vẽ mặt nó to đậm hơn")
const thick = (g, k) => new Proxy(g, { set(t, p, v) { t[p] = p === 'lineWidth' ? v * k : v; return true; }, get(t, p) { const v = t[p]; return typeof v === 'function' ? v.bind(t) : v; } });
const FACE_K = 1.0;   // owner meant the head outline, not the features
const big = f => g => { g.translate(0, -24); g.scale(1.42, 1.22); f(thick(g, FACE_K)); };
const FT = {}, FTC = {}; for (const k in FACES) { FT[k] = SR.faceTex(big(FACES[k]), false, true); FTC[k] = SR.faceTex(big(g => { FACES[k](g); moust(g); }), false, true); }
function face(c, mood) { const T = c.opts.moust ? FTC : FT; c.faceMesh.material.map = T[mood] || T.calm; }

// ---------- pose helpers ----------
const UP = V(0, 1, 0);
const Lw = (c, x, y, z) => { c.root.updateMatrixWorld(true); return c.root.localToWorld(V(x, y, z)); };
const dirW = (c, x, y, z) => V(x, y, z).applyQuaternion(c.root.quaternion).normalize();
const arm = (c, s, target, hint) => SR.limb(c, s + 'Arm', s + 'ForeArm', s + 'Hand', target, hint || dirW(c, (s === 'Left' ? 1 : -1) * 0.7, -0.6, -0.3));
const leg = (c, s, target, hint) => SR.limb(c, s + 'UpLeg', s + 'Leg', s + 'Foot', target, hint || dirW(c, 0, 0.25, 1));
const gy = (x, z) => H(x, z);
const HR = c => (c.opts.rick ? (c.opts.headR || 0.48) : 0.2) * c.root.scale.x, headC = c => c.head.getWorldPosition(new THREE.Vector3());
function place(c, x, z, ry = 0, y) { c.root.visible = true; c.root.rotation.set(0, ry, 0); c.root.position.set(x, y ?? gy(x, z), z); c.root.updateMatrixWorld(true); }
const yawTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
function idle(c, t, clip = 'idle') { SR.clipAt(c, clip, t + c.phase * 3); if (c.opts.rick && clip === 'idle') { const f = dirW(c, 0, 0, 1); SR.rotWorld(c.bone('LeftArm'), f, 0.5); SR.rotWorld(c.bone('RightArm'), f, -0.5); SR.rotWorld(c.bone('LeftForeArm'), f, -0.3); SR.rotWorld(c.bone('RightForeArm'), f, 0.3); } }
function hips(c, dy = 0, fwd = 0) { const h = c.bone('Hips'); const p = SR.wp(h).add(V(0, dy, 0)).add(dirW(c, 0, 0, 1).multiplyScalar(fwd)); h.position.copy(h.parent.worldToLocal(p)); h.updateMatrixWorld(true); }
const LEFT = c => dirW(c, 1, 0, 0);
function headTurn(c, yaw = 0, pitch = 0) { const hb = c.bone('Head'); if (yaw) SR.rotWorld(hb, UP, yaw); if (pitch) SR.rotWorld(hb, LEFT(c), pitch); }
function waveArms(c, t, both = true) { const s = Math.sin(t * 10);
  const w = c.opts.rick ? 0.75 : 0.42, hy = c.opts.rick ? 2.1 : 1.95;
  arm(c, 'Left', Lw(c, w + 0.12 * s, hy + 0.06 * s, 0.12), dirW(c, 1, 0.2, -0.5));
  if (both) arm(c, 'Right', Lw(c, -w + 0.12 * s, hy - 0.06 * s, 0.12), dirW(c, -1, 0.2, -0.5)); }
function wave1(c, t) { const s = Math.sin(t * 8); arm(c, 'Right', Lw(c, -0.45 + 0.12 * s, 1.85, 0.1), dirW(c, -1, -0.2, -0.3)); }
function laughPose(c, t) { const s = Math.abs(Math.sin((t + c.phase) * 11)); hips(c, -0.02 * s); SR.rotWorld(c.bone('Spine1'), LEFT(c), -0.12 - 0.1 * s); SR.rotWorld(c.bone('Head'), LEFT(c), -0.18 - 0.1 * s);
  arm(c, 'Left', Lw(c, 0.1, 1.02, 0.2), dirW(c, 1, 0, -0.2)); arm(c, 'Right', Lw(c, -0.08, 1.0 + 0.03 * s, 0.22), dirW(c, -1, 0, -0.2)); }
function pointAt(c, P, s = 'Right') { const sh = SR.wp(c.bone(s + 'Arm')); arm(c, s, sh.clone().add(P.clone().sub(sh).normalize().multiplyScalar(0.62)), dirW(c, s === 'Left' ? 1 : -1, -0.3, 0)); }
function shadeBrow(c) { const hc = headC(c); arm(c, 'Right', hc.clone().add(dirW(c, 0, 0, 1).multiplyScalar(0.24)).add(V(0, 0.12, 0)), dirW(c, -1, 0.3, 0)); }
function shove(c, P, k) { const sh = SR.wp(c.bone('Spine2')); const T = vl(sh.clone().add(P.clone().sub(sh).normalize().multiplyScalar(0.3)), P, k);
  SR.rotWorld(c.bone('Hips'), LEFT(c), 0.25 * k); arm(c, 'Left', T.clone().add(LEFT(c).multiplyScalar(0.1)), dirW(c, 1, -0.6, 0)); arm(c, 'Right', T.clone().add(LEFT(c).multiplyScalar(-0.1)), dirW(c, -1, -0.6, 0)); }

// ---------- camera ----------
let focus = V(0, 1, 0), shadowR = 9;
function look(p, tg, fov = 45, roll = 0) { if (Q.has('dbg')) console.log('LOOK', JSON.stringify(p.toArray().map(x => +x.toFixed(2))), JSON.stringify(tg.toArray().map(x => +x.toFixed(2))), fov); camera.position.copy(p); camera.up.set(0, 1, 0); camera.lookAt(tg); if (roll) camera.rotateZ(roll); camera.fov = fov; camera.aspect = WW / HH; camera.updateProjectionMatrix(); focus = tg.clone(); }
const hand = (t, a = 1) => V(Math.sin(t * 0.9) * 0.02 * a + Math.sin(t * 1.7 + 1) * 0.01 * a, Math.sin(t * 1.1 + 2) * 0.015 * a, 0);
let dofOn = null; const dof = (dist, a = 0.01) => { dofOn = [dist, a * (dist > 10 ? 0.05 : 0.4)]; };

// ---------- storyboard + vocabulary ----------
const SB = await getJ('./film/shots.json'), VOC = await getJ('./kit/vocab.json');
if (!SB || !SB.shots?.length) throw new Error('film/shots.json missing or empty');
const warn = (...a) => console.log('DIRECTOR WARN', ...a);
// site registry: origin in world space + per-set grade/light defaults and camera clamp box (local x,z half-extents)
const SITES = { palace: { o: [W.palaceX, 0], grade: 0.62, light: 4.2, box: [7.6, 5.0, 6.6], liftY: 0 }, farm: { o: [0, 0], grade: 0, light: 0, box: [30, 30, 30] }, camps: { o: [100, 0], grade: 0, light: 0, box: [30, 30, 30] }, pier: { o: [W.pierX, 0], grade: 0.12, light: 0, box: [30, 30, 30] } };
const ANCH = Object.fromEntries(Object.entries(VOC.sets).map(([k, v]) => [k, v.anchors]));

// ---------- cast roles -> stickrig people ----------
const base = { headCol: '#ffffff', headR: 0.3, bodyW: 0.82, headInk: 0.004, headInkClean: true, capBack: true, inkPx: 4.5, headLift: 0.78, headFwd: 0.55, flatHead: true, bodyInk: 0.02, headShape: 'rround', roundBottom: true, limbK: 0.6, head: 'ball', face: () => {}, rick: true, shoe: '#111', sole: '#111', armCol: '#3a2418', legCol: '#2b2230', shoeCol: '#2a1f1a', flatCloth: true, noodle: true, mitten: true };
const ROLES = {
  commoner: [{ jacket: '#a8946e', jacket2: '#85734f', pattern: ['stripes', '#957f58'], details: ['buttons'], armCol: '#a8946e', legCol: '#5a4632' }, 'flat', '#5a4a38'],
  elder: [{ jacket: '#8c8f98', jacket2: '#6e717a', pattern: ['stripes', '#7b7e87'], details: [], moust: true, armCol: '#8c8f98', legCol: '#4a4d57' }, null, null],
  noble: [{ jacket: '#f1ece0', jacket2: '#e0d9c8', pattern: ['stripes', '#6a1f6a'], details: ['belt'], armCol: '#e8e2d2', legCol: '#d9d2c0', shoeCol: '#7a5a2a' }, 'laurel', '#4e8a3c'],
  roman_soldier: [{ jacket: '#b3262a', jacket2: '#8c1c21', pattern: ['vest', '#8a6a2a'], details: ['belt', 'vestBtn'], armCol: '#c9a27a', legCol: '#c9a27a', shoeCol: '#5a3a1a' }, 'helmet', '#c2c6ce'],
  settler: [{ jacket: '#e2d6b8', jacket2: '#c9bb98', pattern: ['stripes', '#d2c4a2'], details: ['buttons'], moust: true, armCol: '#d8ccae', legCol: '#5a4632', shoeCol: '#3a2a1c' }, 'wide', '#c9a45a'],
  red_soldier: [{ jacket: '#b3262a', jacket2: '#8c1c21', pattern: ['vest', '#ece7da'], details: ['vestBtn', 'belt'], armCol: '#b3262a', legCol: '#e9e4d6', shoeCol: '#1d1a1a' }, 'shako', '#1f1f24'],
  blue_soldier: [{ jacket: '#233a6e', jacket2: '#1a2a52', pattern: ['vest', '#d6c46a'], details: ['vestBtn', 'belt'], armCol: '#233a6e', legCol: '#6f93c4', shoeCol: '#2a1f1a' }, 'kepi', '#233a6e'],
  official: [{ jacket: '#4d4137', jacket2: '#372e27', pattern: ['vest', '#2b241f'], details: ['tie', 'vestBtn', 'hanky'], tieCol: '#7a3a30', hankyCol: '#efe6d0', moust: true }, 'top', '#27221e'],
  monarch: [{ jacket: '#2b3b5c', jacket2: '#1d2a46', pattern: ['vest', '#d9b45a'], details: ['buttons', 'collar'], moust: true, armCol: '#2b3b5c', legCol: '#1d2a46', shoeCol: '#16120f' }, 'hair', '#f0f0f6'],
};
const CAST = {};
for (const c of SB.cast || []) { const r = ROLES[c.role]; if (!r) { warn('unknown role', c.role); continue; } const rig = SR.build({ ...base, ...r[0] }); if (r[1]) { const h = W.makeHat(r[1], r[2], 0.3); rig.head.add(h); rig.hat = h; } rig.root.scale.setScalar(0.8); rig.root.rotation.order = 'YXZ'; rig.phase = Object.keys(CAST).length * 0.37; face(rig, 'calm'); rig.tint = rig.hm.material.uniforms.base.value.clone(); CAST[c.id] = rig; }
const RIF = Array.from({ length: 6 }, () => W.makeRifle());

// ---------- timing refs ----------
const tref = (r) => { if (typeof r === 'number') return r; if (r === 'end') return DUR; const m = String(r).match(/^L(\d+)(?:@([\w'-]+?)(?:#(\d+))?)?$/); if (!m) { warn('bad time', r); return 0; } const li = +m[1]; if (!FL[li]) { warn('no line', li); return DUR; } return m[2] ? wt(li, norm(m[2]), m[3] ? +m[3] - 1 : 0) - 0.05 : L(li); };

// ---------- positions ----------
const TT = (t, a, b) => clamp((t - a) / (b - a));
const siteOf = (name) => SITES[name] || (warn('unknown set', name), SITES.farm);
function resolvePos(site, ref, off) { const S = siteOf(site); let x, z; if (Array.isArray(ref)) [x, z] = ref; else { const a = ANCH[site]?.[ref]; if (!a) { warn('unknown anchor', site, ref); [x, z] = [0, 0]; } else [x, z] = a; } if (off) { x += off[0]; z += off[1]; } return V(S.o[0] + x, S.liftY || 0, S.o[1] + z); }
const subjectPos = (site, shot, ref, t) => { if (ref === 'litter' && W.litter.visible) return W.litter.position.clone().setY(1.5); if (typeof ref === 'string' && CAST[ref]) { const A = shot._act[ref]; if (A) return V(A.p.x, A.act === 'kneel' ? 0.95 : 1.4, A.p.z); const r = CAST[ref]; return V(r.root.position.x, 1.4, r.root.position.z); } if (ref === 'curtain') return resolvePos(site, 'curtain_front').setY(1.8); return resolvePos(site, ref ?? 'center').setY(1.3); };

// ---------- actions ----------
const LEFT_ = c => dirW(c, 1, 0, 0);
function pose(c, A, t, tgt) { const act = A.act, s = Math.sin(t * 9);
  switch (act) {
    case 'walk': break;
    case 'point': pointAt(c, tgt || V(0, 1.2, 0), 'Right'); face(c, A.mood || 'serioust'); break;
    case 'wave': wave1(c, t); break;
    case 'cheer': waveArms(c, t, true); break;
    case 'hide': { const tr = Math.sin(t * 38) * 0.012; SR.rotWorld(c.bone('Hips'), UP, tr); lean(c, -0.1); arm(c, 'Left', Lw(c, 0.14, 1.12, 0.26), dirW(c, 1, -0.2, 0.3)); arm(c, 'Right', Lw(c, -0.14, 1.12, 0.26), dirW(c, -1, -0.2, 0.3)); break; }
    case 'kneel': { hips(c, -0.5, 0.05); lean(c, 0.25); leg(c, 'Left', Lw(c, 0.14, 0.04, 0.42), dirW(c, 0, 0.5, 1)); leg(c, 'Right', Lw(c, -0.12, 0.12, -0.4), dirW(c, 0, 0.5, -0.4)); arm(c, 'Left', Lw(c, 0.28, 0.75, 0.3), dirW(c, 1, -0.4, 0)); arm(c, 'Right', Lw(c, -0.1, 0.9, 0.3), dirW(c, -1, -0.4, 0)); break; }
    case 'bow': lean(c, 0.55); nod(c, 0.3); fold(c); break;
    case 'hail': arm(c, 'Right', Lw(c, -0.5, 1.8 + 0.05 * s, 0.45), dirW(c, -1, 0.3, 0.2)); arm(c, 'Left', Lw(c, 0.1, 1.0, 0.25), dirW(c, 1, -0.4, 0)); break;
    case 'shout': waveArms(c, t, true); face(c, A.mood || 'shout'); break;
    case 'flinch': lean(c, -0.3 - 0.05 * s); arm(c, 'Left', Lw(c, 0.3, 1.5, 0.3), dirW(c, 1, 0.3, 0)); arm(c, 'Right', Lw(c, -0.3, 1.5, 0.3), dirW(c, -1, 0.3, 0)); break;
    case 'plead': arm(c, 'Left', Lw(c, 0.5, 1.15, 0.3), dirW(c, 1, 0, 0)); arm(c, 'Right', Lw(c, -0.5, 1.15, 0.3), dirW(c, -1, 0, 0)); break;
    case 'hold_rifle': { const r = RIF[A.ri % RIF.length]; r.visible = true; r.position.copy(Lw(c, -0.34, 0.05, 0.22)); r.quaternion.setFromUnitVectors(V(0, 0, 1), V(0, 1, 0)); arm(c, 'Right', Lw(c, -0.34, 0.98, 0.22), dirW(c, -1, -0.3, 0)); arm(c, 'Left', Lw(c, 0.15, 0.95, 0.3), dirW(c, 1, -0.4, 0)); break; }
    default: break; } }
const fold = (c) => { arm(c, 'Left', Lw(c, 0.1, 1.0, 0.3), dirW(c, 1, -0.4, 0.2)); arm(c, 'Right', Lw(c, -0.1, 1.0, 0.3), dirW(c, -1, -0.4, 0.2)); };

const lean = (c, a) => SR.rotWorld(c.bone('Spine1'), LEFT(c), a);
const nod = (c, a) => SR.rotWorld(c.bone('Head'), LEFT(c), a);
const dofT = (a = 0.012) => dof(camera.position.distanceTo(focus), a);
const LOOK = (p, tg, fov, t, roll = 0) => look(p.clone().add(hand(t, 0.8)), tg, fov, roll);
// ---------- shots ----------
const SH = SB.shots.map((s, i) => ({ ...s, t0: tref(s.t0), i })).sort((a, b) => a.t0 - b.t0); SH.forEach((s, i) => { s.t1 = i + 1 < SH.length ? SH[i + 1].t0 : DUR; });
const SIZE = { ecu: [2.3, 28, 0.0], close: [3.6, 32, 0.1], medium: [5.8, 38, 0.3], wide: [10.5, 44, 0.9] };
let rifN = 0;
function stage(S, t) { const site = S.set, SIT = siteOf(site), u = TT(t, S.t0, S.t1); S._act = {}; rifN = 0;
  for (const a of S.actors || []) { const c = CAST[a.id]; if (!c) { warn('no cast', a.id); continue; }
    const p0 = resolvePos(site, a.at ?? 'center', a.offset), p1 = a.to ? resolvePos(site, a.to, a.offsetTo) : p0, e = a.act === 'walk' || a.to ? u : 0;
    const p = vl(p0, p1, e); const dir = p1.clone().sub(p0); let ry;
    const fr = a.face ?? (a.to ? 'travel' : 'camera');
    S._act[a.id] = { p, act: a.act || 'idle', a, c, dir, fr, ry }; }
  // props first (litter/curtain) so riders can be placed on them
  const pr = S.props || {}; if (pr.curtain) { const o = pr.curtain.open ?? 0, k = Array.isArray(o) ? lerp(o[0], o[1], eio(u)) : o; W.setCurtain(k, t, pr.curtain.sway ?? 0); } else W.setCurtain(0, t, 0);
  if (pr.litter) { const L_ = pr.litter, a = resolvePos(site, L_.from ?? 'center'), b = resolvePos(site, L_.to ?? L_.from ?? 'center'), p = vl(a, b, eio(u)), d = b.clone().sub(a); const ry = d.length() > 0.01 ? Math.atan2(d.x, d.z) : 0; W.litterAt(p.x, p.z, ry, 0);
    const rd = S._act[L_.rider]; if (rd) { rd.p = V(p.x, 0, p.z); rd.yOff = 1.1; rd.fr = ry; rd.act = rd.act === 'walk' ? 'idle' : rd.act; }
    (L_.bearers || []).forEach((id, i) => { const bd = S._act[id]; if (!bd) return; const sx = i % 2 ? 1 : -1, sz = i < 2 ? 1.5 : -1.5, c = Math.cos(ry), s = Math.sin(ry); bd.p = V(p.x + sx * 0.95 * c + sz * s, 0, p.z - sx * 0.95 * s + sz * c); bd.fr = ry; bd.act = 'walk'; }); }
  // camera (needs actor positions)
  const cm = S.camera || {}, sub = subjectPos(site, S, cm.subject, t); if (cm.y != null) sub.y = cm.y; const _ = 0,  [d0, fov0, hOff] = SIZE[cm.size || 'medium'] || SIZE.medium, mv = cm.move || 'static'; let d = d0, az = 0, hgt = sub.y + hOff, lat = 0;
  if (mv === 'push') d = lerp(d0 * 1.55, d0, eio(u)); else if (mv === 'pull') d = lerp(d0, d0 * 1.55, eio(u)); else if (mv === 'orbit') az = lerp(-0.45, 0.45, eio(u)); else if (mv === 'lateral') lat = lerp(-1.4, 1.4, eio(u)); else if (mv === 'crane_up') hgt += lerp(0, 2.4, eio(u)); else if (mv === 'crane_down') hgt += lerp(2.4, 0, eio(u));
  const side = cm.side || 'front', ref = S._act[cm.subject], fa = ref ? (typeof ref.fr === 'number' ? ref.fr : 0) : 0;
  let base = ref ? fa : { front: 0, back: Math.PI, left: -Math.PI / 2, right: Math.PI / 2, above: 0 }[side] ?? 0; if (ref) base += { front: 0, back: Math.PI, left: -1.0, right: 1.0, above: 0.3 }[side] ?? 0;
  if (!ref && (side === 'front' || side === 'above')) base = 0;
  const ang = base + az, cp = V(sub.x + Math.sin(ang) * d + Math.cos(ang) * lat, hgt + (side === 'above' ? d * 0.8 : 0), sub.z + Math.cos(ang) * d - Math.sin(ang) * lat);
  // occlusion avoidance: if another actor stands on the line camera->subject, swing the camera aside
  const blocked = (P) => Object.entries(S._act).some(([id, A]) => { if (id === cm.subject) return false; const ax = A.p.x - P.x, az_ = A.p.z - P.z, sx = sub.x - P.x, sz = sub.z - P.z, L2 = sx * sx + sz * sz; if (L2 < 1e-4) return false; const k = (ax * sx + az_ * sz) / L2; if (k < 0.05 || k > 0.98) return false; return Math.hypot(ax - k * sx, az_ - k * sz) < 0.55; });
  for (const dA of [0.6, -0.6, 1.1, -1.1, 1.6, -1.6]) { if (!blocked(cp) || cm.side === 'above') break; const a2 = ang + dA; cp.set(sub.x + Math.sin(a2) * d + Math.cos(a2) * lat, cp.y, sub.z + Math.cos(a2) * d - Math.sin(a2) * lat); }
  const bx = SIT.box; cp.x = clamp(cp.x, SIT.o[0] - bx[0], SIT.o[0] + bx[0]); cp.z = clamp(cp.z, SIT.o[1] - bx[1], SIT.o[1] + bx[2]);
  // actors
  for (const id in S._act) { const A = S._act[id], c = A.c; let ry; if (typeof A.fr === 'number') ry = A.fr; else if (A.fr === 'camera') ry = yawTo(A.p.x, A.p.z, cp.x, cp.z); else if (A.fr === 'away') ry = yawTo(A.p.x, A.p.z, cp.x, cp.z) + Math.PI; else if (A.fr === 'travel') ry = A.dir.length() > 0.01 ? Math.atan2(A.dir.x, A.dir.z) : 0; else if (CAST[A.fr] || ANCH[site]?.[A.fr]) { const T_ = CAST[A.fr] ? (S._act[A.fr]?.p || CAST[A.fr].root.position) : resolvePos(site, A.fr); ry = yawTo(A.p.x, A.p.z, T_.x, T_.z); } else ry = 0;
    place(c, A.p.x, A.p.z, ry, (A.p.y || 0) + (A.yOff || 0)); const walking = A.act === 'walk' || (A.a.to && A.act !== 'kneel');
    if (walking) SR.clipAt(c, 'walk', (t - S.t0) * 0.95 + c.phase); else idle(c, t); face(c, A.a.mood || 'calm');
    let tgt = null; if (A.a.target) tgt = typeof A.a.target === 'string' && CAST[A.a.target] ? (S._act[A.a.target]?.p || CAST[A.a.target].root.position).clone().setY(1.3) : resolvePos(site, A.a.target).setY(1.3);
    pose(c, { ...A.a, act: A.act, ri: rifN++ }, t, tgt); }
  const g = S.grade ?? SIT.grade; G(g); STUDYLIGHT.position.set(SIT.o[0], 4.5, SIT.o[1]); STUDYLIGHT.intensity = (S.light ?? (SIT.light ? 'warm' : 'none')) === 'none' ? 0 : (SIT.light || 3.5);
  LOOK(cp, sub, lerp(fov0 + 2, fov0, eio(u)), t, cm.roll ? cm.roll * Math.sin(u * 3) : 0); dofT(cm.size === 'ecu' ? 0.03 : cm.size === 'wide' ? 0.003 : 0.012); shadowR = cm.size === 'wide' ? 22 : 9; }

// ---------- frame ----------
const STUDYLIGHT = new THREE.PointLight('#ffb870', 0, 18, 1.4); scene.add(STUDYLIGHT);
function resetScene() { Object.values(CAST).forEach(c => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.hm.material.uniforms.base.value.copy(c.tint); }); RIF.forEach(r => r.visible = false); W.litter.visible = false; gk = 0; dofOn = null; shadowR = 9; }
function renderShot(S, t) { t_now = t; resetScene(); stage(S, t); setLook(gk); Object.values(CAST).forEach(c => SR.updateLimbs(c)); W.update(t, focus);
  const f = focus.clone(); sun.target.position.copy(f); sun.position.copy(f).addScaledVector(SUNDIR, 60); const sc = sun.shadow.camera; sc.left = sc.bottom = -shadowR; sc.right = sc.top = shadowR; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
  post.bokeh.enabled = !!dofOn; if (dofOn) { post.bokeh.uniforms.focus.value = dofOn[0]; post.bokeh.uniforms.aperture.value = dofOn[1]; }
  U.uTime.value = t; post.render(); }
let t_now = 0;
function render(t) { let i = 0; for (let k = 0; k < SH.length; k++) if (t >= SH[k].t0) i = k; renderShot(SH[i], t); return canvas.toDataURL('image/jpeg', 0.92); }
window.DUR = Math.min(DUR, +(Q.get('dur') || 1e9)); window.frame = render; window.FL = FL; window.ready = true;
console.log('SHOT_T ' + JSON.stringify(SH.map(x => +x.t0.toFixed(2))));
