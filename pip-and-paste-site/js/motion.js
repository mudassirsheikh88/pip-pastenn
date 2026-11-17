/* Pip & Paste — tiny motion toolkit: ticker, eases, tweens, letter splitting, reveal helpers. */

(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const mobileQuery = window.matchMedia("(max-width: 743px)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- ticker ---------- */
  const subs = new Set();
  let last = performance.now();
  let time = 0;
  function loop(now) {
    const dt = Math.min(100, now - last);
    last = now;
    time += dt / 1000;
    for (const f of Array.from(subs)) {
      try {
        f(time, dt);
      } catch (e) {
        subs.delete(f);
        console.error(e);
      }
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  const ticker = {
    add: (f) => subs.add(f),
    remove: (f) => subs.delete(f),
    get time() {
      return time;
    },
  };

  /* ---------- eases ---------- */
  const powIn = (n) => (t) => Math.pow(t, n + 1);
  const powOut = (n) => (t) => 1 - Math.pow(1 - t, n + 1);
  const powInOut = (n) => (t) => (t < 0.5 ? Math.pow(2, n) * Math.pow(t, n + 1) : 1 - Math.pow(-2 * t + 2, n + 1) / 2);
  const backOut = (s = 1.7) => (t) => {
    t -= 1;
    return t * t * ((s + 1) * t + s) + 1;
  };
  const backIn = (s = 1.7) => (t) => t * t * ((s + 1) * t - s);
  const elasticOut = (a = 1, p = 0.3) => (t) => {
    if (t === 0 || t === 1) return t;
    a = Math.max(1, a);
    const s = (p / (2 * Math.PI)) * Math.asin(1 / a);
    return a * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / p) + 1;
  };
  const cache = new Map();
  function ease(name) {
    if (typeof name === "function") return name;
    if (cache.has(name)) return cache.get(name);
    const m = /^(\w+)\.?(in|out|inOut)?(?:\(([^)]*)\))?$/.exec(name || "none");
    let f = (t) => t;
    if (m) {
      const [, kind, dir = "out", args] = m;
      const a = args ? args.split(",").map(Number) : [];
      const p = { power0: 0, power1: 1, power2: 2, power3: 3, power4: 4, quad: 1, cubic: 2 }[kind];
      if (p !== undefined) f = dir === "in" ? powIn(p) : dir === "inOut" ? powInOut(p) : powOut(p);
      else if (kind === "back") f = dir === "in" ? backIn(a[0] ?? 1.7) : backOut(a[0] ?? 1.7);
      else if (kind === "elastic") f = elasticOut(a[0] ?? 1, a[1] ?? 0.3);
      else if (kind === "sine") f = dir === "in" ? (t) => 1 - Math.cos((t * Math.PI) / 2) : dir === "inOut" ? (t) => -(Math.cos(Math.PI * t) - 1) / 2 : (t) => Math.sin((t * Math.PI) / 2);
      else if (kind === "expo") f = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    }
    cache.set(name, f);
    return f;
  }

  /* ---------- tween ---------- */
  function tween({ from = 0, to = 1, duration = 0.5, ease: e = "power2.out", delay = 0, onStart, onUpdate, onComplete } = {}) {
    const fn = ease(e);
    let start = time + delay;
    let dead = false;
    let started = false;
    let done;
    const promise = new Promise((r) => (done = r));
    const step = (t) => {
      if (dead || t < start) return;
      if (!started) {
        started = true;
        onStart && onStart();
      }
      const k = duration > 0 ? clamp((t - start) / duration, 0, 1) : 1;
      onUpdate && onUpdate(from + (to - from) * fn(k), k);
      if (k >= 1) finish(true);
    };
    function finish(natural) {
      if (dead) return;
      dead = true;
      subs.delete(step);
      if (natural) onComplete && onComplete();
      done();
    }
    if (duration <= 0 && delay <= 0) {
      onStart && onStart();
      onUpdate && onUpdate(to, 1);
      onComplete && onComplete();
      done();
      dead = true;
    } else subs.add(step);
    return {
      kill: () => finish(false),
      complete() {
        if (dead) return;
        onUpdate && onUpdate(to, 1);
        finish(true);
      },
      then: (a, b) => promise.then(a, b),
      get active() {
        return !dead;
      },
    };
  }

  /* tween numeric props on a plain object */
  function to(obj, props, opts = {}) {
    const keys = Object.keys(props);
    const starts = keys.map((k) => obj[k]);
    return tween({
      ...opts,
      from: 0,
      to: 1,
      onUpdate: (_, k) => {
        const e = ease(opts.ease || "power2.out")(k);
        keys.forEach((key, i) => (obj[key] = starts[i] + (props[key] - starts[i]) * e));
        opts.onUpdate && opts.onUpdate(obj);
      },
      ease: "none",
    });
  }

  const wait = (s) => new Promise((r) => (s <= 0 ? r() : tween({ duration: s, onComplete: r })));

  /* ---------- letters ---------- */
  const NBSP = String.fromCharCode(160);
  function letters(el, text) {
    const t = text ?? el.textContent;
    const chars = [...t];
    el.innerHTML = chars
      .map((ch, i) => `<span class="clip" style="--i:${i}"><span class="char">${ch === " " ? NBSP : ch.replace("&", "&amp;").replace("<", "&lt;")}</span></span>`)
      .join("");
    el.style.setProperty("--letters", chars.length);
    return Array.from(el.querySelectorAll(".char"));
  }
  /* split every [data-letters] element (or .line children) */
  function splitAll(root = document) {
    root.querySelectorAll("[data-letters]").forEach((el) => {
      if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", el.textContent.trim().replace(/\s+/g, " "));
      const lines = el.querySelectorAll(".line");
      if (lines.length) lines.forEach((l) => letters(l));
      else letters(el);
      el.querySelectorAll(".clip").forEach((c) => c.setAttribute("aria-hidden", "true"));
    });
  }

  /* per-char transform state (rise + poke share one transform) */
  function state(ch) {
    if (!ch._s) ch._s = { yp: 0, y: 0, r: 0, s: 1 };
    return ch._s;
  }
  function apply(ch) {
    const s = ch._s;
    ch.style.transform = `translate3d(0, calc(${s.yp.toFixed(2)}% + ${s.y.toFixed(2)}px), 0) rotate(${s.r.toFixed(2)}deg) scale(${s.s.toFixed(3)})`;
  }
  function hide(chars, hidden = 130) {
    chars.forEach((c) => {
      state(c).yp = reduced ? 0 : hidden;
      apply(c);
    });
  }
  function shuffle(a) {
    const t = [...a];
    for (let i = t.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [t[i], t[j]] = [t[j], t[i]];
    }
    return t;
  }
  /* letters rise from their clip in random order */
  function rise(chars, { duration = 0.6, stagger = 0.025, delay = 0, ease: e = "power3.out", random = true, hidden = 130 } = {}) {
    const list = random ? shuffle(chars) : chars;
    if (reduced) {
      list.forEach((c) => {
        state(c).yp = 0;
        apply(c);
      });
      return Promise.resolve();
    }
    return Promise.all(
      list.map((c, i) => {
        const s = state(c);
        return tween({
          from: s.yp || hidden,
          to: 0,
          duration,
          delay: delay + i * stagger,
          ease: e,
          onUpdate: (v) => {
            s.yp = v;
            apply(c);
          },
        });
      })
    );
  }

  /* ---------- page reveal gate (set by the preloader) ---------- */
  function isHeld() {
    return document.documentElement.hasAttribute("data-loading");
  }
  function whenRevealed(cb) {
    if (!isHeld()) cb();
    else window.addEventListener("pp:revealed", cb, { once: true });
  }
  function whenSweeping(cb) {
    if (!isHeld() || window.__ppSweeping) cb();
    else window.addEventListener("pp:sweep", cb, { once: true });
  }

  function onView(el, cb, { margin = "0px", threshold = 0, once = true } = {}) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          cb(en.isIntersecting, en);
          if (en.isIntersecting && once) io.disconnect();
        }),
      { rootMargin: margin, threshold }
    );
    io.observe(el);
    return io;
  }

  function pageTop(el) {
    let t = 0;
    for (let n = el; n; n = n.offsetParent) t += n.offsetTop;
    return t;
  }
  function pageLeft(el) {
    let t = 0;
    for (let n = el; n; n = n.offsetParent) t += n.offsetLeft;
    return t;
  }
  const vw = (n) => (n * window.innerWidth) / 100;

  window.PM = {
    reduced,
    finePointer,
    mobileQuery,
    clamp,
    lerp,
    ticker,
    ease,
    tween,
    to,
    wait,
    letters,
    splitAll,
    state,
    apply,
    hide,
    rise,
    shuffle,
    isHeld,
    whenRevealed,
    whenSweeping,
    onView,
    pageTop,
    pageLeft,
    vw,
  };
})();
