const HEAT = '#a61e4d';
/* =========================================================
   Concept clips: small animations placed next to the ideas
   they explain. Each clip = controls + reset/step/draw.
   ========================================================= */
function makeClip(cfg){
  const root = $(cfg.id); if (!root) return;
  const st = { t: 0, V: {} };
  const reset = () => { st.t = 0; st._lastStat = undefined; cfg.reset && cfg.reset(st); };
  const d = {
    advance(dt){ st.t += dt; cfg.step && cfg.step(st, dt); },
    draw(){ cfg.draw(st); }
  };
  let C = null;
  if (cfg.controls){ C = makeControls(cfg.id + '-ctl', cfg.controls, () => reset()); st.V = C.v; }
  if (cfg.presets) makePresets(cfg.id + '-pre', cfg.presets(C, st, reset));
  if (cfg.buttons !== false) makeButtons(cfg.id + '-btn', d, reset, cfg.speed ?? 0.5, C);
  cfg.setup && cfg.setup(st, reset);
  reset();
  register(root, d);
}
const statsEvery = (st, id, fn, gap = 0.15) => {
  if (st._lastStat !== undefined && Math.abs(st.t - st._lastStat) < gap) return;
  st._lastStat = st.t; setStats(id, fn());
};
const mm = v => fmt(v * 1000) + ' mm';

/* ---------------------------------------------------------
   Ch1 · Newton's law, live: forces on a vibrating mass
   --------------------------------------------------------- */
makeClip({
  id: 'c-fbd',
  controls: [{ key: 'z', label: 'Damping ratio ζ', min: 0, max: 0.5, step: 0.01, value: 0.1, unit: '', dec: 3 }],
  reset(st){
    st.m = 1; st.k = 40; st.x0 = 0.1;
    st.c = 2 * st.V.z * Math.sqrt(st.k * st.m);
    const rt = roots(st.m, st.c, st.k);
    st.tmax = rt.sigma < -1e-6 ? Math.min(5 / -rt.sigma, 14) : 14;
    st._lastStat = undefined;
  },
  step(st){ if (st.t > st.tmax + 1) st.t = 0; },
  draw(st){
    const cv = $('c-fbd-anim'); const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 600, 250]);
    const t = Math.min(st.t, st.tmax);
    const [x, v] = lin2(t, st.m, st.c, st.k, st.x0, 0);
    const Fs = -st.k * x, Fd = -st.c * v, ma = Fs + Fd;
    const s = 1200, eq = 300, bw = 70, cx = eq + x * s, left = cx - bw / 2, fs = 30;
    hatch(ctx, 20, 20, 20, 130, 1); hatch(ctx, 20, 130, 580, 130, 1);
    springLine(ctx, 20, 88, left, 88, 9, 8);
    damperLine(ctx, 20, 113, left, 113, eq - bw / 2 - 20);
    line(ctx, eq, 64, eq, 130, COL.axis, 1, [4, 4]); txt(ctx, 'x = 0', eq, 140, { font: '11px system-ui', color: COL.muted });
    block(ctx, cx, 100, bw, 50, 0, 'm');
    const arr = (y, F, col, lab) => {
      const L = F * fs;
      if (Math.abs(L) > 2){ if (L > 0) arrow(ctx, cx, y, cx + L, y, col, 3); else arrow(ctx, cx - L, y, cx, y, col, 3); }
      else { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx, y, 3, 0, 2 * Math.PI); ctx.fill(); }
      txt(ctx, lab, cx + (L >= 0 ? L + 8 : L - 8), y, { font: '12px system-ui', color: col, align: L >= 0 ? 'left' : 'right' });
    };
    arr(55, Fs, COL.c1, 'spring −kx');
    arr(35, Fd, COL.c4, 'damper −cẋ');
    // balance panel
    const y0 = 175, zx = 300;
    line(ctx, zx, y0 - 12, zx, y0 + 62, COL.axis, 1);
    const bar = (y, F, col, lab) => {
      ctx.fillStyle = col; ctx.globalAlpha = 0.85;
      ctx.fillRect(Math.min(zx, zx + F * fs), y - 7, Math.abs(F * fs), 14); ctx.globalAlpha = 1;
      txt(ctx, lab, 20, y, { font: '12px system-ui', color: COL.fg, align: 'left' });
      txt(ctx, fmt(F, 2) + ' N', 580, y, { font: '12px system-ui', color: COL.muted, align: 'right' });
    };
    bar(y0, Fs, COL.c1, 'Spring force −kx');
    bar(y0 + 22, Fd, COL.c4, 'Damper force −cẋ');
    bar(y0 + 50, ma, COL.c3, 'Sum = m ẍ');
    line(ctx, 150, y0 + 36, 450, y0 + 36, COL.border || COL.axis, 1);
  }
});

/* ---------------------------------------------------------
   Ch1 · Why gravity disappears
   --------------------------------------------------------- */
makeClip({
  id: 'c-gravity',
  controls: [
    { key: 'm', label: 'Mass m', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 20, max: 300, step: 5, value: 100, unit: 'N/m', dec: 1 },
    { key: 'g', label: 'Gravity g', min: 0, max: 25, step: 0.01, value: 9.81, unit: 'm/s²', dec: 2 }
  ],
  presets: C => [
    { label: 'No gravity', apply: () => C.set({ g: 0 }) },
    { label: 'Moon (1.62)', apply: () => C.set({ g: 1.62 }) },
    { label: 'Earth (9.81)', apply: () => C.set({ g: 9.81 }) },
    { label: 'Jupiter (24.8)', apply: () => C.set({ g: 24.79 }) }
  ],
  reset(st){
    const V = st.V; st.ok = V.m > 0 && V.k > 0; st.hist = [];
    if (!st.ok){ setStats('c-gravity-stats', [['Note', 'm and k must be positive']]); return; }
    st.wn = Math.sqrt(V.k / V.m); st.dst = V.m * V.g / V.k; st.a = 0.05;
    st.scaleD = Math.max(V.m * 25 / V.k, Math.abs(st.dst)) + st.a;   // fixed for this m, k so changing g visibly moves the mass
    setStats('c-gravity-stats', [
      ['Static stretch δst = mg/k', fmt(st.dst) + ' m', true],
      ['ωₙ = √(k/m)', fmt(st.wn) + ' rad/s', true],
      ['Period', fmt(2 * Math.PI / st.wn) + ' s'],
      ['Does the period depend on g?', 'No']
    ]);
  },
  step(st){
    if (!st.ok) return;
    st.hist.push([st.t, st.a * Math.cos(st.wn * st.t)]);
    while (st.hist.length > 2 && st.hist[0][0] < st.t - 6) st.hist.shift();
  },
  draw(st){
    const cv = $('c-gravity-anim'), pv = $('c-gravity-plot');
    if (!st.ok){ drawMessage(cv, 'Enter a positive mass and stiffness'); drawMessage(pv, ''); return; }
    const V = st.V, x = st.a * Math.cos(st.wn * st.t);
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 380, 330]);
    const top = 18, L0 = 55, s = 200 / st.scaleD, cx = 110;
    const yU = top + L0, yE = yU + st.dst * s, yM = yE + x * s;
    hatch(ctx, cx - 55, top, cx + 55, top, -1);
    springLine(ctx, cx, top, cx, yM, 10, 10);
    block(ctx, cx, yM + 22, 70, 44, 0, 'm');
    // reference lines
    const ref = (y, lab, col) => { line(ctx, cx + 40, y, 370, y, col, 1.2, [4, 4]); txt(ctx, lab, 370, y - 9, { font: '11px system-ui', color: col, align: 'right' }); };
    if (Math.abs(yE - yU) < 4) ref(yU, 'unstretched = equilibrium (no gravity)', COL.c3);
    else { ref(yU, 'spring unstretched', COL.muted); ref(yE, 'static equilibrium: x = 0', COL.c3); }
    if (Math.abs(yE - yU) > 14){
      arrow(ctx, cx - 62, yU + 8, cx - 62, yE, COL.muted, 1.2); arrow(ctx, cx - 62, yE - 8, cx - 62, yU, COL.muted, 1.2);
      txt(ctx, 'δst', cx - 76, (yU + yE) / 2, { font: 'italic 13px Georgia, serif', color: COL.muted, align: 'right' });
    }
    // forces on the mass (downward positive)
    const cy = yM + 22, fs = 55 / Math.max(V.m * Math.abs(V.g), V.k * st.a, 1e-9);
    const W = V.m * V.g, kd = V.k * st.dst, kx = -V.k * x;
    const vArrow = (X, F, col, lab, side) => {
      const L = F * fs; if (Math.abs(L) < 2) return;
      arrow(ctx, X, cy, X, cy + L, col, 2.5);
      txt(ctx, lab, X + side * 6, cy + L / 2, { font: '12px system-ui', color: col, align: side > 0 ? 'left' : 'right' });
    };
    vArrow(cx + 48, W, COL.c2, 'mg', 1);
    vArrow(cx + 62, -kd, COL.c5, 'kδst', 1);
    vArrow(cx - 48, kx, COL.c1, '−kx', -1);
    if (Math.abs(W) * fs > 2) txt(ctx, 'mg and kδst cancel', cx + 48, cy + Math.max(W * fs, 0) + 18, { font: '11px system-ui', color: COL.muted, align: 'left' });
    const t0 = Math.max(0, st.t - 6), t1 = Math.max(6, st.t);
    const lo = Math.min(-st.a, st.dst - st.a) * 1.25, hi = Math.max(st.a, st.dst + st.a) * 1.25;
    plot(pv, {
      xmin: t0, xmax: t1, ymin: lo, ymax: hi, xlabel: 'time t (s)', ylabel: 'downward position (m)',
      hlines: [{ y: st.dst, color: COL.c3 }],
      series: [{ pts: st.hist.map(p => [p[0], p[1] + st.dst]), color: COL.c2, width: 2, dash: [6, 4] }, { pts: st.hist, color: COL.c1, width: 2.2 }]
    });
  }
});

/* ---------------------------------------------------------
   Ch1 · Springs in parallel and series vs. the equivalent spring
   --------------------------------------------------------- */
makeClip({
  id: 'c-springs',
  controls: [
    { key: 'k1', label: 'Stiffness k₁', min: 10, max: 200, step: 5, value: 100, unit: 'N/m', dec: 1 },
    { key: 'k2', label: 'Stiffness k₂', min: 10, max: 200, step: 5, value: 50, unit: 'N/m', dec: 1 },
    { key: 'F', label: 'Pull force F', min: 1, max: 20, step: 0.5, value: 10, unit: 'N', dec: 2 }
  ],
  presets: (C, st, reset) => [
    { label: 'Parallel', apply: () => { st.mode = 'par'; reset(); } },
    { label: 'Series', apply: () => { st.mode = 'ser'; reset(); } }
  ],
  setup(st){ st.mode = 'par'; },
  reset(st){
    const V = st.V; st.ok = V.k1 > 0 && V.k2 > 0 && V.F > 0;
    document.querySelectorAll('#c-springs-pre .chip').forEach(b => b.classList.toggle('on', (b.textContent === 'Parallel') === (st.mode === 'par')));
    $('c-springs-why').innerHTML = st.mode === 'par'
      ? '<b>Parallel:</b> both springs are fixed to the same plate, so they <b>share the displacement</b>. Each pushes back with its own force, and the forces add: F = k₁δ + k₂δ = (k₁ + k₂)δ. The combination is <b>stiffer than either spring</b>.'
      : '<b>Series:</b> the same force passes through each spring (the joint between them is massless), so they <b>share the force</b>. Each stretches by its own amount, and the stretches add: δ = F/k₁ + F/k₂. The combination is <b>softer than either spring</b>.';
    st._lastStat = undefined;
  },
  draw(st){
    const cv = $('c-springs-anim'); const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    if (!st.ok){ drawMessage(cv, 'Stiffnesses and force must be positive'); return; }
    fitView(ctx, w, h, [0, 0, 560, 330]);
    const V = st.V, F = V.F * 0.5 * (1 - Math.cos(1.1 * st.t));
    const s = 150 / (V.F * (1 / V.k1 + 1 / V.k2)), fs = 70 / V.F, wall = 30;
    const keq = st.mode === 'par' ? V.k1 + V.k2 : 1 / (1 / V.k1 + 1 / V.k2);
    const plate = (x, y0, y1) => { ctx.fillStyle = COL.spring; ctx.fillRect(x, y0, 8, y1 - y0); };
    const pull = (x, y) => { if (F * fs > 2) arrow(ctx, x + 8, y, x + 8 + F * fs, y, COL.c2, 3); txt(ctx, 'F', x + 16 + F * fs, y - 12, { color: COL.c2 }); };
    const lab = (s1, x, y) => txt(ctx, s1, x, y, { font: '12px system-ui', color: COL.muted });
    const labL = (s1, y) => txt(ctx, s1, wall + 14, y, { font: '12px system-ui', color: COL.muted, align: 'left' });
    txt(ctx, st.mode === 'par' ? 'Two springs in parallel' : 'Two springs in series', 10, 14, { font: '600 13px system-ui', align: 'left' });
    let endTop;
    if (st.mode === 'par'){
      const L0 = 120, d = F / keq, px = wall + L0 + d * s;
      hatch(ctx, wall, 45, wall, 150, 1);
      springLine(ctx, wall, 70, px, 70, 8, 8); springLine(ctx, wall, 125, px, 125, 8, 8);
      plate(px, 52, 143); pull(px, 97);
      labL(`k₁: stretch ${mm(d)}, force ${fmt(V.k1 * d, 3)} N`, 48);
      labL(`k₂: stretch ${mm(d)}, force ${fmt(V.k2 * d, 3)} N`, 154);
      line(ctx, wall + L0, 40, wall + L0, 160, COL.axis, 1, [3, 3]);
      endTop = px;
      statsEvery(st, 'c-springs-stats', () => [['k_eq = k₁ + k₂', fmt(keq) + ' N/m', true], ['Shared stretch', mm(d)], ['Forces add', `${fmt(V.k1 * d, 3)} + ${fmt(V.k2 * d, 3)} = ${fmt(F, 3)} N`]]);
    } else {
      const L0 = 85, d1 = F / V.k1, d2 = F / V.k2, n1 = wall + L0 + d1 * s, px = n1 + 14 + L0 + d2 * s;
      hatch(ctx, wall, 60, wall, 135, 1);
      springLine(ctx, wall, 97, n1, 97, 7, 8);
      ctx.fillStyle = COL.c5; ctx.fillRect(n1, 85, 14, 24);
      springLine(ctx, n1 + 14, 97, px, 97, 7, 8);
      plate(px, 70, 124); pull(px, 97);
      lab(`k₁: force ${fmt(F, 3)} N, stretch ${mm(d1)}`, (wall + n1) / 2, 66);
      lab(`k₂: force ${fmt(F, 3)} N, stretch ${mm(d2)}`, (n1 + 14 + px) / 2, 134);
      line(ctx, wall + 2 * L0 + 14, 40, wall + 2 * L0 + 14, 160, COL.axis, 1, [3, 3]);
      endTop = px;
      statsEvery(st, 'c-springs-stats', () => [['k_eq = 1/(1/k₁ + 1/k₂)', fmt(keq) + ' N/m', true], ['Shared force', fmt(F, 3) + ' N'], ['Stretches add', `${mm(d1)} + ${mm(d2)} = ${mm(d1 + d2)}`]]);
    }
    // equivalent spring
    const L0e = st.mode === 'par' ? 120 : 184, de = F / keq, pe = wall + L0e + de * s;
    txt(ctx, 'Equivalent single spring', 10, 200, { font: '600 13px system-ui', align: 'left' });
    hatch(ctx, wall, 225, wall, 300, 1);
    springLine(ctx, wall, 262, pe, 262, st.mode === 'par' ? 12 : 9, 8);
    plate(pe, 240, 285); pull(pe, 262);
    labL(`k_eq = ${fmt(keq)} N/m: stretch ${mm(de)}`, 302);
    line(ctx, endTop + 4, 160, pe + 4, 238, COL.c3, 1.2, [5, 4]);
    txt(ctx, 'same F, same motion', endTop + 14, 205, { font: '11px system-ui', color: COL.c3, align: 'left' });
  }
});

/* ---------------------------------------------------------
   Ch1 · Why small angles: sin θ vs θ
   --------------------------------------------------------- */
makeClip({
  id: 'c-lin', buttons: false,
  controls: [{ key: 'th', label: 'Angle θ', min: 0, max: 120, step: 1, value: 30, unit: '°', dec: 1 }],
  reset(st){
    const th = st.V.th * Math.PI / 180, sn = Math.sin(th);
    setStats('c-lin-stats', [
      ['θ', fmt(th, 4) + ' rad'], ['sin θ', fmt(sn, 4)],
      ['Linear model overstates the restoring moment by', Math.abs(sn) < 1e-9 ? (th === 0 ? '0 %' : '∞') : fmt((th - sn) / sn * 100, 3) + ' %', true]
    ]);
  },
  draw(st){
    const th = st.V.th * Math.PI / 180;
    const cv = $('c-lin-anim'); const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 300, 260]);
    const P = [150, 30], L = 160, bx = P[0] + L * Math.sin(th), by = P[1] + L * Math.cos(th);
    hatch(ctx, 110, 30, 190, 30, -1);
    line(ctx, P[0], P[1], P[0], P[1] + L + 10, COL.axis, 1, [3, 4]);
    line(ctx, P[0], P[1], bx, by, COL.spring, 2);
    ctx.fillStyle = COL.mass; ctx.strokeStyle = COL.massEdge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, 14, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    // tangential restoring "forces": exact ∝ sin θ, linear ∝ θ
    const tx = -Math.cos(th), ty = Math.sin(th), sc = 105;
    const tan = (mag, col, off, lab) => {
      const ox = bx + off * Math.sin(th), oy = by + off * Math.cos(th), L2 = mag * sc;
      if (L2 > 2) arrow(ctx, ox, oy, ox + tx * L2, oy + ty * L2, col, 2.6);
      txt(ctx, lab, ox + tx * L2 - 6, oy + ty * L2 + (off > 0 ? 14 : -10), { font: '12px system-ui', color: col, align: 'right' });
    };
    tan(Math.sin(th), COL.c1, 18, 'exact ∝ sin θ');
    tan(th, COL.c2, -18, 'linear ∝ θ');
    txt(ctx, `θ = ${fmt(st.V.th)}°`, P[0] + 30, P[1] + 40, { font: 'italic 14px Georgia, serif', color: COL.muted, align: 'left' });
    const pts1 = [], pts2 = [];
    for (let i = 0; i <= 120; i++){ const a = i * Math.PI / 180; pts1.push([i, a]); pts2.push([i, Math.sin(a)]); }
    plot($('c-lin-plot'), {
      xmin: 0, xmax: 120, ymin: 0, ymax: 2.2, xlabel: 'angle θ (degrees)', ylabel: 'restoring term',
      vlines: [{ x: st.V.th, color: COL.axis }],
      series: [{ pts: pts1, color: COL.c2, width: 2.2 }, { pts: pts2, color: COL.c1, width: 2.2 }],
      points: [{ x: st.V.th, y: th, color: COL.c2 }, { x: st.V.th, y: Math.sin(th), color: COL.c1 }]
    });
  }
});

/* ---------------------------------------------------------
   Ch2 · Circles make sines (rotating vector)
   --------------------------------------------------------- */
makeClip({
  id: 'c-phasor',
  controls: [
    { key: 'x0', label: 'Initial x₀', min: -0.2, max: 0.2, step: 0.01, value: 0.08, unit: 'm', dec: 3 },
    { key: 'v0', label: 'Initial v₀', min: -1, max: 1, step: 0.05, value: 0.3, unit: 'm/s', dec: 2 },
    { key: 'wn', label: 'Natural freq. ωₙ', min: 1, max: 8, step: 0.1, value: 2.5, unit: 'rad/s', dec: 2 }
  ],
  reset(st){
    const V = st.V; st.ok = V.wn > 0;
    if (!st.ok){ setStats('c-phasor-stats', [['Note', 'ωₙ must be positive']]); return; }
    st.B = V.v0 / V.wn; st.X = Math.hypot(V.x0, st.B); st.phi = Math.atan2(st.B, V.x0);
    setStats('c-phasor-stats', [['A = x₀', fmt(V.x0) + ' m'], ['B = v₀/ωₙ', fmt(st.B) + ' m'], ['X = √(A² + B²)', fmt(st.X) + ' m', true], ['φ = atan2(B, A)', fmt(st.phi * 180 / Math.PI) + '°', true], ['Period', fmt(2 * Math.PI / V.wn) + ' s']]);
  },
  draw(st){
    const cv = $('c-phasor-anim');
    if (!st.ok){ drawMessage(cv, 'ωₙ must be positive'); return; }
    if (!(st.X > 0)){ drawMessage(cv, 'With x₀ = 0 and v₀ = 0 there is nothing to rotate: give it a displacement or a velocity'); return; }
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 640, 260]);
    const V = st.V, cx = 130, cy = 130, R = 95, k = R / st.X;
    const al = V.wn * st.t - st.phi, tipX = cx - R * Math.sin(al), tipY = cy - R * Math.cos(al);
    ctx.save(); ctx.strokeStyle = COL.axis; ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    line(ctx, cx - R - 10, cy, 625, cy, COL.axis, 1); line(ctx, cx, cy - R - 10, cx, cy + R + 10, COL.axis, 1);
    // initial-condition components
    const ix = cx + st.B * k, iy = cy - V.x0 * k;
    line(ctx, cx, cy, cx, iy, COL.c5, 1.5, [3, 3]); line(ctx, cx, iy, ix, iy, COL.c5, 1.5, [3, 3]);
    txt(ctx, 'x₀', cx + 12, (cy + iy) / 2, { font: '12px system-ui', color: COL.muted, align: 'left' });
    txt(ctx, 'v₀/ωₙ', (cx + ix) / 2, iy - 10, { font: '12px system-ui', color: COL.muted });
    // rotating vector and projection
    arrow(ctx, cx, cy, tipX, tipY, COL.accent || COL.c1, 3);
    txt(ctx, 'X', (cx + tipX) / 2 + 10, (cy + tipY) / 2 - 8, { font: 'italic 15px Georgia, serif', color: COL.c1 });
    const x0px = 270, Tw = 2 * 2 * Math.PI / V.wn, pps = (625 - x0px) / Tw;
    line(ctx, tipX, tipY, x0px, tipY, COL.c2, 1.3, [4, 3]);
    ctx.fillStyle = COL.c2; ctx.beginPath(); ctx.arc(tipX, tipY, 4, 0, 2 * Math.PI); ctx.fill();
    ctx.save(); ctx.strokeStyle = COL.c1; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 220; i++){
      const tau = Tw * i / 220, tt = st.t - tau; if (tt < 0) break;
      const y = cy - st.X * Math.cos(V.wn * tt - st.phi) * k, X = x0px + tau * pps;
      if (i === 0) ctx.moveTo(X, y); else ctx.lineTo(X, y);
    }
    ctx.stroke(); ctx.restore();
    ctx.fillStyle = COL.c1; ctx.beginPath(); ctx.arc(x0px, tipY, 4.5, 0, 2 * Math.PI); ctx.fill();
    txt(ctx, 'x(t) = X cos(ωₙt − φ)', 450, 18, { font: 'italic 14px Georgia, serif', color: COL.fg });
    txt(ctx, '← now        earlier →', 330, 250, { font: '11px system-ui', color: COL.muted });
  }
});

/* ---------------------------------------------------------
   Ch2 · Oscillator race: m, 4m, 4k
   --------------------------------------------------------- */
makeClip({
  id: 'c-race',
  controls: [
    { key: 'm', label: 'Base mass m', min: 0.2, max: 4, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Base stiffness k', min: 5, max: 200, step: 5, value: 20, unit: 'N/m', dec: 1 }
  ],
  reset(st){ st.ok = st.V.m > 0 && st.V.k > 0; },
  draw(st){
    const cv = $('c-race-anim');
    if (!st.ok){ drawMessage(cv, 'Mass and stiffness must be positive'); return; }
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 620, 270]);
    const V = st.V;
    const lanes = [
      { m: V.m, k: V.k, lab: 'm, k', note: 'baseline' },
      { m: 4 * V.m, k: V.k, lab: '4m, k', note: '½ the frequency' },
      { m: V.m, k: 4 * V.k, lab: 'm, 4k', note: '2× the frequency' }
    ];
    lanes.forEach((L, i) => {
      const y = 50 + i * 85, wn = Math.sqrt(L.k / L.m), x = 0.1 * Math.cos(wn * st.t);
      const eq = 330, bw = i === 1 ? 64 : 44, cx = eq + x * 900;
      txt(ctx, L.lab, 10, y - 8, { font: 'italic 15px Georgia, serif', align: 'left' });
      txt(ctx, `T = ${fmt(2 * Math.PI / wn)} s`, 10, y + 12, { font: '12px system-ui', color: COL.muted, align: 'left' });
      hatch(ctx, 120, y - 22, 120, y + 22, 1); hatch(ctx, 120, y + 22, 520, y + 22, 1);
      springLine(ctx, 120, y, cx - bw / 2, y, 8, i === 2 ? 6 : 8);
      line(ctx, eq, y - 26, eq, y + 22, COL.axis, 1, [3, 3]);
      block(ctx, cx, y, bw, 36, 0, '');
      txt(ctx, `cycles: ${Math.floor(wn * st.t / (2 * Math.PI))}`, 610, y - 8, { font: '600 13px system-ui', align: 'right' });
      txt(ctx, L.note, 610, y + 12, { font: '12px system-ui', color: COL.muted, align: 'right' });
    });
  }
});

/* ---------------------------------------------------------
   Ch3 · Roots in the complex plane
   --------------------------------------------------------- */
makeClip({
  id: 'c-splane',
  controls: [{ key: 'z', label: 'Damping ratio ζ', min: 0, max: 2, step: 0.01, value: 0.3, unit: '', dec: 3 }],
  presets: C => [
    { label: 'ζ = 0', apply: () => C.set({ z: 0 }) }, { label: 'ζ = 0.2', apply: () => C.set({ z: 0.2 }) },
    { label: 'ζ = 1', apply: () => C.set({ z: 1 }) }, { label: 'ζ = 2', apply: () => C.set({ z: 2 }) }
  ],
  reset(){},
  draw(st){
    const sweep = $('c-splane-sweep') && $('c-splane-sweep').checked;
    const z = sweep ? 1 - Math.cos(0.35 * st.t) : st.V.z;
    let r1, r2;
    if (Math.abs(z) < 1){ const b = Math.sqrt(1 - z * z); r1 = [-z, b]; r2 = [-z, -b]; }
    else { const q = Math.sqrt(z * z - 1); r1 = [-z + q, 0]; r2 = [-z - q, 0]; }
    const circ = []; for (let i = 0; i <= 120; i++){ const a = i / 120 * 2 * Math.PI; circ.push([Math.cos(a), Math.sin(a)]); }
    plot($('c-splane-plot'), {
      xmin: -4.2, xmax: 1, ymin: -1.5, ymax: 1.5, xzero: true, xlabel: 'real part (decay rate, ×ωₙ)', ylabel: 'imag. part (×ωₙ)',
      bands: [{ x0: 0, x1: 1, color: 'rgba(198,40,40,.08)' }],
      series: [{ pts: circ, color: COL.axis, width: 1, dash: [4, 4] }],
      points: [{ x: r1[0], y: r1[1], color: COL.c2, r: 7 }, { x: r2[0], y: r2[1], color: COL.c2, r: 7 }]
    });
    const pts = []; let mx = 1.1;
    for (let i = 0; i <= 400; i++){ const tau = 20 * i / 400, x = lin2(tau, 1, 2 * z, 1, 1, 0)[0]; pts.push([tau, x]); if (isFinite(x)) mx = Math.max(mx, Math.min(Math.abs(x) * 1.05, 20)); }
    plot($('c-splane-resp'), { xmin: 0, xmax: 20, ymin: -mx, ymax: mx, xlabel: 'ωₙ t', ylabel: 'x / x₀', series: [{ pts, color: COL.c1, width: 2.2 }] });
    const reg = z < 0 ? 'unstable (roots in the right half)' : z === 0 ? 'undamped (roots on the imaginary axis)' : z < 1 ? 'underdamped (complex pair on the circle)' : Math.abs(z - 1) < 0.005 ? 'critically damped (double real root)' : 'overdamped (two real roots)';
    const fr = r => (Math.abs(r[1]) < 1e-9 ? fmt(r[0], 3) : `${fmt(r[0], 3)} ${r[1] >= 0 ? '+' : '−'} ${fmt(Math.abs(r[1]), 3)}i`);
    statsEvery(st, 'c-splane-stats', () => [['ζ', fmt(z, 3), true], ['Roots s/ωₙ', fr(r1) + ',  ' + fr(r2)], ['Behavior', reg, true]], 0.1);
  }
});

/* ---------------------------------------------------------
   Ch3 · Where does the energy go?
   --------------------------------------------------------- */
makeClip({
  id: 'c-heat',
  controls: [{ key: 'z', label: 'Damping ratio ζ', min: 0, max: 0.5, step: 0.01, value: 0.08, unit: '', dec: 3 }],
  reset(st){
    st.m = 1; st.k = 40; st.x0 = 0.1; st.c = 2 * st.V.z * Math.sqrt(st.k * st.m); st.E0 = 0.5 * st.k * st.x0 * st.x0;
    const rt = roots(st.m, st.c, st.k);
    st.tmax = rt.sigma < -1e-6 ? Math.min(4 / -rt.sigma, 20) : 12; st.hist = [];
  },
  step(st){
    if (st.t > st.tmax + 1.2){ st.t = 0; st.hist = []; return; }
    const t = Math.min(st.t, st.tmax), [x, v] = lin2(t, st.m, st.c, st.k, st.x0, 0);
    const E = 0.5 * st.m * v * v + 0.5 * st.k * x * x;
    if (st.t <= st.tmax) st.hist.push([t, E / st.E0, 1 - E / st.E0]);
  },
  draw(st){
    const t = Math.min(st.t, st.tmax), [x, v] = lin2(t, st.m, st.c, st.k, st.x0, 0);
    drawSMD($('c-heat-anim'), { x, amp: st.x0, damper: true });
    const KE = 0.5 * st.m * v * v / st.E0, PE = 0.5 * st.k * x * x / st.E0, Q = Math.max(0, 1 - KE - PE);
    const cv = $('c-heat-bar'); const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    const x0 = 120, W = w - x0 - 16, y = 14, hh = 26;
    const segs = [[KE, COL.c2, 'kinetic'], [PE, COL.c1, 'spring'], [Q, HEAT, 'heat in damper']];
    let xx = x0;
    segs.forEach(([f, col]) => { ctx.fillStyle = col; ctx.fillRect(xx, y, Math.max(0, f) * W, hh); xx += Math.max(0, f) * W; });
    ctx.strokeStyle = COL.axis; ctx.strokeRect(x0, y, W, hh);
    ctx.fillStyle = COL.fg; ctx.font = '600 13px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('Initial energy', 8, y + hh / 2);
    ctx.font = '12px system-ui'; let lx = x0;
    segs.forEach(([f, col, lab]) => { ctx.fillStyle = col; ctx.fillRect(lx, y + hh + 10, 10, 10); ctx.fillStyle = COL.muted; ctx.fillText(`${lab} ${Math.round(f * 100)}%`, lx + 14, y + hh + 15); lx += 150; });
    plot($('c-heat-plot'), {
      xmin: 0, xmax: st.tmax, ymin: 0, ymax: 1.05, xlabel: 'time t (s)', ylabel: 'fraction of initial energy',
      series: [{ pts: st.hist.map(p => [p[0], p[1]]), color: COL.c1, width: 2.2 }, { pts: st.hist.map(p => [p[0], p[2]]), color: HEAT, width: 2.2 }]
    });
  }
});

/* ---------------------------------------------------------
   Ch4 · Force balance phasors
   --------------------------------------------------------- */
makeClip({
  id: 'c-phasors',
  controls: [
    { key: 'r', label: 'Frequency ratio r', min: 0, max: 3, step: 0.01, value: 0.5, unit: '', dec: 3 },
    { key: 'z', label: 'Damping ratio ζ', min: 0.02, max: 1, step: 0.01, value: 0.2, unit: '', dec: 3 }
  ],
  presets: C => [
    { label: 'Below resonance (r = 0.5)', apply: () => C.set({ r: 0.5 }) },
    { label: 'At resonance (r = 1)', apply: () => C.set({ r: 1 }) },
    { label: 'Above resonance (r = 2)', apply: () => C.set({ r: 2 }) }
  ],
  reset(st){
    const r = Math.abs(st.V.r), z = st.V.z, D = Math.hypot(1 - r * r, 2 * z * r);
    st.ok = D > 0;
    if (!st.ok){ $('c-phasors-why').textContent = 'With ζ = 0 at r = 1 there is no steady state: nothing can balance the force.'; return; }
    st.X = 1 / D; st.phi = Math.atan2(2 * z * r, 1 - r * r); st.r = r; st.z = z;
    $('c-phasors-why').innerHTML = r < 0.9
      ? '<b>Below resonance:</b> the spring force is the big arrow. It almost balances F on its own, so the displacement stays nearly in step with the force (small lag).'
      : r <= 1.1
        ? '<b>Near resonance:</b> the spring and inertia arrows are nearly equal and opposite, so they cancel. Only the damper is left to balance F, which forces a <b>90° lag</b> and a large amplitude (1/2ζ).'
        : '<b>Above resonance:</b> the inertia arrow dominates. To balance F it must point along F, so the displacement points the <b>opposite way</b> (lag near 180°).';
    setStats('c-phasors-stats', [['X / δst', fmt(st.X), true], ['Phase lag φ', fmt(st.phi * 180 / Math.PI) + '°', true], ['Spring kX', fmt(st.X) + ' F₀'], ['Damper cωX', fmt(2 * z * r * st.X) + ' F₀'], ['Inertia mω²X', fmt(r * r * st.X) + ' F₀']]);
  },
  draw(st){
    const cv = $('c-phasors-anim');
    if (!st.ok){ drawMessage(cv, 'No steady state at undamped resonance'); return; }
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 640, 300]);
    const O = [190, 150], X = st.X, r = st.r, z = st.z;
    const sc = 135 / Math.max(1, X * Math.hypot(1, 2 * z * r), X * r * r);
    const Th = 0.5 * st.t, ax = Th - st.phi;
    const P = (p, mag, ang) => [p[0] + mag * sc * Math.cos(ang), p[1] - mag * sc * Math.sin(ang)];
    line(ctx, O[0] - 170, O[1], O[0] + 170, O[1], COL.axis, 1); line(ctx, O[0], O[1] - 145, O[0], O[1] + 145, COL.axis, 1);
    const dx = P(O, 140 / sc, ax);
    line(ctx, O[0], O[1], dx[0], dx[1], COL.c5, 1, [5, 4]);
    txt(ctx, 'x direction', dx[0], dx[1] - 10, { font: '11px system-ui', color: COL.muted });
    const P1 = P(O, X, ax), P2 = P(P1, 2 * z * r * X, ax + Math.PI / 2), P3 = P(P2, r * r * X, ax + Math.PI);
    const seg = (a, b, col, wd) => { if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 3) arrow(ctx, a[0], a[1], b[0], b[1], col, wd); };
    seg(O, P1, COL.c1, 3); seg(P1, P2, COL.c4, 3); seg(P2, P3, COL.c3, 3);
    const PF = P(O, 1, Th); seg(O, PF, COL.c2, 4);
    // legend
    const items = [[COL.c2, 'applied force F₀'], [COL.c1, 'spring  kX  (along x)'], [COL.c4, 'damper  cωX  (90° ahead of x)'], [COL.c3, 'inertia  mω²X  (opposite x)']];
    items.forEach(([c, s1], i) => { ctx.fillStyle = c; ctx.fillRect(420, 40 + i * 28, 22, 5); txt(ctx, s1, 450, 42 + i * 28, { font: '13px system-ui', align: 'left' }); });
    txt(ctx, 'The three arrows always add up to F₀', 420, 175, { font: '12px system-ui', color: COL.muted, align: 'left' });
    txt(ctx, `lag of x behind F: ${fmt(st.phi * 180 / Math.PI)}°`, 420, 200, { font: '600 13px system-ui', align: 'left' });
  }
});

/* ---------------------------------------------------------
   Ch4 · Sweeping through resonance
   --------------------------------------------------------- */
makeClip({
  id: 'c-sweep', speed: 1,
  controls: [
    { key: 'z', label: 'Damping ratio ζ', min: 0.02, max: 0.5, step: 0.01, value: 0.1, unit: '', dec: 3 },
    { key: 'T', label: 'Sweep duration', min: 3, max: 180, step: 1, value: 30, unit: 's', dec: 1 }
  ],
  presets: C => [{ label: 'Slow sweep (90 s)', apply: () => C.set({ T: 90 }) }, { label: 'Fast sweep (6 s)', apply: () => C.set({ T: 6 }) }],
  reset(st){
    const z = st.V.z, T = st.V.T;
    st.wn = 6; st.r0 = 0.5; st.r1 = 1.5; st.sim = 0; st.hist = []; st.nextRec = 0; st.peak = 0;
    st.ok = T > 0 && z >= 0;
    if (!st.ok) return;
    // start already in the steady state at r0, so there is no start-up transient
    const r = st.r0, M0 = 1 / Math.hypot(1 - r * r, 2 * z * r), ph = Math.atan2(2 * z * r, 1 - r * r);
    st.s = [M0 * Math.cos(-ph), -M0 * r * st.wn * Math.sin(-ph), 0];   // [x, v, phase ψ]
    st.tau = z > 0 ? 1 / (z * st.wn) : Infinity;                     // build-up time
    st.band = 2 * z * T / (st.r1 - st.r0);                           // time spent crossing the resonance band
  },
  step(st, dt){
    if (!st.ok) return;
    const T = st.V.T;
    if (st.sim >= T){ if (st.t > T + 1.5) st.reset(); return; }
    const z = st.V.z, wn = st.wn, r0 = st.r0, r1 = st.r1;
    const f = (tt, s) => [s[1], wn * wn * (Math.cos(s[2]) - s[0]) - 2 * z * wn * s[1], wn * (r0 + (r1 - r0) * tt / T)];
    const span = Math.min(dt, T - st.sim), n = Math.max(1, Math.ceil(span / 0.002)), h = span / n;
    for (let i = 0; i < n; i++){
      st.s = rk4(f, st.sim, st.s, h); st.sim += h;
      st.peak = Math.max(st.peak, Math.abs(st.s[0]));
      if (st.sim >= st.nextRec){ st.hist.push([r0 + (r1 - r0) * st.sim / T, st.s[0]]); st.nextRec += 0.01; }
    }
  },
  setup(st, reset){ st.reset = reset; },
  draw(st){
    if (!st.ok){ drawMessage($('c-sweep-anim'), 'Check the values'); return; }
    const z = st.V.z, Mp = z > 0 && z < Math.SQRT1_2 ? 1 / (2 * z * Math.sqrt(1 - z * z)) : 1;
    const Y = Math.min(Math.max(Mp, 1.2) * 1.15, 30);
    const rNow = st.r0 + (st.r1 - st.r0) * Math.min(st.sim / st.V.T, 1);
    drawSMD($('c-sweep-anim'), { x: st.s[0], amp: Y / 1.15, damper: true, force: Math.cos(st.s[2]), forceScale: 45 });
    const env = [], envN = [];
    for (let i = 0; i <= 300; i++){ const r = st.r0 + (st.r1 - st.r0) * i / 300, M = 1 / Math.hypot(1 - r * r, 2 * z * r); env.push([r, M]); envN.push([r, -M]); }
    plot($('c-sweep-plot'), {
      xmin: st.r0, xmax: st.r1, ymin: -Y, ymax: Y, xlabel: 'current frequency ratio r = ω/ωₙ', ylabel: 'x / δst',
      vlines: [{ x: 1, color: COL.axis }, { x: rNow, color: COL.c2 }],
      series: [{ pts: env, color: COL.c2, width: 1.5, dash: [5, 4] }, { pts: envN, color: COL.c2, width: 1.5, dash: [5, 4] }, { pts: st.hist, color: COL.c1, width: 1.2 }]
    });
    const verdict = st.band > 5 * st.tau ? 'slow: follows the steady-state curve' : st.band > st.tau ? 'moderate: lags a little' : 'fast: no time to build up';
    statsEvery(st, 'c-sweep-stats', () => [
      ['Current r', fmt(rNow, 3), true],
      ['Build-up time 1/(ζωₙ)', fmt(st.tau) + ' s'],
      ['Time spent crossing resonance', fmt(st.band) + ' s'],
      ['This sweep is', verdict, true],
      ['Largest response so far', fmt(st.peak) + ' δst (' + fmt(st.peak / Mp * 100, 3) + '% of steady peak)']
    ]);
  }
});

/* ---------------------------------------------------------
   Ch5 · Force transmitted to the floor
   --------------------------------------------------------- */
makeClip({
  id: 'c-floor',
  controls: [
    { key: 'r', label: 'Frequency ratio r', min: 0.1, max: 4, step: 0.01, value: 0.3, unit: '', dec: 3 },
    { key: 'z', label: 'Damping ratio ζ', min: 0.02, max: 1, step: 0.01, value: 0.1, unit: '', dec: 3 }
  ],
  presets: C => [
    { label: 'Stiff mounts (r = 0.3)', apply: () => C.set({ r: 0.3 }) },
    { label: 'Resonance (r = 1)', apply: () => C.set({ r: 1 }) },
    { label: 'Soft mounts (r = 3)', apply: () => C.set({ r: 3 }) }
  ],
  reset(st){
    const r = Math.abs(st.V.r), z = st.V.z, D = Math.hypot(1 - r * r, 2 * z * r);
    st.ok = D > 0; st.hist = [];
    if (!st.ok) return;
    st.r = r; st.z = z; st.M = 1 / D; st.phi = Math.atan2(2 * z * r, 1 - r * r);
    st.TR = Math.hypot(1, 2 * z * r) / D; st.w = 3 * r;
    setStats('c-floor-stats', [['Machine amplitude X / (F₀/k)', fmt(st.M)], ['Force on floor / F₀ = TR', fmt(st.TR), true], ['Floor feels', fmt(st.TR * 100) + ' % of the shaking force', true]]);
  },
  step(st){
    if (!st.ok) return;
    const th = st.w * st.t - st.phi;
    st.hist.push([st.t, Math.sin(st.w * st.t), st.M * (Math.sin(th) + 2 * st.z * st.r * Math.cos(th))]);
    const W = 3 * 2 * Math.PI / Math.max(st.w, 0.3);
    while (st.hist.length > 2 && st.hist[0][0] < st.t - W) st.hist.shift();
  },
  draw(st){
    const cv = $('c-floor-anim'), pv = $('c-floor-plot');
    if (!st.ok){ drawMessage(cv, 'No steady state at undamped resonance'); drawMessage(pv, ''); return; }
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 420, 320]);
    const th = st.w * st.t - st.phi, x = st.M * Math.sin(th), FT = st.M * (Math.sin(th) + 2 * st.z * st.r * Math.cos(th)), F = Math.sin(st.w * st.t);
    const s = 34 / Math.max(st.M, 0.4), floor = 240, mb = 160 - x * s, cx = 170;
    hatch(ctx, 40, floor, 300, floor, 1);
    springLine(ctx, cx - 45, floor, cx - 45, mb, 7, 9);
    damperLine(ctx, cx + 45, floor, cx + 45, mb, 80);
    block(ctx, cx, mb - 32, 150, 64, 0, '');
    // harmonic shaker inside the machine: force of fixed amplitude F0 sin ωt (not a rotating imbalance, see Section 5b)
    ctx.save(); ctx.strokeStyle = COL.c2; ctx.lineWidth = 2.2; ctx.beginPath();
    for (let i = 0; i <= 60; i++){ const u = i / 60, X = cx - 45 + 90 * u, Y = mb - 32 - 12 * Math.sin(2 * Math.PI * 1.5 * u + st.w * st.t); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
    ctx.stroke(); ctx.restore();
    txt(ctx, 'machine: F₀ sin ωt (fixed amplitude)', cx, mb - 50 - 32, { font: '12px system-ui', color: COL.muted });
    // applied force (up positive) and floor force
    const fs = 50, Fl = F * fs, Tl = clamp(FT * fs, -150, 150);
    if (Math.abs(Fl) > 2) arrow(ctx, 340, 110, 340, 110 - Fl, COL.c2, 3);
    txt(ctx, 'shaking force', 340, 40, { font: '12px system-ui', color: COL.c2 });
    // force the mounts exert on the floor = +(kx + c xdot), up positive: up when the machine is above equilibrium
    const L = Math.abs(Tl) * 0.45;
    if (L > 2){ if (Tl > 0) arrow(ctx, cx, floor + 8 + L, cx, floor + 8, HEAT, 4); else arrow(ctx, cx, floor + 8, cx, floor + 8 + L, HEAT, 4); }
    txt(ctx, 'force on floor (↑ pulled up, ↓ pushed down)', cx + 18, floor + 30, { font: '12px system-ui', color: HEAT, align: 'left' });
    const W = 3 * 2 * Math.PI / Math.max(st.w, 0.3), t0 = Math.max(0, st.t - W), t1 = Math.max(W, st.t), Y = Math.max(1, st.TR) * 1.2;
    plot(pv, {
      xmin: t0, xmax: t1, ymin: -Y, ymax: Y, xlabel: 'time t (s)', ylabel: 'force / F₀',
      series: [{ pts: st.hist.map(p => [p[0], p[1]]), color: COL.c2, width: 2 }, { pts: st.hist.map(p => [p[0], p[2]]), color: HEAT, width: 2.4 }]
    });
  }
});
