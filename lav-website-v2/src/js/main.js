/* ============================================================================
   Entry point. The HTML arrives fully prerendered; this file only refreshes
   the date-dependent fragments, wires the interactions and plays the motion.
   ========================================================================= */
import { site } from '../data/site.js';
import { renderNowInner, renderLiveChip, nowKey } from '../render/page.js';
import { muYear } from '../render/time.js';
import { timeline, rise, countUp } from './motion.js';
import { decode, roleCycler } from './glyphs.js';
import { glyphField } from './field.js';
import { portraitGlyphs } from './portrait.js';
import { initTooltips } from './tooltip.js';
import { initCv } from './cv.js';
import { initReveals } from './reveal.js';
import { initNav, initCopy, initClock, initFilters, initShelf, initCards, initLogMore } from './ui.js';

/* The build may be days or weeks old: recompute anything that depends on
   today's date (course batch status, Now title, live chip, year). */
function refreshTimeBound(now) {
  const wrap = document.querySelector('[data-now]');
  const key = nowKey(site, now);
  if (wrap && wrap.dataset.now !== key) {
    wrap.innerHTML = renderNowInner(site, now);
    wrap.dataset.now = key;
  }
  const slot = document.querySelector('[data-live-slot]');
  if (slot) {
    const html = renderLiveChip(site, now);
    if (slot.dataset.key !== key) { slot.innerHTML = html; slot.dataset.key = key; }
  }
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = String(muYear(now)); });
}

function heroEntrance() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const items = hero.querySelectorAll('[data-hero]');
  timeline().add(...rise(items, { stagger: 70, y: 10 }), 60);
  hero.querySelectorAll('.hero-copy [data-glyph]').forEach((el, i) =>
    decode(el, { duration: 1000 + i * 140, delay: 120 + i * 90, show: false }));
  hero.querySelectorAll('[data-count]').forEach((el, i) =>
    countUp(el, Number(el.dataset.count), { delay: 520 + i * 80 }));

  glyphField(hero.querySelector('.glyph-field'));
  const fig = hero.querySelector('[data-portrait]');
  if (fig) portraitGlyphs(fig);
  const role = hero.querySelector('[data-roles]');
  if (role) roleCycler(role);
}

function boot() {
  window.__lavBooted = true;
  document.documentElement.classList.add('js');
  refreshTimeBound(new Date());

  initTooltips();
  initNav();
  initCopy();
  initClock();
  initCv(site);
  initFilters();
  initShelf();
  initCards();
  initLogMore();

  heroEntrance();
  initReveals();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
