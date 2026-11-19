/* ============================================================================
   Dates, evaluated in Mauritius time (UTC+4, no DST).
   Pure functions: used at build time AND in the browser, so a status shown
   in the prerendered HTML and one recomputed on load always agree.
   ========================================================================= */

const MU = '+04:00';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/* Parse 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD' into the [start, end] it covers. */
export function span(s) {
  const [y, m, d] = s.split('-').map(Number);
  if (d) {
    const iso = `${s}T00:00:00${MU}`;
    const start = new Date(iso);
    return [start, new Date(start.getTime() + 86400000 - 1)];
  }
  if (m) {
    const start = new Date(`${y}-${String(m).padStart(2, '0')}-01T00:00:00${MU}`);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    const next = new Date(`${ny}-${String(nm).padStart(2, '0')}-01T00:00:00${MU}`);
    return [start, new Date(next.getTime() - 1)];
  }
  return [new Date(`${y}-01-01T00:00:00${MU}`), new Date(new Date(`${y + 1}-01-01T00:00:00${MU}`).getTime() - 1)];
}

/* Sort key: start of the period. Year-only items sort to the start of the year. */
export const sortKey = (s) => span(s)[0].getTime();

/* 'Nov 2026', 'Aug 2026', '2026' */
export function label(s) {
  const [y, m] = s.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}

/* A batch's sessions -> '1, 8 & 22 Aug 2026', '19, 26 Sep & 3 Oct 2026',
   or 'November 2026' while only the month is known. */
export function sessionsLabel(sessions) {
  if (sessions.length === 1 && sessions[0].split('-').length === 2) {
    const [y, m] = sessions[0].split('-').map(Number);
    return `${MONTHS_LONG[m - 1]} ${y}`;
  }
  const parts = sessions.map((s) => s.split('-').map(Number));
  const year = parts[parts.length - 1][0];
  const out = [];
  parts.forEach(([, m, d], i) => {
    const nextSameMonth = parts[i + 1] && parts[i + 1][1] === m;
    out.push(nextSameMonth ? `${d}` : `${d} ${MONTHS[m - 1]}`);
  });
  const joined = out.length > 1 ? out.slice(0, -1).join(', ') + ' & ' + out[out.length - 1] : out[0];
  return `${joined} ${year}`;
}

/* upcoming | running | completed, from the first and last session. */
export function batchStatus(batch, now) {
  const first = span(batch.sessions[0])[0];
  const last = span(batch.sessions[batch.sessions.length - 1])[1];
  if (now < first) return 'upcoming';
  if (now > last) return 'completed';
  return 'running';
}

export function batchesWithStatus(course, now) {
  return course.batches.map((b) => ({
    ...b,
    status: batchStatus(b, now),
    when: sessionsLabel(b.sessions),
    endKey: span(b.sessions[b.sessions.length - 1])[1].getTime(),
    startKey: span(b.sessions[0])[0].getTime(),
  }));
}

/* The one thing that is live right now, for the nav chip and the Now title. */
export function liveItem(site, now) {
  const batches = batchesWithStatus(site.course, now);
  const running = batches.find((b) => b.status === 'running');
  if (running) return { kind: 'running', batch: running, text: `${running.name} running`, sub: 'GenAI course' };
  const next = batches.find((b) => b.status === 'upcoming');
  if (next) return { kind: 'upcoming', batch: next, text: `${next.name} · ${next.when}`, sub: 'GenAI course' };
  return null;
}

/* The log: hand-written updates plus one entry per batch event that has
   actually happened (a batch starting or finishing). Newest first. */
export function feed(site, now) {
  const items = site.updates.map((u) => ({ ...u, key: sortKey(u.date), when: label(u.date) }));
  batchesWithStatus(site.course, now).forEach((b) => {
    if (b.status === 'running') {
      items.push({ key: b.startKey, when: label(b.sessions[0].slice(0, 7)), tag: 'Teaching', live: true,
        text: `${b.name} of Generative & Agentic AI Automation for Professionals is running.` });
    } else if (b.status === 'completed') {
      const lastMonth = b.sessions[b.sessions.length - 1].slice(0, 7);
      items.push({ key: b.endKey, when: label(lastMonth), tag: 'Teaching',
        text: `${b.name} of the GenAI automation course completed (${b.when}).` });
    }
  });
  return items.sort((a, b) => b.key - a.key);
}

/* '17 Nov 2026' in Mauritius time. */
export function dayLabel(date) {
  const mu = new Date(date.getTime() + 4 * 3600000);
  return `${mu.getUTCDate()} ${MONTHS[mu.getUTCMonth()]} ${mu.getUTCFullYear()}`;
}

export function muYear(date) {
  return new Date(date.getTime() + 4 * 3600000).getUTCFullYear();
}
