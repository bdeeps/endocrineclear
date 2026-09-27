// Chapter 3: the master control. Hypothalamus → pituitary → target gland, with negative feedback,
// shown for two axes:
//  - thyroid: TRH → TSH → thyroxine (T4, and T3);
//  - stress: CRH → ACTH → cortisol, with its daily rhythm (highest soon after waking).
// A small model runs the loop: the hypothalamus's releasing hormone R and the pituitary hormone P rise
// when the target hormone H is below its set point and fall when it is above (both levels sense H),
// and the gland makes H in proportion to P:
//   R* = 1 + a(1 − H),  P* = R·e^{b(1 − H)},  dH/dt = (strength·P + push − H)/τH
// with a = 1 and b = 5. The exponential gives the log-linear TSH–free T4 relation seen in patients:
// a small change in T4 makes a big change in TSH (Hoermann et al., Front Endocrinol 6:177, 2015;
// Spencer et al., J Clin Endocrinol Metab 70:453, 1990), which is why doctors test TSH first.
// Time constants (τ = half-life / ln 2):
//  - T4 half-life about 7 days (τ ≈ 10 days); TSH responds within hours (τ taken as 0.5 day);
//    TRH within minutes (0.1 day) (Guyton & Hall 14th ed., ch. 77; Greenspan's Basic & Clinical
//    Endocrinology, 10th ed., ch. 7).
//  - Cortisol half-life about 66–90 min (τ ≈ 95 min); ACTH half-life about 10 min (τ ≈ 15 min);
//    CRH about 5 min (Guyton & Hall ch. 78; Greenspan ch. 9).
// Reference ranges used to turn the model into lab units (typical adult ranges; labs vary):
//  - TSH 0.4–4.0 mIU/L (mid about 1.5); free T4 0.8–1.8 ng/dL (mid about 1.3) (American Thyroid
//    Association; MedlinePlus "TSH test", "T4 test").
//  - Morning cortisol about 6–23 µg/dL (mid about 12); ACTH about 10–60 pg/mL (mid about 20)
//    (MedlinePlus "Cortisol test", "ACTH blood test").
//  - Daily rhythm: cortisol peaks about 30–45 min after waking and is lowest around midnight
//    (Debono et al., J Clin Endocrinol Metab 94:1548, 2009), modelled as 1 + 0.55·cos(2π(h − 8)/24).
import { THREE, clamp, lerp, canvasTexture } from '../kit.js';
import { makeBody, tint, fitNarrow, compactReadout, inReel, board, panel, text, chart, pathOf, smoothPts, flow, COL, POS } from '../endo.js';

const AX = {
  thyroid: {
    R: 'TRH', P: 'TSH', H: 'Thyroxine (T4)', Hs: 'T4', gland: 'thyroid', unitT: 'days', rate: 1, win: 60, tR: 0.1, tP: 0.5, tH: 10,
    Hlab: (h) => (1.3 * h).toFixed(2) + ' ng/dL', Plab: (p) => (1.5 * p).toFixed(p < 0.3 ? 2 : 1) + ' mIU/L', band: [0.8 / 1.3, 1.8 / 1.3], Pband: [0.4 / 1.5, 4.0 / 1.5],
    view: { pos: [-1.15, 15.25, 8.6], target: [-2.0, 15.1, 0] }, board: [-4.4, 13.6, 0.4], bs: 1,
  },
  stress: {
    R: 'CRH', P: 'ACTH', H: 'Cortisol', Hs: 'cortisol', gland: 'adrenal', unitT: 'hours', rate: 0.2, win: 24, tR: 5 / 60, tP: 15 / 60, tH: 95 / 60,
    Hlab: (h) => (12 * h).toFixed(1) + ' µg/dL', Plab: (p) => Math.round(20 * p) + ' pg/mL', band: [6 / 12, 23 / 12], Pband: [10 / 20, 60 / 20],
    view: { pos: [-1.6, 13.75, 11.4], target: [-2.6, 13.6, 0] }, board: [-5.9, 11.9, 0.4], bs: 1.3,
  },
};
const circ = (h) => 1 + 0.55 * Math.cos((2 * Math.PI * (h - 8)) / 24);

function drawChart(g, w, h, st) {
  panel(g, w, h);
  if (!st) return;
  const A = AX[st.axis];
  text(g, A.H, 34, 58, 40, '#ff8a5c', 600);
  text(g, `and ${A.P} from the pituitary`, 34, 102, 32, '#8ef0ff', 500);
  text(g, st.fb ? 'Feedback on: held near the set point' : 'Feedback off: nothing corrects it', 34, 146, 28, st.fb ? '#6ee7a8' : '#ff8a8a', 500);
  const t1 = st.t, t0 = t1 - A.win;
  const xt = st.axis === 'thyroid' ? [0, 10, 20, 30, 40, 50, 60].map((d) => [t0 + d, `${Math.round(t0 + d)}`]) : [0, 6, 12, 18, 24].map((d) => [t0 + d, `${String(Math.floor(((t0 + d) % 24 + 24) % 24)).padStart(2, '0')}:00`]);
  const { X, Y } = chart(g, [90, 190, w - 120, h - 300], [t0, t1], [0, 2.4], [
    { pts: st.buf.map((b) => [b[0], Math.min(2.4, b[2] / 2.5)]), col: '#8ef0ff', w: 3 },
    { pts: st.buf.map((b) => [b[0], b[1]]), col: '#ff8a5c', w: 5 },
  ], { band: { lo: A.band[0], hi: A.band[1] }, xticks: xt, yticks: [[1, 'set'], [2, '2×']], fs: 28 });
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([8, 8]); g.lineWidth = 2; g.beginPath(); g.moveTo(X(t0), Y(1)); g.lineTo(X(t1), Y(1)); g.stroke(); g.setLineDash([]);
  text(g, st.axis === 'thyroid' ? 'day' : 'time of day', w - 30, h - 30, 28, '#8b93a7', 400, 'right');
  text(g, 'green: normal range', 34, h - 30, 28, '#6ee7a8', 500);
}

export default {
  id: 'control',
  short: 'The master control',
  title: 'A thermostat in your head',
  subtitle: 'The hypothalamus and pituitary switch glands on, and the glands’ own hormones switch them off.',
  view: AX.thyroid.view,
  learn: `<p>How does your body keep a hormone at the right level, not too much and not too little? The same way a <b>thermostat</b> keeps a room warm: it measures, compares with a <b>set point</b>, and corrects.</p>
    <p>The <b>hypothalamus</b> is the thermostat. When thyroid hormone is low, it sends <b>TRH</b> down a tiny private set of blood vessels to the <b>pituitary</b>. The pituitary answers by releasing <b>TSH</b> into the blood. TSH reaches the <b>thyroid</b>, which makes <b>thyroxine</b> (T4). That is a chain of command: brain, master gland, worker gland.</p>
    <p>Then the clever part: thyroxine travels back to the brain, and when there is enough, it tells the hypothalamus and pituitary to <b>ease off</b>. This is <b>negative feedback</b>. Too much hormone turns its own supply down; too little turns it up. So the level settles back to normal.</p>
    <p>The <b>stress axis</b> works the same way: <b>CRH</b> → <b>ACTH</b> → <b>cortisol</b> from the adrenal glands, with cortisol switching the chain off. Cortisol also follows a daily rhythm: it is highest soon after you wake up and lowest around midnight.</p>
    <p>Because the pituitary reacts so strongly, doctors check <b>TSH</b> to see how the thyroid is doing: a tired thyroid makes TSH climb long before thyroxine falls very far.</p>
    <p class="tip"><b>Try it:</b> press "Kick it up" and watch the level settle back. Then turn feedback off and push again. Finally, make the gland weak and watch TSH rise to keep the level up.</p>`,
  terms: [
    { t: 'Negative feedback', d: 'When a hormone’s own rise turns down its supply, keeping the level steady.' },
    { t: 'Set point', d: 'The level the body tries to hold, like the temperature on a thermostat.' },
    { t: 'TRH and CRH', d: 'Releasing hormones from the hypothalamus that tell the pituitary what to make.' },
    { t: 'Axis', d: 'A chain of command: hypothalamus → pituitary → target gland.' },
    { t: 'Cortisol', d: 'The adrenal “stress hormone” that raises blood sugar and has a daily rhythm.' },
    { t: 'Portal vessels', d: 'Tiny blood vessels that carry hypothalamus hormones straight to the pituitary.' },
  ],
  defaults: { axis: 'thyroid', push: 0, strength: 1, fb: true, labels: true, kick: 0 },
  controls: [
    { key: 'axis', type: 'seg', label: 'Chain of command', options: [{ v: 'thyroid', label: 'Thyroid' }, { v: 'stress', label: 'Stress (cortisol)' }], fmt: (v) => (v === 'thyroid' ? 'TRH → TSH → T4' : 'CRH → ACTH → cortisol') },
    { key: 'push', type: 'range', label: 'Outside push on the level', min: -0.6, max: 0.6, step: 0.01, ends: ['hormone removed', 'hormone added'], fmt: (v) => (Math.abs(v) < 0.01 ? 'none' : (v > 0 ? '+' : '') + Math.round(v * 100) + '%') },
    { key: 'strength', type: 'range', label: 'How strong the gland is', min: 0.1, max: 1.5, step: 0.01, ends: ['weak', 'strong'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'fb', type: 'toggle', label: 'Negative feedback' },
    { key: 'go', type: 'buttons', label: 'Disturb it', items: [
      { label: 'Kick it up', act: (s) => { s.kick = 0.6; } },
      { label: 'Kick it down', act: (s) => { s.kick = -0.5; } },
      { label: 'Stressful moment', act: (s) => { s.axis = 'stress'; s.kick = 'stress'; } },
    ] },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'Thyroxine levels rise too high. What does negative feedback do?', options: ['Makes the pituitary release more TSH', 'Makes the hypothalamus and pituitary ease off, so less TSH', 'Nothing', 'Switches off the heart'], answer: 1, why: 'High thyroxine tells the hypothalamus and pituitary to cut TRH and TSH, so the thyroid slows down and the level falls back.' },
    { q: 'Which is the right order for the stress axis?', options: ['Cortisol → ACTH → CRH', 'CRH → ACTH → cortisol', 'ACTH → cortisol → CRH', 'TSH → CRH → insulin'], answer: 1, why: 'The hypothalamus makes CRH, which makes the pituitary release ACTH, which makes the adrenal glands release cortisol.' },
    { q: 'Why do doctors often test TSH to check the thyroid?', options: ['TSH is made by the thyroid', 'The pituitary makes much more TSH when thyroxine is even a little low', 'TSH never changes', 'It is the cheapest blood test for sugar'], answer: 1, why: 'Small drops in thyroxine make the pituitary pour out a lot more TSH, so TSH is a sensitive early signal.' },
  ],
  reel: [
    { ms: 5400, caption: 'The hypothalamus tells the pituitary, and the pituitary tells the thyroid: a chain of command.', set: { axis: 'thyroid', push: 0, strength: 1, fb: true, labels: false, kick: 0 }, view: { pos: [0.2, 15.6, 7.5], target: [0, 15.6, 0] }, spin: 0.3 },
    { ms: 5600, caption: 'Too much hormone switches its own supply off, like a thermostat: that is negative feedback.', set: { axis: 'thyroid', push: 0, strength: 1, fb: true, labels: false, kick: 0.6 }, view: { pos: [-0.9, 15.4, 10.5], target: [-2.4, 15.1, 0] }, spin: 0 },
  ],

  onChange(s, key) { if (key === 'axis') { s.push = 0; s.strength = 1; } },

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { labels: false, organs: true });
    root.add(body.root); body.setXray(1);
    ['thymus', 'islets', 'gonads', 'pineal', 'para'].forEach((id) => { body.mats[id].transparent = true; body.mats[id].opacity = 0.2; body.mats[id].emissiveIntensity = 0.05; });
    // paths: releasing hormone, pituitary hormone, the gland's hormone out to the body, and feedback
    const P = (pts, n = 60) => pathOf(smoothPts(pts, n));
    const paths = {
      thyroid: {
        R: P([POS.hypo, [0, 16.16, 0.17], POS.pit], 16),
        P: P([POS.pit, [0.28, 15.7, 0.12], [0.34, 15.25, 0.14], [0.2, 15.0, 0.24]]),
        out: P([[0.2, 14.9, 0.26], [0.7, 14.3, 0.2], [1.6, 13.8, 0.1], [2.2, 12.2, 0.1], [2.4, 10.4, 0.1]]),
        fb: P([[-0.2, 14.95, 0.26], [-0.38, 15.35, 0.12], [-0.34, 15.85, 0.06], [-0.12, 16.2, 0.1], POS.hypo]),
      },
      stress: {
        R: P([POS.hypo, [0, 16.16, 0.17], POS.pit], 16),
        P: P([POS.pit, [0.3, 15.6, 0.1], [0.38, 14.6, 0.1], [0.3, 13.2, 0.0], [0.45, 12.2, -0.2], POS.adrenalL], 80),
        out: P([POS.adrenalL, [1.1, 11.1, -0.1], [1.4, 10.2, 0.2], [0.8, 9.4, 0.3]]),
        fb: P([POS.adrenalR, [-0.45, 12.2, -0.2], [-0.38, 13.5, 0.0], [-0.4, 15.0, 0.1], [-0.3, 15.9, 0.05], POS.hypo], 80),
      },
    };
    const F = {};
    for (const ax of ['thyroid', 'stress']) {
      const pp = paths[ax], big = ax === 'stress' ? 1.25 : 1;
      F[ax] = {
        R: flow(pp.R, 8, COL.trh, { size: 0.035, jitter: 0.02, seed: 1 }),
        P: flow(pp.P, 26, COL.tsh, { size: 0.045 * big, shape: 'box', jitter: 0.04, seed: 2 }),
        out: flow(pp.out, 30, COL.t4, { size: 0.045 * big, shape: 'octa', jitter: 0.06, seed: 3 }),
        fb: flow(pp.fb, 30, COL.t4, { size: 0.045 * big, shape: 'octa', jitter: 0.04, seed: 4 }),
      };
      Object.values(F[ax]).forEach((f) => root.add(f.mesh));
    }
    // labels
    const L = (h, p, c) => tint(stage.label(h, p, root), c);
    const lab = {
      hypo: L('Hypothalamus: thermostat', [1.5, 16.75, 0.1], 'pink'),
      pit: L('', [1.6, 16.0, 0.2], 'cyan'),
      gland: L('', [1.6, 14.9, 0.3], 'orange'),
      fb: L('', [-1.3, 15.95, 0.1], 'red'),
      out: L('', [1.2, 12.9, 0.1], 'orange'),
    };
    // the chart board
    const ct = canvasTexture(800, 880, drawChart);
    const bd = board(ct, 4.4, 4.84); root.add(bd);
    let R = 1, Pp = 1, H = 1, simT = 8, lastAx = '', stressT = 99, redraw = 0;
    const buf = [];
    let st = { R: 1, Pp: 1, H: 1, simT: 0 };
    const hour = (t) => ((t % 24) + 24) % 24;
    // integrate the loop in small steps and record it for the chart
    const advance = (simDt, s, A) => {
      const n = Math.max(1, Math.ceil(simDt / 0.02)), h = simDt / n;
      for (let i = 0; i < n; i++) {
        simT += h; stressT += h;
        const drive = s.axis === 'stress' ? circ(hour(simT)) * (1 + 2.2 * Math.exp(-stressT / 0.35)) : 1;
        const Rt = s.fb ? clamp(drive * (1 + (1 - H)), 0.02, 8) : drive, Pt = s.fb ? clamp(R * Math.exp(5 * (1 - H)), 0.01, 40) : R;
        R += (Rt - R) * Math.min(1, h / A.tR); Pp += (Pt - Pp) * Math.min(1, h / A.tP);
        H += (s.strength * Pp + s.push - H) * Math.min(1, h / A.tH); H = Math.max(0.02, H);
        if (!buf.length || simT - buf[buf.length - 1][0] > A.win / 240) buf.push([simT, H, Pp]);
      }
    };
    const fit = fitNarrow(stage, { pos: [0, 14.6, 12], target: [0, 14.4, 0] });
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const A = AX[s.axis], narrow = fit();
        if (s.axis !== lastAx) {
          lastAx = s.axis; R = Pp = H = 1; buf.length = 0; simT = s.axis === 'thyroid' ? -A.win : 6 - A.win; stressT = 99; advance(A.win, s, A);
          if (!inReel() && !narrow) stage.setView(A.view.pos, A.view.target, 1.0);
          bd.position.set(...A.board); bd.scale.setScalar(A.bs);
          lab.gland.position.set(...(s.axis === 'thyroid' ? [1.6, 14.9, 0.3] : [2.2, 11.6, -0.4]));
          lab.out.position.set(...(s.axis === 'thyroid' ? [1.2, 12.9, 0.1] : [2.2, 9.9, 0.2]));
          lab.fb.position.set(...(s.axis === 'thyroid' ? [-1.3, 15.95, 0.1] : [-1.5, 14.6, 0.1]));
          for (const ax in F) Object.values(F[ax]).forEach((f) => { f.mesh.visible = ax === s.axis; });
        }
        if (s.kick === 'stress') { stressT = 0; s.kick = 0; }
        else if (s.kick) { H = Math.max(0.05, H + s.kick); s.kick = 0; }
        advance(dt * A.rate * (s.axis === 'thyroid' ? 1 : 5), s, A);
        while (buf.length && buf[0][0] < simT - A.win) buf.shift();
        // particles
        const f = F[s.axis], spd = s.axis === 'thyroid' ? 1 : 1.6;
        f.R.step(dt, clamp(R / 2, 0.1, 1), 0.6 * spd, time);
        f.P.step(dt, clamp(Pp / 3, 0.05, 1), 1.2 * spd, time);
        f.out.step(dt, clamp(H / 1.8, 0.05, 1), 1.0 * spd, time);
        f.fb.step(dt, s.fb ? clamp(H / 1.8, 0.05, 1) : 0, 1.0 * spd, time);
        // glows
        const gl = body.mats[A.gland], other = s.axis === 'thyroid' ? 'adrenal' : 'thyroid';
        gl.transparent = false; gl.opacity = 1; gl.emissiveIntensity = 0.25 + 0.7 * clamp(Pp / 2, 0, 1.5);
        body.mats[other].transparent = true; body.mats[other].opacity = 0.25; body.mats[other].emissiveIntensity = 0.05;
        body.mats.hypo.emissiveIntensity = 0.25 + 0.6 * clamp(R / 2, 0, 1.5);
        body.mats.pit.emissiveIntensity = 0.25 + 0.6 * clamp(Pp / 2, 0, 1.5);
        // labels
        const on = s.labels && !inReel() && !narrow;
        lab.pit.element.textContent = `Pituitary: ${A.P} ${A.Plab(Pp)}`;
        lab.gland.element.textContent = `${s.axis === 'thyroid' ? 'Thyroid' : 'Adrenal gland'}: makes ${A.Hs}`;
        lab.fb.element.textContent = s.fb ? '− feedback: “enough!”' : 'feedback off';
        lab.out.element.textContent = `${A.Hs} to every cell`;
        Object.values(lab).forEach((l) => { l.visible = on; });
        bd.visible = !narrow;
        if (bd.visible && (redraw -= dt) <= 0) { redraw = 0.1; ct.redraw({ axis: s.axis, t: simT, buf, fb: s.fb }); }
        st = { R, Pp, H, simT };
      },
      readout(s) {
        const A = AX[s.axis];
        const inBand = st.H >= A.band[0] && st.H <= A.band[1], pIn = st.Pp >= A.Pband[0] && st.Pp <= A.Pband[1];
        const hh = ((st.simT % 24) + 24) % 24, clock = s.axis === 'thyroid' ? `day ${Math.floor(st.simT)}` : `${String(Math.floor(hh)).padStart(2, '0')}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')}`;
        return `<div class="big">${A.H}: ${A.Hlab(st.H)}${inBand ? '' : st.H > A.band[1] ? ', too high' : ', too low'}</div>
          <div class="row"><span>${A.R} (hypothalamus)</span><b>${Math.round(st.R * 100)}% of usual</b></div>
          <div class="row"><span>${A.P} (pituitary)</span><b>${A.Plab(st.Pp)}${pIn ? '' : st.Pp > A.Pband[1] ? ', high' : ', low'}</b></div>
          <div class="row"><span>vs set point · clock</span><b>${st.H >= 1 ? '+' : ''}${Math.round((st.H - 1) * 100)}% · ${clock}</b></div>
          <small>${!s.fb ? 'With no feedback, any push moves the level and nothing pulls it back.' : s.strength < 0.6 ? `A weak gland: the pituitary shouts louder (${A.P} up) to keep ${A.Hs} near normal.` : Math.abs(s.push) > 0.1 ? `Feedback fights the push: ${A.P} moves the other way.` : 'Pink, blue, orange: the three hormones of the chain.'}</small>`;
      },
    });
  },
};
