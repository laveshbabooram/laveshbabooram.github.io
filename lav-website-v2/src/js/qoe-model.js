/* ============================================================================
   Video QoE model behind the Lab. Pure functions, no DOM: it runs in the
   browser, at build time (to prerender the default result) and in the tests.

   Deliberately simple and explainable, not a standard:
   - Throughput: link capacity, capped by the loss-based TCP estimate of
     Mathis et al. (MSS / RTT x 1.22 / sqrt(p)).
   - Start-up: DNS, TCP and TLS handshakes and the manifest (a round trip
     each), then the first segment, with TCP slow start on a cold connection.
   - Playback: 60 s of content in 2 s segments. An adaptive-bitrate player
     picks the highest rung its throughput estimate allows (more cautious when
     the buffer is low). Jitter and loss make each segment's speed vary
     (log-normal) and add occasional deep fades. The buffer is simulated in
     small time steps; an empty buffer is a stall.
   - Score: an illustrative 1-5 viewer score from resolution, start-up time,
     stalls and quality switches, inspired by ITU-T P.1203 but not it.
   Seeded from the inputs, so the same settings always give the same result.
   ========================================================================= */

export const LADDER = [
  { label: '240p', mbps: 0.4, q: 2.0 },
  { label: '360p', mbps: 0.8, q: 2.6 },
  { label: '480p', mbps: 1.4, q: 3.2 },
  { label: '720p', mbps: 2.8, q: 3.9 },
  { label: '1080p', mbps: 5, q: 4.4 },
  { label: '1440p', mbps: 9, q: 4.6 },
  { label: '2160p', mbps: 16, q: 4.8 },
];

export const PRESETS = [
  { id: 'fibre', label: 'Home fibre', rtt: 12, loss: 0.01, bw: 100, jitter: 3,
    tip: 'A good FTTH line: short round trip, almost no loss, plenty of capacity.' },
  { id: 'evening', label: 'Busy evening', rtt: 45, loss: 0.5, bw: 20, jitter: 30,
    tip: 'Peak hour: shared links congest, queues add delay and some packets get dropped.' },
  { id: 'cell', label: '4G, cell edge', rtt: 70, loss: 1, bw: 8, jitter: 50,
    tip: 'Far from the mast: weak signal, retransmissions and a throughput that swings.' },
  { id: 'leo', label: 'LEO satellite', rtt: 40, loss: 0.15, bw: 80, jitter: 20,
    tip: 'Low-Earth-orbit constellation, about 550 km up: round trips close to terrestrial links, with small blips at satellite handovers.' },
  { id: 'geo', label: 'GEO satellite', rtt: 600, loss: 0.02, bw: 30, jitter: 15,
    tip: 'Geostationary, about 36,000 km up: every round trip takes ~600 ms. Shown without the TCP-acceleration proxies operators often add.' },
];

export const DEFAULT_PRESET = 'evening';

export const LIMITS = { rtt: [5, 700], loss: [0, 3], bw: [1, 200], jitter: [0, 150] };

const MSS = 1460;            // bytes
const SEG = 2;               // seconds of video per segment
const CONTENT = 60;          // seconds of content in a session
const MAX_BUF = 30;          // seconds the player buffers ahead, at most
const RESUME = SEG;          // seconds needed to start or resume playback
const DT = 0.02;             // simulation step, seconds
const SAMPLE = 0.25;         // timeline sample spacing, seconds

/* Achievable TCP throughput, Mb/s. */
export function tcpThroughput({ rtt, loss, bw }) {
  const cap = bw * 0.94;                       // headers and protocol overhead
  const p = loss / 100;
  if (p <= 0) return cap;
  const mathis = ((MSS * 8) / (rtt / 1000)) * (1.22 / Math.sqrt(p)) / 1e6;
  return Math.max(0.05, Math.min(cap, mathis));
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf({ rtt, loss, bw, jitter }) {
  const s = `${rtt}|${loss}|${bw}|${jitter}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

const pickRung = (mbps) => {
  let r = 0;
  for (let i = 0; i < LADDER.length; i++) if (LADDER[i].mbps <= mbps) r = i;
  return r;
};

export function simulate(input) {
  const inp = {
    rtt: clamp(input.rtt, ...LIMITS.rtt),
    loss: clamp(input.loss, ...LIMITS.loss),
    bw: clamp(input.bw, ...LIMITS.bw),
    jitter: clamp(input.jitter, ...LIMITS.jitter),
  };
  const R = inp.rtt / 1000;
  const thr = tcpThroughput(inp);
  const rand = mulberry32(seedOf(inp));
  const gauss = () => {
    const u = Math.max(1e-9, rand()), v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const sigma = Math.min(0.75, (inp.jitter / 150) * 0.9 + inp.loss * 0.08);
  const pFade = Math.min(0.25, (inp.jitter / 150) * 0.14 + inp.loss * 0.025);
  const segSpeed = () => {
    let f = Math.exp(gauss() * sigma - (sigma * sigma) / 2);   // mean 1
    if (rand() < pFade) f *= 0.15 + rand() * 0.2;              // deep fade
    return Math.max(0.03, thr * f);
  };

  // ---- connection set-up: one round trip each ---------------------------
  const steps = [
    { label: 'DNS lookup', s: R },
    { label: 'TCP handshake', s: R },
    { label: 'TLS 1.3 handshake', s: R },
    { label: 'Manifest', s: R + 0.01 },
  ];
  const setup = steps.reduce((a, b) => a + b.s, 0);

  // ---- session ------------------------------------------------------------
  const nSegs = CONTENT / SEG;
  const segRung = [];
  let t = setup, buffer = 0, played = 0, state = 'start';
  let startup = null, stalls = 0, stallTime = 0, switches = 0;
  let est = null, nextSeg = 0, dl = null, firstSegS = 0;
  const samples = [];
  let nextSample = 0;
  const startRung = pickRung(thr * 0.5);

  const request = () => {
    let rung;
    if (nextSeg === 0) rung = startRung;
    else {
      const f = buffer < 4 ? 0.5 : buffer < 10 ? 0.7 : 0.85;
      rung = Math.min(pickRung(est * f), segRung[nextSeg - 1] + 2);
    }
    if (nextSeg > 0 && rung !== segRung[nextSeg - 1]) switches++;
    segRung[nextSeg] = rung;
    const bits = LADDER[rung].mbps * 1e6 * SEG;
    let wait = R;
    if (nextSeg === 0) {                           // cold connection: slow start
      const bdp = (thr * 1e6 * R) / 8;
      const bytes = Math.min(bits / 8, Math.max(bdp, 10 * MSS));
      wait += Math.ceil(Math.log2(bytes / (10 * MSS) + 1)) * R;
    }
    dl = { idx: nextSeg, left: bits, bits, wait, speed: segSpeed(), took: 0 };
    nextSeg++;
  };

  while (played < CONTENT - 1e-9 && t < 600) {
    // network
    if (!dl && nextSeg < nSegs && buffer <= MAX_BUF - SEG) request();
    if (dl) {
      dl.took += DT;
      if (dl.wait > 0) dl.wait -= DT;
      else dl.left -= dl.speed * 1e6 * DT;
      if (dl.left <= 0) {
        const measured = dl.bits / dl.took / 1e6;
        est = est === null ? measured : 0.7 * est + 0.3 * measured;
        if (dl.idx === 0) firstSegS = dl.took;
        buffer += SEG;
        dl = null;
      }
    }
    // playback
    const allIn = nextSeg >= nSegs && !dl;
    if (state !== 'play') {
      if (buffer >= RESUME - 1e-9 || (allIn && buffer > 0)) {
        if (state === 'start') startup = t;
        state = 'play';
      } else if (state === 'stall') stallTime += DT;
    }
    if (state === 'play') {
      const step = Math.min(DT, buffer);
      buffer -= step; played += step;
      if (buffer <= 1e-9 && played < CONTENT - 1e-9) { state = 'stall'; stalls++; buffer = 0; }
    }
    if (t >= nextSample) {
      const playing = Math.min(nSegs - 1, Math.floor(played / SEG));
      samples.push({
        t: +t.toFixed(3), b: +buffer.toFixed(2), p: +played.toFixed(2),
        s: state === 'play' ? 1 : state === 'stall' ? 2 : 0,
        r: segRung[playing] ?? startRung,
      });
      nextSample += SAMPLE;
    }
    t += DT;
  }
  samples.push({ t: +t.toFixed(3), b: +buffer.toFixed(2), p: CONTENT, s: 1, r: segRung[nSegs - 1] ?? startRung });

  // ---- results --------------------------------------------------------------
  const counts = new Array(LADDER.length).fill(0);
  segRung.forEach((r) => { counts[r]++; });
  const main = counts.indexOf(Math.max(...counts));
  const qMean = segRung.reduce((a, r) => a + LADDER[r].q, 0) / segRung.length;
  const su = startup ?? t;
  const startPen = Math.min(1.0, Math.max(0, su - 1) * 0.12);
  const stallPen = Math.min(2.5, stalls * 0.4 + stallTime * 0.06);
  const switchPen = Math.min(0.3, switches * 0.03);
  const score = clamp(qMean - startPen - stallPen - switchPen, 1, 5);

  return {
    input: inp,
    throughput: thr,
    steps: [...steps, { label: 'First video segment', s: firstSegS }],
    startup: su,
    stalls,
    stallTime,
    switches,
    quality: LADDER[main].label,
    score: Math.round(score * 10) / 10,
    verdict: verdictOf(Math.round(score * 10) / 10),
    samples,
    total: t,
  };
}

function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, Number(v))); }

/* KPI value + note for each card, shared by the prerender and the browser. */
export function summary(r) {
  return {
    startup: [fmt.secs(r.startup), r.startup > 3 ? 'long wait for the first frame' : 'to the first frame'],
    stalls: [String(r.stalls), r.stalls ? `${fmt.secs(r.stallTime)} frozen in total` : 'smooth playback'],
    quality: [r.quality, r.switches ? `${r.switches} quality switch${r.switches === 1 ? '' : 'es'}` : 'steady, no switches'],
    score: [r.score.toFixed(1), r.verdict],
  };
}

/* The usual five-point opinion-score labels. */
export function verdictOf(score) {
  return score >= 4.3 ? 'Excellent' : score >= 3.6 ? 'Good' : score >= 2.8 ? 'Fair' : score >= 2 ? 'Poor' : 'Bad';
}

/* Slider <-> value mappings. Square-root scales for latency and loss give the
   small values (where most real networks live) more of the slider; bandwidth
   is logarithmic. Slider positions run 0-100. */
export const SCALES = {
  rtt: { to: (v) => Math.round(5 + 695 * (v / 100) ** 2), from: (x) => 100 * Math.sqrt((x - 5) / 695) },
  loss: { to: (v) => round2(3 * (v / 100) ** 2), from: (x) => 100 * Math.sqrt(x / 3) },
  bw: { to: (v) => niceBw(200 ** (v / 100)), from: (x) => (100 * Math.log(x)) / Math.log(200) },
  jitter: { to: (v) => Math.round(1.5 * v), from: (x) => x / 1.5 },
};
function round2(x) { return x < 0.1 ? Math.round(x * 100) / 100 : Math.round(x * 20) / 20; }
function niceBw(x) { return x < 10 ? Math.round(x * 10) / 10 : Math.round(x); }

export const fmt = {
  rtt: (x) => `${x} ms`,
  loss: (x) => `${x < 0.1 ? x.toFixed(2) : x < 1 ? x.toFixed(2).replace(/0$/, '') : x.toFixed(1)} %`,
  bw: (x) => `${x} Mb/s`,
  jitter: (x) => `${x} ms`,
  secs: (s) => (s < 10 ? `${s.toFixed(1)} s` : `${Math.round(s)} s`),
  mbps: (x) => (x < 10 ? x.toFixed(1) : String(Math.round(x))),
};
