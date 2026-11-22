// THE PIG WAR (San Juan Island 1859–1872) — RicksClips-style 3D short: potato patch + Berkshire pig, settler's rifle, US/British standoff, Kaiser's study, Royal Marines leave from the pier.
// one shot block per voice line (lines.json L0–L7), every shot moving. window.frame(t) → jpeg dataURL; timings from film/words.json + film/lines.json.
// Captions come from cap/overlay.mov at compose time, so on-canvas captions are off (add &caps=1 to preview them). John Snow version: main.john-snow.bak.js; Clever Hans: main.clever-hans.bak.js; emu-war: main.emu-war.bak.js; rail-story original: main.vietnam-rail.bak.js
import * as THREE from 'three';
import { makeStickRig } from './stickrig.js';
import { makePost } from './post.js';
import { buildPigWar, HC } from './world.js';
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
const W = buildPigWar(scene, SR);
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

// ---------- cast: the settler, 8 Royal Marines (red tunics, shakos), 8 US infantry (dark blue, kepis), Kaiser Wilhelm I. Same RicksClips rig. ----------
const HEADC = '#ffffff';
const base = { headCol: HEADC, headR: 0.3, bodyW: 0.82, headInk: 0.004, headInkClean: true, capBack: true, inkPx: 4.5, headLift: 0.78, headFwd: 0.55, flatHead: true, bodyInk: 0.02, headShape: 'rround', roundBottom: true, limbK: 0.6, head: 'ball', face: () => {}, rick: true, shoe: '#111', sole: '#111', armCol: '#3a2418', legCol: '#2b2230', shoeCol: '#2a1f1a', flatCloth: true, noodle: true, mitten: true };
const person = (o, hat, hatCol) => { const c = SR.build({ ...base, ...o }); if (hat) { const h = W.makeHat(hat, hatCol, 0.3); c.head.add(h); c.hat = h; } return c; };
const SETTLER = person({ jacket: '#e2d6b8', jacket2: '#c9bb98', pattern: ['stripes', '#d2c4a2'], details: ['buttons'], moust: true, armCol: '#d8ccae', legCol: '#5a4632', shoeCol: '#3a2a1c' }, 'wide', '#c9a45a');
const MAR = Array.from({ length: 8 }, (_, i) => person({ jacket: '#b3262a', jacket2: '#8c1c21', pattern: ['vest', '#ece7da'], details: ['vestBtn', 'belt'], moust: i % 3 === 1, tieCol: '#e8c85a', armCol: '#b3262a', legCol: '#e9e4d6', shoeCol: '#1d1a1a' }, 'shako', '#1f1f24'));
const USA = Array.from({ length: 8 }, (_, i) => person({ jacket: '#233a6e', jacket2: '#1a2a52', pattern: ['vest', '#d6c46a'], details: ['vestBtn', 'belt'], moust: i % 3 === 0, armCol: '#233a6e', legCol: '#6f93c4', shoeCol: '#2a1f1a' }, 'kepi', '#233a6e'));
const KAISER = person({ jacket: '#2b3b5c', jacket2: '#1d2a46', pattern: ['vest', '#d9b45a'], details: ['buttons', 'collar'], moust: true, armCol: '#2b3b5c', legCol: '#1d2a46', shoeCol: '#16120f' }, 'hair', '#f0f0f6');
const ALL = [SETTLER, ...MAR, ...USA, KAISER];
ALL.forEach(c => c.root.scale.setScalar(0.8));
ALL.forEach((c, i) => { c.phase = i * 0.37; c.root.rotation.order = 'YXZ'; face(c, 'calm'); c.tint = c.hm.material.uniforms.base.value.clone(); });
const PIG = W.makePig(); scene.add(PIG);
const RIF = Array.from({ length: 18 }, () => W.makeRifle());
// attach a prop to a bone at a root-local point so it rides the pose (suspenders, medals, backpacks)
function attach(c, obj, p, bone = 'Spine2') { const g = new THREE.Group(); g.add(obj); c.root.position.set(0, 0, 0); c.root.rotation.set(0, 0, 0); c.root.updateMatrixWorld(true); idle(c, 0); SR.updateLimbs(c); const b = c.bone(bone); b.updateMatrixWorld(true);
  const wp = c.root.localToWorld(V(...p)); b.add(g); g.position.copy(b.worldToLocal(wp)); const bs = new THREE.Vector3(); b.getWorldScale(bs); g.scale.setScalar(c.root.scale.x / bs.x);
  const bq = new THREE.Quaternion(), rq = new THREE.Quaternion(); b.getWorldQuaternion(bq); c.root.getWorldQuaternion(rq); g.quaternion.copy(bq.invert().multiply(rq)); return g; }
{ const tm = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, ...o }); const bx = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), tm(c));
  for (const sx of [-1, 1]) { const s = bx(0.045, 0.46, 0.02, '#5a3a22'); s.rotation.z = sx * 0.12; attach(SETTLER, s, [sx * 0.1, 1.2, 0.235]); const bk = bx(0.045, 0.4, 0.02, '#5a3a22'); attach(SETTLER, bk, [sx * 0.1, 1.2, -0.2]); }   // suspenders
  for (const sx of [-1, 1]) { const ep = bx(0.15, 0.03, 0.1, '#d9b45a'); attach(KAISER, ep, [sx * 0.27, 1.47, 0.0]); }   // epaulettes
  const sash = bx(0.07, 0.5, 0.015, '#c8202e'); sash.rotation.z = 0.7; attach(KAISER, sash, [0, 1.2, 0.245]);
  for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.012, 12), tm(i % 2 ? '#e8c85a' : '#d9b45a')); m.rotation.x = Math.PI / 2; attach(KAISER, m, [-0.13 + i * 0.045, 1.28 - (i % 2) * 0.03, 0.255]); const rb = bx(0.025, 0.05, 0.008, i % 2 ? '#1b1b1f' : '#c8202e'); attach(KAISER, rb, [-0.13 + i * 0.045, 1.33, 0.25]); }   // medals
  for (const c of MAR) { const pk = bx(0.3, 0.34, 0.14, '#6a5a3a'); attach(c, pk, [0, 1.15, -0.27]); const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.34, 10), tm('#5a4a32')); rl.rotation.z = Math.PI / 2; attach(c, rl, [0, 1.36, -0.3]); } }

// ---------- helpers ----------
const TT = (t, a, b) => clamp((t - a) / (b - a));
const lean = (c, a) => SR.rotWorld(c.bone('Spine1'), LEFT(c), a);
const nod = (c, a) => SR.rotWorld(c.bone('Head'), LEFT(c), a);
const P3 = (a, b, k) => vl(a, b, k);
const dofT = (a = 0.012) => dof(camera.position.distanceTo(focus), a);
const LOOK = (p, tg, fov, t, roll = 0) => look(p.clone().add(hand(t, 0.8)), tg, fov, roll);
const ob = (x, z, az, d, h) => V(x + Math.sin(az) * d, h, z + Math.cos(az) * d);
const walkTo = (c, t, t0, x, z, ry, y = 0, sp = 0.95) => { place(c, x, z, ry, y); SR.clipAt(c, 'walk', (t - t0) * sp + c.phase); };
const SB = 100, SC = 200, SD = 300;
let rifIx = 0;
const rif = () => { const r = RIF[rifIx++ % RIF.length]; r.visible = true; return r; };
function aimRifle(c, P, dir, recoil = 0) { const r = rif(); const d = dir.clone().normalize(), PP = P.clone().addScaledVector(d, -0.14 * recoil); r.position.copy(PP); r.quaternion.setFromUnitVectors(V(0, 0, 1), d); if (recoil) r.rotateX(-0.1 * recoil);
  arm(c, 'Right', PP.clone().addScaledVector(d, -0.12).add(V(0, -0.04, 0)), dirW(c, -1, -0.5, 0)); arm(c, 'Left', PP.clone().addScaledVector(d, 0.5).add(V(0, -0.05, 0)), dirW(c, 1, -0.4, 0)); return r; }
function orderArms(c) { const r = rif(); const b = Lw(c, -0.34, 0.05, 0.22); r.position.copy(b); r.quaternion.setFromUnitVectors(V(0, 0, 1), V(0, 1, 0)); arm(c, 'Right', Lw(c, -0.34, 0.98, 0.22), dirW(c, -1, -0.3, 0)); arm(c, 'Left', Lw(c, 0.15, 0.95, 0.3), dirW(c, 1, -0.4, 0)); }
function shoulder(c) { const r = rif(), d = dirW(c, 0.05, 1, -0.2).normalize(), P = Lw(c, -0.3, 0.98, 0.18); r.position.copy(P); r.quaternion.setFromUnitVectors(V(0, 0, 1), d); arm(c, 'Right', P.clone().addScaledVector(d, 0.05), dirW(c, -1, -0.4, 0)); arm(c, 'Left', Lw(c, 0.2, 1.0, 0.3), dirW(c, 1, -0.4, 0.1)); }
// troops on the ridge: side −1 = British (left, face +x), +1 = US (right, face −x); the first-column middle men pace their post
const TMOOD = { '-1': ['serious', 'squint', 'serious', 'listen', 'flat', 'serious', 'squint', 'calm'], '1': ['serious', 'squint', 'serious', 'flat', 'listen', 'serious', 'squint', 'calm'] };
function troop(c, i, side, t, o = {}) { const col = (i / 4) | 0, row = i % 4, Z = side * (6.5 + col * 1.6 + (o.back ?? 0)), X0 = SB + (-4.2 + row * 2.9 + col * 0.6), pace = col === 0 && (row === 1 || row === 3) && !o.still;
  if (pace) { const A = 1.7, ph = i * 1.3, v = Math.cos(t * 0.55 + ph), x = X0 + A * Math.sin(t * 0.55 + ph); walkTo(c, t, 0, x, Z, v > 0 ? Math.PI / 2 : -Math.PI / 2, 0, 0.7); shoulder(c); }
  else { place(c, X0, Z, side < 0 ? 0 : Math.PI); idle(c, t); orderArms(c); headTurn(c, 0.15 * Math.sin(t * 0.6 + i), 0); }
  face(c, (o.mood || TMOOD[side])[i]); }
function standoff(t, o = {}) { MAR.forEach((c, i) => { if (o.skipB && o.skipB.includes(i)) return; troop(c, i, -1, t, o); }); USA.forEach((c, i) => { if (o.skipU && o.skipU.includes(i)) return; troop(c, i, 1, t, o); }); }
function peer(c, t, ex, side, gx, gz) { const hd = headC(c), d = V(gx - hd.x, 0.02, gz - hd.z).normalize(); W.spyglass.visible = true; const P = hd.clone().addScaledVector(d, 0.3).add(V(0, -0.02, 0)); W.spyglass.position.copy(P); W.spyglass.quaternion.setFromUnitVectors(V(0, 0, 1), d);
  arm(c, 'Right', P.clone().addScaledVector(d, -0.05), dirW(c, -1, 0.2, 0)); arm(c, 'Left', P.clone().addScaledVector(d, 0.2).add(V(0, -0.02, 0)), dirW(c, 1, 0.2, 0)); face(c, 'squint'); }

// ---- the pig (path is a pure function of time so the plants it digs are known in advance) ----
const DIGX = [-2.25, -0.75, 0.75];
function pigState(t) { const z = 0.35; let x, zz = z, ry, walk = 0, dig = 0;   // digs facing the camera (+z), snout into the z = 1.6 row
  if (t < 2.2) { x = lerp(-5.2, DIGX[0], t / 2.2); ry = Math.PI / 2; walk = 1; }
  else if (t < 2.8) { x = DIGX[0]; ry = lerp(Math.PI / 2, 0, eio(TT(t, 2.2, 2.8))); }
  else if (t < 4.7) { x = DIGX[0]; ry = 0; dig = 1; }
  else if (t < 5.4) { x = lerp(DIGX[0], DIGX[1], eio(TT(t, 4.7, 5.4))); ry = Math.PI / 2; walk = 1; }
  else if (t < 5.9) { x = DIGX[1]; ry = lerp(Math.PI / 2, 0, eio(TT(t, 5.4, 5.9))); }
  else if (t < 7.7) { x = DIGX[1]; ry = 0; dig = 1; }
  else if (t < 8.4) { x = lerp(DIGX[1], DIGX[2], eio(TT(t, 7.7, 8.4))); ry = Math.PI / 2; walk = 1; }
  else if (t < 8.9) { x = DIGX[2]; ry = lerp(Math.PI / 2, 0, eio(TT(t, 8.4, 8.9))); }
  else if (t < 10.3) { x = DIGX[2]; ry = 0; dig = 1; }
  else { const u = t - 10.3; x = DIGX[2] + 0.5 * u + 1.9 * u * u; zz = z - 0.2 * u; ry = lerp(0, Math.PI / 2 - 0.1, eio(clamp(u / 0.6))); walk = 2; }
  return { x, z: zz, ry, walk, dig }; }
for (let k = 0; k < 3; k++) { const ts = [2.9, 5.9, 8.9][k]; for (const p of W.plants) if (Math.abs(p.x - DIGX[k]) < 0.01 && p.row === 3) { p.dig = ts + 0.5; }
  for (const p of W.plants) if (Math.abs(p.x - DIGX[k]) < 0.8 && Math.abs(p.row - 3) <= 1 && p.row !== 3 && (p.x * 7 + p.row) % 3 === 0) p.dig = Math.min(p.dig, ts + 0.7 + 0.2 * Math.abs(p.x - DIGX[k])); }
for (const p of W.plants) if (p.row === 4 && p.x > -3.3 && p.x < 1.3 && ((Math.round(p.x * 4)) % 3 === 0)) p.dig = Math.min(p.dig, 6.5 + 0.3 * (p.x + 3.3));
function pig(t, st) { const P = PIG; P.visible = true; P.position.set(st.x, 0, st.z); P.rotation.set(0, st.ry, 0);
  const w = st.walk, sp = w === 2 ? 14 : 8, a = w ? Math.sin(t * sp) : 0; P.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? a : -a) * (w === 2 ? 0.8 : 0.55); }); P.pv.position.y = w ? 0.03 * Math.abs(Math.sin(t * sp)) : 0; P.pv.rotation.z = w ? 0.04 * Math.sin(t * sp) : 0;
  const d = st.dig ? Math.sin(t * 7) : 0; P.head.rotation.x = st.dig ? 0.65 + 0.12 * d : (w ? 0.05 * Math.sin(t * sp * 0.5) : 0.1 * Math.sin(t * 1.2)); P.pv.rotation.x = st.dig ? 0.06 + 0.03 * d : 0; P.legs[0].rotation.x += st.dig ? -0.1 * Math.max(0, d) : 0;
  P.ears.forEach((e, i) => { e.rotation.x = 0.3 + (w ? 0.2 * Math.sin(t * sp + i) : 0.08 * Math.sin(t * 2 + i)); }); P.tail.rotation.z = 0.5 * Math.sin(t * (w ? 9 : 4)); P.updateMatrixWorld(true); }
const snoutW = () => PIG.head.localToWorld(V(0, -0.06, 0.45));

const SHOTS = [];
const shot = (t0, fn, o = {}) => SHOTS.push({ t0, fn, ...o });
let t_now = 0;
const T = { san: wt(0, 'san') - 0.15, amer: wt(0, 'american') - 0.1, kept: wt(0, 'kept') - 0.1, brit: wt(0, 'british') - 0.1,
  bang: wt(1, 'bang'), owner: wt(1, 'owner') - 0.2, so: wt(1, 'so') - 0.1, brs: wt(1, 'britain') - 0.1, and: wt(1, 'and') - 0.05, camped: wt(1, 'camped') - 0.1, glare: wt(1, 'glaring') - 0.1,
  kais: wt(2, 'kaiser') - 0.2, sett: wt(2, 'settled') - 0.15, isl: wt(2, 'island') - 0.1, amr: wt(2, 'america') - 0.15, cas: wt(3, 'casualties') - 0.1, onep: wt(3, 'one') - 0.05 };
// settler (drives L0 arrival + L1 gunshot). SX/SZ: where he stands once he arrives.
const SPOT = V(-3.2, 0, 4.0);
function settlerWalkIn(t) { const u = clamp((t - T.amer) / 3.0), x = lerp(-8.5, SPOT.x, eio(u)), z = lerp(3.0, SPOT.z, eio(u)); const arrived = u >= 1; if (!arrived) walkTo(SETTLER, t, T.amer, x, z, Math.PI / 2 - 0.1 + 0.2 * u, 0, 1.1); else { place(SETTLER, SPOT.x, SPOT.z, yawTo(SPOT.x, SPOT.z, 0.8, 1.2)); idle(SETTLER, t); }
  return arrived; }
function settlerRage(t, arrived) { const s = Math.sin(t * 9), P = V(0.8, 0.5, 1.2); face(SETTLER, 'serioust');
  if (!arrived) { arm(SETTLER, 'Left', Lw(SETTLER, 0.7 + 0.1 * s, 1.9 + 0.1 * s, 0.1), dirW(SETTLER, 1, 0.2, -0.4)); arm(SETTLER, 'Right', Lw(SETTLER, -0.7 - 0.1 * s, 1.9 - 0.1 * s, 0.1), dirW(SETTLER, -1, 0.2, -0.4)); }
  else { const k = Math.sin(t * 3.2); lean(SETTLER, 0.12 + 0.08 * k); headTurn(SETTLER, 0.2 * Math.sin(t * 2), 0); pointAt(SETTLER, P, 'Right'); arm(SETTLER, 'Left', Lw(SETTLER, 0.75 + 0.1 * s, 1.75 + 0.08 * s, 0.1), dirW(SETTLER, 1, 0.2, -0.4)); } }
// the shot: aim at a point in the dirt/air east of the garden. a = seconds since bang
const AIM = V(1, 0.22, -0.25);
function settlerFire(t, t0 = L(1), tb = T.bang) { const a = t - tb, up = eio(TT(t, t0, tb - 0.55)), rc = a >= 0 ? Math.max(0, 1 - a / 0.45) : 0; place(SETTLER, SPOT.x, SPOT.z, yawTo(SPOT.x, SPOT.z, 4, 2.5)); idle(SETTLER, t); face(SETTLER, a < 0 ? 'squint' : (a < 1.6 ? 'wide' : 'serioust'));
  lean(SETTLER, -0.3 * rc + (a < 0 ? 0.08 : 0)); const fore = dirW(SETTLER, 0, 0, 1), dir = fore.clone().multiplyScalar(0.92).add(V(0, 0.2, 0)).normalize(), carry = Lw(SETTLER, -0.1, 1.05, 0.25), shoulderP = Lw(SETTLER, -0.14, 1.3, 0.35);
  const P = vl(carry, shoulderP, up); const rr = aimRifle(SETTLER, P, vl(V(0, 1, 0.2), dir, up), rc); if (a >= 0) { const mz = rr.localToWorld(rr.userData.muzzle.clone()); W.smokeAt(mz, dir, a); headTurn(SETTLER, -0.35 * rc, 0.1 * rc); } return rr; }

// ---- L0: "In 1859, two empires almost went to war over a pig, as on San Juan Island an American farmer kept finding a British pig digging up his potatoes." ----
shot(0, (t) => { const u = eio(TT(t, 0, T.san)); W.setPlants(t); pig(t, pigState(t)); const st = pigState(t);
  LOOK(V(lerp(4.8, 1.2, u), lerp(1.5, 1.8, u), lerp(10.5, 9.0, u)), V(lerp(-1.6, st.x, u), 0.5, 0.9), lerp(40, 38, u), t); dofT(0.01); shadowR = 12; });   // medium-wide: the pig waddles between potato rows
shot(T.san, (t) => { const u = eio(TT(t, T.san, T.amer)); W.setPlants(t); pig(t, pigState(t));
  LOOK(V(lerp(-6, 5.5, u), lerp(1.6, 4.6, u), lerp(9, 13.5, u)), V(0, 1.2, 0), lerp(38, 40, u), t); dofT(0.003); shadowR = 20; });   // the island: garden, pines, sea
shot(T.amer, (t) => { const u = eio(TT(t, T.amer, T.kept)); W.setPlants(t); pig(t, pigState(t)); const arrived = settlerWalkIn(t); settlerRage(t, arrived);
  const hd = headC(SETTLER); LOOK(V(lerp(-1.0, -4.0, u), 1.35, lerp(7.2, 6.2, u)), P3(V(-4, 1.2, 3.5), hd, 0.6), lerp(40, 34, u), t); dofT(0.008); shadowR = 12; });   // the settler stomps in
shot(T.kept, (t) => { const u = eio(TT(t, T.kept, T.brit)); W.setPlants(t); pig(t, pigState(t)); settlerRage(t, true);
  LOOK(V(lerp(-6.2, -5.2, u), lerp(1.5, 1.8, u), lerp(7.4, 6.6, u)), V(-2.5, 1.3, 2.6), 40, t); dofT(0.008); shadowR = 12; });   // arms up: look what it did to the garden
shot(T.brit, (t) => { const u = eio(TT(t, T.brit, L(1))), st = pigState(t); W.setPlants(t); pig(t, st); settlerRage(t, true);
  const sn = snoutW(); LOOK(V(lerp(st.x + 3.6, st.x + 5.0, u), lerp(0.9, 1.6, u), lerp(5.2, 7.4, u)), V(st.x, 0.5, st.z), lerp(36, 44, u), t); dofT(0.02); shadowR = 10; });   // the pig digs, then trots off unbothered

// ---- L1: "One day, he'd had enough—bang—the pig's owner wanted him arrested, so America sent soldiers, Britain sent warships, and soon over two thousand men were camped on one tiny island glaring at each other." ----
shot(L(1), (t) => { const u = eio(TT(t, L(1), T.bang)); W.setPlants(t); pig(t, pigState(t)); settlerFire(t); const hd = headC(SETTLER), f = dirW(SETTLER, 0, 0, 1), r = dirW(SETTLER, -1, 0, 0);
  LOOK(hd.clone().addScaledVector(f, lerp(4.6, 3.0, u)).addScaledVector(r, lerp(-0.9, 1.4, u)).add(V(0, lerp(-0.3, 0.0, u), 0)), hd.clone().add(V(0.3, -0.2, 0)), lerp(36, 30, u), t); dofT(0.01); shadowR = 8; });   // he raises the rifle (tracking, close-medium)
shot(T.bang - 0.12, (t) => { const u = eio(TT(t, T.bang - 0.12, T.owner)); W.setPlants(t); pig(t, pigState(t)); const rr = settlerFire(t); const hd = headC(SETTLER), f = dirW(SETTLER, 0, 0, 1), r = dirW(SETTLER, -1, 0, 0);
  LOOK(hd.clone().addScaledVector(f, lerp(3.2, 2.0, u)).addScaledVector(r, lerp(1.1, 0.5, u)).add(V(0, 0.0, 0)), hd.clone().addScaledVector(f, 0.5).add(V(0, -0.15, 0)), lerp(32, 28, u), t); dofT(0.014); shadowR = 8; });   // BANG: recoil, smoke, wide eyes
shot(T.owner, (t) => { const u = eio(TT(t, T.owner, T.so)); W.setPlants(t); pig(t, pigState(t)); settlerFire(t); const hd = headC(SETTLER), f = dirW(SETTLER, 0, 0, 1), r = dirW(SETTLER, -1, 0, 0);
  LOOK(hd.clone().addScaledVector(f, lerp(2.2, 1.7, u)).addScaledVector(r, 0.4).add(V(0, 0.05, 0)), hd, lerp(30, 26, u), t); dofT(0.02); shadowR = 6; });   // his indignant face
shot(T.so, (t) => { const u = eio(TT(t, T.so, T.brs)); standoff(t, {});
  LOOK(V(lerp(SB - 3.5, SB + 3.5, u), lerp(1.7, 2.0, u), lerp(-3.0, -1.0, u)), V(lerp(SB - 1, SB + 1, u), 1.3, 9.5), 48, t); dofT(0.006); shadowR = 16; });   // America sends soldiers: the blue camp
shot(T.brs, (t) => { const u = eio(TT(t, T.brs, T.and)); standoff(t, {});
  LOOK(V(lerp(SB + 3.5, SB - 3.5, u), lerp(1.7, 2.0, u), lerp(3.0, 1.0, u)), V(lerp(SB + 1, SB - 1, u), 2.6, -10.5), 50, t); dofT(0.004); shadowR = 16; });   // Britain sends warships: the red camp, a ship beyond
shot(T.and, (t) => { const u = eio(TT(t, T.and, T.camped)); standoff(t, {});
  LOOK(V(lerp(SB + 3, SB, u), lerp(3.2, 13, u), lerp(12, 20, u)), V(SB, 0.6, lerp(2, -1, u)), lerp(44, 42, u), t); dofT(0.002); shadowR = 22; });   // crane up and back: two thousand men
shot(T.camped, (t) => { const u = eio(TT(t, T.camped, T.glare)); standoff(t, {});
  LOOK(V(lerp(SB - 5, SB + 5, u), lerp(17, 15, u), lerp(14, 13, u)), V(SB, 0.2, -0.5), 44, t, 0.02 * Math.sin(u * 3)); dofT(0.002); shadowR = 22; });   // aerial orbit: one tiny island, two camps
shot(T.glare, (t) => { const u = eio(TT(t, T.glare, T.glare + 1.2)); standoff(t, { skipB: [1] }); const c = MAR[1]; place(c, SB - 1.3, -5.0, 0); idle(c, t); peer(c, t, 0, -1, SB - 1.3, 6);
  const hd = headC(c); LOOK(V(hd.x + 1.3, hd.y + 0.05, hd.z + lerp(2.0, 1.5, u)), hd, 30, t); dofT(0.03); shadowR = 8; });   // a Royal Marine peers through his spyglass
shot(T.glare + 1.2, (t) => { const u = eio(TT(t, T.glare + 1.2, L(2))); standoff(t, { skipU: [1] }); const c = USA[1]; place(c, SB - 1.3, 5.0, Math.PI); idle(c, t); face(c, 'squint'); aimRifle(c, Lw(c, -0.3, 1.0, 0.3), dirW(c, 0, 0.9, 0.3).add(V(0, 0.4, 0)), 0); headTurn(c, 0.1 * Math.sin(t * 2), 0);
  const hd = headC(c); LOOK(V(hd.x - 1.3, hd.y + 0.05, hd.z - lerp(2.0, 1.5, u)), hd, 30, t); dofT(0.03); shadowR = 8; });   // an American soldier glares back

// ---- L2: "For twelve years, not one person was hurt, until the Kaiser of Germany settled it and the island went to America." ----
shot(L(2), (t) => { const u = eio(TT(t, L(2), T.kais)); G(0.35); standoff(t, { mood: ['calm', 'calm', 'listen', 'calm', 'calm', 'listen', 'calm', 'calm'] }); LOOK(V(lerp(SB - 11, SB - 7, u), 1.6, -8.6), V(lerp(SB + 3, SB + 4, u), 1.4, -8.0), 42, t); dofT(0.003); shadowR = 18; });   // years pass: the camps stay put, nobody fires
const KZ = -1.15, SJ = W.chartPos(566, 352);
function kaiser(t, o = {}) { const c = KAISER; place(c, SC + 0.2, KZ, 0); idle(c, t); const bl = (t % 3.1) < 0.12 ? 'squint' : (o.mood ?? 'serious'); face(c, bl); lean(c, o.lean ?? 0.12); nod(c, o.nod ?? 0); arm(c, 'Right', W.chartPos(190, 120).add(V(0.0, 0.03, 0.0)), dirW(c, -1, -0.2, 0.4));   // weight on one hand
  const k = o.point ?? 0; if (k > 0) { const tgt = vl(W.chartPos(300, 470).setY(1.3), SJ.clone().setY(1.0), k); const sh = SR.wp(c.bone('LeftArm')); arm(c, 'Left', sh.clone().add(tgt.clone().sub(sh).normalize().multiplyScalar(0.66)), dirW(c, 1, -0.2, 0.3)); } else arm(c, 'Left', Lw(c, 0.35, 1.05, 0.25), dirW(c, 1, -0.4, 0)); }
shot(T.kais, (t) => { const u = eio(TT(t, T.kais, T.sett)); G(0.7); W.setChart({}); kaiser(t, { point: 0 }); LOOK(V(lerp(SC + 1.7, SC + 0.9, u), lerp(2.2, 1.85, u), lerp(4.6, 3.0, u)), V(SC + 0.1, lerp(1.25, 1.5, u), -0.6), lerp(38, 34, u), t); dofT(0.008); shadowR = 8; });   // smooth push-in on the Kaiser at the chart
shot(T.sett, (t) => { const u = eio(TT(t, T.sett, T.isl)); G(0.7); W.setChart({ ring: eio(TT(t, T.sett + 0.3, T.isl)) }); kaiser(t, { point: eio(TT(t, T.sett - 0.1, T.sett + 0.6)), lean: 0.2 });
  LOOK(V(lerp(SC - 0.8, SC + 0.5, u), lerp(2.4, 2.0, u), lerp(3.6, 2.6, u)), P3(V(SC, 1.3, -0.7), SJ.clone().setY(1.1), 0.5), lerp(38, 34, u), t); dofT(0.012); shadowR = 6; });   // he points straight at San Juan
shot(T.isl, (t) => { const u = eio(TT(t, T.isl, T.amr)); G(0.7); W.setChart({ ring: 1, final: eio(TT(t, T.isl, T.isl + 0.7)) }); kaiser(t, { point: 1, mood: 'serioust', nod: 0.12 * Math.sin(t * 4) });
  const hd = headC(KAISER); LOOK(V(lerp(SC + 1.9, SC + 1.2, u), lerp(1.9, 1.75, u), lerp(3.4, 2.7, u)), hd.clone().add(V(-0.1, -0.1, 0)), lerp(32, 28, u), t); dofT(0.03); shadowR = 6; });   // decisive: the line is drawn

// ---- pier: Royal Marines march aboard and wave goodbye, no weapons ----
function marching(t, t0, o = {}) { MAR.forEach((c, i) => { const col = i % 2, row = (i / 2) | 0, sp = 2.2, z = 12 - row * 1.9 - (t - t0) * sp - 12 + (o.z0 ?? 0), x = SD + (col ? 0.75 : -0.75); let X = x, Y = 0.6, Z = z, ry = Math.PI;
    if (z < -9.5) { const k = clamp((-9.5 - z) / 2.6); X = lerp(x, SD + 4.5, eio(k)); Y = lerp(0.6, 0.95, k); ry = Math.PI - 0.5 * Math.sin(k * 3.14) - k * 0.8 + 0.0; Z = Math.max(z, -12.2) - (z < -12.1 ? Math.min(0.8, -12.1 - z) * 0.5 : 0); }
    place(c, X, Z, ry, Y); SR.clipAt(c, 'walk', (t - t0) * 1.3 + i * 0.4); face(c, i % 3 === 0 ? 'grin' : 'calm');
    if (i % 2 === 0 || o.wave) { const w = Math.sin(t * 8 + i); arm(c, 'Right', Lw(c, -0.5 + 0.1 * w, 1.85, 0.05), dirW(c, -1, -0.1, -0.2)); }
    c.root.visible = z > -14.6 && z < 17; }); }
const PIERC = V(SD + 0.5, 1.3, 2.0);
shot(T.amr, (t) => { const u = eio(TT(t, T.amr, L(3))); G(0.15); marching(t, T.amr - 1.0); W.rippleAt(t);
  LOOK(V(lerp(SD - 7, SD - 5, u), lerp(2.6, 2.2, u), lerp(16, 12, u)), V(SD + 1, 1.2, lerp(-1, -5, u)), lerp(42, 38, u), t); dofT(0.003); shadowR = 18; });   // 1872: a calm bay, the Marines file along the pier
shot(L(3), (t) => { const u = eio(TT(t, L(3), 40)); G(0.15); marching(t, T.amr - 1.0, { wave: true });
  LOOK(V(lerp(SD - 4.5, SD - 2.2, u), lerp(2.0, 2.8, u), lerp(6, 0.5, u)), V(SD + 2.4, lerp(1.2, 1.5, u), -10.5), lerp(44, 38, u), t); dofT(0.003); shadowR = 18; });   // boarding the ship, waving

SHOTS.sort((a, b) => a.t0 - b.t0);

// ---------- frame ----------
const STUDYLIGHT = new THREE.PointLight('#ffb870', 0, 16, 1.4); STUDYLIGHT.position.set(SC, 4.4, 0); scene.add(STUDYLIGHT);
function resetScene() { ALL.forEach(c => { c.root.visible = false; c.root.rotation.set(0, 0, 0); c.hm.material.uniforms.base.value.copy(c.tint); }); PIG.visible = false; RIF.forEach(r => r.visible = false); rifIx = 0; W.spyglass.visible = false; W.smoke.visible = false; W.flash.visible = false; gk = 0; dofOn = null; shadowR = 9; W.setPlants(0); }
function renderShot(S, t) { t_now = t; resetScene(); S.fn(t); setLook(gradeAt()); STUDYLIGHT.intensity = gk >= 0.69 && gk <= 0.71 ? 4.5 : 0; ALL.forEach(c => SR.updateLimbs(c)); W.update(t, focus);
  const f = focus.clone(); sun.target.position.copy(f); sun.position.copy(f).addScaledVector(SUNDIR, 60); const sc = sun.shadow.camera; sc.left = sc.bottom = -shadowR; sc.right = sc.top = shadowR; sc.near = 1; sc.far = 140; sc.updateProjectionMatrix();
  post.bokeh.enabled = !!dofOn; if (dofOn) { post.bokeh.uniforms.focus.value = dofOn[0]; post.bokeh.uniforms.aperture.value = dofOn[1]; }
  U.uTime.value = t; post.render(); }
function render(t) { let i = 0; for (let k = 0; k < SHOTS.length; k++) if (t >= SHOTS[k].t0) i = k; renderShot(SHOTS[i], t); return canvas.toDataURL('image/jpeg', 0.92); }
window.DUR = Math.min(DUR, +(Q.get('dur') || 1e9)); window.frame = render; window.FL = FL; window.ready = true;
console.log('SHOT_T ' + JSON.stringify(SHOTS.map(x => +x.t0.toFixed(2))));
