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
  let frames = [], lastT = 0, demoted = false, fpsPausedUntil = 0;
  function pauseFps(ms) { fpsPausedUntil = Math.max(fpsPausedUntil, lastT + ms); }  // skip sampling across a known stall
  function fpsSample(t) {
    if (t < fpsPausedUntil) { lastT = t; frames = []; return; }   // inside a deliberate pause (e.g. domToCanvas)
    if (lastT) {
      const d = t - lastT;
      // A single long frame is a one-off STALL (the finale's domToCanvas capture,
      // GC, a background tab), not sustained low FPS — ignore it and reset the
      // window so the capture jank can't permanently demote us to lite (which
      // would kill squigglevision on the whole page). Only sustained load latches.
      if (d >= 100) { frames = []; }
      else {
        frames.push(d);
        if (frames.length > 8) frames.shift();
        if (!demoted && frames.length === 8) {
          const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
          if (avg > 34) { demoted = true; document.documentElement.dataset.tier = 'lite'; } // ~<29fps
        }
      }
    }
    lastT = t;
  }

  /* ---- audio bus (skeleton; the real engine boots in M1) ---------- */
  let engine = null;
  function registerAudio(e) { engine = e; }
  function play(key, opts) { try { engine?.play?.(key, opts); } catch (_) {} }
  window.addEventListener('drexfx:play', (e) => play(e.detail?.key, e.detail));

  function armSound() { try { engine?.armForCut?.(); } catch (_) {} }

  return {
    applyMotion, addDriver, observe, registerAudio, play, armSound, pauseFps,
    get calm() { return document.body.dataset.motion === 'calm'; },
    get reduce() { return reduceMQ.matches; },
  };
})();

window.Stage = Stage;

/* ---- boot ---------------------------------------------------------- */
/* Keep the cut line at the vertical CENTRE of the viewport while sealed. The hidden
   card's full-height layout box would otherwise pin the seam low, so we set the
   pocket's HEIGHT (it's overflow:clip while sealed, so the taller card is clipped)
   to land the seam centre on 50vh. Runs at EVERY width (mobile too — there the reel
   is display:none while sealed, so only the pocket drives the seam). Recomputed on
   load + resize; released the moment the cut starts so the reveal reflows naturally.
   The reel-clip mask math stays desktop-only (>880px) — the slit choreography is
   inert under the mobile breakpoint. */
function initSlitCenter() {
  const root = document.documentElement;
  const clip = document.querySelector('.card-clip');
  const seam = document.getElementById('cutgate');
  const env  = document.getElementById('envelope');
  if (!clip || !seam || !env) return;
  const stage = env.querySelector('.reel-stage');
  const reel  = stage && stage.querySelector('.hero-reel');
  function center() {
    const sealedNow = root.classList.contains('sealed') && !root.classList.contains('revealed') &&
                      !env.classList.contains('opened') && !env.classList.contains('cutting');
    if (!sealedNow) { clip.style.height = ''; clip.style.minHeight = ''; if (stage) { stage.style.removeProperty('--reel-clip'); stage.style.removeProperty('--reel-hide'); } return; }
    clip.style.minHeight = '0';   // let the pocket shrink past the clamp so the seam can reach centre
    clip.style.height = '';
    for (let i = 0; i < 4; i++) {
      const r = seam.getBoundingClientRect();
      const delta = window.innerHeight / 2 - (r.top + r.bottom) / 2;
      if (Math.abs(delta) < 1) break;
      clip.style.height = Math.max(0, clip.offsetHeight + delta) + 'px';
    }
    if (stage && window.innerWidth > 880) {       // desktop: publish the card's mask line so the reel clips at the SAME slit
      const slitY    = clip.getBoundingClientRect().bottom;
      const stageTop = stage.getBoundingClientRect().top;
      stage.style.setProperty('--reel-clip', (slitY - stageTop) + 'px');
      if (reel) {
        const h = reel.offsetHeight, w = reel.offsetWidth;
        const restTopY = stageTop + reel.offsetTop - h / 2;          // visual REST top (undoes translate:0 -50%)
        const safety = (w / 2) * Math.sin(11 * Math.PI / 180) + 16;  // clear the rotate(-11deg) corners
        stage.style.setProperty('--reel-hide', (Math.max(0, slitY - restTopY) + safety) + 'px');
      }
    }
  }
  center();
  window.addEventListener('load', center);
  window.addEventListener('resize', center, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(center);
}

function boot() {
  Stage.applyMotion();
  const audio = initAudio();        // M1: audio engine (opt-in, gesture-unlocked)
  initReveals();                    // M1: settle-in on scroll
  initHighlighter();                // M1: highlighter + marker draw-on
  initEnvelope(audio);              // M3: hero drag-to-cut envelope
  initSlitCenter();                 // keep the cut line at viewport vertical centre while sealed
  initTearAway();                   // M4: pull a taped piece free — it falls, the washi flutters
  initPhotoVandal();                // M5: tap a photo → a random sharpie doodle scrawls on (persists)
  initInteractionSounds();          // M1: stamp / toggle on interaction
  initSoundToggle(audio);           // M1: footer opt-in toggle
  initFounderCrumple();             // M4: founder's note = click-to-unfold 3D paper crumple
  balanceMarginalia();              // top up any section whose gutters are bare — runs BEFORE
                                    // initCollage so injected scraps inherit parallax + entrance
  initCollage();                    // ported: littered collage scraps + scroll entrance + parallax
  initHamburgerJoy(audio);          // M5: the hamburger that lies — flop, slit, pull-out nav
  initAttentionCta();               // ported: hero CTA idle "look at me" loop
  initFirecrackerCta(audio);        // ported from the wall: "Join a Circle" click → firecracker → green door
  initFinale();                     // M5: tear off EVERY piece → the site crumples → "we love people like you"
  initHowGag();                     // tap "every week" → the words stop, the ring spins instead
  initHeroRotate();                 // hero "week" gets retyped: month, 2nd Friday, other week…
  initMakerPhotos();                // polaroids adopt assets/makers/<handle>.jpg if present
  // Hovering a card/polaroid grows its hard shadow under a live SVG filter —
  // a burst of quick re-rasters of a big sheet. That's a known, brief,
  // self-inflicted stall (same idea as the crumple capture at pauseFps(2500)):
  // if the governor happens to be sampling, don't let the hover latch
  // tier=lite and kill squigglevision for the rest of the session.
  document.querySelectorAll('.splay .card, .crew .polaroid').forEach((el) => {
    el.addEventListener('pointerenter', () => Stage.pauseFps(450), { passive: true });
  });
  // wake the FPS governor for the first couple seconds so html[data-tier=lite]
  // can latch under load — the CSS/IO features never register a rAF driver,
  // so without this the governor is dead code and the lite fallback unreachable.
  if (!Stage.reduce) { const stopFps = Stage.addDriver(() => {}); setTimeout(stopFps, 2200); }
}
/* hero rhythm rotator: the highlighted "week" is deleted and retyped as the other
   cadences Circle Time supports — the hero demonstrates flexibility instead of
   claiming weekly-only. Line 1 is nowrap (.l1) and ends at a hard <br>, so the
   slot grows into its own line-end: the lines below never move and the comma
   rides the word's tip like a carriage. */
/* ===================================================================
   MARGINALIA BALANCER — keeps the doodles evenly spread, forever.

   The collage scraps were hand-placed per section, so every section anyone adds
   lands with bare gutters and the page slowly goes lopsided (before this ran:
   hero ~14 scraps/1000px, zine 6, and kit / bring / group-chat / gifts / long-game
   flat ZERO across ~3,700px of page). Rather than hand-sprinkle each new section
   — which just defers the problem to the next one — measure every section and top
   up whatever is under target.

   Placement is cheap because the gutter rails are viewport-anchored in CSS
   (left: calc(50vw - 601px)), so we only choose a vertical band and a side.
   Injected scraps use the same .cg-scrap markup, so initCollage() gives them
   parallax, the wobble and the scroll entrance for free.
   =================================================================== */
const CG_POOL = [
  // 4-point sparkle
  (c) => `<svg width="42" height="42" viewBox="0 0 42 42" fill="none" stroke="var(--${c})" stroke-width="2.6" stroke-linecap="round"><g class="cg-wob"><path d="M21 5 C23 14 26 17 37 21 C26 25 23 28 21 37 C19 28 16 25 5 21 C16 17 19 14 21 5 Z"/></g></svg>`,
  // fat marker swoosh
  (c) => `<svg width="104" height="30" viewBox="0 0 104 30" fill="none" stroke="var(--${c})" stroke-width="9" stroke-linecap="round"><g class="cg-wob" opacity=".75"><path d="M8 20 C30 8 58 26 82 14 C92 9 100 12 104 16"/></g></svg>`,
  // curved arrow
  (c) => `<svg width="48" height="34" viewBox="0 0 48 34" fill="none" stroke="var(--${c})" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><g class="cg-wob"><path d="M6 24 C16 6 38 6 44 22"/><path d="M44 22 L34 22 M44 22 L42 10"/></g></svg>`,
  // confetti dots
  (c) => `<svg width="34" height="26" viewBox="0 0 34 26" fill="none"><g class="cg-wob"><circle cx="6" cy="14" r="3.2" fill="var(--lazuli)"/><circle cx="17" cy="7" r="2.6" fill="var(--colorado)"/><circle cx="27" cy="17" r="3" fill="var(--schoolbus)"/></g></svg>`,
  // plus
  (c) => `<svg width="38" height="38" viewBox="0 0 38 38" fill="none" stroke="var(--${c})" stroke-width="2.8" stroke-linecap="round"><g class="cg-wob"><path d="M19 6 L19 32 M6 19 L32 19"/></g></svg>`,
  // heart
  (c) => `<svg width="44" height="40" viewBox="0 0 44 40" fill="none" stroke="var(--${c})" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><g class="cg-wob"><path d="M22 36 C10 26 3 18 5 11 C7 4 16 3 22 10 C28 3 37 4 39 11 C41 18 34 26 22 36 Z"/></g></svg>`,
  // curl / squiggle
  (c) => `<svg width="46" height="46" viewBox="0 0 46 46" fill="none" stroke="var(--${c})" stroke-width="2.6" stroke-linecap="round"><g class="cg-wob"><path d="M23 23 C23 18 30 18 30 24 C30 32 17 32 16 23 C15 12 32 11 35 23 C38 37 17 41 11 28"/></g></svg>`,
  // torn tape
  (c) => `<svg width="60" height="26" viewBox="0 0 60 26"><g class="cg-wob"><path class="cg-torn" d="M3 5 L56 3 L58 21 L5 23 Z" fill="var(--${c})" opacity=".75"/></g></svg>`,
];
const CG_INKS = ['colorado', 'lazuli', 'schoolbus', 'grass', 'happy'];

function balanceMarginalia() {
  // While sealed, `main > section:not(.hero)` is display:none — every section measures 0 and
  // there is nothing to balance. Wait for the cut, then top up.
  const root = document.documentElement;
  const ready = () => !root.classList.contains('sealed') || root.classList.contains('revealed');
  if (!ready()) {
    const mo = new MutationObserver(() => {
      if (ready()) { mo.disconnect(); fillGutters(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return;
  }
  fillGutters();
}

function fillGutters() {
  const SCRAPS_PER_1000PX = 5.2;      // matches the density of the hand-tuned sections
  const RAILS = ['cg-gl', 'cg-gr', 'cg-gl2', 'cg-gr2'];
  const sections = document.querySelectorAll('main > section');
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const fresh = [];

  sections.forEach((sec) => {
    // the hero is choreographed with the envelope cut — never touch it
    if (sec.id === 'hero') return;
    // #zine runs a WIDER track (1500px) than the 1150px column the gutter rails are pinned to
    // (left: calc(50vw - 601px)), so anything injected there lands ON the artwork — scraps were
    // appearing inside the maker polaroids. Its own hand-placed collage is enough.
    if (sec.id === 'zine') return;

    const h = sec.offsetHeight;
    if (!h) return;
    const have = sec.querySelectorAll('.cg-scrap').length;
    const want = Math.round((h / 1000) * SCRAPS_PER_1000PX);
    const need = want - have;
    if (need <= 0) return;

    // .cg-collage is position:absolute; inset:0 — it needs a positioned ancestor,
    // and only a few sections declare position:relative in CSS.
    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';

    const layer = document.createElement('div');
    layer.className = 'cg-collage';
    layer.setAttribute('aria-hidden', 'true');

    for (let i = 0; i < need; i++) {
      // one per band, alternating sides, so they never clump
      const band = ((i + 0.5) / need) * 100;
      const top = Math.max(2, Math.min(94, band + rnd(-5, 5)));
      const rail = RAILS[i % 2] + (Math.random() < 0.3 ? '2' : '');
      const s = document.createElement('span');
      s.className = `cg-scrap cg-s${1 + (i % 5)} ${RAILS.includes(rail) ? rail : RAILS[i % 2]}`;
      s.dataset.cgParallax = String(Math.round(rnd(4, 7)));
      s.style.setProperty('--cg-rot', `${rnd(-12, 12).toFixed(1)}deg`);
      s.style.setProperty('--cg-w', `${Math.round(rnd(38, 84))}px`);
      s.style.top = `${top.toFixed(1)}%`;
      s.innerHTML = pick(CG_POOL)(pick(CG_INKS));
      layer.appendChild(s);
      fresh.push(s);
    }
    sec.appendChild(layer);
  });

  // initCollage() already ran at boot and snapshotted its scrap list, so these are not in it.
  // Re-calling it would double-bind the scroll listener; instead just settle them in directly.
  // They keep the CSS wobble; they forgo parallax, which is a nicety nobody will miss.
  if (fresh.length) requestAnimationFrame(() => fresh.forEach((s) => s.classList.add('cg-in')));
}

/* Cycle the reflection quotes. They share one grid cell, so three cost the height of one.
   Pauses on hover/focus so nobody loses a sentence mid-read; under reduced-motion it just
   shows the first and stops. */
/* Maker photos. The polaroids ship with an initial + "photo soon" stamp, and quietly upgrade
   themselves the moment a real photo exists at assets/makers/<handle>.jpg — no markup change, no
   redeploy of anything but the image. Probe, and only swap on a successful decode, so a missing
   file degrades to the placeholder instead of a broken-image icon. */
function initMakerPhotos() {
  document.querySelectorAll('.mpol').forEach((pol) => {
    const handle = (pol.querySelector('.mv-strip b')?.textContent || '').replace('@', '').trim();
    if (!handle) return;
    const ph = pol.querySelector('.mv-ph');
    if (!ph) return;
    const img = new Image();
    img.onload = () => {
      ph.style.backgroundImage = `url("assets/makers/${handle}.jpg")`;
      ph.classList.add('has-photo');            // hides the initial + the "photo soon" stamp
    };
    img.src = `assets/makers/${handle}.jpg`;
  });
}

function initQuotes() {
  const list = document.querySelector('.q-list');
  if (!list) return;
  const qs = Array.prototype.slice.call(list.querySelectorAll('.q'));
  if (qs.length < 2) return;
  if (Stage.reduce) return;

  let i = 0, held = false, timer = null;
  const show = (n) => {
    qs.forEach((q, k) => q.classList.toggle('is-on', k === n));
  };
  const tick = () => {
    if (!held) { i = (i + 1) % qs.length; show(i); }
    timer = setTimeout(tick, 6200);
  };
  const box = list.closest('.quotes');
  ['pointerenter', 'focusin'].forEach((e) => box.addEventListener(e, () => { held = true; }, { passive: true }));
  ['pointerleave', 'focusout'].forEach((e) => box.addEventListener(e, () => { held = false; }, { passive: true }));

  // don't burn a cycle while the section is off screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting && !timer) timer = setTimeout(tick, 6200);
        else if (!e.isIntersecting && timer) { clearTimeout(timer); timer = null; }
      });
    }, { threshold: 0.25 });
    io.observe(box);
  } else {
    timer = setTimeout(tick, 6200);
  }
}

function initHeroRotate() {
  if (Stage.reduce) return;
  const w = document.getElementById('rot-word');
  if (!w) return;
  const WORDS = ['week', 'other week', '2nd Friday', 'month'];
  // the slot breathes between week-wide and 1.75x; anything longer gets
  // typewriter-SQUISHED into 1.75x so line 1 can't overflow the card on phones.
  const inner = document.createElement('span');
  inner.className = 'rw';
  inner.textContent = w.textContent;
  w.textContent = '';
  w.appendChild(inner);
  const baseW = inner.offsetWidth;             // width of 'week'
  const maxW = baseW * 1.75;
  w.style.display = 'inline-block';
  w.style.width = baseW + 'px';
  const fit = () => {
    const nat = inner.offsetWidth;
    const slot = Math.max(baseW, Math.min(nat, maxW));
    w.style.width = slot + 'px';
    inner.style.transform = nat > slot ? 'scaleX(' + (slot / nat) + ')' : 'none';
  };
  const set = (s) => { inner.textContent = s; fit(); };
  let i = 0, t;
  const rest = (word) => (word === 'week' ? 4600 : 2700);
  const del = () => {
    const s = inner.textContent;
    if (s.length) { set(s.slice(0, -1)); t = setTimeout(del, 36 + Math.random() * 28); }
    else { i = (i + 1) % WORDS.length; type(WORDS[i], 0); }
  };
  const type = (word, n) => {
    if (n < word.length) { set(word.slice(0, n + 1)); t = setTimeout(() => type(word, n + 1), 58 + Math.random() * 46); }
    else { w.classList.remove('typing'); t = setTimeout(() => { w.classList.add('typing'); del(); }, rest(word)); }
  };
  const start = () => { t = setTimeout(() => { w.classList.add('typing'); del(); }, rest('week')); };
  // begin only once the envelope is open (or immediately if it never sealed)
  const root = document.documentElement;
  if (!root.classList.contains('sealed') || root.classList.contains('revealed')) start();
  else {
    const mo = new MutationObserver(() => {
      if (root.classList.contains('revealed')) { mo.disconnect(); start(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
}

/* tap the loop's center: "every week" freezes and the ring itself starts to turn.
   Pure toggle — a class swap; CSS owns both animations. Inert under reduced-motion. */
function initHowGag() {
  const loop = document.querySelector('.how-loop');
  const c = loop && loop.querySelector('.how-center');
  if (!c) return;
  c.addEventListener('click', () => loop.classList.toggle('spin-swap'));
}

if (document.readyState !== 'loading') boot();
else document.addEventListener('DOMContentLoaded', boot);

/* ===================================================================
   M1 — Audio engine (Web Audio; gesture-unlocked; OFF by default)
   Browsers block autoplay, so the AudioContext is created/resumed only on
   the first real user gesture. Sound is opt-in (footer toggle, persisted);
   when on, short craft SFX fire on direct interactions. Buffers load lazily.
   Every feature plays through Stage.play(key) → this engine.
   =================================================================== */
function initAudio() {
  const KEYS = ['cut', 'marker', 'rustle', 'snip', 'stamp', 'taperip', 'toggle', 'underline',
    'retrocard1', 'retrocard2', 'retrocard3', 'retropola1', 'retropola2', 'retropola3'];
  const buffers = new Map();
  const pending = new Set();   // keys requested before audio was ready (first-gesture race)
  let ctx = null, loading = null, enabled = false;

  try { enabled = localStorage.getItem('drex-sound') === 'on'; } catch (_) {}

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
    return ctx;
  }

  // The mobile unlock. The phone debug overlay proved the context stayed
  // 'suspended' for the entire cut and resume()'s promise NEVER settled — every
  // SFX deferred forever. A plain tap (a clean click) unlocked it; the scissors
  // (a captured drag with preventDefault) never did. The cross-browser cure is
  // to synchronously START a silent 1-frame source from inside the gesture —
  // even while suspended. On stubborn WebKit/Chromium the context won't flip to
  // 'running' until a source has actually been start()ed from a user gesture;
  // doing so also absorbs the first-sound swallow. Cheap, so fire it on every
  // gesture until the context is confirmed running.
  function unlockNow() {
    if (!ensureCtx()) return;
    try {
      const s = ctx.createBufferSource();
      s.buffer = ctx.createBuffer(1, 1, 22050);
      s.connect(ctx.destination);
      s.start(0);
    } catch (_) {}
    if (ctx.state === 'suspended') { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    if (ctx.state === 'running') stopUnlock();
  }
  function load() {
    if (loading || !ctx) return loading;
    // mp3 first (small, universal), then fall back to ogg if the fetch OR
    // decodeAudioData fails — we ship ogg for every key. Vorbis is software-
    // decoded and consistent across browsers.
    loading = Promise.all(KEYS.map(async (k) => {
      for (const ext of ['mp3', 'ogg']) {
        try {
          const res = await fetch(`assets/audio/${k}.${ext}`);
          if (!res.ok) continue;
          buffers.set(k, await ctx.decodeAudioData(await res.arrayBuffer()));
          return;                                  // decoded — done with this key
        } catch (_) { /* try the next format */ }
      }
    }));
    return loading;
  }
  // Unlock on the END of a gesture (pointerup / touchend / click), not just the
  // start — resume() in pointerdown/touchstart hung on the phone, but the clean
  // click of a tap worked. CAPTURE phase so feature handlers' stopPropagation
  // can't swallow it; keep listening until the context is actually running.
  const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'keydown', 'click'];
  function stopUnlock() { UNLOCK_EVENTS.forEach((ev) => window.removeEventListener(ev, unlock, true)); }
  function unlock() {
    unlockNow();
    if (enabled) load();
  }
  UNLOCK_EVENTS.forEach((ev) =>
    window.addEventListener(ev, unlock, { passive: true, capture: true }));

  function emitChange() { try { window.dispatchEvent(new Event('drexfx:soundchange')); } catch (_) {} }

  // Actually emit the sound. Assumes ctx is running and (for samples) the buffer
  // is decoded — callers gate on that or defer via play().
  function fire(key, opts) {
    if (key === 'crinkle') return synthCrinkle(ctx, opts);   // synthesized paper crinkle (no sample)
    if (key === 'squeak')  return synthSqueak(ctx, opts);    // synthesized felt-tip marker squeak
    if (key === 'fanfare') return synthFanfare(ctx, opts);   // synthesized triumphant arpeggio
    const buf = buffers.get(key);
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = opts.rate ?? (0.94 + Math.random() * 0.12);
    const g = ctx.createGain();
    g.gain.value = opts.gain ?? 0.32;
    src.connect(g).connect(ctx.destination);
    src.start();
  }

  const engine = {
    play(key, opts = {}) {
      if (!enabled || !ctx) return;
      const synth = key === 'crinkle' || key === 'squeak' || key === 'fanfare';
      // Ready right now → fire immediately (the common, warm path).
      if (ctx.state === 'running' && (synth || buffers.has(key))) return fire(key, opts);
      // Not ready: the context is still resuming or the buffer is still decoding.
      // Defer one shot per key and fire once ready; collapsing repeats keeps the
      // rapid drag-snips from bursting all at once. When the context finally hits
      // 'running' (via unlockNow on the gesture release), ALL pending resume()
      // promises settle together, so every deferred SFX fires then.
      if (pending.has(key)) return;
      pending.add(key);
      const resumed = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
      const loaded  = synth ? Promise.resolve() : load();
      Promise.all([resumed, loaded]).then(() => {
        pending.delete(key);
        if (enabled && ctx && ctx.state === 'running') fire(key, opts);
      }).catch(() => pending.delete(key));
    },
    // The envelope cut is a deliberate gesture, so it turns sound ON for the
    // session (unless the visitor has explicitly muted via the footer toggle).
    armForCut() {
      try { if (localStorage.getItem('drex-sound') === 'off') return; } catch (_) {}
      unlockNow(); load();
      if (!enabled) { enabled = true; emitChange(); }
    },
    setEnabled(on) {
      enabled = on;
      try { localStorage.setItem('drex-sound', on ? 'on' : 'off'); } catch (_) {}
      if (on) { unlockNow(); load()?.then(() => engine.play('toggle', { gain: 0.3 })); }
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
    document.querySelectorAll('.showup .card, .doors .card'),
    document.querySelectorAll('.team .head, .doors .head, .showup .head, .showup .pegwall'),
  ];
  const marked = [];

  // The shared observer pre-fires 200px BEFORE an item enters the viewport —
  // perfect for a fade you want primed, wrong for a slam you have to actually
  // watch (it'd play out below the fold and be at rest by the time you got
  // there). Slams get a dedicated observer with a NEGATIVE bottom margin, so a
  // piece only drops once it's genuinely on screen.
  const slamCfg = new Map();
  const slamIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target; slamIO.unobserve(el);
      const cfg = slamCfg.get(el) || { i: 0, hard: false };
      el.style.animationDelay = (cfg.hard ? cfg.i * 120 : cfg.i * 60) + 'ms';   // silent, purely visual; door cards cascade L->R
      el.classList.add('in');
    }
  }, { rootMargin: '0px 0px -18% 0px', threshold: 0.01 });

  groups.forEach((nodes, gi) => nodes.forEach((el, i) => {
    const slam = gi < 2;                         // polaroids + door cards SLAM in; heads just settle
    el.classList.add('reveal');
    marked.push(el);
    if (slam) {
      el.classList.add('slam');
      slamCfg.set(el, { i, hard: gi === 1 });   // door cards (gi 1) hit harder + cascade slower
      slamIO.observe(el);
    } else {
      Stage.observe(el, (e, release) => {
        if (!e.isIntersecting) return;           // gate on visibility only, not ratio
        el.style.transitionDelay = (i * 70) + 'ms';
        el.addEventListener('transitionend', () => { el.style.transitionDelay = ''; }, { once: true });
        el.classList.add('in');
        release();
      });
    }
  }));
  // belt-and-suspenders: reveal any straggler the observer missed — but ONLY if
  // it's already on screen. Force-revealing an OFF-screen slam would burn its
  // one-shot drop before you ever scroll down to it (you'd arrive to find it
  // already at rest). Off-screen items stay observed; the observer fires their
  // slam when they actually enter the viewport.
  setTimeout(() => marked.forEach((el) => {
    if (el.classList.contains('in')) return;
    const r = el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight) el.classList.add('in');
  }), 4000);
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

/* ---- M1 — interaction SFX (no-op until sound is switched on) --------
   Buttons + nav keep the tactile craft foley (stamp / toggle). Door cards
   and team polaroids — which had no click sound — get a retro 90s/edutainment
   blip layer: a random clip from a small per-type family, never repeating the
   previous one, so each click is designed-but-surprising. CC0 (Kenney), see
   assets/audio/CREDITS-retro.txt.
   ONE ordered chain → exactly one sound per tap, and NOTHING tappable is silent:
   photos squeak (a felt-tip skid, paired with the vandal doodle), every torn-paper
   sheet and footer link that used to be mute now blips too. */
function initInteractionSounds() {
  const FAMILIES = {
    card: ['retrocard1', 'retrocard2', 'retrocard3'],
    pola: ['retropola1', 'retropola2', 'retropola3'],
  };
  const last = {};
  function pick(fam) {
    const list = FAMILIES[fam], n = list.length;
    let i = Math.floor(Math.random() * n);
    if (n > 1 && i === last[fam]) i = (i + 1) % n;
    last[fam] = i;
    return list[i];
  }
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.hb-tray a')) Stage.play(pick('card'), { gain: 0.34 });  // hamburger nav links -> 90s blip
    else if (t.closest('.btn')) Stage.play('stamp', { gain: 0.32 });
    else if (t.closest('.mast nav a') || t.closest('footer .links a')) Stage.play('toggle', { gain: 0.24 });
    else if (t.closest('.polaroid .ph, .snap .ph')) {            // a photo got vandalised
      Stage.play('squeak', { gain: 0.17 }); Stage.play(pick('pola'), { gain: 0.22 });
    }
    else if (t.closest('.doors .card')) Stage.play(pick('card'), { gain: 0.3 });
    else if (t.closest('.team .polaroid') || t.closest('.note .snap')) Stage.play(pick('pola'), { gain: 0.26 });
    else if (t.closest('.about .paper, .note .paper, .hero-card')) Stage.play(pick('card'), { gain: 0.22 });
  });
}

/* ===================================================================
   M5 — Photo VANDALISM: tap a photo and a random sharpie doodle scrawls
   straight onto it — moustache, googly eyes, "this one!", a big cross-out,
   a crown. Each mark draws on (stroke wipe), lands in a random marker colour
   at a random spot/tilt/size, and STAYS until reload, so the more you tap the
   more gloriously defaced the photo gets. Marks live in a no-pointer overlay
   that overflows the photo box so a stroke can spill past the edge. Hand-drawn
   irregular paths (no live boil filter — keeps 20+ marks cheap). Sound is
   handled centrally in initInteractionSounds (squeak + a 90s blip per tap).
   Full-motion only; tearing a photo carries its doodles away with it.
   =================================================================== */
function initPhotoVandal() {
  if (Stage.reduce) return;                          // calm/reduced → leave the photos clean
  const PALETTE = ['var(--colorado)', 'var(--ink)', 'var(--grass-deep)', 'var(--lazuli)', 'var(--schoolbus)'];
  const CAP = 24;                                    // per-photo ceiling; oldest recycles out
  const R = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Each mark: a viewBox + inner SVG. Strokes carry pathLength="1" so the CSS
  // draw-on wipes them on regardless of true length. `currentColor` = the chosen marker.
  const MARKS = [
    // scribble scratch-out
    () => ['0 0 100 70', `<path pathLength="1" d="M6 40 Q18 8 30 38 Q42 66 54 36 Q66 8 78 40 Q90 64 96 34"/><path pathLength="1" d="M8 52 Q22 26 36 52 Q50 76 64 50 Q78 26 92 50"/>`, 3.2],
    // big X cross-out
    () => ['0 0 100 100', `<path pathLength="1" d="M14 16 L86 86"/><path pathLength="1" d="M86 18 L16 84"/>`, 4.2],
    // circle + "this one!" arrow
    () => ['0 0 120 90', `<path pathLength="1" d="M60 18 C24 14 14 60 44 70 C82 82 96 36 64 22 C52 17 40 22 40 22"/><path pathLength="1" d="M70 70 q22 6 34 -8"/><path pathLength="1" d="M96 56 l10 8 -12 8"/>`, 3],
    // moustache
    () => ['0 0 120 50', `<path pathLength="1" d="M60 14 C58 26 50 30 44 28 C30 24 20 30 14 40 C26 36 36 40 44 36 C54 31 58 22 60 14 C62 22 66 31 76 36 C84 40 94 36 106 40 C100 30 90 24 76 28 C70 30 62 26 60 14Z"/>`, 2.6],
    // nerd glasses
    () => ['0 0 130 60', `<circle pathLength="1" cx="36" cy="34" r="20"/><circle pathLength="1" cx="94" cy="34" r="20"/><path pathLength="1" d="M56 30 q9 -8 18 0"/><path pathLength="1" d="M16 28 l-12 -8"/><path pathLength="1" d="M114 28 l12 -8"/>`, 3.4],
    // devil horns
    () => ['0 0 120 60', `<path pathLength="1" d="M20 56 C8 36 10 14 26 6 C24 24 30 40 44 50"/><path pathLength="1" d="M100 56 C112 36 110 14 94 6 C96 24 90 40 76 50"/>`, 3.6],
    // halo
    () => ['0 0 120 50', `<ellipse pathLength="1" cx="60" cy="26" rx="42" ry="14"/>`, 3.4],
    // crown
    () => ['0 0 120 60', `<path pathLength="1" d="M14 52 L24 14 L44 38 L60 10 L76 38 L96 14 L106 52 Z"/>`, 3.6],
    // googly eyes (filled sclera + pupil — pop in, no wipe)
    () => ['0 0 120 60', `<g class="googly"><circle cx="40" cy="30" r="22" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><circle cx="${~~R(32,48)}" cy="${~~R(24,38)}" r="9" fill="var(--ink)"/><circle cx="84" cy="30" r="22" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><circle cx="${~~R(76,92)}" cy="${~~R(24,38)}" r="9" fill="var(--ink)"/></g>`, 0],
    // sparkle burst
    () => ['0 0 110 90', `<path pathLength="1" d="M30 46 L34 28 L38 46 L56 50 L38 54 L34 72 L30 54 L12 50 Z"/><path pathLength="1" d="M78 26 L81 14 L84 26 L96 29 L84 32 L81 44 L78 32 L66 29 Z"/><path pathLength="1" d="M82 64 L84 56 L86 64 L94 66 L86 68 L84 76 L82 68 L74 66 Z"/>`, 2.6],
    // word stamp
    () => { const word = pick(['ICON!', 'YES', 'COOL', 'A STAR', 'THE ONE', 'LEGEND']);
      return ['0 0 160 60', `<text x="80" y="44" text-anchor="middle" font-family="var(--f-hand)" font-size="46" fill="currentColor" stroke="none" transform="rotate(-4 80 30)">${word}</text>`, 0]; },
    // exclamations
    () => ['0 0 70 80', `<path pathLength="1" d="M22 8 L18 50"/><circle cx="17" cy="66" r="3.5" fill="currentColor" stroke="none"/><path pathLength="1" d="M52 8 L48 50"/><circle cx="47" cy="66" r="3.5" fill="currentColor" stroke="none"/>`, 5],
    // heart
    () => ['0 0 100 90', `<path pathLength="1" d="M50 78 C12 50 8 24 28 16 C42 10 50 26 50 30 C50 26 58 10 72 16 C92 24 88 50 50 78 Z"/>`, 3.4],
  ];

  function layerFor(fig) {
    let layer = fig.querySelector(':scope > .vandal-layer');
    if (layer) return layer;
    const ph = fig.querySelector(':scope > .ph');
    if (!ph) return null;
    layer = document.createElement('div');
    layer.className = 'vandal-layer';
    // pin to the photo box within the figure (ph.offsetParent === fig; both position:relative)
    layer.style.left = ph.offsetLeft + 'px';
    layer.style.top = ph.offsetTop + 'px';
    layer.style.width = ph.offsetWidth + 'px';
    layer.style.height = ph.offsetHeight + 'px';
    fig.appendChild(layer);
    return layer;
  }

  function scrawl(fig) {
    if (fig.dataset.torn != null) return;            // a torn photo is on its way out — don't draw
    const layer = layerFor(fig);
    if (!layer) return;
    const [vb, inner, sw] = pick(MARKS)();
    const wrap = document.createElement('div');
    wrap.className = 'sharpie';
    wrap.style.setProperty('--vc', pick(PALETTE));
    wrap.style.setProperty('--vr', R(-26, 26).toFixed(1) + 'deg');
    wrap.style.setProperty('--vs', R(0.7, 1.25).toFixed(2));
    wrap.style.left = R(18, 82).toFixed(1) + '%';
    wrap.style.top = R(20, 80).toFixed(1) + '%';
    wrap.innerHTML = `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="${sw}" ` +
      `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
    layer.appendChild(wrap);
    while (layer.children.length > CAP) layer.firstChild.remove();   // recycle the oldest
  }

  document.querySelectorAll('.polaroid, .snap').forEach((fig) => {
    fig.addEventListener('click', (e) => {
      if (e.target.closest('a,button,input,textarea,select,label')) return;   // let real controls work
      scrawl(fig);
    });
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

/* ============================================================
   VOLCANO - on cut, the page's own marginalia ERUPTS upward out
   of the slit: dense ballistic doodle particles, depth-layered,
   one rAF physics loop, transform-only, self-cleaning overlay.
   ============================================================ */
function spawnVolcano(seam){
  if (!seam) return;
  if (Stage.reduce) return;                          // site's reduced-motion contract (primary gate)
  if (window.__volcanoFired) return;                 // one eruption per page load
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // belt

  var src = document.querySelectorAll('.cg-collage .cg-scrap svg');
  if (!src.length) return;
  window.__volcanoFired = true;
  var pool = [];
  for (var s = 0; s < src.length; s++){
    var c = src[s].cloneNode(true);
    c.removeAttribute('aria-hidden');
    var fil = c.querySelectorAll('[filter]');
    for (var f = 0; f < fil.length; f++) fil[f].removeAttribute('filter');
    pool.push(c);
  }

  var r  = seam.getBoundingClientRect();
  var x0 = r.left, w = Math.max(1, r.width), cx = r.left + w / 2;
  var y0 = r.top + r.height / 2;

  var layer = document.createElement('div');
  layer.className = 'vol-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);

  var small = innerWidth < 760 || matchMedia('(pointer:coarse)').matches;
  var N       = small ? 90 : 170;
  var EMIT_MS = 620;

  var parts = [], spawned = 0, t0 = performance.now(), last = t0, raf = 0;

  function birth(){
    var bit = document.createElement('span');
    bit.className = 'vol-p';
    bit.appendChild(pool[(Math.random() * pool.length) | 0].cloneNode(true));
    var sx    = x0 + Math.random() * w;
    var edge  = (sx - cx) / (w / 2);
    var depth = Math.random();
    layer.appendChild(bit);
    parts.push({
      el: bit,
      x:  sx,
      y:  y0 + (Math.random() * 10 - 5),
      vx: edge * (150 + Math.random() * 240) + (Math.random() - 0.5) * 300,
      vy: -(900 + depth * 650 + Math.random() * 350),
      g:  2400 + Math.random() * 420,
      drag: 0.992,
      rot: Math.random() * 360,
      vr:(Math.random() - 0.5) * 920,
      sc: 0.5 + depth * 0.9,
      op: 0.6 + depth * 0.4,
      born: performance.now(),
      life: 1.8 + Math.random() * 1.0
    });
  }

  function tick(now){
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    var elapsed = now - t0;

    if (spawned < N){
      var want = Math.ceil(N * Math.min(1, Math.pow(elapsed / EMIT_MS, 0.55)));
      if (want > N) want = N;
      while (spawned < want){ birth(); spawned++; }
    }

    var alive = 0;
    for (var i = 0; i < parts.length; i++){
      var p = parts[i]; if (!p.el) continue;
      var age = (now - p.born) / 1000;
      p.vy += p.g * dt; p.vx *= p.drag;
      p.x  += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      if (age >= p.life || p.y > innerHeight + 90){ p.el.remove(); p.el = null; continue; }
      var rem = p.life - age;
      var o = (age < 0.06 ? age / 0.06 : (rem < 0.6 ? rem / 0.6 : 1)) * p.op;
      p.el.style.opacity = o.toFixed(2);
      p.el.style.transform =
        'translate(-50%,-50%) translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0) rotate(' +
        p.rot.toFixed(1) + 'deg) scale(' + p.sc.toFixed(2) + ')';
      alive++;
    }

    if ((alive > 0 || spawned < N) && elapsed < 4200){ raf = requestAnimationFrame(tick); }
    else layer.remove();
  }
  raf = requestAnimationFrame(tick);

  setTimeout(function(){
    if (layer.isConnected){ cancelAnimationFrame(raf); layer.remove(); }
  }, 4500);
}

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
    { const _cc = document.querySelector('.card-clip'); _cc.style.height = ''; _cc.style.minHeight = ''; }   // release the centering clamp: the card rises to its NATURAL rest (clamp is shorter than the card, so keeping it overflows the card off-screen)
    { const _stage = document.querySelector('.reel-stage');   // keep the reel's emerge clip glued to the card's mask line through the post-cut reflow
      if (_stage) { const _t0 = performance.now(); (function track(now){ if (env.classList.contains('done')) return; const cc = document.querySelector('.card-clip'); if (cc) _stage.style.setProperty('--reel-clip', (cc.getBoundingClientRect().bottom - _stage.getBoundingClientRect().top) + 'px'); if (now - _t0 < 800) requestAnimationFrame(track); })(performance.now()); } }
    spawnVolcano(seam);                               // marginalia ERUPTS upward out of the slit
    Stage.play('rustle', { gain: 0.34 });            // paper shuffle as it comes up
    setTimeout(() => Stage.play('rustle', { gain: 0.18, rate: 1.12 }), 190);
    setTimeout(() => { env.classList.add('done', 'lit-shadow'); }, 780);   // unclip ONLY after both papers cleared the slit; hard shadow pops
    setTimeout(() => {                               // BEAT 3+4: card-settle + reel-settle, tight on the emerge's heels
      root.classList.add('revealed');               // margin-top reverts (card drop) + reel-settle fires
      Stage.play('rustle', { gain: 0.16, rate: 0.95 });
      const cc = document.querySelector('.card-clip');   // smoothly animate the pocket collapse (CSS can't transition the JS-set px height)
      if (cc) {
        const from = cc.getBoundingClientRect().height;
        cc.style.height = ''; cc.style.minHeight = '';
        const to = cc.getBoundingClientRect().height;
        cc.style.height = from + 'px'; void cc.offsetHeight;          // lock 'from', force reflow
        cc.style.transition = 'height .46s cubic-bezier(.33,1,.4,1)';
        cc.style.height = to + 'px';
        const clr = () => { cc.style.height = ''; cc.style.minHeight = ''; cc.style.transition = ''; cc.removeEventListener('transitionend', clr); };
        cc.addEventListener('transitionend', clr); setTimeout(clr, 560);   // fallback clear
      }
    }, 800);
    setTimeout(() => { env.classList.add('lit-tape'); Stage.play('taperip', { gain: 0.3 }); }, 880);
    setTimeout(() => { env.classList.add('lit-hl');  Stage.play('marker',  { gain: 0.32 }); }, 1000);
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
    audio && audio.armForCut();                       // unlock on the RELEASE too — the global
                                                      // listener can miss a captured pointer's
                                                      // pointerup, and the clean release is what
                                                      // actually wakes audio on stubborn mobile.
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

  /* ---- auto-cut: rescue a visitor who never grabs the scissors ----
     The sealed hero is near-blank; if nobody cuts, the pitch never shows. So after a short
     idle, or on the first scroll intent, sweep the blades across and open it ourselves. Any
     deliberate grab wins (we never fight a cut in progress). Silent by design: the audio
     engine only arms on the real gesture, so no snip/tear plays here. Reduced-motion never
     reaches this code (the sealed path returns early above), so it's exempt automatically. */
  let autoArmed = false, idleTimer = 0;
  function autoCut() {
    if (autoArmed || done || cutting || cutMax > 0) return;   // swept already / opened / user cutting
    autoArmed = true; clearTimeout(idleTimer);
    const t0 = performance.now(), DUR = 720;                  // a visible sweep, not a snap
    const stop = Stage.addDriver(() => {
      if (done || cutting) { stop(); return; }                // a real grab takes over
      const f = Math.min(1, (performance.now() - t0) / DUR);
      setX(f); advance(f);                                    // advance() fires complete() at ~.97
      if (f >= 1 || done) stop();
    });
  }
  idleTimer = setTimeout(autoCut, 3200);                      // ~3.2s of no interaction
  seam.addEventListener('pointerdown', () => {                // a deliberate grab disarms the idle timer
    autoArmed = true; clearTimeout(idleTimer);
  }, { once: true });
  ['wheel', 'touchmove', 'scroll'].forEach((ev) =>            // first scroll intent — wheel/touch fire
    addEventListener(ev, autoCut, { once: true, passive: true }));   // even when a sealed page can't scroll
  (window.__drexCrit = window.__drexCrit || {}).autoCut = autoCut;   // QA hook

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
   M4 — Founder's note: click-to-unfold 3D paper crumple.
   The note sits as a crumpled paper ball; clicking it unfurls the sheet —
   its own captured pixels, lit and hard-creased — at 24fps with a paper
   crinkle, then hands back to the live DOM note (selectable, accessible).
   Three.js + the DOM-capture lib load LAZILY, only when the note nears view.
   Skipped under reduced-motion / calm / lite / no-WebGL; ANY failure leaves
   the plain flat note untouched. Sound routes through the opt-in audio engine
   (the click arms sound for the session, like the envelope cut — unless muted).
   =================================================================== */

// Synthesized paper crinkle (no audio asset). Played via Stage.play('crinkle').
function synthCrinkle(ctx, opts = {}) {
  const now = ctx.currentTime;
  const dur = 0.07 + Math.random() * 0.10;
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  const atk = Math.max(1, Math.floor(n * 0.12));            // soft attack -> no click-y digital onset
  for (let i = 0; i < n; i++) {
    const decay = Math.pow(1 - i / n, 1.5);
    const attack = i < atk ? i / atk : 1;
    const pop = Math.random() < 0.03 ? (Math.random() * 2 - 1) * 0.7 : (Math.random() * 2 - 1) * 0.13;
    d[i] = pop * decay * attack;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 240 + Math.random() * 180;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2300 + Math.random() * 1200; lp.Q.value = 0.4;
  const g = ctx.createGain(); g.gain.value = (opts.gain ?? 0.20) * (0.75 + Math.random() * 0.5);
  src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(ctx.destination);
  src.start(now); src.stop(now + dur);
}

// Synthesized felt-tip marker squeak (no audio asset). Played via Stage.play('squeak')
// when a photo gets vandalised. A short band-passed noise scrubbing up/down in pitch —
// the rubbery skid of a sharpie dragged across glossy paper. Randomised so no two land alike.
function synthSqueak(ctx, opts = {}) {
  const now = ctx.currentTime;
  const dur = 0.10 + Math.random() * 0.09;
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  const atk = Math.max(1, Math.floor(n * 0.10));
  for (let i = 0; i < n; i++) {
    const attack = i < atk ? i / atk : 1;
    const decay = Math.pow(1 - i / n, 1.2);
    d[i] = (Math.random() * 2 - 1) * decay * attack;
  }
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 7 + Math.random() * 6;
  const f0 = 900 + Math.random() * 700, f1 = f0 * (1.7 + Math.random() * 1.1);   // scrub upward
  bp.frequency.setValueAtTime(f0, now);
  bp.frequency.linearRampToValueAtTime(f1, now + dur * 0.6);
  bp.frequency.linearRampToValueAtTime(f0 * 1.2, now + dur);
  const g = ctx.createGain(); g.gain.value = (opts.gain ?? 0.16) * (0.8 + Math.random() * 0.4);
  src.connect(bp); bp.connect(g); g.connect(ctx.destination);
  src.start(now); src.stop(now + dur);
}

// Synthesized triumphant fanfare (no audio asset). Played via Stage.play('fanfare')
// the moment the finale reveal lands. A bright ascending major arpeggio (root-3-5-octave)
// on a soft saw, each note plucked with a quick decay — celebratory but still hand-made.
function synthFanfare(ctx, opts = {}) {
  const now = ctx.currentTime;
  const base = (opts.gain ?? 0.30);
  const root = 392;                                  // G4 — warm, not shrill
  const steps = [1, 5 / 4, 3 / 2, 2, 5 / 2];          // root · maj3 · 5 · octave · maj3-up
  steps.forEach((mult, i) => {
    const t = now + i * 0.085;
    const f = root * mult;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth'; o1.frequency.value = f;
    const o2 = ctx.createOscillator(); o2.type = 'triangle'; o2.frequency.value = f * 2;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = ctx.createGain();
    const peak = base * (i === steps.length - 1 ? 1.15 : 0.9);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(ctx.destination);
    o1.start(t); o2.start(t); o1.stop(t + 0.45); o2.stop(t + 0.45);
  });
}

// Lock vw/clamp metrics to computed px so the SVG-foreignObject capture reflows
// pixel-identically to the live note (pinning px = computed is layout-neutral live).
const CRUMPLE_FREEZE = ['fontSize', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom',
  'paddingLeft', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'rowGap', 'columnGap',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];
function crumpleFreeze(root) {
  const undo = [];
  [root, ...root.querySelectorAll('*')].forEach((el) => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    undo.push([el, el.getAttribute('style')]);
    el.style.boxSizing = 'border-box';
    CRUMPLE_FREEZE.forEach((p) => { el.style[p] = cs[p]; });
    if (cs.display !== 'inline') { el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; }
  });
  return () => undo.forEach(([el, s]) => s === null ? el.removeAttribute('style') : el.setAttribute('style', s));
}

const CRUMPLE_NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
float snoise(vec2 v){
  const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx);
  vec2 i1=(x0.x>x0.y)?vec2(1.0,0.0):vec2(0.0,1.0);
  vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
  vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
  vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0); m=m*m; m=m*m;
  vec3 x=2.0*fract(p*C.www)-1.0; vec3 h=abs(x)-0.5; vec3 ox=floor(x+0.5); vec3 a0=x-ox;
  m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
  vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.0*dot(m,g);
}`;
const CRUMPLE_VERT = CRUMPLE_NOISE + `
uniform float uT; varying vec2 vUv; varying vec3 vViewPos; varying float vT;
float fold(vec2 p){
  float v=0.0, amp=1.0, tot=0.0, f=1.0;
  for(int i=0;i<3;i++){ float n=snoise(p*f+float(i)*17.3); v+=amp*(abs(n)*2.0-1.0); tot+=amp; amp*=0.5; f*=2.0; }
  return v/tot;
}
vec3 crumple(vec2 p, float t){
  vec2 xy=p*(1.0-0.45*t);
  xy+=vec2(fold(p*1.2+5.0), fold(p*1.2-5.0))*0.10*t;
  float r=length(p); float env=(0.16-r*r*0.24);
  float z=(env+fold(p*1.5+9.0)*0.55)*t;
  return vec3(xy,z);
}
void main(){ vUv=uv; vT=uT; vec3 P=crumple(position.xy,uT); vec4 mv=modelViewMatrix*vec4(P,1.0); vViewPos=mv.xyz; gl_Position=projectionMatrix*mv; }`;
const CRUMPLE_FRAG = `
precision highp float;
uniform sampler2D uTex; varying vec2 vUv; varying vec3 vViewPos; varying float vT;
void main(){
  vec3 albedo=texture2D(uTex,vUv).rgb;
  vec3 N=normalize(cross(dFdx(vViewPos),dFdy(vViewPos)));   // flat shading -> hard facets
  if(N.z<0.0) N=-N;
  if(!gl_FrontFacing) albedo=mix(albedo,vec3(0.95,0.92,0.84),0.7);   // blank paper underside
  vec3 L=normalize(vec3(0.35,0.55,0.75));
  float lam=clamp(dot(N,L),0.0,1.0);
  float light=0.5+0.74*lam;
  vec3 H=normalize(L+vec3(0.0,0.0,1.0));
  float spec=pow(max(dot(N,H),0.0),20.0)*0.07;
  float shade=light+spec;
  shade=mix(1.0,shade,smoothstep(0.0,0.10,vT));            // at rest -> flat albedo == DOM note
  gl_FragColor=vec4(albedo*shade,1.0);
}`;

function initFounderCrumple() {
  if (Stage.reduce || !('IntersectionObserver' in window)) return;   // calm/reduced -> flat note
  const paper = document.querySelector('#founder .paper');
  if (!paper) return;
  let started = false;
  // Dedicated wide-margin observer: load + build well BEFORE the note is on screen,
  // so it's already crumpled when it scrolls in (no flat->crumple flash).
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting || started) continue;
      if (document.documentElement.dataset.tier === 'lite') { io.disconnect(); return; }  // weak device -> flat note
      started = true; io.disconnect();
      bootFounderCrumple(paper).catch(() => {});      // any failure: leave the plain note
    }
  }, { rootMargin: '800px 0px' });
  io.observe(paper);
}

// Lazy-load three + modern-screenshot ONCE (esm.sh caches; the finale reuses this).
let _crumpleLibs = null;
function loadCrumpleLibs() {
  if (!_crumpleLibs) _crumpleLibs = Promise.all([
    import('https://esm.sh/three@0.160.0'),
    import('https://esm.sh/modern-screenshot@4'),
  ]);
  return _crumpleLibs;
}

async function bootFounderCrumple(paper) {
  const img = paper.querySelector('img');
  if (img && !img.complete) { img.loading = 'eager'; await new Promise((r) => { img.onload = r; img.onerror = r; }); }
  await document.fonts.ready;
  const [THREE, ms] = await loadCrumpleLibs();
  const domToCanvas = ms.domToCanvas;

  // capture the note (vw-frozen) -> WebGL texture
  const unfreeze = crumpleFreeze(paper);
  const texCanvas = await domToCanvas(paper, { scale: 2, backgroundColor: null });
  unfreeze();

  const rect = paper.getBoundingClientRect();
  const W = rect.width, H = rect.height, aspect = W / H;

  let box = null, host = null, R = null;
  try {
    // tight box so the overlay matches the note's border-box 1:1 (no swap snap)
    box = document.createElement('div');
    box.style.cssText = 'position:relative;display:block';
    paper.parentElement.insertBefore(box, paper);
    box.appendChild(paper);
    host = document.createElement('div');
    host.className = 'crumple-host';
    box.appendChild(host);

    R = new THREE.WebGLRenderer({ alpha: true, antialias: true });   // throws if WebGL unavailable -> caught
    R.outputColorSpace = THREE.SRGBColorSpace;
    R.setPixelRatio(Math.min(devicePixelRatio, 2));
    R.setSize(W, H);
    const glCanvas = R.domElement;
    glCanvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    host.appendChild(glCanvas);

    const scene = new THREE.Scene();
    const fov = 35;
    const cam = new THREE.PerspectiveCamera(fov, aspect, 0.01, 100);
    cam.position.set(0, 0, 0.5 / Math.tan(THREE.MathUtils.degToRad(fov) / 2));

    const tex = new THREE.CanvasTexture(texCanvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const uniforms = { uT: { value: 1 }, uTex: { value: tex } };
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(aspect, 1, 80, 80),
      new THREE.ShaderMaterial({ vertexShader: CRUMPLE_VERT, fragmentShader: CRUMPLE_FRAG, uniforms,
        side: THREE.DoubleSide, extensions: { derivatives: true } })
    );
    scene.add(mesh);

    let raf = 0;
    const setT = (t) => { uniforms.uT.value = t; R.render(scene, cam); };
    setT(1);
    paper.style.visibility = 'hidden';        // only NOW hide the DOM note (everything above succeeded)

    function swapToDom() {
      paper.style.visibility = '';
      glCanvas.style.transition = 'opacity .38s ease';
      glCanvas.style.opacity = '0';
      setTimeout(() => host.remove(), 440);
    }
    const STEP = 1000 / 24;                    // 24fps cinema
    const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    function animate(from, to, dur) {
      cancelAnimationFrame(raf);
      const t0 = performance.now(); let lastQ = -1, lastSnd = -1e9;
      (function fr(now) {
        let p = (now - t0) / dur; if (p > 1) p = 1;
        const q = Math.floor((now - t0) / STEP);
        if (q !== lastQ) { lastQ = q; const pq = Math.min(q * STEP / dur, 1); setT(from + (to - from) * ease(pq)); }
        if (now - lastSnd > 70) { lastSnd = now; Stage.play('crinkle'); if (Math.random() < 0.5) Stage.play('crinkle'); }
        if (p < 1) raf = requestAnimationFrame(fr);
        else { setT(to); if (to <= 0.001) swapToDom(); }
      })(performance.now());
    }

    // "click to unfold" affordance (focusable button = keyboard accessible)
    let activated = false;
    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'crumple-hint';
    hint.textContent = 'click to unfold';
    hint.setAttribute('aria-label', 'Unfold the founder’s note');
    host.appendChild(hint);
    function activate() {
      if (activated) return; activated = true;
      hint.remove(); host.style.cursor = 'default';
      Stage.armSound();                        // deliberate gesture -> sound on for the session (unless muted)
      animate(1, 0, 1500);
    }
    host.addEventListener('click', activate);
    hint.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });
  } catch (err) {
    // restore the plain note on any failure (incl. no-WebGL)
    paper.style.visibility = '';
    if (host) host.remove();
    if (box && box.parentElement) { box.parentElement.insertBefore(paper, box); box.remove(); }
    try { R?.dispose?.(); } catch (_) {}
    throw err;
  }
}

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

  // ---- "tore off EVERYTHING" tracking → the finale ----
  // A piece counts as gone when it's torn (data-torn) OR it left the DOM riding a
  // torn parent (e.g. .snap inside .note .paper). When every armed piece is gone —
  // and at least one was actually torn — we fire drexfx:cleared once.
  const armed = [];
  let tornAny = false, finaleFired = false;

  // Stash a snapshot of the INTACT collage the instant tearing begins, so the
  // finale can crumple the whole recognizable site (by the time every piece is
  // gone, the live DOM is an empty husk). Deferred to idle so the grab never janks.
  // Re-grab on EVERY pull (not just the first) so finaleShot tracks the viewport
  // you're actually looking at as you tear your way down the page — otherwise the
  // finale crumples wherever you happened to start. `capturing` coalesces overlaps;
  // the last successful grab before the finale fires wins.
  let capturing = false;
  function captureSite() {
    if (finaleFired || capturing) return;
    capturing = true;
    const go = () => {
      Stage.pauseFps(2500);                                  // domToCanvas stalls a frame — don't let it demote us to lite
      loadCrumpleLibs().then(([, ms]) => {
        const bg = getComputedStyle(document.body).backgroundColor || '#FEF6E4';
        const sx = scrollX, sy = scrollY;                      // the viewport you're looking at RIGHT NOW
        const skip = (n) => {
          if (!n || !n.classList) return true;                 // text nodes etc → keep
          if (n.id && /^finale-/.test(n.id)) return false;
          if (n.classList.contains('tape-fall')) return false;
          if (n.dataset && n.dataset.torn != null) return false;   // already-torn piece
          return true;
        };
        // photograph the whole page, then CROP to just the screen you're looking at,
        // so the finale crumples the active viewport (not the whole long document).
        return ms.domToCanvas(document.body, { scale: 1, backgroundColor: bg, filter: skip }).then((full) => {
          const W0 = Math.max(1, innerWidth), H0 = Math.max(1, innerHeight);
          const cv = document.createElement('canvas'); cv.width = W0; cv.height = H0;
          const g = cv.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, W0, H0);
          g.drawImage(full, -sx, -sy);
          return cv;
        });
      }).then((cv) => { if (cv) finaleShot = cv; }).catch(() => {}).finally(() => { capturing = false; });
    };
    (window.requestIdleCallback || ((f) => setTimeout(f, 1)))(go, { timeout: 1000 });
  }

  function checkCleared() {
    if (finaleFired || !tornAny || !armed.length) return;
    if (armed.every((el) => el.dataset.torn != null || !el.isConnected)) {
      finaleFired = true;
      try { window.dispatchEvent(new Event('drexfx:cleared')); } catch (_) {}
    }
  }

  function arm(el) {
    if (!el || el.dataset.tearable != null) return;    // skip if missing / already armed
    if (!el.querySelector(':scope > .tape, :scope > .hero-clip')) return;   // only pieces held by tape (.hero-clip is the reel's washi tape)
    el.dataset.tearable = '';
    // images are draggable by default — without this, grabbing a polaroid/snap photo
    // starts the browser's native image drag (the ghost) and steals the tear gesture.
    el.querySelectorAll('img').forEach((img) => { img.draggable = false; });
    el.addEventListener('dragstart', (e) => e.preventDefault());
    armed.push(el);
    armPiece(el);
  }

  document.querySelectorAll(
    '.about .paper, .note .paper, .note .snap, .team .polaroid, .doors .card'
  ).forEach(arm);

  // The hero card hides behind the envelope cut. Arm it only once the cut sequence
  // has fully settled (envelope.done) so tearing can never disrupt the reveal — and
  // by then the pocket is overflow:visible, so the fall isn't clipped.
  const hero = document.querySelector('.hero-card');
  const reel = document.querySelector('.hero-reel');
  const env = document.getElementById('envelope');
  if (env) {
    const armPostCut = () => { arm(hero); arm(reel); };   // both emerge from the slit → arm after the cut settles, count in the finale
    if (!document.documentElement.classList.contains('sealed')) {
      armPostCut();                                    // already shown (no seal)
    } else {
      const mo = new MutationObserver(() => {
        if (env.classList.contains('done')) { mo.disconnect(); armPostCut(); }
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
      captureSite();                          // first real pull → stash the intact site for the finale
      try { el.setPointerCapture(pid); } catch (_) {}
      el.classList.add('tearing');
      el.style.transition = 'none';
    }

    function onMove(e) {
      if (done || !grabbing || e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!pulling) {
        if (Math.hypot(dx, dy) < SLOP) return;
        // touch: a mostly-vertical drag (EITHER direction) is a page scroll, not a
        // pull — bow out before committing so scrolling never tears a piece or
        // fires a sound. Tearing on touch wants a sideways/diagonal pull.
        if (e.pointerType === 'touch' && Math.abs(dy) > Math.abs(dx)) { teardown(); return; }
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
      captureSite();                          // safety net for programmatic tears (__tear/tearAll)
      teardown(true);
      try { navigator.vibrate && navigator.vibrate([7, 22, 13]); } catch (_) {}   // haptic rip
      Stage.play('taperip', { gain: 0.42 });
      setTimeout(() => Stage.play('rustle', { gain: 0.22, rate: 0.9 }), 90);
      el.dataset.torn = '';
      tornAny = true;
      flyTape();
      fallPaper(dx, dy, vx0, vy0, rot0);
      checkCleared();                    // last piece torn? (resolves again once it's removed)
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
          checkCleared();                    // removal may take a child .snap with it
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
    // stash the intact-site snapshot FIRST, then tear once it's ready (so the
    // finale ball is the whole site, not the empty husk a synchronous loop leaves)
    tearAll: () => {
      captureSite();
      let waited = 0;
      const t = setInterval(() => {
        waited += 120;
        if (finaleShot || waited > 2600) {
          clearInterval(t);
          armed.forEach((el) => { if (el.dataset.torn == null && el.isConnected) el.__tear?.(); });
        }
      }, 120);
    },
  };
}

/* ===================================================================
   PORTED FEATURES — collage / mobile burger / attention CTA
   Re-ported from feat/collage-sound. Each was a standalone IIFE; here
   they are named inits wired into boot(). Sound module omitted (app.js
   already implements marker/highlighter draw-on + footer sound toggle).
   =================================================================== */
function initCollage(){
  var scraps = Array.prototype.slice.call(document.querySelectorAll('.cg-scrap'));
  if (!scraps.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    scraps.forEach(function (s) { s.classList.add('cg-in'); });
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('cg-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    scraps.forEach(function (s) { io.observe(s); });
  } else {
    scraps.forEach(function (s) { s.classList.add('cg-in'); });
  }

  if (!reduce) {
    var px = scraps.filter(function (s) { return s.hasAttribute('data-cg-parallax'); });
    if (px.length) {
      var ticking = false;
      var vh = window.innerHeight || document.documentElement.clientHeight;
      function apply() {
        ticking = false;
        var mid = vh / 2;
        for (var i = 0; i < px.length; i++) {
          var s = px[i];
          var r = s.getBoundingClientRect();
          var center = r.top + r.height / 2;
          var rel = (center - mid) / mid;
          if (rel < -1.4 || rel > 1.4) continue;
          var depth = parseFloat(s.getAttribute('data-cg-parallax')) || 6;
          var offset = (-rel * depth).toFixed(2);
          s.style.setProperty('--cg-py', offset + 'px');
        }
      }
      function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(apply); } }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', function () {
        vh = window.innerHeight || document.documentElement.clientHeight; onScroll();
      }, { passive: true });
      apply();
    }
  }

  // ---- seam-burst origins + deferred reel load ----
  // The hero collage (.cg-burst) erupts out of the slit on the cut. We measure each
  // scrap's RESTING centre vs the slit centre once at env.done and write the additive
  // origin (--bx/--by); then arm .cg-burst-armed to collapse every scrap to a zero-size
  // dot ON the slit. All of this happens while the scraps are still opacity:0 (sealed,
  // pre-reveal), so the collapse snap is invisible. At html.revealed the collapse rule
  // stops matching and the existing .cg-in rest rule + transition interpolate slit->gutter.
  // This code writes ONLY custom props + the iframe src — never the `transform` property —
  // so it can never fight the parallax loop above (both feed additive terms into one translate()).
  var burstCs = Array.prototype.slice.call(document.querySelectorAll('.cg-collage.cg-burst'));
  var env    = document.getElementById('envelope');
  var seam   = document.getElementById('cutgate');
  var reel   = document.querySelector('.hero-reel .reel-ig');

  function liftReel(){ if (reel && reel.dataset.src && reel.src !== reel.dataset.src) reel.src = reel.dataset.src; }

  // Hide the decorative play cue once the visitor engages IG's inline player.
  // :hover (desktop) + :focus-within (CSS) cover most cases; this catches the rest:
  // clicking INTO the cross-origin iframe blurs the parent window and makes the iframe
  // the activeElement — a reliable signal to drop the cue so it never sits over playback.
  if (reel) {
    var reelWin = reel.closest('.reel-window');
    window.addEventListener('blur', function () {
      if (reelWin && document.activeElement === reel) reelWin.classList.add('reel-playing');
    }, { passive: true });
    // the embed is pointer-events:none by default (so the whole polaroid is tear/drag-able);
    // a TAP on the reel opts into playback by making IG's iframe interactive. A real tear is
    // a drag, which suppresses the click, so this only fires on a genuine tap (not a tear).
    if (reelWin) reelWin.addEventListener('click', function () { reelWin.classList.add('reel-playing'); });
  }

  // Measure every burst container (desktop gutter burst + the mobile foreground
  // confetti burst) in one batched pass — set each scrap to rest, one reflow,
  // measure all, arm all to slit dots, then re-enable the transition next frame.
  function armBurst(){
    if (!burstCs.length || !seam) return;
    burstCs.forEach(function (c){
      c.querySelectorAll('.cg-scrap').forEach(function (el){ el.classList.add('cg-in'); });
      c.classList.add('cg-nofade');            // snaps are instant (invisible at opacity:0)
      c.classList.remove('cg-burst-armed');    // -> rest, so rects are true resting boxes
    });
    void document.body.offsetWidth;
    var s = seam.getBoundingClientRect(), sx = s.left + s.width / 2, sy = s.top + s.height / 2;
    burstCs.forEach(function (c){
      c.querySelectorAll('.cg-scrap').forEach(function (el){
        var r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;     // skip display:none (dropped) scraps
        el.style.setProperty('--bx', (sx - (r.left + r.width / 2)).toFixed(1) + 'px');
        el.style.setProperty('--by', (sy - (r.top  + r.height / 2)).toFixed(1) + 'px');
      });
    });
    burstCs.forEach(function (c){ c.classList.add('cg-burst-armed'); });   // -> dots on the slit (instant)
    void document.body.offsetWidth;
    requestAnimationFrame(function (){ burstCs.forEach(function (c){ c.classList.remove('cg-nofade'); }); });
  }

  if (env && burstCs.length && !reduce && document.documentElement.classList.contains('sealed')){
    var moEnv = new MutationObserver(function (){
      if (env.classList.contains('done')){ armBurst(); liftReel(); moEnv.disconnect(); }
    });
    moEnv.observe(env, { attributes: true, attributeFilter: ['class'] });
  } else {
    liftReel();   // reduced-motion / no-seal: scraps already at rest, just load the reel
  }
}

function initBurger(){
  var burger = document.getElementById('m-burger');
  var panel  = document.getElementById('m-panel');
  if (!burger || !panel) return;
  var links = panel.querySelectorAll('a');
  var firstLink = links[0] || null;
  var isOpen = false;

  function setHidden(hidden){
    panel.setAttribute('aria-hidden', String(hidden));
    if (hidden) { panel.setAttribute('inert', ''); } else { panel.removeAttribute('inert'); }
  }
  function openMenu(){
    if (isOpen) return;
    isOpen = true;
    panel.setAttribute('data-open', 'true');
    burger.setAttribute('aria-expanded', 'true');
    setHidden(false);
    document.body.style.overflow = 'hidden';
    if (firstLink) { setTimeout(function(){ firstLink.focus(); }, 50); }
  }
  function closeMenu(restoreFocus){
    if (!isOpen) return;
    isOpen = false;
    panel.removeAttribute('data-open');
    burger.setAttribute('aria-expanded', 'false');
    setHidden(true);
    document.body.style.overflow = '';
    if (restoreFocus) { burger.focus(); }
  }
  setHidden(true);
  burger.addEventListener('click', function(e){
    e.stopPropagation();
    if (isOpen) { closeMenu(true); } else { openMenu(); }
  });
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function(){ closeMenu(false); });
  }
  document.addEventListener('keydown', function(e){
    if (isOpen && (e.key === 'Escape' || e.key === 'Esc')) { closeMenu(true); }
  });
  document.addEventListener('click', function(e){
    if (!isOpen) return;
    if (panel.contains(e.target) || burger.contains(e.target)) return;
    closeMenu(false);
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(min-width:721px)');
    var onChange = function(ev){ if (ev.matches) { closeMenu(false); } };
    if (mq.addEventListener) { mq.addEventListener('change', onChange); }
    else if (mq.addListener) { mq.addListener(onChange); }
  }
}

function initAttentionCta(){
  // The idle "look at me" loop greets on EVERY page load — no sessionStorage
  // persistence. It still backs off the moment you show intent (hover/click/
  // focus/touch the button, or scroll well past it), but only for this view.
  var wraps = Array.prototype.slice.call(document.querySelectorAll('.cta-attn'));
  if(!wraps.length) return;

  var intentEvents = ['pointerenter','focusin','click','touchstart'];
  var btns = [];
  wraps.forEach(function(w){ var b = w.querySelector('.btn'); if(b) btns.push(b); });

  var scrollHandlerBound = false;
  function onIntent(){ quiet(); }
  function cleanup(){
    btns.forEach(function(b){
      intentEvents.forEach(function(ev){ b.removeEventListener(ev, onIntent, {passive:true}); });
    });
    if(scrollHandlerBound){ window.removeEventListener('scroll', onScroll); scrollHandlerBound = false; }
  }
  function quiet(){
    wraps.forEach(function(w){ w.classList.add('cta-quiet'); });
    cleanup();
  }
  function bind(){
    btns.forEach(function(b){
      intentEvents.forEach(function(ev){ b.addEventListener(ev, onIntent, {once:true, passive:true}); });
    });
  }
  function onScroll(){
    var ref = wraps[0].getBoundingClientRect();
    if(ref.bottom < -window.innerHeight * 0.5){ quiet(); }
  }
  bind();
  scrollHandlerBound = true;
  window.addEventListener('scroll', onScroll, {passive:true});
}

/* ===================================================================
   THE SHOWPIECE — firecracker "Join a Circle" CTA. Ported from the wall's
   WallCta (backend-gstack /welcome): on click the green button casing SPLITS
   in half (the halves tumble off-screen), its guts spray across the viewport
   (CircleMarks, stars, dots, butterflies, scrawled words), some debris RUSHES
   the screen, then the branded CircleMark zooms in on its own stroke until the
   whole viewport is solid grass green — "through the door into Drex" — before
   navigating. ~3s. Progressive enhancement: the link works with zero JS; this
   only decorates it. reduced-motion / tier=lite → instant native nav. Sound is
   gated on the site's opt-in audio (the same `enabled` the envelope cut arms).
   =================================================================== */
const FC_TOTAL_MS = 3000, FC_COVER_MS = 2660;
const FC_COLORS = ['var(--sambas)', 'var(--grass)', 'var(--colorado)', 'var(--lazuli)'];
const FC_WORDS = ['yes!', 'come in', 'at last', 'you’re in', 'hello', 'oh!'];
const FC_SIZE = { mark: 30, star: 26, dot: 14, butterfly: 32, word: 0 };
// outward spray (44) + a few that rush the screen (10)
const FC_SPRAY = [].concat(
  Array(13).fill('mark'), Array(8).fill('star'), Array(11).fill('dot'),
  Array(6).fill('butterfly'), Array(6).fill('word'));
const FC_RUSH = [].concat(Array(5).fill('mark'), Array(3).fill('dot'), Array(2).fill('star'));

/** distance from (cx,cy) to the viewport edge along angle a — so particles reach the edges */
function fcEdgeDist(a, cx, cy, vw, vh) {
  const c = Math.cos(a), s = Math.sin(a);
  const tx = c > 0 ? (vw - cx) / c : c < 0 ? -cx / c : Infinity;
  const ty = s > 0 ? (vh - cy) / s : s < 0 ? -cy / s : Infinity;
  return Math.min(tx, ty);
}

/** the official CircleMark + the spray glyphs, as SVG strings (reuse the page's #rough filters) */
function fcGlyph(kind) {
  if (kind === 'dot') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" fill="currentColor" filter="url(#roughsm)"/></svg>';
  if (kind === 'star') return '<svg viewBox="0 0 24 24"><path d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z" fill="currentColor" filter="url(#roughsm)"/></svg>';
  if (kind === 'butterfly') return '<svg viewBox="0 0 40 40"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#roughsm)"><path d="M20 9 Q 8 3 6 14 Q 6 23 20 20"/><path d="M20 9 Q 32 3 34 14 Q 34 23 20 20"/><path d="M20 20 Q 9 22 9 31 Q 16 30 20 22"/><path d="M20 20 Q 31 22 31 31 Q 24 30 20 22"/></g></svg>';
  return '<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-dasharray="55 9" transform="rotate(-42 14 14)" filter="url(#rough)"/></svg>';
}

/** best-effort haptics */
function fcBuzz(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} }

/** WebAudio firecracker, synthesized inside the click gesture so it isn't autoplay-blocked.
 *  Only fires when the site's audio is ON (audio.enabled — the envelope cut arms it). A crack
 *  (the split) + a paper-scatter + a swelling rush + an impact thump as the screen fills. */
function fcPlayBurst(audio) {
  if (!audio || !audio.enabled) return;       // honour the site's opt-in sound contract
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const t0 = ac.currentTime;
    // crack (the casing splitting) — short sharp noise @0
    const clen = Math.floor(ac.sampleRate * 0.08);
    const cbuf = ac.createBuffer(1, clen, ac.sampleRate);
    const cd = cbuf.getChannelData(0);
    for (let i = 0; i < clen; i++) cd[i] = (Math.random() * 2 - 1) * (1 - i / clen) ** 1.5;
    const crack = ac.createBufferSource(); crack.buffer = cbuf;
    const chp = ac.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 900;
    const cg = ac.createGain();
    cg.gain.setValueAtTime(0.5, t0); cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    crack.connect(chp).connect(cg).connect(ac.destination);
    crack.start(t0); crack.stop(t0 + 0.1);
    // paper-scatter noise @0.03
    const len = Math.floor(ac.sampleRate * 0.25);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const chd = buf.getChannelData(0);
    for (let i = 0; i < len; i++) chd[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const noise = ac.createBufferSource(); noise.buffer = buf;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(5200, t0 + 0.03); lp.frequency.exponentialRampToValueAtTime(700, t0 + 0.27);
    const ng = ac.createGain();
    ng.gain.setValueAtTime(0.2, t0 + 0.03); ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    noise.connect(lp).connect(ng).connect(ac.destination);
    noise.start(t0 + 0.03); noise.stop(t0 + 0.29);
    // triangle swell @1.9s (the rush)
    const o = ac.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(170, t0 + 1.9); o.frequency.exponentialRampToValueAtTime(720, t0 + 2.66);
    const og = ac.createGain();
    og.gain.setValueAtTime(0.0001, t0 + 1.9); og.gain.linearRampToValueAtTime(0.16, t0 + 2.5);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.8);
    o.connect(og).connect(ac.destination); o.start(t0 + 1.9); o.stop(t0 + 2.85);
    // sine impact thump @2.66s (fills green)
    const th = ac.createOscillator(); th.type = 'sine';
    th.frequency.setValueAtTime(220, t0 + 2.62); th.frequency.exponentialRampToValueAtTime(60, t0 + 2.86);
    const tg = ac.createGain();
    tg.gain.setValueAtTime(0.0001, t0 + 2.62); tg.gain.linearRampToValueAtTime(0.3, t0 + 2.7);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.0);
    th.connect(tg).connect(ac.destination); th.start(t0 + 2.62); th.stop(t0 + 3.05);
    setTimeout(() => { try { ac.close(); } catch (_) {} }, 3300);
  } catch (_) { /* no audio is fine */ }
}

function fcDetonate(anchor, audio) {
  const r = anchor.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const vw = window.innerWidth, vh = window.innerHeight;

  let wi = 0;
  const spray = FC_SPRAY.map((kind, i) => {
    const ang = i * 2.39996 + (Math.random() - 0.5) * 0.5;            // golden angle + jitter
    const reach = fcEdgeDist(ang, cx, cy, vw, vh) * (0.5 + Math.random() * 0.7);
    return {
      kind, tx: Math.cos(ang) * reach, ty: Math.sin(ang) * reach,
      rot: (Math.random() - 0.5) * 1040, sc: 0.6 + Math.random() * 0.85,
      delay: 60 + i * 5 + Math.random() * 60, dur: 820 + Math.random() * 560,
      color: FC_COLORS[i % FC_COLORS.length], size: FC_SIZE[kind],
      word: kind === 'word' ? FC_WORDS[wi++ % FC_WORDS.length] : null,
    };
  });
  const rush = FC_RUSH.map((kind, i) => {
    const ang = Math.random() * Math.PI * 2, reach = 80 + Math.random() * 220;
    return {
      kind, tx: Math.cos(ang) * reach, ty: Math.sin(ang) * reach,
      rot: (Math.random() - 0.5) * 320, rushSc: 5 + Math.random() * 6,
      delay: 220 + Math.random() * 900, dur: 720 + Math.random() * 700,
      color: FC_COLORS[i % FC_COLORS.length], size: kind === 'dot' ? 18 : 30,
    };
  });
  const far = Math.hypot(Math.max(cx, vw - cx), Math.max(cy, vh - cy));

  const overlay = document.createElement('div');
  overlay.className = 'detonation';
  const origin = document.createElement('div');
  origin.className = 'deto-origin';
  origin.style.setProperty('--ox', cx + 'px');
  origin.style.setProperty('--oy', cy + 'px');
  origin.style.setProperty('--half-w', Math.max(40, r.width / 2) + 'px');
  origin.style.setProperty('--half-h', Math.max(30, r.height) + 'px');

  const hl = document.createElement('span'); hl.className = 'cta-half l'; hl.setAttribute('aria-hidden', 'true');
  const hr = document.createElement('span'); hr.className = 'cta-half r'; hr.setAttribute('aria-hidden', 'true');
  origin.appendChild(hl); origin.appendChild(hr);

  spray.forEach((p) => {
    const el = document.createElement('span');
    el.className = 'p p-' + p.kind;
    el.style.cssText = `--tx:${p.tx}px;--ty:${p.ty}px;--rot:${p.rot}deg;--sc:${p.sc};--dur:${p.dur}ms;--delay:${p.delay}ms;--p-color:${p.color};`;
    if (p.size) { el.style.width = p.size + 'px'; el.style.height = p.size + 'px'; }
    if (p.kind === 'word') el.textContent = p.word; else el.innerHTML = fcGlyph(p.kind);
    origin.appendChild(el);
  });
  rush.forEach((p) => {
    const el = document.createElement('span');
    el.className = 'p-rush p-' + p.kind;
    el.style.cssText = `--tx:${p.tx}px;--ty:${p.ty}px;--rot:${p.rot}deg;--rush-sc:${p.rushSc};--dur:${p.dur}ms;--delay:${p.delay}ms;--p-color:${p.color};`;
    el.style.width = p.size + 'px'; el.style.height = p.size + 'px';
    el.innerHTML = fcGlyph(p.kind);
    origin.appendChild(el);
  });

  const ring = document.createElement('span');
  ring.className = 'fill-ring';
  ring.style.setProperty('--fill-color', 'var(--grass)');
  ring.style.setProperty('--fill-scale', (far + 60) / 60);
  ring.innerHTML = '<span class="fill-mark">' + fcGlyph('mark') + '</span><span class="fill-core"></span>';
  origin.appendChild(ring);

  overlay.appendChild(origin);
  document.body.appendChild(overlay);

  // hide the real button + silence the idle "tap me!" attention loop on its wrapper
  anchor.style.visibility = 'hidden';
  anchor.classList.add('is-firing');
  const wrap = anchor.closest('.cta-attn');
  if (wrap) wrap.classList.add('is-firing');

  try { document.documentElement.style.overflow = 'hidden'; } catch (_) {}
  fcPlayBurst(audio);
  fcBuzz([22, 26, 8, 26, 10, 30, 18]);
  setTimeout(() => fcBuzz(80), FC_COVER_MS);
  setTimeout(() => { window.location.href = anchor.href; }, FC_TOTAL_MS);
}

function initFirecrackerCta(audio) {
  const btns = document.querySelectorAll('a.btn[href*="join-online"]');
  btns.forEach((a) => {
    let fired = false;
    a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;  // let new-tab / native nav happen
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const lite = document.documentElement.dataset.tier === 'lite';
      if (reduce || lite || fired) return;                                  // → instant native nav
      fired = true;
      e.preventDefault();
      fcDetonate(a, audio);
    });
  });
}

/* ===================================================================
   M5 — THE FINALE. Tear off EVERY piece of the collage and the leftover
   page crumples into a paper ball (the founder crumple shader, run FORWARD:
   flat → wad) that falls, shrinks, spins, and fades — revealing the reward
   behind it: a hand-drawn star, "we love people like you", a triumphant
   fanfare, and a burst of zine-stamp confetti. The shader is the flourish;
   the reward + confetti + fanfare ALWAYS land (a plain CSS fade replaces the
   crumple under lite / no-WebGL / capture failure). One-shot per page load.
   =================================================================== */
let finaleStarted = false, finaleRewardShown = false;
let finaleShot = null;     // canvas of the INTACT site, stashed by initTearAway the moment tearing begins

function initFinale() {
  window.addEventListener('drexfx:cleared', () => {
    if (finaleStarted) return; finaleStarted = true;
    runFinale().catch(() => revealReward());     // any crumple failure → still reward
  });
  // QA hook: trigger the finale without tearing all 8 pieces by hand
  window.__drexFinale = () => { try { window.dispatchEvent(new Event('drexfx:cleared')); } catch (_) {} };
}

const FINALE_VALUES = ['Communion', 'Reverence', 'Conviction', 'Self-awareness',
  'Cultivation', 'Generativity', 'zine', 'Drex', 'made with reverence'];

function buildReward() {
  let root = document.getElementById('finale-reward');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'finale-reward';
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML =
    '<div class="finale-card" tabindex="-1">' +
      '<svg class="finale-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 L14.7 9.1 L21.6 9.4 L16.1 13.8 L18.1 20.6 L12 16.4 L5.9 20.6 L7.9 13.8 L2.4 9.4 L9.3 9.1 Z"/></svg>' +
      '<p class="finale-head scrawl">we love people like you</p>' +
      '<p class="finale-sub">you took the whole thing apart &mdash; that’s exactly the spirit.</p>' +
      '<button class="btn" type="button" id="finale-again">start over &rarr;</button>' +
    '</div>';
  document.body.appendChild(root);
  root.querySelector('#finale-again').addEventListener('click', () => location.reload());
  return root;
}

function revealReward() {
  if (finaleRewardShown) return;
  finaleRewardShown = true;
  const reward = buildReward();
  document.documentElement.classList.add('finale-on', 'finale-reveal');   // scroll-lock + show
  reward.classList.add('show');
  const card = reward.querySelector('.finale-card');
  try { card && card.focus({ preventScroll: true }); } catch (_) {}
  Stage.armSound && Stage.armSound();           // the climax earns sound (unless muted)
  Stage.play('fanfare', { gain: 0.32 });
  burstConfetti();
}

function burstConfetti() {
  const layer = document.createElement('div');
  layer.id = 'finale-confetti';
  layer.setAttribute('aria-hidden', 'true');
  const COLORS = ['var(--colorado)', 'var(--grass)', 'var(--lazuli)', 'var(--schoolbus)', 'var(--happy)', 'var(--sambas)'];
  const N = 54;
  for (let i = 0; i < N; i++) {
    const b = document.createElement('span');
    b.className = 'zine-confetti';
    const c = COLORS[i % COLORS.length];
    const kind = Math.random();
    if (kind < 0.32) { b.classList.add('zc-word'); b.textContent = FINALE_VALUES[Math.floor(Math.random() * FINALE_VALUES.length)]; b.style.color = c; }
    else if (kind < 0.58) { b.classList.add('zc-star'); b.textContent = '★'; b.style.color = c; }
    else { b.style.background = c; if (Math.random() < 0.5) b.classList.add('zc-round'); }
    b.style.left = (50 + (Math.random() * 2 - 1) * 10).toFixed(1) + '%';
    b.style.setProperty('--dx', (Math.random() * 2 - 1).toFixed(2));           // outward spread
    b.style.setProperty('--kick', (-0.6 - Math.random() * 0.7).toFixed(2));    // initial upward kick (× vh)
    b.style.setProperty('--rot', (Math.random() * 720 - 360).toFixed(0) + 'deg');
    b.style.setProperty('--delay', (Math.random() * 0.22).toFixed(2) + 's');
    b.style.setProperty('--dur', (1.9 + Math.random() * 1.6).toFixed(2) + 's');
    b.style.setProperty('--scale', (0.7 + Math.random() * 0.8).toFixed(2));
    b.addEventListener('animationend', () => b.remove());
    layer.appendChild(b);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4600);
}

// crumple ramp: drive uT from→to over dur with the 24fps step + crinkle patter.
// Raw rAF (not Stage.addDriver) so it runs to completion regardless of motion state.
function crumpleRamp(uniforms, from, to, dur, render) {
  return new Promise((resolve) => {
    const t0 = performance.now(), STEP = 1000 / 24;
    let lastQ = -1, lastSnd = -1e9;
    const ease = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    (function fr(now) {
      let p = (now - t0) / dur; if (p > 1) p = 1;
      const q = Math.floor((now - t0) / STEP);
      if (q !== lastQ) { lastQ = q; const pq = Math.min(q * STEP / dur, 1); uniforms.uT.value = from + (to - from) * ease(pq); render(); }
      if (now - lastSnd > 70) { lastSnd = now; Stage.play('crinkle'); if (Math.random() < 0.5) Stage.play('crinkle'); }
      if (p < 1) requestAnimationFrame(fr);
      else { uniforms.uT.value = to; render(); resolve(); }
    })(performance.now());
  });
}

async function runFinale() {
  const root = document.documentElement;
  root.classList.add('finale-on');                 // lock scroll immediately
  buildReward();                                    // exists behind, hidden until revealReward()

  const [THREE, ms] = await loadCrumpleLibs();      // throws offline → caught → revealReward()
  await document.fonts.ready;

  // The texture is the WHOLE intact site, stashed when tearing began — by now the
  // live DOM is an empty husk, so crumpling it would ball up blank paper. Fall back
  // to a live viewport grab only if the stash never happened (e.g. programmatic).
  let texCanvas, texW, texH;
  if (finaleShot && finaleShot.width) {
    texCanvas = finaleShot; texW = finaleShot.width; texH = finaleShot.height;
  } else {
    const bg = getComputedStyle(document.body).backgroundColor || '#FEF6E4';
    const skip = (n) => !(n && n.id && /^finale-/.test(n.id)) && !(n && n.classList && n.classList.contains('tape-fall'));
    const snap = await ms.domToCanvas(document.body, { scale: 1, backgroundColor: bg, filter: skip });
    const W0 = Math.max(1, innerWidth), H0 = Math.max(1, innerHeight);
    texCanvas = document.createElement('canvas'); texCanvas.width = W0; texCanvas.height = H0;
    const g2 = texCanvas.getContext('2d'); g2.fillStyle = bg; g2.fillRect(0, 0, W0, H0);
    g2.drawImage(snap, -scrollX, -scrollY);
    texW = W0; texH = H0;
  }

  const W = Math.max(1, innerWidth), H = Math.max(1, innerHeight);
  const host = document.createElement('div'); host.id = 'finale-host';
  document.body.appendChild(host);
  const R = new THREE.WebGLRenderer({ alpha: true, antialias: true });   // throws if no WebGL → caught upstream
  R.outputColorSpace = THREE.SRGBColorSpace;
  R.setPixelRatio(Math.min(devicePixelRatio, 2));
  R.setSize(W, H);
  host.appendChild(R.domElement);

  const scene = new THREE.Scene();
  const fov = 35;
  const cam = new THREE.PerspectiveCamera(fov, W / H, 0.01, 100);
  cam.position.set(0, 0, 0.5 / Math.tan(THREE.MathUtils.degToRad(fov) / 2));

  // size the sheet to the texture's aspect, CONTAINed in the viewport (height == 1),
  // so the whole recognizable site is on screen before it crumples
  const texAspect = texW / texH, viewAspect = W / H;
  let planeW, planeH;
  if (texAspect >= viewAspect) { planeW = viewAspect; planeH = viewAspect / texAspect; }
  else { planeH = 1; planeW = texAspect; }

  const tex = new THREE.CanvasTexture(texCanvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const uniforms = { uT: { value: 0 }, uTex: { value: tex } };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(planeW, planeH, 80, 80),
    new THREE.ShaderMaterial({ vertexShader: CRUMPLE_VERT, fragmentShader: CRUMPLE_FRAG, uniforms,
      side: THREE.DoubleSide, extensions: { derivatives: true } })
  );
  scene.add(mesh);
  const render = () => R.render(scene, cam);
  render();
  root.classList.add('finale-hide');               // hide the empty husk — the intact snapshot stands in

  // 0) hold the restored site on screen for a beat ("wait — it's back?")
  await new Promise((r) => setTimeout(r, 320));
  // 1) the whole site crumples: flat sheet → tight wad
  await crumpleRamp(uniforms, 0, 1, 1000, render);
  // 2) the wad falls away, revealing the reward behind it
  revealReward();
  host.style.transition = 'transform 1.2s cubic-bezier(.5,0,.85,.5), opacity 1.1s ease-in';
  host.style.transformOrigin = '50% 42%';
  requestAnimationFrame(() => {
    host.style.transform = 'translateY(64vh) scale(.06) rotate(214deg)';
    host.style.opacity = '0';
  });
  Stage.play('rustle', { gain: 0.3, rate: 0.82 });
  setTimeout(() => { host.remove(); try { R.dispose && R.dispose(); } catch (_) {} }, 1350);
}

/* ===================================================================
   M5 — The hamburger that LIES (grafted in the main merge). Drag the dangling
   burger; the whole nav strand feeds out of the cut; over-pull tears it; tap to
   reel home. Links click-through once open. Keyboard / reduced-motion → plain.
   =================================================================== */
function initHamburgerJoy(audio) {
  const hb = document.getElementById('hb');
  const burger = document.getElementById('m-burger');
  const fallen = document.getElementById('hb-fallen');
  const tray = document.getElementById('hb-tray');
  if (!hb || !burger || !fallen || !tray) return;

  const OPEN = 1, STRAIN = 1.04, DANGER = 1.13, TRAVEL = 230;   // string is anchored at the slit + stretches; tear when taut (~34px of stretch)
  let pull = 0, dragging = false, startPull = 0, startY = 0, moved = false, torn = false, lastVibe = 0;

  const setPull = (p) => {
    pull = p; hb.style.setProperty('--pull', p.toFixed(3));
    hb.classList.toggle('is-straining', p >= STRAIN && p < DANGER);
  };
  const setState = (s) => { hb.dataset.state = s; };
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };
  const arm = () => { try { Stage.armSound && Stage.armSound(); } catch (_) {} };

  function flop() {
    setState('fallen'); setPull(0);
    burger.setAttribute('aria-expanded', 'true');
    arm(); Stage.play('rustle', { gain: 0.3 }); buzz(12);
  }
  function plainOpen() {
    const open = hb.dataset.state !== 'plain';
    setState(open ? 'plain' : 'rest');
    burger.setAttribute('aria-expanded', String(open));
  }
  function reset() {
    if (torn) return;
    setState('rest'); setPull(0);
    burger.setAttribute('aria-expanded', 'false');
    Stage.play('rustle', { gain: 0.2, rate: 1.12 });
  }
  function tear() {
    torn = true; setState('torn'); hb.classList.remove('is-straining', 'is-dragging');
    Stage.play('taperip', { gain: 0.45 }); setTimeout(() => Stage.play('cut', { gain: 0.3 }), 90);
    buzz([35, 30, 90]);
    setTimeout(() => {
      torn = false; hb.classList.add('respawning'); setState('rest'); setPull(0);
      burger.setAttribute('aria-expanded', 'false');
      requestAnimationFrame(() => requestAnimationFrame(() => hb.classList.remove('respawning')));
    }, 1050);
  }

  burger.addEventListener('click', (e) => {
    if (Stage.calm || e.detail === 0) { plainOpen(); return; }      // reduced-motion / keyboard → plain menu
    if (hb.dataset.state === 'rest') flop(); else reset();
  });

  // the dangling burger is the drag handle (so the links stay click-through)
  fallen.addEventListener('pointerdown', (e) => {
    if (torn || (hb.dataset.state !== 'fallen' && hb.dataset.state !== 'open')) return;
    e.preventDefault();
    dragging = true; moved = false; startPull = pull; startY = e.clientY; lastVibe = 0;
    hb.classList.add('is-dragging');
    try { fallen.setPointerCapture(e.pointerId); } catch (_) {}
    arm();
  });
  fallen.addEventListener('pointermove', (e) => {
    if (!dragging || torn) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 5) moved = true;
    const p = Math.max(0, Math.min(DANGER, startPull + dy / TRAVEL));   // clamp AT the clear point — no overshoot-stop
    setPull(p);
    if (p >= STRAIN) {                                               // escalating warning before the tear
      const lvl = Math.floor((p - STRAIN) / 0.045);
      if (lvl > lastVibe) { lastVibe = lvl; buzz(6 + lvl * 7); Stage.play('snip', { gain: 0.08 + lvl * 0.02, rate: 1 + lvl * 0.05 }); }
    } else lastVibe = 0;
    if (p >= DANGER) { dragging = false; hb.classList.remove('is-dragging'); tear(); }
  });
  const up = () => {
    if (!dragging || torn) return;
    dragging = false; hb.classList.remove('is-dragging');
    if (!moved) { reset(); return; }                                // a tap (no drag) on the burger reels it home
    if (pull >= 0.8) { setState('open'); setPull(OPEN); hb.classList.add('pulled'); Stage.play('snip', { gain: 0.2 }); buzz(10); }
    else { setState('fallen'); setPull(0); }
  };
  fallen.addEventListener('pointerup', up);
  fallen.addEventListener('pointercancel', up);

  window.__drexHb = { flop, reset, tear, open: () => { setState('open'); setPull(OPEN); },
    setPull, get pull(){return pull;}, get state(){return hb.dataset.state;} };
}
