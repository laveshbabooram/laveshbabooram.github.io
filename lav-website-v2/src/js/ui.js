/* ============================================================================
   Small interactions: nav, copy + toast, clock, filters, bookshelf, card
   spotlight, log expander. Each init is independent and safe to skip.
   ========================================================================= */
import { animate, dur, stagger, EASE, REDUCED } from './motion.js';
import { decode, unsplit, scrambleOnHover } from './glyphs.js';

/* ---- nav ------------------------------------------------------------------ */
export function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  const toggle = nav.querySelector('.nav-toggle');
  const sheet = document.getElementById('nav-sheet');
  const use = toggle.querySelector('use');

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { nav.classList.toggle('scrolled', window.scrollY > 8); ticking = false; });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setOpen = (open) => {
    sheet.hidden = !open;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    use.setAttribute('href', open ? '#i-x' : '#i-menu');
  };
  toggle.addEventListener('click', () => setOpen(sheet.hidden));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { setOpen(false); toggle.focus(); } });
  document.addEventListener('lav:close-sheet', () => setOpen(false));
  window.addEventListener('resize', () => { if (window.innerWidth > 1120 && !sheet.hidden) setOpen(false); });

  // Scrollspy: highlight the section that crosses the middle of the screen.
  const links = new Map([...nav.querySelectorAll('[data-spy]')].map((a) => [a.dataset.spy, a]));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a, id) => a.classList.toggle('active', id === en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  document.getElementById('top') && new IntersectionObserver(([en]) => {
    if (en.isIntersecting) links.forEach((a) => a.classList.remove('active'));
  }, { rootMargin: '-45% 0px -50% 0px' }).observe(document.getElementById('top'));

  nav.querySelectorAll('.nav-link').forEach((a) => scrambleOnHover(a.querySelector('[data-scramble]'), a));
}

/* ---- copy + toast ----------------------------------------------------------- */
let toastT = 0;
export function toast(msg) {
  const t = document.querySelector('.toast');
  if (!t) return;
  t.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-check-circle"/></svg>';
  t.append(document.createTextNode(msg));
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

export function initCopy() {
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const text = b.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      toast('Email copied');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      if (ok) toast('Email copied');
      else window.location.href = `mailto:${text}`;
    }
  });
}

/* ---- Mauritius clock ------------------------------------------------------- */
export function initClock() {
  const short = document.querySelectorAll('[data-clock]');
  const long = document.querySelectorAll('[data-clock-long]');
  if (!short.length && !long.length) return;
  let f;
  try { f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Indian/Mauritius', hour: '2-digit', minute: '2-digit' }); } catch { return; }
  const tick = () => {
    const t = f.format(new Date());
    short.forEach((el) => { el.textContent = `MU ${t}`; });
    long.forEach((el) => { el.textContent = `Mauritius · ${t}`; });
  };
  tick();
  setInterval(tick, 20000);
}

/* ---- filters ----------------------------------------------------------------- */
/* Stretch the cards of an incomplete last row so the project grid never ends
   with a hole (any filter, any breakpoint). Works off the live column count. */
function fillRows(grid) {
  const items = [...grid.children].filter((el) => !el.hidden);
  items.forEach((el) => { el.style.gridColumn = ''; });
  const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length;
  if (cols < 2) return;
  const spanOf = (el) => {
    const m = /span\s+(\d+)/.exec(getComputedStyle(el).gridColumnStart + ' ' + getComputedStyle(el).gridColumnEnd);
    return Math.min(cols, m ? +m[1] : 1);
  };
  let row = [];
  let used = 0;
  items.forEach((el) => {
    const s = spanOf(el);
    if (used + s > cols) { row = []; used = 0; }
    row.push([el, s]);
    used += s;
    if (used === cols) { row = []; used = 0; }
  });
  if (!row.length || used === cols) return;
  // Share the full width between the last row's cards, in proportion.
  let left = cols;
  row.forEach(([el, s], i) => {
    const n = i === row.length - 1 ? left : Math.max(s, Math.round((s / used) * cols));
    el.style.gridColumn = `span ${n}`;
    left -= n;
  });
}

export function initFilters() {
  const grid = document.getElementById('proj-grid');
  if (grid) {
    fillRows(grid);
    let t = 0;
    window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => fillRows(grid), 120); });
  }
  document.querySelectorAll('[data-filter-for]').forEach((group) => {
    const target = document.getElementById(group.dataset.filterFor);
    if (!target) return;
    const items = [...target.querySelectorAll(':scope > [data-kind]')];
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-filter]');
      if (!b || b.getAttribute('aria-pressed') === 'true') return;
      group.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const f = b.dataset.filter;
      items.forEach((it) => { it.hidden = !(f === 'all' || it.dataset.kind === f); });
      if (target === grid) fillRows(grid);
      const vis = items.filter((it) => !it.hidden);
      animate(vis, { opacity: [0, 1], translateY: [6, 0], duration: dur(460), delay: stagger(40, vis), ease: EASE });
    });
  });
}

/* ---- bookshelf ------------------------------------------------------------- */
export function initShelf() {
  const shelf = document.querySelector('.shelf');
  if (!shelf) return;
  const books = [...shelf.querySelectorAll('.book')];
  const q = (k) => document.querySelector(`[data-insp="${k}"]`);
  const insp = { type: q('type'), pub: q('pub'), date: q('date'), title: q('title'), desc: q('desc'), link: q('link'), host: q('host') };
  const fine = window.matchMedia('(pointer: fine)').matches;

  function select(book) {
    if (book.classList.contains('active')) return;
    books.forEach((b) => { const on = b === book; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    const d = book.dataset;
    insp.type.textContent = d.type;
    insp.pub.textContent = d.pub;
    insp.date.textContent = d.date;
    insp.desc.textContent = d.desc;
    insp.link.hidden = !d.link;                 // e.g. a chapter not online yet
    if (d.link) insp.link.href = d.link;
    insp.host.textContent = `Read on ${d.host}`;
    unsplit(insp.title);
    insp.title.textContent = d.title;
    decode(insp.title, { duration: 520, jitter: 0.3, tick: 34 });
    animate(insp.desc, { opacity: [0, 1], translateY: [4, 0], duration: dur(420), ease: EASE });
  }

  let hoverT = 0;
  books.forEach((book, i) => {
    book.addEventListener('click', () => select(book));
    if (fine) book.addEventListener('pointerenter', () => { clearTimeout(hoverT); hoverT = setTimeout(() => select(book), 160); });
    book.addEventListener('pointerleave', () => clearTimeout(hoverT));
    book.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = books[(i + dir + books.length) % books.length];
      next.focus();
      select(next);
    });

    if (!fine || REDUCED) return;
    const model = book.querySelector('.book-3d');
    book.addEventListener('pointermove', (e) => {
      const r = model.getBoundingClientRect();
      const px = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
      const py = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
      book.classList.add('tilting');
      model.style.setProperty('--ry', `${(px * 18).toFixed(2)}deg`);
      model.style.setProperty('--rx', `${(-py * 12).toFixed(2)}deg`);
      model.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
      model.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
    });
    book.addEventListener('pointerleave', () => {
      book.classList.remove('tilting');
      ['--ry', '--rx', '--gx', '--gy'].forEach((p) => model.style.removeProperty(p));
    });
  });
}

/* ---- card spotlight --------------------------------------------------------- */
export function initCards() {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.proj-grid').forEach((grid) => {
    grid.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  });
}

/* ---- log expander (delegated: the Now section can be re-rendered) ---------- */
export function initLogMore() {
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-log-more]');
    if (!b) return;
    const list = b.closest('.log').querySelectorAll('[data-more]');
    const open = b.getAttribute('aria-expanded') !== 'true';
    list.forEach((li) => { li.hidden = !open; });
    b.setAttribute('aria-expanded', String(open));
    b.firstChild.textContent = open ? 'Show fewer' : `Show all ${b.closest('.log').querySelectorAll('.log-item').length}`;
    if (open) animate([...list], { opacity: [0, 1], translateY: [6, 0], duration: dur(420), delay: stagger(30, list), ease: EASE });
  });
}
