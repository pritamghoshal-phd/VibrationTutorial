/* =========================================================
   1. Pendulum: nonlinear vs linear
   ========================================================= */
if (document.getElementById('demo-pend')) (function(){
  const g = 9.81;
  const C = makeControls('pend-ctl', [
    { key: 'th0', label: 'Release angle θ₀', min: 2, max: 170, step: 1, value: 30, unit: '°', dec: 1 },
    { key: 'L', label: 'Length L', min: 0.2, max: 2, step: 0.05, value: 1, unit: 'm', dec: 2 }
  ], () => reset());
  const V = C.v;
  let t, sN, sL, hist, ok, Tl, wn, slow, L;
  const fN = (t, s) => [s[1], -g / L * Math.sin(s[0])];
  const fL = (t, s) => [s[1], -g / L * s[0]];
  const agm = (a, b) => { for (let i = 0; i < 40; i++){ const an = (a + b) / 2; b = Math.sqrt(a * b); a = an; } return a; };
  const wrapDeg = a => ((a + 180) % 360 + 360) % 360 - 180;
  function reset(){
    t = 0; L = V.L;
    const notes = [];
    ok = L > 0;
    if (!ok){
      notes.push({ level: 'error', html: '<b>The length must be positive.</b> A pendulum with L ≤ 0 has no physical meaning. Enter a value greater than 0.' });
      showNotes('pend-notes', notes); setStats('pend-stats', []); return;
    }
    const th = V.th0 * Math.PI / 180; sN = [th, 0]; sL = [th, 0];
    hist = [[0, V.th0, V.th0]];
    wn = Math.sqrt(g / L); Tl = 2 * Math.PI / wn; slow = slowFactor(wn);
    const thw = wrapDeg(V.th0), thwr = thw * Math.PI / 180;
    const kk = Math.abs(Math.sin(thwr / 2));
    const Tn = kk >= 1 - 1e-12 ? Infinity : 4 / wn * Math.PI / (2 * agm(1, Math.sqrt(1 - kk * kk)));
    const sinErr = Math.abs(thwr) < 1e-12 ? 0 : Math.abs(Math.sin(thwr)) < 1e-9 ? Infinity : (thwr - Math.sin(thwr)) / Math.sin(thwr) * 100;
    const perr = (Tn / Tl - 1) * 100;
    setStats('pend-stats', [
      ['Linear period 2π√(L/g)', fmt(Tl) + ' s'],
      ['Exact period', isFinite(Tn) ? fmt(Tn) + ' s' : '∞'],
      ['Period error', isFinite(Tn) ? fmt(Math.abs(perr) < 1e-6 ? 0 : perr, 2) + ' %' : '∞', true],
      ['θ₀ vs sin θ₀ error', fmt(sinErr, 2) + ' %']
    ]);
    if (V.th0 === 0) notes.push({ level: 'info', html: 'Released at θ₀ = 0, the pendulum is already at rest at the bottom, so nothing moves. Vibration needs an initial disturbance.' });
    if (Math.abs(V.th0) > 180) notes.push({ level: 'info', html: `Angles beyond ±180° wrap around: the real pendulum starts at the same position as θ₀ = ${fmt(thw)}° and swings about the nearest full turn. The linear model takes ${fmt(V.th0)}° literally and swings through ±${fmt(Math.abs(V.th0))}°, another way linearization breaks down.` });
    if (Math.abs(thw) > 179.99) notes.push({ level: 'warn', html: '<b>Released upside-down.</b> The exact pendulum is balanced at an <em>unstable</em> equilibrium. In theory it stays there forever (infinite period); in practice the tiniest disturbance, here round-off error, eventually tips it over.' });
    if (slow < 1) notes.push(slowNote(wn, slow));
    showNotes('pend-notes', notes);
  }
  const d = {
    advance(dt){
      if (!ok) return;
      const simDt = dt * slow, h = Math.min(0.002, Tl / 200);
      let t1; [t1, sN] = integrate(fN, t, sN, simDt, h); [t, sL] = integrate(fL, t, sL, simDt, h);
      hist.push([t, sN[0] * 180 / Math.PI, sL[0] * 180 / Math.PI]);
      const W = 4 * Tl;
      while (hist.length > 2 && hist[0][0] < t - W) hist.shift();
    },
    draw(){
      if (!ok){ drawMessage($('pend-anim'), 'Enter a positive length L'); drawMessage($('pend-plot'), 'No simulation: L must be greater than 0'); return; }
      const cv = $('pend-anim'); const { ctx, w, h } = fit(cv);
      ctx.clearRect(0, 0, w, h);
      const px = w / 2, py = h * 0.47, R = Math.min(h * 0.4, w * 0.4);
      ctx.strokeStyle = COL.axis; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + R + 16); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = COL.ground; ctx.fillRect(px - 30, py - 6, 60, 6);
      const draw1 = (th, col, alpha) => {
        const bx = px + R * Math.sin(th), by = py + R * Math.cos(th);
        ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 13, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
      };
      draw1(sL[0], COL.c2, 0.75);
      draw1(sN[0], COL.c1, 0.95);
      ctx.fillStyle = COL.fg; ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = COL.muted; ctx.font = '12px system-ui'; ctx.textAlign = 'left';
      ctx.fillText('t = ' + fmt(t) + ' s', 10, 18);

      const W = 4 * Tl, t0 = Math.max(0, t - W), t1 = Math.max(W, t);
      let A = Math.abs(V.th0);
      for (const p of hist) A = Math.max(A, Math.abs(p[1]), Math.abs(p[2]));
      A = (A || 1) * 1.15;
      plot($('pend-plot'), {
        xmin: t0, xmax: t1, ymin: -A, ymax: A, xlabel: 'time t (s)', ylabel: 'θ (deg)',
        series: [
          { pts: hist.map(p => [p[0], p[2]]), color: COL.c2, width: 2, alpha: 0.85 },
          { pts: hist.map(p => [p[0], p[1]]), color: COL.c1, width: 2.2 }
        ]
      });
    }
  };
  makeButtons('pend-btn', d, reset, 0.5, C);
  reset();
  register($('demo-pend'), d);
})();

/* =========================================================
   2. Free undamped vibration
   ========================================================= */
if (document.getElementById('demo-free')) (function(){
  const C = makeControls('free-ctl', [
    { key: 'm', label: 'Mass m', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 10, max: 200, step: 1, value: 25, unit: 'N/m', dec: 1 },
    { key: 'x0', label: 'Initial x₀', min: -0.2, max: 0.2, step: 0.01, value: 0.1, unit: 'm', dec: 3 },
    { key: 'v0', label: 'Initial v₀', min: -1, max: 1, step: 0.05, value: 0, unit: 'm/s', dec: 2 }
  ], () => reset());
  const V = C.v;
  let t, ok, halted, m, k, x0, v0, rate, slow, Om, A, hist, trail, yR, pR, W, limit, xc, vc, notes;
  function reset(){
    t = 0; halted = false; m = V.m; k = V.k; x0 = V.x0; v0 = V.v0;
    notes = [];
    ok = m > 0;
    if (!ok){ notes.push(MASS_ERROR); showNotes('free-notes', notes); setStats('free-stats', []); return; }
    rate = refRate(m, 0, k); slow = slowFactor(rate);
    Om = k !== 0 ? Math.sqrt(Math.abs(k) / m) : 1;
    W = 8 * 2 * Math.PI / rate;
    A = k > 0 ? Math.hypot(x0, v0 / Om) : 0;
    limit = 1e6 * Math.max(Math.abs(x0), Math.abs(v0) / rate, 1e-3);
    xc = x0; vc = v0;
    hist = [[0, x0]]; trail = [[x0, v0 / Om]];
    yR = Math.max(Math.abs(x0), A); pR = Math.max(Math.abs(x0), Math.abs(v0 / Om), A);
    const E = 0.5 * m * v0 * v0 + 0.5 * k * x0 * x0;
    if (k > 0){
      setStats('free-stats', [
        ['ωₙ = √(k/m)', fmt(Om) + ' rad/s', true],
        ['fₙ', fmt(Om / 2 / Math.PI) + ' Hz'],
        ['Period τₙ', fmt(2 * Math.PI / Om) + ' s'],
        ['Amplitude X', fmt(A) + ' m'],
        ['Phase φ', fmt(Math.atan2(v0 / Om, x0) * 180 / Math.PI) + '°'],
        ['Energy E', fmt(E) + ' J']
      ]);
    } else {
      setStats('free-stats', [
        ['Regime', regimeText(m, 0, k), true],
        ...(k < 0 ? [['Growth rate √(|k|/m)', fmt(Om) + ' 1/s']] : [['Speed', fmt(v0) + ' m/s (constant)']]),
        ['Energy E', fmt(E) + ' J']
      ]);
    }
    notes.push(...systemNotes(m, 0, k));
    if (x0 === 0 && v0 === 0) notes.push({ level: 'info', html: 'Both initial conditions are zero, so the mass stays at rest. Free vibration needs an initial disturbance: a displacement, a velocity, or both.' });
    if (slow < 1) notes.push(slowNote(rate, slow));
    showNotes('free-notes', notes);
  }
  const d = {
    advance(dt){
      if (!ok || halted) return;
      const tn = t + dt * slow;
      const [x, v] = lin2(tn, m, 0, k, x0, v0);
      if (!isFinite(x) || Math.abs(x) > limit){ halted = true; notes.push(haltNote(limit)); showNotes('free-notes', notes); return; }
      t = tn; xc = x; vc = v;
      hist.push([t, x]); trail.push([x, v / Om]);
      while (hist.length > 2 && hist[0][0] < t - W) hist.shift();
      if (trail.length > 400) trail.shift();
    },
    draw(){
      if (!ok){ ['free-anim', 'free-plot', 'free-phase'].forEach(id => drawMessage($(id), 'Enter a positive mass m')); return; }
      yR = Math.max(yR, Math.abs(xc)); pR = Math.max(pR, Math.abs(xc), Math.abs(vc / Om));
      const amp = yR || 0.01, pa = pR || 0.01;
      drawSMD($('free-anim'), { x: xc, amp, damper: false });
      const t0 = Math.max(0, t - W), t1 = Math.max(W, t);
      plot($('free-plot'), {
        xmin: t0, xmax: t1, ymin: -amp * 1.2, ymax: amp * 1.2, xlabel: 'time t (s)', ylabel: 'x (m)',
        hlines: A > 0 ? [{ y: A, color: COL.c3 }, { y: -A, color: COL.c3 }] : [],
        series: [{ pts: hist, color: COL.c1, width: 2.2 }],
        points: [{ x: t, y: xc, color: COL.c1, r: 4 }]
      });
      const circ = [];
      if (k > 0) for (let i = 0; i <= 100; i++){ const a = i / 100 * 2 * Math.PI; circ.push([A * Math.cos(a), A * Math.sin(a)]); }
      plot($('free-phase'), {
        xmin: -pa * 1.25, xmax: pa * 1.25, ymin: -pa * 1.25, ymax: pa * 1.25, xzero: true,
        xlabel: 'x (m)', ylabel: k > 0 ? 'ẋ/ωₙ (m)' : k < 0 ? 'ẋ/√(|k|/m) (m)' : 'ẋ (m/s)',
        series: [{ pts: circ, color: COL.axis, width: 1, dash: [4, 4] }, { pts: trail, color: COL.c1, width: 2 }],
        points: [{ x: xc, y: vc / Om, color: COL.c2, r: 5 }]
      });
      const KE = 0.5 * m * vc * vc, PE = 0.5 * k * xc * xc, E = KE + PE;
      const sc = Math.max(KE, Math.abs(PE), Math.abs(E), 1e-300);
      $('free-ke').style.width = clamp(KE / sc * 100, 0, 100) + '%';
      $('free-pe').style.width = clamp(Math.abs(PE) / sc * 100, 0, 100) + '%';
      $('free-te').style.width = clamp(Math.abs(E) / sc * 100, 0, 100) + '%';
      $('free-ke-v').textContent = fmt(KE, 2) + ' J';
      $('free-pe-v').textContent = fmt(PE, 2) + ' J';
      $('free-te-v').textContent = fmt(E, 2) + ' J';
    }
  };
  makeButtons('free-btn', d, reset, 0.5, C);
  reset();
  register($('demo-free'), d);
})();

/* =========================================================
   3. Damped free vibration
   ========================================================= */
if (document.getElementById('demo-damped')) (function(){
  const C = makeControls('damp-ctl', [
    { key: 'm', label: 'Mass m', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 10, max: 200, step: 1, value: 40, unit: 'N/m', dec: 1 },
    { key: 'z', label: 'Damping ratio ζ', min: 0, max: 2.5, step: 0.01, value: 0.1, unit: '', dec: 3 },
    { key: 'x0', label: 'Initial x₀', min: -0.2, max: 0.2, step: 0.01, value: 0.1, unit: 'm', dec: 3 },
    { key: 'v0', label: 'Initial v₀', min: -2, max: 2, step: 0.05, value: 0, unit: 'm/s', dec: 2 }
  ], () => reset());
  const V = C.v;
  makePresets('damp-pre', [
    { label: 'Undamped ζ=0', apply: () => C.set({ z: 0 }) },
    { label: 'Light ζ=0.05', apply: () => C.set({ z: 0.05 }) },
    { label: 'Underdamped ζ=0.3', apply: () => C.set({ z: 0.3 }) },
    { label: 'Critical ζ=1', apply: () => C.set({ z: 1 }) },
    { label: 'Overdamped ζ=2', apply: () => C.set({ z: 2 }) },
    { label: 'Negative damping ζ=−0.05', apply: () => C.set({ z: -0.05 }) }
  ]);
  let t, ok, m, k, c, tmax, pts, env, ymax, peaks, slow;
  function reset(){
    t = 0; m = V.m; k = V.k;
    const notes = [];
    ok = m > 0;
    if (!ok){ notes.push(MASS_ERROR); showNotes('damp-notes', notes); setStats('damp-stats', []); setStats('damp-peaks', []); return; }
    c = dampingC(V.z, m, k);
    const rate = refRate(m, c, k); slow = slowFactor(rate);
    const { sigma, beta } = roots(m, c, k);
    const Tq = 2 * Math.PI / rate, eps = 1e-9 * rate;
    if (sigma < -eps) tmax = 5 / -sigma;
    else if (sigma > eps) tmax = 6 / sigma;
    else tmax = beta > 0 ? 12 * 2 * Math.PI / beta : 10 * Tq;
    if (beta > 0) tmax = clamp(tmax, 3 * 2 * Math.PI / beta, 12 * 2 * Math.PI / beta);
    tmax = Math.min(tmax, 60 * Tq);
    if (!(tmax > 0) || !isFinite(tmax)) tmax = 10 * Tq;

    const N = 1500;
    pts = []; ymax = 0;
    for (let i = 0; i <= N; i++){ const tt = tmax * i / N, x = lin2(tt, m, c, k, V.x0, V.v0)[0]; pts.push([tt, x]); if (isFinite(x)) ymax = Math.max(ymax, Math.abs(x)); }
    if (!(ymax > 0)) ymax = 0.01;
    env = null;
    if (beta > 0 && c !== 0){
      const Xe = Math.hypot(V.x0, (V.v0 - sigma * V.x0) / beta);
      env = [];
      for (let i = 0; i <= 200; i++){ const tt = tmax * i / 200; env.push([tt, Xe * Math.exp(sigma * tt)]); }
    }
    peaks = [];
    for (let i = 1; i < N; i++){
      if (pts[i][1] > ymax * 1e-9 && pts[i][1] > pts[i - 1][1] && pts[i][1] >= pts[i + 1][1]) peaks.push(pts[i]);
      if (peaks.length >= 5) break;
    }
    const st = [['Regime', regimeText(m, c, k), true]];
    if (k > 0) st.push(['ωₙ', fmt(Math.sqrt(k / m)) + ' rad/s']);
    st.push(['c', fmt(c) + ' N·s/m']);
    if (k > 0) st.push(['c_cr = 2√(km)', fmt(2 * Math.sqrt(k * m)) + ' N·s/m']);
    if (beta > 0){
      st.push(['ω_d', fmt(beta) + ' rad/s']);
      st.push(['δ (theory)', fmt(-2 * Math.PI * sigma / beta)]);
    }
    setStats('damp-stats', st);
    if (peaks.length >= 2){
      const dl = Math.log(peaks[0][1] / peaks[1][1]);
      const zest = dl / Math.sqrt(4 * Math.PI * Math.PI + dl * dl);
      setStats('damp-peaks', [
        ...peaks.slice(0, 3).map((p, i) => [`peak ${i + 1}`, fmt(p[1]) + ' m @ ' + fmt(p[0]) + ' s']),
        ['δ = ln(x₁/x₂)', fmt(dl)],
        ['ζ from δ', fmt(zest), true]
      ]);
    } else {
      setStats('damp-peaks', [['Peaks', 'fewer than two positive peaks, so there is no oscillation to measure']]);
    }
    notes.push(...systemNotes(m, c, k, V.z));
    if (V.x0 === 0 && V.v0 === 0) notes.push({ level: 'info', html: 'Both initial conditions are zero, so the mass stays at rest. Give it a displacement or a velocity.' });
    if (peaks.length >= 2 && c < 0 && k > 0) notes.push({ level: 'info', html: 'With negative damping the peaks <em>grow</em>, so the measured log decrement δ is negative and returns a negative ζ.' });
    if (slow < 1) notes.push(slowNote(rate, slow));
    showNotes('damp-notes', notes);
    drawCmp();
  }
  function drawCmp(){
    const zs = [0, 0.1, 0.3, 1, 2];
    const cols = [COL.c5, COL.c3, COL.c4, COL.c2, COL.fg];
    const series = zs.map((z, j) => {
      const p = []; for (let i = 0; i <= 400; i++){ const tau = 25 * i / 400; p.push([tau, lin2(tau, 1, 2 * z, 1, 1, 0)[0]]); }
      return { pts: p, color: cols[j], width: 1.4, alpha: 0.55 };
    });
    const ks = Math.sign(V.k), cn = ks === 0 ? 0 : 2 * V.z;
    const pc = []; let mx = 1.1;
    for (let i = 0; i <= 400; i++){ const tau = 25 * i / 400, x = lin2(tau, 1, cn, ks, 1, 0)[0]; pc.push([tau, x]); if (isFinite(x)) mx = Math.max(mx, Math.abs(x) * 1.05); }
    series.push({ pts: pc, color: COL.c1, width: 3 });
    d.cmpSeries = series; d.cmpY = Math.min(mx, 50);
    $('damp-cmp-leg').innerHTML = zs.map((z, j) => `<span><span class="sw" style="background:${cols[j]};opacity:.7"></span>ζ = ${z}</span>`).join('') +
      `<span><span class="sw" style="background:${COL.c1}"></span><b>your ζ = ${fmt(V.z)}${ks <= 0 ? ' (k ≤ 0)' : ''}</b></span>`;
  }
  const d = {
    advance(dt){ if (!ok) return; t += dt * slow; if (t > tmax * 1.08) t = 0; },
    draw(){
      if (!ok){ ['damp-anim', 'damp-plot', 'damp-cmp'].forEach(id => drawMessage($(id), 'Enter a positive mass m')); return; }
      const tc = Math.min(t, tmax);
      const x = lin2(tc, m, c, k, V.x0, V.v0)[0];
      drawSMD($('damp-anim'), { x: isFinite(x) ? x : 0, amp: ymax, damper: true });
      const traced = pts.filter(p => p[0] <= tc);
      traced.push([tc, x]);
      const series = [{ pts, color: COL.c1, width: 1.2, alpha: 0.2 }];
      if (env){
        series.push({ pts: env, color: COL.c2, width: 1.5, dash: [5, 4] });
        series.push({ pts: env.map(p => [p[0], -p[1]]), color: COL.c2, width: 1.5, dash: [5, 4] });
      }
      series.push({ pts: traced, color: COL.c1, width: 2.2 });
      plot($('damp-plot'), {
        xmin: 0, xmax: tmax, ymin: -ymax * 1.15, ymax: ymax * 1.15, xlabel: 'time t (s)', ylabel: 'x (m)',
        series,
        points: [...peaks.map(p => ({ x: p[0], y: p[1], color: COL.c4, r: 4 })), { x: tc, y: x, color: COL.c1, r: 4 }]
      });
      plot($('damp-cmp'), {
        xmin: 0, xmax: 25, ymin: -d.cmpY, ymax: d.cmpY, xlabel: 'dimensionless time ωₙt', ylabel: 'x / x₀',
        series: d.cmpSeries
      });
    }
  };
  makeButtons('damp-btn', d, () => { t = 0; }, 0.5, C);
  reset();
  register($('demo-damped'), d);
})();

/* =========================================================
   4. Forced harmonic vibration
   ========================================================= */
if (document.getElementById('demo-forced')) (function(){
  const C = makeControls('frc-ctl', [
    { key: 'm', label: 'Mass m', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 10, max: 200, step: 1, value: 100, unit: 'N/m', dec: 1 },
    { key: 'z', label: 'Damping ratio ζ', min: 0, max: 1, step: 0.01, value: 0.1, unit: '', dec: 3 },
    { key: 'F0', label: 'Force amplitude F₀', min: 1, max: 50, step: 1, value: 10, unit: 'N', dec: 2 },
    { key: 'r', label: 'Frequency ratio r = ω/ωₙ', min: 0, max: 3, step: 0.01, value: 0.5, unit: '', dec: 3 }
  ], () => reset());
  const V = C.v;
  makePresets('frc-pre', [
    { label: 'Quasi-static r=0.2', apply: () => C.set({ r: 0.2, z: 0.1 }) },
    { label: 'Resonance r=1', apply: () => C.set({ r: 1, z: 0.1 }) },
    { label: 'Mass-controlled r=2.5', apply: () => C.set({ r: 2.5, z: 0.1 }) },
    { label: 'Beats (ζ=0, r=0.9)', apply: () => C.set({ r: 0.9, z: 0 }) },
    { label: 'Undamped resonance', apply: () => C.set({ r: 1, z: 0 }) }
  ]);
  const cbSS = $('frc-ss'), cbF = $('frc-f'), cbTr = $('frc-tr');
  let t, s, hist, ok, halted, m, k, c, F0, w, Om, X, phi, yR, rate, slow, W, limit, notes;
  const Mg = (r, z, sg) => 1 / Math.sqrt((sg - r * r) ** 2 + (2 * z * r) ** 2);
  const Pg = (r, z, sg) => Math.atan2(2 * z * r, sg - r * r) * 180 / Math.PI;
  const xss = tt => isFinite(X) ? X * Math.cos(w * tt - phi) : NaN;
  const f = (tt, st) => [st[1], (F0 * Math.cos(w * tt) - c * st[1] - k * st[0]) / m];
  function reset(){
    t = 0; s = [0, 0]; halted = false; m = V.m; k = V.k; F0 = V.F0;
    notes = [];
    ok = m > 0;
    if (!ok){ notes.push(MASS_ERROR); showNotes('frc-notes', notes); setStats('frc-stats', []); return; }
    c = dampingC(V.z, m, k);
    Om = k !== 0 ? Math.sqrt(Math.abs(k) / m) : 1;
    w = Math.abs(V.r) * Om;   // cos(-ωt) = cos(ωt): only |r| matters
    const D = Math.hypot(k - m * w * w, c * w);
    X = D > 0 ? F0 / D : (F0 === 0 ? 0 : Infinity);
    phi = Math.atan2(c * w, k - m * w * w);
    rate = refRate(m, c, k, w); slow = slowFactor(rate); W = 10 * 2 * Math.PI / rate;
    const dst = k !== 0 ? F0 / k : NaN;
    const base = Math.max(isFinite(dst) ? Math.abs(dst) : 0, isFinite(X) ? Math.abs(X) : 0, 1e-3);
    limit = 1e6 * base; yR = base * 1.2;
    hist = [[0, 0, F0, xss(0)]];
    const stable = k > 0 && c >= 0, ra = Math.abs(V.r);
    const st = [];
    st.push(k > 0 ? ['ωₙ', fmt(Om) + ' rad/s'] : k < 0 ? ['Reference √(|k|/m)', fmt(Om) + ' 1/s'] : ['Reference frequency', '1 rad/s (no spring)']);
    st.push(['ω', fmt(w) + ' rad/s']);
    st.push(['c', fmt(c) + ' N·s/m']);
    if (k !== 0) st.push(['δ_st = F₀/k', fmt(dst) + ' m']);
    if (k > 0) st.push(['M = X/δ_st', F0 === 0 ? '—' : fmt(Math.abs(X / dst)), true]);
    st.push(['Steady X', isFinite(X) ? fmt(Math.abs(X)) + ' m' : '∞ (grows without bound)']);
    st.push(['Phase lag φ', D > 0 ? fmt(phi * 180 / Math.PI) + '°' : '— (no steady state)', true]);
    st.push(['Regime', stable ? (ra < 0.6 ? 'stiffness-controlled' : ra < 1.4 ? (c === 0 ? 'near resonance (undamped)' : 'near resonance (damping-controlled)') : 'mass-controlled') : k === 0 && c >= 0 ? 'No spring: purely mass-controlled' : regimeText(m, c, k)]);
    setStats('frc-stats', st);

    notes.push(...systemNotes(m, c, k, V.z));
    if (k < 0 || c < 0) notes.push({ level: 'warn', html: 'Because this system is unstable, the transient grows and swamps everything else. The steady-state curve is still a valid particular solution of the equation, but the motion never settles onto it.' });
    if (k === 0 && c >= 0 && F0 !== 0 && w !== 0) notes.push({ level: 'info', html: 'With no spring only inertia (and damping) resists the force, so the steady-state amplitude is about F₀/(mω²): this is the r ≫ 1, mass-controlled limit with nothing else left.' });
    if (k > 0 && c === 0 && !isFinite(X)) notes.push({ level: 'warn', html: '<b>Undamped resonance.</b> The force is exactly in step with the natural motion and nothing removes energy, so there is no steady state: the amplitude grows linearly, x(t) = (F₀ / 2mωₙ) t sin ωₙt.' });
    else if (k > 0 && c === 0) notes.push({ level: 'info', html: 'With no damping the transient never dies out, so the response is a permanent mix of the natural frequency and the forcing frequency (near r = 1 this mix produces beats).' });
    if (F0 === 0) notes.push({ level: 'info', html: 'With F₀ = 0 there is no force, and the mass starts at rest, so nothing moves.' });
    if (F0 < 0) notes.push({ level: 'info', html: 'A negative F₀ just flips the force by 180°: it is the same as a positive force starting half a cycle later.' });
    if (V.r < 0) notes.push({ level: 'info', html: 'A negative frequency ratio gives exactly the same force, because cos(−ωt) = cos ωt. Only |r| matters.' });
    if (V.r === 0 && k > 0) notes.push({ level: 'info', html: 'r = 0 means a constant force F₀. After the transient, the mass settles at the static deflection F₀/k.' });
    if (slow < 1) notes.push(slowNote(rate, slow));
    showNotes('frc-notes', notes);
  }
  const d = {
    advance(dt){
      if (!ok || halted) return;
      const [tn, sn] = integrate(f, t, s, dt * slow, 2 * Math.PI / rate / 120);
      if (!sn.every(isFinite) || Math.abs(sn[0]) > limit){ halted = true; notes.push(haltNote(limit)); showNotes('frc-notes', notes); return; }
      t = tn; s = sn;
      hist.push([t, s[0], F0 * Math.cos(w * t), xss(t)]);
      while (hist.length > 2 && hist[0][0] < t - W) hist.shift();
    },
    draw(){
      if (!ok){ ['frc-anim', 'frc-plot', 'frc-mag', 'frc-phs'].forEach(id => drawMessage($(id), 'Enter a positive mass m')); return; }
      const dst = k !== 0 ? Math.abs(F0 / k) : 0;
      let target = Math.max(dst * 0.5, 1e-3);
      for (const p of hist){
        target = Math.max(target, Math.abs(p[1]));
        if (cbF.checked && k !== 0) target = Math.max(target, Math.abs(p[2] / k));
        if (cbSS.checked && isFinite(p[3])) target = Math.max(target, Math.abs(p[3]));
      }
      target *= 1.15;
      yR = target > yR ? target : yR + (target - yR) * 0.08;
      const F = F0 * Math.cos(w * t);
      drawSMD($('frc-anim'), { x: s[0], amp: yR / 1.15, damper: true, force: F, forceScale: 55 / Math.max(Math.abs(F0), 1e-12) });
      const t0 = Math.max(0, t - W), t1 = Math.max(W, t);
      const series = [];
      if (cbF.checked && k !== 0) series.push({ pts: hist.map(p => [p[0], p[2] / k]), color: COL.c5, width: 1.5, dash: [6, 4] });
      if (cbSS.checked) series.push({ pts: hist.map(p => [p[0], p[3]]), color: COL.c2, width: 1.6, alpha: 0.9 });
      if (cbTr.checked) series.push({ pts: hist.map(p => [p[0], p[1] - (isFinite(p[3]) ? p[3] : 0)]), color: COL.c3, width: 1.6 });
      series.push({ pts: hist.map(p => [p[0], p[1]]), color: COL.c1, width: 2.2 });
      plot($('frc-plot'), { xmin: t0, xmax: t1, ymin: -yR, ymax: yR, xlabel: 'time t (s)', ylabel: 'x (m)', series });

      const sg = Math.sign(k), ra = Math.abs(V.r), xmax = clamp(ra * 1.1, 3, 50);
      const key = V.z + '|' + sg + '|' + xmax;
      if (!d.fr || d.fr.key !== key){
        const grid = n => Array.from({ length: n + 1 }, (_, i) => xmax * i / n);
        const refs = [0.05, 0.1, 0.25, 0.5, 1].map(z => ({ m: grid(400).map(r => [r, Mg(r, z, 1)]), p: grid(400).map(r => [r, Pg(r, z, 1)]) }));
        const cm = sg !== 0 ? grid(800).map(r => [r, Mg(r, V.z, sg)]) : [];
        const cp = sg !== 0 ? grid(800).map(r => [r, Pg(r, V.z, sg)]) : [];
        d.fr = { key, refs, cm, cp, xmax };
      }
      const pts = sg !== 0;
      plot($('frc-mag'), {
        xmin: 0, xmax: d.fr.xmax, ymin: 0, ymax: 6, xlabel: 'r = ω/ωₙ', ylabel: 'M = X/δst',
        vlines: [{ x: 1, color: COL.axis }],
        series: [...d.fr.refs.map(rf => ({ pts: rf.m, color: COL.c5, width: 1, alpha: 0.6 })), { pts: d.fr.cm, color: COL.c1, width: 2.6 }],
        points: pts ? [{ x: ra, y: Math.min(Mg(ra, V.z, sg), 6), color: COL.c2, r: 6 }] : []
      });
      const pmin = V.z < 0 ? -180 : 0;
      plot($('frc-phs'), {
        xmin: 0, xmax: d.fr.xmax, ymin: pmin, ymax: 180, ystep: 45, xlabel: 'r = ω/ωₙ', ylabel: 'φ (deg)',
        vlines: [{ x: 1, color: COL.axis }], hlines: [{ y: 90, color: COL.axis }],
        series: [...d.fr.refs.map(rf => ({ pts: rf.p, color: COL.c5, width: 1, alpha: 0.6 })), { pts: d.fr.cp, color: COL.c1, width: 2.6 }],
        points: pts ? [{ x: ra, y: Pg(ra, V.z, sg), color: COL.c2, r: 6 }] : []
      });
    }
  };
  makeButtons('frc-btn', d, reset, 0.5, C);
  reset();
  register($('demo-forced'), d);
})();

/* =========================================================
   5. Base excitation
   ========================================================= */
if (document.getElementById('demo-base')) (function(){
  const C = makeControls('base-ctl', [
    { key: 'm', label: 'Mass m', min: 0.5, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 10, max: 200, step: 1, value: 100, unit: 'N/m', dec: 1 },
    { key: 'z', label: 'Damping ratio ζ', min: 0, max: 1, step: 0.01, value: 0.1, unit: '', dec: 3 },
    { key: 'r', label: 'Frequency ratio r', min: 0.1, max: 4, step: 0.01, value: 3, unit: '', dec: 3 },
    { key: 'Y', label: 'Base amplitude Y', min: 0.01, max: 0.05, step: 0.005, value: 0.03, unit: 'm', dec: 4 }
  ], () => reset());
  const V = C.v;
  const TRn = (r, z, sg) => Math.sqrt((1 + (2 * z * r) ** 2) / ((sg - r * r) ** 2 + (2 * z * r) ** 2));
  let t, s, hist, ok, halted, m, k, c, Y, w, Om, yR, rate, slow, W, limit, notes;
  const yb = tt => Y * Math.sin(w * tt), ybd = tt => Y * w * Math.cos(w * tt);
  const f = (tt, st) => [st[1], (-c * (st[1] - ybd(tt)) - k * (st[0] - yb(tt))) / m];
  function reset(){
    t = 0; s = [0, 0]; halted = false; m = V.m; k = V.k; Y = V.Y;
    notes = [];
    ok = m > 0;
    if (!ok){ notes.push(MASS_ERROR); showNotes('base-notes', notes); setStats('base-stats', []); return; }
    c = dampingC(V.z, m, k);
    Om = k !== 0 ? Math.sqrt(Math.abs(k) / m) : 1;
    w = V.r * Om;
    rate = refRate(m, c, k, w); slow = slowFactor(rate); W = 10 * 2 * Math.PI / rate;
    const num = Math.hypot(k, c * w), den = Math.hypot(k - m * w * w, c * w);
    const TR = den > 0 ? num / den : (num > 0 ? Infinity : NaN);
    const base = Math.max(Math.abs(Y), isFinite(TR) ? TR * Math.abs(Y) : 0, 1e-3);
    limit = 1e6 * base; yR = base * 1.2;
    hist = [[0, 0, 0]];
    const stable = k > 0 && c >= 0;
    setStats('base-stats', [
      k > 0 ? ['ωₙ', fmt(Om) + ' rad/s'] : k < 0 ? ['Reference √(|k|/m)', fmt(Om) + ' 1/s'] : ['Reference frequency', '1 rad/s (no spring)'],
      ['ω', fmt(w) + ' rad/s'],
      ['TR = X/Y', fmt(TR), true],
      ['Steady X', isFinite(TR) ? fmt(TR * Math.abs(Y)) + ' m' : '∞'],
      ['Result', stable ? (Math.abs(V.r) > Math.SQRT2 ? 'isolation (TR < 1)' : 'amplification (TR ≥ 1)') : (k === 0 && c === 0) ? 'mass not connected to base' : (k === 0 && c > 0) ? 'damper only: no spring' : regimeText(m, c, k), true]
    ]);
    notes.push(...systemNotes(m, c, k, V.z));
    if (k < 0 || c < 0) notes.push({ level: 'warn', html: 'Because this system is unstable, the motion grows on its own and the transmissibility (a steady-state idea) does not describe what you see.' });
    if (k === 0 && c === 0) notes.push({ level: 'info', html: 'With k = 0 and no damping, the mass is not connected to the base at all, so the base motion has no effect on it.' });
    if (Y === 0) notes.push({ level: 'info', html: 'With Y = 0 the base does not move, so nothing excites the mass.' });
    if (V.r < 0) notes.push({ level: 'info', html: 'A negative frequency ratio is the same motion shifted by half a cycle. Only |r| matters for TR.' });
    if (slow < 1) notes.push(slowNote(rate, slow));
    showNotes('base-notes', notes);
    d.fr = null;
  }
  const d = {
    advance(dt){
      if (!ok || halted) return;
      const [tn, sn] = integrate(f, t, s, dt * slow, 2 * Math.PI / rate / 120);
      if (!sn.every(isFinite) || Math.abs(sn[0]) > limit){ halted = true; notes.push(haltNote(limit)); showNotes('base-notes', notes); return; }
      t = tn; s = sn;
      hist.push([t, s[0], yb(t)]);
      while (hist.length > 2 && hist[0][0] < t - W) hist.shift();
    },
    draw(){
      if (!ok){ ['base-anim', 'base-plot', 'base-tr'].forEach(id => drawMessage($(id), 'Enter a positive mass m')); return; }
      let target = Math.max(Math.abs(Y), 1e-3);
      for (const p of hist) target = Math.max(target, Math.abs(p[1]));
      target *= 1.15; yR = target > yR ? target : yR + (target - yR) * 0.08;
      drawBaseV($('base-anim'), { x: s[0], y: yb(t), amp: yR / 1.15 });
      const t0 = Math.max(0, t - W), t1 = Math.max(W, t);
      plot($('base-plot'), {
        xmin: t0, xmax: t1, ymin: -yR, ymax: yR, xlabel: 'time t (s)', ylabel: 'displacement (m)',
        series: [{ pts: hist.map(p => [p[0], p[2]]), color: COL.c5, width: 1.8, dash: [6, 4] }, { pts: hist.map(p => [p[0], p[1]]), color: COL.c1, width: 2.2 }]
      });
      const sg = Math.sign(k), ra = Math.abs(V.r), xmax = clamp(ra * 1.1, 4, 50);
      if (!d.fr || d.fr.xmax !== xmax){
        const grid = n => Array.from({ length: n + 1 }, (_, i) => xmax * i / n);
        const refs = [0.05, 0.1, 0.25, 0.5, 1].map(z => grid(400).map(r => [r, TRn(r, z, 1)]));
        const cur = sg !== 0 ? grid(800).map(r => [r, TRn(r, V.z, sg)]) : [];
        d.fr = { refs, cur, xmax };
      }
      plot($('base-tr'), {
        xmin: 0, xmax: d.fr.xmax, ymin: 0, ymax: 5, xlabel: 'r = ω/ωₙ', ylabel: 'TR = X/Y',
        bands: [{ x0: Math.SQRT2, x1: d.fr.xmax, color: COL.band }],
        vlines: [{ x: Math.SQRT2, color: COL.c3, label: 'r = √2' }], hlines: [{ y: 1, color: COL.axis }],
        series: [...d.fr.refs.map(p => ({ pts: p, color: COL.c5, width: 1, alpha: 0.6 })), { pts: d.fr.cur, color: COL.c1, width: 2.6 }],
        points: sg !== 0 ? [{ x: ra, y: Math.min(TRn(ra, V.z, sg), 5), color: COL.c2, r: 6 }] : []
      });
    }
  };
  makeButtons('base-btn', d, reset, 0.25, C);
  reset();
  register($('demo-base'), d);
})();


/* =========================================================
   Challenge checks (see CHALLENGES in common.js)
   ========================================================= */
(function(){
  const V = id => CONTROLS[id] || {};
  const pos = (...a) => a.every(v => v > 0);
  const near = (a, b, tol) => Math.abs(a - b) <= tol;
  const g = 9.81;
  const pendErr = th0 => {               // % by which the exact period exceeds the linear one
    const th = Math.abs((((th0 + 180) % 360) + 360) % 360 - 180) * Math.PI / 180, kk = Math.sin(th / 2);
    if (kk >= 1) return Infinity;
    let a = 1, b = Math.sqrt(1 - kk * kk); for (let i = 0; i < 40; i++){ const an = (a + b) / 2; b = Math.sqrt(a * b); a = an; }
    return (1 / a - 1) * 100;
  };
  let th1pct = null;
  const threshold1 = () => { if (th1pct === null){ let lo = 1, hi = 90; for (let i = 0; i < 60; i++){ const mid = (lo + hi) / 2; if (pendErr(mid) < 1) lo = mid; else hi = mid; } th1pct = lo; } return th1pct; };
  const seen = {};
  const visits = id => {
    const p = V(id);
    if (!seen[id]) seen[id] = [Object.assign({}, p._defaults)];
    const cur = Object.assign({}, p), last = seen[id][seen[id].length - 1];
    if (Object.keys(cur).some(k => cur[k] !== last[k])){ seen[id].push(cur); if (seen[id].length > 400) seen[id].shift(); }
    return seen[id];
  };
  window.CH_TRACK = () => { if (CONTROLS['free-ctl'] && CONTROLS['free-ctl']._touched) visits('free-ctl'); };
  const M = (r, z) => 1 / Math.sqrt((1 - r * r) ** 2 + (2 * z * r) ** 2);
  const TR = (r, z) => Math.sqrt((1 + (2 * z * r) ** 2) / ((1 - r * r) ** 2 + (2 * z * r) ** 2));

  // Chapter 1
  CHECKS.pend5 = () => { const p = V('pend-ctl'); if (!near(p.L, 0.5, 0.005)) return false;
    const T = 2 * Math.PI * Math.sqrt(p.L / g) * (1 + pendErr(p.th0) / 100); return near(T, 1.5, 0.01); };
  CHECKS.pend1 = () => { const p = V('pend-ctl'); return pos(p.L) && pendErr(p.th0) < 1 && Math.abs(Math.abs(p.th0) - threshold1()) <= 1; };
  // Chapter 2
  CHECKS.tick1 = () => { const p = V('free-ctl'); if (!near(p.m, 2.5, 0.01) || !pos(p.k)) return false;
    return near(Math.sqrt(p.k / p.m) / (2 * Math.PI), 1, 0.005); };
  CHECKS.isochron = () => {
    const p = V('free-ctl'); if (!pos(p.m, p.k) || p.x0 !== 0 || p.v0 === 0) return false;
    return visits('free-ctl').some(q => q.m === p.m && q.k === p.k && q.x0 === 0 && q.v0 !== 0 && Math.max(Math.abs(p.v0 / q.v0), Math.abs(q.v0 / p.v0)) >= 5 - 1e-9);
  };
  CHECKS.split = () => {
    const p = V('free-ctl'); if (!pos(p.m, p.k) || p.x0 === 0 || p.v0 === 0) return false;
    const KE = 0.5 * p.m * p.v0 * p.v0, PE = 0.5 * p.k * p.x0 * p.x0;
    return near(KE + PE, 0.5, 0.025) && near(KE / PE, 1, 0.05);
  };
  CHECKS.scale = () => { const p = V('free-ctl'); if (!pos(p.m, p.k)) return false;
    return visits('free-ctl').some(q => q.k === p.k && q.m > 0 && near(Math.sqrt(q.m / p.m), 3, 0.06)); };
  // Chapter 3
  CHECKS.crit = () => { const p = V('damp-ctl'); if (!pos(p.m, p.k) || p.v0 !== 0 || p.x0 === 0 || p.z < 0.98 || p.z > 1.02) return false;
    return 5.834 / Math.sqrt(p.k / p.m) <= 0.5; };
  CHECKS.logdec = () => { const p = V('damp-ctl'); if (!pos(p.m, p.k) || !(p.z > 0 && p.z < 1)) return false;
    return near(Math.exp(-2 * Math.PI * p.z / Math.sqrt(1 - p.z * p.z)), 0.5, 0.01); };
  CHECKS.over = () => {
    const p = V('damp-ctl'); if (!pos(p.m, p.k) || !(p.z >= 2) || p.x0 === 0) return false;
    const wn = Math.sqrt(p.k / p.m), q = Math.sqrt(p.z * p.z - 1), s1 = wn * (-p.z + q), s2 = wn * (-p.z - q);
    return (p.v0 - s2 * p.x0) / (s1 - s2) * p.x0 < 0;
  };
  CHECKS.pump = () => { const p = V('damp-ctl'); if (!pos(p.m, p.k) || !(p.z < 0 && p.z > -1) || (p.x0 === 0 && p.v0 === 0)) return false;
    return near(Math.exp(-2 * Math.PI * p.z / Math.sqrt(1 - p.z * p.z)), 1.5, 0.03); };
  CHECKS.wd = () => { const p = V('damp-ctl'); return pos(p.m, p.k) && p.z > 0 && p.z < 1 && near(1 / Math.sqrt(1 - p.z * p.z), 1.25, 0.0125); };
  // Chapter 4
  CHECKS.res10 = () => { const p = V('frc-ctl'); return pos(p.m, p.k) && p.F0 !== 0 && near(p.z, 0.05, 0.001) && near(M(Math.abs(p.r), p.z), 8, 0.16); };
  CHECKS.calm = () => { const p = V('frc-ctl'); return pos(p.m, p.k) && p.F0 !== 0 && near(p.z, 0.3, 0.005) && near(M(Math.abs(p.r), p.z), 0.1, 0.003); };
  CHECKS.beats = () => { const p = V('frc-ctl'); if (!pos(p.m, p.k) || p.z !== 0 || p.F0 === 0) return false;
    const wn = Math.sqrt(p.k / p.m); if (!near(wn, 10, 0.1)) return false;
    const dw = wn * Math.abs(1 - Math.abs(p.r)); return dw > 0 && near(2 * Math.PI / dw, 5, 0.1); };
  CHECKS.phase90 = () => { const p = V('frc-ctl'); if (!pos(p.m, p.k) || !near(p.z, 0.2, 0.005)) return false;
    const r = Math.abs(p.r); return near(Math.atan2(2 * p.z * r, 1 - r * r) * 180 / Math.PI, 135, 1); };
  CHECKS.peak = () => { const p = V('frc-ctl'); if (!pos(p.m, p.k) || p.z < 0.3 || p.z > 0.6) return false;
    return near(Math.abs(p.r), Math.sqrt(1 - 2 * p.z * p.z), 0.005); };
  // Chapter 5
  CHECKS.iso = () => { const p = V('base-ctl'); return pos(p.m, p.k) && p.Y !== 0 && p.z >= 0.1 && TR(Math.abs(p.r), p.z) < 0.05; };
  CHECKS.shake = () => { const p = V('base-ctl'); const r = Math.abs(p.r); return pos(p.m, p.k) && p.Y !== 0 && near(p.z, 0.1, 0.002) && r < 1 && near(TR(r, p.z), 3, 0.06); };
  CHECKS.sqrt2 = () => { const p = V('base-ctl'); return pos(p.m, p.k) && p.z >= 0.3 && near(Math.abs(p.r), Math.SQRT2, 0.005); };
  CHECKS.dhurts = () => { const p = V('base-ctl'); return pos(p.m, p.k) && near(Math.abs(p.r), 3, 0.01) && near(TR(3, p.z), 0.2, 0.004); };
})();
