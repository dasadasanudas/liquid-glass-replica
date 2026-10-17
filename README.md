# liquid-glass-replica

Independent WebGL2 implementation of a macOS-style Liquid Glass effect and UI direction, reconstructed from public behavior analysis and measured/inferred values from the project handoff.

Live demo (GitHub Pages): https://dasadasanudas.github.io/liquid-glass-replica/

> This repository does **not** include Apple proprietary binaries, assets, or source code.

## Project layout

- `/index.html` — static entry point (no build step)
- `/src/main.js` — app wiring, interaction, rendering loop
- `/src/parameters.js` — parameter brain for size/theme/style/accessibility state
- `/src/gl/background-pass.js` — background glass pass setup
- `/src/gl/foreground-pass.js` — foreground + highlight seam pass setup
- `/src/gl/shaders.js` — GLSL ES 3.00 shaders with isolated glass math
- `/scripts/smoke.mjs` — headless Chromium screenshot smoke verification

## Run locally

Requirements:
- Chromium/Chrome with WebGL2 support
- Node.js 20+ (for screenshot verification)
- Python 3 (for simple static server command)

```bash
npm install
npm run start
```

Then open:

- http://localhost:8080

Alternative static server examples:

```bash
python -m http.server 8080
# or
npx serve .
```

## Controls and interactions

- Drag the dashed panel to move it
- Drag the bottom-right handle to resize it
- Theme: Light / Dark
- Style: Regular / Clear / Subdued
- Accessibility toggles: Reduce Transparency, Increase Contrast
- Tuner sliders: corner radius, blur radius (inferred), shadow amount

## What is implemented now

Background pass (GLSL ES 3.00):
- Mode-4-style continuous-corner SDF approximation
- Recovered mip LOD rule: `max(0, log2(r < 2 ? r / 2 + 1 : r))`
- Refraction displacement with inner/outer terms
- Face matrix adjustments (white/black/saturation/fill alpha)
- Bleed sampling stage
- Shadow stage
- SDR tone + clamp stage

Foreground/highlight seam:
- Separate foreground pass with 2×2 direction matrix input
- Two dome profile terms and 7-sample RGB dispersion approximation
- Separate rim highlight contribution in that pass

Parameter brain:
- Size-dependent formulas from handoff where known/measured
- CPU-side inferred conversions are clearly labeled in code/comments and in tuner labels

## Verification

Headless screenshot smoke test:

```bash
npm run verify:smoke
```

Outputs:
- `artifacts/smoke-light-regular.png`
- `artifacts/smoke-dark-subdued-reduced.png`

If browser automation cannot run in your environment, fallback manual verification:

1. Start local server.
2. Open app in Chromium.
3. Confirm panel renders and responds to drag/resize.
4. Toggle light/dark, regular/clear/subdued, Reduce Transparency, Increase Contrast.
5. Confirm visual response and no WebGL compile errors in console.

## Actions workflows

- **Deploy GitHub Pages** (`.github/workflows/deploy-pages.yml`)
  - Hosts the static demo online at: https://dasadasanudas.github.io/liquid-glass-replica/
- **Value Sweep** (`.github/workflows/value-sweep.yml`)
  - Runs `npm run extract:values` and uploads `artifacts/inferred-value-sweep.json`
  - Use this workflow to regenerate missing inferred parameter tables from current formulas.

## Known limitations

- This baseline prioritizes shader structure and parameter wiring over perfect pixel match.
- Foreground content bending is an inferred approximation, not final calibrated behavior.
- No screenshot-diff calibration harness yet (smoke test currently captures states only).
- No menu/Dock/window system replication yet.

## Next-phase roadmap

1. Build app-like controls/menus/Dock/window compositions on top of this shader baseline.
2. Add richer foreground ownership model and active/inactive window states.
3. Add GPU calibration matrix for integrated GPUs (including Vega 7) and quality presets.
4. Add screenshot comparison workflow against curated references for tuning.
5. Expand into canonical control variants (switch, checkbox, radio, segmented, sliders, fields, progress).

## License notice

Project is intended as an original reimplementation and research-oriented UI graphics work. Ensure any added assets remain redistributable and non-proprietary.
