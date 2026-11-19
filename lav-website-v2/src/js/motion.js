/* ============================================================================
   Motion: lav-ui's anim.js ported to an ES module on anime.js v4.0.2.
   Same rules: one easing curve, ~8px rise, damped staggers, count-ups that
   snap to the exact value, reduced motion honoured by shrinking durations to
   ~1ms (so everything still lands in its final state).
   ========================================================================= */
import { animate as rawAnimate, createTimeline, stagger as aStagger } from 'animejs';

export const EASE = 'cubicBezier(0.22, 1, 0.36, 1)';
export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const dur = (ms) => (REDUCED ? 1 : ms);

/* ---------------------------------------------------------------------------
   From-value priming (lav-ui gotcha #1): anime v4 applies a from-value only
   when the animation starts, i.e. after its delay, which shows finished
   content, blanks it, then fades it back: a flash. Prime opacity at creation.
   ------------------------------------------------------------------------ */
function eachElement(targets, fn) {
  if (!targets) return;
  if (typeof targets === 'string') document.querySelectorAll(targets).forEach(fn);
  else if (targets instanceof Element) fn(targets);
  else if (typeof targets.length === 'number') Array.prototype.forEach.call(targets, (t) => t instanceof Element && fn(t));
}
function fromValue(spec, el, i, total) {
  const v = typeof spec === 'function' ? spec(el, i, total) : spec;
  return Array.isArray(v) ? v[0] : undefined;
}
function primeFrom(targets, params) {
  if (!params || params.opacity === undefined) return;
  const list = [];
  eachElement(targets, (el) => list.push(el));
  list.forEach((el, i) => {
    const o = fromValue(params.opacity, el, i, list.length);
    if (o !== undefined) el.style.opacity = o;
  });
}

const isEmpty = (t) => !t || (typeof t.length === 'number' && t.length === 0);

export function animate(targets, params) {
  if (isEmpty(targets)) return null;
  primeFrom(targets, params);
  return rawAnimate(targets, params);
}

export function timeline(opts) {
  const tl = createTimeline(Object.assign({ defaults: { ease: EASE, duration: dur(560) } }, opts || {}));
  const rawAdd = tl.add.bind(tl);
  tl.add = function (targets, params, position) {
    if (isEmpty(targets)) return tl;
    primeFrom(targets, params);
    return rawAdd(targets, params, position);
  };
  return tl;
}

/* ---------------------------------------------------------------------------
   Stagger damping: a long list arrives almost together instead of sweeping
   down the page. Capped per item and across the whole group.
   ------------------------------------------------------------------------ */
const STAGGER_PER_ITEM = 34;
const STAGGER_TOTAL = 300;

export function stagger(ms, targets) {
  if (!ms) return 0;
  const n = targets && typeof targets.length === 'number' ? targets.length : 1;
  let per = Math.min(ms, STAGGER_PER_ITEM);
  if (n > 1) per = Math.min(per, STAGGER_TOTAL / (n - 1));
  return aStagger(dur(per));
}

/* Entrance primitives: return [targets, params] for tl.add(...rise(x)). */
export function rise(targets, opts = {}) {
  return [targets, {
    opacity: [0, 1],
    translateY: [opts.y !== undefined ? opts.y : 8, 0],
    duration: dur(opts.duration || 620),
    delay: opts.stagger ? stagger(opts.stagger, targets) : dur(opts.delay || 0),
    ease: EASE,
  }];
}

export function fade(targets, opts = {}) {
  return [targets, {
    opacity: [0, 1],
    duration: dur(opts.duration || 520),
    delay: opts.stagger ? stagger(opts.stagger, targets) : dur(opts.delay || 0),
    ease: EASE,
  }];
}

export const fmt = {
  int: (v) => Math.round(v).toLocaleString('en-GB'),
};

/* Count-up. The element is sized for its final text (tabular numerals), and
   the last frame snaps to the exact target. */
export function countUp(el, to, opts = {}) {
  const state = { v: opts.from || 0 };
  const format = opts.format || fmt.int;
  el.textContent = format(state.v);
  return rawAnimate(state, {
    v: to,
    duration: dur(opts.duration || 1100),
    delay: dur(opts.delay || 0),
    ease: 'outExpo',
    onUpdate: () => { el.textContent = format(state.v); },
    onComplete: () => { el.textContent = format(to); },
  });
}
