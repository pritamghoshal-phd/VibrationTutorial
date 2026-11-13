
/* =========================================================
   Utilities
   ========================================================= */
const $ = id => document.getElementById(id);
const COL = {};
function readColors(){
  const s = getComputedStyle(document.documentElement);
  ['fg','muted','grid','axis','card','c1','c2','c3','c4','c5','spring','mass','massEdge','ground','band','bg']
    .forEach(n => COL[n] = s.getPropertyValue('--' + n).trim());
}
readColors();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function fit(cv){
  const dpr = window.devicePixelRatio || 1;
  const w = cv.clientWidth, h = cv.clientHeight;
  const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
  if (cv.width !== W || cv.height !== H){ cv.width = W; cv.height = H; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function niceStep(range, n){
  if (!(range > 0) || !isFinite(range)) return 1;
  const raw = range / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
function fmtNum(v){
  if (Math.abs(v) < 1e-12) return '0';
  const a = Math.abs(v);
  if (a >= 10000 || a < 0.001) return v.toExponential(0);
  return String(parseFloat(v.toPrecision(3)));
}
function fmt(v, d = 3){
  if (Number.isNaN(v)) return '—';
  if (!isFinite(v)) return v < 0 ? '−∞' : '∞';
  const a = Math.abs(v);
  if (a !== 0 && (a < 0.001 || a >= 1e5)) return v.toExponential(2);
  return String(parseFloat(v.toPrecision(d)));
}

/* Generic line plot on a canvas */
function plot(cv, o){
  const { ctx, w, h } = fit(cv);
  if (!(isFinite(o.xmin) && isFinite(o.xmax) && o.xmax > o.xmin)){ o.xmin = 0; o.xmax = 1; }
  if (!(isFinite(o.ymin) && isFinite(o.ymax) && o.ymax > o.ymin)){ o.ymin = -1; o.ymax = 1; }
  const P = { l: 54, r: 12, t: 12, b: 36 };
  const pw = w - P.l - P.r, ph = h - P.t - P.b;
  const X = x => P.l + (x - o.xmin) / (o.xmax - o.xmin) * pw;
  const Y = y => P.t + (1 - (y - o.ymin) / (o.ymax - o.ymin)) * ph;
  ctx.clearRect(0, 0, w, h);
  ctx.font = '11px system-ui, sans-serif';

  (o.bands || []).forEach(b => {
    ctx.fillStyle = b.color;
    const x0 = clamp(X(b.x0), P.l, P.l + pw), x1 = clamp(X(b.x1), P.l, P.l + pw);
    ctx.fillRect(x0, P.t, x1 - x0, ph);
  });

  const xs = o.xstep || niceStep(o.xmax - o.xmin, 6);
  const ys = o.ystep || niceStep(o.ymax - o.ymin, 5);
  ctx.lineWidth = 1;
  ctx.strokeStyle = COL.grid; ctx.fillStyle = COL.muted;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = Math.ceil(o.xmin / xs - 1e-9), n = 0; i * xs <= o.xmax + 1e-9 && n < 60; i++, n++){
    const x = i * xs, px = X(x);
    ctx.beginPath(); ctx.moveTo(px, P.t); ctx.lineTo(px, P.t + ph); ctx.stroke();
    ctx.fillText(o.xfmt ? o.xfmt(x) : fmtNum(x), px, P.t + ph + 5);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = Math.ceil(o.ymin / ys - 1e-9), n = 0; i * ys <= o.ymax + 1e-9 && n < 60; i++, n++){
    const y = i * ys, py = Y(y);
    ctx.beginPath(); ctx.moveTo(P.l, py); ctx.lineTo(P.l + pw, py); ctx.stroke();
    ctx.fillText(fmtNum(y), P.l - 6, py);
  }
  ctx.strokeStyle = COL.axis;
  if (o.ymin < 0 && o.ymax > 0){ ctx.beginPath(); ctx.moveTo(P.l, Y(0)); ctx.lineTo(P.l + pw, Y(0)); ctx.stroke(); }
  if (o.xzero && o.xmin < 0 && o.xmax > 0){ ctx.beginPath(); ctx.moveTo(X(0), P.t); ctx.lineTo(X(0), P.t + ph); ctx.stroke(); }
  ctx.strokeRect(P.l, P.t, pw, ph);

  ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(o.xlabel || '', P.l + pw / 2, h - 1);
  ctx.save(); ctx.translate(11, P.t + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle'; ctx.fillText(o.ylabel || '', 0, 0); ctx.restore();

  ctx.save(); ctx.beginPath(); ctx.rect(P.l, P.t, pw, ph); ctx.clip();
  (o.vlines || []).forEach(v => {
    ctx.strokeStyle = v.color || COL.axis; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(X(v.x), P.t); ctx.lineTo(X(v.x), P.t + ph); ctx.stroke(); ctx.setLineDash([]);
    if (v.label){ ctx.fillStyle = v.color || COL.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = '11px system-ui'; ctx.fillText(v.label, X(v.x) + 4, P.t + 4); }
  });
  (o.hlines || []).forEach(v => {
    ctx.strokeStyle = v.color || COL.axis; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(P.l, Y(v.y)); ctx.lineTo(P.l + pw, Y(v.y)); ctx.stroke(); ctx.setLineDash([]);
  });
  (o.series || []).forEach(s => {
    if (!s.pts || s.pts.length < 2) return;
    ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2;
    ctx.setLineDash(s.dash || []); ctx.globalAlpha = s.alpha ?? 1;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pen = false;
    for (const p of s.pts){
      if (!isFinite(p[1]) || !isFinite(p[0])){ pen = false; continue; }
      const px = X(p[0]), py = clamp(Y(p[1]), -1e4, 1e4);
      if (pen) ctx.lineTo(px, py); else { ctx.moveTo(px, py); pen = true; }
    }
    ctx.stroke();
    ctx.globalAlpha = 1; ctx.setLineDash([]);
  });
  (o.points || []).forEach(p => {
    if (!isFinite(p.y) || !isFinite(p.x)) return;
    ctx.fillStyle = p.color; ctx.strokeStyle = COL.card; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(X(p.x), clamp(Y(p.y), P.t, P.t + ph), p.r || 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  });
  ctx.restore();
  return { X, Y };
}

/* Drawing the spring-mass-damper */
function drawSpring(ctx, x1, x2, y, n, a){
  const L = x2 - x1, lead = Math.min(12, Math.abs(L) * 0.12), zl = L - 2 * lead;
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 + lead, y);
  for (let i = 0; i < n; i++){
    ctx.lineTo(x1 + lead + zl * (i + 0.25) / n, y - a);
    ctx.lineTo(x1 + lead + zl * (i + 0.75) / n, y + a);
  }
  ctx.lineTo(x1 + lead + zl, y); ctx.lineTo(x2, y); ctx.stroke();
}
function arrow(ctx, x1, y1, x2, y2, color, wdt = 2.5){
  const ang = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(10, Math.hypot(x2 - x1, y2 - y1));
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = wdt;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - hl * 0.8 * Math.cos(ang), y2 - hl * 0.8 * Math.sin(ang)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hl * Math.cos(ang - 0.45), y2 - hl * Math.sin(ang - 0.45));
  ctx.lineTo(x2 - hl * Math.cos(ang + 0.45), y2 - hl * Math.sin(ang + 0.45));
  ctx.closePath(); ctx.fill();
}
function drawSMD(cv, o){
  // o: x (m), y base (m), amp (m, sets scale), damper, force (N), forceScale (px/N), baseMoves
  const { ctx, w, h } = fit(cv);
  ctx.clearRect(0, 0, w, h);
  const gy = h - 26;
  const bw = clamp(w * 0.13, 56, 86), bh = 62;
  const wall0 = 44;
  const amp = (o.amp > 0 && isFinite(o.amp)) ? o.amp : 1;
  if (!isFinite(o.x)) o.x = 0;
  if (!isFinite(o.y || 0)) o.y = 0;
  const scale = (w * (o.baseMoves ? 0.22 : 0.27)) / amp;
  const wallX = wall0 + (o.y || 0) * scale;
  const eqC = w * 0.6;
  const cx = eqC + o.x * scale;
  const by = gy - 7 - bh, cy = by + bh / 2;

  // ground
  ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(o.baseMoves ? wallX : 0, gy); ctx.lineTo(w, gy); ctx.stroke();
  ctx.lineWidth = 1;
  for (let x = (o.baseMoves ? wallX : 0); x < w; x += 12){ ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x - 8, gy + 8); ctx.stroke(); }

  // equilibrium line
  ctx.strokeStyle = COL.axis; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(eqC, by - 22); ctx.lineTo(eqC, gy); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = COL.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('x = 0', eqC, by - 26);

  // wall / base
  ctx.fillStyle = COL.ground;
  ctx.fillRect(wallX - 14, by - 18, 14, bh + 25 + (o.baseMoves ? 0 : 0));
  ctx.strokeStyle = COL.ground; ctx.lineWidth = 1;
  for (let yy = by - 18; yy < gy + 7; yy += 10){ ctx.beginPath(); ctx.moveTo(wallX - 14, yy); ctx.lineTo(wallX - 24, yy + 8); ctx.stroke(); }
  if (o.baseMoves){
    ctx.fillStyle = COL.muted; ctx.textAlign = 'center'; ctx.fillText('base y(t)', wallX - 7, by - 24);
  }

  // spring and damper
  const left = cx - bw / 2;
  ctx.strokeStyle = COL.spring; ctx.lineWidth = 2;
  const sy = o.damper ? cy - 15 : cy;
  drawSpring(ctx, wallX, left, sy, 9, 9);
  if (o.damper){
    const dy = cy + 16, cylX = wallX + 18, cylL = 42, cylH = 16;
    const rodLen = (eqC - bw / 2) - (wall0 + 18 + cylL / 2);
    let pist = clamp(left - rodLen, cylX + 3, cylX + cylL + 30);
    ctx.beginPath(); ctx.moveTo(wallX, dy); ctx.lineTo(cylX, dy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cylX + cylL, dy - cylH / 2); ctx.lineTo(cylX, dy - cylH / 2);
    ctx.lineTo(cylX, dy + cylH / 2); ctx.lineTo(cylX + cylL, dy + cylH / 2); ctx.stroke();
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pist, dy - cylH / 2 + 3); ctx.lineTo(pist, dy + cylH / 2 - 3); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(pist, dy); ctx.lineTo(left, dy); ctx.stroke();
  }

  // block + wheels
  ctx.fillStyle = COL.mass; ctx.strokeStyle = COL.massEdge; ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(left, by, bw, bh, 8); else ctx.rect(left, by, bw, bh);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = COL.fg; ctx.font = 'italic 20px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('m', cx, cy);
  ctx.fillStyle = COL.card; ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.5;
  [left + 14, left + bw - 14].forEach(wx => { ctx.beginPath(); ctx.arc(wx, gy - 3.5, 3.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); });

  // displacement indicator
  if (Math.abs(cx - eqC) > 3){
    arrow(ctx, eqC, by - 10, cx, by - 10, COL.c1, 1.8);
  }
  ctx.fillStyle = COL.c1; ctx.font = '12px system-ui'; ctx.textBaseline = 'alphabetic';
  // force arrow
  if (o.force != null){
    const len = o.force * o.forceScale;
    const fy = cy;
    const x0 = cx + bw / 2 + 6;
    if (Math.abs(len) > 2){
      if (len > 0) arrow(ctx, x0, fy, x0 + len, fy, COL.c2, 3);
      else arrow(ctx, x0 - len, fy, x0, fy, COL.c2, 3);
    }
    ctx.fillStyle = COL.c2; ctx.textAlign = 'left'; ctx.font = 'italic 13px Georgia, serif';
    ctx.fillText('F(t)', x0 + 2, fy - 12);
  }
}

/* Vertical base-excitation picture: mass on spring + damper, on a shaker platform */
function drawSpringV(ctx, x, y1, y2, n, a){
  const L = y2 - y1, lead = Math.min(10, Math.abs(L) * 0.12), zl = L - 2 * lead;
  ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y1 + lead);
  for (let i = 0; i < n; i++){
    ctx.lineTo(x - a, y1 + lead + zl * (i + 0.25) / n);
    ctx.lineTo(x + a, y1 + lead + zl * (i + 0.75) / n);
  }
  ctx.lineTo(x, y1 + lead + zl); ctx.lineTo(x, y2); ctx.stroke();
}
function drawBaseV(cv, o){
  // o: x (mass displacement, + up), y (base displacement, + up), amp (m)
  const { ctx, w, h } = fit(cv);
  ctx.clearRect(0, 0, w, h);
  const amp = (o.amp > 0 && isFinite(o.amp)) ? o.amp : 1;
  const x = isFinite(o.x) ? o.x : 0, y = isFinite(o.y) ? o.y : 0;
  const travel = h * 0.09, scale = travel / amp;
  const cx = Math.round(w * 0.42);
  const gy = h - 6;                      // fixed floor
  const yB0 = h - 80, yB = yB0 - y * scale;          // platform top
  const gap = 125, mh = 52, mw = 112;
  const yM0 = yB0 - gap, yM = yM0 - x * scale;       // mass bottom
  const pw = 190, pth = 14;

  // floor + shaker body
  ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx - 150, gy); ctx.lineTo(cx + 150, gy); ctx.stroke();
  ctx.lineWidth = 1;
  for (let xx = cx - 150; xx < cx + 150; xx += 12){ ctx.beginPath(); ctx.moveTo(xx, gy); ctx.lineTo(xx - 6, gy + 6); ctx.stroke(); }
  ctx.fillStyle = COL.ground;
  ctx.fillRect(cx - 34, gy - 20, 68, 20);
  ctx.fillStyle = COL.muted; ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = COL.card; ctx.fillText('shaker', cx, gy - 10);
  // actuator rod
  ctx.strokeStyle = COL.ground; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(cx, gy - 20); ctx.lineTo(cx, yB + pth); ctx.stroke();
  // platform
  ctx.fillStyle = COL.ground; ctx.fillRect(cx - pw / 2, yB, pw, pth);
  ctx.strokeStyle = COL.card; ctx.lineWidth = 1;
  for (let xx = cx - pw / 2 + 4; xx < cx + pw / 2; xx += 10){ ctx.beginPath(); ctx.moveTo(xx, yB + pth - 2); ctx.lineTo(xx + 6, yB + 2); ctx.stroke(); }

  // spring (left) and damper (right)
  ctx.strokeStyle = COL.spring; ctx.lineWidth = 2;
  drawSpringV(ctx, cx - 30, yM, yB, 8, 11);
  const dx = cx + 30, cylL = 56, cylW = 18;
  ctx.beginPath(); ctx.moveTo(dx - cylW / 2, yB - cylL); ctx.lineTo(dx - cylW / 2, yB); ctx.lineTo(dx + cylW / 2, yB); ctx.lineTo(dx + cylW / 2, yB - cylL); ctx.stroke();
  const rodLen = gap - cylL / 2;
  const py = clamp(yM + rodLen, yB - cylL + 3, yB - 3);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(dx - cylW / 2 + 3, py); ctx.lineTo(dx + cylW / 2 - 3, py); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx, yM); ctx.lineTo(dx, py); ctx.stroke();

  // mass
  ctx.fillStyle = COL.mass; ctx.strokeStyle = COL.massEdge; ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(cx - mw / 2, yM - mh, mw, mh, 8); else ctx.rect(cx - mw / 2, yM - mh, mw, mh);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = COL.fg; ctx.font = 'italic 20px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('m', cx, yM - mh / 2);

  // equilibrium reference lines + displacement arrows (to the right)
  const refX0 = cx + pw / 2 + 14, refX1 = refX0 + 70;
  const ref = (yy, label, col, disp) => {
    ctx.strokeStyle = COL.axis; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(cx + mw / 2 + 4, yy); ctx.lineTo(refX1, yy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COL.muted; ctx.font = '11px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(label, refX1 + 6, yy);
    if (Math.abs(disp) > 2) arrow(ctx, refX0 + 30, yy, refX0 + 30, yy - disp, col, 2);
  };
  ref(yM0 - mh / 2, 'x = 0 (mass)', COL.c1, x * scale);
  ref(yB0 + pth / 2, 'y = 0 (base)', COL.c5, y * scale);
  ctx.fillStyle = COL.c1; ctx.font = 'italic 13px Georgia, serif'; ctx.textAlign = 'left';
  ctx.fillText('x(t)', refX0 + 36, yM0 - mh / 2 - 14);
  ctx.fillStyle = COL.muted;
  ctx.fillText('y(t)', refX0 + 36, yB0 + pth / 2 - 14);
}

/* RK4 */
function rk4(f, t, s, dt){
  const k1 = f(t, s);
  const k2 = f(t + dt / 2, s.map((v, i) => v + dt / 2 * k1[i]));
  const k3 = f(t + dt / 2, s.map((v, i) => v + dt / 2 * k2[i]));
  const k4 = f(t + dt, s.map((v, i) => v + dt * k3[i]));
  return s.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

/* Exact free response of  m x'' + c x' + k x = 0  (m > 0, any real c, k). Returns [x, v]. */
function lin2(t, m, c, k, x0, v0){
  const a = -c / (2 * m), disc = c * c - 4 * m * k;
  const tol = 1e-12 * Math.max(c * c, Math.abs(4 * m * k), 1e-300);
  if (disc < -tol){
    const b = Math.sqrt(-disc) / (2 * m), e = Math.exp(a * t), C = Math.cos(b * t), S = Math.sin(b * t);
    const B = (v0 - a * x0) / b;
    const x = e * (x0 * C + B * S);
    return [x, a * x + e * b * (B * C - x0 * S)];
  }
  if (disc > tol){
    const q = Math.sqrt(disc) / (2 * m), s1 = a + q, s2 = a - q;
    const C1 = (v0 - s2 * x0) / (s1 - s2), C2 = (s1 * x0 - v0) / (s1 - s2);
    const e1 = Math.exp(s1 * t), e2 = Math.exp(s2 * t);
    return [C1 * e1 + C2 * e2, C1 * s1 * e1 + C2 * s2 * e2];
  }
  const e = Math.exp(a * t), B = v0 - a * x0;
  return [(x0 + B * t) * e, (B + a * (x0 + B * t)) * e];
}
/* Largest real part (sigma) and oscillation frequency (beta) of the characteristic roots */
function roots(m, c, k){
  const disc = c * c - 4 * m * k;
  if (disc < 0) return { sigma: -c / (2 * m), beta: Math.sqrt(-disc) / (2 * m) };
  return { sigma: (-c + Math.sqrt(disc)) / (2 * m), beta: 0 };
}

/* =========================================================
   Physics helpers for unusual parameter values
   ========================================================= */
// c from zeta. zeta is only defined for k > 0; for k < 0 we use |k|, for k = 0 this gives c = 0.
const dampingC = (z, m, k) => 2 * z * Math.sqrt(m * Math.abs(k));
// A characteristic rate (rad/s) used for time steps, plot windows and slow motion
function refRate(m, c, k, w = 0){
  const r = Math.max(Math.sqrt(Math.abs(k) / m), Math.abs(c) / m, Math.abs(w));
  return (r > 0 && isFinite(r)) ? r : 1;
}
// Very fast systems are shown in slow motion so the eye can follow them
function slowFactor(rate){ const T = 2 * Math.PI / rate; return T < 0.15 ? T / 0.15 : 1; }
function regimeText(m, c, k){
  if (k < 0) return 'Unstable (negative stiffness)';
  if (k === 0){
    if (c > 0) return 'No restoring force: coasts to a stop';
    if (c < 0) return 'Unstable: runaway motion';
    return 'No restoring force: drifts at constant speed';
  }
  const z = c / (2 * Math.sqrt(k * m));
  if (c < 0) return z > -1 ? 'Unstable: growing oscillation' : 'Unstable: exponential growth';
  if (c === 0) return 'Undamped';
  if (Math.abs(z - 1) < 1e-6) return 'Critically damped';
  return z < 1 ? 'Underdamped' : 'Overdamped';
}
const MASS_ERROR = { level: 'error', html: '<b>The mass must be positive.</b> With m = 0 there is no inertia, so the equation is no longer second order and nothing can vibrate; a negative mass is unphysical. Enter a value greater than 0.' };
function systemNotes(m, c, k, z){
  const n = [];
  if (k < 0) n.push({ level: 'warn', html: '<b>Negative stiffness.</b> The "spring" pushes the mass <em>away</em> from x = 0 instead of pulling it back. The equilibrium is unstable and the motion grows exponentially, like an inverted pendulum. One characteristic root is real and positive.' });
  if (k === 0) n.push({ level: 'warn', html: '<b>No spring (k = 0).</b> Nothing pulls the mass back, so it cannot oscillate. It coasts at constant speed, or with damping slides to a stop somewhere new.' });
  if (k <= 0 && z !== undefined && z !== 0) n.push({ level: 'info', html: 'The damping ratio ζ = c / (2√(km)) is only defined for k &gt; 0. Here the damping coefficient is taken as c = 2ζ√(m|k|)' + (k === 0 ? ', which is zero because k = 0.' : '.') });
  if (c < 0) n.push({ level: 'warn', html: '<b>Negative damping.</b> The "damper" pumps energy <em>into</em> the system instead of removing it, so the motion grows instead of decaying. This is the mechanism behind real self-excited vibrations: aircraft wing flutter, squealing brakes, and stick-slip chatter.' });
  if (k > 0 && c === 0 && z !== undefined) n.push({ level: 'info', html: 'With ζ = 0 nothing removes energy, so any oscillation continues forever at constant amplitude.' });
  return n;
}
function slowNote(rate, slow){
  return { level: 'info', html: `Very fast system (characteristic period ≈ ${fmt(2 * Math.PI / rate)} s). The animation is shown in slow motion, about ${fmt(1 / slow, 2)}× slower than real time, on top of the speed setting.` };
}
function haltNote(limit){
  return { level: 'warn', html: `<b>Simulation paused.</b> The displacement grew past ${fmt(limit)} m, far beyond anything a real structure would survive (and far outside where a linear model is valid). Press Restart or change a parameter.` };
}
function showNotes(id, notes){
  $(id).innerHTML = notes.map(n => `<div class="nb ${n.level}">${n.html}</div>`).join('');
}
function drawMessage(cv, msg){
  const { ctx, w, h } = fit(cv);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = COL.muted; ctx.font = '14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const words = msg.split(' '), lines = []; let line = '';
  for (const wd of words){ const test = line ? line + ' ' + wd : wd; if (ctx.measureText(test).width > w - 40 && line){ lines.push(line); line = wd; } else line = test; }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 20));
}

/* =========================================================
   Controls: slider + free-form number box
   ========================================================= */
function parseNum(str){
  const s = String(str).trim().replace(',', '.').replace('−', '-');
  if (s === '') return null;
  const v = Number(s);
  if (!isFinite(v) || Math.abs(v) > 1e12) return null;
  return v;
}
const fmtIn = (v, dec) => String(parseFloat(v.toFixed(dec)));
function makeControls(id, specs, onChange){
  const c = $(id), vals = {}, inputs = {}, defaults = {};
  CONTROLS[id] = vals;
  Object.defineProperty(vals, '_touched', { value: false, writable: true, enumerable: false });
  Object.defineProperty(vals, '_defaults', { value: defaults, enumerable: false });
  specs.forEach(s => {
    defaults[s.key] = s.value;
    const dec = s.dec ?? 2;
    const row = document.createElement('div'); row.className = 'ctl';
    row.innerHTML = `<label class="nm" for="${id}-${s.key}">${s.label}</label>` +
      `<input type="range" min="${s.min}" max="${s.max}" step="${s.step}" value="${s.value}" aria-label="${s.label}">` +
      `<span class="numbox"><input id="${id}-${s.key}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" title="Type any value and press Enter"><span class="unit">${s.unit || ''}</span></span>`;
    const rng = row.querySelector('input[type=range]'), num = row.querySelector('input[type=text]');
    const commit = (v, fromSlider) => {
      vals[s.key] = v;
      if (fromSlider) num.value = fmtIn(v, dec); else rng.value = clamp(v, s.min, s.max);
      num.classList.remove('bad');
      row.classList.toggle('out', v < s.min || v > s.max);
    };
    rng.addEventListener('input', () => { vals._touched = true; commit(parseFloat(rng.value), true); onChange && onChange(s.key); });
    const fromBox = () => {
      const v = parseNum(num.value);
      if (v === null){ num.classList.add('bad'); return; }
      if (v === vals[s.key]){ num.classList.remove('bad'); return; }
      vals._touched = true; commit(v, false); onChange && onChange(s.key);
    };
    num.addEventListener('input', fromBox);
    num.addEventListener('keydown', e => { if (e.key === 'Enter') num.blur(); });
    num.addEventListener('change', () => { if (parseNum(num.value) === null){ num.value = fmtIn(vals[s.key], dec); num.classList.remove('bad'); } });
    inputs[s.key] = { set: v => { rng.value = clamp(v, s.min, s.max); commit(v, true); } };
    commit(s.value, true);
    c.appendChild(row);
  });
  return {
    v: vals, defaults,
    set(obj){ vals._touched = true; for (const k in obj) inputs[k].set(obj[k]); onChange && onChange(); }
  };
}
function makePresets(id, list){
  const c = $(id);
  list.forEach(p => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = p.label; b.onclick = p.apply; c.appendChild(b); });
}
function makeButtons(id, d, restart, defSpeed = 0.5, C = null){
  const c = $(id);
  c.innerHTML = `<button class="btn" data-a="play">⏸ Pause</button><button class="btn" data-a="restart">↺ Restart</button>` +
    (C ? `<button class="btn" data-a="defaults">Default values</button>` : '') +
    `<span class="lbl">Speed</span><select aria-label="Playback speed"><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option></select>`;
  d.speed = defSpeed; c.querySelector('select').value = String(defSpeed);
  const pb = c.querySelector('[data-a=play]');
  const resume = () => { if (!d.playing){ d.playing = true; pb.textContent = '⏸ Pause'; } };
  pb.onclick = () => { d.playing = !d.playing; pb.textContent = d.playing ? '⏸ Pause' : '▶ Play'; };
  c.querySelector('[data-a=restart]').onclick = () => { restart(); resume(); };
  if (C) c.querySelector('[data-a=defaults]').onclick = () => { C.set(C.defaults); resume(); };
  c.querySelector('select').onchange = e => d.speed = parseFloat(e.target.value);
}
function setStats(id, items){
  $(id).innerHTML = items.map(it => `<span class="stat${it[2] ? ' hl' : ''}">${it[0]} = <b>${it[1]}</b></span>`).join('');
}

/* Animation loop: only visible demos are updated */
const demos = [];
function register(el, d){
  d.visible = false; d.playing = d.playing ?? true; d.speed = d.speed ?? 1;
  new IntersectionObserver(es => { d.visible = es[0].isIntersecting; }, { rootMargin: '100px' }).observe(el);
  demos.push(d);
}
let lastT = performance.now();
function loop(now){
  const dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
  for (const d of demos){
    if (!d.visible) continue;
    try {
      if (d.playing) d.advance(dt * d.speed);
      d.draw();
    } catch (err){ console.error(err); }
  }
  requestAnimationFrame(loop);
}
// Integrate with RK4 over simDt using steps no larger than hmax (capped work per frame)
function integrate(f, t, s, simDt, hmax){
  const n = Math.min(Math.max(1, Math.ceil(simDt / hmax)), 3000), h = simDt / n;
  for (let i = 0; i < n; i++){ s = rk4(f, t, s, h); t += h; if (!s.every(isFinite)) break; }
  return [t, s];
}



/* =========================================================
   Challenges and badges
   ========================================================= */
const CHALLENGES = [
  { id: 'pend5',  ctl: 'pend-ctl', page: 'eom.html',    demo: 'demo-pend',   icon: '🕰️', title: 'Galileo was (almost) right', task: 'Set L = 0.5 m, then find the release angle at which the <em>exact</em> period is 1.50 s (±0.01 s).' },
  { id: 'tick1',  ctl: 'free-ctl', page: 'free.html',   demo: 'demo-free',   icon: '⏱️', title: 'One-hertz clock', task: 'Using a 2.5 kg mass, choose k so the oscillator ticks at 1.000 Hz (±0.5%). Calculate k first, then check.' },
  { id: 'crit',   ctl: 'damp-ctl', page: 'damped.html', demo: 'demo-damped', icon: '🚪', title: 'Perfect door closer', task: 'Release from rest (v₀ = 0) with critical damping (ζ between 0.98 and 1.02), and choose m and k so the mass is within 2% of equilibrium in under 0.5 s.' },
  { id: 'logdec', ctl: 'damp-ctl', page: 'damped.html', demo: 'demo-damped', icon: '🔬', title: 'Lab technician', task: 'Make each peak exactly half the previous one (peak ratio 0.50 ± 0.01). Work out ζ from the log decrement first.' },
  { id: 'res10',  ctl: 'frc-ctl', page: 'forced.html', demo: 'demo-forced', icon: '📈', title: 'Resonance hunter', task: 'With ζ = 0.05, find a frequency ratio where the steady amplitude is exactly 8× the static deflection (±2%). There are two answers; find either.' },
  { id: 'calm',   ctl: 'frc-ctl', page: 'forced.html', demo: 'demo-forced', icon: '🧘', title: 'Too heavy to care', task: 'With ζ = 0.3, find the frequency ratio where the steady amplitude is one-tenth of the static deflection (±3%). (Type values beyond the slider.)' },
  { id: 'iso',    ctl: 'base-ctl', page: 'base.html',   demo: 'demo-base',   icon: '🛡️', title: 'Vibration isolator', task: 'Keep ζ ≥ 0.1 and get the transmissibility below 0.05. How soft must the mounts be? (Type values beyond the slider.)' },
  { id: 'shake',  ctl: 'base-ctl', page: 'base.html',   demo: 'demo-base',   icon: '🎸', title: 'Shake, rattle and roll', task: 'With ζ = 0.1 and the base below resonance (r &lt; 1), make the mass move exactly 3× as much as the base (TR = 3 ± 2%).' },
  { id: 'pend1',  ctl: 'pend-ctl', page: 'eom.html',    demo: 'demo-pend',   icon: '📐', title: 'How small is small?', task: 'Find the largest release angle (within 1°) for which the linear model’s period error stays below 1%.' },
  { id: 'over',   ctl: 'damp-ctl', page: 'damped.html', demo: 'demo-damped', icon: '🎢', title: 'Overdamped overshoot', task: 'With ζ ≥ 2 (heavily overdamped), pick x₀ and v₀ so the mass still crosses x = 0 once before settling.' },
  { id: 'beats',  ctl: 'frc-ctl',  page: 'forced.html', demo: 'demo-forced', icon: '🥁', title: 'Beat it', task: 'With ζ = 0 and ωₙ = 10 rad/s (±1%), choose r so the beat period is 5.0 s (±2%).' },
  { id: 'sqrt2',  ctl: 'base-ctl', page: 'base.html',   demo: 'demo-base',   icon: '⚖️', title: 'The crossover point', task: 'With ζ ≥ 0.3, find the frequency ratio where TR = 1 (within 0.005). Then change ζ: does it move?' },
  { id: 'isochron', ctl: 'free-ctl', page: 'free.html',   demo: 'demo-free',   icon: '⏳', title: 'Amplitude-proof clock', task: 'Show the period doesn’t depend on amplitude: keep m, k and x₀ = 0 fixed, and use only v₀ to try two amplitudes at least 5× apart.' },
  { id: 'split',    ctl: 'free-ctl', page: 'free.html',   demo: 'demo-free',   icon: '☯️', title: 'Half and half', task: 'Start with exactly 0.5 J of total energy (±5%), split evenly between the spring and the mass (within 5%).' },
  { id: 'scale',    ctl: 'free-ctl', page: 'free.html',   demo: 'demo-free',   icon: '✖️', title: 'Triple the pitch', task: 'Triple the natural frequency by changing only the mass. By what factor did m have to change, and why?' },
  { id: 'pump',     ctl: 'damp-ctl', page: 'damped.html', demo: 'demo-damped', icon: '🎈', title: 'Energy pump', task: 'Make each peak exactly 1.5× the previous one (ratio 1.50 ± 0.03). What sign does the damping need?' },
  { id: 'wd',       ctl: 'damp-ctl', page: 'damped.html', demo: 'demo-damped', icon: '🐢', title: 'Damping slows the clock', task: 'Make the damped period exactly 25% longer than the undamped period (±1%).' },
  { id: 'phase90',  ctl: 'frc-ctl',  page: 'forced.html', demo: 'demo-forced', icon: '↪️', title: 'Three-eighths of a cycle behind', task: 'With ζ = 0.2, find the frequency ratio where the displacement lags the force by 135° (±1°). Is it above or below resonance?' },
  { id: 'peak',     ctl: 'frc-ctl',  page: 'forced.html', demo: 'demo-forced', icon: '⛰️', title: 'The peak isn’t at resonance', task: 'With ζ between 0.3 and 0.6, find the frequency ratio of the largest steady amplitude to within 0.005. Is it above or below r = 1?' },
  { id: 'dhurts',   ctl: 'base-ctl', page: 'base.html',   demo: 'demo-base',   icon: '🧱', title: 'When damping hurts', task: 'At r = 3, find the damping ratio that makes the transmissibility exactly 0.2 (±2%). Compare it with ζ = 0.05.' }
];
const WHERE = { 'eom.html': 'Equations of motion', 'free.html': 'Free vibration', 'damped.html': 'Damped vibration', 'forced.html': 'Forced vibration', 'base.html': 'Base excitation' };
const whereName = pg => WHERE[pg] || (pg.startsWith('example-') ? 'Example ' + pg.replace(/\D/g, '') : pg);
const CHECKS = {};       // filled in by demos.js: id -> () => boolean
const CONTROLS = {};     // control values by container id, filled by makeControls
try { localStorage.removeItem('vlab-badges'); } catch (e){}
/* ---- Name sign-in: any name or username; the same name brings back the same badges ---- */
function getUser(){ try { const u = JSON.parse(localStorage.getItem('vlab-user') || 'null'); return u && u.login ? u : null; } catch (e){ return null; } }
function setUser(u){ try { if (u) localStorage.setItem('vlab-user', JSON.stringify(u)); else localStorage.removeItem('vlab-user'); } catch (e){} }
const badgeKey = () => { const u = getUser(); return u ? 'vlab-badges:' + u.login.toLowerCase() : null; };
function getBadges(){ const k = badgeKey(); if (!k) return {}; try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (e){ return {}; } }
function saveBadge(id){ const k = badgeKey(); if (!k) return; try { const b = getBadges(); b[id] = Date.now(); localStorage.setItem(k, JSON.stringify(b)); } catch (e){} }
const escH = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const initials = name => { const w = name.replace(/<[^>]*>/g, ' ').match(/[\p{L}\p{N}]+/gu) || []; return (w.slice(0, 2).map(x => [...x][0]).join('') || '🙂').toUpperCase(); };
function knownNames(){
  const out = [];
  try { for (let i = 0; i < localStorage.length; i++){ const k = localStorage.key(i); if (k && k.startsWith('vlab-badges:')) out.push(k.slice(12)); } } catch (e){}
  return out;
}
function openSignIn(){
  if ($('signin-modal')) return;
  const m = document.createElement('div'); m.id = 'signin-modal'; m.className = 'modal';
  m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="si-title">
    <h3 id="si-title">👋 Sign in</h3>
    <p class="small">Type your name or any username you like. To get your badges back later, sign in with the same name.</p>
    <form id="si-form"><input id="si-name" type="text" maxlength="40" autocomplete="nickname" spellcheck="false" placeholder="e.g. Jane Doe or vibe_master" aria-label="Your name or username">
    <div id="si-msg" class="small" role="alert"></div>
    <div class="modal-actions"><button type="button" class="btn" id="si-cancel">Cancel</button><button type="submit" class="btn primary" id="si-go">Sign in</button></div></form>
    <p class="small" style="margin-bottom:0">Names aren’t case-sensitive. No account or password needed; badges are saved in this browser.</p></div>`;
  document.body.appendChild(m);
  const close = () => m.remove();
  m.addEventListener('click', e => { if (e.target === m) close(); });
  $('si-cancel').onclick = close;
  m.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  const inp = $('si-name'), msg = $('si-msg');
  setTimeout(() => inp.focus(), 30);
  $('si-form').onsubmit = e => {
    e.preventDefault();
    const login = inp.value.replace(/\s+/g, ' ').trim();
    if (!login){ msg.textContent = 'Please type a name.'; return; }
    if (login.length > 40){ msg.textContent = 'Please keep it to 40 characters or fewer.'; return; }
    const returning = knownNames().includes(login.toLowerCase());
    setUser({ login });
    close(); refreshUserUI();
    const n = CHALLENGES.filter(c => getBadges()[c.id]).length;
    toast(returning ? `👋 Welcome back, <b>${escH(login)}</b>! You have ${n} badge${n === 1 ? '' : 's'}.`
                    : `👋 Hi <b>${escH(login)}</b>! Complete challenges to earn badges.`);
  };
}
function signOut(){ setUser(null); refreshUserUI(); toast('Signed out. Your badges are saved for next time.'); }
function renderUserBox(){
  const bar = document.querySelector('.topbar .wrap'); if (!bar) return;
  let box = $('userbox');
  if (!box){ box = document.createElement('div'); box.id = 'userbox'; bar.appendChild(box); }
  const u = getUser();
  if (u){
    const n = CHALLENGES.filter(c => getBadges()[c.id]).length;
    box.innerHTML = `<a class="userchip" href="badges.html" title="My badges"><span class="avatar">${escH(initials(u.login))}</span><span>${escH(u.login)}</span><span class="count">🏅 ${n}/${CHALLENGES.length}</span></a><button class="btn small-btn" id="signout">Sign out</button>`;
    $('signout').onclick = signOut;
  } else {
    box.innerHTML = '<button class="btn primary" id="signin">👋 Sign in</button>';
    $('signin').onclick = openSignIn;
  }
}
function refreshUserUI(){
  renderUserBox(); renderBadgeShelf(); renderTrophy();
  const earned = getBadges(), signed = !!getUser();
  CHALLENGES.forEach(c => {
    const el = $('ch-' + c.id); if (!el) return;
    el.classList.remove('done');
    el.querySelector('.ch-status').innerHTML = signed ? '' : '<button class="linkbtn">Sign in to earn</button>';
    const m = el.querySelector('.ch-msg'); if (m){ m.className = 'ch-msg'; m.textContent = ''; }
    const lb = el.querySelector('.linkbtn'); if (lb) lb.onclick = openSignIn;
    if (earned[c.id]) markDone(el);
  });
}
const reducedMotion = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(html){
  const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = html;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3200);
}
function confetti(x, y){
  if (reducedMotion()) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti';
  document.body.appendChild(cv);
  const dpr = window.devicePixelRatio || 1, W = innerWidth, H = innerHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
  const cols = [COL.c1, COL.c2, COL.c3, COL.c4, '#f2c230'];
  const P = Array.from({ length: 90 }, () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 5 + Math.random() * 7;
    return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
             w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, c: cols[Math.floor(Math.random() * cols.length)] };
  });
  let frame = 0;
  (function step(){
    ctx.clearRect(0, 0, W, H);
    for (const p of P){
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - frame / 110); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    }
    if (++frame < 110) requestAnimationFrame(step); else cv.remove();
  })();
}
function markDone(el){
  el.classList.add('done');
  el.querySelector('.ch-status').textContent = '🏅 Earned';
}
const WRONG = [
  'Not quite! Even Galileo needed a few swings. 🕯️',
  'Newton is gently shaking his head. Check your math! 🍎',
  'That answer is overdamped: slow, and nowhere near the target. 🐌',
  'Close, but your answer is out of phase with reality. 🔄',
  'The spring rejected your answer. It’s under a lot of tension right now. 🌀',
  'Error 404: correct answer not found. 🔍',
  'Resonance says no. Your amplitude of correctness is a bit low. 📉',
  'That was a linear guess for a nonlinear problem. 😅',
  'Your answer has been damped out. Try again! 💤',
  'Almost! The transmissibility of that answer is less than 1. 📏',
  'Hmm, you’re beating around the bush. 🥁',
  'The free-body diagram of that answer has a few forces missing. ✏️',
  'Plot twist: that’s not it. Calculate first, then slide! 🧮',
  'So close the pendulum is still swinging. Have another go! ⏳'
];
let lastWrong = -1;
const funny = () => { let i; do { i = Math.floor(Math.random() * WRONG.length); } while (i === lastWrong && WRONG.length > 1); lastWrong = i; return WRONG[i]; };
function awardBadge(c, el){
  saveBadge(c.id); markDone(el); renderUserBox();
  const msg = el.querySelector('.ch-msg'); msg.className = 'ch-msg good'; msg.textContent = 'Correct! Nicely done.';
  const r = el.getBoundingClientRect();
  confetti(r.left + 30, r.top + r.height / 2);
  if (CHALLENGES.every(x => getBadges()[x.id])){
    setTimeout(() => confetti(innerWidth / 2, innerHeight * 0.6), 500);
    toast(`🎓 All ${CHALLENGES.length} badges earned! <a href="badges.html" style="color:inherit"><b>See your certificate →</b></a>`);
  } else toast(`${c.icon} Badge earned: <b>${c.title}</b>`);
}
function submitChallenge(c, el){
  if (el.classList.contains('done')) return;
  if (!getUser()){ openSignIn(); toast('Sign in first, so your badge has somewhere to live. 👋'); return; }
  const ctl = CONTROLS[c.ctl];
  let ok = false; try { ok = !!(ctl && ctl._touched) && !!CHECKS[c.id](); } catch (e){}
  if (ok){ awardBadge(c, el); return; }
  const msg = el.querySelector('.ch-msg'), btn = el.querySelector('.ch-submit');
  msg.className = 'ch-msg bad'; msg.textContent = funny();
  el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  el.dataset.tries = String((+el.dataset.tries || 0) + 1);
  el.querySelector('.ch-status').textContent = `Tries: ${el.dataset.tries}`;
  btn.disabled = true; setTimeout(() => { btn.disabled = false; }, 1500);   // no rapid-fire guessing
}
function mountChallenges(){
  const byDemo = {};
  CHALLENGES.forEach(c => { if ($(c.demo) && CHECKS[c.id]) (byDemo[c.demo] = byDemo[c.demo] || []).push(c); });
  for (const demo in byDemo){
    const box = document.createElement('div'); box.className = 'challenges';
    box.innerHTML = '<div class="ch-head">🎯 Challenges <span>Set up the simulation, then press <b>Submit</b> to check your answer. Sign in with your name to keep your badges; they are collected on your <a href="badges.html">badge page</a>.</span></div>' +
      byDemo[demo].map(c => `<div class="ch" id="ch-${c.id}"><span class="ch-icon" aria-hidden="true">${c.icon}</span><div class="ch-body"><b>${c.title}</b><div class="ch-task">${c.task}</div><div class="ch-msg" aria-live="polite"></div></div><div class="ch-side"><span class="ch-status"></span><button class="btn ch-submit">Submit</button></div></div>`).join('');
    $(demo).appendChild(box);
    byDemo[demo].forEach(c => { const el = $('ch-' + c.id); el.querySelector('.ch-submit').onclick = () => submitChallenge(c, el); });
  }
  refreshUserUI();
  // challenges that compare against earlier settings need the history of what was tried
  setInterval(() => { if (typeof CH_TRACK === 'function') CH_TRACK(); }, 250);
}
function renderBadgeShelf(){
  const shelf = $('badge-shelf'); if (!shelf) return;
  const u = getUser();
  if (!u){
    shelf.innerHTML = `<p class="small">Sign in with your name to earn badges. There are ${CHALLENGES.length} challenges, found under the simulations in each chapter.</p>` +
      '<div class="shelf">' + CHALLENGES.map(c => `<a class="badge" href="${c.page}" title="${c.task}"><span>❔</span>${c.title}</a>`).join('') + '</div>' +
      '<button class="btn primary" id="shelf-signin" style="margin-top:.7rem">👋 Sign in</button>';
    $('shelf-signin').onclick = openSignIn;
    return;
  }
  const earned = getBadges(), n = CHALLENGES.filter(c => earned[c.id]).length;
  shelf.innerHTML = `<p class="small"><b>${escH(u.login)}</b>: ${n} of ${CHALLENGES.length} earned${n === CHALLENGES.length ? ' — you have mastered the lab! 🎉' : '. Challenges appear under the simulations in each chapter.'}</p>` +
    '<p class="small" style="margin-top:0"><a href="badges.html">Open my badge page' + (n === CHALLENGES.length ? ' and certificate' : '') + ' →</a></p>' + '<div class="shelf">' + CHALLENGES.map(c => earned[c.id]
      ? `<a class="badge got" href="${c.page}" title="${c.task}"><span>${c.icon}</span>${c.title}</a>`
      : `<a class="badge" href="${c.page}" title="${c.task}"><span>❔</span>${c.title}</a>`).join('') + '</div>' +
    (n ? '<button class="btn" id="badge-reset" style="margin-top:.6rem">Reset my badges</button>' : '');
  const rb = $('badge-reset');
  if (rb) rb.onclick = () => { if (confirm('Remove all of your badges?')){ try { localStorage.removeItem(badgeKey()); } catch (e){} refreshUserUI(); } };
}

/* ---------- My badges page / certificate ---------- */
const nameKey = () => { const u = getUser(); return u ? 'vlab-name:' + u.login.toLowerCase() : null; };
function getDisplayName(){ const u = getUser(); if (!u) return ''; try { return localStorage.getItem(nameKey()) || u.login; } catch (e){ return u.login; } }
const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const fmtDate = ms => new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
let trophyCelebrated = false;
function renderTrophy(){
  const box = $('trophy'); if (!box) return;
  const u = getUser();
  if (!u){
    box.innerHTML = `<div class="card" style="text-align:center;padding:2rem 1.2rem">
      <div style="font-size:2.6rem">🏅</div>
      <h3>Sign in to see your badges</h3>
      <p class="small" style="margin:0 auto 1rem">Sign in with the same name you used before and your badges will be here.</p>
      <button class="btn primary" id="trophy-signin">👋 Sign in</button></div>`;
    $('trophy-signin').onclick = openSignIn;
    return;
  }
  const earned = getBadges(), n = CHALLENGES.filter(c => earned[c.id]).length, N = CHALLENGES.length, all = n === N;
  const name = getDisplayName();
  const tiles = CHALLENGES.map(c => earned[c.id]
    ? `<div class="tile got"><div class="ti">${c.icon}</div><b>${c.title}</b><span>Earned ${fmtDate(earned[c.id])}</span></div>`
    : `<a class="tile" href="${c.page}"><div class="ti">🔒</div><b>${c.title}</b><span>${c.task}</span><em>Find it in ${whereName(c.page)} →</em></a>`).join('');
  const nameEditor = `<div class="nameedit noprint"><label for="cert-name">Name on ${all ? 'certificate' : 'this page'}</label>
    <input id="cert-name" type="text" maxlength="60" value="${esc(name)}"><span class="small">Defaults to the name you signed in with.</span></div>`;
  if (all){
    const done = Math.max(...CHALLENGES.map(c => earned[c.id]));
    box.innerHTML = `<div class="cert">
        <div class="cert-inner">
          <div class="cert-kicker">Linear Vibrations Lab</div>
          <div class="cert-title">Certificate of Completion</div>
          <div class="cert-small">This certifies that</div>
          <div class="cert-name" id="cert-name-out">${esc(name)}</div>
          <div class="cert-small">has earned all ${N} badges in the Linear Vibrations Lab,<br>from equations of motion to vibration isolation.</div>
          <div class="tiles cert-tiles">${tiles}</div>
          <div class="cert-foot"><span>Completed ${fmtDate(done)}</span>${name.toLowerCase() !== u.login.toLowerCase() ? `<span>Signed in as ${esc(u.login)}</span>` : ''}</div>
        </div>
      </div>
      <div class="bar noprint" style="justify-content:center;margin-top:1rem"><button class="btn primary" id="cert-print">🖨️ Print or save as PDF</button></div>
      ${nameEditor}`;
    $('cert-print').onclick = () => window.print();
    if (!trophyCelebrated){ trophyCelebrated = true; setTimeout(() => confetti(innerWidth / 2, innerHeight * 0.45), 400); }
  } else {
    box.innerHTML = `<div class="card">
        <div class="trophy-head"><div><div class="cert-kicker">Badge collection</div><div class="trophy-name" id="cert-name-out">${esc(name)}</div></div>
        <div class="trophy-count"><b>${n}</b>/${N}</div></div>
        <div class="progress" aria-label="${n} of ${N} badges"><div style="width:${n / N * 100}%"></div></div>
        <p class="small">${n === 0 ? 'No badges yet. ' : ''}Earn all ${N} to unlock your certificate. Challenges are under the simulations in each chapter.</p>
        <div class="tiles">${tiles}</div>
      </div>${nameEditor}`;
  }
  const inp = $('cert-name');
  inp.oninput = () => {
    const v = inp.value.trim();
    try { if (v && v !== u.login) localStorage.setItem(nameKey(), v); else localStorage.removeItem(nameKey()); } catch (e){}
    $('cert-name-out').textContent = v || u.login;
  };
}

window.addEventListener('load', () => { mountChallenges(); if (!$('ch-' + CHALLENGES[0].id)) refreshUserUI(); });

/* ---------- drawing helpers (design coordinates) ---------- */
function fitView(ctx, w, h, bb, pad = 10){
  const dpr = window.devicePixelRatio || 1;
  // shrink the canvas box to the drawing's proportions on narrow screens (never taller than designed)
  const cv = ctx.canvas;
  if (!cv.dataset.h0) cv.dataset.h0 = String(h);
  const want = Math.round(Math.min(+cv.dataset.h0, (bb[3] - bb[1]) / (bb[2] - bb[0]) * (w - 2 * pad) + 2 * pad));
  if (Math.abs(want - h) > 3){ cv.style.height = want + 'px'; }
  const s = Math.min((w - 2 * pad) / (bb[2] - bb[0]), (h - 2 * pad) / (bb[3] - bb[1]));
  const tx = pad + ((w - 2 * pad) - s * (bb[2] - bb[0])) / 2 - s * bb[0];
  const ty = pad + ((h - 2 * pad) - s * (bb[3] - bb[1])) / 2 - s * bb[1];
  ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * tx, dpr * ty);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  return s;
}
function springLine(ctx, x1, y1, x2, y2, n = 8, a = 8){
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-6) return;
  ctx.save(); ctx.strokeStyle = COL.spring; ctx.lineWidth = 2;
  ctx.translate(x1, y1); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
  drawSpring(ctx, 0, L, 0, n, a);
  ctx.restore();
}
function damperLine(ctx, x1, y1, x2, y2, L0){
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-6) return;
  ctx.save(); ctx.strokeStyle = COL.spring; ctx.lineWidth = 2;
  ctx.translate(x1, y1); ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
  const c0 = 0.18 * L0, c1 = 0.62 * L0, hw = 8;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(c0, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(c1, -hw); ctx.lineTo(c0, -hw); ctx.lineTo(c0, hw); ctx.lineTo(c1, hw); ctx.stroke();
  const p = clamp(L - 0.6 * L0, c0 + 3, c1 - 3);
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p, -hw + 3); ctx.lineTo(p, hw - 3); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(L, 0); ctx.stroke();
  ctx.restore();
}
// ground/wall line with hatching on one side (side = 1 is to the left of the direction of travel)
function hatch(ctx, x1, y1, x2, y2, side = 1, sp = 9, len = 7){
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 1e-6) return;
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, nx = uy * side, ny = -ux * side;
  ctx.save(); ctx.strokeStyle = COL.ground; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.lineWidth = 1;
  for (let s = 4; s <= L; s += sp){
    const px = x1 + ux * s, py = y1 + uy * s;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - nx * len - ux * len * 0.7, py - ny * len - uy * len * 0.7); ctx.stroke();
  }
  ctx.restore();
}
function block(ctx, cx, cy, bw, bh, ang, label, fill){
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang || 0);
  ctx.fillStyle = fill || COL.mass; ctx.strokeStyle = COL.massEdge; ctx.lineWidth = 2;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(-bw / 2, -bh / 2, bw, bh, 5); else ctx.rect(-bw / 2, -bh / 2, bw, bh);
  ctx.fill(); ctx.stroke();
  if (label){ ctx.fillStyle = COL.fg; ctx.font = 'italic 16px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1); }
  ctx.restore();
}
function wheels(ctx, cx, bottom, bw){
  ctx.save(); ctx.fillStyle = COL.spring;
  [cx - bw * 0.28, cx + bw * 0.28].forEach(x => { ctx.beginPath(); ctx.arc(x, bottom + 5, 5, 0, 2 * Math.PI); ctx.fill(); });
  ctx.restore();
}
function pulley(ctx, x, y, r){
  ctx.save(); ctx.fillStyle = COL.card; ctx.strokeStyle = COL.spring; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  ctx.fillStyle = COL.spring; ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, r * 0.2), 0, 2 * Math.PI); ctx.fill();
  ctx.restore();
}
function cable(ctx, fn){ ctx.save(); ctx.strokeStyle = COL.fg; ctx.lineWidth = 2.6; ctx.beginPath(); fn(); ctx.stroke(); ctx.restore(); }
function line(ctx, x1, y1, x2, y2, col, wd = 2, dash){
  ctx.save(); ctx.strokeStyle = col || COL.spring; ctx.lineWidth = wd; if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
function txt(ctx, s, x, y, opt = {}){
  ctx.save(); ctx.fillStyle = opt.color || COL.fg; ctx.font = opt.font || 'italic 15px Georgia, serif';
  ctx.textAlign = opt.align || 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y); ctx.restore();
}
function forceArrow(ctx, x, y, len, label, vertical){
  if (Math.abs(len) < 2) return;
  if (vertical){ if (len > 0) arrow(ctx, x, y, x, y + len, COL.c2, 2.5); else arrow(ctx, x, y - len, x, y, COL.c2, 2.5); }
  else { if (len > 0) arrow(ctx, x, y, x + len, y, COL.c2, 2.5); else arrow(ctx, x - len, y, x, y, COL.c2, 2.5); }
  if (label) txt(ctx, label, x + (vertical ? 22 : len / 2), y + (vertical ? Math.abs(len) / 2 + 4 : -12), { color: COL.c2 });
}
function freqStats(meq, keq, label){
  if (keq > 0 && meq > 0){
    const wn = Math.sqrt(keq / meq);
    return [[label || 'ωₙ', fmt(wn) + ' rad/s', true], ['fₙ', fmt(wn / 2 / Math.PI) + ' Hz'], ['Period', fmt(2 * Math.PI / wn) + ' s']];
  }
  return [[label || 'ωₙ', '— (k_eq ≤ 0, no oscillation)']];
}
// amplitude-ratio vs frequency plot used by the forced examples
function ratioPlot(cv, o){
  const N = 600, pts = [];
  for (let i = 0; i <= N; i++){ const w = o.wmax * i / N; pts.push([w, o.ratio(w)]); }
  plot(cv, {
    xmin: 0, xmax: o.wmax, ymin: 0, ymax: o.ymax, xlabel: 'forcing frequency ω (rad/s)', ylabel: o.ylabel,
    bands: o.bands || [], vlines: o.vlines || [], hlines: o.hlines || [],
    series: [{ pts, color: COL.c1, width: 2.4 }],
    points: isFinite(o.w) ? [{ x: Math.abs(o.w), y: Math.min(o.ratio(Math.abs(o.w)), o.ymax), color: COL.c2, r: 6 }] : []
  });
}
const posErr = name => ({ error: `<b>${name} must be positive.</b> Enter a value greater than 0.` });


/* Start the shared animation loop */
requestAnimationFrame(loop);
