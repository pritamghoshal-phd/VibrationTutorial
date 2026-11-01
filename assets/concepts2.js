/* =========================================================
   More concept clips (uses makeClip from concepts.js)
   ========================================================= */

/* ---------------------------------------------------------
   Ch1 · Which way do spring and dashpot forces point?
   --------------------------------------------------------- */
makeClip({
  id: 'c-signs',
  reset(st){
    st.m = 1; st.k = 40; st.c = 1.6; st.x0 = 0.1;
    st.wn = Math.sqrt(st.k / st.m); st.tmax = 14;
  },
  step(st){ if (st.t > st.tmax) st.t = 0; },
  draw(st){
    const cv = $('c-signs-anim'); const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 660, 300]);
    const [x, v] = lin2(st.t, st.m, st.c, st.k, st.x0, 0);
    const Fs = -st.k * x, Fd = -st.c * v;
    const eq = 250, s = 900, bw = 70, cx = eq + x * s, left = cx - bw / 2;
    hatch(ctx, 20, 30, 20, 175, 1); hatch(ctx, 20, 175, 400, 175, 1);
    springLine(ctx, 20, 105, left, 105, 9, 8);
    damperLine(ctx, 20, 150, left, 150, eq - bw / 2 - 20);
    line(ctx, eq, 70, eq, 175, COL.axis, 1, [4, 4]); txt(ctx, 'x = 0', eq, 190, { font: '11px system-ui', color: COL.muted });
    block(ctx, cx, 128, bw, 64, 0, 'm');
    txt(ctx, 'What the forces really do', 200, 16, { font: '600 13px system-ui' });
    const fs1 = 75 / (st.k * st.x0), fs2 = 75 / (st.c * st.x0 * st.wn);
    const real = (y, F, sc, col, words) => {
      const L = F * sc;
      if (Math.abs(L) > 2){ if (L > 0) arrow(ctx, cx, y, cx + L, y, col, 3); else arrow(ctx, cx - L, y, cx, y, col, 3); }
      txt(ctx, words, cx + (L >= 0 ? Math.max(L, 0) + 8 : L - 8), y, { font: '12px system-ui', color: col, align: L >= 0 ? 'left' : 'right' });
    };
    const sw = x > 1e-4 ? 'stretched: pulls' : x < -1e-4 ? 'compressed: pushes' : 'unstretched';
    const dw = v > 1e-3 ? 'lengthening: pulls' : v < -1e-3 ? 'shortening: pushes' : 'at rest';
    real(62, Fs, fs1, COL.c1, 'spring ' + sw);
    real(40, Fd, fs2, COL.c4, 'dashpot ' + dw);
    // FBD drawn once, for x > 0 and xdot > 0
    line(ctx, 430, 20, 430, 285, COL.border || COL.axis, 1);
    txt(ctx, 'FBD drawn once (x > 0, ẋ > 0)', 545, 16, { font: '600 13px system-ui' });
    block(ctx, 575, 100, 70, 64, 0, 'm');
    arrow(ctx, 540, 85, 470, 85, COL.c1, 3); txt(ctx, 'kx', 462, 78, { color: COL.c1, align: 'right' });
    arrow(ctx, 540, 115, 470, 115, COL.c4, 3); txt(ctx, 'cẋ', 462, 122, { color: COL.c4, align: 'right' });
    const say = (y, val, sym, col) => {
      const sgn = val >= 0 ? 'positive' : 'negative';
      txt(ctx, `${sym} = ${fmt(val, 2)} N  (${sgn})`, 445, y, { font: '12.5px system-ui', color: col, align: 'left' });
      txt(ctx, val >= 0 ? '→ acts left, as drawn' : '→ the math flips it: acts right', 445, y + 17, { font: '12px system-ui', color: COL.muted, align: 'left' });
    };
    say(185, st.k * x, 'kx', COL.c1);
    say(235, st.c * v, 'cẋ', COL.c4);
  }
});

/* ---------------------------------------------------------
   Ch3 · Same standard form, same motion
   --------------------------------------------------------- */
makeClip({
  id: 'c-same',
  controls: [
    { key: 'z', label: 'Damping ratio ζ', min: 0, max: 0.9, step: 0.01, value: 0.15, unit: '', dec: 3 },
    { key: 'wn', label: 'Natural freq. ωₙ', min: 2, max: 12, step: 0.1, value: 6, unit: 'rad/s', dec: 2 }
  ],
  reset(st){
    const z = st.V.z, wn = st.V.wn;
    st.ok = wn > 0 && z >= 0 && z < 1;
    if (!st.ok){ setStats('c-same-stats', [['Note', 'use 0 ≤ ζ < 1 and ωₙ > 0 for this clip']]); return; }
    st.tmax = z > 0 ? Math.min(5 / (z * wn), 14) : 10;
    // three physically different systems, each tuned to the same ζ and ωₙ
    st.sys = [
      { name: 'Block', meq: 2, mlabel: 'm = 2 kg' },
      { name: 'Rolling disk', meq: 1.5 * 4, mlabel: 'm = 4 kg, M_eq = 3m/2 = 6 kg' },
      { name: 'Heavy block, two springs', meq: 8, mlabel: 'm = 8 kg, k split in two' }
    ].map(s => Object.assign(s, { k: wn * wn * s.meq, c: 2 * z * wn * s.meq }));
    setStats('c-same-stats', [['ζ', fmt(z, 3), true], ['ωₙ', fmt(wn) + ' rad/s', true], ['All three obey', 'ẍ + 2ζωₙẋ + ωₙ²x = 0']]);
  },
  step(st){ if (st.ok && st.t > st.tmax + 1) st.t = 0; },
  draw(st){
    const cv = $('c-same-anim');
    if (!st.ok){ drawMessage(cv, 'Use 0 ≤ ζ < 1 and ωₙ > 0'); return; }
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 680, 300]);
    const t = Math.min(st.t, st.tmax), x = lin2(t, 1, 2 * st.V.z * st.V.wn, st.V.wn * st.V.wn, 0.1, 0)[0];
    st.sys.forEach((S, i) => {
      const y = 55 + i * 92, eq = 360, d = x * 800;
      txt(ctx, S.name, 10, y - 22, { font: '600 13px system-ui', align: 'left' });
      txt(ctx, S.mlabel, 10, y - 4, { font: '12px system-ui', color: COL.muted, align: 'left' });
      txt(ctx, `k = ${fmt(S.k)} N/m`, 10, y + 13, { font: '12px system-ui', color: COL.muted, align: 'left' });
      txt(ctx, `c = ${fmt(S.c)} N·s/m`, 10, y + 30, { font: '12px system-ui', color: COL.muted, align: 'left' });
      hatch(ctx, 200, y - 30, 200, y + 32, 1); hatch(ctx, 200, y + 32, 560, y + 32, 1);
      line(ctx, eq, y - 34, eq, y + 32, COL.axis, 1, [3, 3]);
      if (i === 1){
        const R = 30, cx = eq + d, cy = y + 2;
        springLine(ctx, 200, y - 8, cx - R - 4, y - 8, 8, 7); damperLine(ctx, 200, y + 14, cx - R - 4, y + 14, eq - R - 4 - 200);
        line(ctx, cx - R - 4, y - 8, cx, cy, COL.spring, 2); line(ctx, cx - R - 4, y + 14, cx, cy, COL.spring, 2);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(d / R);
        ctx.fillStyle = COL.mass; ctx.strokeStyle = COL.massEdge; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.restore();
      } else {
        const bw = i === 2 ? 76 : 50, cx = eq + d;
        if (i === 2){ springLine(ctx, 200, y - 14, cx - bw / 2, y - 14, 7, 6); springLine(ctx, 200, y + 2, cx - bw / 2, y + 2, 7, 6); }
        else springLine(ctx, 200, y - 8, cx - bw / 2, y - 8, 8, 7);
        damperLine(ctx, 200, y + 18, cx - bw / 2, y + 18, eq - bw / 2 - 200);
        block(ctx, cx, y + 2, bw, i === 2 ? 56 : 44, 0, '');
      }
    });
    txt(ctx, 'same ζ and ωₙ, released from the same x₀', 670, 290, { font: '12px system-ui', color: COL.muted, align: 'right' });
  }
});

/* ---------------------------------------------------------
   Ch4 · Undamped forced response: the sign of A
   --------------------------------------------------------- */
makeClip({
  id: 'c-undamped',
  controls: [{ key: 'r', label: 'Frequency ratio r', min: 0, max: 3, step: 0.01, value: 0.6, unit: '', dec: 4 }],
  presets: C => [
    { label: 'r = 0.6', apply: () => C.set({ r: 0.6 }) },
    { label: 'Jump to the mirror frequency', apply: () => { const r = C.v.r; if (r < Math.SQRT2 && Math.abs(r - 1) > 1e-6) C.set({ r: parseFloat(Math.sqrt(2 - r * r).toFixed(4)) }); } },
    { label: 'r = 2', apply: () => C.set({ r: 2 }) }
  ],
  reset(st){
    const r = Math.abs(st.V.r); st.r = r; st.ok = Math.abs(1 - r * r) > 1e-9;
    st.A = st.ok ? 1 / (1 - r * r) : Infinity; st.w = 3 * r;
    const mir = r < Math.SQRT2 && st.ok ? Math.sqrt(2 - r * r) : null;
    setStats('c-undamped-stats', [
      ['A / (F₀/K)', st.ok ? fmt(st.A) : '∞', true],
      ['Response', !st.ok ? 'resonance: grows without bound' : r === 0 ? 'static deflection' : st.A > 0 ? 'in phase with the force' : '180° out of phase', true],
      ['Mirror frequency (same |A|, opposite sign)', mir !== null && Math.abs(mir - r) > 1e-6 ? 'r = ' + fmt(mir, 4) : 'none']
    ]);
  },
  draw(st){
    const cv = $('c-undamped-anim');
    if (!st.ok){ drawMessage(cv, 'At r = 1 the undamped response has no steady state: it grows without bound'); }
    else {
      const A = st.A, x = A * Math.cos(st.w * st.t), amp = Math.min(Math.max(Math.abs(A), 1), 8);
      drawSMD(cv, { x: clamp(x, -amp, amp), amp, damper: false, force: Math.cos(st.w * st.t), forceScale: 45 });
    }
    const pts = [[], []];
    for (let i = 0; i <= 600; i++){ const r = 3 * i / 600, a = 1 / (1 - r * r); (r < 1 ? pts[0] : pts[1]).push([r, a]); }
    const P = [];
    if (st.ok) P.push({ x: st.r, y: clamp(st.A, -6, 6), color: COL.c2, r: 7 });
    if (st.ok && st.r < Math.SQRT2){ const m = Math.sqrt(2 - st.r * st.r); if (Math.abs(m - st.r) > 1e-6) P.push({ x: m, y: clamp(1 / (1 - m * m), -6, 6), color: COL.c4, r: 5 }); }
    plot($('c-undamped-plot'), {
      xmin: 0, xmax: 3, ymin: -6, ymax: 6, xlabel: 'r = ω/ωₙ', ylabel: 'A / (F₀/K)',
      vlines: [{ x: 1, color: COL.axis, label: 'resonance' }], hlines: [{ y: 1, color: COL.c3 }],
      bands: [{ x0: 1, x1: 3, color: 'rgba(166,30,77,.06)' }],
      series: [{ pts: pts[0], color: COL.c1, width: 2.4 }, { pts: pts[1], color: COL.c1, width: 2.4 }], points: P
    });
  }
});

/* ---------------------------------------------------------
   Ch5 · Rotating imbalance
   --------------------------------------------------------- */
makeClip({
  id: 'c-imbalance',
  controls: [
    { key: 'r', label: 'Speed ratio r = ω/ωₙ', min: 0, max: 4, step: 0.01, value: 0.5, unit: '', dec: 3 },
    { key: 'z', label: 'Damping ratio ζ', min: 0.02, max: 1, step: 0.01, value: 0.1, unit: '', dec: 3 }
  ],
  presets: C => [
    { label: 'Slow (r = 0.5)', apply: () => C.set({ r: 0.5 }) },
    { label: 'Resonance (r = 1)', apply: () => C.set({ r: 1 }) },
    { label: 'Fast (r = 3)', apply: () => C.set({ r: 3 }) }
  ],
  reset(st){
    const r = Math.abs(st.V.r), z = st.V.z, D = Math.hypot(1 - r * r, 2 * z * r);
    st.ok = D > 0; if (!st.ok) return;
    st.r = r; st.z = z; st.N = r * r / D; st.phi = Math.atan2(2 * z * r, 1 - r * r); st.w = 3 * r;
    setStats('c-imbalance-stats', [
      ['Force amplitude m e ω² (relative to its value at r = 1)', fmt(r * r) + '×'],
      ['X (M + m) / (m e)', fmt(st.N), true],
      ['Phase lag φ', fmt(st.phi * 180 / Math.PI) + '°', true],
      ['Regime', r < 0.7 ? 'slow: little force, little motion' : r < 1.4 ? 'near resonance' : 'fast: X → m e / (M + m)']
    ]);
  },
  draw(st){
    const cv = $('c-imbalance-anim');
    if (!st.ok){ drawMessage(cv, 'No steady state'); return; }
    const { ctx, w, h } = fit(cv); ctx.clearRect(0, 0, w, h);
    fitView(ctx, w, h, [0, 0, 560, 250]);
    const th = st.w * st.t, x = st.N * Math.cos(th - st.phi);
    const s = 45 / Math.max(st.N, 1), eq = 330, bw = 170, cx = eq + x * s, left = cx - bw / 2;
    hatch(ctx, 20, 40, 20, 215, 1); hatch(ctx, 20, 215, 540, 215, 1);
    springLine(ctx, 20, 95, left, 95, 9, 8);
    damperLine(ctx, 20, 175, left, 175, eq - bw / 2 - 20);
    txt(ctx, 'k', (20 + left) / 2, 74); txt(ctx, 'c', (20 + left) / 2, 197);
    line(ctx, eq, 30, eq, 215, COL.axis, 1, [4, 4]);
    block(ctx, cx, 135, bw, 120, 0, '');
    txt(ctx, 'M', cx + 60, 92, { font: 'italic 16px Georgia, serif' });
    // rotor: point mass m at radius e, rotating at ω
    const O = [cx - 10, 140], e = 32, P = [O[0] + e * Math.cos(th), O[1] - e * Math.sin(th)];
    ctx.save(); ctx.strokeStyle = COL.axis; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(O[0], O[1], e, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
    line(ctx, O[0], O[1], P[0], P[1], COL.spring, 2.5);
    ctx.fillStyle = COL.spring; ctx.beginPath(); ctx.arc(O[0], O[1], 4, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = COL.c2; ctx.beginPath(); ctx.arc(P[0], P[1], 8, 0, 2 * Math.PI); ctx.fill();
    txt(ctx, 'm', P[0] + 12, P[1] - 10, { font: 'italic 13px Georgia, serif', color: COL.c2 });
    // force on the frame: m e ω², outward along O→P, growing with ω²
    const L = 14 + 26 * Math.min(st.r * st.r, 4);
    if (st.r > 0.05) arrow(ctx, O[0], O[1], O[0] + (L + e) * Math.cos(th), O[1] - (L + e) * Math.sin(th), COL.c2, 2.5);
    txt(ctx, 'm e ω²', cx - 60, 205, { font: 'italic 13px Georgia, serif', color: COL.c2 });
    // frequency-response curves
    const refs = [0.05, 0.1, 0.25, 0.5, 1].map(z => { const p = []; for (let i = 0; i <= 400; i++){ const r = 4 * i / 400; p.push([r, r * r / Math.hypot(1 - r * r, 2 * z * r)]); } return { pts: p, color: COL.c5, width: 1, alpha: 0.6 }; });
    const cur = []; for (let i = 0; i <= 600; i++){ const r = 4 * i / 600; cur.push([r, r * r / Math.hypot(1 - r * r, 2 * st.z * r)]); }
    plot($('c-imbalance-plot'), {
      xmin: 0, xmax: 4, ymin: 0, ymax: 6, xlabel: 'r = ω/ωₙ', ylabel: 'X (M+m) / (m e)',
      vlines: [{ x: 1, color: COL.axis }], hlines: [{ y: 1, color: COL.c3 }],
      series: [...refs, { pts: cur, color: COL.c1, width: 2.6 }],
      points: [{ x: st.r, y: Math.min(st.N, 6), color: COL.c2, r: 6 }]
    });
  }
});
