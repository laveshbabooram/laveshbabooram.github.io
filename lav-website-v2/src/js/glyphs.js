/* ============================================================================
   Glyph decode. Text resolves out of a stream of random glyphs, left to
   right with a little jitter, like a signal locking on.

   Layout-safe: every character keeps its real glyph in the DOM and is only
   painted over (see .gc.scr in components.css), so nothing reflows, copy and
   paste works mid-animation, and screen readers always get the real text.
   ========================================================================= */
import { REDUCED } from './motion.js';

/* ASCII only: every one of these is in the self-hosted JetBrains Mono subset,
   so the scramble looks the same everywhere (block glyphs like ▓ fell back to
   a system font and rendered as heavy hatched boxes at headline sizes). */
export const GLYPHS = '<>/\\|{}[]=+*#%&$@01?!:;~^';
const pick = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

/* Wrap characters (recursing into child elements like <span class="accent">)
   in .gc spans, grouped per word so words never break mid-way. */
function split(el) {
  if (el._gc) return el._gc;
  const chars = [];
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span');
          w.className = 'gw';
          for (const ch of part) {
            const c = document.createElement('span');
            c.className = 'gc';
            c.textContent = ch;
            w.appendChild(c);
            chars.push(c);
          }
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1 && !child.classList.contains('gc') && !child.classList.contains('ico')) {
        walk(child);
      }
    });
  };
  walk(el);
  el._gc = chars;
  return chars;
}

/* Resets a split element so it can be re-split with new text. */
export function unsplit(el) { el._gc = null; }

export function decode(el, opts = {}) {
  if (!el) return Promise.resolve();
  if (REDUCED) { el.style.opacity = ''; return Promise.resolve(); }
  const chars = split(el);
  const n = chars.length;
  if (!n) return Promise.resolve();
  const duration = opts.duration || 900;
  const delay = opts.delay || 0;
  const jitter = opts.jitter !== undefined ? opts.jitter : 0.18;
  const tick = opts.tick || 42;                 // glyph change interval, ms

  if (el._decodeRaf) cancelAnimationFrame(el._decodeRaf);
  const reveal = chars.map((_, i) => delay + (i / Math.max(1, n - 1)) * duration * (1 - jitter) + Math.random() * duration * jitter);
  chars.forEach((c) => {
    if (/\S/.test(c.textContent)) { c.classList.add('scr'); c.dataset.g = pick(); }
  });
  if (opts.show !== false) el.style.opacity = '1';

  return new Promise((resolve) => {
    const t0 = performance.now();
    let last = 0;
    const frame = (now) => {
      const t = now - t0;
      const swap = now - last > tick;
      if (swap) last = now;
      let pending = 0;
      for (let i = 0; i < n; i++) {
        const c = chars[i];
        if (!c.classList.contains('scr')) continue;
        if (t >= reveal[i]) { c.classList.remove('scr'); continue; }
        pending++;
        if (swap && t >= reveal[i] - duration * 0.9) c.dataset.g = pick();
      }
      if (pending) el._decodeRaf = requestAnimationFrame(frame);
      else { el._decodeRaf = 0; resolve(); }
    };
    el._decodeRaf = requestAnimationFrame(frame);
  });
}

/* Quick scramble on hover / focus, for nav links. */
export function scrambleOnHover(target, trigger = target) {
  if (REDUCED) return;
  let busy = false;
  const run = () => {
    if (busy) return;
    busy = true;
    decode(target, { duration: 320, jitter: 0.3, tick: 30 }).then(() => { busy = false; });
  };
  trigger.addEventListener('pointerenter', run);
  trigger.addEventListener('focus', run);
}

/* Cycles the hero role line: each new role decodes in place. */
export function roleCycler(el, { interval = 3400, startDelay = 2600 } = {}) {
  let roles;
  try { roles = JSON.parse(el.dataset.roles || '[]'); } catch { roles = []; }
  if (roles.length < 2 || REDUCED) return;
  let i = 0;
  let timer = 0;
  const next = () => {
    i = (i + 1) % roles.length;
    unsplit(el);
    el.textContent = roles[i];
    decode(el, { duration: 620, jitter: 0.25 });
    timer = setTimeout(next, REDUCED ? interval * 2 : interval);
  };
  timer = setTimeout(next, startDelay);
  document.addEventListener('visibilitychange', () => {
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(next, interval);
  });
}
