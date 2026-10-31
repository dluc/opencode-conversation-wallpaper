# Fire flow comparison

The transported-emission renderer is now integrated as Fire. This development-only page
compares it with a frozen copy of the 0.9.1 geometric renderer. Opening the page does not
change global configuration or an installed wallpaper. The reference and page are excluded
from the installable package. There are no new dependencies or external assets.

From the project directory:

```sh
npm run preview:dev -- --port 4346
```

Open `http://localhost:4346/preview/fire-study/` on the machine running that server
(or use the OpenCode browser / your normal port forwarding for a remote workspace).
The appearance selector is an explicit mock setting, not a change to OpenCode configuration.

The comparison respects system reduced motion by default. Manual pause wins, and hidden
pages stop advancing. Turn off Follow system Reduce motion only to explicitly opt out
for this study. Both panes use the same speed and dimming controls.

## Algorithm

- A bounded 96 × 160 scalar emission grid, not ten individually shaped flames.
- A smooth, concentrated source near the lower center, varied by coherent noise.
- Semi-Lagrangian backtracing with bilinear interpolation transports emission upward.
- A prescribed updraft plus the curl of a time-varying potential produces rolling flow.
- Cooling/decay and slight diffusion extinguish thin regions and soften sampling artifacts.
- A continuous warm color/opacity transfer function visualizes the transported field.
- Rendering uses a smoothly upscaled buffer, not ordered dithering or random visible grain.

The simulation runs at fixed 30 Hz; the page paints at most 24 fps. The coarse velocity
grid is refreshed at 15 Hz. Grid/history storage is fixed and reused, and resize never
reinitializes it. Rendering interpolates fixed simulation steps. A formed first frame is seeded directly in one pass without advancing
the clock, replacing the prototype's 150-step pre-warm. A cached transfer table tightens
the opacity transition, preserves the hot core, and avoids repeated per-pixel color math.

This is a **fluid-inspired artistic approximation**, not a pressure-projected fluid solver
or a physical combustion/temperature model. The scalar is emission, not a real measurement.

## Basis

This original implementation combines published ideas, without copying shader code or assets:

- [GPU Gems, chapter 38 — semi-Lagrangian transport](https://developer.nvidia.com/gpugems/gpugems/part-vi-beyond-triangles/chapter-38-fast-fluid-dynamics-simulation-gpu)
- [Curl-Noise for Procedural Fluid Flow — SIGGRAPH 2007](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf)
- [GPU Gems 3, chapter 30 — transported quantities and fire](https://developer.nvidia.com/gpugems/gpugems3/part-v-physics-simulation/chapter-30-real-time-simulation-and-rendering-3d-fluids)

## Verification

```sh
npm test -- tests/fire.test.ts tests/fire-field.test.ts tests/fire-reference.test.ts
npx tsc --noEmit --project preview/fire-study/tsconfig.json
CHROME_BIN=/path/to/chromium node preview/fire-study/check.mjs
```

Omit `CHROME_BIN` if Playwright's matching Chromium is installed. The browser check
uses its own strict-port server (4347 by default; override with `FIRE_STUDY_PORT`),
does not stop other servers, and writes screenshots, draw-call CPU timings, and a
30-second 1× comparison video under ignored `test-results/`. These are local mock
artifacts, not screenshots or benchmarks of a live Desktop installation.

Judge the motion clip: material should rise and curl, stretch, merge,
and extinguish without persistent leaf outlines. Also compare light/dark reading comfort,
paused and reduced-motion behavior, narrow layouts, first-frame construction, and 1×/4× cost.
Browser mock-host measurements are not live OpenCode Desktop compatibility evidence.
