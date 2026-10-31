# Changelog

Notable changes to Conversation Wallpaper. Releases are available as Git tags;
the default branch can be installed and updated with the OpenCode CLI.

## Unreleased (0.11.0)

- Remove the redundant visibility preset button; dimming, animation speed, and pause remain independent controls.

- Retain shared window-lifetime animation state across conversation changes, cached timelines, preview remounts, and wallpaper switches; advance each simulation once per visible frame.
- Keep particle/stream seeds through resizing and reuse one shared drawing surface instead of full-size per-mode frame caches.
- Reuse the local image decoder during navigation, while keeping actual snapshot/source-unload behavior for pause, reduced motion, and hidden documents.
- Increase Elastic's shared-boundary excursions, amber subdivision, and shallow depth changes while preserving its palettes and bounded layout.
- Rename settings to Wallpaper, move controls above the preview/gallery, and sort built-ins alphabetically with the special Image upload option appended last.
- Expand built-in speed to 0.1×–10× and remove Fire's downstream time clamp; keep uploads at their embedded playback speed.
- Add all-wallpaper continuity, decoder handoff, resize/visibility, single-step, alphabetic/order, and speed-range verification.

## Preview (0.10.0)

- Replace Fire's hand-shaped tongues with a shared transported-emission field: upward curl-noise flow, semi-Lagrangian advection, cooling, and diffusion.
- Keep a bounded 96×160 grid and warm theme-aware color/opacity lookup, with a tighter edge transition and stronger core.
- Eliminate simulation pre-warming: seed a formed first frame directly without advancing its clock, interpolate between fixed steps, and cache unchanged frame uploads.
- Preserve simulation state through pause, hidden views, theme changes, and resizing; retain the existing speed/dimming controls and saved Fire ID.
- Keep the frozen 0.9.1 renderer in a development-only comparison page; add field, first-frame, rendering, lifecycle, and browser checks with refreshed Fire captures.
- Leave Grass, Elastic, Aurora, Rainbow, installation/upgrade behavior, and runtime dependencies unchanged.

## Preview (0.9.1)

- Give Fire height-aware slender proportions and irregular origins, with taller/brighter central tongues and smaller/quieter outer tongues.
- Replace nested, vertically colored leaf-like fills with elliptical hot-core-to-edge volume shading and a shared low hearth glow.
- Preserve growth/recession lifetimes, fixed warm colors, and paused state; add landscape/portrait core-intensity and physical-proportion checks.
- Refresh Fire and gallery captures only; Grass, Elastic, Aurora, and Rainbow are unchanged.

## Preview (0.9.0)

- Preserve the former fixed-height Fire motion as Grass, a new wallpaper with light/dark green palettes and a separate saved ID.
- Give Fire staggered flame lifetimes: tongues grow from the base, stretch, narrow/recede, fade, and renew instead of only swaying sideways.
- Keep Fire warm red/orange/yellow with smooth gradients, bounded overlapping generations, and paused/hidden simulation time.
- Add lifecycle, renewal-continuity, Grass-motion/palette, and browser checks, plus refreshed Fire/Grass/gallery captures. Preserve Elastic, Aurora, and Rainbow.

## Preview (0.8.0)

- Add Elastic: broad architectural slabs slowly expanding, subdividing, and rejoining, with one warm amber region and shallow projected depth.
- Use slate/ink colors in dark mode and porcelain/sandstone in light mode, following OpenCode appearance and existing motion/dimming controls.
- Keep the original Amazon/AWS-inspired artwork procedural and unofficial, without logos, service icons, telemetry, or external assets.
- Add bounded-geometry, continuity, shared-lifecycle, coverage, theme, and browser checks, with light/dark documentation captures.

## Preview (0.7.2)

- Reshape Fire as bottom-rooted, tapering flame tongues with curling pointed tips and nested orange/yellow cores, replacing horizontal wave/landscape contours.
- Restore a fixed red/orange/yellow palette and remove the blue/green cycle.
- Carry slow deformation upward through the flame bodies instead of bobbing entire silhouettes vertically; preserve smooth gradients without dithering.
- Add shape/root/taper and warm-color persistence checks; refresh only Fire and gallery captures. Aurora and Rainbow are unchanged.

## Preview (0.7.1)

- Synchronize Rainbow's hue to the current timestamp so navigation/remounting does not restart it; paused stills remain frozen and resume catches up.
- Replace Fire's dithered raster with smooth, translucent vector gradients like Aurora's.
- Slowly cycle Fire's whole palette from yellow/red to blue/green and back, without mixed warm/cool flames in the same frame.
- Verify Rainbow navigation synchronization and Fire's warm/cool rendering, with refreshed preview images.

## Preview (0.7.0)

- Add Fire: broad, slowly morphing flames rising from the bottom across most of the conversation background.
- Use five warm pigments per appearance, fine stationary dithering, and a bounded reusable raster; no sparks or flicker.
- Preserve Aurora unchanged and reuse the existing dimming, speed, pause, visibility, and reduced-motion controls.
- Add coverage, palette, morphing, upward-motion, resizing, and browser checks, plus light/dark README captures.

## [0.6.0]

- Add Rainbow: one solid full-area background that smoothly cycles the entire color wheel.
- Use a three-minute loop at 1× speed, theme-appropriate shades/pastels, and shared dimming/pause controls.
- Verify hue-wheel coverage, looping, and pixel-uniform rendering across the complete canvas.

## [0.5.1]

- Add the MIT license and SPDX package metadata.
- Include the license and changelog in the installable package, with packaging checks.
- Prepare installation and development documentation for public GitHub access.

## [0.5.0]

- Complete the collection with Constellations, Glass, Ocean, Embers, Coast, Boats,
  Orbits, Leaves, and Contours.
- Add Tremor and Polygraph, bringing the collection to 30 wallpapers.
- Change Cardiogram to a fixed line that spikes in place and rests flat between beats.
- Add instrument previews and tests for fixed pulse position and distinct trace channels.

## [0.4.1]

- Use unique single-word display names throughout the gallery and documentation.
- Preserve existing mode IDs, saved selections, preferences, and uploaded images.

## [0.4.0]

- Add Clouds, Journey, Aquarium, Ripples, Cardiogram, River, Life, and Plaza.
- Implement Conway's B3/S23 cellular automaton with bounded automatic reseeding.
- Add a procedural crowd with offscreen entry and exit paths.
- Expand light-theme, pause, speed, and rendering tests across all 19 effects.

## [0.3.2]

- Invert Blockfall so pieces rise from below and accumulate at the top.
- Keep score text upright and the lower reading area clearer.

## [0.3.1]

- Make game playfields fill the available conversation width and height.
- Adapt layouts to different aspect ratios without restarting the current round.

## [0.3.0]

- Add Meteors, Sky, Bounce, Disco, Blockfall, and Maze, bringing the collection to 11.
- Add original autonomous game simulations with complete rounds and automatic restarts.

## [0.2.2]

- Allow 0.2×–4× animation speed for built-in wallpapers.
- Document and verify a CLI-only switch from pinned installs to branch tracking.

## [0.2.1]

- Add light-theme palettes for Mist, Fireflies, and Starfield, preserving dark palettes.
- Repaint paused effects and thumbnails when the app appearance changes.
- Add README screenshots and pixel-contrast checks.

## [0.2.0]

- Introduce the five-wallpaper gallery: Rain, Mist, Fireflies, Starfield, and Aurora.
- Retain local static/animated image import, dimming, pause, and reduced-motion support.
- Earlier development established image backgrounds, digital rain, and animation diagnostics.

Names above use the current display labels for clarity; older tags may show earlier names.

[0.6.0]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.6.0
[0.5.1]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.5.1
[0.5.0]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.5.0
[0.4.1]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.4.1
[0.4.0]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.4.0
[0.3.2]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.3.2
[0.3.1]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.3.1
[0.3.0]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.3.0
[0.2.2]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.2.2
[0.2.1]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.2.1
[0.2.0]: https://github.com/dluc/opencode-conversation-wallpaper/tree/v0.2.0
