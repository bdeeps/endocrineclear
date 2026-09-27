// Chapter 5: growth and change. Four topics on one figure:
//  - growth: the figure grows from birth to 20 on the WHO median height curves (see HEIGHT in
//    endo.js), with a baby's big head shrinking to an adult's 1/8. Growth hormone (GH) from the
//    pituitary drives growth at the growth plates, mostly via IGF-1 from the liver; it is released in
//    pulses, the biggest in deep sleep (Takahashi et al., J Clin Invest 47:2079, 1968). Thyroid hormone
//    is needed too. Growth plates close at about 14–16 in girls and 16–18 in boys (NIH MedlinePlus;
//    see SkeletonClear), after which height stops.
//  - puberty: the hypothalamus starts pulsing GnRH; the pituitary releases LH and FSH; the ovaries make
//    oestrogen and progesterone, the testes testosterone. Usual start 8–13 in girls and 9–14 in boys
//    (NHS "Puberty"; Indian Academy of Paediatrics), with the growth spurt early in girls and later
//    in boys, and first periods usually around 12–13 (Indian studies average about 13). Hormone
//    curves here are illustrative (normalised), not lab values.
//  - sleep: the pineal gland makes melatonin in the dark. Levels start rising about 2 hours before
//    usual bedtime (dim-light melatonin onset), peak around 2–4 a.m. at roughly 60–80 pg/mL and fall
//    by morning (Arendt, Rev Reprod 3:13, 1998). Bright screens in the evening delayed melatonin onset
//    by about 1.5 h and lowered evening melatonin by about half in Chang et al., PNAS 112:1232, 2015.
//  - iodine: every thyroxine molecule carries 4 iodine atoms (about 65% of its weight). Needs: about
//    90 µg a day for young children, 120 µg at 6–12 years, 150 µg for teens and adults, 250 µg in
//    pregnancy (WHO/UNICEF/ICCIDD 2007). Too little, and TSH rises and the thyroid swells: a goitre.
//    India's iodised salt must carry at least 15 ppm (15 µg per gram) where it is eaten (Food Safety
//    and Standards Regulations, 2011; the National Iodine Deficiency Disorders Control Programme).
//    Adult thyroid volume is about 10–18 mL (WHO). Our link from intake to thyroid strength is
//    illustrative: strength = min(1, intake/120)^0.8, fed into the chapter 3 loop.
import { THREE, clamp, lerp, smooth, canvasTexture } from '../kit.js';
import { makeBody, tint, fitNarrow, compactReadout, inReel, board, panel, text, chart, wrap, heightAt, growthRate, headFrac, thyroidSteady, blob, glowMat, COL, HEIGHT } from '../endo.js';

const TOPIC = {
  growth: { label: 'Growth', view: { pos: [-1.9, 9.4, 16.5], target: [-3.6, 9.0, 0] } },
  puberty: { label: 'Puberty', view: { pos: [-1.9, 9.4, 16.5], target: [-3.6, 9.0, 0] } },
  sleep: { label: 'Sleep', view: { pos: [-0.5, 15.2, 8.6], target: [-1.4, 15.2, 0] } },
  iodine: { label: 'Iodine', view: { pos: [-0.5, 15.0, 8.6], target: [-1.4, 14.8, 0] } },
};
const onset = (sex) => (sex === 'f' ? 10 : 11.5);                    // average start of puberty, years
const sexHorm = (sex, age) => smooth((age - onset(sex) + 1.5) / 5);   // 0 → 1 across puberty
const lhOf = (sex, age) => 0.08 + 0.92 * smooth((age - onset(sex) + 2) / 4.5);
const ghOf = (sex, age) => 0.45 + 0.55 * Math.exp(-(((age - (sex === 'f' ? 12 : 14)) / 2.2) ** 2)) - 0.12 * smooth((age - 17) / 3);
// Melatonin (pg/mL) at clock hour h (0–24), with or without bright screens in the evening.
function melatonin(h, screens) {
  const x = h < 12 ? h + 24 : h;                                      // 12 → 36
  const on = screens ? 23.0 : 21.5, peak = 27, off = 32, amp = 70;
  if (x < on || x > off + 1.5) return 3;
  const up = smooth((x - on) / (peak - on)), down = 1 - smooth((x - peak) / (off + 1.5 - peak));
  const k = x < peak ? up : down;
  const cut = screens ? 0.5 + 0.5 * smooth((x - 24) / 2) : 1;         // evening light halves it early on
  return 3 + amp * k * cut;
}
const iodineStrength = (ug) => Math.pow(clamp(ug / 120, 0.03, 1), 0.8);
const needOf = (age) => (age < 6 ? 90 : age < 13 ? 120 : 150);
const fmtHour = (h) => { const x = ((h % 24) + 24) % 24; return `${String(Math.floor(x)).padStart(2, '0')}:${String(Math.round((x % 1) * 60) % 60).padStart(2, '0')}`; };

function drawBoard(g, w, h, st) {
  panel(g, w, h);
  if (!st) return;
  const s = st.s;
  if (s.topic === 'growth') {
    text(g, 'Height by age', 34, 56, 38, '#fff', 600);
    text(g, 'WHO median: girls', 34, 96, 26, '#ff9fc0', 500); text(g, 'boys', 290, 96, 26, '#8ef0ff', 500);
    const { X, Y } = chart(g, [70, 130, w - 100, h - 240], [0, 20], [40, 190], [
      { pts: HEIGHT.f.map(([a, v]) => [a, v]), col: '#ff9fc0', w: s.sex === 'f' ? 5 : 2 },
      { pts: HEIGHT.m.map(([a, v]) => [a, v]), col: '#8ef0ff', w: s.sex === 'm' ? 5 : 2 },
    ], { xticks: [0, 5, 10, 15, 20].map((a) => [a, a + ' yr']), yticks: [[50, '50'], [100, '100'], [150, '150']], fs: 24 });
    g.fillStyle = '#ffd166'; g.beginPath(); g.arc(X(s.age), Y(heightAt(s.sex, s.age)), 11, 0, 7); g.fill();
    wrap(g, `Growing about ${growthRate(s.sex, s.age).toFixed(1)} cm a year now (an average child)`, 34, h - 52, w - 60, 25, '#ffd166', 1.2, 500);
  } else if (s.topic === 'puberty') {
    text(g, 'Puberty hormones', 34, 56, 38, '#fff', 600);
    text(g, 'LH + FSH', 34, 96, 24, '#8ef0ff', 500); text(g, s.sex === 'f' ? 'oestrogen' : 'testosterone', 170, 96, 24, '#ff9fc0', 500); text(g, 'growth hormone', 360, 96, 24, '#ffd166', 500);
    const A = []; for (let a = 4; a <= 20; a += 0.25) A.push(a);
    const { X, Y } = chart(g, [70, 130, w - 100, h - 270], [4, 20], [0, 1.1], [
      { pts: A.map((a) => [a, ghOf(s.sex, a)]), col: '#ffd166', w: 3 },
      { pts: A.map((a) => [a, lhOf(s.sex, a)]), col: '#8ef0ff', w: 4 },
      { pts: A.map((a) => [a, sexHorm(s.sex, a)]), col: '#ff9fc0', w: 5 },
    ], { xticks: [4, 8, 12, 16, 20].map((a) => [a, a + ' yr']), fs: 24 });
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(clamp(s.age, 4, 20)), Y(0)); g.lineTo(X(clamp(s.age, 4, 20)), Y(1.1)); g.stroke();
    const band = s.sex === 'f' ? [8, 13] : [9, 14];
    g.fillStyle = 'rgba(255,209,102,.12)'; g.fillRect(X(band[0]), Y(1.1), X(band[1]) - X(band[0]), Y(0) - Y(1.1));
    wrap(g, `Shaded: the usual age to start (${band[0]}–${band[1]}). Everyone has their own timing.`, 34, h - 60, w - 60, 25, '#cfd6e4', 1.2);
  } else if (s.topic === 'sleep') {
    text(g, 'Melatonin through the night', 34, 56, 36, '#fff', 600);
    text(g, 'dark room', 34, 96, 26, '#c9a7ff', 500); text(g, 'screens till late', 220, 96, 26, '#ff8a5c', 500);
    const H = []; for (let x = 12; x <= 36; x += 0.1) H.push(x);
    const { X, Y } = chart(g, [80, 130, w - 110, h - 270], [12, 36], [0, 80], [
      { pts: H.map((x) => [x, melatonin(x % 24, false)]), col: '#c9a7ff', w: s.screens ? 3 : 5 },
      { pts: H.map((x) => [x, melatonin(x % 24, true)]), col: '#ff8a5c', w: s.screens ? 5 : 2, dash: s.screens ? [] : [10, 8] },
    ], { xticks: [12, 18, 24, 30, 36].map((x) => [x, fmtHour(x)]), yticks: [[20, '20'], [40, '40'], [60, '60']], fs: 24 });
    const hx = s.hour < 12 ? s.hour + 24 : s.hour;
    g.fillStyle = '#ffd166'; g.beginPath(); g.arc(X(hx), Y(melatonin(s.hour, s.screens)), 11, 0, 7); g.fill();
    wrap(g, 'Bright screens late at night pushed melatonin about 1.5 hours later and made it lower (Chang et al., 2015).', 34, h - 64, w - 60, 24, '#cfd6e4', 1.2);
  } else {
    text(g, 'Iodine and the thyroid', 34, 56, 38, '#fff', 600);
    text(g, 'thyroid size', 34, 96, 26, '#ff8a5c', 500); text(g, 'TSH', 230, 96, 26, '#8ef0ff', 500); text(g, 'T4', 330, 96, 26, '#ffd166', 500);
    const U = []; for (let u = 5; u <= 300; u += 5) U.push(u);
    const ss = U.map((u) => [u, thyroidSteady(iodineStrength(u))]);
    const { X, Y } = chart(g, [80, 130, w - 110, h - 280], [0, 300], [0, 3.2], [
      { pts: ss.map(([u, r]) => [u, Math.min(3.1, r.TSH)]), col: '#8ef0ff', w: 3 },
      { pts: ss.map(([u, r]) => [u, r.T4]), col: '#ffd166', w: 3 },
      { pts: ss.map(([u, r]) => [u, goitreOf(r.TSH)]), col: '#ff8a5c', w: 5 },
    ], { xticks: [0, 100, 200, 300].map((u) => [u, String(u)]), yticks: [[1, '1×'], [2, '2×'], [3, '3×']], fs: 24 });
    g.fillStyle = 'rgba(110,231,168,.13)'; g.fillRect(X(150), Y(3.2), X(300) - X(150), Y(0) - Y(3.2));
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 3; g.beginPath(); g.moveTo(X(s.iodine), Y(0)); g.lineTo(X(s.iodine), Y(3.2)); g.stroke();
    text(g, 'µg iodine a day · green: enough', 34, h - 66, 24, '#8b93a7', 400);
    text(g, 'Iodised salt: at least 15 µg in every gram', 34, h - 32, 24, '#6ee7a8', 500);
  }
}
// Thyroid size relative to normal from how hard TSH is pushing (illustrative).
const goitreOf = (tsh) => 1 + 2.2 * clamp((tsh - 1) / (tsh + 2), 0, 1);

export default {
  id: 'growth',
  short: 'Growth and change',
  title: 'Hormones that grow you up',
  subtitle: 'Growth hormone, thyroid hormone, puberty, melatonin, and the iodine in your salt.',
  view: TOPIC.growth.view,
  learn: `<p>Some hormones act in seconds. Others work slowly for <b>years</b> and shape who you become.</p>
    <p><b>Growth hormone</b> from the pituitary makes your bones and muscles grow. It works through the <b>growth plates</b> near the ends of long bones (SkeletonClear shows them). It is released in bursts, the biggest in <b>deep sleep</b>, one more reason sleep matters. <b>Thyroid hormone</b> is needed too: it sets how fast your cells burn fuel and helps the brain and bones develop.</p>
    <p><b>Puberty</b> starts in the brain. Usually somewhere between about 8 and 13 in girls and 9 and 14 in boys, the hypothalamus starts sending pulses of <b>GnRH</b>. The pituitary answers with <b>LH</b> and <b>FSH</b>, which wake up the <b>ovaries</b> (making <b>oestrogen</b> and progesterone) or the <b>testes</b> (making <b>testosterone</b>). These bring the growth spurt, body hair, a deeper voice in boys and periods in girls. Everyone's timing is different, and that is normal.</p>
    <p>At night the <b>pineal</b> gland makes <b>melatonin</b>, the "it's dark, time to sleep" signal. Bright <b>screens</b> late at night can push it later and lower it, which makes it harder to fall asleep. Teenagers need about 8 to 10 hours of sleep.</p>
    <p>The thyroid needs <b>iodine</b> to make thyroxine: each molecule carries four iodine atoms. Without enough, the thyroid swells into a <b>goitre</b>, and children's growth and learning can suffer. That is why India adds iodine to salt: the <b>iodised salt</b> programme began in 1962, and since 1992 all salt for eating is meant to be iodised.</p>
    <p class="tip"><b>Try it:</b> slide the age from 0 to 20 and watch the figure grow, then switch to Puberty. Try Sleep with screens on and off, and slide the iodine down to see a goitre form.</p>`,
  terms: [
    { t: 'Growth hormone', d: 'A pituitary hormone that drives growth of bones and muscles, mostly released in deep sleep.' },
    { t: 'Growth plate', d: 'A layer of cartilage near the end of a long bone where it grows; it closes after puberty.' },
    { t: 'Puberty', d: 'The years when the body matures, started by GnRH, LH and FSH.' },
    { t: 'Oestrogen and testosterone', d: 'Sex hormones from the ovaries and testes that drive the changes of puberty.' },
    { t: 'Melatonin', d: 'The night-time hormone from the pineal gland that helps set your sleep clock.' },
    { t: 'Goitre', d: 'A swollen thyroid, often from too little iodine in the diet.' },
  ],
  defaults: { topic: 'growth', age: 8, sex: 'f', hour: 22, screens: false, iodine: 150, labels: true },
  controls: [
    { key: 'topic', type: 'seg', label: 'Topic', options: Object.entries(TOPIC).map(([v, t]) => ({ v, label: t.label })) },
    { key: 'age', type: 'range', label: 'Age (growth and puberty)', min: 0, max: 20, step: 0.1, ends: ['newborn', '20 years'], fmt: (v) => (v < 1 ? Math.round(v * 12) + ' months' : v.toFixed(1) + ' years') },
    { key: 'sex', type: 'seg', label: 'Body', options: [{ v: 'f', label: 'Girl' }, { v: 'm', label: 'Boy' }] },
    { key: 'hour', type: 'range', label: 'Time of night (sleep)', min: 12, max: 36, step: 0.1, ends: ['noon', 'next noon'], fmt: (v) => fmtHour(v) },
    { key: 'screens', type: 'toggle', label: 'Bright screens late at night' },
    { key: 'iodine', type: 'range', label: 'Iodine in the diet (iodine)', min: 5, max: 300, step: 1, ends: ['very little', 'plenty'], fmt: (v) => Math.round(v) + ' µg a day' },
    { key: 'go', type: 'buttons', label: 'Salt', items: [{ label: 'Plain salt, low-iodine food', act: (s) => { s.topic = 'iodine'; s.iodine = 35; } }, { label: 'Iodised salt', act: (s) => { s.topic = 'iodine'; s.iodine = 160; } }] },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'When is most growth hormone released?', options: ['During deep sleep', 'Right after lunch', 'While running', 'Only on birthdays'], answer: 0, why: 'Growth hormone comes in pulses, and the biggest one usually comes in the first deep sleep of the night.' },
    { q: 'Which gland starts puberty?', options: ['The thyroid', 'The hypothalamus, by pulsing GnRH', 'The thymus', 'The adrenal medulla'], answer: 1, why: 'The hypothalamus sends GnRH to the pituitary, which releases LH and FSH to wake up the ovaries or testes.' },
    { q: 'Why does India add iodine to salt?', options: ['To make it taste better', 'The thyroid needs iodine to make thyroxine', 'To keep it dry', 'To lower blood pressure'], answer: 1, why: 'Thyroxine carries four iodine atoms. Too little iodine causes goitre and can harm growth and learning.' },
  ],
  reel: [
    { ms: 5600, caption: 'Growth hormone, thyroid hormone and, later, puberty hormones grow a baby into an adult.', set: { topic: 'growth', sex: 'f', labels: false }, anim: { age: [0.2, 19] }, view: { pos: [0.3, 9.0, 21], target: [0.1, 8.6, 0] }, spin: 0.35 },
  ],

  onChange(s, key) {
    if (key === 'hour' || key === 'screens') s.topic = 'sleep';
    if (key === 'iodine') s.topic = 'iodine';
    if (key === 'age' && s.topic !== 'puberty') s.topic = 'growth';
  },

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { labels: false, organs: false, sex: 'f' });
    root.add(body.root); body.setXray(1);
    // a phone for the screens story
    const phone = new THREE.Group();
    const ph = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.8, 0.05), new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4 }));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.72), glowMat(0x9fd0ff, 1.4)); scr.position.z = 0.03;
    phone.add(ph, scr); phone.position.set(1.1, 14.9, 1.5); phone.rotation.set(-0.2, -0.5, 0); root.add(phone);
    const phoneLight = new THREE.PointLight(0x9fd0ff, 0, 5); phoneLight.position.set(1.0, 15.2, 1.6); root.add(phoneLight);
    // labels
    const L = (h, p, c, par = root) => tint(stage.label(h, p, par), c);
    const lab = { pit: L('', [1.9, 16.1, 0.2], 'gold', body.fig.head), gon: L('', [2.0, 8.9, 0.2], 'cyan', body.fig.body), thy: L('', [1.5, 14.45, 0.3], 'orange', body.fig.body), pin: L('', [1.9, 17.3, -0.3], 'purple', body.fig.head), height: L('', [-2.2, 3, 0.5], 'gold') };
    // head-local positions for head labels
    lab.pit.position.set(1.4, 0.5, 0.2); lab.pin.position.set(0.5, 2.4, -0.3);
    const ct = canvasTexture(600, 600, drawBoard);
    const bd = board(ct, 7.4, 7.4); root.add(bd);
    const thyroidGroup = body.G.thyroid;
    let lastTopic = '', lastSex = 'f', redraw = 0, tsh = 1, size = 1;
    const fit = fitNarrow(stage, { pos: [0, 9.2, 21], target: [0, 8.8, 0] });
    const place = (topic) => {
      if (topic === 'growth' || topic === 'puberty') { bd.position.set(-7.2, 7.0, 0.3); bd.scale.setScalar(1); }
      else { bd.position.set(-3.9, topic === 'sleep' ? 14.6 : 14.3, 0.4); bd.scale.setScalar(0.58); }
    };
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const narrow = fit();
        if (s.topic !== lastTopic) { lastTopic = s.topic; place(s.topic); if (!inReel() && !narrow) stage.setView(TOPIC[s.topic].view.pos, TOPIC[s.topic].view.target, 1.0); }
        if (s.sex !== lastSex) { lastSex = s.sex; body.setSex(s.sex); }
        // size: grow with age in growth/puberty; a 15-year-old otherwise
        const age = s.topic === 'growth' || s.topic === 'puberty' ? s.age : 15;
        const hcm = heightAt(s.sex, age);
        body.setSize(hcm, headFrac(age));
        // glows
        const m = body.mats, dimAll = (keep) => ['hypo', 'pit', 'pineal', 'thyroid', 'para', 'thymus', 'adrenal', 'islets', 'gonads'].forEach((id) => { const on = keep.includes(id); m[id].transparent = !on; m[id].opacity = on ? 1 : 0.25; m[id].emissiveIntensity = on ? m[id].emissiveIntensity : 0.05; });
        const pulse = 0.5 + 0.5 * Math.sin(time * 3);
        let mel = 3;
        if (s.topic === 'growth') {
          dimAll(['pit', 'thyroid', 'thymus']);
          m.pit.emissiveIntensity = 0.4 + 0.8 * ghOf(s.sex, age) * pulse; m.thyroid.emissiveIntensity = 0.6; m.thymus.emissiveIntensity = 0.3 + 0.5 * (1 - smooth((age - 12) / 8));
        } else if (s.topic === 'puberty') {
          dimAll(['hypo', 'pit', 'gonads']);
          m.hypo.emissiveIntensity = 0.3 + 0.8 * lhOf(s.sex, age) * pulse; m.pit.emissiveIntensity = 0.3 + 0.8 * lhOf(s.sex, age); m.gonads.emissiveIntensity = 0.15 + 1.2 * sexHorm(s.sex, age);
        } else if (s.topic === 'sleep') {
          dimAll(['pineal', 'pit']);
          mel = melatonin(s.hour, s.screens);
          m.pineal.emissiveIntensity = 0.1 + 2.0 * mel / 73; m.pit.emissiveIntensity = 0.3;
        } else {
          dimAll(['thyroid', 'pit']);
          m.thyroid.emissiveIntensity = 0.5; m.pit.emissiveIntensity = 0.3 + 0.6 * clamp((tsh - 1) / 3, 0, 1) * pulse;
        }
        // thyroid size (goitre) eases towards the iodine steady state
        const tgt = s.topic === 'iodine' ? thyroidSteady(iodineStrength(s.iodine)) : { TSH: 1, T4: 1 };
        tsh += (tgt.TSH - tsh) * Math.min(1, dt * 2);
        size += (goitreOf(tsh) - size) * Math.min(1, dt * 1.5);
        thyroidGroup.children.forEach((c) => { c.scale.copy(c.userData.s0).multiplyScalar(Math.pow(size, 0.7)); });
        // phone
        phone.visible = s.topic === 'sleep' && s.screens && s.hour >= 19 && s.hour <= 25.5;
        phoneLight.intensity = phone.visible ? 3 : 0;
        // labels
        const on = s.labels && !inReel() && !narrow;
        lab.pit.element.textContent = s.topic === 'growth' ? 'Pituitary: growth hormone' : s.topic === 'puberty' ? 'Pituitary: LH and FSH' : s.topic === 'iodine' ? `Pituitary: TSH ×${tsh.toFixed(1)}` : 'Pituitary';
        lab.gon.element.textContent = s.sex === 'f' ? 'Ovaries: oestrogen' : 'Testes: testosterone';
        lab.thy.element.textContent = s.topic === 'iodine' ? `Thyroid: ${size > 1.3 ? 'swelling (goitre)' : 'normal size'}` : 'Thyroid: pace of growth';
        lab.pin.element.textContent = `Pineal: melatonin ${Math.round(mel)} pg/mL`;
        lab.height.element.textContent = `${Math.round(hcm)} cm`;
        lab.height.position.set(-1.6, hcm / 10 + 0.4, 0.3);
        lab.pit.visible = on; lab.gon.visible = on && s.topic === 'puberty'; lab.thy.visible = on && (s.topic === 'growth' || s.topic === 'iodine'); lab.pin.visible = on && s.topic === 'sleep';
        lab.height.visible = on && (s.topic === 'growth' || s.topic === 'puberty');
        bd.visible = !narrow || inReel();
        if (bd.visible && (redraw -= dt) <= 0) { redraw = 0.2; ct.redraw({ s: { ...s } }); }
      },
      readout: (s) => {
        if (s.topic === 'growth' || s.topic === 'puberty') {
          const age = s.age, h = heightAt(s.sex, age), gv = growthRate(s.sex, age);
          if (s.topic === 'growth') return `<div class="big">Age ${age < 1 ? Math.round(age * 12) + ' months' : age.toFixed(1)}: about ${Math.round(h)} cm</div>
            <div class="row"><span>Growing</span><b>about ${gv.toFixed(1)} cm a year</b></div>
            <div class="row"><span>Head's share of height</span><b>about 1/${Math.round(1 / headFrac(age))}</b></div>
            <div class="row"><span>Growth plates</span><b>${age < (s.sex === 'f' ? 15 : 17) ? 'open, still growing' : 'closing or closed'}</b></div>
            <small>Median heights from the WHO growth charts. Healthy children vary a lot.</small>`;
          const st = age < onset(s.sex) - 2 ? 'not started yet' : age < onset(s.sex) + 3 ? 'under way' : age < onset(s.sex) + 6 ? 'finishing' : 'done';
          return `<div class="big">Puberty: ${st}</div>
            <div class="row"><span>Usual start</span><b>${s.sex === 'f' ? '8–13 in girls' : '9–14 in boys'}</b></div>
            <div class="row"><span>Pituitary sends</span><b>LH and FSH</b></div>
            <div class="row"><span>${s.sex === 'f' ? 'Ovaries make' : 'Testes make'}</span><b>${s.sex === 'f' ? 'oestrogen, progesterone' : 'testosterone'}</b></div>
            <small>${s.sex === 'f' ? 'Growth spurt usually early; periods often start around 12–13.' : 'Growth spurt usually later, around 13–15; the voice deepens.'}</small>`;
        }
        if (s.topic === 'sleep') {
          const mel = melatonin(s.hour, s.screens);
          return `<div class="big">${fmtHour(s.hour)}: melatonin ${Math.round(mel)} pg/mL</div>
            <div class="row"><span>Pineal gland</span><b>${mel > 30 ? 'busy: night signal on' : mel > 8 ? 'starting up' : s.hour > 19 && s.hour < 31 ? 'waiting for darkness' : 'resting (daylight)'}</b></div>
            <div class="row"><span>Evening screens</span><b>${s.screens ? 'on: melatonin later and lower' : 'off'}</b></div>
            <div class="row"><span>Teen sleep need</span><b>about 8–10 hours</b></div>`;
        }
        const r = thyroidSteady(iodineStrength(s.iodine)), need = 150;
        return `<div class="big">Iodine ${Math.round(s.iodine)} µg a day: ${s.iodine >= need ? 'enough' : s.iodine >= 100 ? 'a bit low' : s.iodine >= 50 ? 'too low' : 'far too low'}</div>
          <div class="row"><span>TSH · T4</span><b>×${r.TSH.toFixed(1)} · ${Math.round(r.T4 * 100)}% of normal</b></div>
          <div class="row"><span>Thyroid size</span><b>about ${Math.round(14 * goitreOf(r.TSH))} mL${goitreOf(r.TSH) > 1.4 ? ': a goitre' : ''}</b></div>
          <div class="row"><span>Iodised salt carries</span><b>at least 15 µg per gram</b></div>`;
      },
    });
  },
};
