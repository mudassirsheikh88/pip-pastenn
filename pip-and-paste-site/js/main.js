/* Pip & Paste — page behaviour.
   Every effect checks prefers-reduced-motion (PM.reduced) and stays still when asked. */

(function () {
  "use strict";

  const { reduced, finePointer, clamp, ticker, tween, to, rise, hide, state, apply, shuffle, whenRevealed, whenSweeping, onView, pageTop, vw } = PM;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const isMobile = () => PM.mobileQuery.matches;
  const smoothstep = (t) => t * t * (3 - 2 * t);

  /* ------------------------------------------------------------------ */
  /* text splitting                                                       */
  /* ------------------------------------------------------------------ */
  PM.splitAll();
  // links whose label is split into letters still read as one word
  $$("a, button").forEach((a) => {
    const l = a.querySelector("[data-letters]");
    if (l && !a.getAttribute("aria-label")) a.setAttribute("aria-label", l.getAttribute("aria-label"));
  });
  const charsOf = (el) => (el ? $$(".char", el) : []);

  // copy on the cardboard keeps whole words together
  function splitWords(el) {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);
    el.innerHTML = text
      .split(/\s+/)
      .map((w) => `<span class="word" aria-hidden="true">${[...w].map((c) => `<span class="clip"><span class="char">${c}</span></span>`).join("")}</span>`)
      .join(" ");
    return $$(".char", el);
  }
  // body copy rises word by word
  function splitBody(el) {
    const text = el.textContent.trim();
    el.innerHTML = `<span class="sr-only">${text}</span><span aria-hidden="true">${text
      .split(/\s+/)
      .map((w) => `<span class="body-clip"><span class="body-rise">${w}</span></span>`)
      .join(" ")}</span>`;
    return $$(".body-rise", el);
  }
  function bodyLines(rises) {
    const rows = [];
    let last = -Infinity;
    rises
      .map((r) => ({ r, top: r.parentElement.offsetTop }))
      .sort((a, b) => a.top - b.top)
      .forEach(({ r, top }) => {
        if (top - last > 4) rows.push([]), (last = top);
        rows[rows.length - 1].push(r);
      });
    return rows;
  }
  function setRise(el, yp) {
    el.style.transform = `translateY(${yp}%)`;
  }
  function riseBody(rises, delay = 0) {
    if (reduced) return rises.forEach((r) => setRise(r, 0));
    bodyLines(rises).forEach((line, i) =>
      line.forEach((r) => tween({ from: 110, to: 0, duration: 0.72, ease: "power3.out", delay: delay + i * 0.09, onUpdate: (v) => setRise(r, v) }))
    );
  }

  /* ------------------------------------------------------------------ */
  /* poke: letters lean away from the cursor, then spring back            */
  /* ------------------------------------------------------------------ */
  function poke(el) {
    if (!el || reduced || !finePointer) return;
    const chars = charsOf(el);
    let centres = [];
    let fs = 16;
    let pt = null;
    let raf = 0;
    let poked = false;
    const tw = new Map();
    function measure() {
      const r = el.getBoundingClientRect();
      fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      centres = chars.map((c) => {
        const b = c.parentElement.getBoundingClientRect();
        return { x: b.left - r.left + b.width / 2, y: b.top - r.top + b.height / 2 };
      });
    }
    function animate(c, target, duration, e, delay = 0) {
      tw.get(c)?.kill();
      const s = state(c);
      const from = { y: s.y, r: s.r, s: s.s };
      tw.set(
        c,
        tween({
          duration,
          ease: e,
          delay,
          onUpdate: (_, k) => {
            const f = PM.ease(e)(k);
            s.y = from.y + (target.y - from.y) * f;
            s.r = from.r + (target.r - from.r) * f;
            s.s = from.s + (target.s - from.s) * f;
            apply(c);
          },
        })
      );
    }
    function frame() {
      raf = 0;
      if (!pt) return;
      if (!poked) {
        measure();
        poked = true;
      }
      const r = el.getBoundingClientRect();
      const px = pt.x - r.left;
      const py = pt.y - r.top;
      const reach = 0.8 * fs;
      chars.forEach((c, i) => {
        if (state(c).yp !== 0) return;
        const d = smoothstep(clamp(1 - Math.hypot(px - centres[i].x, py - centres[i].y) / reach, 0, 1));
        const lean = clamp((px - centres[i].x) / (0.5 * reach), -1, 1);
        c.parentElement.style.overflow = "visible";
        animate(c, { y: -0.08 * fs * d, r: -11 * d * lean, s: 1 + 0.08 * d }, 0.45, "power3.out");
      });
    }
    el.addEventListener("pointermove", (e) => {
      pt = { x: e.clientX, y: e.clientY };
      if (!raf) raf = requestAnimationFrame(frame);
    });
    el.addEventListener("pointerleave", () => {
      pt = null;
      if (!poked) return;
      const mid = (chars.length - 1) / 2;
      chars.forEach((c, i) => {
        if (state(c).yp !== 0) return;
        animate(c, { y: 0, r: 0, s: 1 }, 0.9, "elastic.out(1,0.45)", Math.abs(i - mid) * 0.014);
      });
      setTimeout(() => {
        chars.forEach((c) => (c.parentElement.style.overflow = ""));
        poked = false;
      }, 1100);
    });
  }

  /* ------------------------------------------------------------------ */
  /* smooth wheel scrolling                                               */
  /* ------------------------------------------------------------------ */
  const scroller = (function () {
    let target = window.scrollY;
    let cur = window.scrollY;
    let active = false;
    let locked = false;
    const max = () => document.documentElement.scrollHeight - window.innerHeight;
    if (!reduced && finePointer) {
      window.addEventListener(
        "wheel",
        (e) => {
          if (e.ctrlKey || e.defaultPrevented) return;
          e.preventDefault();
          if (locked || PM.isHeld()) return;
          if (!active) cur = target = window.scrollY;
          const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? window.innerHeight : 1;
          target = clamp(target + e.deltaY * unit, 0, max());
          active = true;
        },
        { passive: false }
      );
      ticker.add((t, dt) => {
        if (!active) return;
        cur += (target - cur) * (1 - Math.exp((-dt / 1000) * 6));
        if (Math.abs(target - cur) < 0.4) {
          cur = target;
          active = false;
        }
        window.scrollTo(0, cur);
      });
      window.addEventListener("scroll", () => {
        if (!active) cur = target = window.scrollY;
      });
    }
    function scrollToY(y) {
      y = clamp(y, 0, max());
      if (reduced || !finePointer) return window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
      cur = window.scrollY;
      target = y;
      active = true;
    }
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const t = id ? document.getElementById(id) : null;
      if (!t && id !== "") return;
      e.preventDefault();
      scrollToY(t ? pageTop(t) : 0);
      if (t) history.replaceState(null, "", "#" + id);
    });
    return { to: scrollToY, lock: (v) => (locked = v) };
  })();

  /* ------------------------------------------------------------------ */
  /* custom cursor                                                        */
  /* ------------------------------------------------------------------ */
  (function cursor() {
    if (!finePointer) return;
    const el = document.createElement("div");
    el.className = "cursor-arrow";
    el.setAttribute("aria-hidden", "true");
    document.body.append(el);
    root.classList.add("has-cursor");
    const kinds = {
      arrow: { url: PipArt.cursor("arrow"), w: 48, h: 52, hx: 11, hy: 12 },
      pointer: { url: PipArt.cursor("pointer"), w: 46, h: 50, hx: 13, hy: 6 },
      type: { url: PipArt.cursor("type"), w: 26, h: 41, hx: 13, hy: 20 },
    };
    let kind = "";
    function setKind(k) {
      if (k === kind) return;
      kind = k;
      const d = kinds[k];
      el.style.backgroundImage = d.url;
      el.style.width = d.w + "px";
      el.style.height = d.h + "px";
      el.style.transformOrigin = `${d.hx}px ${d.hy}px`;
      el.style.translate = `${-d.hx}px ${-d.hy}px`;
    }
    setKind("arrow");
    const s = { x: 0, y: 0, rot: 7, scale: 1, alpha: 0 };
    let seen = false;
    let hot = null;
    let down = false;
    let tw = null;
    const draw = () => {
      el.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) rotate(${s.rot}deg) scale(${s.scale})`;
      el.style.opacity = s.alpha;
    };
    function settle() {
      setKind(hot ? (hot.matches("input, textarea, [contenteditable]") ? "type" : "pointer") : "arrow");
      tw?.kill();
      tw = to(s, { scale: down ? 0.86 : hot ? 1.18 : 1, rot: hot ? -1 : 7 }, { duration: reduced ? 0 : 0.28, ease: "power3.out", onUpdate: draw });
    }
    const fade = (v) => to(s, { alpha: v }, { duration: reduced ? 0 : 0.2, onUpdate: draw });
    document.addEventListener("pointermove", (e) => {
      s.x = e.clientX;
      s.y = e.clientY;
      if (!seen) {
        seen = true;
        fade(1);
      }
      draw();
    }, { passive: true });
    document.addEventListener("pointerover", (e) => {
      const t = e.target.closest?.('a[href], button, [role="button"], input, select, textarea, label, [data-cursor]') ?? null;
      if (t !== hot) {
        hot = t;
        settle();
      }
    }, { passive: true });
    document.addEventListener("pointerout", (e) => {
      if (hot && !(e.relatedTarget && hot.contains(e.relatedTarget))) {
        hot = null;
        settle();
      }
    }, { passive: true });
    document.addEventListener("pointerdown", () => ((down = true), settle()));
    document.addEventListener("pointerup", () => ((down = false), settle()));
    document.documentElement.addEventListener("pointerleave", () => fade(0));
    document.documentElement.addEventListener("pointerenter", () => seen && fade(1));
    window.addEventListener("blur", () => fade(0));
  })();

  /* ------------------------------------------------------------------ */
  /* preloader                                                            */
  /* ------------------------------------------------------------------ */
  function release() {
    root.removeAttribute("data-loading");
    window.dispatchEvent(new Event("pp:revealed"));
  }
  function sweep() {
    window.__ppSweeping = true;
    window.dispatchEvent(new Event("pp:sweep"));
  }

  (function preloader() {
    const pre = $(".site-preloader");
    if (!pre || reduced || !PM.isHeld()) {
      pre && pre.classList.add("is-gone");
      sweep();
      release();
      return;
    }
    const markEl = $(".preloader-mark", pre);
    const sheets = [$(".preloader-sheet", pre), ...$$(".preloader-layer", pre).reverse()];

    /* the sticker is cut into thin columns that bend in 3D as it unrolls */
    const N = 44;
    const sticker = document.createElement("div");
    sticker.className = "preloader-sticker";
    const cols = [];
    for (let i = 0; i < N; i++) {
      const col = document.createElement("div");
      col.className = "preloader-col";
      col.innerHTML = PipArt.mark() + "<i></i>";
      sticker.append(col);
      cols.push({ el: col, svg: col.firstElementChild, shade: col.lastElementChild });
    }
    markEl.append(sticker);
    let W = 0, H = 0, cw = 0;
    function layout() {
      W = markEl.clientWidth;
      H = (W * 118) / 191;
      cw = W / N;
      markEl.style.setProperty("--mark-w", W + "px");
      cols.forEach((c, i) => {
        c.el.style.left = i * cw + "px";
        c.el.style.width = cw + 1.2 + "px";
        c.svg.style.left = -i * cw + "px";
      });
    }
    layout();
    const pose = { scale: 0.62, rotX: -78, y: 0.064 * W, alpha: 0, bend: 1.85, fold: 1, wave: 0.35, phase: 0, sheen: 0 };
    const ang = new Float64Array(N), xs = new Float64Array(N), zs = new Float64Array(N);
    function draw() {
      sticker.style.opacity = pose.alpha;
      sticker.style.transform = `translate3d(0, ${pose.y.toFixed(2)}px, 0) rotateX(${pose.rotX.toFixed(2)}deg) scale(${pose.scale.toFixed(4)})`;
      let x = 0, z = 0;
      for (let i = 0; i < N; i++) {
        const r = (i + 0.5) / N;
        let crease = clamp((r - 0.22) / 0.18, 0, 1);
        crease = crease * crease * (3 - 2 * crease);
        const a = pose.bend * (r - 0.5) + pose.fold * crease + pose.wave * Math.sin(2 * Math.PI * (1.95 * r - pose.phase));
        ang[i] = a;
        xs[i] = x + (Math.cos(a) * cw) / 2;
        zs[i] = z + (Math.sin(a) * cw) / 2;
        x += Math.cos(a) * cw;
        z += Math.sin(a) * cw;
      }
      const off = (W - x) / 2;
      const zc = zs[N >> 1];
      for (let i = 0; i < N; i++) {
        const dx = xs[i] + off - (i * cw + cw / 2);
        const c = cols[i];
        c.el.style.transform = `translate3d(${dx.toFixed(2)}px, 0, ${(zs[i] - zc).toFixed(2)}px) rotateY(${((-ang[i] * 180) / Math.PI).toFixed(2)}deg)`;
        const lit = 1 - 0.5 * (1 - Math.cos(ang[i]));
        const sheen = Math.max(0, 1 - Math.abs(i / N - pose.sheen * 1.4 + 0.2) * 5) * 0.28;
        c.svg.style.filter = `brightness(${(lit + sheen).toFixed(3)})`;
        c.el.style.visibility = Math.cos(ang[i]) < 0 ? "hidden" : "visible";
      }
    }
    draw();
    ticker.add(draw);

    const T0 = 0.15;
    const D = 0.92;
    setTimeout(() => (markEl.style.visibility = "visible"), T0 * 1000);
    to(pose, { alpha: 1 }, { duration: D * 0.28, ease: "none", delay: T0 });
    to(pose, { scale: 1 }, { duration: D, ease: "back.out(2.8)", delay: T0 });
    to(pose, { rotX: 0 }, { duration: D, ease: "back.out(2.2)", delay: T0 });
    to(pose, { y: 0 }, { duration: D, ease: "power3.out", delay: T0 });
    const unroll = T0 + D * 0.26;
    to(pose, { fold: 0 }, { duration: 0.74, ease: "sine.inOut", delay: unroll });
    to(pose, { bend: -1.85 * 0.72 }, { duration: 0.74, ease: "sine.inOut", delay: unroll }).then(() => to(pose, { bend: 0 }, { duration: 0.4, ease: "sine.inOut" }));
    to(pose, { wave: 0 }, { duration: 2, ease: "elastic.out(1,0.42)", delay: unroll });
    to(pose, { phase: 0.6 }, { duration: 2, ease: "none", delay: T0 });
    to(pose, { sheen: 1 }, { duration: 1.06, ease: "power1.inOut", delay: T0 });

    const startAt = Math.max(4.1 - performance.now() / 1000, 2.9);
    let at = startAt;
    const plan = sheets.map((el, i) => {
      if (i > 0) at += 0.09 * (1 + ((0.618 * i) % 1 * 2 - 1) * 0.4);
      return { el, at, dur: 1.05 * (1 + i * 0.018) };
    });
    plan.forEach(({ el, at, dur }) =>
      tween({ from: 0, to: -100, duration: dur, delay: at, ease: "power3.inOut", onUpdate: (v) => (el.style.transform = `translate3d(0, ${v}%, 0)`) })
    );
    const lastStep = plan[plan.length - 1];
    setTimeout(sweep, (lastStep.at + 0.33 * lastStep.dur) * 1000);
    setTimeout(release, (lastStep.at + 0.55 * lastStep.dur) * 1000);
    setTimeout(() => {
      ticker.remove(draw);
      pre.classList.add("is-gone");
      pre.style.visibility = "hidden";
    }, (lastStep.at + lastStep.dur + 0.1) * 1000);
    window.addEventListener("resize", layout);
  })();

  /* ------------------------------------------------------------------ */
  /* menu + sound                                                         */
  /* ------------------------------------------------------------------ */
  (function menu() {
    const nav = $(".site-menu");
    const panel = $(".menu-panel", nav);
    const sheet = $(".menu-sheet", nav);
    const tab = $(".menu-tab", nav);
    const items = $$(".menu-item", nav);
    const links = $$(".menu-link", nav);
    let open = false;
    let running = [];
    const parts = items.map((it) => ({ rule: $(".menu-rule", it), chars: charsOf(it), arrow: $(".menu-arrow", it) }));

    function resetContents() {
      parts.forEach((p) => {
        p.rule.style.clipPath = "inset(0 100% 0 0)";
        hide(p.chars);
        p.arrow.style.transform = "scale(0)";
      });
    }
    function showContents() {
      if (reduced) {
        parts.forEach((p) => {
          p.rule.style.clipPath = "none";
          rise(p.chars);
          p.arrow.style.transform = "none";
        });
        return;
      }
      parts.forEach((p, i) => {
        const at = 0.28 + 0.16 * i;
        running.push(tween({ from: 100, to: 0, duration: 0.6, ease: "power2.out", delay: at, onUpdate: (v) => (p.rule.style.clipPath = `inset(0 ${v}% 0 0)`) }));
        rise(p.chars, { delay: at + 0.1 });
        running.push(tween({ from: 0, to: 1, duration: 0.5, ease: "back.out(2.2)", delay: at + 0.26, onUpdate: (v) => (p.arrow.style.transform = `scale(${v})`) }));
      });
    }
    resetContents();
    let h = 0;
    function setDrop(k) {
      panel.style.height = Math.max(0, h * k) + "px";
      sheet.style.transform = `translateY(${(k - 1) * 100}%)`;
    }
    let drop = 0;
    function set(v) {
      if (v === open) return;
      open = v;
      nav.dataset.open = String(v);
      tab.setAttribute("aria-expanded", String(v));
      links.forEach((l) => (l.tabIndex = v ? 0 : -1));
      running.forEach((r) => r.kill());
      running = [];
      h = sheet.offsetHeight;
      const from = drop;
      if (v) {
        PSound.play("menuPull");
        running.push(tween({ duration: reduced ? 0 : 0.7, ease: "back.out(1.9)", onUpdate: (_, k) => setDrop((drop = from + (1 - from) * PM.ease("back.out(1.9)")(k))) }));
        showContents();
      } else {
        PSound.play("menuPull");
        running.push(
          tween({
            duration: reduced ? 0 : 0.85,
            ease: "none",
            onUpdate: (_, k) => setDrop((drop = from * (1 - PM.ease("power2.inOut")(k)))),
            onComplete: resetContents,
          })
        );
      }
    }
    tab.addEventListener("click", () => set(!open));
    links.forEach((l) => {
      l.addEventListener("click", () => set(false));
      l.addEventListener("mouseenter", () => open && PSound.play("hover"));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) {
        set(false);
        tab.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (open && !e.target.closest(".menu-tab, .menu-sound, .menu-panel")) set(false);
    });
    window.addEventListener("resize", () => {
      if (open) {
        h = sheet.offsetHeight;
        setDrop(1);
      }
    });

    // tab + sound pill arrive once the page is revealed
    const sound = $(".menu-sound");
    if (!reduced) {
      tab.style.transform = "translateY(-115%)";
      sound.style.transform = "translateY(150%)";
      whenRevealed(() => {
        tween({ from: -115, to: 0, duration: 0.75, delay: 0.7, ease: "back.out(1.9)", onUpdate: (v) => (tab.style.transform = `translateY(${v}%)`) });
        tween({ from: 150, to: 0, duration: 0.75, delay: 0.7, ease: "power3.out", onUpdate: (v) => (sound.style.transform = `translateY(${v}%)`) });
      });
    }

    const icon = $(".menu-sound-icon", sound);
    sound.addEventListener("click", () => {
      const v = !PSound.isOn();
      PSound.setOn(v);
      sound.setAttribute("aria-pressed", String(v));
      icon.dataset.on = String(v);
      PipArt.render(icon);
      if (v) PSound.play("toggle");
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".menu-tab, .menu-sound, .hero-mark")) PSound.play("click");
    });
  })();

  /* ------------------------------------------------------------------ */
  /* peel tapes                                                           */
  /* ------------------------------------------------------------------ */
  function peelLoop(el, i) {
    if (reduced) return el.style.setProperty("--peel", "0.35");
    const st = { p: 0 };
    const set = () => el.style.setProperty("--peel", st.p.toFixed(3));
    let visible = false;
    let running = false;
    const every = parseFloat(el.dataset.peelEvery || "3.4");
    async function cycle(first) {
      running = true;
      await PM.wait(first ? parseFloat(el.dataset.peelDelay ?? 1.3 * (i % 4)) : every);
      while (visible) {
        await to(st, { p: 1 }, { duration: 0.5, ease: "power2.out", onUpdate: set });
        await PM.wait(0.9);
        await to(st, { p: 0 }, { duration: 0.8, ease: "power3.inOut", onUpdate: set });
        await PM.wait(every);
      }
      running = false;
    }
    let first = true;
    onView(el, (v) => {
      visible = v;
      if (v && !running) {
        cycle(first);
        first = false;
      }
    }, { margin: "15% 0px", once: false });
  }
  whenRevealed(() => $$('[data-peel="loop"]').forEach(peelLoop));

  function peelScroll(el) {
    if (reduced) return el.style.setProperty("--peel", "0");
    let from = 0, until = 1;
    const measure = () => {
      const t = pageTop(el);
      from = t - window.innerHeight * 0.92;
      until = t + el.offsetHeight / 2 - window.innerHeight * 0.46;
      if (until <= from) until = from + 1;
    };
    measure();
    window.addEventListener("resize", measure);
    const e = PM.ease("power1.inOut");
    ticker.add(() => el.style.setProperty("--peel", (1 - e(clamp((window.scrollY - from) / (until - from), 0, 1))).toFixed(3)));
  }
  $$('[data-peel="scroll"]').forEach(peelScroll);

  /* ------------------------------------------------------------------ */
  /* hand-written notes: rules draw, then letters appear one by one      */
  /* ------------------------------------------------------------------ */
  function handNote(note, { delay = 0, auto = true } = {}) {
    const ink = $(".hand-ink", note);
    if (!ink) return () => {};
    const rx = $(".hand-rule--x", ink);
    const ry = $(".hand-rule--y", ink);
    const lines = $$(".hand-line", ink);
    const letters = [];
    lines.forEach((l) => {
      const t = l.textContent;
      l.innerHTML = [...t].map((c) => `<span>${c === " " ? "&nbsp;" : c}</span>`).join("");
      letters.push($$("span", l));
    });
    if (reduced) return () => {};
    const all = letters.flat();
    all.forEach((s) => (s.style.visibility = "hidden"));
    rx.style.transform = "scaleX(0)";
    ry.style.transform = "scaleY(0)";
    let played = false;
    async function play() {
      if (played) return;
      played = true;
      await PM.wait(delay);
      await tween({ from: 0, to: 1, duration: 0.34, ease: "none", onUpdate: (v) => (rx.style.transform = `scaleX(${v})`) });
      await tween({ from: 0, to: 1, duration: 0.26, ease: "none", onUpdate: (v) => (ry.style.transform = `scaleY(${v})`) });
      await PM.wait(0.12);
      for (const line of letters) {
        for (const s of line) {
          s.style.visibility = "visible";
          await PM.wait(0.045);
        }
        await PM.wait(0.12);
      }
    }
    if (auto) whenRevealed(() => onView(note, (v) => v && play(), { margin: "0px 0px -22% 0px" }));
    return play;
  }

  /* ------------------------------------------------------------------ */
  /* HERO                                                                 */
  /* ------------------------------------------------------------------ */
  (function hero() {
    const sec = $(".hero-section");
    const corner = $(".corner-mark", sec);
    const perf = $(".corner-perf", sec);
    const cornerChars = charsOf(corner);
    const titleChars = [...charsOf($(".h4", sec)), ...charsOf($(".h1", sec))];
    const h1 = $(".h1", sec);
    hide(cornerChars);
    hide(titleChars);
    if (!reduced) perf.style.clipPath = "inset(0 0 100% 0)";
    whenRevealed(() => {
      setTimeout(() => rise(titleChars, { stagger: 0.025 }), 300);
      setTimeout(() => {
        tween({ from: 100, to: 0, duration: 0.5, ease: "power2.out", onUpdate: (v) => (perf.style.clipPath = `inset(0 0 ${v}% 0)`) });
        rise(cornerChars, { stagger: 0.012, delay: 0.12 });
      }, 550);
    });
    poke(h1);

    /* the mark drops in, then sits slightly peeled until you press it down */
    const mark = $(".hero-mark", sec);
    const svg = () => mark.firstElementChild;
    if (!reduced) {
      mark.style.transform = isMobile() ? "scale(0)" : "translateY(-170%)";
      whenRevealed(() => {
        setTimeout(() => {
          if (isMobile()) tween({ from: 0, to: 1, duration: 0.85, ease: "back.out(1.6)", onUpdate: (v) => (mark.style.transform = `scale(${v})`) });
          else tween({ from: -170, to: 0, duration: 0.85, ease: "back.out(1.6)", onUpdate: (v) => (mark.style.transform = `translateY(${v}%)`) });
        }, 450);
        setTimeout(idlePeel, 1500 + 450);
      });
    }
    const peel = { p: 0, wobble: 0 };
    let idle = false;
    function drawMark(t) {
      const s = svg();
      if (!s) return;
      const breathe = peel.wobble * 0.05 * Math.sin(t * 0.33 * 2 * Math.PI);
      const p = clamp(peel.p + breathe, 0, 1);
      s.style.transform = `perspective(40vw) rotate3d(1, -1.2, 0, ${(-p * 34).toFixed(2)}deg) translate3d(${(-p * 0.4).toFixed(2)}vw, ${(-p * 0.6).toFixed(2)}vw, 0)`;
      s.style.filter = `drop-shadow(${(0.15 + p * 0.8).toFixed(2)}vw ${(0.3 + p * 1.1).toFixed(2)}vw ${(p * 0.6).toFixed(2)}vw rgba(0,0,0,${(0.18 + p * 0.12).toFixed(2)}))`;
    }
    function idlePeel() {
      idle = true;
      peel.wobble = 1;
      to(peel, { p: 0.6 }, { duration: 1.1, ease: "power3.out" });
      ticker.add(drawMark);
    }
    mark.addEventListener("pointerdown", (e) => {
      if (!idle) return;
      e.preventDefault();
      idle = false;
      PSound.play("press");
      to(peel, { p: 0, wobble: 0 }, { duration: 0.45, ease: "power3.in" }).then(() => {
        ticker.remove(drawMark);
        drawMark(0);
      });
    });
    mark.setAttribute("data-cursor", "");

    /* the roll: pops in, unrolls a strip as you scroll, then snips */
    const tapeBox = $(".hero-tape", sec);
    const roll = $(".tape-roll", tapeBox);
    const strip = $(".tape-strip", tapeBox);
    const cardboard = $(".cardboard-wrapper", sec);
    const intro = { y: 13, s: 0.82 };
    const st = { len: 0, max: 0, v: 0, spin: 0, cut: 0, home: 0, mode: "scrub", tilt: 0, dx: 0, dy: 0 };
    let stripTop0 = 0;
    let reach = 1;
    let cutAt = 0;
    let start = 0;
    function measure() {
      const boxTop = pageTop(tapeBox);
      const cTop = pageTop(cardboard);
      stripTop0 = boxTop + tapeBox.offsetHeight * 0.82;
      // the strip runs down the box and is snipped a little above it
      reach = Math.max(10, Math.min(cTop + cardboard.offsetHeight + vw(6.25), pageTop($(".hero-section")) + $(".hero-section").offsetHeight - vw(20)) - stripTop0);
      cutAt = Math.max(cTop - vw(4.17) - stripTop0, 0);
      start = boxTop + tapeBox.offsetHeight / 2 - window.innerHeight / 2 - 200;
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    function render() {
      const lift = st.mode === "done" ? st.dy : 0;
      roll.style.transform = `translate3d(${st.dx.toFixed(2)}px, calc(${intro.y.toFixed(2)}vw + ${lift.toFixed(2)}px), 0) scale(${intro.s.toFixed(4)}) rotate(${(st.spin + st.tilt).toFixed(2)}deg)`;
      const cutOff = st.cut * cutAt;
      strip.style.setProperty("--len", Math.max(0, st.len - cutOff).toFixed(1) + "px");
      strip.style.transform = `translateY(${cutOff.toFixed(1)}px)`;
    }
    if (reduced) {
      intro.y = 0;
      intro.s = 1;
      st.len = vw(6);
      render();
    } else {
      render();
      whenSweeping(() =>
        to(intro, { y: 0, s: 1 }, { duration: 1.3, ease: "back.out(1.5)", onUpdate: render })
      );
      const stretch = PSound.loop();
      let lastLen = 0;
      let mx = 0, my = 0, hasPointer = false;
      window.addEventListener("pointermove", (e) => {
        mx = e.clientX;
        my = e.clientY;
        hasPointer = true;
      }, { passive: true });
      ticker.add((t, dt) => {
        if (st.mode === "scrub") {
          const y = window.scrollY;
          st.v = Math.max(st.v, y - start, 0);
          const pulled = Math.max(st.v - 420 * (window.innerWidth / 1440), 0);
          const soft = (a, b, k) => {
            const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
            return b * (1 - h) + a * h - k * h * (1 - h);
          };
          const view = y + window.innerHeight - stripTop0 - 160;
          st.len = Math.max(st.len, soft(soft((4 * pulled * pulled) / (pulled + 250), view, 250), reach, 250), 0);
          st.spin = (st.len / (tapeBox.offsetWidth * 0.42)) * (180 / Math.PI) * 0.5;
          const speed = dt > 0 ? (st.len - lastLen) / dt : 0;
          lastLen = st.len;
          const I = clamp(speed / 2, 0, 1);
          stretch.set(0.8 * I, 0.85 + 0.4 * I);
          if (st.len >= reach - 2) {
            st.mode = "finale";
            stretch.set(0);
            PSound.play("cut");
            tapeBox.classList.add("is-cut");
            to(st, { cut: 1 }, { duration: 0.7, ease: "power2.in", onUpdate: render });
            to(st, { spin: st.spin - 40 }, { duration: 1, ease: "power3.inOut", delay: 0.35, onUpdate: render }).then(() => (st.mode = "done"));
          }
          render();
        } else if (st.mode === "done") {
          const k = 1 - Math.exp((-dt / 1000) * 3);
          const r = tapeBox.getBoundingClientRect();
          const gx = hasPointer ? clamp((mx - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1) : 0;
          const gy = hasPointer ? clamp((my - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1) : 0;
          st.tilt += (9 * gx + 2.2 * Math.sin((t * 2 * Math.PI) / 7.3) - st.tilt) * k;
          st.dx += (gx * vw(0.6) - st.dx) * k;
          st.dy += (gy * vw(0.5) + vw(0.3) * Math.sin((t * 2 * Math.PI) / 5.1) - st.dy) * k;
          render();
        }
      });
    }

    /* the sticky note leans toward the cursor and flutters with scroll speed */
    const note = $(".note-paper", sec);
    const noteBox = $(".sticky-note", sec);
    if (!reduced) {
      let px = NaN, py = NaN, flutter = 0, lx = 0, ly = 0, prox = 0, lastY = window.scrollY;
      window.addEventListener("pointermove", (e) => ((px = e.clientX), (py = e.clientY)), { passive: true });
      let visible = true;
      onView(noteBox, (v) => (visible = v), { margin: "25% 0px", once: false });
      ticker.add((t, dt) => {
        if (!visible) return;
        const s = Math.min(dt / 1000, 0.1) || 0.016;
        const y = window.scrollY;
        const speed = Math.min(Math.abs(y - lastY) / s / 1500, 1.2);
        lastY = y;
        flutter += (speed - flutter) * (1 - Math.exp(-(speed > flutter ? 9 : 2.5) * s));
        let tx = 0, ty = 0, tp = 0;
        if (!Number.isNaN(px)) {
          const r = noteBox.getBoundingClientRect();
          const ex = (px - (r.left + r.width / 2)) / r.width;
          const ey = (py - (r.top + r.height / 2)) / r.width;
          tp = Math.max(0, 1 - Math.hypot(ex, ey) / 1.7);
          tx = clamp(ex * 1.4, -1, 1);
          ty = clamp(ey * 1.4, -1, 1);
        }
        const k = 1 - Math.exp(-5 * s);
        lx += (tx - lx) * k;
        ly += (ty - ly) * k;
        prox += (tp - prox) * k;
        const wob = Math.sin(t * 9) * flutter * 6;
        note.style.transform = `rotateX(${(-flutter * 14 + wob - ly * 9 * prox).toFixed(2)}deg) rotateY(${(lx * 12 * prox).toFixed(2)}deg)`;
        note.style.setProperty("--curl", (0.6 + prox * 0.5 + flutter * 0.4).toFixed(3));
        note.style.setProperty("--shade-l", (0.12 + prox * 0.15).toFixed(3));
        note.style.setProperty("--shade-d", (0.06 + flutter * 0.18).toFixed(3));
      });
    }

    /* copy on the cardboard rises as it scrolls into view */
    const copy = $(".cardboard-copy", sec);
    copy.removeAttribute("data-letters");
    const copyChars = splitWords(copy);
    if (!reduced) {
      hide(copyChars);
      let starts = [];
      let c0 = 0, d0 = 1, P = 0;
      const measureCopy = () => {
        const tops = copyChars.map((c) => c.parentElement.offsetTop);
        const mn = Math.min(...tops), mx = Math.max(Math.max(...tops) - mn, 1);
        starts = tops.map((t) => ((t - mn) / mx) * 1 + 0.35 * Math.random());
        c0 = pageTop(copy) - 0.9 * window.innerHeight;
        d0 = copy.offsetHeight + 0.2 * window.innerHeight;
      };
      measureCopy();
      window.addEventListener("resize", measureCopy);
      const e = PM.ease("power3.out");
      const total = 1.95;
      ticker.add(() => {
        if (P >= 1) return;
        const p = clamp((window.scrollY - c0) / d0, 0, 1);
        if (p <= P) return;
        P = p;
        copyChars.forEach((c, i) => {
          const k = clamp((P * total - starts[i]) / 0.6, 0, 1);
          state(c).yp = 130 * (1 - e(k));
          apply(c);
        });
      });
    }

    handNote($(".hero-note", sec), { delay: 0.2 });

    /* eased parallax */
    $$("[data-parallax]", sec).forEach((el) => {
      if (reduced) return;
      const f = parseFloat(el.dataset.parallax) || 0;
      let centre = 0, y = NaN;
      const m = () => (centre = pageTop(el) + el.offsetHeight / 2 - (Number.isNaN(y) ? 0 : y));
      m();
      window.addEventListener("resize", m);
      ticker.add((t, dt) => {
        const target = (window.scrollY + window.innerHeight / 2 - centre) * f;
        y = Number.isNaN(y) ? target : y + (target - y) * (1 - Math.exp((-6 * Math.min(dt, 100)) / 1000));
        el.style.transform = `translate3d(0, ${(Math.round(y * 2) / 2).toFixed(1)}px, 0)`;
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* WAVE BAND — text runs along the wave, roll badges ride in the gaps   */
  /* ------------------------------------------------------------------ */
  (function band() {
    const sec = $(".wave-band");
    const svg = $("svg", sec);
    const path = $("#band-path");
    const textEl = $(".band-text", sec);
    const tp = $("textPath", sec);
    const badgesG = $(".band-badges", sec);
    const NB = String.fromCharCode(160);
    const head = sec.dataset.head.toUpperCase();
    const tail = sec.dataset.tail.toUpperCase();
    const gap = NB.repeat(6);
    const unit = head + gap + tail + NB.repeat(3);
    const reps = 7;
    tp.textContent = unit.repeat(reps);
    const kinds = ["ball-sun", "ball-pink", "ball-sky", "ball-lilac"];
    const badges = [];
    for (let i = 0; i < reps; i++) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", "band-badge");
      const art = PipArt.products[kinds[i % kinds.length]]().replace("<svg ", '<svg x="-75" y="-75" width="150" height="150" ');
      g.innerHTML = art;
      badgesG.append(g);
      badges.push(g);
    }
    let L = 0, T = 0, slot = 0, base = 40, offset = 0, m = 0.9, lastY = window.scrollY, visible = true;
    function place(off) {
      badges.forEach((g, n) => {
        const d = off + n * T + slot;
        if (d < 0 || d > L) {
          g.style.visibility = "hidden";
          return;
        }
        const p = path.getPointAtLength(d);
        const a = path.getPointAtLength(Math.max(d - 8, 0));
        const b = path.getPointAtLength(Math.min(d + 8, L));
        const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
        g.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)}) rotate(${((-off * 0.4) % 360).toFixed(1)})`);
        g.style.visibility = "visible";
      });
    }
    function measure() {
      L = path.getTotalLength();
      try {
        T = textEl.getSubStringLength(0, unit.length);
        slot = textEl.getSubStringLength(0, head.length) + textEl.getSubStringLength(head.length, gap.length) / 2;
      } catch (e) {
        T = 3000;
        slot = 900;
      }
      let lo = 0, hi = L;
      for (let i = 0; i < 30; i++) {
        const mid = (lo + hi) / 2;
        if (path.getPointAtLength(mid).x < 0) lo = mid;
        else hi = mid;
      }
      base = (lo + hi) / 2 + 40;
      offset = base;
      tp.setAttribute("startOffset", offset.toFixed(1));
      place(offset);
    }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(measure);
    window.addEventListener("resize", measure);
    if (reduced) return;
    onView(sec, (v) => (visible = v), { margin: "600px 0px", once: false });
    ticker.add((t, dt) => {
      const y = window.scrollY;
      const d = y - lastY;
      lastY = y;
      if (!visible || !T) return;
      const want = clamp(0.9 + 0.5 * d, -4, 5);
      m += (want - m) * (Math.abs(want - 0.9) > Math.abs(m - 0.9) ? 0.12 : 0.03);
      offset -= (120 * m * dt) / 1000;
      if (offset < base - T) offset += T;
      if (offset > base) offset -= T;
      tp.setAttribute("startOffset", offset.toFixed(1));
      place(offset);
    });
  })();

  /* ------------------------------------------------------------------ */
  /* PRODUCT WHEEL                                                        */
  /* ------------------------------------------------------------------ */
  (function slider() {
    const sec = $(".tape-slider-parent");
    const products = [
      { key: "washi", art: "washi", rail: "washi-plain", word: "Dreamer", name: "Ribbon Road Washi", bg: "#ff7a1a", wordC: "#ffd21f", ring: "#fff1a2", tagBg: "#ffd21f", tagInk: "#c75e05", ink: "#ffe36b",
        tags: ["Journaling", "Gift wrap", "Labels"], copy: "Paper-soft tape that tears by hand, takes a pen and lifts without a fuss. Five patterns a set, one for every mood.", showcase: ["journal", "wrap"], skins: ["clear", "kraft"] },
      { key: "stickers", art: "stickers", rail: "stickers", word: "Cheeky", name: "Pocket Parade Stickers", bg: "#ff8fb8", wordC: "#d6336c", ring: "#ffd6e5", tagBg: "#d6336c", tagInk: "#ffe1ec", ink: "#8f1342",
        tags: ["Planners", "Bottles", "Laptops"], copy: "Thick, waterproof vinyl with clean kiss-cut edges. Made for bottles, binders and anything that should say “this one’s mine.”", showcase: ["tag", "journal"], skins: ["sage", "clear"] },
      { key: "markers", art: "markers", rail: "markers", word: "Bold", name: "Juicy Liner Markers", bg: "#79c8ff", wordC: "#1d6fb0", ring: "#cdebff", tagBg: "#1d6fb0", tagInk: "#d7efff", ink: "#0f4f82",
        tags: ["Lettering", "Posters", "Doodles"], copy: "A brush tip for big headlines and a fine tip for the small print. Bright, quick-drying and gentle on thin paper.", showcase: ["project", "journal"], skins: ["kraft", "clear"] },
      { key: "notebook", art: "notebook", rail: "notebook", word: "Thinker", name: "Dot Day Notebook", bg: "#2e44b8", wordC: "#16278f", ring: "#d9d2f7", tagBg: "#16278f", tagInk: "#c6ccff", ink: "#b7c0ff",
        tags: ["Bullet journals", "Class notes", "Sketches"], copy: "160 pages of smooth 100gsm dot-grid paper that lies flat, takes ink without ghosting and closes with an elastic band.", showcase: ["journal", "project"], skins: ["clear", "sage"] },
      { key: "kit", art: "kit", rail: "kit", word: "Maker", name: "Weekend Bench Kit", bg: "#c3f94b", wordC: "#4f9a14", ring: "#e7fbb0", tagBg: "#4f9a14", tagInk: "#e7fbb0", ink: "#336b0a",
        tags: ["Rainy days", "Family time", "Gifting"], copy: "One box, one Saturday, one finished thing to keep. Every kit packs the tools, the materials and a fold-out guide.", showcase: ["tinker", "wrap"], skins: ["kraft", "clear"] },
    ];
    const N = products.length;
    const step = 360 / N;
    const rail = $(".rail-track", sec);
    rail.innerHTML = products
      .map((p, i) => `<button type="button" aria-label="${p.name}" aria-pressed="${i === 0}" data-i="${i}"><span class="roll-ring"></span><span data-art="product" data-product="${p.rail}"></span></button>`)
      .join("");
    PipArt.renderAll(rail);
    const btns = $$("button", rail);
    const rings = btns.map((b) => $(".roll-ring", b));
    const wheel = { rot: 180 };
    let radius = 0;
    const measureWheel = () => (radius = vw(8.183));
    measureWheel();
    function placeWheel() {
      btns.forEach((b, i) => {
        const a = ((i * step + wheel.rot) * Math.PI) / 180;
        b.style.transform = `translate(${(Math.cos(a) * radius).toFixed(1)}px, ${(Math.sin(a) * radius).toFixed(1)}px)`;
      });
    }
    placeWheel();
    window.addEventListener("resize", () => (measureWheel(), placeWheel()));
    const ringSet = (r, v) => {
      r.style.transform = `scale(${v})`;
      r.style.opacity = v > 0.01 ? 1 : 0;
    };

    const topTitle = $(".top-title", sec);
    const topGlyphs = $$(".glyph", topTitle).map((g) => {
      g.innerHTML = `<span>${g.textContent}</span>`;
      return g.firstElementChild;
    });
    const bottom = $(".bottom-title", sec);
    function buildWord(w) {
      const letters = [...w.toUpperCase()];
      bottom.style.setProperty("--letters", letters.length);
      bottom.innerHTML = letters.map((c, i) => `<span class="glyph" style="--i:${i}"><span>${c}</span></span>`).join("");
      fitWord();
      return $$(".glyph > span", bottom);
    }
    function fitWord() {
      bottom.style.fontSize = "";
      const max = vw(isMobile() ? 92 : 52);
      if (bottom.scrollWidth > max) bottom.style.fontSize = parseFloat(getComputedStyle(bottom).fontSize) * (max / bottom.scrollWidth) + "px";
    }
    let bottomGlyphs = buildWord(products[0].word);
    window.addEventListener("resize", fitWord);

    const kv = $(".kv-spin", sec);
    const showcases = $$(".showcase", sec);
    const cards = showcases.map((s) => $(".showcase-card", s));
    const tapes = showcases.map((s) => $(".showcase-tape", s));
    const left = $(".left", sec);
    const tagBox = $(".tag", left);
    const copyEl = $(".subtext .h5", left);
    const chip = $(".slider-chip", sec);
    const explore = $(".explore-button", sec);
    const exploreText = $(".button-text", explore);
    const bgBase = $(".bg-layer--base", sec);
    const bgNext = $(".bg-layer--next", sec);
    const skins = { clear: "var(--skin-clear)", kraft: "var(--skin-kraft)", sage: "var(--skin-sage)" };
    let index = 0;
    let busy = false;

    function paintVars(p) {
      sec.style.setProperty("--word-colour", p.wordC);
      sec.style.setProperty("--ring", p.ring);
      sec.style.setProperty("--tag-bg", p.tagBg);
      sec.style.setProperty("--tag-ink", p.tagInk);
      sec.style.setProperty("--ink", p.ink);
    }
    let rises = [];
    function fillInfo(p) {
      tagBox.innerHTML = p.tags.map((t, i) => `<h4 class="h6" style="--r:${[-1.7, 0.9, -0.6][i] || 0}deg">${t}</h4>`).join("");
      copyEl.textContent = p.copy;
      rises = splitBody(copyEl);
    }
    function fillShowcase(p, i) {
      cards[i].dataset.scene = p.showcase[i];
      PipArt.render(cards[i]);
      tapes[i].style.setProperty("--skin", skins[p.skins[i]]);
    }
    function setKv(p) {
      kv.dataset.product = p.art;
      PipArt.render(kv);
    }
    const kvPose = { spin: 0, tx: 0, ty: 0 };
    const drawKv = () => (kv.style.transform = `rotateY(${(kvPose.spin + kvPose.ty).toFixed(2)}deg) rotateX(${kvPose.tx.toFixed(2)}deg)`);
    const showSet = (s, ry, rz) => {
      s.style.setProperty("--ry", ry + "deg");
      s.style.setProperty("--rz", rz + "px");
    };
    const dipH = (g) => g.offsetHeight + 2;
    const glyphY = (g, y) => (g.style.transform = `translateY(${y}px)`);

    // initial content
    paintVars(products[0]);
    bgBase.style.background = products[0].bg;
    fillInfo(products[0]);
    products[0].showcase.forEach((_, i) => fillShowcase(products[0], i));
    setKv(products[0]);
    btns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === 0)));

    // pointer tilt for the product
    if (!reduced && finePointer) {
      let tx = 0, ty = 0;
      window.addEventListener("pointermove", (e) => {
        const r = kv.getBoundingClientRect();
        const s = Math.min(window.innerWidth, window.innerHeight) * 0.21;
        ty = clamp((e.clientX - (r.left + r.width / 2)) / s, -1, 1) * 16;
        tx = clamp(-(e.clientY - (r.top + r.height / 2)) / s, -1, 1) * 12;
      }, { passive: true });
      ticker.add((t, dt) => {
        const k = 1 - Math.exp((-dt / 1000) * 4);
        kvPose.tx += (tx - kvPose.tx) * k;
        kvPose.ty += (ty - kvPose.ty) * k;
        drawKv();
      });
    }

    // entrance
    const leftDist = () => -(left.getBoundingClientRect().right + 40);
    if (reduced) {
      ringSet(rings[0], 1);
    } else {
      rings.forEach((r) => ringSet(r, 0));
      [...topGlyphs, ...bottomGlyphs].forEach((g) => glyphY(g, dipH(g)));
      showcases.forEach((s) => showSet(s, -90, -55));
      tapes.forEach((t) => t.style.setProperty("--peel", "0"));
      explore.style.opacity = 0;
      explore.style.transform = `scale(0) translateY(${vw(2.2)}px)`;
      exploreText.style.transform = "translateY(115%)";
      $$(".h6", tagBox).forEach((h) => h.style.setProperty("--tx", leftDist() + "px"));
      rises.forEach((r) => setRise(r, 110));
      chip.style.opacity = 0;
      const io = new IntersectionObserver((en) => {
        if (!en.some((e) => e.isIntersecting)) return;
        io.disconnect();
        tween({ from: 0, to: 1, duration: 0.55, delay: 0.4, ease: "back.out(1.6)", onUpdate: (v) => ringSet(rings[0], v) });
        topGlyphs.forEach((g, i) => { const h = dipH(g); tween({ from: h, to: 0, duration: 0.42, delay: 0.1 + i * 0.08, ease: "power3.out", onUpdate: (v) => glyphY(g, v) }); });
        bottomGlyphs.forEach((g, i) => { const h = dipH(g); tween({ from: h, to: 0, duration: 0.42, delay: 0.26 + i * 0.05, ease: "power3.out", onUpdate: (v) => glyphY(g, v) }); });
        explore.style.opacity = 1;
        tween({ from: 0, to: 1, duration: 0.52, delay: 0.6, ease: "back.out(2.4)", onUpdate: (v) => (explore.style.transform = `scale(${v}) translateY(${(vw(2.2) * (1 - Math.min(v, 1))).toFixed(1)}px)`) });
        tween({ from: 115, to: 0, duration: 0.5, delay: 0.76, ease: "power3.out", onUpdate: (v) => (exploreText.style.transform = `translateY(${v}%)`) });
        showcases.forEach((s, i) => tween({ from: -90, to: 0, duration: 0.39, delay: 0.22 + 0.26 * i, ease: "power2.out", onUpdate: (v) => showSet(s, v, (-55 * Math.abs(v)) / 90) }));
        tapes.forEach((t, i) => tween({ from: 0, to: 1, duration: 0.62, delay: 0.69 + 0.26 * i, ease: "power2.out", onUpdate: (v) => t.style.setProperty("--peel", (1 - v).toFixed(3)) }));
        $$(".h6", tagBox).forEach((h, i) => tween({ from: leftDist(), to: 0, duration: 0.5, delay: 0.2 + 0.07 * i, ease: "power3.out", onUpdate: (v) => h.style.setProperty("--tx", v + "px") }));
        riseBody(rises, 0.2);
        chip.style.opacity = 1;
        tween({ from: -100, to: 0, duration: 0.85, delay: 0.62, ease: "back.out(1.4)", onUpdate: (v) => (chip.style.transform = `translateX(-50%) rotate(-2deg) perspective(420px) rotateY(${v}deg)`) });
      }, { rootMargin: "0px 0px -45% 0px" });
      io.observe(sec);
    }

    async function go(e) {
      e = (e + N) % N;
      if (e === index || busy) return;
      const p = products[e];
      const delta = ((((180 - e * step - wheel.rot) % 360) + 540) % 360) - 180;
      index = e;
      btns.forEach((b, i) => b.setAttribute("aria-pressed", String(i === e)));
      PSound.play("slide");
      explore.setAttribute("aria-label", `Explore ${p.name}`);
      if (reduced) {
        wheel.rot += delta;
        placeWheel();
        rings.forEach((r, i) => ringSet(r, i === e ? 1 : 0));
        bgBase.style.background = p.bg;
        paintVars(p);
        bottomGlyphs = buildWord(p.word);
        setKv(p);
        p.showcase.forEach((_, i) => fillShowcase(p, i));
        fillInfo(p);
        return;
      }
      busy = true;
      setTimeout(() => (busy = false), 1500);
      // rings + wheel
      rings.forEach((r) => {
        const from = parseFloat(r.style.transform.replace(/[^\d.]/g, "")) || 0;
        tween({ from, to: 0, duration: 0.46, ease: "back.in(0.9)", onUpdate: (v) => ringSet(r, Math.max(0, v)) });
      });
      to(wheel, { rot: wheel.rot + delta }, { duration: 0.85, delay: 0.12, ease: "sine.inOut", onUpdate: placeWheel });
      tween({ from: 0, to: 1, duration: 0.55, delay: 0.75, ease: "back.out(1.6)", onUpdate: (v) => ringSet(rings[e], v) });
      // colour sweep
      const H = sec.offsetHeight + vw(10.4);
      bgNext.style.background = p.bg;
      bgNext.style.height = H + "px";
      tween({ from: -H, to: 0, duration: 0.85, delay: 0.75, ease: "power2.out", onUpdate: (v) => (bgNext.style.transform = `translateY(${v}px)`), onComplete: () => {
        bgBase.style.background = p.bg;
        bgNext.style.transform = "translateY(-100%)";
      } });
      setTimeout(() => paintVars(p), 1050);
      // words dip and rise with the new colour
      topGlyphs.forEach((g, i) => {
        const h = dipH(g);
        tween({ from: 0, to: h, duration: 0.32, delay: 0.75 + i * 0.08, ease: "power2.in", onUpdate: (v) => glyphY(g, v) }).then(() =>
          tween({ from: h, to: 0, duration: 0.42, delay: 0.3, ease: "power3.out", onUpdate: (v) => glyphY(g, v) })
        );
      });
      const old = bottomGlyphs;
      await Promise.all(old.map((g, i) => tween({ from: 0, to: dipH(g), duration: 0.32, delay: 0.81 + i * 0.05, ease: "power2.in", onUpdate: (v) => glyphY(g, v) })));
      bottomGlyphs = buildWord(p.word);
      bottomGlyphs.forEach((g) => glyphY(g, dipH(g)));
      bottomGlyphs.forEach((g, i) => tween({ from: dipH(g), to: 0, duration: 0.42, delay: i * 0.05, ease: "power3.out", onUpdate: (v) => glyphY(g, v) }));
    }
    // these run alongside go(): product spin, showcase flips, info swap
    function sideEffects(e) {
      const p = products[e];
      to(kvPose, { spin: 90 }, { duration: 0.45, delay: 0.1, ease: "power2.in", onUpdate: drawKv }).then(() => {
        setKv(p);
        kvPose.spin = -90;
        to(kvPose, { spin: 0 }, { duration: 0.45, ease: "power2.out", onUpdate: drawKv });
      });
      showcases.forEach((s, i) => {
        tween({ from: 0, to: 90, duration: 0.39, delay: 0.18 + 0.26 * i, ease: "power2.in", onUpdate: (v) => showSet(s, v, (-55 * v) / 90) }).then(() => {
          fillShowcase(p, i);
          tween({ from: -90, to: 0, duration: 0.39, ease: "power2.out", onUpdate: (v) => showSet(s, v, (-55 * Math.abs(v)) / 90) });
        });
      });
      const hs = $$(".h6", tagBox);
      const out = leftDist();
      hs.forEach((h, i) => tween({ from: 0, to: out, duration: 0.34, delay: 0.12 + 0.07 * i, ease: "power2.in", onUpdate: (v) => h.style.setProperty("--tx", v + "px") }));
      bodyLines(rises).forEach((line, i) => line.forEach((r) => tween({ from: 0, to: 110, duration: 0.26, delay: 0.12 + 0.05 * i, ease: "power2.in", onUpdate: (v) => setRise(r, v) })));
      setTimeout(() => {
        fillInfo(p);
        rises.forEach((r) => setRise(r, 110));
        const nh = $$(".h6", tagBox);
        nh.forEach((h) => h.style.setProperty("--tx", out + "px"));
        nh.forEach((h, i) => tween({ from: out, to: 0, duration: 0.5, delay: 0.07 * i + 0.9, ease: "power3.out", onUpdate: (v) => h.style.setProperty("--tx", v + "px") }));
        riseBody(rises, 0.9);
      }, 600);
    }
    function change(e) {
      e = (e + N) % N;
      if (e === index || busy) return;
      if (!reduced) sideEffects(e);
      go(e);
    }
    btns.forEach((b, i) => b.addEventListener("click", () => change(i)));
    $$(".tape-nav button", sec).forEach((b) => b.addEventListener("click", () => change(index + Number(b.dataset.step))));
    rail.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight" && ev.key !== "ArrowUp" && ev.key !== "ArrowDown") return;
      ev.preventDefault();
      const n = (index + (ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1) + N) % N;
      change(n);
      btns[n].focus({ preventScroll: true });
    });
    explore.addEventListener("mouseenter", () => PSound.play("hover"));
  })();

  /* ------------------------------------------------------------------ */
  /* WHY WE MAKE — pinned canvas, camera travels row → row                */
  /* ------------------------------------------------------------------ */
  (function giant() {
    const sec = $(".giant-pinning");
    const pin = $(".giant-pin", sec);
    const canvas = $(".giant-canvas", sec);
    const title = $(".top-title", sec);
    const rows = $$(".giant-row", sec);
    const arrows = $$(".diag-arrow", sec);
    const titleChars = charsOf($(".h2", title));
    const chip = $(".giant-chip", title);
    const rowChars = rows.map((r) => charsOf($(".giant", r)));
    const notes = rows.map((r) => handNote($(".giant-note", r), { auto: false }));
    rows.forEach((r) => poke($(".giant", r)));

    hide(titleChars);
    rowChars.forEach((c) => hide(c));
    if (!reduced) chip.style.opacity = 0;
    whenRevealed(() =>
      onView(title, (v) => {
        if (!v) return;
        rise(titleChars, { stagger: 0.014 });
        if (!reduced) {
          chip.style.opacity = 1;
          tween({ from: -100, to: 0, duration: 0.85, delay: 0.32, ease: "back.out(1.4)", onUpdate: (v2) => (chip.style.transform = `rotate(-2deg) perspective(420px) rotateY(${v2}deg)`) });
        }
      }, { margin: "0px 0px -25% 0px" })
    );

    const revealed = new Set();
    function revealRow(i) {
      if (revealed.has(i)) return;
      revealed.add(i);
      rise(rowChars[i], { stagger: 0.055 });
      notes[i]();
    }
    const drawn = new Set();
    function drawArrow(i) {
      if (drawn.has(i) || !arrows[i]) return;
      drawn.add(i);
      $$("path", arrows[i]).forEach((p, k) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len} ${len + 2}`;
        tween({ from: len + 1, to: 0, duration: k ? 0.3 : 0.9, delay: k ? 0.9 : 0, ease: "power2.inOut", onUpdate: (v) => (p.style.strokeDashoffset = v) });
      });
    }

    if (reduced) {
      rows.forEach((_, i) => revealRow(i));
      return;
    }
    arrows.forEach((a) => $$("path", a).forEach((p) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len} ${len + 2}`;
      p.style.strokeDashoffset = len + 1;
    }));

    /* lay rows out on a zig-zag and plan the camera stops */
    let stops = [], cum = [], total = 1, rowStopIdx = [], arrowAt = [];
    const props = $$(".giant-prop, .giant-slot", sec).map((el) => ({ el, home: 0, tag: el.classList.contains("giant-prop--tag") }));
    function layout() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const m = isMobile();
      const rowYs = m ? [vw(115), vw(228)] : [vw(48), vw(95)];
      const gapX = m ? vw(110) : vw(47);
      let x = m ? vw(2.4) : vw(1);
      title.style.setProperty("--gy", (m ? vw(52) : vw(22)) + "px");
      rows.forEach((r, i) => {
        r.style.setProperty("--gx", x + "px");
        r.style.setProperty("--gy", rowYs[i % 2] + "px");
        const w = r.offsetWidth;
        if (arrows[i]) {
          const a = arrows[i];
          const ax = x + w + (gapX - a.offsetWidth) / 2;
          const yA = rowYs[i % 2] + r.offsetHeight / 2;
          const yB = rowYs[(i + 1) % 2] + r.offsetHeight / 2;
          a.style.setProperty("--gx", ax + "px");
          a.style.setProperty("--gy", (yA + yB) / 2 - a.offsetHeight / 2 + "px");
        }
        x += w + gapX;
      });
      // camera stops: canvas translation that frames each target
      const inset = W * 0.045;
      stops = [];
      rowStopIdx = [];
      arrowAt = [];
      rows.forEach((r, i) => {
        const L = parseFloat(r.style.getPropertyValue("--gx"));
        let R = L + r.offsetWidth;
        $$(".giant-prop", r).forEach((p) => (R = Math.max(R, L + p.offsetLeft + p.offsetWidth)));
        const cy = parseFloat(r.style.getPropertyValue("--gy")) + $(".giant", r).offsetHeight / 2;
        const ty = H / 2 - cy;
        rowStopIdx.push(stops.length);
        if (R - L <= W - 2 * inset) stops.push({ x: W / 2 - (L + R) / 2, y: ty });
        else {
          stops.push({ x: inset - L, y: ty });
          stops.push({ x: W - inset - R, y: ty });
        }
        arrowAt.push(stops.length - 1);
      });
      const tTop = parseFloat(getComputedStyle(title).getPropertyValue("--gy")) || vw(22);
      stops.unshift({ x: stops[0].x, y: H * (m ? 0.22 : 0.4) - (tTop + title.offsetHeight / 2) });
      rowStopIdx = rowStopIdx.map((n) => n + 1);
      arrowAt = arrowAt.map((n) => n + 1);
      cum = [0];
      for (let i = 1; i < stops.length; i++) cum.push(cum[i - 1] + Math.hypot(stops[i].x - stops[i - 1].x, stops[i].y - stops[i - 1].y));
      total = cum[cum.length - 1] || 1;
      pin.style.height = total + H + "px";
      props.forEach((p) => {
        let x0 = p.el.offsetWidth / 2;
        for (let n = p.el; n && n !== canvas; n = n.offsetParent) x0 += n.offsetLeft;
        p.home = x0;
      });
    }
    function at(d) {
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = stops[i - 1], b = stops[i];
      const k = clamp((d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), 0, 1);
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
    }
    layout();
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(layout);
    window.addEventListener("resize", layout);
    window.addEventListener("load", layout);

    const ez = PM.ease("power2.inOut");
    let d = 0;
    ticker.add((t, dt) => {
      const r = pin.getBoundingClientRect();
      const want = clamp(-r.top, 0, total);
      d += (want - d) * (1 - Math.exp((-dt / 1000) * 7));
      if (Math.abs(want - d) < 0.3) d = want;
      const p = at(d);
      canvas.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      // reveal rows as the camera gets close, draw arrows once a row is passed
      rowStopIdx.forEach((si, i) => {
        if (d >= cum[si] - 0.45 * (cum[si] - cum[si - 1])) revealRow(i);
      });
      arrowAt.forEach((si, i) => {
        if (d >= cum[si] - 1) drawArrow(i);
      });
      // props drift against the camera
      const W = window.innerWidth;
      props.forEach((pr) => {
        const s = clamp((p.x + pr.home - W / 2) / (0.65 * W), -1, 1);
        const c = Math.sign(s) * ez(Math.abs(s));
        pr.el.style.setProperty("--pdx", (-0.03 * W * c).toFixed(1) + "px");
        if (pr.tag) pr.el.style.setProperty("--prot", (-8 * c).toFixed(2) + "deg");
      });
    });
  })();

  /* ------------------------------------------------------------------ */
  /* MAKE IT YOURS                                                        */
  /* ------------------------------------------------------------------ */
  (function stick() {
    const sec = $(".make-it-stick");
    const head = $(".stick-headline", sec);
    const chars = charsOf(head);
    const sub = $(".stick-sub", sec);
    const subRises = splitBody(sub);
    hide(chars);
    if (!reduced) subRises.forEach((r) => setRise(r, 110));
    whenRevealed(() =>
      onView(sec, (v) => {
        if (!v) return;
        rise(chars, { stagger: 0.02 });
        riseBody(subRises, 0.3);
      }, { margin: "0px 0px -25% 0px" })
    );
    poke(head);
    if (reduced) return;
    const shot = $(".stick-shot", sec);
    const img = $(".stick-shot-img", sec);
    ticker.add(() => {
      const r = shot.getBoundingClientRect();
      if (r.bottom < -200 || r.top > window.innerHeight + 200) return;
      const l = shot.offsetHeight * 0.06;
      const k = clamp((window.innerHeight / 2 - (r.top + r.height / 2)) / ((window.innerHeight + r.height) / 2), -1, 1);
      img.style.setProperty("--stick-pan", (k * l).toFixed(1) + "px");
    });
  })();

  /* ------------------------------------------------------------------ */
  /* FOOTER — reveal + tape balls with simple physics                     */
  /* ------------------------------------------------------------------ */
  (function footer() {
    const sec = $(".site-footer");
    const linkChars = $$(".footer-link-label", sec).flatMap(charsOf);
    const dots = $$(".footer-link-dot", sec);
    const head = $(".footer-headline", sec);
    const headChars = charsOf(head);
    hide(linkChars);
    hide(headChars);
    if (!reduced) dots.forEach((d) => (d.style.transform = "scale(0)"));
    whenRevealed(() =>
      onView(sec, (v) => {
        if (!v) return;
        rise(linkChars, { stagger: 0.014 });
        if (!reduced) dots.forEach((d, i) => tween({ from: 0, to: 1, duration: 0.5, delay: 0.3 + 0.05 * i, ease: "back.out(2.2)", onUpdate: (v2) => (d.style.transform = `scale(${v2})`) }));
        rise(headChars, { delay: 0.24 });
      }, { margin: "0px 0px -20% 0px" })
    );
    poke(head);

    const area = $(".footer-bottom", sec);
    const balls = $$(".footer-ball", sec);
    if (reduced) {
      // park the balls along the floor
      balls.forEach((b, i) => {
        b.style.top = "auto";
        b.style.bottom = (isMobile() ? 12 : 4) + "vw";
        b.style.left = 2 + i * (isMobile() ? 13 : 14) + "vw";
      });
      return;
    }
    let bodies = [];
    function build() {
      const ar = area.getBoundingClientRect();
      bodies = balls.map((el) => {
        el.style.transform = "";
        const r = el.getBoundingClientRect();
        return { el, r: r.width / 2, x0: r.left - ar.left + r.width / 2, y0: r.top - ar.top + r.height / 2, x: r.left - ar.left + r.width / 2, y: r.top - ar.top + r.height / 2, vx: (Math.random() - 0.5) * 80, vy: 0, a: 0, drag: null };
      });
      draw();
    }
    function draw() {
      bodies.forEach((b) => (b.el.style.transform = `translate3d(${(b.x - b.x0).toFixed(1)}px, ${(b.y - b.y0).toFixed(1)}px, 0) rotate(${b.a.toFixed(1)}deg)`));
    }
    build();
    balls.forEach((b) => (b.style.visibility = "hidden"));
    let running = false;
    let visible = false;
    onView(area, (v) => {
      visible = v;
      if (v && !running) {
        running = true;
        balls.forEach((b) => (b.style.visibility = ""));
      }
    }, { margin: "0px 0px -10% 0px", once: false });
    window.addEventListener("resize", () => {
      const keep = bodies.map((b) => ({ x: b.x, y: b.y }));
      build();
      if (running) bodies.forEach((b, i) => ((b.x = Math.min(keep[i].x, area.clientWidth - b.r)), (b.y = Math.min(keep[i].y, area.clientHeight - b.r))));
    });

    // pointer: nudge balls you sweep through, drag the ones you grab
    let ptr = null;
    let pv = { x: 0, y: 0 };
    area.addEventListener("pointermove", (e) => {
      const ar = area.getBoundingClientRect();
      const p = { x: e.clientX - ar.left, y: e.clientY - ar.top, t: performance.now() };
      if (ptr) {
        const dt = Math.max(1, p.t - ptr.t) / 1000;
        pv = { x: (p.x - ptr.x) / dt, y: (p.y - ptr.y) / dt };
      }
      ptr = p;
      bodies.forEach((b) => {
        if (b.drag) return;
        const dx = b.x - p.x, dy = b.y - p.y;
        if (Math.hypot(dx, dy) < b.r * 1.02) {
          b.vx += clamp(pv.x, -2500, 2500) * 0.35;
          b.vy += clamp(pv.y, -2500, 2500) * 0.35 - 60;
        }
      });
    });
    area.addEventListener("pointerleave", () => (ptr = null));
    balls.forEach((el, i) => {
      el.addEventListener("pointerdown", (e) => {
        const b = bodies[i];
        el.setPointerCapture(e.pointerId);
        const ar = area.getBoundingClientRect();
        b.drag = { ox: e.clientX - ar.left - b.x, oy: e.clientY - ar.top - b.y, moved: 0, lx: e.clientX, ly: e.clientY };
      });
      el.addEventListener("pointermove", (e) => {
        const b = bodies[i];
        if (!b.drag) return;
        const ar = area.getBoundingClientRect();
        const nx = e.clientX - ar.left - b.drag.ox, ny = e.clientY - ar.top - b.drag.oy;
        b.vx = (nx - b.x) * 40;
        b.vy = (ny - b.y) * 40;
        b.x = nx;
        b.y = ny;
        b.drag.moved += Math.hypot(e.clientX - b.drag.lx, e.clientY - b.drag.ly);
        b.drag.lx = e.clientX;
        b.drag.ly = e.clientY;
      });
      const end = () => {
        const b = bodies[i];
        if (!b.drag) return;
        el.dataset.dragged = b.drag.moved > 6 ? "1" : "";
        b.drag = null;
      };
      el.addEventListener("pointerup", end);
      el.addEventListener("pointercancel", end);
      el.addEventListener("click", (e) => {
        if (el.dataset.dragged) {
          e.preventDefault();
          el.dataset.dragged = "";
        }
      });
    });

    let lastThud = 0;
    ticker.add((t, dt) => {
      if (!running || !visible) return;
      const W = area.clientWidth, H = area.clientHeight;
      const g = window.innerWidth * 2.1;
      const sub = 3;
      const h = Math.min(dt, 34) / 1000 / sub;
      for (let s = 0; s < sub; s++) {
        bodies.forEach((b) => {
          if (b.drag) return;
          b.vy += g * h;
          b.x += b.vx * h;
          b.y += b.vy * h;
          if (b.y > H - b.r) {
            if (b.vy > 380 && t - lastThud > 0.08) {
              PSound.play("thud", Math.min(1, b.vy / 2000));
              lastThud = t;
            }
            b.y = H - b.r;
            b.vy *= -0.42;
            b.vx *= 0.985;
            if (Math.abs(b.vy) < 30) b.vy = 0;
          }
          if (b.x < b.r) ((b.x = b.r), (b.vx = Math.abs(b.vx) * 0.5));
          if (b.x > W - b.r) ((b.x = W - b.r), (b.vx = -Math.abs(b.vx) * 0.5));
          b.a += ((b.vx * h) / b.r) * (180 / Math.PI);
        });
        for (let i = 0; i < bodies.length; i++)
          for (let j = i + 1; j < bodies.length; j++) {
            const A = bodies[i], B = bodies[j];
            const dx = B.x - A.x, dy = B.y - A.y;
            const dist = Math.hypot(dx, dy) || 0.01;
            const overlap = A.r + B.r - dist;
            if (overlap <= 0) continue;
            const nx = dx / dist, ny = dy / dist;
            const wa = A.drag ? 0 : B.drag ? 1 : 0.5;
            const wb = 1 - wa;
            A.x -= nx * overlap * wa;
            A.y -= ny * overlap * wa;
            B.x += nx * overlap * wb;
            B.y += ny * overlap * wb;
            const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
            if (vn < 0) {
              const jn = (-(1 + 0.4) * vn) / 2;
              if (!A.drag) ((A.vx -= jn * nx), (A.vy -= jn * ny));
              if (!B.drag) ((B.vx += jn * nx), (B.vy += jn * ny));
              if (-vn > 500 && t - lastThud > 0.08) {
                PSound.play("thud", Math.min(1, -vn / 2500));
                lastThud = t;
              }
            }
          }
      }
      draw();
    });
  })();
})();
