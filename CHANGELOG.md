# Changelog

Notable changes to Conversation Wallpaper. Releases are available as Git tags;
the default branch can be installed and updated with the OpenCode CLI.

## Unreleased (0.7.1)

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
