// The Lab's model: the presets must tell the stories the UI promises, and
// the physics must move in the right direction.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { simulate, tcpThroughput, PRESETS, SCALES, LIMITS, verdictOf } from '../src/js/qoe-model.js';

const P = Object.fromEntries(PRESETS.map((p) => [p.id, p]));
const run = (id, over = {}) => simulate({ ...P[id], ...over });

test('home fibre: fast start, no stalls, top quality', () => {
  const r = run('fibre');
  assert.ok(r.startup < 1, `startup ${r.startup}`);
  assert.equal(r.stalls, 0);
  assert.equal(r.quality, '2160p');
  assert.ok(r.score >= 4.5);
});

test('GEO starts several times slower than LEO, and scores lower', () => {
  const geo = run('geo'), leo = run('leo');
  assert.ok(geo.startup > 3 * leo.startup, `geo ${geo.startup} vs leo ${leo.startup}`);
  assert.ok(geo.score < leo.score);
});

test('cell edge is worse than fibre on every count', () => {
  const cell = run('cell'), fibre = run('fibre');
  assert.ok(cell.score < fibre.score);
  assert.ok(cell.throughput < fibre.throughput);
  assert.ok(cell.startup > fibre.startup);
});

test('deterministic: same settings, same session', () => {
  assert.deepEqual(run('evening'), run('evening'));
});

test('more latency means a slower start; more loss means less throughput', () => {
  assert.ok(run('evening', { rtt: 300 }).startup > run('evening', { rtt: 30 }).startup);
  assert.ok(tcpThroughput({ rtt: 50, loss: 2, bw: 100 }) < tcpThroughput({ rtt: 50, loss: 0.1, bw: 100 }));
  assert.ok(tcpThroughput({ rtt: 50, loss: 0, bw: 40 }) <= 40);
});

test('session plays the full minute and the timeline is ordered', () => {
  for (const p of PRESETS) {
    const r = simulate(p);
    const last = r.samples[r.samples.length - 1];
    assert.equal(last.p, 60, p.id);
    for (let i = 1; i < r.samples.length; i++) assert.ok(r.samples[i].t >= r.samples[i - 1].t, p.id);
    assert.ok(r.score >= 1 && r.score <= 5, p.id);
  }
});

test('extreme settings stay finite', () => {
  const r = simulate({ rtt: LIMITS.rtt[1], loss: LIMITS.loss[1], bw: LIMITS.bw[0], jitter: LIMITS.jitter[1] });
  assert.ok(Number.isFinite(r.startup) && Number.isFinite(r.score));
  assert.equal(r.samples[r.samples.length - 1].p, 60);
});

test('slider scales round-trip within rounding', () => {
  for (const k of Object.keys(SCALES)) {
    for (const v of [0, 25, 50, 75, 100]) {
      const x = SCALES[k].to(v);
      assert.ok(x >= LIMITS[k][0] - 1e-9 && x <= LIMITS[k][1] + 1e-9, `${k} ${v} -> ${x}`);
      assert.ok(Math.abs(SCALES[k].from(x) - v) < 3, `${k} ${v} -> ${x} -> ${SCALES[k].from(x)}`);
    }
  }
  assert.equal(verdictOf(4.5), 'Excellent');
  assert.equal(verdictOf(1.2), 'Bad');
});
