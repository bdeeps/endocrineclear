// Chapter 6: looking after your hormones. A ghosted body shows which gland is involved in each common
// problem, with the signs to notice, what a doctor may check, and how it is usually looked after.
// Always "see a doctor": no diagnosis and no doses.
// Sources:
//  - Diabetes in India: about 101 million people with diabetes (11.4%) and 136 million with
//    prediabetes (15.3%) in 2021 (ICMR-INDIAB, Anjana et al., Lancet Diabetes Endocrinol 11:474,
//    2023). Diagnosis thresholds: fasting glucose ≥ 126 mg/dL or HbA1c ≥ 6.5% (ADA Standards of
//    Care; WHO). Type 1: the immune system destroys the beta cells; type 2: insulin works poorly and
//    too little is made, about 90% of cases (WHO fact sheet "Diabetes", 2024). See PancreasClear.
//  - Hypothyroidism: about 11% of adults in a study of eight Indian cities, a third of them not yet
//    diagnosed (Unnikrishnan et al., Indian J Endocrinol Metab 17:647, 2013). Babies can be born
//    with it: about 1 in 2,000–4,000 worldwide, and about 1 in 1,100 in an Indian newborn screening
//    study (ICMR Task Force, Indian J Pediatr 85:935, 2018); a heel-prick test finds it early.
//  - Hyperthyroidism: most often Graves' disease, an autoimmune condition (NIDDK "Hyperthyroidism").
//  - Goitre: iodine deficiency is the most common cause worldwide and the world's leading preventable
//    cause of brain damage (WHO); in India 94.3% of households used iodised salt in 2019–21 (NFHS-5).
//  - Growth: growth hormone deficiency is rare (roughly 1 in 3,500 to 1 in 10,000 children); too much
//    growth hormone, usually from a benign pituitary tumour, causes gigantism in children and
//    acromegaly in adults (NIDDK; NHS). Most short children are healthy and simply take after their
//    family; a doctor looks at the growth chart over time.
//  - PCOS: a common hormone condition affecting the ovaries (WHO fact sheet "Polycystic ovary
//    syndrome", 2023: an estimated 8–13% of women of reproductive age).
import { THREE, clamp, lerp, canvasTexture } from '../kit.js';
import { makeBody, tint, fitNarrow, compactReadout, inReel, board, panel, text, wrap, chart, pathOf, smoothPts, flow, heightAt, COL } from '../endo.js';

const COND = {
  diabetes: {
    label: 'Diabetes', title: 'Diabetes', gland: ['islets'], col: '#6ee7a8',
    what: 'Blood sugar stays too high because the body makes too little insulin (type 1) or insulin does not work well (type 2).',
    signs: 'Very thirsty, passing urine often, tired, losing weight without trying, cuts that heal slowly.',
    check: 'A blood test: fasting glucose or HbA1c.',
    care: 'Doctors help with food, activity and medicines or insulin. Type 1 always needs insulin.',
    stat: ['People with diabetes in India', 'about 101 million (2021)'],
  },
  hypo: {
    label: 'Underactive thyroid', title: 'Hypothyroidism', gland: ['thyroid', 'pit'], col: '#ff8a5c',
    what: 'The thyroid makes too little thyroxine, so the body runs slow. TSH rises as the pituitary shouts louder.',
    signs: 'Tired, feeling cold, weight gain, dry skin, constipation, low mood; in children, slow growth.',
    check: 'A blood test for TSH and T4. For newborns, a heel-prick test.',
    care: 'Usually a daily tablet of thyroid hormone, as a doctor prescribes, with regular blood tests.',
    stat: ['Indian adults affected', 'about 1 in 10'],
  },
  hyper: {
    label: 'Overactive thyroid', title: 'Hyperthyroidism', gland: ['thyroid'], col: '#ff8a5c',
    what: 'The thyroid makes too much thyroxine, so the body runs fast. Graves’ disease is the most common cause.',
    signs: 'Racing heart, weight loss, shaky hands, feeling hot and sweaty, worried or restless, sometimes bulging eyes.',
    check: 'A blood test: TSH is low and T4 is high.',
    care: 'Doctors may use medicines, radioactive iodine or surgery, depending on the cause.',
    stat: ['Most common cause', 'Graves’ disease (autoimmune)'],
  },
  goitre: {
    label: 'Goitre', title: 'Goitre', gland: ['thyroid'], col: '#ffd166',
    what: 'A swollen thyroid. Worldwide the main cause is too little iodine; other thyroid problems can cause it too.',
    signs: 'A swelling at the front of the neck; sometimes trouble swallowing or a tight feeling.',
    check: 'A doctor examines the neck and may order blood tests or an ultrasound scan.',
    care: 'Iodised salt prevents the iodine kind. Any neck lump should be checked by a doctor.',
    stat: ['Indian homes using iodised salt', '94% (NFHS-5, 2019–21)'],
  },
  growth: {
    label: 'Growth problems', title: 'Growth disorders', gland: ['pit', 'thyroid'], col: '#c9a7ff',
    what: 'Too little growth hormone (rare) slows growth; too much, usually from a harmless pituitary tumour, causes very tall growth.',
    signs: 'A child who keeps falling behind on the growth chart, or grows unusually fast. Most short children are just healthy and short.',
    check: 'Height measured over time on a growth chart, then blood tests and a hand X-ray for bone age.',
    care: 'Specialist doctors find the cause; some children are treated with growth hormone.',
    stat: ['Growth hormone deficiency', 'about 1 in 3,500–10,000 children'],
  },
};

function drawBoard(g, w, h, c) {
  panel(g, w, h);
  if (!c) return;
  text(g, c.title, 30, 58, 40, c.col, 600);
  let y = wrap(g, c.what, 30, 104, w - 60, 27, '#e9edf5', 1.25, 400) + 14;
  [['Signs to notice', c.signs, '#ff9fc0'], ['What a doctor may check', c.check, '#8ef0ff'], ['How it is looked after', c.care, '#6ee7a8']].forEach(([k, v, col]) => {
    text(g, k, 30, y, 28, col, 600); y = wrap(g, v, 30, y + 34, w - 60, 26, '#cfd6e4', 1.25) + 16;
  });
  g.fillStyle = 'rgba(255,209,102,.12)'; g.fillRect(20, h - 74, w - 40, 52);
  text(g, 'Worried? See a doctor.', 40, h - 38, 30, '#ffd166', 600);
}

export default {
  id: 'health',
  short: 'Keeping it healthy',
  title: 'When hormones go wrong',
  subtitle: 'Diabetes, thyroid problems, goitre and growth disorders: what to notice, and why to see a doctor.',
  view: { pos: [-1.3, 12.6, 11.2], target: [-2.6, 12.3, 0] },
  learn: `<p>Because hormones reach the whole body, a gland that makes <b>too much</b> or <b>too little</b> can cause changes almost anywhere. The good news: most hormone problems can be found with a <b>blood test</b> and looked after well. This chapter explains common ones; it cannot tell you what is happening in your own body. For that, <b>see a doctor</b>.</p>
    <p><b>Diabetes</b> means blood sugar stays too high. In <b>type 1</b>, the immune system destroys the insulin-making cells, often in childhood, so insulin is needed for life. In <b>type 2</b>, the most common kind, insulin works poorly and too little is made. India has about <b>101 million</b> people with diabetes (ICMR-INDIAB, 2023) and many more at risk; being active, eating well and keeping a healthy weight lower the risk. PancreasClear tells this story in depth.</p>
    <p>The thyroid can be <b>underactive</b> (hypothyroidism: tired, cold, slow) or <b>overactive</b> (hyperthyroidism: racing heart, weight loss, shaky). About 1 in 10 Indian adults has an underactive thyroid. Many hospitals check newborns with a heel-prick blood test, because an underactive thyroid at birth harms growth and learning if it is missed. A <b>goitre</b> is a swollen thyroid, most often from too little iodine.</p>
    <p><b>Growth disorders</b> are rare: too little growth hormone slows growth, and too much makes a child grow very tall. Most short children are simply healthy and short, like their parents. <b>PCOS</b> (polycystic ovary syndrome) is a common hormone condition that can cause irregular periods; it is another reason to talk to a doctor.</p>
    <p>Never start, stop or share hormone medicines without a doctor. Hormones are powerful at tiny amounts.</p>
    <p class="tip"><b>Try it:</b> pick each problem and see which gland is involved, how the body changes, and what a doctor would check.</p>`,
  terms: [
    { t: 'Diabetes', d: 'A condition where blood sugar stays too high because of too little insulin or insulin that works poorly.' },
    { t: 'HbA1c', d: 'A blood test that shows your average blood sugar over the past 2 to 3 months.' },
    { t: 'Hypothyroidism', d: 'An underactive thyroid: too little thyroxine, so the body runs slow.' },
    { t: 'Hyperthyroidism', d: 'An overactive thyroid: too much thyroxine, so the body runs fast.' },
    { t: 'Autoimmune', d: 'When the immune system attacks the body’s own tissue, as in type 1 diabetes and Graves’ disease.' },
    { t: 'PCOS', d: 'Polycystic ovary syndrome: a common hormone condition that can cause irregular periods.' },
  ],
  defaults: { cond: 'diabetes', labels: true },
  controls: [
    { key: 'cond', type: 'seg', label: 'Show', options: Object.entries(COND).map(([v, c]) => ({ v, label: c.label })), fmt: (v) => COND[v].title },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'In type 1 diabetes, what goes wrong?', options: ['The immune system destroys the insulin-making cells', 'The thyroid gets bigger', 'The body makes too much insulin', 'The kidneys stop working'], answer: 0, why: 'Type 1 is autoimmune: the beta cells in the islets are destroyed, so insulin is needed for life.' },
    { q: 'Someone is always tired and cold, and their TSH is high. Which gland might be underactive?', options: ['The thyroid', 'The adrenal medulla', 'The pineal', 'The thymus'], answer: 0, why: 'A high TSH means the pituitary is shouting at a thyroid that is not keeping up: hypothyroidism. Only a doctor can diagnose it.' },
    { q: 'What prevents the most common kind of goitre?', options: ['Sugar', 'Iodised salt', 'Sleeping less', 'Vitamin C'], answer: 1, why: 'Too little iodine is the main cause of goitre worldwide. Iodised salt fixes that.' },
  ],
  reel: [
    { ms: 5400, caption: 'Too much or too little of one hormone can make you ill; a swollen thyroid usually means too little iodine.', set: { cond: 'goitre', labels: false }, view: { pos: [0.3, 14.8, 6.5], target: [0, 14.6, 0] }, spin: 0.25 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { labels: false, organs: true });
    root.add(body.root); body.setXray(1);
    const all = ['hypo', 'pit', 'pineal', 'thyroid', 'para', 'thymus', 'adrenal', 'islets', 'gonads'];
    // a short loop of blood over the trunk: glucose particles pile up in diabetes
    const loopPts = [[0.25, 12.4, 0.6], [0.8, 11.6, 0.55], [0.9, 10.0, 0.5], [0.4, 9.3, 0.5], [-0.4, 9.3, 0.5], [-0.9, 10.0, 0.5], [-0.8, 11.6, 0.55], [-0.25, 12.4, 0.6]];
    const loop = pathOf(smoothPts(loopPts, 120, true));
    const glu = flow(loop, 120, COL.glucose, { size: 0.045, jitter: 0.1, seed: 21 }); root.add(glu.mesh);
    const L = (h, p, c, par = root) => tint(stage.label(h, p, par), c);
    const lab = { main: L('', [1.9, 14.9, 0.3], 'orange'), sub: L('', [2.0, 12.9, 0.4], 'red'), pit: L('Pituitary', [1.8, 0.65, 0.2], 'gold', body.fig.head) };
    const ct = canvasTexture(600, 700, drawBoard);
    const bd = board(ct, 5.0, 5.83); bd.position.set(-5.1, 10.75, 0.4); root.add(bd);
    let last = '', beat = 0, k = { size: 1, hr: 72, glow: 0.5, sugar: 0.3 };
    const thy = body.G.thyroid;
    const fit = fitNarrow(stage, { pos: [0, 12.4, 12], target: [0, 12.2, 0] });
    return compactReadout(stage, {
      update(dt, s, time) {
        dt = Math.max(0, dt);
        const c = COND[s.cond], narrow = fit();
        if (last !== s.cond) { last = s.cond; ct.redraw(c); }
        // targets for each condition
        const T = {
          diabetes: { size: 1, hr: 76, glow: 0.5, sugar: 1 },
          hypo: { size: 1.1, hr: 58, glow: 0.12, sugar: 0.3 },
          hyper: { size: 1.25, hr: 115, glow: 1.6, sugar: 0.3 },
          goitre: { size: 2.4, hr: 70, glow: 0.5, sugar: 0.3 },
          growth: { size: 1, hr: 72, glow: 0.5, sugar: 0.3 },
        }[s.cond];
        for (const key in k) k[key] += (T[key] - k[key]) * Math.min(1, dt * 2);
        all.forEach((id) => { const on = c.gland.includes(id); body.mats[id].transparent = !on; body.mats[id].opacity = on ? 1 : 0.2; body.mats[id].emissiveIntensity = on ? 0.5 + 0.5 * Math.sin(time * 3) ** 2 : 0.05; });
        body.mats.thyroid.emissiveIntensity = c.gland.includes('thyroid') ? k.glow * (0.8 + 0.2 * Math.sin(time * 3)) : 0.05;
        thy.children.forEach((m) => m.scale.copy(m.userData.s0).multiplyScalar(k.size));
        beat = (beat + (dt * k.hr) / 60) % 1;
        const b = 1 + 0.09 * Math.exp(-((beat - 0.1) ** 2) / 0.004);
        body.organ.heart.scale.set(0.4 * b, 0.55 * b, 0.36 * b);
        glu.step(dt, k.sugar, 1.2, time);
        const on = s.labels && !inReel() && !narrow;
        lab.main.element.textContent = s.cond === 'diabetes' ? 'Too much sugar in blood' : s.cond === 'growth' ? 'Growth hormone: pituitary' : s.cond === 'goitre' ? 'Swollen thyroid' : s.cond === 'hypo' ? 'Thyroid: too little T4' : 'Thyroid: too much T4';
        lab.main.position.set(...(s.cond === 'diabetes' ? [1.5, 8.8, 0.5] : [1.8, 14.8, 0.3]));
        tint(lab.main, c.col);
        lab.sub.element.textContent = `Heart ${Math.round(k.hr)} a minute`;
        lab.main.visible = on; lab.sub.visible = on && (s.cond === 'hypo' || s.cond === 'hyper');
        lab.pit.visible = on && (s.cond === 'hypo' || s.cond === 'growth');
        bd.visible = !narrow || inReel();
      },
      readout: (s) => {
        const c = COND[s.cond];
        return `<div class="big">${c.title}</div>
          <div class="row"><span>${c.stat[0]}</span><b>${c.stat[1]}</b></div>
          <div class="row"><span>Gland involved</span><b>${c.gland.map((g) => ({ islets: 'pancreas islets', thyroid: 'thyroid', pit: 'pituitary' }[g])).join(', ')}</b></div>
          <div class="row"><span>First step</span><b>see a doctor</b></div>`;
      },
    });
  },
};
