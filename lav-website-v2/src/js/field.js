/* ============================================================================
   Hero glyph field: a grid of mono glyphs that draws two travelling carrier
   waves, with brighter "packets" riding the main one and an interference
   ripple around the pointer. Glyph density follows signal intensity.

   Cheap by construction: glyphs are pre-rendered once into a sprite atlas and
   blitted with drawImage, frames are capped at 30 fps, and the loop stops when
   the hero is off-screen or the tab is hidden. Reduced motion: one still frame.
   ========================================================================= */
import { REDUCED } from './motion.js';

const GLYPHS = ['·', '.', ':', '-', '+', '=', '*', '~', '0', '1', '#', '%', '@', '&'];
const LOW = [0, 3], MID = [3, 8], HIGH = [8, 14];   // [from, to) index ranges
const TAU = Math.PI * 2;
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function glyphField(canvas) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);
  const colors = [root.getPropertyValue('--ink-soft').trim(), root.getPropertyValue('--accent').trim()];

  let W = 0, H = 0, dpr = 1, cw = 14, ch = 18, cols = 0, rows = 0;
  let seeds, gidx, swapAt, atlas = [];
  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, target: 0 };
  let running = false, raf = 0, last = 0, visible = true;

  function buildAtlas() {
    atlas = colors.map((color) => {
      const c = document.createElement('canvas');
      c.width = Math.ceil(GLYPHS.length * cw * dpr);
      c.height = Math.ceil(ch * dpr);
      const g = c.getContext('2d');
      g.scale(dpr, dpr);
      g.fillStyle = color;
      g.font = `${Math.round(ch * 0.66)}px "JetBrains Mono", ui-monospace, monospace`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      GLYPHS.forEach((s, i) => g.fillText(s, i * cw + cw / 2, ch / 2 + 1));
      return c;
    });
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    cw = W < 700 ? 12 : 14;
    ch = Math.round(cw * 1.3);
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / ch);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const n = cols * rows;
    seeds = new Float32Array(n);
    gidx = new Uint8Array(n);
    swapAt = new Float32Array(n);
    for (let i = 0; i < n; i++) { seeds[i] = Math.random(); gidx[i] = (Math.random() * GLYPHS.length) | 0; }
    buildAtlas();
    if (!running) draw(REDUCED ? 4000 : performance.now());
  }

  function pickIn([a, b]) { return a + ((Math.random() * (b - a)) | 0); }

  function draw(now) {
    const T = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sw = cw * dpr, sh = ch * dpr;

    // ease the pointer
    ptr.x += (ptr.tx - ptr.x) * 0.18;
    ptr.y += (ptr.ty - ptr.y) * 0.18;
    ptr.on += (ptr.target - ptr.on) * 0.08;
    const pc = ptr.x / cw, pr = ptr.y / ch;

    const packets = [0, 1, 2].map((k) => ((T * 0.075 + k / 3) % 1));
    const narrow = W < 700;
    // Phones: the portrait sits on top, so the carrier runs behind it and the
    // name and copy below stay clean.
    const base = narrow ? 0.17 : 0.58;

    for (let r = 0; r < rows; r++) {
      const y = (r + 0.5) / rows;
      for (let c = 0; c < cols; c++) {
        const x = (c + 0.5) / cols;
        const i = r * cols + c;
        // Desktop: keep the left (text) column clear so copy stays readable.
        const keep = narrow ? 1 : smooth(0.42, 0.64, x);
        if (keep <= 0) continue;

        const env = 0.65 + 0.35 * Math.sin(T * 0.21 + x * 2.4);
        const y1 = base + 0.15 * env * Math.sin(TAU * 1.05 * x - T * 0.55);
        const d1 = (y - y1) * rows;
        const i1 = Math.exp(-(d1 * d1) / 2.4);

        const y2 = base + 0.09 * Math.sin(TAU * 1.85 * x + T * 0.8 + 1.3);
        const d2 = (y - y2) * rows;
        const i2 = Math.exp(-(d2 * d2) / 1.3);

        let pk = 0;
        for (let k = 0; k < 3; k++) {
          const dx = (x - packets[k]) * cols;
          pk += Math.exp(-(dx * dx) / 22);
        }
        let I = Math.max(i1 * (0.3 + 0.95 * pk), i2 * 0.32);

        if (ptr.on > 0.01) {
          const dx = c - pc, dy = (r - pr) * 1.3;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ring = 0.5 + 0.5 * Math.sin(dist * 0.9 - T * 5);
          I = Math.max(I, ptr.on * Math.exp(-(dist * dist) / 70) * (0.25 + 0.6 * ring));
        }

        const s = seeds[i];
        const amb = s > 0.988 ? 0.3 * (0.5 + 0.5 * Math.sin(T * 1.6 + s * 400)) : 0.05 * s;
        if (amb > I) I = amb;
        I *= keep;
        if (I < 0.045) continue;

        const band = I < 0.2 ? LOW : I < 0.5 ? MID : HIGH;
        let g = gidx[i];
        if (g < band[0] || g >= band[1] || now > swapAt[i]) {
          g = gidx[i] = pickIn(band);
          swapAt[i] = now + 140 + Math.random() * (I > 0.5 ? 380 : 1200);
        }
        const hot = I > 0.52;
        ctx.globalAlpha = Math.min(1, hot ? I : I * 0.85);
        ctx.drawImage(atlas[hot ? 1 : 0], g * sw, 0, sw, sh, c * sw, r * sh, sw, sh);
      }
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    if (now - last < 33) return;
    last = now;
    draw(now);
  }
  function start() {
    if (running || REDUCED || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  const hero = canvas.parentElement;
  hero.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ptr.tx = e.clientX - r.left;
    ptr.ty = e.clientY - r.top;
    if (ptr.target === 0) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    ptr.target = e.pointerType === 'mouse' ? 1 : 0.7;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { ptr.target = 0; });

  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (W) { buildAtlas(); if (!running) draw(REDUCED ? 4000 : performance.now()); } });

  resize();
  start();
}
