# Conversation wallpaper

Independent Git repository; parent is a workspace, not a monorepo.

- Target OpenCode V2 Desktop, GUI SDK `@opencode/plugin` 2.2.2. Consult the V2 GUI plugin documentation before changing host integration.
- GUI-only plugin. Runtime export is the prebuilt `dist/gui-experimental.cjs`; keep it rebuilt with source changes.
- Keep dependencies development-only. Do not add install-time build scripts.
- Keep internal host selectors in `src/wallpaper.ts`. Fail closed when the expected timeline structure is absent.
- Wallpaper never reads conversation text or changes message opacity, theme tokens, selection, scrolling, or pointer handling.
- Local raster images only; reject SVG, remote URLs, filesystem URLs, unsupported MIME types, and files over 8 MB.
- Respect reduced motion; pause hidden timelines. Dispose observers, frames, listeners, and image sources on unload.
- GIF pause requires an actual canvas snapshot and unloading the image source; CSS animation-play-state does not pause GIFs.
- Use npm and the committed lockfile. `npm run check` verifies types, tests, bundle, and package. `npm run test:browser` checks real Chromium against a mock host, not live Desktop compatibility. State that distinction explicitly.
- Never change the user's global plugin configuration or publish a package as part of testing.
