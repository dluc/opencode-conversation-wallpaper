# Conversation wallpaper

Independent Git repository; parent is a workspace, not a monorepo.

- Target OpenCode V2 Desktop, GUI SDK `@opencode/plugin` 2.2.2. Consult the V2 GUI plugin documentation before changing host integration.
- GUI-only plugin. Runtime export is the prebuilt `dist/gui-experimental.cjs`; keep it rebuilt with source changes.
- Keep dependencies development-only. Do not add install-time build scripts.
- Keep internal host selectors in `src/wallpaper.ts`. Fail closed when the expected timeline structure is absent.
- Wallpaper never reads conversation text or changes message opacity, theme tokens, selection, scrolling, or pointer handling.
- Nineteen built-ins: digital rain, cloud drift, fireflies, starfield, aurora, meteors, night sky, balls, blockfall, disco, maze chase, pixel clouds, train window, aquarium, ripple pond, cardiogram, river, life, plaza. Each owns its motion; do not expose direction controls. Gallery thumbnails are static. Only built-ins have speed controls; uploads display as-is without added movement or effects.
- Display names are unique single words (Rain, Mist, Fireflies, Starfield, Aurora, Meteors, Sky, Bounce, Blockfall, Disco, Maze, Clouds, Journey, Aquarium, Ripples, Cardiogram, River, Life, Plaza, Image). Keep stored mode IDs stable when renaming copy; Mist is the soft clouds effect and Clouds is retro.
- Game of Life uses real toroidal B3/S23 evolution, a bounded grid/history, and simulated-time fade/reseed for dead/stalled worlds. Plaza crowds are bounded to 180–360 procedural pedestrians with offscreen entrances/exits. The cardiogram is decorative, with no medical readings. No new external assets, data sources, input capture, or audio.
- Game wallpapers are autonomous, original simulations with no borrowed names, characters, maps, assets, audio, or input capture. Model time advances only with visible animation frames; rounds must finish and restart, simulation state is bounded and survives resizing. Disco lights sweep smoothly without strobing.
- Game boards fill the available width and height with only compact edge/HUD insets. Do not restore fixed-size centered boards or pixel-size caps. Use bounded adaptive grids and preserve the current round/counters during layout changes.
- Blockfall is rendered vertically inverted: pieces rise from below and accumulate at the top to leave the lower reading area clearer. Mirror the board rows only, not the HUD, and keep the simulation/rules unchanged.
- Read the app appearance from the GUI SDK, not OS color-scheme queries. Clouds, fireflies, and stars use theme-aware palettes; preserve their original dark colors and repaint paused effects/thumbnails on theme changes. Never recolor uploads.
- Local raster images only; reject SVG, remote URLs, filesystem URLs, unsupported MIME types, and files over 8 MB.
- Respect reduced motion by default; only the explicit Follow system Reduce motion opt-out may override it. Manual pause always wins. Pause hidden timelines. Dispose observers, frames, listeners, and image sources on unload.
- GIF pause requires an actual canvas snapshot and unloading the image source; CSS animation-play-state does not pause GIFs.
- Use npm and the committed lockfile. `npm run check` verifies types, tests, bundle, and package. `npm run test:browser` checks real Chromium against a mock host, not live Desktop compatibility. State that distinction explicitly.
- Never change the user's global plugin configuration or publish a package as part of testing.
