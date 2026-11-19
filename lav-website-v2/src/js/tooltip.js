/* ============================================================================
   Tooltips for anything with [data-tip].
   Mouse: hover (short intent delay). Keyboard: focus. Touch: tap toggles on
   info-only elements; actionable ones (links, copy) keep their action.
   Positioned above, flipped below near the top edge, clamped to the viewport.
   ========================================================================= */

const INFO_ONLY = '.info, .cred, .status, .modules li, button.badge';

export function initTooltips() {
  const tip = document.getElementById('tip');
  if (!tip) return;
  let current = null;
  let showT = 0, hideT = 0;

  function place(el) {
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
    tip.style.left = '0px';
    tip.style.top = '0px';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let side = 'top';
    let top = r.top - th - 10;
    if (top < navH + 8) { side = 'bottom'; top = r.bottom + 10; }
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(vw - tw - 8, left));
    tip.dataset.side = side;
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
    tip.style.setProperty('--ax', `${Math.round(Math.max(12, Math.min(tw - 12, r.left + r.width / 2 - left)))}px`);
  }

  function show(el) {
    clearTimeout(hideT);
    const text = el.dataset.tip;
    if (!text) return;
    if (current && current !== el) current.removeAttribute('aria-describedby');
    current = el;
    tip.textContent = text;
    tip.hidden = false;
    place(el);
    el.setAttribute('aria-describedby', 'tip');
    requestAnimationFrame(() => tip.classList.add('show'));
  }

  function hide() {
    clearTimeout(showT);
    if (!current) return;
    current.removeAttribute('aria-describedby');
    current = null;
    tip.classList.remove('show');
    hideT = setTimeout(() => { if (!current) tip.hidden = true; }, 180);
  }

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('[data-tip]');
    if (!el || el === current) return;
    clearTimeout(showT);
    showT = setTimeout(() => show(el), current ? 0 : 140);
  });
  document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    if (e.relatedTarget && el.contains(e.relatedTarget)) return;
    clearTimeout(showT);
    if (el === current) hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && e.target.matches(':focus-visible')) show(el);
  });
  document.addEventListener('focusout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (el && el === current) hide();
  });
  document.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest(INFO_ONLY);
    if (el && el.dataset.tip) {
      if (current === el) hide(); else show(el);
    } else if (!e.target.closest('[data-tip]')) {
      hide();
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', () => { if (current) hide(); }, { passive: true });
  window.addEventListener('resize', hide);
}
