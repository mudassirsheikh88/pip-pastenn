/* Pip & Paste — all sounds are synthesised live with Web Audio (no audio files).
   Sound is off until the visitor turns it on with the pill in the corner. */

(function () {
  "use strict";

  let ctx = null;
  let master = null;
  let on = false;
  let bgm = null;
  const listeners = new Set();

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  function noiseBuffer(seconds = 1) {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  let noise = null;

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  function burst({ freq = 1800, q = 1, type = "bandpass", dur = 0.12, peak = 0.4, sweepTo = null, attack = 0.004 } = {}) {
    noise = noise || noiseBuffer(1.5);
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, attack, peak, dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  function tone({ freq = 440, to = null, type = "sine", dur = 0.15, peak = 0.25, attack = 0.005, delay = 0 } = {}) {
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    env(g, t, attack, peak, dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + attack + dur + 0.05);
  }

  const SOUNDS = {
    click: () => {
      tone({ freq: 1400, to: 900, type: "triangle", dur: 0.05, peak: 0.12 });
    },
    hover: () => tone({ freq: 880, to: 1320, type: "sine", dur: 0.08, peak: 0.07 }),
    menuPull: () => burst({ freq: 900, sweepTo: 3600, q: 0.8, dur: 0.32, peak: 0.35, attack: 0.02 }),
    slide: () => {
      burst({ freq: 600, sweepTo: 2400, q: 0.6, dur: 0.4, peak: 0.25, attack: 0.03 });
      tone({ freq: 520, to: 780, type: "triangle", dur: 0.18, peak: 0.08, delay: 0.25 });
    },
    press: () => {
      burst({ freq: 300, q: 0.7, type: "lowpass", dur: 0.16, peak: 0.6 });
      tone({ freq: 160, to: 90, type: "sine", dur: 0.14, peak: 0.25 });
    },
    cut: () => {
      burst({ freq: 4200, q: 3, dur: 0.06, peak: 0.5 });
      burst({ freq: 2600, q: 2, dur: 0.08, peak: 0.35 });
    },
    pop: () => tone({ freq: 220, to: 440, type: "sine", dur: 0.09, peak: 0.3 }),
    thud: (v = 1) => tone({ freq: 140 + Math.random() * 40, to: 70, type: "sine", dur: 0.1, peak: 0.08 + 0.25 * v }),
    toggle: () => {
      tone({ freq: 660, type: "triangle", dur: 0.08, peak: 0.12 });
      tone({ freq: 990, type: "triangle", dur: 0.12, peak: 0.12, delay: 0.08 });
    },
  };

  function play(name, ...args) {
    if (!on || !ensure()) return;
    (SOUNDS[name] || SOUNDS.click)(...args);
  }

  /* a looping, filtered noise "tape stretch" whose level and pitch follow speed */
  function loop() {
    let src = null, gain = null, filter = null, dead = false;
    return {
      set(level, rate = 1) {
        if (dead) return;
        if (!on) {
          if (gain) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
          return;
        }
        if (!ensure()) return;
        if (!src) {
          noise = noise || noiseBuffer(1.5);
          src = ctx.createBufferSource();
          src.buffer = noise;
          src.loop = true;
          filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.Q.value = 1.4;
          gain = ctx.createGain();
          gain.gain.value = 0;
          src.connect(filter).connect(gain).connect(master);
          src.start();
        }
        gain.gain.setTargetAtTime(Math.max(0, level) * 0.35, ctx.currentTime, 0.06);
        filter.frequency.setTargetAtTime(700 + 2200 * rate, ctx.currentTime, 0.06);
      },
      stop() {
        dead = true;
        try {
          src && src.stop();
        } catch (e) {}
      },
    };
  }

  /* gentle generative background loop */
  function startBgm() {
    if (bgm || !ensure()) return;
    const notes = [261.6, 329.6, 392, 493.9, 440, 392, 329.6, 293.7];
    let i = 0;
    const g = ctx.createGain();
    g.gain.value = 0.05;
    g.connect(master);
    const id = setInterval(() => {
      if (!on) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = notes[i++ % notes.length];
      const e = ctx.createGain();
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(0.8, t + 0.02);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      o.connect(e).connect(g);
      o.start(t);
      o.stop(t + 1);
    }, 420);
    bgm = { stop: () => clearInterval(id) };
  }

  function setOn(v) {
    on = v;
    if (on) {
      ensure();
      startBgm();
    } else if (ctx) ctx.suspend();
    listeners.forEach((f) => f(on));
  }

  window.PSound = {
    play,
    loop,
    setOn,
    isOn: () => on,
    onChange: (f) => (listeners.add(f), () => listeners.delete(f)),
  };
})();
