/* Date logic behind the Now section. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { site } from '../src/data/site.js';
import { batchesWithStatus, liveItem, feed, sessionsLabel, span } from '../src/render/time.js';
import { renderNowInner, nowKey } from '../src/render/page.js';

const at = (iso) => new Date(iso);
const statuses = (iso) => batchesWithStatus(site.course, at(iso)).map((b) => b.status);

test('session labels', () => {
  assert.equal(sessionsLabel(['2026-08-01', '2026-08-08', '2026-08-22']), '1, 8 & 22 Aug 2026');
  assert.equal(sessionsLabel(['2026-09-19', '2026-09-26', '2026-10-03']), '19, 26 Sep & 3 Oct 2026');
  assert.equal(sessionsLabel(['2026-11']), 'November 2026');
});

test('spans are Mauritius days and months', () => {
  const [s, e] = span('2026-11');
  assert.equal(s.toISOString(), '2026-10-31T20:00:00.000Z');
  assert.equal(e.toISOString(), '2026-11-30T19:59:59.999Z');
  const [ds, de] = span('2026-10-03');
  assert.equal(ds.toISOString(), '2026-10-02T20:00:00.000Z');
  assert.equal(de.toISOString(), '2026-10-03T19:59:59.999Z');
});

test('today (17 Nov 2026): batches 1-2 done, batch 3 running', () => {
  assert.deepEqual(statuses('2026-11-17T16:00:00+04:00'), ['completed', 'completed', 'running']);
  assert.equal(liveItem(site, at('2026-11-17T16:00:00+04:00')).text, 'Batch 3 running');
});

test('before the first batch: upcoming, with its dates', () => {
  assert.deepEqual(statuses('2026-07-20T10:00:00+04:00'), ['upcoming', 'upcoming', 'upcoming']);
  assert.equal(liveItem(site, at('2026-07-20T10:00:00+04:00')).text, 'Batch 1 · 1, 8 & 22 Aug 2026');
});

test('between sessions a batch is still running', () => {
  assert.deepEqual(statuses('2026-08-15T12:00:00+04:00'), ['running', 'upcoming', 'upcoming']);
});

test('a batch completes at midnight Mauritius time after its last session', () => {
  assert.equal(statuses('2026-10-03T23:59:00+04:00')[1], 'running');
  assert.equal(statuses('2026-10-04T00:00:01+04:00')[1], 'completed');
  assert.equal(statuses('2026-11-30T23:59:00+04:00')[2], 'running');
  assert.equal(statuses('2026-12-01T00:00:01+04:00')[2], 'completed');
});

test('after the last batch: nothing live, Now title falls back', () => {
  const now = at('2026-12-05T09:00:00+04:00');
  assert.equal(liveItem(site, now), null);
  assert.match(renderNowInner(site, now), /Latest from the log/);
  assert.notEqual(nowKey(site, now), nowKey(site, at('2026-11-17T16:00:00+04:00')));
});

test('feed: newest first, live batch on top today', () => {
  const items = feed(site, at('2026-11-17T16:00:00+04:00'));
  assert.equal(items[0].live, true);
  for (let i = 1; i < items.length; i++) assert.ok(items[i - 1].key >= items[i].key);
  // one entry per completed batch, none for upcoming ones
  assert.equal(items.filter((x) => /Batch \d/.test(x.text)).length, 3);
});
