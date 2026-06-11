/* ===================================================================
   drex.style — app.js  (ES module, zero deps)
   The Stage orchestrator + feature modules.
   M0: the spine + the demo gate (moved verbatim from the old inline IIFE).
   Later milestones register features (cut-gate, reveals, highlighter, …)
   with Stage so there is ONE rAF loop, ONE IntersectionObserver, and ONE
   motion switch (body[data-motion]) that every effect keys off.
   =================================================================== */

const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

const Stage = (() => {
  /* ---- motion switch: body[data-motion] = full | calm -------------- */
  function applyMotion() {
    document.body.dataset.motion = reduceMQ.matches ? 'calm' : 'full';
  }
  reduceMQ.addEventListener?.('change', applyMotion);

  /* ---- shared rAF driver registry --------------------------------- */
  const drivers = new Set();
  let rafId = 0;
  function tick(t) {
    rafId = 0;
    fpsSample(t);
    for (const fn of drivers) { try { fn(t); } catch (_) {} }
    if (drivers.size && document.body.dataset.motion !== 'calm') schedule();
  }
  function schedule() { if (!rafId) rafId = requestAnimationFrame(tick); }
  function addDriver(fn) {
    drivers.add(fn); schedule();
    return () => { drivers.delete(fn); };
  }

  /* ---- shared IntersectionObserver -------------------------------- */
  const ioCbs = new Map(); // element -> callback(entry, release)
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const fn = ioCbs.get(e.target);
      if (fn) fn(e, () => { io.unobserve(e.target); ioCbs.delete(e.target); });
    }
  }, { rootMargin: '200px 0px', threshold: [0, 0.18, 0.9] });
  function observe(el, fn) { if (!el) return; ioCbs.set(el, fn); io.observe(el); }

  /* ---- FPS governor: latch html[data-tier=lite] under load -------- */
  let frames = [], lastT = 0, demoted = false;
  function fpsSample(t) {
    if (lastT) {
      frames.push(t - lastT);
      if (frames.length > 8) frames.shift();
      if (!demoted && frames.length === 8) {
        const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
        if (avg > 34) { demoted = true; document.documentElement.dataset.tier = 'lite'; } // ~<29fps
      }
    }
    lastT = t;
  }

  /* ---- audio bus (skeleton; the real engine boots in M1) ---------- */
  let engine = null;
  function registerAudio(e) { engine = e; }
  function play(key, opts) { try { engine?.play?.(key, opts); } catch (_) {} }
  window.addEventListener('drexfx:play', (e) => play(e.detail?.key, e.detail));

  return {
    applyMotion, addDriver, observe, registerAudio, play,
    get calm() { return document.body.dataset.motion === 'calm'; },
    get reduce() { return reduceMQ.matches; },
  };
})();

window.Stage = Stage;

/* ---- boot ---------------------------------------------------------- */
function boot() {
  Stage.applyMotion();
  const audio = initAudio();        // M1: audio engine (opt-in, gesture-unlocked)
  initDemoGate();
  initReveals();                    // M1: settle-in on scroll
  initHighlighter();                // M1: highlighter + marker draw-on
  initEnvelope(audio);              // M3: hero drag-to-cut envelope
  initInteractionSounds();          // M1: stamp / toggle on interaction
  initSoundToggle(audio);           // M1: footer opt-in toggle
  // wake the FPS governor for the first couple seconds so html[data-tier=lite]
  // can latch under load — the CSS/IO features never register a rAF driver,
  // so without this the governor is dead code and the lite fallback unreachable.
  if (!Stage.reduce) { const stopFps = Stage.addDriver(() => {}); setTimeout(stopFps, 2200); }
}
if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);

/* ===================================================================
   Demo gate (HTTP Basic Auth) — moved verbatim from the old inline IIFE.
   The visitor types the full "username:password" passcode; we split on the
   first colon and hand both parts to the browser as Basic Auth credentials
   via the URL, so they skip the native dialog. Nothing is stored here.
   =================================================================== */
function initDemoGate() {
  const demoHost = 'demo.drex.style';
  const t = document.getElementById('demo-toggle'),
        g = document.getElementById('demo-gate'),
        f = document.getElementById('demo-form'),
        i = document.getElementById('demo-code'),
        m = document.getElementById('demo-msg');
  if (!t || !f) return;
  t.addEventListener('click', () => {
    const o = g.classList.toggle('open');
    t.setAttribute('aria-expanded', String(o));
    if (o) setTimeout(() => i.focus(), 60);
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw = (i.value || '').trim(); if (!raw) { i.focus(); return; }
    const idx = raw.indexOf(':');
    const user = idx >= 0 ? raw.slice(0, idx) : raw,
          pass = idx >= 0 ? raw.slice(idx + 1) : '';
    m.textContent = 'opening the demo…'; m.className = 'msg ok';
    location.href = 'https://' + encodeURIComponent(user) + ':' + encodeURIComponent(pass) + '@' + demoHost;
  });
}

/* ===================================================================
   M1 — Audio engine (Web Audio; gesture-unlocked; OFF by default)
   Browsers block autoplay, so the AudioContext is created/resumed only on
   the first real user gesture. Sound is opt-in (footer toggle, persisted);
   when on, short craft SFX fire on direct interactions. Buffers load lazily.
   Every feature plays through Stage.play(key) → this engine.
   =================================================================== */
function initAudio() {
  const KEYS = ['cut', 'marker', 'rustle', 'snip', 'stamp', 'taperip', 'toggle', 'underline'];
  const buffers = new Map();
  let ctx = null, loading = null, enabled = false;
  try { enabled = localStorage.getItem('drex-sound') === 'on'; } catch (_) {}

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
    return ctx;
  }
  function load() {
    if (loading || !ctx) return loading;
    loading = Promise.all(KEYS.map(async (k) => {
      try {
        const buf = await fetch(`assets/audio/${k}.mp3`).then((r) => r.arrayBuffer());
        buffers.set(k, await ctx.decodeAudioData(buf));
      } catch (_) {}
    }));
    return loading;
  }
  function unlock() {
    ensureCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    if (enabled) load();
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, unlock, { once: true, passive: true }));

  function emitChange() { try { window.dispatchEvent(new Event('drexfx:soundchange')); } catch (_) {} }

  const engine = {
    play(key, opts = {}) {
      if (!enabled || !ctx || ctx.state !== 'running') return;
      const buf = buffers.get(key);
      if (!buf) { load(); return; }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = opts.rate ?? (0.94 + Math.random() * 0.12);
      const g = ctx.createGain();
      g.gain.value = opts.gain ?? 0.32;
      src.connect(g).connect(ctx.destination);
      src.start();
    },
    // The envelope cut is a deliberate gesture, so it turns sound ON for the
    // session (unless the visitor has explicitly muted via the footer toggle).
    armForCut() {
      try { if (localStorage.getItem('drex-sound') === 'off') return; } catch (_) {}
      ensureCtx(); if (ctx && ctx.state === 'suspended') ctx.resume(); load();
      if (!enabled) { enabled = true; emitChange(); }
    },
    setEnabled(on) {
      enabled = on;
      try { localStorage.setItem('drex-sound', on ? 'on' : 'off'); } catch (_) {}
      if (on) { ensureCtx(); ctx?.resume?.(); load()?.then(() => engine.play('toggle', { gain: 0.3 })); }
      emitChange();
    },
    get enabled() { return enabled; },
  };
  Stage.registerAudio(engine);
  return engine;
}

/* ===================================================================
   M1 — Reveals: sections / cards / polaroids settle in on scroll.
   Uses the individual `translate` property (NOT transform) so the lift
   composes with each element's resting tilt instead of clobbering it.
   Hidden state lives in CSS under body[data-motion="full"]; under calm,
   reduced-motion, or tier=lite everything is shown instantly.
   =================================================================== */
function initReveals() {
  // No IntersectionObserver → never add `.reveal`, so the CSS hidden state never
  // applies and all content is shown. The reveal can NEVER hide real content.
  if (!('IntersectionObserver' in window)) return;
  // Only the littered SMALL objects animate (polaroids, door cards, section
  // heads). The big anchor sheets (.about / .note) stay put — animating them
  // read as a slide-deck, and a tall sheet that can't cross the IO threshold
  // would vanish. Per-group index gives a real cascade instead of a global %3.
  const groups = [
    document.querySelectorAll('.team .polaroid'),
    document.querySelectorAll('.doors .card'),
    document.querySelectorAll('.team .head, .doors .head'),
  ];
  const marked = [];
  groups.forEach((nodes) => nodes.forEach((el, i) => {
    el.classList.add('reveal');
    marked.push(el);
    Stage.observe(el, (e, release) => {
      if (!e.isIntersecting) return;             // gate on visibility only, not ratio
      el.style.transitionDelay = (i * 70) + 'ms';
      el.classList.add('in');
      // clear the delay once it has played so it can't leak onto a hover transform
      el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
      release();
    });
  }));
  // belt-and-suspenders: anything still hidden after 4s gets shown regardless.
  setTimeout(() => marked.forEach((el) => el.classList.add('in')), 4000);
}

/* ===================================================================
   M1 — Highlighter / marker draw-on: the .hl band and .ul underlines
   swipe in left→right the moment they enter. Pure CSS animation toggled
   by an `.in` class; the same data-motion / tier gating applies.
   =================================================================== */
function initHighlighter() {
  if (!('IntersectionObserver' in window)) return;  // leave marks fully drawn
  document.querySelectorAll('.hl, .ul').forEach((el) => {
    if (el.closest('.hero-card')) return;           // the envelope sequence draws the hero highlight
    el.classList.add('draw');
    Stage.observe(el, (e, release) => {
      if (!e.isIntersecting) return;
      el.classList.add('in');
      release();
    });
  });
}

/* ---- M1 — interaction SFX (no-op until sound is switched on) -------- */
function initInteractionSounds() {
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) Stage.play('stamp', { gain: 0.32 });
    else if (e.target.closest('.mast nav a')) Stage.play('toggle', { gain: 0.24 });
  });
}

/* ---- M1 — footer opt-in sound toggle ------------------------------- */
function initSoundToggle(audio) {
  const b = document.getElementById('snd-toggle');
  if (!b) return;
  const sync = () => {
    b.setAttribute('aria-pressed', String(audio.enabled));
    b.textContent = audio.enabled ? 'sound on' : 'sound off';
  };
  sync();
  window.addEventListener('drexfx:soundchange', sync);   // stay in sync when the cut turns sound on
  b.addEventListener('click', () => { audio.setEnabled(!audio.enabled); sync(); });
}

/* ===================================================================
   M3 — Hero ENVELOPE (drag-to-cut). The page opens as blank paper with a
   "cut here" seam. The visitor DRAGS the scissors across it (mouse or finger;
   on desktop the scissors also follows the cursor on hover) and the seam
   tears under it (--cut, monotonic) with snip sounds. A full cut makes the
   hero card RISE out of the pocket (paper-shuffle), then in sequence it gains
   its hard shadow → washi tape → the highlighter draws on (marker sound).
   Keyboard: Enter/Space on the focusable seam runs an auto-cut.
   Armed ONLY under html.sealed (motion ok). Content is never gated: the card
   is in the DOM for screen readers, and the <head> failsafe reveals it if JS
   never arms; reduced-motion / no-JS show the hero normally.
   =================================================================== */
function initEnvelope(audio) {
  const root = document.documentElement;
  const env = document.getElementById('envelope');
  const seam = document.getElementById('cutgate');
  if (!env || !seam) return;
  if (!root.classList.contains('sealed')) return;   // hero already shown — nothing to arm

  root.classList.add('armed');                       // tell the <head> failsafe we're alive
  seam.classList.add('armed');                       // scissors nudge + prompt bob

  let cutMax = 0, cutting = false, done = false, lastDash = -1;

  const fracAt = (clientX) => {
    const r = seam.getBoundingClientRect();
    return r.width ? Math.max(0, Math.min(1, (clientX - r.left) / r.width)) : 0;
  };
  const setX = (f) => seam.style.setProperty('--cut-x', f.toFixed(4));   // scissors position
  const setCut = (f) => seam.style.setProperty('--cut', f.toFixed(4));   // torn progress

  function advance(f) {                              // extend the cut; never backwards
    if (f <= cutMax) return;
    cutMax = f; setCut(cutMax);
    const dash = Math.floor(cutMax * 14);
    if (dash !== lastDash) { lastDash = dash; Stage.play('snip', { gain: 0.17 }); }
    if (cutMax >= 0.97) complete();
  }

  function complete() {
    if (done) return;
    done = true; cutting = false;
    env.classList.remove('cutting');
    setCut(1); setX(1);
    Stage.play('cut', { gain: 0.42 });               // the heavier release tear
    env.classList.add('opened');                     // the card rises out of the pocket
    Stage.play('rustle', { gain: 0.34 });            // paper shuffle as it comes up
    setTimeout(() => Stage.play('rustle', { gain: 0.18, rate: 1.12 }), 190);
    setTimeout(() => {                               // AFTER the ~0.8s rise:
      env.classList.add('done', 'lit-shadow');       // unclip + the hard shadow pops in
      setTimeout(() => { env.classList.add('lit-tape'); Stage.play('taperip', { gain: 0.3 }); }, 250);
      setTimeout(() => { env.classList.add('lit-hl');  Stage.play('marker',  { gain: 0.32 }); }, 600);
    }, 820);
  }

  /* ---- pointer drag (mouse + touch unified) ---- */
  seam.addEventListener('pointermove', (e) => {
    if (done) return;
    const f = fracAt(e.clientX);
    setX(f);                                          // scissors follows cursor / finger
    if (cutting) advance(f);
  });
  seam.addEventListener('pointerdown', (e) => {
    if (done) return;
    e.preventDefault();
    cutting = true; env.classList.add('cutting');
    try { seam.setPointerCapture(e.pointerId); } catch (_) {}
    audio && audio.armForCut();                       // the cut gesture turns sound on (unless muted)
    const f = fracAt(e.clientX); setX(f); advance(f);
  });
  const endDrag = () => {
    if (done || !cutting) return;
    cutting = false; env.classList.remove('cutting');
    if (cutMax >= 0.8) complete();                    // forgiving: most of the way across = done
    else setX(cutMax);                                // rest the blades at the cut front; grab again
  };
  seam.addEventListener('pointerup', endDrag);
  seam.addEventListener('pointercancel', endDrag);

  /* ---- keyboard (a11y): Enter / Space runs an auto-cut ---- */
  seam.addEventListener('keydown', (e) => {
    if (done || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    env.classList.add('cutting');
    audio && audio.armForCut();
    let p = 0;
    const stop = Stage.addDriver(() => {
      p = Math.min(p + 0.022, 1); setX(p); advance(p);
      if (p >= 1 || done) stop();
    });
  });

  /* ---- QA hooks ---- */
  window.__drexCrit = window.__drexCrit || {};
  window.__drexCrit.seek = (pos) => { const f = Math.max(0, Math.min(1, +pos || 0)); setX(f); advance(f); };
  window.__drexCrit.simulateKeyboardCut = complete;
  window.__drexCrit.openEnvelope = complete;
}

/* ---- test-only crit hook (defaults; initCutGate overrides seek/cut) */
window.__drexCrit = window.__drexCrit || {
  disableMotion() { document.body.dataset.motion = 'calm'; },
  seek() {}, simulateKeyboardCut() {},
};
