/* ============================================================================
   Lab: interactive video-quality simulator. Loaded on demand (main.js imports
   it when the section comes near), so it costs nothing on first paint.

   The model (qoe-model.js) simulates a 60 s session; this file replays it in
   a few seconds:
   - .lab-video  a night-sea scene drawn in glyphs. Glyph cells get coarser as
                 the resolution drops; the frame freezes with a spinner during
                 stalls; during start-up it shows the handshakes as a console.
   - .lab-lane   packets crossing from server to screen; travel time follows
                 latency, flow follows throughput, lost ones blink out (loss
                 exaggerated so it is visible).
   - .lab-strip  the whole session at a glance: start-up, playback (brighter =
                 sharper), stalls, and the buffer level.
   Pauses off-screen. Reduced motion: final state, drawn once, no animation.
   ========================================================================= */
import { simulate, summary, PRESETS, SCALES, LADDER, fmt } from './qoe-model.js';
import { REDUCED } from './motion.js';

const RAMP = ' .,:;-=+*#%@';
const CELL = [22, 18, 14, 11, 8.5, 7, 6];          // px per glyph cell, by rung
const STARTUP_MIN = 0.9, STARTUP_MAX = 2.4;        // replay seconds for start-up
const PLAY_SECS = 5.5;                             // replay seconds for playback (stalls add more)

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function mix(a, b, t) {
  const pa = a.match(/\w\w/g).map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g).map((h) => parseInt(h, 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
}

function fitCanvas(c) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/* Scene luminance (0-1) at x, y in 0-1, scene time s. Night sea, moon,
   a ridge of hills, stars. Sampled per glyph cell. */
function scene(x, y, s, aspect) {
  const hz = 0.6;
  const mx = 0.72, my = 0.27, mr = 0.11;
  const dx = (x - mx) * aspect, dy = (y - my);
  const d = Math.sqrt(dx * dx + dy * dy);
  if (y < hz) {
    // hills: a dark silhouette against the horizon glow
    const ridge = 0.5 + 0.05 * Math.sin(x * 6.1 + 0.4) + 0.025 * Math.sin(x * 17 + 2.1);
    if (y > ridge) return 0;
    let l = 0.04 + 0.3 * (y / hz) ** 3;                      // glow towards the horizon
    if (d < mr) {                                             // moon, with a few craters
      const crater = 0.18 * Math.max(0, Math.sin(dx * 38 + 1) * Math.sin(dy * 33 + 2));
      l = 0.97 - 0.2 * (d / mr) ** 4 - crater;
    } else l += 0.55 * Math.exp(-(d - mr) * 7);              // halo
    const sx = Math.floor(x * 90), sy = Math.floor(y * 50);
    const h = Math.sin(sx * 127.1 + sy * 311.7) * 43758.5453;
    const fr = h - Math.floor(h);
    if (fr > 0.988 && d > mr * 2) l = Math.max(l, 0.3 + 0.25 * (0.5 + 0.5 * Math.sin(s * 2.4 + fr * 50)));
    return Math.min(1, l);
  }
  // sea: moving crests, and the moon's reflection breaking on them
  const depth = (y - hz) / (1 - hz);
  const ph = x * (26 - depth * 10) - s * 1.4 + depth * 30 + Math.sin(x * 7 + s * 0.6) * 1.6;
  const crest = Math.pow(0.5 + 0.5 * Math.sin(ph), 7);
  let l = 0.05 + crest * (0.22 + 0.28 * depth);
  const spread = 0.03 + depth * 0.2;
  const col = Math.exp(-((((x - mx) * aspect) / spread) ** 2));
  const glint = 0.5 + 0.5 * Math.sin(y * 95 - s * 2.4 + Math.sin(x * 40) * 2);
  l += col * (0.25 + 0.65 * glint) * (1 - depth * 0.35);
  return Math.min(1, l);
}

export function initLab(root) {
  if (!root || root._lab) return;
  root._lab = true;

  const $ = (sel) => root.querySelector(sel);
  const video = $('.lab-video'), lane = $('.lab-lane'), strip = $('.lab-strip');
  const out = (k) => root.querySelector(`[data-out="${k}"]`);
  const sliders = [...root.querySelectorAll('input[type=range][data-k]')];
  const chips = [...root.querySelectorAll('[data-preset]')];
  const kpis = Object.fromEntries([...root.querySelectorAll('[data-kpi]')].map((el) =>
    [el.dataset.kpi, { el, v: el.querySelector('[data-v]'), n: el.querySelector('[data-n]') }]));

  const C = {
    accent: css('--accent'), dim: css('--accent-dim'), ink: css('--ink'), soft: css('--ink-soft'),
    faint: css('--faint'), ghost: css('--ghost'), risk: css('--risk'), warn: css('--warn'), canvas: css('--canvas'),
  };
  const shades = RAMP.split('').map((_, i) => {
    const t = i / (RAMP.length - 1);
    return t < 0.65 ? mix(C.dim.slice(1), C.accent.slice(1), t / 0.65) : mix(C.accent.slice(1), C.ink.slice(1), (t - 0.65) / 0.35);
  });

  const pressed = chips.find((c) => c.getAttribute('aria-pressed') === 'true');
  const p0 = PRESETS.find((p) => pressed && p.id === pressed.dataset.preset) || PRESETS[0];
  let input = { rtt: p0.rtt, loss: p0.loss, bw: p0.bw, jitter: p0.jitter };
  let r = simulate(input);
  let lastDraw = 0;
  let a = 0;                    // replay clock, seconds
  let sceneT = 0;               // scene clock, advances only while playing
  let last = 0, raf = 0, visible = false, ended = false;
  let packets = [], spawnAcc = 0;

  /* ---- replay time mapping ------------------------------------------------
     Start-up gets its own slot (so the handshakes are readable), playback is
     squeezed into PLAY_SECS, and stalls are slowed down so each one shows for
     close to a second instead of flashing by. Built as breakpoints (replay
     seconds -> session seconds) and interpolated. */
  let map = [];
  function buildMap() {
    const as = Math.min(STARTUP_MAX, Math.max(STARTUP_MIN, r.startup * 0.6));
    const s = r.samples.filter((x) => x.t >= r.startup);
    const playSpan = Math.max(0.001, r.total - r.startup);
    const rate = PLAY_SECS / playSpan;                         // replay s per session s
    const stallRate = r.stallTime > 0 ? Math.max(rate, (0.85 * r.stalls) / r.stallTime) : rate;
    map = [[0, 0], [as, r.startup]];
    let a0 = as, t0 = r.startup;
    s.forEach((x, i) => {
      const prev = i ? s[i - 1] : null;
      const k = prev && prev.s === 2 ? stallRate : rate;
      a0 += (x.t - t0) * k; t0 = x.t;
      map.push([a0, x.t]);
    });
  }
  const replayLen = () => map[map.length - 1][0];
  const sessionTime = (x) => {
    let lo = 0, hi = map.length - 1;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (map[m][0] <= x) lo = m; else hi = m; }
    const [a1, t1] = map[lo], [a2, t2] = map[hi];
    return a2 > a1 ? t1 + ((x - a1) / (a2 - a1)) * (t2 - t1) : t2;
  };
  const sampleAt = (t) => {
    const s = r.samples;
    let lo = 0, hi = s.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (s[m].t <= t) lo = m; else hi = m - 1; }
    return s[lo];
  };

  /* ---- video ---------------------------------------------------------------- */
  function drawScene(ctx, w, h, rung, s, alpha = 1) {
    const cell = CELL[rung];
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    const buckets = RAMP.split('').map(() => []);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const l = scene((i + 0.5) / cols, (j + 0.5) / rows, s, w / h);
        if (l < 0.1) continue;                                  // keep the dark parts dark
        const k = Math.min(RAMP.length - 1, 1 + Math.floor(((l - 0.1) / 0.9) ** 0.85 * (RAMP.length - 1)));
        buckets[k].push(i, j);
      }
    }
    ctx.font = `${Math.round(cell * 1.08)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = alpha;
    buckets.forEach((b, k) => {
      if (!b.length) return;
      ctx.fillStyle = shades[k];
      for (let n = 0; n < b.length; n += 2) ctx.fillText(RAMP[k], (b[n] + 0.5) * cell, (b[n + 1] + 0.5) * cell);
    });
    ctx.globalAlpha = 1;
  }

  function drawConsole(ctx, w, h, t) {
    ctx.font = `${w < 420 ? 11 : 12.5}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const lh = w < 420 ? 19 : 23, x0 = 18;
    let y = 18, acc = 0;
    const spin = '|/-\\'[Math.floor(performance.now() / 110) % 4];
    ctx.fillStyle = C.faint;
    ctx.fillText('> play', x0, y); y += lh * 1.3;
    for (const step of r.steps) {
      const done = t >= acc + step.s - 1e-6;
      const active = !done && t >= acc;
      if (!done && !active) break;
      ctx.fillStyle = done ? C.soft : C.accent;
      const ms = `${Math.round(step.s * 1000)} ms`;
      ctx.fillText(`${done ? '+' : spin} ${step.label}`, x0, y);
      ctx.fillStyle = done ? C.accent : C.faint;
      ctx.textAlign = 'right';
      ctx.fillText(done ? ms : '...', w - x0, y);
      ctx.textAlign = 'left';
      y += lh;
      acc += step.s;
    }
  }

  function drawVideo(now, state, rung, t) {
    const { ctx, w, h } = fitCanvas(video);
    ctx.fillStyle = C.canvas;
    ctx.fillRect(0, 0, w, h);
    if (state === 0 && t < r.startup) { drawConsole(ctx, w, h, t); return; }
    if (state === 2) {
      drawScene(ctx, w, h, rung, sceneT, 0.28);
      const spin = '|/-\\'[Math.floor(now / 110) % 4];
      ctx.font = '600 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = C.warn;
      ctx.fillText(`[ ${spin} buffering ]`, w / 2, h / 2);
      return;
    }
    drawScene(ctx, w, h, rung, sceneT);
  }

  /* ---- packet lane ------------------------------------------------------------ */
  function drawLane(dt) {
    const { ctx, w, h } = fitCanvas(lane);
    ctx.clearRect(0, 0, w, h);
    const pad = 64, x0 = pad, x1 = w - pad;
    const travel = 0.35 + (r.input.rtt / 2 / 350) * 2.2;          // seconds on screen
    const rate = 5 + 22 * Math.log10(1 + r.throughput) / Math.log10(201);   // packets / s
    const pLost = Math.min(0.45, r.input.loss * 0.14);
    if (dt > 0) {
      spawnAcc += dt * rate;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        packets.push({ age: 0, lostAt: Math.random() < pLost ? 0.2 + Math.random() * 0.6 : 2, wob: Math.random() });
      }
      packets.forEach((p) => { p.age += dt; });
      packets = packets.filter((p) => p.age / travel < 1 && !(p.dead && p.dead > 0.5));
    }
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = C.faint;
    ctx.textAlign = 'left'; ctx.fillText('server', 0, h / 2);
    ctx.textAlign = 'right'; ctx.fillText('you', w, h / 2);
    ctx.strokeStyle = C.ghost; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, h / 2); ctx.lineTo(x1, h / 2); ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = '12px "JetBrains Mono", monospace';
    packets.forEach((p) => {
      const f = p.age / travel;
      const jit = (r.input.jitter / 150) * 5 * Math.sin(p.wob * 20 + p.age * 9);
      const x = x0 + (x1 - x0) * Math.min(f, p.lostAt);
      if (f >= p.lostAt) {
        p.dead = (p.dead || 0) + dt;
        ctx.globalAlpha = Math.max(0, 1 - p.dead * 2);
        ctx.fillStyle = C.risk; ctx.fillText('x', x, h / 2 + jit);
      } else {
        ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, f * 4);
        ctx.fillStyle = C.accent; ctx.fillText('>', x, h / 2 + jit);
      }
    });
    ctx.globalAlpha = 1;
  }

  /* ---- session strip ------------------------------------------------------------ */
  function drawStrip(tNow) {
    const { ctx, w, h } = fitCanvas(strip);
    ctx.clearRect(0, 0, w, h);
    const s = r.samples, T = r.total;
    const band = h - 14, top = 2;
    ctx.fillStyle = C.ghost; ctx.globalAlpha = 0.35;
    ctx.fillRect(0, top, w, band); ctx.globalAlpha = 1;
    const bw = Math.max(1, w / s.length + 0.6);
    for (let i = 0; i < s.length && s[i].t <= tNow; i++) {
      const x = (s[i].t / T) * w;
      if (s[i].s === 0) { ctx.fillStyle = C.faint; ctx.globalAlpha = 0.55; }
      else if (s[i].s === 2) { ctx.fillStyle = C.risk; ctx.globalAlpha = 0.95; }
      else { ctx.fillStyle = C.accent; ctx.globalAlpha = 0.22 + 0.78 * (s[i].r / (LADDER.length - 1)); }
      ctx.fillRect(x, top, bw, band);
    }
    ctx.globalAlpha = 1;
    // buffer level (0-30 s) as a line
    ctx.strokeStyle = C.ink; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.25;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < s.length && s[i].t <= tNow; i++) {
      const x = (s[i].t / T) * w, y = top + band - (Math.min(30, s[i].b) / 30) * (band - 3) - 1;
      if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke(); ctx.globalAlpha = 1;
    // playhead + axis
    const px = Math.min(w - 1, (tNow / T) * w);
    if (tNow < T) { ctx.fillStyle = C.ink; ctx.fillRect(px, 0, 1.5, band + top + 2); }
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = C.faint; ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left'; ctx.fillText('0 s', 0, h);
    ctx.textAlign = 'right'; ctx.fillText(`${Math.round(T)} s session`, w, h);
  }

  /* ---- numbers ---------------------------------------------------------------------- */
  const clock = (p) => `${Math.floor(p / 60)}:${String(Math.floor(p % 60)).padStart(2, '0')} / 1:00`;
  function setKpis(final, t, smp) {
    const k = summary(r);
    if (final) {
      Object.entries(k).forEach(([key, [v, n]]) => { kpis[key].v.textContent = v; kpis[key].n.textContent = n; });
      kpis.score.el.dataset.verdict = r.verdict.toLowerCase();
      const said = `Start-up ${k.startup[0]}, ${r.stalls} stall${r.stalls === 1 ? '' : 's'}, mostly ${r.quality}, viewer score ${k.score[0]} out of 5, ${r.verdict}.`;
      if (out('summary').textContent !== said) out('summary').textContent = said;
      return;
    }
    kpis.startup.v.textContent = t >= r.startup ? k.startup[0] : '…';
    kpis.startup.n.textContent = t >= r.startup ? k.startup[1] : 'connecting';
    const stallsSoFar = r.samples.reduce((n, s, i, arr) => n + (s.t <= t && s.s === 2 && (i === 0 || arr[i - 1].s !== 2) ? 1 : 0), 0);
    kpis.stalls.v.textContent = String(stallsSoFar);
    kpis.stalls.n.textContent = smp.s === 2 ? 'stalled now' : 'so far';
    kpis.quality.v.textContent = t >= r.startup ? LADDER[smp.r].label : '…';
    kpis.quality.n.textContent = 'right now';
    kpis.score.v.textContent = '…';
    kpis.score.n.textContent = 'after the session';
    delete kpis.score.el.dataset.verdict;
  }

  /* ---- loop --------------------------------------------------------------------------- */
  function frame(now) {
    if (now - lastDraw < 30) { raf = visible ? requestAnimationFrame(frame) : 0; return; }   // ~30 fps
    lastDraw = now;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (!ended) a += dt;
    if (!ended && a >= replayLen()) { a = replayLen(); ended = true; setKpis(true); }
    const t = ended ? r.total : sessionTime(a);
    const smp = sampleAt(t);
    const state = ended ? 1 : smp.s;
    if (state === 1) sceneT += dt;
    drawVideo(now, state, smp.r, t);
    drawLane(dt);
    drawStrip(t);
    out('res').textContent = t >= r.startup || ended ? LADDER[smp.r].label : '—';
    out('clock').textContent = clock(ended ? 60 : smp.p);
    if (!ended) setKpis(false, t, smp);
    raf = visible ? requestAnimationFrame(frame) : 0;
  }
  const play = () => { if (!raf && visible && !REDUCED) { last = 0; raf = requestAnimationFrame(frame); } };

  function drawStatic() {                      // reduced motion: final state
    const end = r.samples[r.samples.length - 1];
    drawVideo(0, 1, end.r, r.total);
    drawLane(0);
    drawStrip(r.total);
    out('res').textContent = r.quality;
    out('clock').textContent = clock(60);
    setKpis(true);
  }

  function run(next, { fromPreset = false } = {}) {
    input = next;
    r = simulate(input);
    buildMap();
    out('thr').textContent = fmt.mbps(r.throughput);
    out('bw').textContent = String(input.bw);
    sliders.forEach((s) => {
      const k = s.dataset.k;
      if (fromPreset) s.value = SCALES[k].from(input[k]).toFixed(1);
      root.querySelector(`[data-val="${k}"]`).textContent = fmt[k](input[k]);
      s.setAttribute('aria-valuetext', fmt[k](input[k]));
    });
    a = 0; ended = false; sceneT = 0; packets = [];
    if (REDUCED) drawStatic(); else play();
  }

  /* ---- wiring ---------------------------------------------------------------------- */
  chips.forEach((c) => c.addEventListener('click', () => {
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    const p = PRESETS.find((x) => x.id === c.dataset.preset);
    run({ rtt: p.rtt, loss: p.loss, bw: p.bw, jitter: p.jitter }, { fromPreset: true });
  }));
  let pend = 0;
  sliders.forEach((s) => s.addEventListener('input', () => {
    chips.forEach((x) => x.setAttribute('aria-pressed', 'false'));
    const k = s.dataset.k;
    const v = SCALES[k].to(Number(s.value));
    root.querySelector(`[data-val="${k}"]`).textContent = fmt[k](v);
    cancelAnimationFrame(pend);
    pend = requestAnimationFrame(() => run({ ...input, [k]: v }));
  }));
  root.querySelector('[data-replay]').addEventListener('click', () => run(input));

  new IntersectionObserver((es) => {
    visible = es.some((e) => e.isIntersecting);
    if (visible) { if (REDUCED) drawStatic(); else play(); }
  }, { threshold: 0.15 }).observe(root);

  let rz = 0;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (REDUCED) drawStatic(); }, 150); });

  const start = () => run(input, { fromPreset: true });
  if (document.fonts && document.fonts.load) document.fonts.load('12px "JetBrains Mono"').then(start, start);
  else start();
}
