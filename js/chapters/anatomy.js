// Chapter 1: the endocrine glands in a ghosted body. Nine glands (or gland groups): hypothalamus,
// pituitary, pineal, thyroid, parathyroids, thymus, adrenals, the pancreatic islets, and the ovaries
// or testes. Explode lines them up beside the body; X-ray fades the skin; click a gland (or pick one)
// to see where it is, what it makes and how big it is. Sizes and positions: see the top of endo.js.
// Numbers in the readout:
//  - "more than 50 hormones" (Endocrine Society, "Hormones and Endocrine Function", endocrine.org;
//    NIH MedlinePlus "Endocrine glands");
//  - the glands together are small: the pituitary about 0.5 g, the thyroid about 20 g, each adrenal
//    about 4–5 g; the islets are only 1–2% of an 80 g pancreas (Guyton & Hall 14th ed., ch. 76–80);
//  - other organs also make hormones: heart (ANP), kidneys (EPO, renin), stomach and gut (gastrin,
//    secretin, ghrelin), fat (leptin), skin (vitamin D, which the kidneys finish into calcitriol).
import { THREE } from '../kit.js';
import { makeBody, GLANDS, GL, sideLabels, fitNarrow, compactReadout, inReel, tint } from '../endo.js';
import { toast } from '../ui.js';

const FOCUS = [{ v: 'all', label: 'All' }, ...GLANDS.map((g) => ({ v: g.id, label: { hypo: 'Hypothal.', pit: 'Pituitary', pineal: 'Pineal', thyroid: 'Thyroid', para: 'Parathyr.', thymus: 'Thymus', adrenal: 'Adrenals', islets: 'Islets', gonads: 'Gonads' }[g.id] }))];
const LINK = { islets: 'PancreasClear', adrenal: 'KidneyClear' };

export default {
  id: 'anatomy',
  short: 'The glands',
  title: 'Glands that talk through your blood',
  subtitle: 'Nine small glands, from your brain to your belly, run a chemical postal service.',
  view: { pos: [-1.3, 11.5, 14.5], target: [-2.6, 11.2, 0] },
  learn: `<p>Your <b>endocrine system</b> is a set of <b>glands</b> that make <b>hormones</b>: chemical messages that travel in your <b>blood</b>. We are facing the person, so their <b>right</b> side is on <b>your left</b>.</p>
    <p>In the head, the <b>hypothalamus</b> at the floor of the brain is the boss. Just under it, on a thin stalk, hangs the pea-sized <b>pituitary</b>, often called the <b>master gland</b> because its hormones switch other glands on. Deep in the middle of the brain sits the tiny <b>pineal</b> gland, which makes <b>melatonin</b> at night.</p>
    <p>In the neck, the butterfly-shaped <b>thyroid</b> sets how fast your cells burn fuel. Four rice-sized <b>parathyroids</b> on its back keep your blood <b>calcium</b> steady. Behind the breastbone, the <b>thymus</b> helps train immune cells while you are young, then slowly shrinks.</p>
    <p>Lower down, an <b>adrenal</b> gland sits on top of each kidney, making <b>cortisol</b> and <b>adrenaline</b>. Tiny <b>islets</b> scattered through the pancreas make <b>insulin</b> and <b>glucagon</b> (PancreasClear shows them up close). Finally, the <b>ovaries</b> or <b>testes</b> make the hormones that drive puberty.</p>
    <p>Glands like these have <b>no tubes</b>: they pour hormones straight into the blood. That is what "endocrine" means, "secreting inside". Many organs join in too: the kidneys make EPO and renin (KidneyClear), the heart, stomach and fat make hormones, and your skin makes vitamin D (SkinClear).</p>
    <p class="tip"><b>Try it:</b> take the glands out to see them bigger, then click any gland to see what it makes. Switch the body between ovaries and testes, and turn on "Other hormone makers".</p>`,
  terms: [
    { t: 'Endocrine gland', d: 'A gland with no tube that releases its hormones straight into the blood.' },
    { t: 'Hormone', d: 'A chemical message made in one place and carried by the blood to cells elsewhere.' },
    { t: 'Hypothalamus', d: 'A small part of the brain that links the nervous system to the endocrine system.' },
    { t: 'Pituitary', d: 'The pea-sized "master gland" under the brain whose hormones control other glands.' },
    { t: 'Thyroid', d: 'The butterfly gland in the neck that sets your body’s pace, or metabolism.' },
    { t: 'Adrenal glands', d: 'Two glands on top of the kidneys that make cortisol, aldosterone and adrenaline.' },
    { t: 'Exocrine gland', d: 'A gland that uses a tube, like a sweat or salivary gland. The opposite of endocrine.' },
  ],
  defaults: { explode: 0, xray: true, labels: true, sex: 'f', focus: 'all', others: false },
  controls: [
    { key: 'explode', type: 'range', label: 'Take the glands out', min: 0, max: 1, step: 0.01, ends: ['in the body', 'out and enlarged'], fmt: (v) => Math.round(v * 100) + '%' },
    { key: 'xray', type: 'toggle', label: 'X-ray: see through the skin' },
    { key: 'focus', type: 'seg', label: 'Spotlight', options: FOCUS, fmt: (v) => (v === 'all' ? 'every gland' : GL[v].name) },
    { key: 'sex', type: 'seg', label: 'Body', options: [{ v: 'f', label: 'Ovaries' }, { v: 'm', label: 'Testes' }] },
    { key: 'others', type: 'toggle', label: 'Other hormone makers' },
    { key: 'labels', type: 'toggle', label: 'Labels' },
  ],
  quiz: [
    { q: 'How do hormones get from a gland to the cells they act on?', options: ['Along nerves', 'In the blood', 'Through tubes called ducts', 'Through the air we breathe'], answer: 1, why: 'Endocrine glands have no ducts. They release hormones straight into the blood, which carries them everywhere.' },
    { q: 'Which gland is called the "master gland"?', options: ['The thyroid', 'The pituitary', 'The pancreas', 'The thymus'], answer: 1, why: 'The pea-sized pituitary makes hormones that switch on the thyroid, adrenals and ovaries or testes. The hypothalamus above it is its boss.' },
    { q: 'Where are the adrenal glands?', options: ['In the neck', 'On top of the kidneys', 'Inside the brain', 'Behind the knees'], answer: 1, why: 'One sits like a cap on top of each kidney. They make cortisol, aldosterone and adrenaline.' },
  ],
  reel: [
    { ms: 5200, caption: 'Your endocrine system is a set of small glands that send chemical messages through your blood.', set: { explode: 0, xray: true, labels: false, focus: 'all', others: false }, view: { pos: [0.4, 11.4, 21], target: [0, 11.2, 0] }, spin: 0.5 },
    { ms: 5200, caption: 'From the brain to the belly: pituitary, thyroid, adrenals, pancreas islets, ovaries or testes.', set: { xray: true, labels: false, focus: 'all' }, anim: { explode: [0, 1] }, view: { pos: [0.3, 11.6, 23], target: [0.1, 11.4, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const root = new THREE.Group(); stage.root.add(root);
    const body = makeBody(stage, { others: true, sex: 'f' });
    root.add(body.root);
    const sides = sideLabels(stage, root, 6.6, 2.6, 1.4);
    stage.pickables.push(...body.meshes);
    let xr = 1, t = 0, sel = null, selT = -9, lastSex = 'f', lastToast = -9;
    const mats = body.mats;
    const fit = fitNarrow(stage, { pos: [0, 11.6, 10.5], target: [0, 11.2, 0] });
    return compactReadout(stage, {
      pick(o) {
        const id = o?.userData?.gland;
        if (!id) return;
        sel = id; selT = t;
        if (LINK[id] && t - lastToast > 1) { lastToast = t; toast(id === 'islets' ? 'The islets have their own box. <a href="/pancreasclear/">Open PancreasClear</a> for insulin and glucagon up close.' : 'The adrenals sit on the kidneys. <a href="/kidneyclear/">KidneyClear</a> shows how kidneys use renin and EPO.'); }
      },
      update(dt, s, time) {
        dt = Math.max(0, dt); t = time;
        if (s.sex !== lastSex) { lastSex = s.sex; body.setSex(s.sex); if (body.labelOf.gonads) body.labelOf.gonads.element.textContent = s.sex === 'm' ? 'Testes' : 'Ovaries'; }
        xr += ((s.xray ? 1 : 0) - xr) * Math.min(1, dt * 5);
        body.setXray(xr);
        body.setExplode(s.explode);
        body.skinMat.opacity *= 1 - 0.65 * Math.min(1, s.explode * 1.4);
        const focus = s.focus !== 'all' ? s.focus : (t - selT < 6 ? sel : null);
        GLANDS.forEach((g, i) => {
          const on = !focus || focus === g.id;
          const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 0.7);
          mats[g.id].emissiveIntensity = on ? 0.45 + (focus ? 0.7 : 0.25) * pulse : 0.08;
          mats[g.id].opacity = on ? 1 : 0.35; mats[g.id].transparent = !on;
        });
        const narrow = fit();
        const on = s.labels && !inReel() && !narrow;
        body.labels.forEach((l) => { const id = Object.keys(body.labelOf).find((k) => body.labelOf[k] === l); l.visible = on && (!focus || focus === id); });
        body.showOthers(s.others && s.explode < 0.3);
        body.otherLabels.forEach((l) => { l.visible = s.others && s.explode < 0.3 && !inReel() && !narrow; });
        sides.forEach((l) => { l.visible = on && s.explode < 0.3; });
      },
      readout: (s) => {
        const id = s.focus !== 'all' ? s.focus : (t - selT < 6 ? sel : null);
        if (id) {
          const g = GL[id];
          return `<div class="big">${g.name}</div>
            <div class="row"><span>Where</span><b>${g.where}</b></div>
            <div class="row"><span>Makes</span><b>${g.makes}</b></div>
            <div class="row"><span>Size</span><b>${g.size}</b></div>
            <small>${id === 'islets' ? 'See PancreasClear for insulin and glucagon in depth.' : id === 'gonads' ? 'Their hormones drive puberty: see chapter 5.' : 'Click another gland, or pick one under Spotlight.'}</small>`;
        }
        return `<div class="big">Nine glands, more than 50 hormones</div>
          <div class="row"><span>Pituitary</span><b>about 0.5 g, pea-sized</b></div>
          <div class="row"><span>Thyroid</span><b>about 20 g</b></div>
          <div class="row"><span>Each adrenal</span><b>about 4–5 g</b></div>
          <div class="row"><span>Pancreas islets</span><b>about 1 million, 1–2% of it</b></div>
          <div class="row"><span>How messages travel</span><b>in the blood</b></div>
          <small>${s.explode > 0.4 ? 'Pulled out in front and shown almost twice as big. Real glands are small: most weigh a few grams.' : 'Click any glowing gland to see what it makes.'}</small>`;
      },
    });
  },
};
