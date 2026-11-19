/* ============================================================================
   Portrait glyphs. The photo is sampled into a grid of brightness values and
   redrawn as mono glyphs. On load the glyph portrait dissolves into the
   photo; afterwards a glyph "lens" follows the pointer (or ripples out from a
   tap on touch screens).
   ========================================================================= */
import { REDUCED } from './motion.js';

const RAMP = ' .,:;-~=+*#%@';

export function portraitGlyphs(fig) {
  const img = fig.querySelector('img');
  const pic = fig.querySelector('.portrait-pic');
  const canvas = fig.querySelector('canvas');
  if (!img || !canvas) return;
  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);
  const C = {
    ink: root.getPropertyValue('--ink-soft').trim(),
    accent: root.getPropertyValue('--accent').trim(),
    back: root.getPropertyValue('--canvas').trim(),
  };

  let W = 0, H = 0, dpr = 1, cw = 8, ch = 10, cols = 0, rows = 0;
  let lum = null, thr = null;
  let mode = 'idle';                       // idle | intro | lens
  const lens = { x: 0, y: 0, tx: 0, ty: 0, s: 0, ts: 0, r: 0 };
  let raf = 0, introT0 = 0;

  function sample() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !img.naturalWidth) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cw = W < 380 ? 7 : 8;
    ch = Math.round(cw * 1.28);
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / ch);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    lens.r = Math.max(70, Math.min(W, H) * 0.3);

    // Reproduce object-fit: cover + object-position, so glyphs sit on the face.
    const [px, py] = (getComputedStyle(img).objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    const nw = img.naturalWidth, nh = img.naturalHeight, A = W / H, B = nw / nh;
    let sx = 0, sy = 0, sw = nw, sh = nh;
    if (B > A) { sw = nh * A; sx = (nw - sw) * (isNaN(px) ? 0.5 : px); }
    else { sh = nw / A; sy = (nh - sh) * (isNaN(py) ? 0.5 : py); }

    const off = document.createElement('canvas');
    off.width = cols; off.height = rows;
    const o = off.getContext('2d', { willReadFrequently: true });
    o.drawImage(img, sx, sy, sw, sh, 0, 0, cols, rows);
    const d = o.getImageData(0, 0, cols, rows).data;
    lum = new Float32Array(cols * rows);
    thr = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) {
      const l = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
      lum[i] = Math.min(1, Math.max(0, (l - 0.06) * 1.35));
      const c = i % cols, r = (i / cols) | 0;
      thr[i] = 0.55 * ((c / cols) * 0.4 + (r / rows) * 0.6) + 0.45 * Math.random();
    }
    return true;
  }

  function glyphAt(i) {
    let k = Math.round(lum[i] * (RAMP.length - 1));
    if (Math.random() < 0.06) k = Math.max(0, Math.min(RAMP.length - 1, k + (Math.random() < 0.5 ? -1 : 1)));
    return RAMP[k];
  }

  function paint(alphaAt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.font = `${Math.round(ch * 0.9)}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = alphaAt(c, r);
        if (a <= 0.02) continue;
        const i = r * cols + c, x = c * cw, y = r * ch;
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = C.back;
        ctx.fillRect(x, y, cw, ch);
        const g = glyphAt(i);
        if (g === ' ') continue;
        const L = lum[i];
        ctx.globalAlpha = a * (0.3 + 0.7 * L);
        ctx.fillStyle = L > 0.6 ? C.accent : C.ink;
        ctx.fillText(g, x + cw / 2, y + ch / 2 + 0.5);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---- intro: glyph portrait dissolves into the photo -------------------- */
  function intro() {
    if (!sample()) { pic.style.opacity = 1; return; }
    pic.style.opacity = 1;
    if (REDUCED) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
    mode = 'intro';
    introT0 = performance.now();
    const HOLD = 700, DISSOLVE = 1500;
    const step = (now) => {
      const t = now - introT0;
      const p = t < HOLD ? 0 : Math.min(1, (t - HOLD) / DISSOLVE);
      paint((c, r) => Math.max(0, Math.min(1, (thr[r * cols + c] - p) * 9)));
      if (p < 1) raf = requestAnimationFrame(step);
      else { mode = 'idle'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
    raf = requestAnimationFrame(step);
  }

  /* ---- lens -------------------------------------------------------------- */
  function lensLoop() {
    lens.x += (lens.tx - lens.x) * 0.22;
    lens.y += (lens.ty - lens.y) * 0.22;
    lens.s += (lens.ts - lens.s) * 0.14;
    const R = lens.r * (0.6 + 0.4 * lens.s);
    paint((c, r) => {
      const dx = c * cw + cw / 2 - lens.x, dy = r * ch + ch / 2 - lens.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > R) return 0;
      const e = 1 - d / R;
      return lens.s * Math.min(1, e * 2.2);
    });
    if (lens.ts === 0 && lens.s < 0.02) {
      mode = 'idle';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    raf = requestAnimationFrame(lensLoop);
  }
  function startLens() {
    if (mode === 'intro' || !lum) return;
    if (mode !== 'lens') { mode = 'lens'; raf = requestAnimationFrame(lensLoop); }
  }
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  fig.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    [lens.tx, lens.ty] = local(e);
    if (lens.s < 0.02) { lens.x = lens.tx; lens.y = lens.ty; }
    lens.ts = 1;
    startLens();
  });
  fig.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    [lens.tx, lens.ty] = local(e);
  });
  fig.addEventListener('pointerleave', () => { lens.ts = 0; });
  fig.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    [lens.tx, lens.ty] = local(e);
    lens.x = lens.tx; lens.y = lens.ty;
    lens.ts = 1;
    startLens();
    setTimeout(() => { lens.ts = 0; }, 900);
  });

  new ResizeObserver(() => { if (lum && mode !== 'intro') sample(); }).observe(canvas);

  const go = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(intro);
  if (img.complete && img.naturalWidth) go();
  else {
    img.addEventListener('load', go, { once: true });
    img.addEventListener('error', () => { pic.style.opacity = 1; }, { once: true });
  }
}
