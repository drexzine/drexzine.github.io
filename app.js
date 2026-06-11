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

  function armSound() { try { engine?.armForCut?.(); } catch (_) {} }

  return {
    applyMotion, addDriver, observe, registerAudio, play, armSound,
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
  initFounderCrumple();             // M4: founder's note = click-to-unfold 3D paper crumple
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
  const KEYS = ['cut', 'marker', 'rustle', 'snip', 'stamp', 'taperip', 'toggle', 'underline',
    'retrocard1', 'retrocard2', 'retrocard3', 'retropola1', 'retropola2', 'retropola3'];
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
      if (key === 'crinkle') return synthCrinkle(ctx, opts);   // synthesized paper crinkle (no sample)
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

/* ---- M1 — interaction SFX (no-op until sound is switched on) --------
   Buttons + nav keep the tactile craft foley (stamp / toggle). Door cards
   and team polaroids — which had no click sound — get a retro 90s/edutainment
   blip layer: a random clip from a small per-type family, never repeating the
   previous one, so each click is designed-but-surprising. CC0 (Kenney), see
   assets/audio/CREDITS-retro.txt. */
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
    if (e.target.closest('.btn')) Stage.play('stamp', { gain: 0.32 });
    else if (e.target.closest('.mast nav a')) Stage.play('toggle', { gain: 0.24 });
    else if (e.target.closest('.doors .card')) Stage.play(pick('card'), { gain: 0.3 });
    else if (e.target.closest('.team .polaroid')) Stage.play(pick('pola'), { gain: 0.26 });
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

async function bootFounderCrumple(paper) {
  const img = paper.querySelector('img');
  if (img && !img.complete) { img.loading = 'eager'; await new Promise((r) => { img.onload = r; img.onerror = r; }); }
  await document.fonts.ready;
  const [THREE, ms] = await Promise.all([
    import('https://esm.sh/three@0.160.0'),
    import('https://esm.sh/modern-screenshot@4'),
  ]);
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
