// Chapter 4: blood sugar and stress. Three stories run on one small model of a 70 kg adult:
//  - a meal (about 60 g of carbohydrate, a plate of rice and dal): glucose rises, the islets release
//    insulin, the liver and muscles store sugar, and glucose is back to normal in 2–3 hours;
//  - a fast (from after dinner, for 36 hours): insulin falls, glucagon rises, the liver breaks down
//    its glycogen and then makes new glucose, and blood sugar only sags a little;
//  - a scare: sympathetic nerves speed the heart within a second or two, adrenaline floods the blood
//    within seconds (peak in about a minute, half-life about 2 minutes), and cortisol follows,
//    peaking about 20–40 minutes later. Both push the liver to release glucose.
// The model (per minute; our own simplification, tuned to the textbook curves below):
//   gut: stomach S → intestine Q → blood (rates 0.022 and 0.03 per minute);
//   liver output EGP = 140 mg/min × (insulin brake) × √(glucagon/60) × (1 + 2.5·adrenaline effect)
//     × √(cortisol/12) × (glycogen factor);
//   uptake = 90 mg/min, mostly the brain, without insulin + 0.069 × insulin action × glucose;
//   insulin follows (glucose/90)³ with a boost from the gut (incretins), lags 6 min, acts with a
//   15 min lag; adrenaline holds insulin back; glucagon rises when glucose and insulin are low.
// Numbers it is tuned to:
//  - fasting glucose 70–99 mg/dL; a normal peak after a meal usually under about 140–160 mg/dL,
//    back below 140 by 2 hours (American Diabetes Association, Standards of Care 2024; WHO);
//    glucose distribution volume about 0.19 L/kg; basal liver output about 2 mg/kg/min; the brain
//    uses about 120 g of glucose a day (Gerich, Diabetes Care 1993; Guyton & Hall 14th ed., ch. 79);
//  - fasting insulin about 5–10 µU/mL, 50–100 after a meal; glucagon about 50–100 pg/mL;
//  - liver glycogen about 70–100 g after meals, mostly used up by about 24 hours of fasting, after which
//    gluconeogenesis (new glucose from amino acids, lactate and glycerol) takes over (Rothman et al.,
//    Science 254:573, 1991; Cahill, Annu Rev Nutr 26:1, 2006);
//  - stress: plasma adrenaline about 30 pg/mL at rest, several hundred in acute stress; heart rate up
//    within seconds; cortisol peaks about 21–40 minutes after a stressor starts (Dickerson & Kemeny,
//    Psychol Bull 130:355, 2004).
// PancreasClear has the islets and the diabetes story in depth.
import { THREE, clamp, lerp, canvasTexture } from '../kit.js';
import { makeBody, tint, fitNarrow, compactReadout, inReel, board, panel, text, chart, pathOf, smoothPts, flow, blob, glowMat, COL, POS } from '../endo.js';

const MEAL_G = 60;
function makeSim(kind) { return { kind, t: 0, G: 90, I: 8, X: 8, Gn: 60, S: kind === 'meal' ? MEAL_G : 0, Q: 0, Gly: kind === 'fast' ? 75 : 55, A: 30, C: 12, HR: 72, EGP: 140, Uid: 50, store: 0, buf: [] }; }
// Advance h seconds.
function step(st, h) {
  const m = h / 60, ts = st.t;
  let nerve = 0, sec = 0;
  if (st.kind === 'scare') { nerve = Math.exp(-ts / 40); sec = 10 * Math.exp(-ts / 60); }
  st.A += sec * h - ((st.A - 30) * h) / 150;
  const Aeff = clamp((st.A - 30) / (st.A + 300), 0, 1);
  st.C = st.kind === 'scare' ? 12 + 12 * (ts / 1800) * Math.exp(1 - ts / 1800) : 12;
  st.HR = 72 + 70 * clamp(0.7 * nerve + 0.8 * Aeff, 0, 1);
  const Rs = 0.022 * st.S; st.S -= Rs * m; st.Q += Rs * m;
  const Ra = 0.03 * st.Q; st.Q -= Ra * m;
  const fI = clamp(1.6 - (0.6 * st.X) / 8, 0.08, 1.6), glyF = clamp(st.Gly / 30, 0, 1);
  st.EGP = 140 * fI * Math.sqrt(st.Gn / 60) * (1 + 2.5 * Aeff) * Math.sqrt(st.C / 12) * (0.62 + 0.38 * glyF);
  const Uii = (90 * st.G) / (st.G + 10) / 0.9;
  st.Uid = 0.0694 * st.X * st.G;
  st.G += ((1000 * Ra + st.EGP - Uii - st.Uid) / 130) * m;
  const It = 8 * Math.pow(st.G / 90, 3) * (1 + 1.6 * Ra) * (1 - 0.85 * Aeff);
  st.I += (It - st.I) * Math.min(1, m / 6);
  st.X += (st.I - st.X) * Math.min(1, m / 15);
  const Gnt = 60 * (90 / st.G) * Math.pow(8 / Math.max(st.I, 2), 0.15) * (1 + 0.8 * Aeff);
  st.Gn += (Gnt - st.Gn) * Math.min(1, m / 7);
  st.store = 0.35 * Ra * clamp(st.X / 30, 0, 1);
  st.Gly += (st.store - (st.EGP / 1000) * 0.55 * glyF) * m;
  st.t += h;
}
const SC = {
  meal: { label: 'A meal', end: 240 * 60, rate: 360 },        // sim seconds per real second
  fast: { label: 'A fast', end: 36 * 3600, rate: 3600 },
  scare: { label: 'A scare', end: 7200, rate: 0 },             // warped: slow at first
};
const clock = (st) => (st.kind === 'scare' ? (st.t < 60 ? `${st.t.toFixed(st.t < 10 ? 1 : 0)} s` : `${Math.floor(st.t / 60)} min`) : st.kind === 'meal' ? `${Math.floor(st.t / 60)} min after eating` : `${(st.t / 3600).toFixed(1)} h without food`);

function drawChart(g, w, h, st) {
  panel(g, w, h);
  if (!st) return;
  if (st.kind !== 'scare') {
    text(g, 'Blood glucose', 34, 56, 38, '#ffffff', 600);
    text(g, 'with insulin', 34, 96, 28, '#6ee7a8', 500); text(g, 'and glucagon', 210, 96, 28, '#ff7a8a', 500);
    const T = SC[st.kind].end / 60, isFast = st.kind === 'fast';
    const xt = isFast ? [0, 6, 12, 18, 24, 30, 36].map((x) => [x * 60, x + ' h']) : [0, 60, 120, 180, 240].map((x) => [x, x / 60 + ' h']);
    chart(g, [90, 130, w - 120, h - 220], [0, T], [40, 200], [
      { pts: st.buf.map((b) => [b[0] / 60, 40 + b[2] * 1.4]), col: '#6ee7a8', w: 3 },
      { pts: st.buf.map((b) => [b[0] / 60, 40 + b[3] * 1.2]), col: '#ff7a8a', w: 3 },
      { pts: st.buf.map((b) => [b[0] / 60, b[1]]), col: '#ffffff', w: 5 },
    ], { band: { lo: 70, hi: 140 }, xticks: xt, yticks: [[70, '70'], [100, '100'], [140, '140'], [180, '180']], fs: 24 });
    text(g, 'mg/dL · green: healthy range', 34, h - 26, 24, '#8b93a7', 400);
  } else {
    text(g, 'A scare: who reacts when', 34, 56, 36, '#ffffff', 600);
    text(g, 'each line scaled to its own peak', 34, 94, 24, '#8b93a7', 400);
    const P = [['heart rate', '#ff7a8a', 4, 72, 45], ['adrenaline', '#ff8a5c', 5, 30, 330], ['glucose', '#ffffff', 1, 90, 15], ['cortisol', '#ffd166', 6, 12, 12]];
    const series = P.map(([, col, i, base, span]) => ({ pts: st.buf.filter((b) => b[0] >= 1).map((b) => [b[0], clamp((b[i] - base) / span, 0, 1.05)]), col, w: 4 }));
    chart(g, [40, 130, w - 70, h - 250], [1, 7200], [0, 1.1], series, { logx: true, xticks: [[1, '1 s'], [10, '10 s'], [60, '1 min'], [600, '10 min'], [3600, '1 h']], fs: 24 });
    P.forEach(([k, col], i) => text(g, k, 40 + (i % 2) * 260, h - 52 + Math.floor(i / 2) * 32, 26, col, 500));
  }
}

export default {
  id: 'sugar',
  short: 'Sugar and stress',
  title: 'Blood sugar, and a sudden scare',
  subtitle: 'Insulin and glucagon keep your fuel steady; adrenaline and cortisol get you ready to run.',
  view: { pos: [-1.3, 10.7, 11.5], target: [-2.4, 10.4, 0] },
  learn: `<p>Your brain burns about <b>120 g of glucose</b> a day and can't store any, so your blood sugar has to stay steady, usually between about <b>70 and 140 mg/dL</b>. Two hormones from the <b>islets</b> of the pancreas steer it, like two hands on a see-saw (PancreasClear shows them up close).</p>
    <p><b>After a meal</b>, glucose pours in from the gut. The islets' beta cells release <b>insulin</b>, and insulin tells muscle, fat and the <b>liver</b> to take glucose in. The liver stores it as <b>glycogen</b>. Within 2 to 3 hours your blood sugar is back to normal.</p>
    <p><b>When you fast</b>, insulin falls and the alpha cells release <b>glucagon</b>. Glucagon tells the liver to break its glycogen back into glucose. The liver holds only enough for about a day; after that it makes <b>new glucose</b> from other building blocks. So even after 36 hours without food, blood sugar only dips a little.</p>
    <p><b>A sudden scare</b> is different. Nerves speed your heart within a second, and the <b>adrenal glands</b> squirt <b>adrenaline</b> into the blood within seconds: faster heart, more sugar released for your muscles. Minutes later <b>cortisol</b> arrives through the stress axis and keeps sugar up for an hour or more. This is fight or flight (NervousClear shows the nerve side).</p>
    <p class="tip"><b>Try it:</b> run each story and watch the particles in the blood: white glucose, green insulin, pink glucagon, orange adrenaline. Then compare how fast each line rises on the chart.</p>`,
  terms: [
    { t: 'Glucose', d: 'Blood sugar: the main fuel for your cells, and almost the only one your brain uses.' },
    { t: 'Insulin', d: 'The islet hormone that lets cells take in glucose and lowers blood sugar.' },
    { t: 'Glucagon', d: 'The islet hormone that tells the liver to release glucose and raises blood sugar.' },
    { t: 'Glycogen', d: 'Glucose stored in chains in the liver and muscles, a quick-release fuel tank.' },
    { t: 'Adrenaline', d: 'The fast fight-or-flight hormone from the inner adrenal gland.' },
    { t: 'Gluconeogenesis', d: 'The liver making new glucose from other molecules when glycogen runs low.' },
  ],
  defaults: { kind: 'meal', labels: true, restart: 0, speed: 1 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Story', options: Object.entries(SC).map(([v, c]) => ({ v, label: c.label })), fmt: (v) => (v === 'meal' ? `${MEAL_G} g of carbohydrate` : v === 'fast' ? '36 hours from dinner' : 'a sudden fright') },
    { key: 'go', type: 'buttons', label: 'Clock', items: [{ label: 'Start again', act: (s) => { s.restart = 1; } }] },
    { key: 'speed', type: 'range', label: 'Speed', min: 0.25, max: 4, step: 0.05, fmt: (v) => v.toFixed(2) + '×' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'After a meal, which hormone brings blood sugar back down?', options: ['Glucagon', 'Insulin', 'Adrenaline', 'Cortisol'], answer: 1, why: 'Insulin from the beta cells tells muscle, fat and liver to take glucose in. The liver stores it as glycogen.' },
    { q: 'You have not eaten since last night. What keeps your blood sugar up?', options: ['Insulin rising', 'Glucagon telling the liver to release glucose', 'Your muscles making sugar', 'Sweat'], answer: 1, why: 'Insulin falls and glucagon rises, so the liver breaks down glycogen and later makes new glucose.' },
    { q: 'In a sudden scare, which reacts first?', options: ['Cortisol', 'Thyroxine', 'Adrenaline and the nerves to the heart', 'Growth hormone'], answer: 2, why: 'Nerves act in under a second and adrenaline within seconds. Cortisol takes about 20 to 40 minutes to peak.' },
  ],
  reel: [
    { ms: 5600, caption: 'After a meal, insulin tells your liver and muscles to soak up the sugar.', set: { kind: 'meal', labels: false, speed: 7 }, act: (s) => { s.restart = 1; }, view: { pos: [0.2, 10.4, 9.5], target: [0.1, 10.2, 0] }, spin: 0.25 },
    { ms: 5600, caption: 'In a scare, adrenaline hits your blood within seconds; cortisol follows about half an hour later.', set: { kind: 'scare', labels: false, speed: 7 }, act: (s) => { s.restart = 1; }, view: { pos: [-1.0, 10.9, 10.2], target: [-2.2, 10.6, 0] }, spin: 0 },
  ],

  onChange(s, key) { if (key === 'kind') s.restart = 1; },

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { labels: false, organs: true });
    root.add(body.root); body.setXray(1);
    ['thymus', 'gonads', 'pineal', 'para', 'thyroid', 'hypo', 'pit'].forEach((id) => { body.mats[id].transparent = true; body.mats[id].opacity = 0.2; body.mats[id].emissiveIntensity = 0.05; });
    body.organ.liver.material.opacity = 0.45;
    // thigh muscle, a big glucose user
    const muscleMat = new THREE.MeshStandardMaterial({ color: 0xc0505a, transparent: true, opacity: 0.35, emissive: 0xc0505a, emissiveIntensity: 0.1, depthWrite: false });
    const muscle = blob([0.45, 1.5, 0.45], [0.9, 7.0, 0.05], muscleMat); root.add(muscle);
    // the bloodstream: a closed loop over the front of the trunk and the top of the thighs
    const loopPts = [[0.25, 12.3, 0.6], [0.7, 11.8, 0.55], [0.55, 11.0, 0.5], [0.85, 9.6, 0.5], [1.0, 7.8, 0.55], [0.9, 6.3, 0.5], [0, 6.0, 0.5], [-0.9, 6.3, 0.5], [-1.0, 7.8, 0.55], [-0.85, 9.6, 0.5], [-0.75, 11.2, 0.6], [-0.3, 12.3, 0.6]];
    const loop = pathOf(smoothPts(loopPts, 160, true));
    const loopMesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(loopPts.map((p) => new THREE.Vector3(...p)), true, 'centripetal'), 200, 0.13, 10, true), new THREE.MeshStandardMaterial({ color: 0xc23a48, transparent: true, opacity: 0.25, depthWrite: false }));
    root.add(loopMesh);
    const F = {
      glucose: flow(loop, 90, COL.glucose, { size: 0.045, jitter: 0.07, seed: 11 }),
      insulin: flow(loop, 50, COL.insulin, { size: 0.05, shape: 'box', jitter: 0.07, seed: 12 }),
      glucagon: flow(loop, 50, COL.glucagon, { size: 0.05, shape: 'octa', jitter: 0.07, seed: 13 }),
      adrenaline: flow(loop, 50, COL.adrenaline, { size: 0.055, shape: 'tetra', jitter: 0.07, seed: 14 }),
      cortisol: flow(loop, 40, COL.cortisol, { size: 0.045, shape: 'octa', jitter: 0.07, seed: 15 }),
    };
    Object.values(F).forEach((f) => root.add(f.mesh));
    // liver arrows (storing ↔ releasing)
    const arrowMat = glowMat(0x6ee7a8, 1);
    const arrows = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 12), arrowMat); m.position.set(-0.95 + i * 0.35, 11.95, 0.8); root.add(m); return m; });
    const L = (h, p, c) => tint(stage.label(h, p, root), c);
    const lab = { liver: L('', [-2.2, 11.85, 0.4], 'green'), islets: L('', [1.9, 10.8, 0.4], 'green'), muscle: L('', [2.3, 7.4, 0.3], 'red'), adrenal: L('', [2.1, 11.9, -0.4], 'amber'), heart: L('', [1.7, 13.0, 0.4], 'red'), brain: L('Brain: 120 g of glucose a day', [1.3, 14.5, 0.4], 'grey') };
    const ct = canvasTexture(560, 600, drawChart);
    const bd = board(ct, 4.6, 4.93); bd.position.set(-4.7, 8.6, 0.4); root.add(bd);
    let st = makeSim('meal'), beat = 0, redraw = 0, hold = 0;
    const isleMats = body.mats.islets;
    const fit = fitNarrow(stage, { pos: [0, 10.4, 8], target: [0, 10.2, 0] });
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        if (s.restart || st.kind !== s.kind) { st = makeSim(s.kind); s.restart = 0; hold = 0; }
        const S = SC[st.kind];
        if (st.t >= S.end) { hold += dt; if (hold > 3 && !inReel()) { st = makeSim(s.kind); hold = 0; } }
        else {
          // real seconds → model seconds; the scare starts in slow motion and speeds up
          const rate = (st.kind === 'scare' ? clamp(0.5 + 0.4 * st.t, 0.5, 300) : S.rate) * s.speed;
          let simDt = Math.min(dt * rate, S.end - st.t);
          const hmax = st.kind === 'scare' ? 1 : 10;
          while (simDt > 1e-6) { const h = Math.min(hmax, simDt); step(st, h); simDt -= h; }
          const last = st.buf[st.buf.length - 1];
          const gap = st.kind === 'scare' ? (last ? Math.max(0.2, last[0] * 0.03) : 0) : S.end / 300;
          if (!last || st.t - last[0] >= gap) st.buf.push([st.t, st.G, st.I, st.Gn, st.HR, st.A, st.C]);
        }
        // particles: numbers follow the levels
        const spd = 1.2 + (st.HR - 72) / 30;
        F.glucose.step(dt, clamp((st.G - 40) / 160, 0.05, 1), spd, time);
        F.insulin.step(dt, clamp(st.I / 80, 0.03, 1), spd, time);
        F.glucagon.step(dt, clamp((st.Gn - 20) / 80, 0.03, 1), spd, time);
        F.adrenaline.step(dt, st.A > 40 ? clamp(st.A / 350, 0.05, 1) : 0, spd, time);
        F.cortisol.step(dt, st.C > 13 ? clamp((st.C - 12) / 12, 0.05, 1) : 0, spd, time);
        // organs
        beat = (beat + (dt * st.HR) / 60) % 1;
        const b = 1 + 0.1 * Math.exp(-((beat - 0.1) ** 2) / 0.004);
        body.organ.heart.scale.set(0.4 * b, 0.55 * b, 0.36 * b);
        const net = st.store - st.EGP / 1000;                         // g/min into the liver (+) or out (−)
        const into = net > 0.02, out = net < -0.02;
        arrowMat.color.set(into ? 0x6ee7a8 : 0xff7a8a); arrowMat.emissive.set(into ? 0x6ee7a8 : 0xff7a8a);
        arrows.forEach((a, i) => { a.visible = into || out; a.rotation.z = into ? Math.PI : 0; a.position.y = 11.95 + (into ? -1 : 1) * (((time * 0.8 + i / 3) % 1) * 0.35); });
        body.organ.liver.material.emissiveIntensity = 0.1 + 0.4 * clamp(Math.abs(net) * 2, 0, 1);
        isleMats.color.setRGB(...lerpCol(0xff7a8a, 0x6ee7a8, clamp(st.I / (st.I + st.Gn / 5), 0, 1)));
        isleMats.emissive.copy(isleMats.color); isleMats.emissiveIntensity = 0.4 + 0.8 * clamp((st.I + st.Gn / 6) / 60, 0, 1);
        body.mats.adrenal.emissiveIntensity = 0.3 + 1.4 * clamp((st.A - 30) / 300 + (st.C - 12) / 24, 0, 1);
        muscleMat.emissiveIntensity = 0.1 + 0.6 * clamp((st.Uid - 30) / 250, 0, 1);
        // labels
        const on = s.labels && !inReel() && !fit();
        lab.liver.element.textContent = into ? 'Liver: storing glycogen' : out ? (st.Gly < 15 ? 'Liver: making new glucose' : 'Liver: releasing glucose') : 'Liver: balanced';
        tint(lab.liver, into ? 'green' : 'red');
        lab.islets.element.textContent = st.I > 15 ? 'Islets: insulin' : st.Gn > 65 ? 'Islets: glucagon' : 'Islets: a little of both';
        tint(lab.islets, st.I > 15 ? 'green' : st.Gn > 65 ? 'red' : 'grey');
        lab.muscle.element.textContent = st.Uid > 90 ? 'Muscle: taking in glucose' : 'Muscle: sipping fuel';
        lab.adrenal.element.textContent = st.A > 60 ? 'Adrenals: adrenaline!' : st.C > 14 ? 'Adrenals: cortisol' : 'Adrenals';
        lab.heart.element.textContent = `Heart: ${Math.round(st.HR)} a minute`;
        Object.values(lab).forEach((l) => { l.visible = on; });
        lab.adrenal.visible = on && st.kind === 'scare'; lab.heart.visible = on && st.kind === 'scare';
        lab.muscle.visible = on && st.kind !== 'scare';
        bd.visible = !fit() || inReel();
        if (bd.visible && (redraw -= dt) <= 0) { redraw = 0.15; ct.redraw(st); }
      },
      readout: (s) => {
        const mmol = (st.G / 18).toFixed(1);
        const head = `<div class="big">Blood glucose ${Math.round(st.G)} mg/dL</div>`;
        if (st.kind === 'scare') return head + `
          <div class="row"><span>Heart rate · clock</span><b>${Math.round(st.HR)} a minute · ${clock(st)}</b></div>
          <div class="row"><span>Adrenaline</span><b>${Math.round(st.A)} pg/mL${st.A > 100 ? ', surging' : ''}</b></div>
          <div class="row"><span>Cortisol</span><b>${st.C.toFixed(1)} µg/dL${st.C > 18 ? ', high' : ''}</b></div>`;
        return head + `
          <div class="row"><span>Insulin · glucagon</span><b>${Math.round(st.I)} µU/mL · ${Math.round(st.Gn)} pg/mL</b></div>
          <div class="row"><span>Liver glycogen</span><b>about ${Math.max(0, Math.round(st.Gly))} g</b></div>
          <div class="row"><span>Clock</span><b>${clock(st)}</b></div>
          <small>${mmol} mmol/L. ${st.G > 140 ? 'Above the usual range for now: insulin is on its way.' : st.G < 75 ? 'On the low side: glucagon is pushing it back up.' : 'Inside the healthy range.'}</small>`;
      },
    });
  },
};

function lerpCol(a, b, k) {
  const A = new THREE.Color(a), B = new THREE.Color(b);
  return [lerp(A.r, B.r, k), lerp(A.g, B.g, k), lerp(A.b, B.b, k)];
}
