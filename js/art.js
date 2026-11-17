/* Pip & Paste — original illustration kit (all artwork is drawn here as SVG).
   <div data-art="mark"></div>, data-art="roll" data-product="washi", data-art="scene" data-scene="journal" … */

(function () {
  "use strict";

  // brand colours come from the page's CSS, so colour schemes reach the artwork too
  const css = getComputedStyle(document.documentElement);
  const cssVar = (n, d) => css.getPropertyValue(n).trim() || d;
  const C = {
    lime: cssVar("--lime", "#C3F94B"),
    forest: cssVar("--forest", "#0F3A14"),
    deep: cssVar("--deep", "#0A2A0E"),
    green: cssVar("--hero-ground", "#14501A"),
    orange: "#FF7A1A",
    sun: "#FFD21F",
    kraft: "#C08A52",
    pink: "#FF8FB8",
    rose: "#FF5E7E",
    sky: "#79C8FF",
    cobalt: "#2E44B8",
    lilac: "#CFC2FF",
    cream: "#FFF7E6",
    mint: "#9FE6C4",
    red: "#FF5A4E",
    white: "#FFFFFF",
  };

  let uid = 0;
  const nid = (p) => `${p}-${++uid}`;

  /* ---------- patterns ---------- */
  function pattern(kind, a, b, c, size = 16) {
    const id = nid("pat");
    let body = "";
    switch (kind) {
      case "dots":
        body = `<rect width="${size}" height="${size}" fill="${a}"/><circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.18}" fill="${b}"/>`;
        break;
      case "stripes":
        body = `<rect width="${size}" height="${size}" fill="${a}"/><rect width="${size / 2}" height="${size}" fill="${b}"/>`;
        break;
      case "check":
        body = `<rect width="${size}" height="${size}" fill="${a}"/><rect width="${size / 2}" height="${size / 2}" fill="${b}"/><rect x="${size / 2}" y="${size / 2}" width="${size / 2}" height="${size / 2}" fill="${b}"/>`;
        break;
      case "daisy": {
        const s = size, m = s / 2, r = s * 0.13;
        body = `<rect width="${s}" height="${s}" fill="${a}"/>
          <g fill="${b}">
            <circle cx="${m}" cy="${m - r * 1.3}" r="${r}"/><circle cx="${m}" cy="${m + r * 1.3}" r="${r}"/>
            <circle cx="${m - r * 1.3}" cy="${m}" r="${r}"/><circle cx="${m + r * 1.3}" cy="${m}" r="${r}"/>
          </g><circle cx="${m}" cy="${m}" r="${r * 0.8}" fill="${c || C.sun}"/>`;
        break;
      }
      case "wave":
        body = `<rect width="${size}" height="${size}" fill="${a}"/><path d="M0 ${size * 0.6} Q ${size / 4} ${size * 0.3} ${size / 2} ${size * 0.6} T ${size} ${size * 0.6}" stroke="${b}" stroke-width="${size * 0.14}" fill="none"/>`;
        break;
      case "grid":
        body = `<rect width="${size}" height="${size}" fill="${a}"/><circle cx="2" cy="2" r="1.1" fill="${b}"/>`;
        break;
      default:
        body = `<rect width="${size}" height="${size}" fill="${a}"/>`;
    }
    const rotate = kind === "stripes" ? ` patternTransform="rotate(45)"` : "";
    return { id, def: `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse"${rotate}>${body}</pattern>` };
  }

  /* ---------- the mark: a wide, wavy-edged sticker (191 × 118) ---------- */
  function blob(cx, cy, rx, ry, wave, waves) {
    let d = "";
    const n = 180;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const k = 1 + (wave * Math.sin(t * waves)) / Math.min(rx, ry);
      const x = cx + rx * k * Math.cos(t);
      const y = cy + ry * k * Math.sin(t);
      d += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return d + "Z";
  }

  function mark({ bg = C.forest, fg = C.lime, edge = C.white } = {}) {
    return `<svg viewBox="0 0 191 118" class="art-mark" role="img" aria-label="Pip &amp; Paste">
      <g transform="rotate(-5 95.5 59)">
        <path d="${blob(95.5, 59, 90, 54, 2.2, 22)}" fill="${edge}"/>
        <path d="${blob(95.5, 59, 84, 48, 2.2, 22)}" fill="${bg}"/>
        <ellipse cx="95.5" cy="59" rx="74" ry="39" fill="none" stroke="${fg}" stroke-width="1.6" stroke-dasharray="0.5 5.5" stroke-linecap="round"/>
        <text x="95.5" y="57" text-anchor="middle" class="svg-display" font-size="40" letter-spacing="-.5" fill="${fg}">PIP &amp;</text>
        <text x="95.5" y="91" text-anchor="middle" class="svg-display" font-size="40" letter-spacing="-.5" fill="${fg}">PASTE</text>
        <path d="M34 34 l3 7 7.5 .6 -5.8 4.8 1.9 7.3 -6.6 -4 -6.6 4 1.9 -7.3 -5.8 -4.8 7.5 -.6z" fill="${fg}"/>
        <circle cx="156" cy="84" r="3" fill="${fg}"/>
      </g>
    </svg>`;
  }

  /* ---------- product: washi roll (top-down) ---------- */
  function roll({ pat = "daisy", a = C.pink, b = C.white, c = C.sun, name = ["RIBBON", "ROAD"], sub = "WASHI · 15MM × 10M", tail = true } = {}) {
    const p = pattern(pat, a, b, c, 18);
    const clip = nid("clip");
    const tailPath = tail
      ? `<path d="M196 168 L238 214 L232 220 L226 214 L220 222 L214 214 L208 222 L202 214 L196 222 L176 188 Z" fill="url(#${p.id})" stroke="rgba(0,0,0,.12)" stroke-width="2"/>`
      : "";
    return `<svg viewBox="0 0 250 250" class="art-roll" role="img" aria-label="${name.join(" ")} roll">
      <defs>${p.def}<clipPath id="${clip}"><circle cx="120" cy="120" r="104"/></clipPath></defs>
      <ellipse cx="124" cy="234" rx="78" ry="9" fill="rgba(0,0,0,.18)"/>
      ${tailPath}
      <circle cx="120" cy="120" r="104" fill="url(#${p.id})"/>
      <g clip-path="url(#${clip})" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.4">
        <circle cx="120" cy="120" r="94"/><circle cx="120" cy="120" r="84"/><circle cx="120" cy="120" r="75"/>
      </g>
      <circle cx="120" cy="120" r="104" fill="none" stroke="rgba(0,0,0,.16)" stroke-width="3"/>
      <circle cx="120" cy="120" r="64" fill="${C.cream}"/>
      <circle cx="120" cy="120" r="64" fill="none" stroke="${C.forest}" stroke-width="3"/>
      <circle cx="120" cy="120" r="56" fill="none" stroke="${C.forest}" stroke-width="2" stroke-dasharray="1 6" stroke-linecap="round"/>
      <text x="120" y="88" text-anchor="middle" class="svg-display" font-size="12" letter-spacing="1.5" fill="${C.forest}">PIP &amp; PASTE</text>
      <text x="120" y="${name.length > 1 ? 116 : 130}" text-anchor="middle" class="svg-display" font-size="28" fill="${C.forest}">${name[0]}</text>
      ${name[1] ? `<text x="120" y="142" text-anchor="middle" class="svg-display" font-size="28" fill="${C.forest}">${name[1]}</text>` : ""}
      <rect x="78" y="151" width="84" height="16" rx="8" fill="${a}"/>
      <text x="120" y="162.5" text-anchor="middle" class="svg-body" font-size="8" font-weight="700" fill="${C.forest}">${sub}</text>
      <path d="M40 92 A84 84 0 0 1 92 38" stroke="rgba(255,255,255,.55)" stroke-width="7" stroke-linecap="round" fill="none"/>
    </svg>`;
  }

  /* ---------- product: sticker sheet ---------- */
  function stickers({ bg = C.white } = {}) {
    const sp = `stroke="${C.white}" stroke-width="7" paint-order="stroke" stroke-linejoin="round"`;
    return `<svg viewBox="0 0 220 260" class="art-stickers" role="img" aria-label="Pocket Parade sticker sheet">
      <rect x="18" y="22" width="190" height="230" rx="16" fill="rgba(0,0,0,.18)"/>
      <rect x="10" y="10" width="190" height="230" rx="16" fill="${bg}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="10" y="10" width="190" height="36" rx="16" fill="${C.forest}"/>
      <rect x="10" y="30" width="190" height="16" fill="${C.forest}"/>
      <text x="105" y="35" text-anchor="middle" class="svg-display" font-size="17" fill="${C.lime}" letter-spacing="1">POCKET PARADE</text>
      <path d="M60 64 l9 20 22 2 -17 14 6 21 -20 -12 -20 12 6 -21 -17 -14 22 -2z" fill="${C.sun}" ${sp}/>
      <path d="M150 112 c-22 -14 -36 -28 -36 -42 a16 16 0 0 1 36 -6 a16 16 0 0 1 36 6 c0 14 -14 28 -36 42z" fill="${C.rose}" ${sp}/>
      <g ${sp}><circle cx="60" cy="166" r="28" fill="${C.lime}"/></g>
      <circle cx="51" cy="160" r="3.5" fill="${C.forest}"/><circle cx="69" cy="160" r="3.5" fill="${C.forest}"/>
      <path d="M48 173 q12 11 24 0" stroke="${C.forest}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <g ${sp} fill="none" stroke-linecap="round">
        <path d="M118 196 a32 32 0 0 1 64 0" stroke="${C.orange}" stroke-width="9"/>
        <path d="M128 196 a22 22 0 0 1 44 0" stroke="${C.sky}" stroke-width="9"/>
      </g>
      <path d="M118 196 a32 32 0 0 1 64 0" stroke="${C.orange}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M128 196 a22 22 0 0 1 44 0" stroke="${C.sky}" stroke-width="9" fill="none" stroke-linecap="round"/>
      <g transform="translate(148 150)" ${sp}>
        <circle r="9" fill="${C.sun}"/>
        ${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="7" ry="11" fill="${C.lilac}" transform="rotate(${a}) translate(0 -15)"/>`).join("")}
      </g>
      <g transform="translate(148 150)">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="7" ry="11" fill="${C.lilac}" transform="rotate(${a}) translate(0 -15)"/>`).join("")}<circle r="9" fill="${C.sun}"/></g>
      <path d="M78 210 l-14 22 h12 l-6 16 20 -26 h-12 l8 -12z" fill="${C.orange}" ${sp}/>
    </svg>`;
  }

  /* ---------- product: markers ---------- */
  function marker(x, y, rot, body, cap) {
    return `<g transform="translate(${x} ${y}) rotate(${rot})">
      <rect x="-15" y="-92" width="30" height="168" rx="12" fill="${body}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="-15" y="-92" width="30" height="58" rx="12" fill="${cap}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="-17" y="-38" width="34" height="8" rx="3" fill="${C.forest}"/>
      <rect x="-9" y="-12" width="18" height="60" rx="5" fill="${C.cream}"/>
      <text transform="rotate(-90) translate(-18 4)" text-anchor="middle" class="svg-display" font-size="12" fill="${C.forest}">JUICY</text>
      <rect x="-5" y="-110" width="10" height="20" rx="4" fill="${cap}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="-6" y="76" width="12" height="14" rx="3" fill="${C.forest}"/>
    </g>`;
  }
  function markers() {
    return `<svg viewBox="0 0 240 260" class="art-markers" role="img" aria-label="Juicy Liner markers">
      <ellipse cx="120" cy="244" rx="86" ry="9" fill="rgba(0,0,0,.18)"/>
      ${marker(70, 140, -16, C.white, C.orange)}
      ${marker(170, 140, 16, C.white, C.cobalt)}
      ${marker(120, 130, 0, C.white, C.rose)}
    </svg>`;
  }

  /* ---------- product: notebook ---------- */
  function notebook({ cover = C.cobalt, band = C.orange } = {}) {
    const g = pattern("grid", cover, "rgba(255,255,255,.35)", null, 12);
    return `<svg viewBox="0 0 220 260" class="art-notebook" role="img" aria-label="Dot Day notebook">
      <defs>${g.def}</defs>
      <rect x="40" y="26" width="160" height="220" rx="12" fill="rgba(0,0,0,.18)"/>
      <rect x="40" y="16" width="156" height="218" rx="10" fill="${C.cream}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="28" y="12" width="160" height="220" rx="12" fill="url(#${g.id})" stroke="${C.forest}" stroke-width="3"/>
      <rect x="28" y="12" width="22" height="220" rx="10" fill="rgba(0,0,0,.18)"/>
      <rect x="160" y="12" width="12" height="220" fill="${band}" stroke="${C.forest}" stroke-width="2"/>
      <rect x="62" y="70" width="86" height="72" rx="8" fill="${C.cream}" stroke="${C.forest}" stroke-width="3"/>
      <text x="105" y="100" text-anchor="middle" class="svg-display" font-size="24" fill="${C.forest}">DOT</text>
      <text x="105" y="124" text-anchor="middle" class="svg-display" font-size="24" fill="${C.forest}">DAY</text>
      <text x="105" y="136" text-anchor="middle" class="svg-body" font-size="7" font-weight="700" fill="${C.forest}">A5 · 160 PAGES</text>
      <path d="M96 232 v24 l9 -8 9 8 v-24" fill="${C.lime}" stroke="${C.forest}" stroke-width="2.5"/>
    </svg>`;
  }

  /* ---------- product: DIY kit box ---------- */
  function kit() {
    const st = pattern("stripes", C.sun, C.orange, null, 14);
    return `<svg viewBox="0 0 260 250" class="art-kit" role="img" aria-label="Weekend Bench craft kit">
      <defs>${st.def}</defs>
      <ellipse cx="130" cy="232" rx="104" ry="10" fill="rgba(0,0,0,.18)"/>
      <rect x="30" y="86" width="200" height="140" rx="12" fill="url(#${st.id})" stroke="${C.forest}" stroke-width="3"/>
      <rect x="56" y="110" width="148" height="92" rx="10" fill="${C.cream}" stroke="${C.forest}" stroke-width="3"/>
      <circle cx="84" cy="146" r="13" fill="${C.pink}"/><circle cx="108" cy="166" r="11" fill="${C.sky}"/>
      <circle cx="86" cy="178" r="9" fill="${C.lime}"/><circle cx="112" cy="138" r="8" fill="${C.lilac}"/>
      <path d="M140 126 l40 50 M180 126 l-40 50" stroke="${C.forest}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="136" cy="182" r="9" fill="none" stroke="${C.red}" stroke-width="5"/><circle cx="184" cy="182" r="9" fill="none" stroke="${C.red}" stroke-width="5"/>
      <rect x="22" y="56" width="216" height="40" rx="10" fill="${C.forest}" stroke="${C.forest}" stroke-width="3"/>
      <text x="130" y="84" text-anchor="middle" class="svg-display" font-size="22" fill="${C.lime}" letter-spacing="1">WEEKEND BENCH</text>
      <path d="M130 56 c-30 -34 -58 -20 -40 -4 c10 9 30 6 40 4 c10 2 30 5 40 -4 c18 -16 -10 -30 -40 4z" fill="${C.rose}" stroke="${C.forest}" stroke-width="3"/>
    </svg>`;
  }

  /* ---------- gift ---------- */
  function gift({ wrap = C.pink, alt = C.white, ribbon = C.white } = {}) {
    const p = pattern("check", wrap, alt, null, 22);
    const w = pattern("dots", C.lime, C.forest, null, 10);
    return `<svg viewBox="0 0 260 260" class="art-gift" role="img" aria-label="Wrapped gift">
      <defs>${p.def}${w.def}</defs>
      <ellipse cx="130" cy="244" rx="104" ry="10" fill="rgba(0,0,0,.18)"/>
      <rect x="30" y="92" width="200" height="146" rx="8" fill="url(#${p.id})" stroke="${C.forest}" stroke-width="3"/>
      <rect x="22" y="76" width="216" height="34" rx="6" fill="url(#${p.id})" stroke="${C.forest}" stroke-width="3"/>
      <rect x="116" y="76" width="28" height="162" fill="${ribbon}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="42" y="168" width="70" height="20" fill="url(#${w.id})" transform="rotate(-12 77 178)" opacity=".95"/>
      <path d="M130 78 c-20 -50 -74 -40 -54 -8 c10 14 40 10 54 8z M130 78 c20 -50 74 -40 54 -8 c-10 14 -40 10 -54 8z" fill="${ribbon}" stroke="${C.forest}" stroke-width="3"/>
      <path d="M130 80 l-20 40 M130 80 l22 36" stroke="${C.forest}" stroke-width="3" fill="none"/>
      <g transform="translate(176 150) rotate(10)">
        <rect x="0" y="0" width="54" height="34" rx="5" fill="${C.cream}" stroke="${C.forest}" stroke-width="3"/>
        <circle cx="9" cy="17" r="4" fill="${C.forest}"/>
        <text x="32" y="22" text-anchor="middle" class="svg-hand" font-size="13" fill="${C.forest}">for u!</text>
      </g>
    </svg>`;
  }

  /* ---------- scene cards (rounded squares) ---------- */
  function sceneShell(bg, inner, label) {
    return `<svg viewBox="0 0 300 300" class="art-scene" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="300" fill="${bg}"/>
      ${inner}
    </svg>`;
  }

  function sceneJournal() {
    const g = pattern("grid", C.cream, "rgba(15,58,20,.25)", null, 10);
    const w1 = pattern("daisy", C.pink, C.white, C.sun, 14);
    const w2 = pattern("stripes", C.sky, C.white, null, 10);
    return sceneShell(C.lilac, `<defs>${g.def}${w1.def}${w2.def}</defs>
      <g transform="rotate(-6 150 160)">
        <rect x="34" y="72" width="236" height="170" rx="8" fill="rgba(0,0,0,.18)"/>
        <rect x="28" y="64" width="120" height="170" rx="6" fill="url(#${g.id})" stroke="${C.forest}" stroke-width="3"/>
        <rect x="148" y="64" width="120" height="170" rx="6" fill="url(#${g.id})" stroke="${C.forest}" stroke-width="3"/>
        <rect x="44" y="56" width="70" height="20" fill="url(#${w1.id})" transform="rotate(-8 79 66)"/>
        <rect x="170" y="94" width="78" height="62" fill="${C.white}" stroke="${C.forest}" stroke-width="2.5"/>
        <circle cx="209" cy="120" r="14" fill="${C.sun}"/><path d="M178 150 l22 -18 18 14 12 -8 18 12z" fill="${C.mint}"/>
        <rect x="186" y="86" width="46" height="16" fill="url(#${w2.id})" transform="rotate(6 209 94)"/>
        <text x="88" y="104" text-anchor="middle" class="svg-hand" font-size="16" fill="${C.forest}">sunday</text>
        <path d="M46 126 h80 M46 144 h66 M46 162 h76 M46 180 h52" stroke="${C.forest}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
        <path d="M100 206 c-10 -7 -16 -13 -16 -19 a7 7 0 0 1 16 -3 a7 7 0 0 1 16 3 c0 6 -6 12 -16 19z" fill="${C.rose}"/>
        <path d="M170 186 q20 -14 40 0 t40 0" stroke="${C.cobalt}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M170 204 h60" stroke="${C.forest}" stroke-width="3" stroke-linecap="round" opacity=".6"/>
      </g>`, "Journal spread decorated with washi and stickers");
  }

  function sceneProject() {
    return sceneShell(C.sky, `
      <g transform="rotate(4 150 150)">
        <rect x="40" y="58" width="226" height="176" rx="8" fill="rgba(0,0,0,.18)"/>
        <rect x="32" y="50" width="226" height="176" rx="8" fill="${C.white}" stroke="${C.forest}" stroke-width="3"/>
        <rect x="56" y="66" width="178" height="30" rx="4" fill="${C.forest}"/>
        <text x="145" y="88" text-anchor="middle" class="svg-display" font-size="20" fill="${C.lime}" letter-spacing="1">OUR SOLAR SYSTEM</text>
        <circle cx="76" cy="160" r="26" fill="${C.sun}" stroke="${C.forest}" stroke-width="3"/>
        <ellipse cx="76" cy="160" rx="62" ry="22" fill="none" stroke="${C.forest}" stroke-width="2" stroke-dasharray="3 5"/>
        <circle cx="130" cy="150" r="10" fill="${C.orange}" stroke="${C.forest}" stroke-width="2.5"/>
        <circle cx="168" cy="170" r="14" fill="${C.cobalt}" stroke="${C.forest}" stroke-width="2.5"/>
        <circle cx="214" cy="148" r="18" fill="${C.pink}" stroke="${C.forest}" stroke-width="2.5"/>
        <ellipse cx="214" cy="148" rx="30" ry="7" fill="none" stroke="${C.forest}" stroke-width="2.5"/>
        <path d="M60 206 l6 -12 6 12 -12 -8 h12z" fill="${C.sun}"/>
        <path d="M228 206 l6 -12 6 12 -12 -8 h12z" fill="${C.sun}"/>
        <rect x="26" y="40" width="44" height="16" fill="${C.lime}" opacity=".9" transform="rotate(-30 48 48)"/>
        <rect x="222" y="40" width="44" height="16" fill="${C.lime}" opacity=".9" transform="rotate(30 244 48)"/>
      </g>
      <g transform="translate(196 236) rotate(-24)">
        <rect x="-70" y="-10" width="120" height="20" rx="8" fill="${C.white}" stroke="${C.forest}" stroke-width="3"/>
        <rect x="18" y="-10" width="40" height="20" rx="8" fill="${C.orange}" stroke="${C.forest}" stroke-width="3"/>
      </g>`, "School project poster");
  }

  function sceneWrap() {
    const p = pattern("dots", C.sun, C.orange, null, 14);
    const w = pattern("wave", C.lime, C.forest, null, 14);
    return sceneShell(C.pink, `<defs>${p.def}${w.def}</defs>
      <rect x="-20" y="196" width="340" height="120" fill="url(#${p.id})" transform="rotate(-6 150 250)"/>
      <g transform="translate(46 54) scale(.82)">
        <rect x="30" y="92" width="200" height="146" rx="8" fill="${C.white}" stroke="${C.forest}" stroke-width="3"/>
        <rect x="22" y="76" width="216" height="34" rx="6" fill="${C.white}" stroke="${C.forest}" stroke-width="3"/>
        <rect x="30" y="140" width="200" height="22" fill="url(#${w.id})"/>
        <rect x="116" y="76" width="28" height="162" fill="url(#${w.id})"/>
        <path d="M130 78 c-20 -50 -74 -40 -54 -8 c10 14 40 10 54 8z M130 78 c20 -50 74 -40 54 -8 c-10 14 -40 10 -54 8z" fill="${C.lime}" stroke="${C.forest}" stroke-width="3"/>
      </g>
      <g transform="translate(240 70) rotate(30)" fill="none" stroke="${C.forest}" stroke-width="4" stroke-linecap="round">
        <circle cx="-10" cy="40" r="9"/><circle cx="10" cy="40" r="9"/><path d="M-6 32 l14 -46 M6 32 l-14 -46"/>
      </g>`, "Gift wrapped with washi tape");
  }

  function sceneTag() {
    return sceneShell(C.sun, `
      <ellipse cx="150" cy="276" rx="60" ry="9" fill="rgba(0,0,0,.18)"/>
      <rect x="120" y="22" width="60" height="30" rx="8" fill="${C.forest}"/>
      <rect x="96" y="48" width="108" height="226" rx="38" fill="${C.cobalt}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="108" y="64" width="12" height="160" rx="6" fill="rgba(255,255,255,.3)"/>
      <path d="M150 92 l7 15 16 1 -12 11 4 16 -15 -9 -15 9 4 -16 -12 -11 16 -1z" fill="${C.sun}" stroke="${C.white}" stroke-width="5" paint-order="stroke" stroke-linejoin="round"/>
      <g transform="translate(150 182) rotate(-6)">
        <rect x="-44" y="-18" width="88" height="36" rx="18" fill="${C.cream}" stroke="${C.white}" stroke-width="5" paint-order="stroke"/>
        <text y="7" text-anchor="middle" class="svg-hand" font-size="20" fill="${C.forest}">mine!</text>
      </g>
      <circle cx="130" cy="236" r="14" fill="${C.lime}" stroke="${C.white}" stroke-width="5" paint-order="stroke"/>
      <path d="M176 226 c-10 -7 -16 -13 -16 -19 a7 7 0 0 1 16 -3 a7 7 0 0 1 16 3 c0 6 -6 12 -16 19z" fill="${C.rose}" stroke="${C.white}" stroke-width="5" paint-order="stroke"/>
      <g transform="translate(244 110) rotate(14)">
        <rect x="-30" y="-16" width="60" height="32" rx="6" fill="${C.white}" stroke="${C.forest}" stroke-width="3"/>
        <path d="M-18 -4 h36 M-18 6 h24" stroke="${C.forest}" stroke-width="3" stroke-linecap="round"/>
      </g>`, "Water bottle personalized with stickers");
  }

  function sceneTinker() {
    const flags = [C.orange, C.pink, C.sky, C.sun, C.lilac, C.lime, C.red];
    return sceneShell(C.mint, `
      <path d="M-10 46 Q150 120 310 46" stroke="${C.forest}" stroke-width="3" fill="none"/>
      ${flags.map((f, i) => {
        const x = 12 + i * 44, t = x / 300;
        const y = 46 + 4 * t * (1 - t) * 74 * 0.98;
        return `<path d="M${x} ${y} l34 ${(i - 3) * 1.2} -15 40z" fill="${f}" stroke="${C.forest}" stroke-width="2.5" stroke-linejoin="round"/>`;
      }).join("")}
      <g transform="translate(62 128) scale(.72)">${kitInner()}</g>
      <circle cx="58" cy="262" r="14" fill="${C.pink}"/><circle cx="88" cy="276" r="10" fill="${C.sun}"/><circle cx="252" cy="268" r="12" fill="${C.sky}"/>`, "Weekend craft with paper bunting");
  }
  function kitInner() {
    return `<rect x="30" y="86" width="200" height="140" rx="12" fill="${C.sun}" stroke="${C.forest}" stroke-width="4"/>
      <rect x="56" y="110" width="148" height="92" rx="10" fill="${C.cream}" stroke="${C.forest}" stroke-width="4"/>
      <circle cx="90" cy="150" r="16" fill="${C.pink}"/><circle cx="124" cy="170" r="13" fill="${C.sky}"/><circle cx="160" cy="146" r="12" fill="${C.lilac}"/>
      <rect x="22" y="56" width="216" height="40" rx="10" fill="${C.forest}"/>
      <text x="130" y="84" text-anchor="middle" class="svg-display" font-size="22" fill="${C.lime}">WEEKEND BENCH</text>`;
  }

  /* ---------- stack (CTA) ---------- */
  function stack() {
    return `<svg viewBox="0 0 400 400" class="art-stack" role="img" aria-label="A stack of Pip &amp; Paste products">
      <g transform="translate(70 120) rotate(-8) scale(1.05)">${notebookInner()}</g>
      <g transform="translate(150 30) scale(.85)">${rollInner(C.sky, C.white, "stripes", "SKY", "STRIPE")}</g>
      <g transform="translate(20 210) scale(.62)">${rollInner(C.pink, C.white, "daisy", "RIBBON", "ROAD")}</g>
      <g transform="translate(250 220) scale(.6)">${rollInner(C.sun, C.orange, "check", "PICNIC", "CHECK")}</g>
    </svg>`;
  }
  function notebookInner() {
    return `<rect x="28" y="12" width="160" height="220" rx="12" fill="${C.cobalt}" stroke="${C.forest}" stroke-width="3"/>
      <rect x="160" y="12" width="12" height="220" fill="${C.orange}" stroke="${C.forest}" stroke-width="2"/>
      <rect x="62" y="70" width="86" height="72" rx="8" fill="${C.cream}" stroke="${C.forest}" stroke-width="3"/>
      <text x="105" y="100" text-anchor="middle" class="svg-display" font-size="24" fill="${C.forest}">DOT</text>
      <text x="105" y="124" text-anchor="middle" class="svg-display" font-size="24" fill="${C.forest}">DAY</text>`;
  }
  function rollInner(a, b, pat, n1, n2) {
    const p = pattern(pat, a, b, C.sun, 18);
    return `<defs>${p.def}</defs>
      <circle cx="120" cy="120" r="104" fill="url(#${p.id})" stroke="${C.forest}" stroke-width="3"/>
      <circle cx="120" cy="120" r="62" fill="${C.cream}" stroke="${C.forest}" stroke-width="3"/>
      <text x="120" y="116" text-anchor="middle" class="svg-display" font-size="28" fill="${C.forest}">${n1}</text>
      <text x="120" y="142" text-anchor="middle" class="svg-display" font-size="28" fill="${C.forest}">${n2}</text>`;
  }

  /* ---------- small icons (footer) ---------- */
  function icon(kind) {
    const s = `fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
    const paths = {
      roll: `<circle cx="24" cy="24" r="18" ${s}/><circle cx="24" cy="24" r="8" ${s}/><path d="M38 34 l8 10" ${s}/>`,
      sticker: `<path d="M24 6 l5 11 12 1 -9 8 3 12 -11 -6 -11 6 3 -12 -9 -8 12 -1z" ${s}/>`,
      marker: `<rect x="17" y="6" width="14" height="30" rx="5" ${s}/><path d="M20 36 l4 8 4 -8" ${s}/>`,
      notebook: `<rect x="10" y="6" width="28" height="36" rx="4" ${s}/><path d="M16 6 v36 M20 16 h12" ${s}/>`,
      kit: `<rect x="6" y="16" width="36" height="26" rx="4" ${s}/><path d="M4 16 h40 M24 16 c-6 -10 -16 -6 -8 0 M24 16 c6 -10 16 -6 8 0" ${s}/>`,
    };
    return `<svg viewBox="0 0 48 48" class="art-icon" aria-hidden="true">${paths[kind] || ""}</svg>`;
  }

  /* ---------- hero props ---------- */
  function paperclip() {
    return `<svg viewBox="0 0 80 88" class="art-clip" aria-hidden="true">
      <path d="M30 80 L14 40 C8 24 18 12 30 8 C42 4 52 12 56 24 L70 62 C74 74 66 82 58 84 C50 86 44 80 42 74 L30 40 C28 34 32 30 36 30 C40 30 42 34 44 38 L54 64"
        fill="none" stroke="#C9CEC4" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M30 80 L14 40 C8 24 18 12 30 8 C42 4 52 12 56 24 L70 62" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.6" stroke-linecap="round"/>
    </svg>`;
  }

  function printPaper() {
    const p = pattern("daisy", C.cream, C.pink, C.sun, 44);
    const q = pattern("dots", "transparent", C.mint, null, 22);
    return `<svg viewBox="0 0 450 480" class="art-print" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>${p.def}${q.def}</defs>
      <rect width="450" height="480" fill="url(#${p.id})"/>
      <rect width="450" height="480" fill="url(#${q.id})" opacity=".55"/>
    </svg>`;
  }

  /* hand-drawn arrow between giant rows (viewBox 260 × 173) */
  function arrow(dir = "down") {
    const line = dir === "down"
      ? "M14 18 C 70 30, 120 60, 150 92 S 210 150, 246 158"
      : "M14 158 C 60 150, 110 120, 150 84 S 214 26, 246 16";
    const head = dir === "down" ? "M228 142 L247 158 L224 166" : "M224 10 L247 15 L236 37";
    return `<svg viewBox="0 0 260 173" aria-hidden="true"><path class="arrow-line" d="${line}"/><path class="arrow-head" d="${head}"/></svg>`;
  }

  function indexBadge(n) {
    return `<svg viewBox="0 0 40 40" class="art-index" aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" stroke-width="2.6"/>
      <text x="20" y="27.5" text-anchor="middle" class="svg-display" font-size="21" fill="currentColor">${n}</text>
    </svg>`;
  }

  /* mini tape ball for the sound toggle */
  function ball(a = C.lime, b = C.forest) {
    const p = pattern("dots", a, b, null, 10);
    return `<svg viewBox="0 0 40 40" aria-hidden="true"><defs>${p.def}</defs>
      <circle cx="20" cy="20" r="18" fill="url(#${p.id})" stroke="${C.forest}" stroke-width="2"/>
      <circle cx="20" cy="20" r="8" fill="${C.cream}" stroke="${C.forest}" stroke-width="2"/></svg>`;
  }

  function speaker(on) {
    return `<svg viewBox="0 0 24 24" class="art-speaker" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>
      ${on
        ? `<path d="M16 8.5c1.4 1 2.2 2.2 2.2 3.5s-.8 2.5-2.2 3.5M18.5 5.5c2.3 1.7 3.5 4 3.5 6.5s-1.2 4.8-3.5 6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`
        : `<path d="M16.5 9l5 6M21.5 9l-5 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`}
    </svg>`;
  }

  function social(kind) {
    const s = `fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"`;
    const m = {
      instagram: `<rect x="4" y="4" width="16" height="16" rx="5" ${s}/><circle cx="12" cy="12" r="3.8" ${s}/><circle cx="17" cy="7" r="1.1" fill="currentColor"/>`,
      tiktok: `<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.6 2.6 2.4 4.2 5 4.4" ${s}/>`,
      pinterest: `<circle cx="12" cy="12" r="8" ${s}/><path d="M11 8.5c3-1 5 .6 5 3 0 2.4-2 3.8-4 3.2M11.5 9.5 9.5 19" ${s}/>`,
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${m[kind] || ""}</svg>`;
  }

  /* cursor art (used as CSS backgrounds, so no web fonts inside) */
  const cursors = {
    arrow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 52"><path d="M11 12 L38 30 L26 32 L33 46 L27.5 48.5 L20.5 34.5 L12.5 42 Z" fill="${C.forest}" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><circle cx="31" cy="27" r="2.4" fill="${C.lime}"/></svg>`,
    pointer: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 46 50"><path d="M13 6 C 16 6 17.5 8 17.5 11 L17.5 22 L19 22 C 19 19.5 23 19.5 23 22 L23.5 22 C 23.5 19.5 27.5 19.5 27.5 22 L28 23 C 28 20.5 32 20.5 32 23.5 L32 33 C 32 40 28 45 21 45 C 15 45 12 42 9.5 37 L5.5 29 C 4.5 27 6 25 8 25.5 C 9.5 26 10.5 27.5 11.5 29 L11.5 11 C 11.5 8 12 6 13 6 Z" fill="${C.lime}" stroke="${C.forest}" stroke-width="2.6" stroke-linejoin="round"/></svg>`,
    type: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 41"><path d="M7 4 H11 Q13 4 13 7 V34 Q13 37 11 37 H7 M19 4 H15 Q13 4 13 7 M19 37 H15 Q13 37 13 34" fill="none" stroke="${C.forest}" stroke-width="2.6" stroke-linecap="round"/></svg>`,
  };
  const dataURL = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  /* ---------- registry ---------- */
  const products = {
    washi: () => roll({ pat: "daisy", a: C.pink, b: C.white, c: C.sun, name: ["RIBBON", "ROAD"], sub: "WASHI · 15MM × 10M" }),
    "washi-plain": () => roll({ pat: "daisy", a: C.pink, b: C.white, c: C.sun, name: ["RIBBON", "ROAD"], sub: "WASHI · 15MM × 10M", tail: false }),
    "washi-sky": () => roll({ pat: "stripes", a: C.sky, b: C.white, name: ["SKY", "STRIPE"], sub: "WASHI · 20MM × 10M" }),
    "washi-sun": () => roll({ pat: "check", a: C.sun, b: C.orange, name: ["PICNIC", "CHECK"], sub: "WASHI · 15MM × 10M" }),
    "washi-lime": () => roll({ pat: "dots", a: C.lime, b: C.forest, name: ["POLKA", "PARK"], sub: "WASHI · 10MM × 10M" }),
    "washi-lilac": () => roll({ pat: "wave", a: C.lilac, b: C.cobalt, name: ["TIDE", "LINE"], sub: "WASHI · 15MM × 10M" }),
    "ball-sun": () => roll({ pat: "check", a: C.sun, b: C.orange, name: ["PICNIC", "CHECK"], sub: "WASHI", tail: false }),
    "ball-sky": () => roll({ pat: "stripes", a: C.sky, b: C.white, name: ["SKY", "STRIPE"], sub: "WASHI", tail: false }),
    "ball-pink": () => roll({ pat: "daisy", a: C.pink, b: C.white, c: C.sun, name: ["RIBBON", "ROAD"], sub: "WASHI", tail: false }),
    "ball-lilac": () => roll({ pat: "wave", a: C.lilac, b: C.cobalt, name: ["TIDE", "LINE"], sub: "WASHI", tail: false }),
    stickers: () => stickers(),
    markers: () => markers(),
    notebook: () => notebook(),
    kit: () => kit(),
  };
  const scenes = { journal: sceneJournal, project: sceneProject, wrap: sceneWrap, tag: sceneTag, tinker: sceneTinker };

  function render(el) {
    const kind = el.dataset.art;
    let svg = "";
    switch (kind) {
      case "mark":
        svg = mark(el.dataset.tone === "lime" ? { bg: C.lime, fg: C.forest, edge: C.forest } : {});
        break;
      case "roll":
      case "product":
        svg = (products[el.dataset.product] || products.washi)();
        break;
      case "scene":
        svg = (scenes[el.dataset.scene] || sceneJournal)();
        break;
      case "gift": svg = gift(); break;
      case "stack": svg = stack(); break;
      case "clip": svg = paperclip(); break;
      case "print": svg = printPaper(); break;
      case "arrow": svg = arrow(el.dataset.dir); break;
      case "index": svg = indexBadge(el.dataset.n); break;
      case "ball": svg = ball(); break;
      case "icon": svg = icon(el.dataset.icon); break;
      case "social": svg = social(el.dataset.icon); break;
      case "speaker": svg = speaker(el.dataset.on === "true"); break;
    }
    el.innerHTML = svg;
  }

  window.PipArt = {
    render,
    mark,
    speaker,
    products,
    scenes,
    colors: C,
    cursor: (k) => dataURL(cursors[k]),
    renderAll: (root = document) => root.querySelectorAll("[data-art]").forEach(render),
  };
  window.PipArt.renderAll();
})();
