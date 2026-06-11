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
  initTearAway();                   // M4: pull a taped piece free — it falls, the washi flutters
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
      // ~2s after the cut, the rest of the zine unfurls below + a "there's more" cue appears
      setTimeout(() => { root.classList.add('revealed'); Stage.play('rustle', { gain: 0.16, rate: 0.95 }); }, 1050);
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

  // hide the "there's more" cue once the visitor takes the hint and scrolls
  addEventListener('scroll', () => root.classList.add('scrolled'), { once: true, passive: true });

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

/* ===================================================================
   M4 — TEAR-AWAY: any taped piece can be pulled free.
   Grab a sheet / polaroid / postcard by its body (not a link or button)
   and drag. It peels up against the washi tape — the harder you pull, the
   higher it lifts (its registration shadow deepens). Pull past the tape's
   hold (or flick it fast) and it RIPS free: a haptic tick fires, the page
   drops under gravity and fades, and the washi tape — no longer holding
   anything — flutters down on its own like a feather and fades out.
   Let go before it gives and the tape snaps it back into place.

   Pointer-only delight, gated to full motion. Torn pieces keep their slot
   (visibility:hidden) so siblings never jump, and everything is back on
   reload. Touch only hijacks a clearly-intentional pull (sideways / upward)
   so a downward scroll that starts on a card still scrolls the page.
   =================================================================== */
function initTearAway() {
  if (Stage.reduce) return;                 // reduced motion: leave the collage whole
  if (!('PointerEvent' in window)) return;

  const SLOP    = 7;        // px of travel before a grab becomes a pull
  const THRESH  = 116;      // px of pull the tape holds before it lets go
  const FLICK   = 1.3;      // px/ms — a fast, deliberate flick rips it free early
  const FLICK_MIN = 46;     // ...but only past this travel, so a twitch never counts
  const GRAVITY = 0.0024;   // px/ms² — the fallen page accelerates down
  const CONTROL = 'a,button,input,textarea,select,label,[contenteditable],.gate';

  function arm(el) {
    if (!el || el.dataset.tearable != null) return;    // skip if missing / already armed
    if (!el.querySelector(':scope > .tape')) return;   // only pieces actually held by tape
    el.dataset.tearable = '';
    // images are draggable by default — without this, grabbing a polaroid/snap photo
    // starts the browser's native image drag (the ghost) and steals the tear gesture.
    el.querySelectorAll('img').forEach((img) => { img.draggable = false; });
    el.addEventListener('dragstart', (e) => e.preventDefault());
    armPiece(el);
  }

  document.querySelectorAll(
    '.about .paper, .note .paper, .note .snap, .team .polaroid, .doors .card'
  ).forEach(arm);

  // The hero card hides behind the envelope cut. Arm it only once the cut sequence
  // has fully settled (envelope.done) so tearing can never disrupt the reveal — and
  // by then the pocket is overflow:visible, so the fall isn't clipped.
  const hero = document.querySelector('.hero-card');
  const env = document.getElementById('envelope');
  if (hero && env) {
    if (!document.documentElement.classList.contains('sealed')) {
      arm(hero);                                       // hero already shown (no seal)
    } else {
      const mo = new MutationObserver(() => {
        if (env.classList.contains('done')) { mo.disconnect(); arm(hero); }
      });
      mo.observe(env, { attributes: true, attributeFilter: ['class'] });
    }
  }

  function armPiece(el) {
    let grabbing = false, pulling = false, done = false, pid = null;
    let sx = 0, sy = 0, base = '';
    let lastX = 0, lastY = 0, lt = 0, vx = 0, vy = 0;

    el.addEventListener('pointerdown', onDown);
    el.__tear = () => { if (!done) detach(0, 44, 0, 0.45, 7); };   // QA hook

    function onDown(e) {
      if (done || grabbing) return;
      if (e.button != null && e.button !== 0) return;   // primary button / touch only
      if (e.target.closest(CONTROL)) return;            // let real controls work
      e.stopPropagation();                              // inner piece wins over its parent sheet
      grabbing = true; pulling = false;
      pid = e.pointerId;
      sx = lastX = e.clientX; sy = lastY = e.clientY; lt = e.timeStamp; vx = vy = 0;
      base = getComputedStyle(el).transform;
      if (base === 'none') base = '';
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    }

    function commit() {
      pulling = true;
      try { el.setPointerCapture(pid); } catch (_) {}
      el.classList.add('tearing');
      el.style.transition = 'none';
    }

    function onMove(e) {
      if (done || !grabbing || e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!pulling) {
        if (Math.hypot(dx, dy) < SLOP) return;
        // touch: a downward, mostly-vertical drag is a page scroll, not a pull — bow out.
        if (e.pointerType === 'touch' && dy > 0 && Math.abs(dy) > Math.abs(dx)) { teardown(); return; }
        commit();
      }
      e.preventDefault();
      const dt = Math.max(1, e.timeStamp - lt);
      vx = (e.clientX - lastX) / dt; vy = (e.clientY - lastY) / dt;
      lastX = e.clientX; lastY = e.clientY; lt = e.timeStamp;

      const dist = Math.hypot(dx, dy);
      const p = Math.min(1, dist / THRESH);
      el.style.setProperty('--pull', p.toFixed(3));
      const rot = Math.max(-22, Math.min(22, dx * 0.05)) * (0.4 + 0.6 * p);
      el.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) ${base}`;

      if (dist >= THRESH || (dist >= FLICK_MIN && Math.hypot(vx, vy) >= FLICK)) detach(dx, dy, vx, vy, rot);
    }

    function onUp() {
      if (done || !grabbing) return;
      if (pulling) snapBack(); else teardown();
    }

    // remove the live drag listeners; optionally keep the .tearing class (mid-animation)
    function teardown(keepClass) {
      grabbing = false; pulling = false;
      try { el.releasePointerCapture(pid); } catch (_) {}
      window.removeEventListener('pointermove', onMove, { passive: false });
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (!keepClass) { el.classList.remove('tearing'); el.style.transition = ''; el.style.transform = ''; el.style.removeProperty('--pull'); }
    }

    // not enough force — the tape wins and pulls it home
    function snapBack() {
      teardown(true);
      el.style.transition = 'transform .5s cubic-bezier(.34,1.42,.5,1), box-shadow .4s ease';
      el.style.transform = '';
      el.style.setProperty('--pull', '0');
      Stage.play('rustle', { gain: 0.12, rate: 1.12 });
      const end = () => {
        el.classList.remove('tearing');
        el.style.transition = ''; el.style.transform = ''; el.style.removeProperty('--pull');
        el.removeEventListener('transitionend', end);
      };
      el.addEventListener('transitionend', end);
      setTimeout(end, 650);
    }

    // enough force — it rips free
    function detach(dx, dy, vx0, vy0, rot0) {
      if (done) return;
      done = true;
      teardown(true);
      try { navigator.vibrate && navigator.vibrate([7, 22, 13]); } catch (_) {}   // haptic rip
      Stage.play('taperip', { gain: 0.42 });
      setTimeout(() => Stage.play('rustle', { gain: 0.22, rate: 0.9 }), 90);
      el.dataset.torn = '';
      flyTape();
      fallPaper(dx, dy, vx0, vy0, rot0);
    }

    // the page: drops under gravity, keeps its flick momentum, spins, fades.
    // Pinned position:fixed so the long fall is OUT of document flow — a fixed
    // element never extends the scrollable height, which is what made the page
    // grow far past the footer. A same-size spacer takes its slot so the pieces
    // around it never jump. The element keeps every style (it stays in the DOM
    // tree where its descendant selectors still match) — we only change its box.
    function fallPaper(dx, dy, vx0, vy0, rot0) {
      const cs = getComputedStyle(el);
      const margin = cs.margin;
      // measure the true untransformed layout box in viewport coords
      const t = el.style.transform, ro = el.style.rotate, tr = el.style.translate, sc = el.style.scale;
      el.style.transform = 'none'; el.style.rotate = 'none'; el.style.translate = 'none'; el.style.scale = 'none';
      const L = el.getBoundingClientRect();
      el.style.transform = t; el.style.rotate = ro; el.style.translate = tr; el.style.scale = sc;

      const spacer = document.createElement('div');
      spacer.dataset.tearSpacer = '';
      spacer.style.cssText = 'flex:0 0 auto;visibility:hidden;pointer-events:none;width:' +
        L.width + 'px;height:' + L.height + 'px;margin:' + margin;
      el.parentNode.insertBefore(spacer, el);

      el.classList.remove('tearing');
      el.style.transition = 'none';
      el.style.willChange = 'transform, opacity';
      el.style.position = 'fixed';
      el.style.left = L.left + 'px';
      el.style.top = L.top + 'px';
      el.style.width = L.width + 'px';
      el.style.height = L.height + 'px';
      el.style.margin = '0';
      el.style.zIndex = '70';
      el.style.pointerEvents = 'none';
      el.style.removeProperty('--pull');

      let px = dx, py = dy, rot = rot0;
      let velX = vx0, velY = Math.max(vy0, 0.05);
      let vrot = vx0 * 6; if (Math.abs(vrot) < 0.02) vrot = rot0 >= 0 ? 0.05 : -0.05;
      let life = 0, last = 0;
      const stop = Stage.addDriver((tNow) => {
        if (!last) { last = tNow; return; }
        const dt = Math.min(tNow - last, 50); last = tNow;
        life += dt;
        velY += GRAVITY * dt;
        px += velX * dt; py += velY * dt; rot += vrot * dt;
        el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) ${base}`;
        const op = life < 140 ? 1 : Math.max(0, 1 - (life - 140) / 760);
        el.style.opacity = op.toFixed(3);
        if (op <= 0 || py > innerHeight + L.height + 80) {
          stop();
          el.remove();                       // gone till reload; the spacer keeps the slot
        }
      });
    }

    // the washi: let go of the page, it flutters down on its own like a feather
    function flyTape() {
      el.querySelectorAll(':scope > .tape').forEach((tp, i) => {
        const r = tp.getBoundingClientRect();
        const w = tp.offsetWidth, h = tp.offsetHeight;
        const wrap = document.createElement('div');
        wrap.className = 'tape-fall';
        wrap.style.left = (r.left + r.width / 2 - w / 2) + 'px';
        wrap.style.top  = (r.top + r.height / 2 - h / 2) + 'px';
        wrap.style.width = w + 'px';
        wrap.style.height = h + 'px';
        wrap.style.animationDelay = (i * 90) + 'ms';
        tp.style.position = 'absolute';
        tp.style.left = '0'; tp.style.top = '0';
        tp.style.right = 'auto'; tp.style.bottom = 'auto'; tp.style.margin = '0';
        wrap.appendChild(tp);                                  // keeps its own washi tilt
        document.body.appendChild(wrap);
        wrap.addEventListener('animationend', () => wrap.remove());
      });
    }
  }

  /* ---- QA hook: list / tear pieces programmatically ---- */
  window.__drexTear = {
    list: () => [...document.querySelectorAll('[data-tearable]')].map((e) => e.className.trim()),
    tear: (sel) => { const el = document.querySelector(sel); if (el && el.__tear) el.__tear(); },
  };
}
