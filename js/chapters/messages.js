// Chapter 2: messages in the blood. A gland drips hormone into a blood vessel; the blood carries it
// past four kinds of cell. Every cell meets every hormone, but only cells with the matching receptor
// (the lock for that key) respond. A board compares hormones with nerves.
// Receptors (Guyton & Hall 14th ed., ch. 75; Alberts, Molecular Biology of the Cell, 6th ed., ch. 15):
//  - TSH receptors: thyroid follicle cells. ACTH (MC2) receptors: adrenal cortex cells.
//  - Adrenaline: beta-1 receptors on heart muscle (faster, stronger beats); beta-2 and alpha-1
//    receptors on liver cells (break down glycogen, release glucose).
//  - Thyroid hormone (T4 is converted to the active T3) crosses the membrane and binds receptors in
//    the nucleus of almost every cell, which is why it changes the pace of the whole body.
// Receptor filling: at concentration C a receptor with dissociation constant Kd is occupied a
// fraction C / (C + Kd) of the time (the law of mass action). Here the slider sets C in units of Kd.
// Circulation and timing: see BLOOD and TIMES in endo.js. Nerve race: 1.7 m at about 60 m/s ≈ 28 ms;
// a hormone released into a vein takes roughly 10–20 s to reach the arteries of the feet.
import { THREE, M, clamp, lerp, canvasTexture } from '../kit.js';
import { tint, fitNarrow, compactReadout, inReel, board, panel, text, wrap, rrect, blob, rnd, TIMES, BLOOD, NERVE_MS, COL, CSS } from '../endo.js';

const HORM = {
  tsh: { name: 'TSH', long: 'Thyroid-stimulating hormone', from: 'the pituitary', shape: 'box', col: COL.tsh, fits: ['thyroid'], starts: 'minutes to hours', lasts: 'hours' },
  acth: { name: 'ACTH', long: 'Adrenocorticotropic hormone', from: 'the pituitary', shape: 'octa', col: 0xc9a7ff, fits: ['adrenal'], starts: 'minutes', lasts: 'about an hour' },
  adrenaline: { name: 'Adrenaline', long: 'Adrenaline (epinephrine)', from: 'the adrenal glands', shape: 'tetra', col: COL.adrenaline, fits: ['heart', 'liver'], starts: 'seconds', lasts: 'a few minutes' },
  t4: { name: 'Thyroxine', long: 'Thyroxine (T4, made active as T3)', from: 'the thyroid', shape: 'ico', col: 0xffd166, fits: ['thyroid', 'adrenal', 'heart', 'liver'], starts: 'hours to days', lasts: 'about a week' },
};
const CELLS = [
  { id: 'thyroid', name: 'Thyroid cell', short: 'Thyroid cell', col: 0xff8a5c, does: { tsh: 'makes thyroxine', t4: 'burns fuel faster' } },
  { id: 'adrenal', name: 'Adrenal cortex cell', short: 'Adrenal cell', col: 0xffb547, does: { acth: 'makes cortisol', t4: 'burns fuel faster' } },
  { id: 'heart', name: 'Heart muscle cell', short: 'Heart cell', col: 0xff7a8a, does: { adrenaline: 'beats harder', t4: 'beats faster' } },
  { id: 'liver', name: 'Liver cell', short: 'Liver cell', col: 0xc07a5a, does: { adrenaline: 'releases glucose', t4: 'burns fuel faster' } },
];
const surfaceOf = (cellId) => Object.keys(HORM).filter((h) => h !== 't4' && HORM[h].fits.includes(cellId));
const geoOf = (shape, r) => (shape === 'box' ? new THREE.BoxGeometry(r * 1.5, r * 1.5, r * 1.5) : shape === 'octa' ? new THREE.OctahedronGeometry(r * 1.3) : shape === 'tetra' ? new THREE.TetrahedronGeometry(r * 1.5) : new THREE.IcosahedronGeometry(r * 1.1));
const occ = (c) => c / (c + 1);

function drawBoard(g, w, h, st = {}) {
  panel(g, w, h);
  text(g, 'Nerves vs hormones', 34, 52, 36, '#fff', 600);
  text(g, 'Nerve', 330, 100, 28, '#ffe08a', 600); text(g, 'Hormone', 680, 100, 28, '#8ef0ff', 600);
  const rows = [['Message', 'pulse in a wire', 'chemical in blood'], ['Speed', 'up to 120 m/s', 'blood: a lap a minute'], ['Reaches', 'one target', 'every cell'], ['Lasts', 'milliseconds', 'minutes to weeks']];
  rows.forEach((r, i) => {
    const y = 142 + i * 40;
    if (i % 2 === 0) { g.fillStyle = 'rgba(255,255,255,.045)'; g.fillRect(24, y - 28, w - 48, 40); }
    text(g, r[0], 36, y, 26, '#8b93a7', 500); text(g, r[1], 330, y, 26, '#ffe08a', 400); text(g, r[2], 680, y, 26, '#8ef0ff', 400);
  });
  const bx = 330, bw = w - 370;
  // the race
  const ry = 326, tr = st.raceT ?? 0, nerveT = 1.7 / NERVE_MS, horm = BLOOD.reachS;
  text(g, st.race ? 'Race, head to toe, in real time' : 'Press “Race” to send both from head to toe', 36, ry - 8, 24, '#cfd6e4', 500);
  [[`Nerve ${st.race ? (Math.min(tr, nerveT) * 1000).toFixed(0) + ' ms' : ''}`, clamp(tr / nerveT, 0, 1), '#ffe08a'], [`Hormone ${st.race ? Math.min(tr, horm).toFixed(1) + ' s' : ''}`, clamp(tr / horm, 0, 1), '#8ef0ff']].forEach(([l, k, c], i) => {
    const y = ry + 8 + i * 32;
    g.fillStyle = 'rgba(255,255,255,.08)'; rrect(g, bx, y, bw, 22, 10); g.fill();
    if (st.race) { g.fillStyle = c; rrect(g, bx, y, Math.max(20, bw * k), 22, 10); g.fill(); }
    text(g, l, 36, y + 20, 24, c, 500);
  });
  // time scale: log bars from "starts acting" to "effect lasts"
  const by = 436, lo = -3, hi = 8.5, rh = 31;
  const X = (s) => bx + ((Math.log10(s) - lo) / (hi - lo)) * bw;
  text(g, 'From starting to act, to wearing off', 36, by - 8, 24, '#cfd6e4', 500);
  [[0.001, '1 ms'], [1, '1 s'], [3600, '1 h'], [86400 * 7, '1 wk'], [3.15e7, '1 yr']].forEach(([v, l]) => { const x = X(v); g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, by + 4); g.lineTo(x, by + TIMES.length * rh + 8); g.stroke(); text(g, l, x, by + TIMES.length * rh + 34, 22, '#8b93a7', 400, 'center'); });
  TIMES.forEach((m, i) => {
    const y = by + 8 + i * rh;
    text(g, m.k.replace(' → height', ''), 36, y + 20, 23, m.col, 500);
    g.fillStyle = m.col; g.globalAlpha = 0.85; rrect(g, X(m.a), y + 3, Math.max(10, X(m.b) - X(m.a)), 22, 10); g.fill(); g.globalAlpha = 1;
  });
}

export default {
  id: 'messages',
  short: 'Messages in the blood',
  title: 'A message for anyone with the right lock',
  subtitle: 'Hormones reach every cell, but only cells with the matching receptor listen.',
  view: { pos: [1.5, -0.8, 14], target: [1.5, -1.2, 0] },
  learn: `<p>A gland releases its hormone into the <b>blood</b>, and the heart pumps it all round the body in about a <b>minute</b>. So a hormone reaches <b>every</b> cell. Why doesn't every cell react?</p>
    <p>Because each hormone is like a <b>key</b>, and only cells with the matching <b>lock</b> respond. The lock is a protein called a <b>receptor</b>. <b>TSH</b> from the pituitary fits receptors found on <b>thyroid</b> cells, so it only wakes up the thyroid. <b>ACTH</b> only fits the <b>adrenal</b> glands. <b>Adrenaline</b> fits receptors on the <b>heart</b> (beat faster) and the <b>liver</b> (release sugar).</p>
    <p><b>Thyroxine</b> is different: it slips <b>inside</b> cells and fits receptors in the nucleus of almost every cell, so it changes the pace of your whole body. Steroid hormones like cortisol also work from inside the cell.</p>
    <p>The more hormone in the blood, the more receptors are filled and the stronger the response. When the level drops, the keys fall out and the cell calms down.</p>
    <p>Compare that with <b>nerves</b> (see NervousClear): a nerve is a private wire to one target, and its message arrives in <b>milliseconds</b>. Hormones are more like a <b>radio broadcast</b>: slower (seconds to days), but they reach the whole body and can last for hours, weeks or years.</p>
    <p class="tip"><b>Try it:</b> switch between the four hormones and watch which cells light up. Then press "Race" to send a nerve signal and a hormone from your head to your toe.</p>`,
  terms: [
    { t: 'Receptor', d: 'A protein on or inside a cell that a particular hormone fits, like a lock for one key.' },
    { t: 'Target cell', d: 'A cell that has the receptor for a hormone, so it responds to it.' },
    { t: 'TSH', d: 'Thyroid-stimulating hormone: a pituitary hormone that tells the thyroid to work.' },
    { t: 'ACTH', d: 'A pituitary hormone that tells the adrenal glands to make cortisol.' },
    { t: 'Thyroxine (T4)', d: 'The main thyroid hormone. Cells turn it into the more active T3.' },
    { t: 'Half-life', d: 'How long it takes the body to clear half of a hormone from the blood.' },
  ],
  defaults: { horm: 'tsh', amount: 1, labels: true, board: true, raceT: -1 },
  controls: [
    { key: 'horm', type: 'seg', label: 'Hormone', options: Object.entries(HORM).map(([v, h]) => ({ v, label: h.name })), fmt: (v) => 'from ' + HORM[v].from },
    { key: 'amount', type: 'range', label: 'Level in the blood', min: 0.1, max: 5, step: 0.05, ends: ['a trickle', 'a flood'], fmt: (v) => Math.round(occ(v) * 100) + '% of receptors filled' },
    { key: 'go', type: 'buttons', label: 'Nerve vs hormone', items: [{ label: 'Race: head to toe', act: (s) => { s.raceT = 0; s.board = true; } }] },
    { key: 'board', type: 'toggle', label: 'Comparison board' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'TSH travels through all of your blood. Why does only the thyroid respond?', options: ['Only thyroid cells have TSH receptors', 'TSH is too big for other cells', 'The blood only goes to the thyroid', 'Other cells are asleep'], answer: 0, why: 'A hormone only acts on cells that have its receptor. TSH receptors are on thyroid cells.' },
    { q: 'Which usually works faster?', options: ['A hormone', 'A nerve signal', 'They are always the same', 'Neither works in under a day'], answer: 1, why: 'Nerve signals arrive in milliseconds. Hormones take seconds (adrenaline) to days (thyroxine).' },
    { q: 'Why does thyroxine affect almost the whole body?', options: ['It travels along nerves', 'Almost every cell has thyroid hormone receptors', 'It is made in every cell', 'It stays in the neck'], answer: 1, why: 'Thyroid hormone enters cells and binds receptors in the nucleus of almost every cell, changing how fast they use fuel.' },
  ],
  reel: [
    { ms: 5200, caption: 'A hormone reaches every cell, but only cells with the right receptor respond, like a key and its lock.', set: { horm: 'tsh', amount: 1.5, labels: false, board: false, raceT: -1 }, view: { pos: [1.4, 2.2, 11.5], target: [1.4, 1.6, 0] }, spin: 0 },
    { ms: 5200, caption: 'Adrenaline fits the heart and liver: nerves take milliseconds, hormones seconds to days.', set: { horm: 'adrenaline', amount: 2, labels: false, board: true, raceT: -1 }, view: { pos: [1.5, -1.0, 15], target: [1.5, -1.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const VY = 3.2, X0 = 0.6, X1 = 6.8;
    // the blood vessel (cut open at the front) with red cells
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, X1 - X0, 40, 1, true, Math.PI * 0.25, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0xc23a48, transparent: true, opacity: 0.35, roughness: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    wall.rotation.z = Math.PI / 2; wall.position.set((X0 + X1) / 2, VY, 0); root.add(wall);
    const NR = 40, rbc = new THREE.InstancedMesh(new THREE.TorusGeometry(0.16, 0.08, 8, 16), M.matte(0xb3263a), NR); rbc.instanceMatrix.setUsage(THREE.DynamicDrawUsage); root.add(rbc);
    // the source gland at the left end
    const gland = blob([0.55, 0.5, 0.5], [X1 + 0.5, VY + 0.1, 0], new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffd166, emissiveIntensity: 0.5, roughness: 0.4 }));
    root.add(gland);
    // cells, with surface receptor sockets (hollow outlines) and a nucleus with thyroid receptors
    const cellX = [-3.75, -1.25, 1.25, 3.75], CY = 0.3;
    const trigX = cellX.map((_, i) => X0 + ((i + 0.5) * (X1 - X0)) / 4);
    const cells = CELLS.map((c, i) => {
      const g = new THREE.Group(); g.position.set(cellX[i], CY, 0); root.add(g);
      const mat = new THREE.MeshStandardMaterial({ color: c.col, transparent: true, opacity: 0.35, roughness: 0.5, emissive: c.col, emissiveIntensity: 0.1, depthWrite: false });
      const shell = blob([1.0, 0.8, 0.8], [0, 0, 0], mat); g.add(shell);
      const nuc = blob([0.32, 0.3, 0.3], [0, -0.15, 0], new THREE.MeshStandardMaterial({ color: 0x5a4a8a, emissive: 0x5a4a8a, emissiveIntensity: 0.3 })); g.add(nuc);
      const sockets = {};
      surfaceOf(c.id).forEach((h, k, arr) => {
        const s = new THREE.Mesh(geoOf(HORM[h].shape, 0.16), new THREE.MeshBasicMaterial({ color: HORM[h].col, wireframe: true, transparent: true, opacity: 0.9 }));
        s.position.set((k - (arr.length - 1) / 2) * 0.55, 0.82, 0.1); s.scale.setScalar(1.25); g.add(s); sockets[h] = s;
      });
      const nsock = new THREE.Mesh(geoOf('ico', 0.16), new THREE.MeshBasicMaterial({ color: HORM.t4.col, wireframe: true, transparent: true, opacity: 0.6 }));
      nsock.position.set(0, 0.2, 0.22); nsock.scale.setScalar(1.2); g.add(nsock); sockets.t4 = nsock;
      const lab = tint(stage.label(c.name, [0, -1.3, 0.3], g), 'grey');
      return { ...c, g, mat, shell, sockets, lab, level: 0 };
    });
    // hormone keys: a pool of particles for each hormone shape
    const NP = 36, keys = {};
    Object.entries(HORM).forEach(([h, d]) => {
      const m = new THREE.InstancedMesh(geoOf(d.shape, 0.16), M.glow(d.col), NP); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; root.add(m);
      keys[h] = { mesh: m, p: Array.from({ length: NP }, (_, i) => ({ x: X1 - ((X1 - X0) * i) / NP, y: VY + (rnd(i) - 0.5), z: (rnd(i + 3) - 0.5) * 0.8, st: 'flow', cell: -1, tt: 0, live: rnd(i + 7) })) };
    });
    // the comparison board
    const ct = canvasTexture(1024, 680, drawBoard);
    const bd = board(ct, 8.4, 5.58); bd.position.set(1.5, -4.5, 0); root.add(bd);
    const gl = tint(stage.label('', [X1 - 0.6, VY + 1.25, 0], root), 'gold');
    const bloodL = tint(stage.label('← Blood flow', [2.2, VY + 1.1, 0.2], root), 'red');

    const o = new THREE.Object3D();
    let t = 0, lastH = '', raceDrawn = -2;
    const fit = fitNarrow(stage, { pos: [1.5, 2.2, 15], target: [1.5, 1.6, 0] });
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt); t += dt;
        const H = HORM[s.horm], narrow = fit();
        if (lastH !== s.horm) { lastH = s.horm; gland.material.color.set(H.col); gland.material.emissive.set(H.col); gl.element.textContent = 'Gland: ' + H.from; tint(gl, CSS(H.col)); }
        gland.scale.setScalar(1 + 0.04 * Math.sin(t * 3));
        // red cells drift along the vessel
        for (let i = 0; i < NR; i++) {
          const x = X1 - ((((i / NR) + t * 0.16 + rnd(i) * 0.02) % 1) * (X1 - X0));
          o.position.set(x, VY + (rnd(i + 1) - 0.5) * 1.1, (rnd(i + 2) - 0.5) * 1.0); o.rotation.set(t + i, i, t * 0.5); o.scale.setScalar(1); o.updateMatrix(); rbc.setMatrixAt(i, o.matrix);
        }
        rbc.instanceMatrix.needsUpdate = true;
        // hormone keys: the level sets how many are in the blood
        const frac = clamp(0.12 + 0.18 * s.amount, 0, 1), docked = [0, 0, 0, 0];
        Object.entries(keys).forEach(([h, K]) => {
          const on = h === s.horm;
          K.p.forEach((p, i) => {
            const vis = on && p.live < frac;
            if (p.st === 'flow') {
              p.x -= dt * 1.6;
              if (p.x < X0) { p.x = X1; p.y = VY + (rnd(i + t) - 0.5) * 0.9; p.cell = -1; }
              // passing a branch to a cell: sometimes leave the vessel to try its lock
              const ci = trigX.findIndex((cx) => Math.abs(p.x - cx) < 0.05);
              if (ci >= 0 && p.cell !== ci && rnd(i * 3 + Math.floor(t * 7)) < 0.35) { p.cell = ci; p.st = 'try'; p.tt = 0; p.from = [p.x, p.y, p.z]; }
            } else if (p.st === 'try' || p.st === 'dock' || p.st === 'back') {
              const c = cells[p.cell], fits = H.fits.includes(c.id) && on, sock = c.sockets[h] || c.sockets.t4;
              const tp = new THREE.Vector3(); sock.getWorldPosition(tp); root.worldToLocal(tp);
              const near = new THREE.Vector3(tp.x, CY + 1.25, tp.z + 0.2);
              p.tt += dt;
              if (p.st === 'try') {
                const k = Math.min(1, p.tt / 0.8);
                p.x = lerp(p.from[0], near.x, k); p.y = lerp(p.from[1], near.y, k); p.z = lerp(p.from[2], near.z, k);
                if (k >= 1) { p.st = fits ? 'dock' : 'back'; p.tt = 0; }
              } else if (p.st === 'dock') {
                const k = Math.min(1, p.tt / 0.5);
                p.x = lerp(near.x, tp.x, k); p.y = lerp(near.y, tp.y, k); p.z = lerp(near.z, tp.z, k);
                if (vis) docked[p.cell]++;
                if (p.tt > 2.2) { p.st = 'flow'; p.x = X1 + rnd(i) * 2; p.y = VY; }
              } else {
                const k = Math.min(1, p.tt / 0.7);
                const bx = trigX[p.cell] - 0.3;
                p.y = lerp(near.y, VY, k); p.x = lerp(near.x, bx, k);
                if (k >= 1) p.st = 'flow';
              }
            }
            o.position.set(p.x, p.y, p.z); o.rotation.set(t * 1.5 + i, t + i * 2, 0); o.scale.setScalar(vis ? 1 : 0.001); o.updateMatrix(); K.mesh.setMatrixAt(i, o.matrix);
          });
          K.mesh.instanceMatrix.needsUpdate = true;
        });
        // cells respond in proportion to receptor filling
        cells.forEach((c, i) => {
          const fits = H.fits.includes(c.id);
          const target = fits ? occ(s.amount) : 0;
          c.level += (target - c.level) * Math.min(1, dt * 1.5);
          c.mat.emissiveIntensity = 0.08 + 1.1 * c.level * (0.8 + 0.2 * Math.sin(t * 5 + i));
          c.mat.opacity = 0.3 + 0.35 * c.level;
          const beat = c.id === 'heart' && fits ? 1 + 0.06 * c.level * Math.max(0, Math.sin(t * (6 + 6 * c.level))) : 1;
          c.shell.scale.set(1.0 * beat, 0.8 * beat, 0.8 * beat);
          Object.entries(c.sockets).forEach(([h, so]) => { so.visible = h === s.horm || !inReel(); so.material.opacity = h === s.horm ? 0.95 : 0.25; });
          const html = s.labels && !narrow ? `${c.short}<br><b>${fits ? c.does[s.horm] : 'no receptor'}</b>` : c.short;
          if (c.lab.element.innerHTML !== html) c.lab.element.innerHTML = html;
          tint(c.lab, fits ? 'green' : 'grey');
          c.lab.visible = !inReel() && (!narrow || fits);
        });
        gl.visible = s.labels && !inReel() && !narrow; bloodL.visible = gl.visible;
        // the race and the board
        if (s.raceT >= 0) { s.raceT += dt; if (s.raceT > BLOOD.reachS + 3) s.raceT = -1; }
        bd.visible = s.board && !narrow;
        const key = s.raceT >= 0 ? Math.floor(s.raceT * 20) : -1;
        if (bd.visible && key !== raceDrawn) { raceDrawn = key; ct.redraw({ race: s.raceT >= 0, raceT: s.raceT }); }
      },
      readout: (s) => {
        const H = HORM[s.horm];
        const who = s.horm === 't4' ? 'all four' : CELLS.filter((c) => H.fits.includes(c.id)).map((c) => c.short.replace(' cell', '').toLowerCase()).join(', ');
        return `<div class="big">${H.name}: ${s.horm === 't4' ? 'almost every cell listens' : 'only ' + H.fits.length + ' of 4 cells listen'}</div>
          <div class="row"><span>Made by · responders</span><b>${H.from.replace('the ', '').replace(' glands', '')} · ${who}</b></div>
          <div class="row"><span>Receptors filled</span><b>${Math.round(occ(s.amount) * 100)}%</b></div>
          <div class="row"><span>Acts in · lasts</span><b>${H.starts} · ${H.lasts}</b></div>`;
      },
    });
  },
};
