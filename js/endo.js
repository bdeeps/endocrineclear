// EndocrineClear's shared models: a ghosted, clearly stylised human figure with the endocrine glands
// inside it, hormone "particles" that ride along paths, canvas boards, and the physiology numbers
// the chapters share.
//
// Orientation: we face the person (anterior view), as in an anatomy atlas, so their RIGHT is on YOUR
// LEFT. Axes: +x = the person's left, +y = up, +z = forwards (towards you). One model unit is 10 cm,
// so the adult figure is about 1.75 m tall with the feet on the floor (y = 0). The proportions match
// NervousClear's and SkeletonClear's figures so the body boxes line up.
//
// Gland placement and sizes (Gray's Anatomy, 42nd ed.; Moore, Clinically Oriented Anatomy, 8th ed.;
// Guyton & Hall, Textbook of Medical Physiology, 14th ed., ch. 75–84; Britannica "Endocrine system"):
//  - hypothalamus: floor of the brain above the pituitary, about 4 g;
//  - pituitary: pea-sized, about 0.5 g and 1 cm, in a bony cup (the sella turcica) below the
//    hypothalamus, hanging on a stalk; front lobe (anterior) makes GH, TSH, ACTH, LH, FSH and
//    prolactin; back lobe (posterior) releases ADH and oxytocin made in the hypothalamus;
//  - pineal: about 5–8 mm, 0.1–0.15 g, deep in the middle of the brain, makes melatonin at night;
//  - thyroid: a butterfly at the front of the neck below the voice box (C5–T1), lobes about 5 cm tall,
//    15–25 g; four parathyroids, rice-grain sized (about 30 mg each), on the back of its lobes;
//  - thymus: behind the breastbone, largest around puberty (about 30–35 g), then slowly replaced by fat;
//  - adrenals: a cap on top of each kidney, about 4–5 g each, cortex outside and medulla inside;
//  - pancreatic islets: about a million tiny clusters, only 1–2% of the pancreas (see PancreasClear);
//  - ovaries: about 3 × 1.5 × 1 cm, either side of the uterus; testes: about 4–5 cm, in the scrotum.
// Glands are drawn a little larger than life so they can be seen; positions are to scale.
import { THREE, M, clamp, lerp, smooth } from './kit.js';

// ---------------------------------------------------------------- colours
export const COL = {
  hypo: 0xff9fc0, pit: 0xffd166, pineal: 0xc9a7ff, thyroid: 0xff8a5c, para: 0xfff1a8, thymus: 0x9db4ff,
  adrenal: 0xffb547, islets: 0x6ee7a8, gonads: 0x8ef0ff,
  insulin: 0x6ee7a8, glucagon: 0xff7a8a, glucose: 0xffffff, adrenaline: 0xff8a5c, cortisol: 0xffd166,
  tsh: 0x8ef0ff, t4: 0xff8a5c, trh: 0xff9fc0, acth: 0x8ef0ff, crh: 0xff9fc0, gh: 0xffd166, melatonin: 0xc9a7ff,
  blood: 0xc23a48, nerve: 0xffe08a,
};
const TINT = { pink: '#ff9fc0', gold: '#ffd166', purple: '#c9a7ff', orange: '#ff8a5c', cream: '#fff1a8', blue: '#9db4ff', amber: '#ffb547', green: '#6ee7a8', cyan: '#8ef0ff', red: '#ff8a8a', side: '#8ef0ff', grey: '#aab3c5' };
export const CSS = (c) => '#' + c.toString(16).padStart(6, '0');
export function tint(l, cls) { const c = TINT[cls] || cls; if (c && l?.element) { l.element.style.borderColor = c; l.element.style.color = c; } return l; }
export function sideLabels(stage, parent, y, x, z = 1.2) {
  return [tint(stage.label('← Their right', [-x, y, z], parent), 'side'), tint(stage.label('Their left →', [x, y, z], parent), 'side')];
}
export const inReel = () => document.body.classList.contains('gb-reel');

// On a phone-width stage the readout covers the upper left: re-centre once, unless orbited.
export function fitNarrow(stage, view) {
  let done = false;
  return () => {
    const narrow = stage.host.clientWidth < 560;
    if (narrow && !done && !stage.moved && !inReel()) { stage.setView(view.pos, view.target, 0.01); done = true; }
    return narrow;
  };
}
// On phones keep only the readout's headline and two rows.
export function compactReadout(stage, api) {
  const full = api.readout;
  if (!full) return api;
  api.readout = (s) => {
    const html = full(s);
    if (stage.host.clientWidth >= 560 || !html) return html;
    let rows = 0;
    return html.replace(/<small>[\s\S]*?<\/small>/g, '').replace(/<div class="row">[\s\S]*?<\/div>/g, (m) => (++rows <= 2 ? m : ''));
  };
  return api;
}

// ---------------------------------------------------------------- canvas boards
export function board(ct, w, h) {
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
}
export function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export function panel(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(10,12,18,.88)'; rrect(g, 0, 0, w, h, 22); g.fill(); g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 2; g.stroke(); }
export const FONT = (px, w = 500) => `${w} ${px}px Geist, system-ui, sans-serif`;
export function text(g, s, x, y, px, col = '#e9edf5', w = 500, align = 'left') { g.font = FONT(px, w); g.fillStyle = col; g.textAlign = align; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); }
// Wrap text into lines that fit maxW; returns the y after the last line.
export function wrap(g, s, x, y, maxW, px, col = '#cfd6e4', lh = 1.3, w = 400) {
  g.font = FONT(px, w); g.fillStyle = col; g.textAlign = 'left';
  let line = '';
  for (const word of s.split(' ')) {
    const t = line ? line + ' ' + word : word;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += px * lh; line = word; } else line = t;
  }
  if (line) { g.fillText(line, x, y); y += px * lh; }
  return y;
}
// A line chart. series: [{ pts: [[x, y]], col, w }]; xr/yr ranges; box [x, y, w, h] on the canvas.
export function chart(g, box, xr, yr, series, o = {}) {
  const [bx, by, bw, bh] = box, fs = o.fs || 19;
  const X = (x) => bx + (o.logx ? (Math.log10(x) - Math.log10(xr[0])) / (Math.log10(xr[1]) - Math.log10(xr[0])) : (x - xr[0]) / (xr[1] - xr[0])) * bw;
  const Y = (y) => by + bh - ((y - yr[0]) / (yr[1] - yr[0])) * bh;
  g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by + bh); g.lineTo(bx + bw, by + bh); g.stroke();
  if (o.band) { g.fillStyle = o.band.col || 'rgba(110,231,168,.13)'; g.fillRect(bx, Y(o.band.hi), bw, Y(o.band.lo) - Y(o.band.hi)); }
  (o.xticks || []).forEach(([v, lab]) => { const x = X(v); g.strokeStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x, by); g.lineTo(x, by + bh); g.stroke(); text(g, lab, x, by + bh + fs + 8, fs, '#8b93a7', 400, 'center'); });
  (o.yticks || []).forEach(([v, lab]) => { const y = Y(v); g.strokeStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(bx, y); g.lineTo(bx + bw, y); g.stroke(); text(g, lab, bx - 10, y + fs * 0.35, fs - 1, '#8b93a7', 400, 'right'); });
  g.save(); g.beginPath(); g.rect(bx, by - 4, bw + 2, bh + 8); g.clip();
  series.forEach((s) => {
    if (!s.pts.length) return;
    g.strokeStyle = s.col; g.lineWidth = s.w || 4; g.lineJoin = 'round'; g.setLineDash(s.dash || []);
    g.beginPath(); s.pts.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(clamp(y, yr[0] - 1e9, yr[1] + 1e9))) : g.moveTo(X(x), Y(y)))); g.stroke();
    g.setLineDash([]);
  });
  g.restore();
  return { X, Y };
}

// ---------------------------------------------------------------- geometry helpers
export const V = (p) => (p.isVector3 ? p.clone() : new THREE.Vector3(...p));
export function pathOf(points, closed = false) {
  const Pt = points.map(V);
  if (closed) Pt.push(Pt[0].clone());
  const L = [0];
  for (let i = 1; i < Pt.length; i++) L.push(L[i - 1] + Pt[i].distanceTo(Pt[i - 1]));
  const total = Math.max(1e-6, L[L.length - 1]);
  return {
    points: Pt, total,
    at(u, out = new THREE.Vector3()) {
      const d = clamp(u, 0, 1) * total;
      let lo = 0, hi = L.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (L[m] <= d) lo = m; else hi = m; }
      const k = (d - L[lo]) / Math.max(1e-9, L[hi] - L[lo]);
      return out.copy(Pt[lo]).lerp(Pt[hi], k);
    },
  };
}
export const smoothPts = (pts, n = 60, closed = false) => new THREE.CatmullRomCurve3(pts.map(V), closed, 'centripetal').getPoints(n);
export function capsule(a, b, r, mat) {
  const A = V(a), B = V(b), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
export function blob(r, pos, mat, seg = 32) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.7)), mat);
  m.scale.set(...r); m.position.set(...pos);
  return m;
}
export function vessel(pts, r, mat, n) {
  const p = pts.length > 2 ? smoothPts(pts, n ?? pts.length * 8) : pts.map(V);
  const c = new THREE.CatmullRomCurve3(p, false, 'centripetal');
  const m = new THREE.Mesh(new THREE.TubeGeometry(c, Math.max(6, p.length * 2), r, 8, false), mat);
  m.userData.pts = p;
  return m;
}
export const glowMat = (c, ei = 0.6, op = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, emissive: c, emissiveIntensity: ei, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
export const ghostOrgan = (c, op = 0.2) => new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: op, roughness: 0.6, depthWrite: false, emissive: c, emissiveIntensity: 0.12 });
export const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------- flows: hormone "particles" on a path
// count copies of a small shape run along path; density 0..1 sets how many are visible, speed is
// model units per second. Returns { mesh, step(dt, density, speed) }.
export function flow(path, count, color, { size = 0.07, shape = 'sphere', jitter = 0.05, seed = 1 } = {}) {
  const geo = shape === 'box' ? new THREE.BoxGeometry(size * 1.6, size * 1.6, size * 1.6)
    : shape === 'tetra' ? new THREE.TetrahedronGeometry(size * 1.5)
    : shape === 'octa' ? new THREE.OctahedronGeometry(size * 1.4)
    : new THREE.SphereGeometry(size, 10, 8);
  const mesh = new THREE.InstancedMesh(geo, M.glow(color), count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const ph = Array.from({ length: count }, (_, i) => (i + rnd(i * 7 + seed) * 0.6) / count);
  const off = Array.from({ length: count }, (_, i) => [(rnd(i + seed * 3) - 0.5) * 2 * jitter, (rnd(i * 3 + seed) - 0.5) * 2 * jitter, (rnd(i * 5 + seed * 2) - 0.5) * 2 * jitter]);
  const o = new THREE.Object3D(), p = new THREE.Vector3();
  let u = 0;
  const api = {
    mesh, path,
    step(dt, density = 1, speed = 1, time = 0) {
      u = (u + (dt * speed) / path.total) % 1;
      const show = Math.round(clamp(density, 0, 1) * count);
      for (let i = 0; i < count; i++) {
        const vis = rnd(i * 13 + seed) < show / count + 1e-6 && show > 0;
        const k = (ph[i] + u) % 1;
        path.at(k, p);
        o.position.set(p.x + off[i][0], p.y + off[i][1], p.z + off[i][2]);
        o.rotation.set(time * 1.3 + i, time * 0.9 + i * 2, 0);
        const fade = Math.min(1, k * 12, (1 - k) * 12);
        o.scale.setScalar(vis ? Math.max(0.001, fade) : 0.001);
        o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
  api.step(0, 0);
  return api;
}

// ---------------------------------------------------------------- the glands
// id, name, colour, label class, where it is, what it makes, how big (sources at the top of the file).
export const GLANDS = [
  { id: 'hypo', name: 'Hypothalamus', cls: 'pink', where: 'Floor of the brain', makes: 'Releasing hormones (TRH, CRH, GnRH, GHRH) that boss the pituitary; also makes ADH and oxytocin', size: 'About 4 g, almond-sized' },
  { id: 'pit', name: 'Pituitary', cls: 'gold', where: 'Hangs below the brain on a stalk', makes: 'Growth hormone, TSH, ACTH, LH, FSH, prolactin; releases ADH and oxytocin', size: 'Pea-sized, about 0.5 g' },
  { id: 'pineal', name: 'Pineal', cls: 'purple', where: 'Deep in the middle of the brain', makes: 'Melatonin, mostly at night', size: 'About 8 mm, 0.1 g' },
  { id: 'thyroid', name: 'Thyroid', cls: 'orange', where: 'Front of the neck, below the voice box', makes: 'Thyroxine (T4) and T3, which set your metabolism; calcitonin', size: 'About 20 g, lobes 5 cm tall' },
  { id: 'para', name: 'Parathyroids', cls: 'cream', where: 'Four dots on the back of the thyroid', makes: 'Parathyroid hormone (PTH), which raises blood calcium', size: 'Rice grains, about 30 mg each' },
  { id: 'thymus', name: 'Thymus', cls: 'blue', where: 'Behind the breastbone', makes: 'Thymosins, which help train immune T cells', size: 'Biggest near puberty (about 30 g), then shrinks' },
  { id: 'adrenal', name: 'Adrenals', cls: 'amber', where: 'A cap on top of each kidney', makes: 'Cortisol and aldosterone (outer cortex); adrenaline (inner medulla)', size: 'About 4–5 g each' },
  { id: 'islets', name: 'Pancreatic islets', cls: 'green', where: 'Scattered through the pancreas', makes: 'Insulin and glucagon, which steer blood sugar', size: 'About a million islets: 1–2% of the pancreas' },
  { id: 'gonads', name: 'Ovaries or testes', cls: 'cyan', where: 'Low in the belly (ovaries) or in the scrotum (testes)', makes: 'Oestrogen and progesterone (ovaries); testosterone (testes)', size: 'Ovaries about 3 cm; testes about 4–5 cm' },
];
export const GL = Object.fromEntries(GLANDS.map((g) => [g.id, g]));

// Where each gland sits (model units, figure standing at the origin).
export const POS = {
  hypo: [0, 16.28, 0.12], pit: [0, 16.04, 0.2], pineal: [0, 16.42, -0.3],
  thyroid: [0, 14.95, 0.24], thymus: [0, 13.9, 0.42],
  adrenalL: [0.8, 11.42, -0.46], adrenalR: [-0.8, 11.32, -0.46], kidneyL: [0.8, 10.95, -0.5], kidneyR: [-0.8, 10.85, -0.5],
  pancreas: [0.2, 11.0, -0.05], ovaryL: [0.6, 9.25, 0.05], ovaryR: [-0.6, 9.25, 0.05], testisL: [0.14, 8.08, 0.38], testisR: [-0.14, 8.08, 0.38],
  heart: [0.25, 12.55, 0.35], liver: [-0.55, 11.55, 0.25], stomach: [0.6, 11.4, 0.3], brain: [0, 16.72, 0.03], gut: [0.1, 10.1, 0.38],
  thigh: [0.9, 6.5, 0.1], hand: [2.56, 8.72, 0.08],
};

// ---------------------------------------------------------------- the figure
// Built from capsules and lathe shapes. The head and body are separate groups so growth can scale
// them differently (a baby's head is about a quarter of its length, an adult's about an eighth).
export const NECK_Y = 15.45;                    // base of the skull
function makeFigure(mat) {
  const body = new THREE.Group(), head = new THREE.Group();
  head.position.y = NECK_Y;
  head.add(blob([0.78, 1.0, 0.88], [0, 16.45 - NECK_Y, 0.05], mat));
  body.add(capsule([0, 14.9, -0.02], [0, 15.55, 0.0], 0.38, mat));
  const prof = [[15.1, 0.02], [15.0, 0.55], [14.75, 1.45], [14.35, 1.8], [13.6, 1.72], [12.4, 1.55], [11.3, 1.32], [10.4, 1.35], [9.6, 1.55], [9.0, 1.5], [8.55, 1.05], [8.4, 0.02]];
  const torsoG = new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(r, y)), 48);
  torsoG.scale(1, 1, 0.6); torsoG.computeVertexNormals();
  body.add(new THREE.Mesh(torsoG, mat));
  for (const sx of [1, -1]) {
    body.add(capsule([sx * 1.85, 14.35, 0], [sx * 2.2, 11.8, 0.05], 0.36, mat));
    body.add(capsule([sx * 2.2, 11.8, 0.05], [sx * 2.45, 9.45, 0.1], 0.29, mat));
    body.add(blob([0.24, 0.48, 0.13], [sx * 2.56, 8.72, 0.08], mat));
    body.add(capsule([sx * 0.78, 9.0, 0], [sx * 0.95, 4.8, 0], 0.6, mat));
    body.add(capsule([sx * 0.95, 4.8, 0], [sx * 0.97, 0.75, -0.05], 0.44, mat));
    body.add(blob([0.34, 0.2, 0.62], [sx * 1.0, 0.24, 0.35], mat));
  }
  return { body, head };
}

// ---------------------------------------------------------------- the whole body with its glands
// Options: labels (gland labels), others (ghost organs that also make hormones), organs (ghost liver,
// stomach, heart, kidneys for the sugar chapter), sex ('f' shows ovaries, 'm' shows testes).
export function makeBody(stage, opts = {}) {
  const o = { labels: true, others: false, organs: true, sex: 'f', ...opts };
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a47e, transparent: true, opacity: 0.12, roughness: 0.65, depthWrite: false, side: THREE.DoubleSide });
  const fig = makeFigure(skinMat);
  root.add(fig.body, fig.head);
  const H = (p) => [p[0], p[1] - NECK_Y, p[2]];                 // head-local position

  // ghost brain and organs for context
  const brainMat = ghostOrgan(0xf0b9c8, 0.16);
  const brain = new THREE.Group();
  [1, -1].forEach((sx) => brain.add(blob([0.36, 0.5, 0.74], H([sx * 0.33, 16.74, 0.03]), brainMat, 28)));
  brain.add(blob([0.4, 0.2, 0.28], H([0, 16.12, -0.42]), brainMat, 20));
  fig.head.add(brain);
  const organ = {};
  const og = new THREE.Group(); fig.body.add(og);
  if (o.organs) {
    organ.kidneyL = blob([0.28, 0.5, 0.22], POS.kidneyL, ghostOrgan(0xb04a5a, 0.3)); organ.kidneyR = blob([0.28, 0.5, 0.22], POS.kidneyR, ghostOrgan(0xb04a5a, 0.3));
    organ.kidneyL.rotation.z = -0.2; organ.kidneyR.rotation.z = 0.2;
    organ.liver = blob([0.95, 0.5, 0.55], POS.liver, ghostOrgan(0x8a3a30, 0.22)); organ.liver.rotation.z = 0.25;
    organ.stomach = blob([0.5, 0.36, 0.3], POS.stomach, ghostOrgan(0xe8a08a, 0.16)); organ.stomach.rotation.z = -0.5;
    organ.heart = blob([0.4, 0.55, 0.36], POS.heart, ghostOrgan(0xc23a48, 0.3)); organ.heart.rotation.z = 0.7;
    Object.values(organ).forEach((m) => og.add(m));
  }

  // ---- the glands (each a group, so explode can move them and pick can find them)
  const G = {}, mats = {}, meshes = [];
  const add = (id, parent, ...objs) => {
    if (!G[id]) { G[id] = new THREE.Group(); parent.add(G[id]); mats[id] = glowMat(COL[id], 0.55); }
    objs.forEach((m) => {
      if (!m.userData.keepMat) m.material = mats[id];
      m.geometry.computeBoundingBox();
      const c = m.geometry.boundingBox.getCenter(new THREE.Vector3());
      if (m.position.lengthSq() < 1e-9 && c.lengthSq() > 1e-6) { m.geometry.translate(-c.x, -c.y, -c.z); m.position.copy(c); }
      m.userData.gland = id; G[id].add(m); meshes.push(m);
    });
    return G[id];
  };
  const S = (r, p) => blob(r, p, null, 24);
  // head glands live in the head group
  add('hypo', fig.head, S([0.15, 0.1, 0.16], H(POS.hypo)));
  const stalk = capsule(H([0, 16.2, 0.15]), H([0, 16.08, 0.19]), 0.025, null); add('pit', fig.head, stalk, S([0.1, 0.08, 0.1], H(POS.pit)));
  add('pineal', fig.head, S([0.05, 0.07, 0.05], H(POS.pineal)));
  // neck and chest
  const lobes = [1, -1].map((sx) => { const m = S([0.11, 0.26, 0.1], [sx * 0.17, POS.thyroid[1], POS.thyroid[2]]); m.rotation.z = sx * 0.18; return m; });
  add('thyroid', fig.body, ...lobes, capsule([-0.14, 14.86, 0.3], [0.14, 14.86, 0.3], 0.05, null));
  add('para', fig.body, ...[[1, 15.05], [-1, 15.05], [1, 14.82], [-1, 14.82]].map(([sx, y]) => S([0.045, 0.045, 0.045], [sx * 0.2, y, 0.12])));
  add('thymus', fig.body, ...[1, -1].map((sx) => { const m = S([0.17, 0.36, 0.1], [sx * 0.12, POS.thymus[1], POS.thymus[2]]); m.rotation.z = -sx * 0.12; return m; }));
  // adrenals: flattened caps on the kidneys
  const cap = (p, sx) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 3), null); m.position.set(...p); m.scale.set(1, 1, 0.55); m.rotation.z = -sx * 0.25; return m; };
  add('adrenal', fig.body, cap(POS.adrenalL, 1), cap(POS.adrenalR, -1));
  // pancreas: head near the duodenum on the person's right, tail up towards the spleen on their left
  const pancMat = ghostOrgan(0xf2d27a, 0.45);
  const panc = vessel([[-0.45, 10.9, 0.12], [-0.1, 10.98, 0.05], [0.35, 11.08, -0.08], [0.85, 11.25, -0.25]], 0.13, pancMat, 30);
  panc.userData.keepMat = true;
  const islets = [];
  for (let i = 0; i < 14; i++) { const k = i / 13, p = pathOf(panc.userData.pts).at(k); islets.push(S([0.04, 0.04, 0.04], [p.x + (rnd(i) - 0.5) * 0.12, p.y + (rnd(i + 9) - 0.5) * 0.12, p.z + 0.1])); }
  add('islets', fig.body, panc, ...islets);
  // gonads: ovaries (with a faint uterus for context) or testes
  const uterus = blob([0.3, 0.35, 0.22], [0, 9.2, 0.18], ghostOrgan(0xf2a7b6, 0.2)); uterus.userData.keepMat = true;
  const ovaries = [S([0.16, 0.1, 0.1], POS.ovaryL), S([0.16, 0.1, 0.1], POS.ovaryR), uterus];
  const testes = [S([0.12, 0.17, 0.12], POS.testisL), S([0.12, 0.17, 0.12], POS.testisR)];
  add('gonads', fig.body, ...ovaries, ...testes);
  const setSex = (sx) => { ovaries.forEach((m) => { m.visible = sx === 'f'; }); testes.forEach((m) => { m.visible = sx === 'm'; }); };
  setSex(o.sex);

  // ---- other organs that also make hormones (faint, labelled)
  const others = new THREE.Group(); fig.body.add(others);

  // ---- labels
  const labels = [], labelOf = {};
  const L = (html, pos, parent, cls) => { const l = tint(stage.label(html, pos, parent), cls); labels.push(l); return l; };
  if (o.labels) {
    labelOf.pineal = L('Pineal: melatonin', H([2.0, 17.35, -0.3]), G.pineal, 'purple');
    labelOf.hypo = L('Hypothalamus', H([1.9, 16.75, 0.1]), G.hypo, 'pink');
    labelOf.pit = L('Pituitary: master gland', H([2.2, 16.1, 0.2]), G.pit, 'gold');
    labelOf.para = L('Parathyroids (behind)', [2.2, 15.35, 0.1], G.para, 'cream');
    labelOf.thyroid = L('Thyroid', [1.7, 14.7, 0.3], G.thyroid, 'orange');
    labelOf.thymus = L('Thymus', [1.5, 13.6, 0.4], G.thymus, 'blue');
    labelOf.adrenal = L('Adrenals, on the kidneys', [2.4, 11.9, -0.4], G.adrenal, 'amber');
    labelOf.islets = L('Islets in the pancreas', [-2.6, 10.8, 0.2], G.islets, 'green');
    labelOf.gonads = L(o.sex === 'm' ? 'Testes' : 'Ovaries', [2.0, 8.9, 0.2], G.gonads, 'cyan');
  }
  const otherLabels = [];
  if (o.others) {
    const OL = (html, pos) => { const l = tint(stage.label(html, pos, others), 'grey'); otherLabels.push(l); return l; };
    OL('Heart: ANP', [2.6, 12.6, 0.3]); OL('Kidneys: EPO, renin (KidneyClear)', [-3.0, 11.9, -0.5]);
    OL('Gut: gastrin, ghrelin', [2.5, 10.35, 0.3]); OL('Skin: vitamin D (SkinClear)', [-3.0, 7.4, 0.2]); OL('Fat: leptin', [2.5, 9.7, 0.2]);
  }

  // Explode: the glands are pulled forwards out of the body and shown twice as big, a little spread
  // apart sideways; the body fades behind them.
  meshes.forEach((m) => { m.userData.home = m.position.clone(); m.userData.s0 = m.scale.clone(); });
  const api = {
    root, fig, G, mats, meshes, organ, others, labels, labelOf, otherLabels, skinMat, brainMat, islets, setSex,
    setXray(k) { skinMat.opacity = lerp(0.55, 0.12, k); brainMat.opacity = lerp(0.03, 0.16, k); Object.values(organ).forEach((m) => { m.visible = k > 0.25; }); },
    setExplode(k) {
      const e = smooth(k);
      for (const id in G) G[id].position.set(0, 0, 1.8 * e);
      meshes.forEach((m) => {
        const h = m.userData.home, big = 1 + 0.9 * e;
        m.position.set(h.x * (1 + 0.6 * e), h.y, h.z);
        m.scale.copy(m.userData.s0).multiplyScalar(big);
      });
      og.visible = e < 0.5;
      brain.visible = e < 0.5;
    },
    glow(id, v) { if (mats[id]) mats[id].emissiveIntensity = v; },
    showLabels(on) { labels.forEach((l) => { l.visible = on; }); },
    showOthers(on) { others.visible = on; otherLabels.forEach((l) => { l.visible = on; }); },
    // Age scaling for the growth chapter: total height in cm and the head's share of it.
    setSize(heightCm, headFrac) {
      const adult = 175.5, adultHead = 0.125;
      const sB = (heightCm * (1 - headFrac)) / (adult * (1 - adultHead)), sH = (heightCm * headFrac) / (adult * adultHead);
      fig.body.scale.setScalar(sB);
      fig.head.scale.setScalar(sH);
      fig.head.position.y = NECK_Y * sB;
      return { sB, sH };
    },
  };
  api.setExplode(0); api.setXray(1); api.showOthers(false);
  return api;
}

// ---------------------------------------------------------------- shared physiology numbers
// How fast messages travel and how long they last (Guyton & Hall 14th ed., ch. 75; half-lives from
// Greenspan's Basic & Clinical Endocrinology, 10th ed., and the Endocrine Society's Hormone Health
// Network). Times in seconds: [starts acting, effect lasts].
export const TIMES = [
  { k: 'Nerve signal', a: 0.002, b: 0.02, col: '#ffe08a', note: 'a few milliseconds' },
  { k: 'Adrenaline', a: 2, b: 300, col: '#ff8a5c', note: 'seconds; half-life about 2 min' },
  { k: 'Insulin', a: 60, b: 3600, col: '#6ee7a8', note: 'minutes; half-life about 5 min' },
  { k: 'Cortisol', a: 900, b: 6 * 3600, col: '#ffd166', note: 'tens of minutes; half-life about 1–1.5 h' },
  { k: 'Thyroxine (T4)', a: 86400, b: 30 * 86400, col: '#ff8a5c', note: 'days; half-life about 7 days' },
  { k: 'Growth hormone → height', a: 30 * 86400, b: 3.15e8, col: '#c9a7ff', note: 'months to years' },
];
// Blood circulation (Guyton & Hall ch. 15, 20): about 5 L of blood, pumped at about 5 L a minute at
// rest, so a full lap takes about a minute; blood from a vein in one place reaches the far arteries
// in about 10–20 s (the classic arm-to-tongue circulation time is about 9–16 s).
export const BLOOD = { volumeL: 5, outputLmin: 5, lapS: 60, reachS: 15 };
// Nerve speed for the race: a fast motor or touch fibre, about 60 m/s (see NervousClear).
export const NERVE_MS = 60;

// ---------------------------------------------------------------- the thyroid loop at rest
// Steady state of the chapter 3 loop for a gland of a given strength (1 = normal): returns T4 and TSH
// relative to normal. R = 1 + (1 − H), P = R·e^{5(1 − H)}, H = strength·P (see control.js).
export function thyroidSteady(strength) {
  let lo = 0.01, hi = 3;
  const f = (H) => strength * Math.max(0.02, 1 + (1 - H)) * Math.exp(5 * (1 - H)) - H;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  const H = (lo + hi) / 2;
  return { T4: H, TSH: H / Math.max(1e-3, strength) };
}

// ---------------------------------------------------------------- growth
// Median height (cm) by age: WHO Child Growth Standards (2006) to 5 years, then the WHO Growth
// Reference 2007 (5–19 years). Indian Academy of Paediatrics 2015 charts for Indian children are
// close to these medians after age 5 (Khadilkar et al., Indian Pediatr 52:47, 2015).
export const HEIGHT = {
  m: [[0, 49.9], [1, 75.7], [2, 87.8], [3, 96.1], [4, 103.3], [5, 110.0], [6, 116.0], [7, 121.7], [8, 127.3], [9, 132.6], [10, 137.8], [11, 143.1], [12, 149.1], [13, 156.0], [14, 163.2], [15, 169.0], [16, 172.9], [17, 175.2], [18, 176.1], [19, 176.5], [20, 176.6]],
  f: [[0, 49.1], [1, 74.0], [2, 86.4], [3, 95.1], [4, 102.7], [5, 109.4], [6, 115.1], [7, 120.8], [8, 126.6], [9, 132.5], [10, 138.6], [11, 145.0], [12, 151.2], [13, 156.4], [14, 159.8], [15, 161.7], [16, 162.5], [17, 162.9], [18, 163.1], [19, 163.2], [20, 163.2]],
};
export function interp(tab, x) {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const [x0, y0] = tab[i - 1], [x1, y1] = tab[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  return tab[tab.length - 1][1];
}
export const heightAt = (sex, age) => interp(HEIGHT[sex], age);
export const growthRate = (sex, age) => (heightAt(sex, Math.min(20, age + 0.5)) - heightAt(sex, Math.max(0, age - 0.5)));
// The head's share of body length: about 1/4 at birth, 1/5 at 2, 1/6 at 6, 1/7 at 12 and 1/8 in adults
// (the classic proportion chart, e.g. Gray's Anatomy; Moore, The Developing Human).
export const headFrac = (age) => interp([[0, 0.25], [2, 0.2], [6, 0.167], [12, 0.143], [18, 0.125]], age);
