/* ============================================================================
   Scroll entrances. Each [data-reveal-group] plays once, when it enters the
   viewport: its [data-reveal] children rise in with the damped stagger, and
   its [data-reveal-title] decodes out of glyphs.
   ========================================================================= */
import { timeline, rise } from './motion.js';
import { decode } from './glyphs.js';

function play(group) {
  const own = (el) => el.closest('[data-reveal-group]') === group;
  const items = [...group.querySelectorAll('[data-reveal]')].filter(own);
  const shown = items.filter((el) => el.offsetParent !== null);
  items.filter((el) => el.offsetParent === null).forEach((el) => { el.style.opacity = 1; });

  if (shown.length) timeline().add(...rise(shown, { stagger: 60 }), 0);

  const title = group.querySelector('[data-reveal-title]');
  if (title && own(title)) decode(title, { duration: 900 });
  group.querySelectorAll('.eyebrow [data-glyph]').forEach((el) => decode(el, { duration: 600, delay: 80, show: false }));
}

export function initReveals() {
  const groups = document.querySelectorAll('main [data-reveal-group]');
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('[data-reveal], [data-reveal-title]').forEach((el) => { el.style.opacity = 1; });
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      play(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  groups.forEach((g) => io.observe(g));
}
