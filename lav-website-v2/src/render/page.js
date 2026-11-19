/* ============================================================================
   Page renderer: data -> HTML strings.

   Runs at BUILD time (vite.config.js prerenders the whole page, so the HTML
   is complete without JavaScript, for crawlers and link previews) and in the
   BROWSER for the few fragments that depend on today's date (the Now section,
   the live chip, the year), so those can never go stale.
   ========================================================================= */
import { icon, sprite } from './icons.js';
import { batchesWithStatus, liveItem, feed, label, muYear } from './time.js';

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ext = 'target="_blank" rel="noopener"';

/* <picture> with AVIF first, WebP fallback. Every image has intrinsic
   dimensions so nothing shifts while it loads. */
function pic(name, w, h, alt, { eager = false, cls = '' } = {}) {
  const load = eager ? 'fetchpriority="high"' : 'loading="lazy"';
  return `<picture${cls ? ` class="${cls}"` : ''}>` +
    `<source type="image/avif" srcset="/img/${name}.avif">` +
    `<img src="/img/${name}.webp" width="${w}" height="${h}" alt="${esc(alt)}" ${load} decoding="async">` +
    `</picture>`;
}

const tipBtn = (tip, what) =>
  `<button type="button" class="info" data-tip="${esc(tip)}" aria-label="About ${esc(what)}">${icon('info')}</button>`;

/* Deterministic pseudo-random, so the prerendered visuals are identical on
   every build and the diff stays clean. */
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

const KIND = {
  production: { label: 'In production', tone: 'good', origin: 'Mauritius Telecom', tip: 'Designed and built at Mauritius Telecom. Runs every day inside its network operations, so it’s described here, not linked.' },
  personal: { label: 'Live', tone: 'good', origin: 'Personal project', tip: 'My own project, live on the public internet.' },
  research: { label: 'Research', tone: 'info', origin: 'MSc · University of Mauritius', tip: 'Academic research, mostly for my MSc at the University of Mauritius. Findings went into papers and the thesis.' },
  teaching: { label: 'Teaching', tone: 'info', origin: '', tip: 'Education and training work.' },
};

const PATH_KIND = {
  work: { label: 'Work', icon: 'briefcase' },
  study: { label: 'Study', icon: 'cap' },
  milestone: { label: 'Milestone', icon: 'flag' },
};

/* ---------------------------------------------------------------------------
   <head>
   ------------------------------------------------------------------------ */
export function renderHead(site) {
  const m = site.meta;
  const p = site.person;
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: `${p.first} ${p.last}`,
    url: m.url,
    image: m.url + 'img/portrait.webp',
    jobTitle: 'Network Engineer',
    worksFor: { '@type': 'Organization', name: 'Mauritius Telecom' },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Mauritius' },
    address: { '@type': 'PostalAddress', addressCountry: 'MU' },
    sameAs: [p.links.linkedin, p.links.orcid],
    knowsAbout: ['Telecommunications', 'QoS', 'QoE', 'Network automation', 'Machine learning', 'Generative AI'],
  };
  return `
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(m.title)}</title>
<meta name="description" content="${esc(m.description)}">
<link rel="canonical" href="${m.url}">
<meta name="theme-color" content="${m.themeColor}">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="profile">
<meta property="og:url" content="${m.url}">
<meta property="og:title" content="${esc(`${p.first} ${p.last}`)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:image" content="${m.url}og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="profile:first_name" content="${esc(p.first)}">
<meta property="profile:last_name" content="${esc(p.last)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/space-grotesk-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/onest-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/img/portrait.avif" as="image" type="image/avif">
<script>${BOOT_SCRIPT}</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>`;
}

/* Marks the page as JS-capable so entrance states apply, and undoes that if
   the app has not booted within 4s, so a script failure never hides content. */
export const BOOT_SCRIPT =
  "document.documentElement.classList.add('js');setTimeout(function(){if(!window.__lavBooted)document.documentElement.classList.remove('js')},4000)";

/* ---------------------------------------------------------------------------
   Nav
   ------------------------------------------------------------------------ */
const SECTIONS = [
  ['now', 'Now'], ['built', 'Built'], ['research', 'Research'], ['path', 'Path'], ['toolkit', 'Toolkit'], ['contact', 'Contact'],
];

export function renderLiveChip(site, now) {
  const live = liveItem(site, now);
  if (!live) return '';
  const tone = live.kind === 'running' ? 'live' : 'soon';
  return `<a class="live-chip ${tone}" href="#now" data-tip="${esc(site.course.title)}: ${esc(live.batch.when)}">` +
    `<span class="pulse" aria-hidden="true"></span><span class="lc-text">${esc(live.text)}</span>` +
    `<span class="lc-sub">${esc(live.sub)}</span></a>`;
}

function renderNav(site, now) {
  const links = SECTIONS.map(([id, txt]) =>
    `<a href="#${id}" class="nav-link" data-spy="${id}"><span data-scramble>${txt}</span></a>`).join('');
  return `
<header class="nav" id="nav">
  <div class="wrap nav-in">
    <a class="brand" href="#top" aria-label="${esc(site.person.first)} ${esc(site.person.last)}, back to top">
      <span class="brand-mark">LB</span><span class="brand-dot">.</span>
    </a>
    <nav class="nav-links" aria-label="Sections">${links}</nav>
    <div class="nav-right">
      <span data-live-slot>${renderLiveChip(site, now)}</span>
      <button type="button" class="btn btn-primary btn-sm nav-cv" data-cv-open>${icon('file-text')}<span>Request CV</span></button>
      <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="nav-sheet" aria-label="Open menu">${icon('menu')}</button>
    </div>
  </div>
  <div class="nav-sheet" id="nav-sheet" hidden>
    <nav class="wrap sheet-in" aria-label="Sections">
      ${SECTIONS.map(([id, txt], i) => `<a href="#${id}" class="sheet-link"><span class="mono">0${i + 1}</span>${txt}</a>`).join('')}
      <button type="button" class="btn btn-primary" data-cv-open>${icon('file-text')}<span>Request CV</span></button>
    </nav>
  </div>
</header>`;
}

/* ---------------------------------------------------------------------------
   Hero
   ------------------------------------------------------------------------ */
function renderHero(site) {
  const p = site.person;
  const books = site.books.filter((b) => b.type === 'Book').length;
  const chapters = site.books.filter((b) => b.type === 'Chapter').length;
  const stats = [
    { label: 'Books', value: books, note: 'Apress (Springer) and Nova Science', icon: 'book' },
    { label: 'Book chapters', value: chapters, note: 'Taylor & Francis and Emerald', icon: 'layers' },
    { label: 'Papers', value: site.papers.length, note: 'Journals and IEEE conferences', icon: 'file-text' },
    { label: 'ICQCC 2024', text: 'Gold', note: 'Team award, AI service monitoring', icon: 'award' },
  ];
  return `
<section class="hero" id="top" aria-label="Introduction">
  <canvas class="glyph-field" aria-hidden="true"></canvas>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <div class="eyebrow" data-hero>${icon('map-pin')}<span data-glyph>${esc(p.location)} · Telecom × AI</span></div>
      <h1 class="hero-name" data-hero><span data-glyph>${esc(p.first)}</span> <span class="accent" data-glyph>${esc(p.last)}</span></h1>
      <p class="hero-role" data-hero><span class="prompt" aria-hidden="true">&gt;</span><span class="role-text" data-roles="${esc(JSON.stringify(p.roles))}">${esc(p.roles[0])}</span><span class="caret" aria-hidden="true"></span></p>
      <p class="hero-pitch" data-hero>${esc(p.pitch)}</p>
      <ul class="creds" data-hero aria-label="Credentials">
        ${p.credentials.map((c) => `<li><button type="button" class="cred" data-tip="${esc(c.tip)}">${esc(c.label)}${icon('info')}</button></li>`).join('')}
      </ul>
      <div class="hero-actions" data-hero>
        <button type="button" class="btn btn-primary" data-cv-open>${icon('file-text')}<span>Request CV</span></button>
        <button type="button" class="btn btn-ghost copy-btn" data-copy="${esc(p.email)}" data-tip="Copy address">${icon('mail')}<span class="copy-label">${esc(p.email)}</span>${icon('copy', 'copy-ico')}</button>
        <a class="btn btn-icon" href="${p.links.linkedin}" ${ext} aria-label="LinkedIn profile" data-tip="LinkedIn">${icon('linkedin')}</a>
        <a class="btn btn-icon" href="${p.links.orcid}" ${ext} aria-label="ORCID profile" data-tip="ORCID: publications record">${icon('orcid')}</a>
      </div>
    </div>
    <div class="hero-visual" data-hero>
      <figure class="portrait" data-portrait>
        ${pic('portrait', 640, 639, `${p.first} ${p.last}`, { eager: true, cls: 'portrait-pic' })}
        <canvas class="portrait-glyphs" aria-hidden="true"></canvas>
        <span class="corner tl" aria-hidden="true"></span><span class="corner tr" aria-hidden="true"></span>
        <span class="corner bl" aria-hidden="true"></span><span class="corner br" aria-hidden="true"></span>
        <figcaption class="portrait-cap"><span>${esc(p.coords)}</span><span data-clock>UTC+4</span></figcaption>
      </figure>
    </div>
  </div>
  <div class="wrap">
    <dl class="stats">
      ${stats.map((s) => `
      <div class="kpi" data-hero>
        <dt class="kpi-top"><span class="kpi-label">${esc(s.label)}</span>${icon(s.icon)}</dt>
        <dd class="kpi-value"${s.value !== undefined ? ` data-count="${s.value}"` : ''}>${s.value !== undefined ? s.value : esc(s.text)}</dd>
        <dd class="kpi-note">${esc(s.note)}</dd>
      </div>`).join('')}
    </dl>
  </div>
  <a class="scroll-cue" href="#now" aria-label="Scroll to what’s happening now"><span>scroll</span>${icon('chevron-down')}</a>
</section>`;
}

/* ---------------------------------------------------------------------------
   Section heading
   ------------------------------------------------------------------------ */
function head(n, eyebrow, title, sub, id) {
  return `
  <header class="sec-head" data-reveal-group>
    <div class="eyebrow" data-reveal><span class="eb-num">${n}</span><span data-glyph>${esc(eyebrow)}</span></div>
    <h2 class="sec-title" id="${id}-title" data-glyph data-reveal-title>${esc(title)}</h2>
    ${sub ? `<p class="sec-sub" data-reveal>${esc(sub)}</p>` : ''}
  </header>`;
}

/* ---------------------------------------------------------------------------
   01 Now: everything here depends on today's date.
   ------------------------------------------------------------------------ */
export function renderNowInner(site, now) {
  const c = site.course;
  const batches = batchesWithStatus(c, now);
  const live = liveItem(site, now);
  const title = live && live.kind === 'running'
    ? `${live.batch.name} of the GenAI course is running`
    : live ? `${live.batch.name} of the GenAI course is next` : 'Latest from the log';
  const sub = 'A dated log of what I’m teaching, shipping and publishing. Course status updates itself from the session dates.';

  const STATUS = {
    completed: { word: 'Completed', icon: 'check' },
    running: { word: 'Running now', icon: null },
    upcoming: { word: 'Upcoming', icon: 'clock' },
  };

  const steps = batches.map((b) => `
        <li class="step ${b.status}">
          <span class="step-node" aria-hidden="true">${STATUS[b.status].icon ? icon(STATUS[b.status].icon) : '<span class="pulse"></span>'}</span>
          <span class="step-name">${esc(b.name)}</span>
          <span class="step-status">${STATUS[b.status].word}</span>
          <span class="step-when">${esc(b.when)}</span>
        </li>`).join('');

  const items = feed(site, now);
  const SHOW = 6;
  const log = items.map((u, i) => `
        <li class="log-item${u.live ? ' is-live' : ''}"${i >= SHOW ? ' data-more hidden' : ''}>
          <span class="log-when">${esc(u.when)}</span>
          <span class="log-tag">${u.live ? '<span class="pulse" aria-hidden="true"></span>' : ''}${esc(u.tag)}</span>
          <span class="log-text">${u.link ? `<a href="${u.link}" ${ext}>${esc(u.text)}${icon('arrow-up-right')}</a>` : esc(u.text)}</span>
        </li>`).join('');

  return `
  ${head('01', 'Now', title, sub, 'now')}
  <div class="now-grid" data-reveal-group>
    <article class="panel course" data-reveal>
      <div class="course-top">
        <span class="badge">${icon('cap')}${esc(c.org)} · Short course</span>
        ${c.hrdc ? `<button type="button" class="badge badge-accent" data-tip="HRDC (Human Resource Development Council): eligible employers can claim back part of the training cost.">HRDC refund eligible ${icon('info')}</button>` : ''}
      </div>
      <h3 class="course-title">${esc(c.title)}</h3>
      <ul class="course-meta">
        <li>${icon('clock')}${esc(c.format)}</li>
        <li>${icon('map-pin')}${esc(c.venue)}</li>
        <li>${icon('users')}${esc(c.trainers)}</li>
      </ul>
      <ol class="tracker" aria-label="Course batches">${steps}
      </ol>
      <ul class="modules">
        ${c.modules.map((m) => `<li data-tip="${esc(m.text)}" tabindex="0">${icon(m.icon)}<span>${esc(m.title)}</span></li>`).join('')}
      </ul>
      <div class="course-actions">
        <a class="btn btn-primary" href="${c.link}" ${ext}>Course details${icon('arrow-up-right')}</a>
        <a class="btn btn-ghost" href="mailto:${site.person.email}?subject=${encodeURIComponent('Next batch: ' + c.title)}">${icon('mail')}Ask about the next batch</a>
      </div>
    </article>
    <aside class="panel log" data-reveal aria-labelledby="log-title">
      <div class="panel-head">${icon('activity')}<h3 id="log-title">Log</h3><span class="count">${items.length} entries</span></div>
      <ol class="log-list">${log}
      </ol>
      ${items.length > SHOW ? `<button type="button" class="link-btn" data-log-more aria-expanded="false">Show all ${items.length}${icon('chevron-down')}</button>` : ''}
    </aside>
  </div>`;
}

/* Everything in Now depends only on the batch statuses, so this key tells the
   browser whether the prerendered section is still current. */
export const nowKey = (site, now) => batchesWithStatus(site.course, now).map((b) => b.status).join(',');

function renderNow(site, now) {
  return `
<section class="section" id="now" aria-labelledby="now-title">
  <div class="wrap" data-now="${nowKey(site, now)}">${renderNowInner(site, now)}
  </div>
</section>`;
}

/* ---------------------------------------------------------------------------
   02 Built
   ------------------------------------------------------------------------ */
function latencyVisual() {
  const r = rng(7);
  const N = 64, W = 320, H = 96, max = 100;
  const vals = Array.from({ length: N }, (_, i) => {
    let v = 33 + (r() - 0.5) * 9;
    if (i >= 40 && i <= 51) v += 46 * Math.sin(((i - 40) / 11) * Math.PI);
    return v;
  });
  const x = (i) => (i / (N - 1)) * W;
  const y = (v) => H - (v / max) * H;
  const line = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  const dev = vals.slice(40, 52).map((v, k) => `${k ? 'L' : 'M'}${x(40 + k).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const thr = y(60).toFixed(1);
  return `
      <div class="viz viz-latency" aria-hidden="true">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <line class="viz-thr" x1="0" x2="${W}" y1="${thr}" y2="${thr}" vector-effect="non-scaling-stroke"/>
          <path class="viz-area" d="${area}"/>
          <path class="viz-line" d="${line}" vector-effect="non-scaling-stroke"/>
          <path class="viz-dev" d="${dev}" vector-effect="non-scaling-stroke"/>
        </svg>
        <div class="viz-legend"><span><i class="sw sw-line"></i>latency</span><span><i class="sw sw-thr"></i>threshold</span><span><i class="sw sw-dev"></i>deviation → alert</span></div>
      </div>`;
}

function streamsVisual() {
  const r = rng(11);
  const cols = 8, rows = 3, cw = 36, ch = 22, gap = 4;
  const W = cols * cw + (cols - 1) * gap, H = rows * ch + (rows - 1) * gap;
  let tiles = '';
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const warn = k === 13;
      const x = i * (cw + gap), y = j * (ch + gap);
      const bars = [0, 1, 2, 3].map((b) => {
        const h = warn ? 3 + r() * 3 : 6 + r() * 10;
        return `<rect class="bar" x="${x + 6 + b * 6}" y="${(y + ch - 4 - h).toFixed(1)}" width="3.5" height="${h.toFixed(1)}" rx="1"/>`;
      }).join('');
      tiles += `<g class="tile${warn ? ' warn' : ''}"><rect class="tile-bg" x="${x}" y="${y}" width="${cw}" height="${ch}" rx="4"/>${bars}<circle class="tile-dot" cx="${x + cw - 6}" cy="${y + 6}" r="2"/></g>`;
    }
  }
  return `
      <div class="viz viz-streams" aria-hidden="true">
        <svg viewBox="0 0 ${W} ${H}">${tiles}</svg>
        <div class="viz-legend"><span><i class="sw sw-ok"></i>stream healthy</span><span><i class="sw sw-dev"></i>start-up slow</span></div>
      </div>`;
}

function renderProject(p) {
  const k = KIND[p.kind];
  const cls = ['card', 'proj', `proj-${p.id}`];
  if (p.featured) cls.push('featured');
  if (p.image) cls.push('has-image');
  const visual = p.visual === 'latency' ? latencyVisual() : p.visual === 'streams' ? streamsVisual() : '';
  const origin = p.origin ?? k.origin;
  return `
    <article class="${cls.join(' ')}" data-kind="${p.kind}" data-reveal>
      <div class="proj-body">
        <div class="proj-top">
          <span class="ico-box">${icon(p.icon)}</span>
          <span class="status t-${k.tone}" data-tip="${esc(k.tip)}" tabindex="0"><span class="status-dot" aria-hidden="true"></span>${k.label}</span>
          ${p.award ? `<span class="status t-accent">${icon('award')}${esc(p.award)}</span>` : ''}
          ${p.years ? `<span class="proj-years">${esc(p.years)}</span>` : ''}
        </div>
        ${origin ? `<p class="proj-origin">${esc(origin)}</p>` : ''}
        <h3 class="proj-name">${esc(p.name)}</h3>
        <p class="proj-kicker">${esc(p.kicker)}</p>
        <p class="proj-sum">${esc(p.summary)}</p>
        ${p.points ? `<ul class="ticks">${p.points.map((t) => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('')}</ul>` : ''}
        ${visual}
        <ul class="tags">${p.stack.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        ${p.link ? `<a class="btn btn-primary proj-link" href="${p.link}" ${ext}>${esc(p.linkLabel || 'Visit')}${icon('arrow-up-right')}</a>` : ''}
      </div>
      ${p.image ? `<div class="proj-shot">${pic(p.image.src, p.image.w, p.image.h, p.image.alt)}</div>` : ''}
    </article>`;
}

function renderBuilt(site) {
  const counts = Object.fromEntries(site.projectFilters.map((f) =>
    [f.id, f.id === 'all' ? site.projects.length : site.projects.filter((p) => p.kind === f.id).length]));
  return `
<section class="section" id="built" aria-labelledby="built-title">
  <div class="wrap">
    ${head('02', 'Built', 'Platforms in production, research and my own builds', 'A few platforms I built that actually made it to production, instead of becoming just another idea in the drawer. Plus the research and side projects around them.', 'built')}
    <div class="filters" role="group" aria-label="Filter projects" data-filter-for="proj-grid" data-reveal-group>
      ${site.projectFilters.map((f, i) => `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="${i === 0}" data-reveal>${esc(f.label)}<span class="chip-n">${counts[f.id]}</span></button>`).join('')}
    </div>
    <div class="proj-grid" id="proj-grid" data-reveal-group>
      ${site.projects.map(renderProject).join('')}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------------------
   03 Research
   ------------------------------------------------------------------------ */

/* Typeset cover for a book without a cover image: publisher, title and an
   orbit motif (the one current user is the 6G non-terrestrial chapter). */
function genCover(b) {
  return `<span class="book-cover gen-cover" role="img" aria-label="Cover of ${esc(b.title)}">
              <span class="gen-pub">${esc(b.coverPub || b.pub)}</span>
              <svg class="gen-orbit" viewBox="0 0 100 60" aria-hidden="true"><ellipse cx="50" cy="34" rx="44" ry="13"/><ellipse cx="50" cy="34" rx="30" ry="8"/><circle class="gen-sat" cx="86" cy="27" r="2.6"/><path class="gen-earth" d="M8 60 A 60 26 0 0 1 92 60"/></svg>
              <span class="gen-title">${esc(b.title)}</span>
            </span>`;
}

function renderResearch(site) {
  const nBooks = site.books.filter((b) => b.type === 'Book').length;
  const nCh = site.books.filter((b) => b.type === 'Chapter').length;
  const first = site.books[0];
  const books = site.books.map((b, i) => `
        <button type="button" class="book${i === 0 ? ' active' : ''}" aria-pressed="${i === 0}"
          data-title="${esc(b.title)}" data-type="${esc(b.type)}" data-pub="${esc(b.pub)}" data-date="${esc(label(b.date))}"
          data-desc="${esc(b.desc)}" data-link="${esc(b.link)}" data-host="${esc(b.host)}">
          <span class="book-3d">
            ${b.cover ? pic(b.cover, 300, 450, `Cover of ${b.title}`, { cls: 'book-cover' }) : genCover(b)}
            <span class="book-glare" aria-hidden="true"></span>
          </span>
          <span class="book-cap"><span class="book-type">${esc(b.type)}</span><span class="book-short">${esc(b.short)}</span></span>
        </button>`).join('');

  const papers = site.papers.map((p) => `
        <li class="paper">
          <a href="${p.link}" ${ext}>
            <span class="paper-meta"><span class="paper-year">${esc(label(p.date))}</span><span class="paper-kind">${esc(p.kind)}</span><span class="paper-venue">${esc(p.venue)}</span></span>
            <span class="paper-title">${esc(p.title)}</span>
            ${p.tags ? `<span class="paper-tags">${p.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</span>` : ''}
            ${icon('arrow-up-right', 'paper-go')}
          </a>
        </li>`).join('');

  return `
<section class="section" id="research" aria-labelledby="research-title">
  <div class="wrap">
    ${head('03', 'Research', `${nBooks} books, ${nCh} chapters, ${site.papers.length} papers`, 'On machine learning for networks, video quality, 5G, 6G and non-terrestrial networks, and AI for the UN goals. Pick a cover.', 'research')}
    <div class="research-grid" data-reveal-group>
      <div class="panel shelf-panel" data-reveal>
        <div class="shelf" role="group" aria-label="Books and chapters">${books}
        </div>
        <div class="inspector" aria-live="polite">
          <div class="insp-meta"><span class="badge badge-accent" data-insp="type">${esc(first.type)}</span><span data-insp="pub">${esc(first.pub)}</span><span class="insp-date" data-insp="date">${esc(label(first.date))}</span></div>
          <h3 class="insp-title" data-insp="title">${esc(first.title)}</h3>
          <p class="insp-desc" data-insp="desc">${esc(first.desc)}</p>
          <a class="btn btn-ghost insp-link" data-insp="link" href="${first.link || '#research'}" ${ext}${first.link ? '' : ' hidden'}><span data-insp="host">Read on ${esc(first.host)}</span>${icon('arrow-up-right')}</a>
        </div>
      </div>
      <div class="panel papers" data-reveal>
        <div class="panel-head">${icon('file-text')}<h3>Papers</h3><span class="count">${site.papers.length}</span></div>
        <ol class="paper-list">${papers}
        </ol>
        <a class="link-btn" href="${site.person.links.orcid}" ${ext}>Full record on ORCID${icon('arrow-up-right')}</a>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------------------
   04 Path
   ------------------------------------------------------------------------ */
function renderPath(site) {
  const items = site.path.map((p) => {
    const k = PATH_KIND[p.kind];
    return `
      <li class="tl-item k-${p.kind}" data-kind="${p.kind}" data-reveal-group>
        <span class="tl-node" aria-hidden="true" data-reveal>${icon(k.icon)}</span>
        <div class="tl-card" data-reveal>
          <div class="tl-text">
            <div class="tl-top"><span class="tl-when">${esc(p.when)}</span><span class="tl-kind">${k.label}</span></div>
            <h3 class="tl-title">${esc(p.title)}</h3>
            <p class="tl-org">${esc(p.org)}</p>
            ${p.text ? `<p class="tl-desc">${esc(p.text)}</p>` : ''}
            ${p.points ? `<ul class="tl-points">${p.points.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          </div>
          ${p.image ? `<div class="tl-media">${pic(p.image.src, p.image.w, p.image.h, p.image.alt)}</div>` : ''}
        </div>
      </li>`;
  }).join('');
  return `
<section class="section" id="path" aria-labelledby="path-title">
  <div class="wrap">
    ${head('04', 'Path', 'From taking computers apart to autonomous networks', 'Work, study and the milestones in between, newest first.', 'path')}
    <div class="path-grid">
      <aside class="path-aside" data-reveal-group>
        <div class="filters filters-col" role="group" aria-label="Filter timeline" data-filter-for="timeline">
          ${site.pathFilters.map((f, i) => `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="${i === 0}" data-reveal>${esc(f.label)}<span class="chip-n">${f.id === 'all' ? site.path.length : site.path.filter((p) => p.kind === f.id).length}</span></button>`).join('')}
        </div>
        <ul class="glance" data-reveal>
          ${site.pathGlance.map((g) => `<li>${icon(g.icon)}<span><b>${esc(g.k)}</b>${esc(g.v)}</span></li>`).join('')}
        </ul>
      </aside>
      <ol class="timeline" id="timeline">${items}
      </ol>
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------------------
   05 Toolkit
   ------------------------------------------------------------------------ */
function renderToolkit(site) {
  return `
<section class="section" id="toolkit" aria-labelledby="toolkit-title">
  <div class="wrap">
    ${head('05', 'Toolkit', 'What I reach for', 'Telecom underneath, software on top, AI where it earns its place.', 'toolkit')}
    <div class="toolkit" data-reveal-group>
      ${site.toolkit.map((g) => `
      <div class="panel tk" data-reveal>
        <div class="panel-head">${icon(g.icon)}<h3>${esc(g.group)}</h3><span class="count">${g.items.length}</span></div>
        <ul class="tags">${g.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>`).join('')}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------------------
   06 Contact
   ------------------------------------------------------------------------ */
function renderContact(site) {
  const p = site.person;
  return `
<section class="section contact" id="contact" aria-labelledby="contact-title">
  <div class="wrap">
    ${head('06', 'Contact', 'Got a network, a process or a product that should run itself?', 'Consulting, custom builds, training or research collaboration. Tell me what you’re trying to fix.', 'contact')}
    <div class="contact-grid" data-reveal-group>
      <div class="services">
        ${site.services.map((s, i) => `
        <div class="svc" data-reveal>
          <span class="svc-n">0${i + 1}</span>
          <span class="ico-box">${icon(s.icon)}</span>
          <div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>
        </div>`).join('')}
      </div>
      <div class="panel reach" data-reveal>
        <div class="panel-head">${icon('send')}<h3>Reach me</h3><span class="count" data-clock-long>Mauritius · UTC+4</span></div>
        <button type="button" class="reach-row" data-copy="${esc(p.email)}">
          <span class="reach-ico">${icon('mail')}</span>
          <span class="reach-main"><span class="reach-k">Email</span><span class="reach-v">${esc(p.email)}</span></span>
          <span class="reach-act">${icon('copy')}<span>Copy</span></span>
        </button>
        <a class="reach-row" href="${p.links.linkedin}" ${ext}>
          <span class="reach-ico">${icon('linkedin')}</span>
          <span class="reach-main"><span class="reach-k">LinkedIn</span><span class="reach-v">in/lavesh-babooram</span></span>
          <span class="reach-act">${icon('arrow-up-right')}</span>
        </a>
        <a class="reach-row" href="${p.links.orcid}" ${ext}>
          <span class="reach-ico">${icon('orcid')}</span>
          <span class="reach-main"><span class="reach-k">ORCID</span><span class="reach-v">0000-0001-6403-3395</span></span>
          <span class="reach-act">${icon('arrow-up-right')}</span>
        </a>
        <div class="reach-cv">
          <div>
            <p class="reach-cv-t">${icon('lock')}CV on request</p>
            <p class="reach-cv-s">Tell me who you are and I’ll send it straight to your inbox.</p>
          </div>
          <button type="button" class="btn btn-primary" data-cv-open>Request CV${icon('arrow-right')}</button>
        </div>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------------------
   Footer, CV dialog, tooltip and toast hosts
   ------------------------------------------------------------------------ */
function renderFooter(site, now) {
  return `
<footer class="footer">
  <div class="wrap foot-in">
    <div class="foot-brand"><span class="brand-mark">LB</span><span class="brand-dot">.</span></div>
    <p class="foot-quote">“${esc(site.quote)}”</p>
    <div class="foot-meta">
      <span>© <span data-year>${muYear(now)}</span> ${esc(site.person.first)} ${esc(site.person.last)}</span>
      <a href="#top" class="link-btn">Back to top${icon('arrow-up')}</a>
    </div>
  </div>
</footer>`;
}

function renderCvDialog(site) {
  const reasons = ['Hiring / recruiting', 'Collaboration or research', 'Client project', 'Training enquiry', 'Other'];
  return `
<dialog class="dialog" id="cv-dialog" aria-labelledby="cv-title">
  <div class="dlg-in">
    <button type="button" class="dlg-x" data-cv-close aria-label="Close">${icon('x')}</button>
    <div class="dlg-view" data-view="form">
      <div class="eyebrow">${icon('lock')}<span>CV on request</span></div>
      <h2 class="dlg-title" id="cv-title">Request my CV</h2>
      <p class="dlg-sub">I share it with people, not crawlers. Tell me who you are and it lands in your inbox, usually within a working day.</p>
      <form class="cv-form" novalidate>
        <div class="field-row">
          <label class="field"><span class="field-l">Name <i>*</i></span><input name="name" autocomplete="name" required maxlength="120"></label>
          <label class="field"><span class="field-l">Email <i>*</i></span><input name="email" type="email" autocomplete="email" required maxlength="160"></label>
        </div>
        <div class="field-row">
          <label class="field"><span class="field-l">Organisation</span><input name="organisation" autocomplete="organization" maxlength="160"></label>
          <label class="field"><span class="field-l">Reason</span>
            <select name="reason">${reasons.map((r) => `<option>${r}</option>`).join('')}</select>
          </label>
        </div>
        <label class="field"><span class="field-l">Anything I should know? <em>optional</em></span><textarea name="message" rows="3" maxlength="2000"></textarea></label>
        <label class="hp" aria-hidden="true">Leave this empty<input name="_gotcha" tabindex="-1" autocomplete="off"></label>
        <p class="form-err" role="alert" hidden></p>
        <div class="dlg-actions">
          <p class="dlg-note">${icon('lock')}Used only to reply to you.</p>
          <button type="submit" class="btn btn-primary">${icon('send')}<span>Send request</span></button>
        </div>
      </form>
    </div>
    <div class="dlg-view done" data-view="done" hidden>
      <span class="done-ico">${icon('check-circle')}</span>
      <h2 class="dlg-title" data-done-title>Request sent</h2>
      <p class="dlg-sub" data-done-text>Thanks. I’ll reply with the CV shortly.</p>
      <button type="button" class="btn btn-ghost" data-cv-close>Close</button>
    </div>
  </div>
</dialog>`;
}

/* ---------------------------------------------------------------------------
   Whole body
   ------------------------------------------------------------------------ */
export function renderBody(site, now) {
  return `
${sprite()}
<a class="skip" href="#main">Skip to content</a>
${renderNav(site, now)}
<main id="main">
${renderHero(site)}
${renderNow(site, now)}
${renderBuilt(site)}
${renderResearch(site)}
${renderPath(site)}
${renderToolkit(site)}
${renderContact(site)}
</main>
${renderFooter(site, now)}
${renderCvDialog(site)}
<div class="tip" id="tip" role="tooltip" hidden></div>
<div class="toast" role="status" aria-live="polite"></div>`;
}
