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
  initInteractionSounds();          // M1: stamp / toggle on interaction
  initSoundToggle(audio);           // M1: footer opt-in toggle
  // M2 register here: initCutGate(); …
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
    setEnabled(on) {
      enabled = on;
      try { localStorage.setItem('drex-sound', on ? 'on' : 'off'); } catch (_) {}
      if (on) { ensureCtx(); ctx?.resume?.(); load()?.then(() => engine.play('toggle', { gain: 0.3 })); }
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
  const targets = document.querySelectorAll(
    '.about .paper, .team .head, .team .polaroid, .note .paper, .doors .head, .doors .card'
  );
  let order = 0;
  targets.forEach((el) => {
    el.classList.add('reveal');
    Stage.observe(el, (e, release) => {
      if (!e.isIntersecting || e.intersectionRatio < 0.18) return;
      el.style.transitionDelay = Math.min((order++ % 3) * 80, 160) + 'ms';
      el.classList.add('in');
      release();
    });
  });
}

/* ===================================================================
   M1 — Highlighter / marker draw-on: the .hl band and .ul underlines
   swipe in left→right the moment they enter. Pure CSS animation toggled
   by an `.in` class; the same data-motion / tier gating applies.
   =================================================================== */
function initHighlighter() {
  document.querySelectorAll('.hl, .ul').forEach((el) => {
    el.classList.add('draw');
    Stage.observe(el, (e, release) => {
      if (!e.isIntersecting || e.intersectionRatio < 0.18) return;
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
  b.addEventListener('click', () => { audio.setEnabled(!audio.enabled); sync(); });
}

/* ---- test-only crit hook (inert in production; M2 wires real seeks) */
window.__drexCrit = window.__drexCrit || {
  disableMotion() { document.body.dataset.motion = 'calm'; },
  seek() {}, simulateKeyboardCut() {},
};
