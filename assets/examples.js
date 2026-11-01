/* =========================================================
   Worked-example animations. Each example draws its own system
   and is driven by its 1-DOF equation of motion
       m_eq x'' + c_eq x' + k_eq x = F(t)
   integrated with RK4 (see common.js).
   ========================================================= */

/* ---------- generic example runner ---------- */
function makeExample(cfg){
  const id = cfg.id;
  if (!$(id)) return;
  const C = makeControls(id + '-ctl', cfg.controls, () => reset());
  const V = C.v;
  if (cfg.presets) makePresets(id + '-pre', cfg.presets(C));
  const cb = $(id + '-cb');
  let M, t, s, hist, ok, halted, yR, rate, slow, W, limit, notes, pre, ampD, loopT, hold;
  const f = (tt, st) => [st[1], (M.F(tt) - M.c * st[1] - M.k * st[0]) / M.m];
  function reset(){
    t = 0; halted = false;
    M = cfg.model(V, cb ? cb.checked : false);
    notes = [];
    ok = !M.error;
    if (!ok){ notes.push({ level: 'error', html: M.error }); showNotes(id + '-notes', notes); setStats(id + '-stats', []); return; }
    s = [M.x0, M.v0];
    rate = refRate(M.m, M.c, M.k, M.w || 0); slow = slowFactor(rate);
    W = (cfg.periods || 8) * 2 * Math.PI / rate;
    const sc = Math.max(Math.abs(M.x0), Math.abs(M.v0) / rate, isFinite(M.scale) ? Math.abs(M.scale) : 0, 1e-4);
    limit = 1e6 * sc; yR = sc * 1.2; ampD = sc;
    loopT = Infinity; hold = 0;
    if (cfg.loop){ const rt = roots(M.m, M.c, M.k); if (rt.sigma < -1e-9) loopT = Math.min(5 / -rt.sigma, 60 * 2 * Math.PI / rate); }
    hist = [[0, M.x0]];
    pre = M.prelude ? 0 : null;
    setStats(id + '-stats', M.stats || []);
    notes.push(...systemNotes(M.m, M.c, M.k), ...(M.notes || []));
    if (slow < 1) notes.push(slowNote(rate, slow));
    showNotes(id + '-notes', notes);
  }
  const d = {
    advance(dt){
      if (!ok || halted) return;
      if (pre !== null && pre < M.prelude){ pre += dt; return; }
      if (t > loopT){ hold += dt; if (hold > 1.2) reset(); return; }
      const [tn, sn] = integrate(f, t, s, dt * slow, 2 * Math.PI / rate / 120);
      if (!sn.every(isFinite) || Math.abs(sn[0]) > limit){ halted = true; notes.push(haltNote(limit)); showNotes(id + '-notes', notes); return; }
      t = tn; s = sn;
      hist.push([t, s[0]]);
      while (hist.length > 2 && hist[0][0] < t - W) hist.shift();
    },
    draw(){
      if (!ok){
        drawMessage($(id + '-anim'), 'Check the parameter values');
        drawMessage($(id + '-plot'), 'No simulation');
        if ($(id + '-plot2')) drawMessage($(id + '-plot2'), '');
        return;
      }
      const ov = M.overlays || [];
      let target = Math.max(isFinite(M.scale) ? Math.abs(M.scale) : 0, 1e-4);
      for (const p of hist){
        target = Math.max(target, Math.abs(p[1]));
        for (const o of ov){ const v = o.f(p[0]); if (isFinite(v)) target = Math.max(target, Math.abs(v)); }
      }
      (M.hlines || []).forEach(y => { target = Math.max(target, Math.abs(y)); });
      target *= 1.15;
      yR = target > yR ? target : yR + (target - yR) * 0.08;
      const cv = $(id + '-anim'); const { ctx, w, h } = fit(cv);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ampD = Math.max(ampD, Math.abs(s[0]));
      cfg.draw(ctx, w, h, { x: s[0], v: s[1], t, V, M, amp: ampD, prelude: (pre !== null && pre < M.prelude) ? pre / M.prelude : null });
      ctx.restore();
      const kf = cfg.yFactor || 1, t0 = Math.max(0, t - W), t1 = Math.max(W, t);
      const series = ov.map(o => ({ pts: hist.map(p => [p[0], o.f(p[0]) * kf]), color: o.color || COL.c2, width: 1.6, dash: o.dash || [6, 4] }));
      series.push({ pts: hist.map(p => [p[0], p[1] * kf]), color: COL.c1, width: 2.2 });
      plot($(id + '-plot'), {
        xmin: t0, xmax: t1, ymin: -yR * kf, ymax: yR * kf, xlabel: 'time t (s)', ylabel: cfg.ylabel || 'x (m)', series,
        hlines: (M.hlines || []).map(y => ({ y: y * kf, color: COL.c3 }))
      });
      if (cfg.plot2) cfg.plot2($(id + '-plot2'), V, M);
    }
  };
  makeButtons(id + '-btn', d, reset, cfg.speed ?? 0.5, C);
  if (cb) cb.addEventListener('change', reset);
  reset();
  register($(id), d);
}

/* =========================================================
   Example 1: block on incline + pulley + hanging block
   (5m/4) x'' + k x = f(t)/2
   ========================================================= */
makeExample({
  id: 'ex1',
  controls: [
    { key: 'm', label: 'Mass m (each)', min: 0.5, max: 10, step: 0.1, value: 2, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 20, max: 500, step: 5, value: 200, unit: 'N/m', dec: 1 },
    { key: 'th', label: 'Incline angle θ', min: 0, max: 60, step: 1, value: 30, unit: '°', dec: 1 },
    { key: 'x0', label: 'Initial x₀', min: -0.1, max: 0.1, step: 0.005, value: 0.05, unit: 'm', dec: 3 },
    { key: 'F0', label: 'Force amplitude F₀', min: 0, max: 40, step: 1, value: 0, unit: 'N', dec: 1 },
    { key: 'w', label: 'Force frequency ω', min: 0, max: 30, step: 0.5, value: 8, unit: 'rad/s', dec: 2 }
  ],
  model(V){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    const m = 1.25 * V.m, k = V.k;
    const notes = [];
    if (V.F0 !== 0) notes.push({ level: 'info', html: 'f(t) = F₀ sin ωt acts on B, but only <b>half</b> of it appears in the equation for x, because B moves half as far as A.' });
    return {
      m, c: 0, k, w: V.w, F: t => 0.5 * V.F0 * Math.sin(V.w * t), x0: V.x0, v0: 0,
      scale: Math.max(Math.abs(V.x0), k > 0 ? Math.abs(0.5 * V.F0 / k) : 0),
      stats: [['m_eq = 5m/4', fmt(m) + ' kg'], ['k_eq = k', fmt(k) + ' N/m'], ...freqStats(m, k, 'ωₙ = 2√(k/5m)'),
        ['Static spring stretch', (() => { const v = V.m * 9.81 * (0.5 - Math.sin(V.th * Math.PI / 180)) / V.k; return fmt(Math.abs(v) < 1e-12 ? 0 : v) + ' m'; })()]],
      notes
    };
  },
  draw(ctx, w, h, S){
    const th = clamp(S.V.th, -75, 75) * Math.PI / 180;
    const u = [Math.cos(th), -Math.sin(th)], n = [-Math.sin(th), -Math.cos(th)];
    const pt = (s, hh) => [s * u[0] + hh * n[0], s * u[1] + hh * n[1]];
    const Lin = 330, ha = 18, s0 = 165, r = 16, r2 = 10, bw = 52, bh = 36;
    const d = clamp(S.x * 40 / S.amp, -110, 110);
    const a = pt(Lin, ha), C = [a[0] - r * n[0], a[1] - r * n[1]];
    const xR = C[0] + r, Qx = xR - r2, Qy0 = C[1] + 120, Qy = Qy0 + d / 2;
    const xs = [pt(0, 75)[0], pt(0, -12)[0], -10, C[0] + r + 50], ys = [pt(0, 75)[1], C[1] - r, -10];
    fitView(ctx, w, h, [Math.min(...xs) - 10, Math.min(...ys) - 20, Math.max(...xs) + 10, Qy0 + 115]);
    // horizontal reference and angle
    line(ctx, 0, 0, 90, 0, COL.axis, 1, [4, 4]);
    ctx.save(); ctx.strokeStyle = COL.muted; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, 60, -th, 0); ctx.stroke(); ctx.restore();
    txt(ctx, 'θ', 75 * Math.cos(th / 2), -75 * Math.sin(th / 2) + 4, { color: COL.muted });
    // wall, incline surface, pulley support
    const w1 = pt(0, -12), w2 = pt(0, 80); hatch(ctx, w1[0], w1[1], w2[0], w2[1], -1);
    const e = pt(Lin - 6, 0); hatch(ctx, 0, 0, e[0], e[1], 1);
    line(ctx, e[0], e[1], e[0], e[1] + 150, COL.ground, 1.6);
    line(ctx, C[0], C[1], e[0], e[1], COL.ground, 2);
    // spring and block A
    const sl = pt(s0 + d - bw / 2, ha), sw = pt(0, ha);
    springLine(ctx, sw[0], sw[1], sl[0], sl[1], 9, 8);
    const bc = pt(s0 + d, bh / 2); block(ctx, bc[0], bc[1], bw, bh, -th, 'A');
    const kp = pt((s0 + d - bw / 2) / 2, ha + 26); txt(ctx, 'k', kp[0], kp[1]);
    // cable
    const ar = pt(s0 + d + bw / 2, ha), an = Math.atan2(n[1], n[0]);
    cable(ctx, () => {
      ctx.moveTo(ar[0], ar[1]); ctx.lineTo(a[0], a[1]); ctx.arc(C[0], C[1], r, an, 0);
      ctx.lineTo(xR, Qy); ctx.arc(Qx, Qy, r2, 0, Math.PI); ctx.lineTo(Qx - r2, C[1] + r * 0.8); ctx.lineTo(C[0], C[1]);
    });
    pulley(ctx, C[0], C[1], r); pulley(ctx, Qx, Qy, r2);
    // block B and force
    line(ctx, Qx, Qy, Qx, Qy + 16, COL.spring, 2);
    block(ctx, Qx, Qy + 38, 42, 44, 0, 'B');
    if (S.V.F0 !== 0){ const F = Math.sin(S.V.w * S.t) * Math.sign(S.V.F0); forceArrow(ctx, Qx, Qy + 62, 42 * F, 'f(t)', true); }
  }
});

/* =========================================================
   Example 2: block A + pulley + hanging block B on a spring
   (7m/4) x'' + (13k/4) x = 3mg/2
   ========================================================= */
makeExample({
  id: 'ex2',
  controls: [
    { key: 'm', label: 'Mass m', min: 0.2, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 20, max: 500, step: 5, value: 100, unit: 'N/m', dec: 1 },
    { key: 'x0', label: 'Initial x₀', min: -0.1, max: 0.2, step: 0.005, value: 0, unit: 'm', dec: 3 },
    { key: 'v0', label: 'Initial v₀', min: -1, max: 1, step: 0.05, value: 0, unit: 'm/s', dec: 2 }
  ],
  model(V){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    const m = 1.75 * V.m, k = 3.25 * V.k, g = 9.81, xst = V.k !== 0 ? 6 * V.m * g / (13 * V.k) : Infinity;
    return {
      m, c: 0, k, F: () => 1.5 * V.m * g, x0: V.x0, v0: V.v0, xst: isFinite(xst) ? xst : 0,
      scale: isFinite(xst) ? Math.abs(xst) * 2 : 0.05, hlines: isFinite(xst) ? [xst] : [],
      stats: [['m_eq = 7m/4', fmt(m) + ' kg'], ['k_eq = 13k/4', fmt(k) + ' N/m'], ...freqStats(m, k, 'ωₙ = √(13k/7m)'),
        ['Static equilibrium x_st = 6mg/13k', fmt(xst) + ' m', true]],
      notes: [{ level: 'info', html: 'x is measured from the position where both springs are unstretched, so the weight of B appears as a constant force 3mg/2. The motion is a vibration about x_st (green line). Released from rest at x = 0, A swings between 0 and 2x_st.' }]
    };
  },
  draw(ctx, w, h, S){
    const d = clamp(S.x * 40 / S.amp, -150, 150), xs = clamp((S.M.xst || 0) * 40 / S.amp, -150, 150);
    const r = 16, r2 = 10, Cx = 430, Cy = 116, xR = Cx + r, Qx = xR - r2, Qy0 = Cy + 140, Qy = Qy0 + d / 2, G = Qy0 + 64 + 95;
    fitView(ctx, w, h, [-15, 30, 520, G + 15]);
    hatch(ctx, 0, 40, 0, 150, 1);
    ctx.save(); ctx.fillStyle = COL.c5; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.moveTo(40, 120); ctx.lineTo(410, 120); ctx.lineTo(410, 320); ctx.closePath(); ctx.fill(); ctx.restore();
    line(ctx, 40, 120, 410, 120, COL.ground, 1.6);
    line(ctx, 200, 62, 200, 126, COL.axis, 1, [4, 4]); txt(ctx, 'x = 0', 200, 52, { font: '11px system-ui', color: COL.muted, align: 'right' });
    if (Math.abs(xs) > 1){ line(ctx, 200 + xs, 62, 200 + xs, 126, COL.c3, 1.2, [4, 4]); txt(ctx, ' xₛₜ (equilibrium)', 200 + xs, 52, { font: '11px system-ui', color: COL.c3, align: 'left' }); }
    const cx = 200 + d;
    springLine(ctx, 0, 100, cx - 32, 100, 10, 8); txt(ctx, '3k', (cx - 32) / 2, 78);
    block(ctx, cx, 100, 64, 40, 0, 'A');
    line(ctx, Cx, Cy, 410, 128, COL.ground, 2);
    cable(ctx, () => {
      ctx.moveTo(cx + 32, 100); ctx.lineTo(Cx, 100); ctx.arc(Cx, Cy, r, -Math.PI / 2, 0);
      ctx.lineTo(xR, Qy); ctx.arc(Qx, Qy, r2, 0, Math.PI); ctx.lineTo(Qx - r2, Cy + r * 0.8); ctx.lineTo(Cx, Cy);
    });
    pulley(ctx, Cx, Cy, r); pulley(ctx, Qx, Qy, r2);
    line(ctx, Qx, Qy, Qx, Qy + 16, COL.spring, 2);
    block(ctx, Qx, Qy + 40, 54, 48, 0, 'B');
    springLine(ctx, Qx, Qy + 64, Qx, G, 9, 9); txt(ctx, 'k', Qx + 26, (Qy + 64 + G) / 2);
    hatch(ctx, Qx - 40, G, Qx + 40, G, 1);
  }
});

/* =========================================================
   Example 3: two carts linked to a pivoting massless bar
   (5m/4) x'' + (5k/4) x = 0
   ========================================================= */
makeExample({
  id: 'ex3',
  controls: [
    { key: 'm', label: 'Mass m (each)', min: 0.2, max: 5, step: 0.1, value: 1, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 10, max: 400, step: 5, value: 100, unit: 'N/m', dec: 1 },
    { key: 'L', label: 'Bar length L', min: 0.2, max: 3, step: 0.1, value: 1, unit: 'm', dec: 2 },
    { key: 'x0', label: 'Initial x₀', min: -0.1, max: 0.1, step: 0.005, value: 0.05, unit: 'm', dec: 3 }
  ],
  model(V){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    if (!(V.L > 0)) return posErr('The bar length L');
    const m = 1.25 * V.m, k = 1.25 * V.k;
    return {
      m, c: 0, k, F: () => 0, x0: V.x0, v0: 0, scale: Math.abs(V.x0),
      stats: [['m_eq = 5m/4', fmt(m) + ' kg'], ['k_eq = 5k/4', fmt(k) + ' N/m'], ...freqStats(m, k, 'ωₙ = √(k/m)'), ['Bar angle θ₀ = x₀/L', fmt(V.x0 / V.L * 180 / Math.PI) + '°']],
      notes: [{ level: 'info', html: 'Change L: the bar angle changes but ωₙ does not. Both the inertia and the stiffness terms pick up the same factor (1 + ¼), so the lever ratio cancels.' }]
    };
  },
  draw(ctx, w, h, S){
    const d = clamp(S.x * 40 / S.amp, -110, 110), P = [300, 330], Ld = 260;
    const ph = Math.asin(clamp(d / Ld, -0.8, 0.8));
    const top = [P[0] + Ld * Math.sin(ph), P[1] - Ld * Math.cos(ph)], mid = [P[0] + Ld / 2 * Math.sin(ph), P[1] - Ld / 2 * Math.cos(ph)];
    fitView(ctx, w, h, [5, 30, 615, 365]);
    const ux = 450 + (top[0] - P[0]);
    hatch(ctx, 380, 102, 540, 102, 1);
    hatch(ctx, 600, 40, 600, 110, -1);
    springLine(ctx, ux + 37, 70, 600, 70, 9, 8); txt(ctx, 'k', (ux + 37 + 600) / 2, 48);
    line(ctx, top[0], top[1], ux - 37, 70, COL.spring, 1.5);
    block(ctx, ux, 70, 74, 44, 0, 'm'); wheels(ctx, ux, 92, 74);
    const lx = 150 + (mid[0] - P[0]);
    hatch(ctx, 70, 232, 240, 232, 1);
    hatch(ctx, 20, 160, 20, 240, 1);
    springLine(ctx, 20, 200, lx - 37, 200, 9, 8); txt(ctx, 'k', (20 + lx - 37) / 2, 178);
    line(ctx, lx + 37, 200, mid[0], mid[1], COL.spring, 1.5);
    block(ctx, lx, 200, 74, 44, 0, 'm'); wheels(ctx, lx, 222, 74);
    line(ctx, P[0], P[1], top[0], top[1], COL.c5, 11);
    [top, mid, P].forEach(p => { ctx.fillStyle = COL.fg; ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, 2 * Math.PI); ctx.fill(); });
    ctx.save(); ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(P[0] - 14, P[1] + 22); ctx.lineTo(P[0], P[1]); ctx.lineTo(P[0] + 14, P[1] + 22); ctx.stroke(); ctx.restore();
    hatch(ctx, 255, P[1] + 22, 345, P[1] + 22, 1);
    txt(ctx, 'L/2', 362, 265, { font: '13px system-ui', color: COL.muted }); txt(ctx, 'L/2', 362, 135, { font: '13px system-ui', color: COL.muted });
  }
});

/* =========================================================
   Example 4: impact, A (2m) sticks to B (m) on spring + damper
   3m x'' + c x' + k x = 0,  x(0) = 0, x'(0) = 2v/3
   ========================================================= */
makeExample({
  id: 'ex4', loop: true,
  controls: [
    { key: 'm', label: 'Mass m', min: 1, max: 30, step: 1, value: 10, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 500, max: 10000, step: 100, value: 3000, unit: 'N/m', dec: 0 },
    { key: 'c', label: 'Damping c', min: 0, max: 300, step: 5, value: 30, unit: 'N·s/m', dec: 1 },
    { key: 'v', label: 'Impact speed v', min: 1, max: 50, step: 1, value: 30, unit: 'm/s', dec: 2 }
  ],
  model(V){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    const M = 3 * V.m, c = V.c, k = V.k, V0 = 2 * V.v / 3;
    const st = [['Combined mass 3m', fmt(M) + ' kg'], ['V₀ = 2v/3', fmt(V0) + ' m/s', true]];
    const notes = [], overlays = [];
    const r = roots(M, c, k);
    if (k > 0){
      const wn = Math.sqrt(k / M), z = c / (2 * Math.sqrt(k * M));
      st.push(['ωₙ', fmt(wn) + ' rad/s'], ['ζ', fmt(z)]);
      if (z >= 0 && z < 1){
        const wd = wn * Math.sqrt(1 - z * z), X0 = V0 / wd;
        st.push(['ω_d', fmt(wd) + ' rad/s'], ['V₀/ω_d', fmt(X0) + ' m']);
        notes.push({ level: 'info', html: `Result: <b>x(t) = ${fmt(X0)} e<sup>−${fmt(z * wn)} t</sup> sin(${fmt(wd)} t) m</b>. The dashed curves are the decay envelope ±(V₀/ω_d) e<sup>−ζωₙt</sup>.` });
        overlays.push({ f: t => X0 * Math.exp(-z * wn * t) }, { f: t => -X0 * Math.exp(-z * wn * t) });
      }
    }
    st.push(['Kinetic energy lost in impact', '1/3 (' + fmt(V.m * V.v * V.v / 3) + ' J)']);
    return { m: M, c, k, F: () => 0, x0: 0, v0: V0, scale: V0 / refRate(M, c, k), prelude: 1.0, overlays, stats: st, notes };
  },
  draw(ctx, w, h, S){
    const d = clamp(S.x * 28 / S.amp, -60, 60), pl = 160 - d;
    fitView(ctx, w, h, [-15, 0, 720, 135]);
    hatch(ctx, 0, 120, 0, 10, -1);
    hatch(ctx, 20, 112, 500, 112, 1);
    hatch(ctx, 500, 100, 712, 100, 1); line(ctx, 500, 100, 500, 112, COL.ground, 1.6);
    springLine(ctx, 0, 48, pl, 48, 9, 8); txt(ctx, 'k', pl / 2, 28);
    damperLine(ctx, 0, 84, pl, 84, 160); txt(ctx, 'c', pl / 2, 106);
    ctx.save(); ctx.fillStyle = COL.c5; ctx.globalAlpha = 0.45; ctx.strokeStyle = COL.ground;
    ctx.beginPath(); ctx.moveTo(pl, 30); ctx.lineTo(pl + 15, 30); ctx.lineTo(pl + 15, 100); ctx.lineTo(pl + 280, 100); ctx.lineTo(pl + 280, 110); ctx.lineTo(pl, 110); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; ctx.stroke(); ctx.restore();
    txt(ctx, 'B', pl + 28, 20);
    let ax = pl + 37;
    if (S.prelude !== null){
      ax = 640 + (197 - 640) * S.prelude;
      arrow(ctx, ax + 30, 40, ax - 30, 40, COL.c1, 2.5); txt(ctx, 'v', ax, 26, { color: COL.c1 });
    }
    block(ctx, ax, 80, 44, 40, 0, 'A', COL.c5);
    txt(ctx, '2m', ax + 36, 68, { font: '13px system-ui', color: COL.muted });
    if (S.prelude === null) txt(ctx, '+x ←', 300, 20, { font: '12px system-ui', color: COL.muted });
  }
});

/* =========================================================
   Example 5: pinned bar with spring at a, damper at b (top view)
   (mb²/3) θ'' + c b² θ' + k a² θ = 0
   ========================================================= */
makeExample({
  id: 'ex5', loop: true,
  controls: [
    { key: 'm', label: 'Bar mass m', min: 0.5, max: 10, step: 0.1, value: 2, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 50, max: 2000, step: 10, value: 500, unit: 'N/m', dec: 1 },
    { key: 'c', label: 'Damping c', min: 0, max: 80, step: 0.5, value: 6, unit: 'N·s/m', dec: 2 },
    { key: 'a', label: 'Spring position a', min: 0.05, max: 1, step: 0.01, value: 0.3, unit: 'm', dec: 3 },
    { key: 'b', label: 'Bar length b', min: 0.1, max: 1, step: 0.01, value: 0.5, unit: 'm', dec: 3 },
    { key: 'th0', label: 'Initial θ₀', min: -15, max: 15, step: 0.5, value: 8, unit: '°', dec: 2 }
  ],
  presets(C){
    const ccr = () => { const V = C.v; return (2 * V.a / V.b) * Math.sqrt(V.k * V.m / 3); };
    const setc = f => { const v = ccr() * f; if (isFinite(v)) C.set({ c: parseFloat(v.toPrecision(4)) }); };
    return [
      { label: 'c = ¼ c_cr', apply: () => setc(0.25) },
      { label: 'c = c_cr (critical)', apply: () => setc(1) },
      { label: 'c = 2 c_cr', apply: () => setc(2) }
    ];
  },
  ylabel: 'θ (deg)', yFactor: 180 / Math.PI,
  model(V){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    if (!(V.b > 0)) return posErr('The bar length b');
    const m = V.m * V.b * V.b / 3, c = V.c * V.b * V.b, k = V.k * V.a * V.a;
    const ccr = V.k * V.m > 0 ? (2 * V.a / V.b) * Math.sqrt(V.k * V.m / 3) : NaN;
    const notes = [];
    if (V.a > V.b) notes.push({ level: 'warn', html: 'With a &gt; b the spring is attached beyond the end of the bar. The formulas still work mathematically, but the drawing clips the spring to the bar.' });
    return {
      m, c, k, F: () => 0, x0: V.th0 * Math.PI / 180, v0: 0, scale: Math.abs(V.th0 * Math.PI / 180),
      stats: [['I_O = mb²/3', fmt(m) + ' kg·m²'], ['c_eq = cb²', fmt(c) + ' N·m·s'], ['k_eq = ka²', fmt(k) + ' N·m'],
        ...freqStats(m, k).slice(0, 1), ['c_cr = (2a/b)√(km/3)', fmt(ccr) + ' N·s/m', true], ['ζ = c/c_cr', fmt(V.c / ccr), true], ['Regime', regimeText(m, c, k)]],
      notes
    };
  },
  draw(ctx, w, h, S){
    const O = [70, 150], Lb = 440, b = S.V.b, a = S.V.a, sa = clamp(b > 0 ? Lb * a / b : 0, 0, Lb);
    const ph = clamp(S.x / S.amp * 0.2, -0.6, 0.6);
    const bp = s => [O[0] + s * Math.cos(ph), O[1] - s * Math.sin(ph)];
    fitView(ctx, w, h, [0, 10, 570, 245]);
    hatch(ctx, O[0] + sa - 40, 40, O[0] + Lb + 40, 40, -1);
    const pa = bp(sa), pb = bp(Lb);
    springLine(ctx, O[0] + sa, 40, pa[0], pa[1], 9, 8); txt(ctx, 'k', O[0] + sa - 22, 85);
    damperLine(ctx, O[0] + Lb, 40, pb[0], pb[1], 110); txt(ctx, 'c', O[0] + Lb + 24, 85);
    ctx.save(); ctx.translate(O[0], O[1]); ctx.rotate(-ph);
    ctx.fillStyle = COL.c5; ctx.globalAlpha = 0.55; ctx.fillRect(-8, -8, Lb + 8, 16); ctx.globalAlpha = 1;
    ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.5; ctx.strokeRect(-8, -8, Lb + 8, 16); ctx.restore();
    hatch(ctx, 22, 105, 22, 195, 1);
    line(ctx, 22, 130, O[0], O[1], COL.ground, 2); line(ctx, 22, 170, O[0], O[1], COL.ground, 2);
    ctx.fillStyle = COL.card; ctx.strokeStyle = COL.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(O[0], O[1], 6, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    txt(ctx, 'O', O[0] - 4, O[1] - 22);
    const dim = (x2, y, lab) => { arrow(ctx, O[0] + 20, y, x2, y, COL.muted, 1); arrow(ctx, x2 - 20, y, O[0], y, COL.muted, 1); txt(ctx, lab, (O[0] + x2) / 2, y + 13); };
    dim(O[0] + sa, 200, 'a'); dim(O[0] + Lb, 228, 'b');
    txt(ctx, 'top view (horizontal plane)', 470, 20, { font: '11px system-ui', color: COL.muted });
  }
});

/* =========================================================
   Example 6: rolling disk, spring k to wall, spring 4k to moving base
   (3m/2) x'' + 5k x = 4kb sin ωt
   ========================================================= */
makeExample({
  id: 'ex6',
  controls: [
    { key: 'm', label: 'Disk mass m', min: 1, max: 10, step: 0.1, value: 4, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 100, max: 2000, step: 10, value: 800, unit: 'N/m', dec: 1 },
    { key: 'b', label: 'Base amplitude b', min: 0.005, max: 0.05, step: 0.001, value: 0.02, unit: 'm', dec: 4 },
    { key: 'w', label: 'Forcing frequency ω', min: 0, max: 50, step: 0.5, value: 15, unit: 'rad/s', dec: 2 }
  ],
  model(V, steady){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    const m = 1.5 * V.m, k = 5 * V.k, F0 = 4 * V.k * V.b, D = k - m * V.w * V.w;
    const X = D !== 0 ? F0 / D : (F0 === 0 ? 0 : Infinity);
    const wn = k > 0 ? Math.sqrt(k / m) : NaN;
    const notes = [];
    if (!steady) notes.push({ level: 'info', html: 'Starting from rest adds a free vibration at ωₙ. With no damping it never dies out, so the motion mixes two frequencies. Tick the box to start on the particular solution alone.' });
    if (!isFinite(X)) notes.push({ level: 'warn', html: '<b>Resonance:</b> ω = ωₙ, so the particular solution does not exist and the amplitude grows without bound.' });
    return {
      m, c: 0, k, w: V.w, F: t => F0 * Math.sin(V.w * t), x0: 0, v0: steady && isFinite(X) ? X * V.w : 0,
      scale: Math.max(isFinite(X) ? Math.abs(X) : 0, Math.abs(V.b)),
      overlays: isFinite(X) ? [{ f: t => X * Math.sin(V.w * t) }] : [],
      stats: [['m_eq = 3m/2', fmt(m) + ' kg'], ['k_eq = 5k', fmt(k) + ' N/m'], ['ωₙ = √(10k/3m)', fmt(wn) + ' rad/s'], ['r = ω/ωₙ', fmt(V.w / wn)],
        ['Amplitude X', isFinite(X) ? fmt(Math.abs(X) * 1000) + ' mm' : '∞', true],
        ['Phase', !isFinite(X) || X === 0 ? '—' : X > 0 ? 'in phase (r < 1)' : '180° out of phase (r > 1)', true]],
      notes
    };
  },
  plot2(cv, V){
    const m = 1.5 * V.m, k = 5 * V.k, wn = Math.sqrt(Math.max(k, 0) / m);
    ratioPlot(cv, { wmax: Math.max(2 * wn, Math.abs(V.w) * 1.1, 1), ymax: 6, w: V.w, ylabel: '|X| / b',
      ratio: w => Math.abs(4 * V.k / (k - m * w * w)), vlines: [{ x: wn, color: COL.axis, label: 'ωₙ' }] });
  },
  draw(ctx, w, h, S){
    const d = clamp(S.x * 40 / S.amp, -110, 110), xb = clamp(S.V.b * Math.sin(S.V.w * S.t) * 40 / S.amp, -110, 110);
    const R = 42, cy = 100, cx = 250 + d;
    fitView(ctx, w, h, [-15, 30, 540, 170]);
    hatch(ctx, 0, 150, 0, 45, -1);
    hatch(ctx, 140, cy + R, 360, cy + R, 1);
    txt(ctx, 'no slip', 175, cy + R + 16, { font: 'italic 12px Georgia, serif', color: COL.muted });
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(d / R);
    ctx.fillStyle = COL.mass; ctx.strokeStyle = COL.massEdge; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = COL.massEdge; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++){ const an = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(-R * Math.cos(an), -R * Math.sin(an)); ctx.lineTo(R * Math.cos(an), R * Math.sin(an)); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.fillStyle = COL.c2; ctx.beginPath(); ctx.arc(0, -R + 9, 5, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
    springLine(ctx, 0, cy, cx - R - 6, cy, 10, 8); txt(ctx, 'k', (cx - R) / 2, cy - 24);
    springLine(ctx, cx + R + 6, cy, 455 + xb, cy, 9, 8); txt(ctx, '4k', (cx + R + 455 + xb) / 2, cy - 24);
    line(ctx, cx - R - 6, cy, cx + R + 6, cy, COL.spring, 3);
    ctx.fillStyle = COL.card; ctx.strokeStyle = COL.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    txt(ctx, 'O', cx + 12, cy - 14, { font: 'italic 13px Georgia, serif' });
    ctx.fillStyle = COL.ground; ctx.fillRect(455 + xb, cy - 28, 12, 56);
    txt(ctx, 'B', 461 + xb, cy + 44); txt(ctx, 'base: b sin ωt', 461, 42, { font: 'italic 13px Georgia, serif', color: COL.muted });
  }
});

/* =========================================================
   Example 7: base B - spring k - mass - spring k - wall
   m x'' + 2k x = k y0 sin ωt
   ========================================================= */
makeExample({
  id: 'ex7',
  controls: [
    { key: 'm', label: 'Mass m', min: 1, max: 10, step: 0.1, value: 4, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 100, max: 2000, step: 10, value: 800, unit: 'N/m', dec: 1 },
    { key: 'y0', label: 'Base amplitude y₀', min: 0.005, max: 0.05, step: 0.001, value: 0.02, unit: 'm', dec: 4 },
    { key: 'w', label: 'Forcing frequency ω', min: 0, max: 40, step: 0.1, value: 10, unit: 'rad/s', dec: 2 }
  ],
  presets(C){
    return [
      { label: 'ω = 10 (allowed)', apply: () => C.set({ w: 10 }) },
      { label: 'ω = 16.3 (edge)', apply: () => C.set({ w: 16.33 }) },
      { label: 'ω = 20 (resonance)', apply: () => C.set({ w: 20 }) },
      { label: 'ω = 23.1 (edge)', apply: () => C.set({ w: 23.09 }) },
      { label: 'ω = 30 (allowed)', apply: () => C.set({ w: 30 }) }
    ];
  },
  model(V, steady){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    const m = V.m, k = 2 * V.k, F0 = V.k * V.y0, D = k - m * V.w * V.w;
    const X = D !== 0 ? F0 / D : (F0 === 0 ? 0 : Infinity);
    const wn = k > 0 ? Math.sqrt(k / m) : NaN, ratio = Math.abs(X / V.y0);
    const st = [['ωₙ = √(2k/m)', fmt(wn) + ' rad/s'], ['r = ω/ωₙ', fmt(V.w / wn)], ['|X| / y₀', isFinite(ratio) ? fmt(ratio) : '∞', true],
      ['Requirement |X| ≤ 1.5 y₀', ratio <= 1.5 ? '✓ met' : '✗ violated', true]];
    if (V.k > 0){
      const q = 0.5 / 1.5, w1 = wn * Math.sqrt(1 - q), w2 = wn * Math.sqrt(1 + q);
      st.push(['Allowed range', `ω ≤ ${fmt(w1)} or ω ≥ ${fmt(w2)} rad/s`]);
    }
    const notes = [];
    if (!steady) notes.push({ level: 'info', html: 'Starting from rest adds an undamped free vibration at ωₙ that never dies out. Tick the box to see the steady-state motion alone, which is what the 1.5 y₀ requirement is about.' });
    return {
      m, c: 0, k, w: V.w, F: t => F0 * Math.sin(V.w * t), x0: 0, v0: steady && isFinite(X) ? X * V.w : 0,
      scale: Math.max(isFinite(X) ? Math.abs(X) : 0, Math.abs(V.y0) * 1.5), hlines: [1.5 * V.y0, -1.5 * V.y0],
      overlays: isFinite(X) ? [{ f: t => X * Math.sin(V.w * t) }] : [], stats: st, notes
    };
  },
  plot2(cv, V){
    const k = 2 * V.k, wn = Math.sqrt(Math.max(k, 0) / V.m), wmax = Math.max(2 * wn, Math.abs(V.w) * 1.1, 1);
    const q = 0.5 / 1.5, w1 = wn * Math.sqrt(1 - q), w2 = wn * Math.sqrt(1 + q);
    ratioPlot(cv, { wmax, ymax: 5, w: V.w, ylabel: '|X| / y₀', ratio: w => Math.abs(V.k / (k - V.m * w * w)),
      bands: V.k > 0 ? [{ x0: 0, x1: w1, color: COL.band }, { x0: w2, x1: wmax, color: COL.band }] : [],
      hlines: [{ y: 1.5, color: COL.c3 }], vlines: [{ x: wn, color: COL.axis, label: 'ωₙ' }] });
  },
  draw(ctx, w, h, S){
    const d = clamp(S.x * 40 / S.amp, -100, 100), yb = clamp(S.V.y0 * Math.sin(S.V.w * S.t) * 40 / S.amp, -100, 100);
    fitView(ctx, w, h, [10, 20, 520, 160]);
    const cx = 270 + d;
    ctx.fillStyle = COL.ground; ctx.fillRect(60 + yb, 55, 12, 70);
    txt(ctx, 'B', 66 + yb, 140); txt(ctx, 'y(t) = y₀ sin ωt', 66, 38, { font: 'italic 13px Georgia, serif', color: COL.muted });
    springLine(ctx, 72 + yb, 90, cx - 42, 90, 9, 8); txt(ctx, 'k', (72 + yb + cx - 42) / 2, 68);
    hatch(ctx, 200, 131, 340, 131, 1);
    block(ctx, cx, 90, 84, 60, 0, 'm'); wheels(ctx, cx, 120, 84);
    springLine(ctx, cx + 42, 90, 470, 90, 9, 8); txt(ctx, 'k', (cx + 42 + 470) / 2, 68);
    hatch(ctx, 470, 45, 470, 135, -1);
  }
});

/* =========================================================
   Example 8: moving support B -> spring k -> cable over pulleys -> mass, spring k to ground
   m x'' + 5k x = 2kb cos ωt
   ========================================================= */
makeExample({
  id: 'ex8',
  controls: [
    { key: 'm', label: 'Mass m', min: 0.5, max: 10, step: 0.1, value: 2, unit: 'kg', dec: 2 },
    { key: 'k', label: 'Stiffness k', min: 20, max: 1000, step: 10, value: 200, unit: 'N/m', dec: 1 },
    { key: 'b', label: 'Base amplitude b', min: 0.005, max: 0.05, step: 0.001, value: 0.02, unit: 'm', dec: 4 },
    { key: 'w', label: 'Forcing frequency ω', min: 0, max: 50, step: 0.1, value: 12, unit: 'rad/s', dec: 2 }
  ],
  model(V, steady){
    if (!(V.m > 0)) return { error: MASS_ERROR.html };
    const m = V.m, k = 5 * V.k, F0 = 2 * V.k * V.b, D = k - m * V.w * V.w;
    const X = D !== 0 ? F0 / D : (F0 === 0 ? 0 : Infinity);
    const wn = k > 0 ? Math.sqrt(k / m) : NaN;
    const notes = [];
    if (!steady) notes.push({ level: 'info', html: 'Starting from rest adds an undamped free vibration at ωₙ. Tick the box to start on the steady-state solution X cos ωt.' });
    if (!isFinite(X)) notes.push({ level: 'warn', html: '<b>Resonance:</b> ω equals the resonant frequency √(5k/m), so the amplitude grows without bound.' });
    return {
      m, c: 0, k, w: V.w, F: t => F0 * Math.cos(V.w * t), x0: steady && isFinite(X) ? X : 0, v0: 0,
      scale: Math.max(isFinite(X) ? Math.abs(X) : 0, Math.abs(V.b) * 0.5),
      overlays: isFinite(X) ? [{ f: t => X * Math.cos(V.w * t) }] : [],
      stats: [['m_eq = m', fmt(m) + ' kg'], ['k_eq = 5k', fmt(k) + ' N/m'], ['Resonant ω = √(5k/m)', fmt(wn) + ' rad/s', true], ['r = ω/ωₙ', fmt(V.w / wn)],
        ['|X| / b', isFinite(X) ? fmt(Math.abs(X / V.b)) : '∞', true]],
      notes
    };
  },
  plot2(cv, V){
    const k = 5 * V.k, wn = Math.sqrt(Math.max(k, 0) / V.m);
    ratioPlot(cv, { wmax: Math.max(2 * wn, Math.abs(V.w) * 1.1, 1), ymax: 4, w: V.w, ylabel: '|X| / b',
      ratio: w => Math.abs(2 * V.k / (k - V.m * w * w)), vlines: [{ x: wn, color: COL.axis, label: 'ωₙ' }] });
  },
  draw(ctx, w, h, S){
    const amp = Math.max(S.amp, Math.abs(S.V.b) * 0.5);
    const d = clamp(S.x * 24 / amp, -40, 40), xb = clamp(S.V.b * Math.cos(S.V.w * S.t) * 24 / amp, -40, 40);
    const r = 16, r2 = 10, Cx = 330, Cy = 56, xR = Cx + r, Qx = xR - r2, Qy0 = 165, Qy = Qy0 + d, G = Qy0 + 64 + 95;
    fitView(ctx, w, h, [20, -8, 425, G + 12]);
    ctx.fillStyle = COL.ground; ctx.fillRect(40 + xb, 15, 14, 50);
    txt(ctx, 'B', 47 + xb, 78); txt(ctx, 'base: b cos ωt', 70, 2, { font: 'italic 14px Georgia, serif', color: COL.muted });
    const Ex = clamp(200 + 2 * d, 115, 300);
    springLine(ctx, 54 + xb, 40, Ex, 40, 9, 8); txt(ctx, 'k', (54 + xb + Ex) / 2, 20);
    hatch(ctx, 262, 90, 262, 175, 1);
    line(ctx, Cx, Cy, 262, 110, COL.ground, 2);
    cable(ctx, () => {
      ctx.moveTo(Ex, 40); ctx.lineTo(Cx, 40); ctx.arc(Cx, Cy, r, -Math.PI / 2, 0);
      ctx.lineTo(xR, Qy); ctx.arc(Qx, Qy, r2, 0, Math.PI); ctx.lineTo(Qx - r2, Cy + r * 0.8); ctx.lineTo(Cx, Cy);
    });
    pulley(ctx, Cx, Cy, r); pulley(ctx, Qx, Qy, r2);
    line(ctx, Qx, Qy, Qx, Qy + 16, COL.spring, 2);
    block(ctx, Qx, Qy + 40, 50, 48, 0, 'm');
    springLine(ctx, Qx, Qy + 64, Qx, G, 9, 9); txt(ctx, 'k', Qx + 26, (Qy + 64 + G) / 2);
    hatch(ctx, Qx - 40, G, Qx + 40, G, 1);
    arrow(ctx, 395, Qy0 + 20, 395, Qy0 + 50, COL.muted, 1.5); txt(ctx, '+x', 412, Qy0 + 35, { font: 'italic 13px Georgia, serif', color: COL.muted });
  }
});
