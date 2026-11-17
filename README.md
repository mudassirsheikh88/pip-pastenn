# Pip & Paste — Make it yours

A one-page brand site for **Pip & Paste**, a playful, premium stationery and DIY craft brand
(washi tape, stickers, markers, notebooks and weekend craft kits).

Plain HTML, CSS and JavaScript. No build step, no dependencies. All artwork is original SVG drawn
in `js/art.js`, and every sound is synthesised live, so there are no image or audio files.

## Run it

```bash
cd ~/Documents/"New project"
python3 -m http.server 8000
```

Open http://localhost:8000 and press `Ctrl+C` in Terminal to stop. Double-clicking `index.html` also works.
Fonts load from Google Fonts, so you need an internet connection to see the intended typography.

## Colours

Citrus palette: butter yellow `#ffe45c` with navy `#13246b`. Change them in `:root` at the top of `styles.css`;
the illustrations pick them up automatically.

## What happens on the page

| Part | Behaviour |
| --- | --- |
| Preloader | The sticker logo unrolls in 3D, then six colour sheets with curved edges lift away one after another |
| Cursor | Custom arrow; turns into a pointing hand over links and buttons, shrinks while pressed (mouse only) |
| Smooth scroll | Eased wheel scrolling (mouse wheel / trackpad only; keyboard and touch stay native) |
| "Pull me" tab | Drops a paper menu; dotted rules draw in, letters pop up in random order, thumbnails pop on hover |
| Sound pill | Off by default. Turns on synthesised clicks, menu pulls, tape stretch/snip, ball thuds and a soft loop |
| Hero | Letters rise in random order and lean away from the cursor; the logo sits half-peeled until you press it |
| Tape roll | Scroll and it unrolls a strip down the cardboard box, snips it, then drifts with the mouse |
| Sticky note | Leans toward the cursor and flutters with scroll speed |
| Tape pieces | Peel and re-stick on a loop; the big tape between the last two cards peels as you scroll |
| Hand notes | A ruled corner draws, then the words write themselves |
| Wave band | Text runs along the wave, speeds up with scrolling, and tape-roll badges ride in the gaps |
| Product wheel | Spin the wheel (or use ← →): the background sweeps to a new colour, the words dip and rise, the product flips |
| Why we make | Pinned section: the camera zig-zags across "To jot / build / wrap / tag / tinker" |
| Footer | Tape balls and social discs drop in with physics; push or drag them |

**Reduced motion:** with the system's "Reduce motion" setting on, the preloader, smooth scroll, parallax,
pinned camera and physics are switched off and everything is laid out statically.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page structure and copy |
| `styles.css` | Layout (vw-based), colours, type, mobile (≤ 743 px) and reduced-motion rules |
| `js/art.js` | All illustrations: logo, products, scenes, cursor, icons |
| `js/motion.js` | Small animation toolkit: ticker, easing, tweens, letter splitting |
| `js/sound.js` | Web Audio sound effects |
| `js/main.js` | Every section's behaviour |
| `_original/` | The site before the first rebrand |
| `_v1/` | Files from the first Pip & Paste version that are no longer used |

## Editing tips

- **Products:** the `products` array near the top of the "PRODUCT WHEEL" block in `js/main.js`
  (word, colours, tags, copy, showcase scenes).
- **Colours:** `:root` in `styles.css`; illustration colours in the `C` object in `js/art.js`.
- **Copy:** everything else lives in `index.html`.
