# Conversation wallpaper for OpenCode Desktop

Local image backgrounds and Matrix-style digital rain, behind conversations only.

## Features

- Built-in green digital rain, enabled by default at 55% dimming with smooth movement between cells.
- Import a local PNG, JPEG, GIF, WebP or AVIF (up to 8 MB). PNG/WebP animations are supported when Chromium decodes them.
- Image fill/contain, dimming, rain speed, and pause controls with a live preview.
- Animated images are frozen using a canvas snapshot, not an ineffective CSS animation pause.
- Honors system reduced motion by default, with an explicit opt-out. Rain stops and images freeze when the timeline or app document is hidden.
- Live preview status explains pauses and reports actual painted rain frames. A **Make rain more visible** preset sets 40% dimming and 1.2× speed.
- Canvas rain capped at 24 fps and 2× pixel density.
- Settings persist across sessions and apply to all workspaces. No model calls, remote image requests, or uploads.
- Command-palette actions to open settings, hide/show wallpaper, and pause/resume animation.

## Install

Targets **OpenCode V2 Desktop**, developed against `@opencode/plugin` **2.2.2**. The GUI plugin API is experimental.

Run this on the **computer running OpenCode Desktop**, not only a remote workspace server:

```sh
opencode plugin add github:dluc/opencode-conversation-wallpaper
```

This uses OpenCode's standard Git-package installer and updates your global plugin configuration while preserving
other entries. The repository is private: your computer needs Git credentials with access to it (for example,
`gh auth login` followed by `gh auth setup-git`). An SSH alternative is:

```sh
opencode plugin add 'git+ssh://git@github.com/dluc/opencode-conversation-wallpaper.git#main'
```

The repository includes the prebuilt `dist/gui-experimental.cjs`. No local build or npm runtime dependencies are
required, and there are no installation-time scripts. `private: true` in `package.json` prevents accidental npm
publishing; it does not prevent installation from GitHub.

Alternatively, add the Git package to the existing `plugins` array in your **global**
`~/.config/opencode/opencode.jsonc` (or its existing `.json` equivalent):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    "github:dluc/opencode-conversation-wallpaper"
  ]
}
```

To check or update the installed version:

```sh
opencode plugin list
opencode plugin update github:dluc/opencode-conversation-wallpaper
```

For local development, configure an absolute path to a clone of this repository instead of the Git package.
If you previously configured a local copy, remove that old entry before adding the Git package so only one copy loads.

OpenCode watches configuration changes. Look under **Settings → Conversation wallpaper**, or find
**Conversation wallpaper settings** in the command palette. GUI availability can also be checked under
**Settings → Extensions → Plugins**. This package has only a GUI entry; it adds no server tools or hooks.

Choose **Your image → Choose image…** to import an image, or keep **Digital rain** for the Matrix effect.
Try 35–55% dimming if the effect is too faint; increase it for quieter reading. A dark app theme suits digital rain best.

### Updating from 0.1.0 / faint or static rain

```sh
opencode plugin update github:dluc/opencode-conversation-wallpaper
```

In **Settings → Conversation wallpaper**, choose **Make rain more visible**. Existing preferences are preserved
when updating, so an old 75% dimming setting does not change until you adjust it or use the preset.

The text below the preview tells you why motion is paused (manual pause, system Reduce motion, or hidden/offscreen),
or displays a count of actual painted frames. The original effect combined 75% dimming with already-translucent
glyphs, and moved in discrete grid steps; version 0.1.1 brightens the trails and moves them smoothly.

If the status reports your system's Reduce motion setting, leave it paused if that is your preference, or explicitly
turn off **Follow system Reduce motion** to animate this wallpaper without changing macOS accessibility settings.
**Pause animation** still always takes precedence. The brighter preset does not override system reduced motion.

If the preview animates but a conversation does not, report your Desktop version and whether dimming changes are visible
in the conversation. Do not remove theme overlays or lower message opacity to compensate; the host DOM adapter may need updating.

To disable the entire GUI, use its switch in **Settings → Extensions → Plugins**. To uninstall:

```sh
opencode plugin remove github:dluc/opencode-conversation-wallpaper
```

Alternatively, remove only this plugin's entry from your global configuration. The extension removes its layers, styles, listeners,
observers, and animation frames when unloaded. Stored preferences/images may remain in app storage.

## Privacy and limitations

- Images are embedded in local app preferences as data URLs. They are not attached to prompts or sent to a model.
  App-data backups may contain the image. **Remove image** clears the current stored image, not old backups.
- SVG, HTML, external image URLs, and local filesystem URLs are deliberately not accepted.
- This extension never reads messages or composer text. Wallpaper layers ignore pointer events and are hidden from assistive technology.
- Reduced motion (unless explicitly opted out) and **Pause animation** override image animation. Resuming a GIF may restart it.
  Paused snapshots are capped at 2048 pixels on their longest edge to bound memory use.
- The documented `Style` API supplies CSS, but OpenCode does not offer a dedicated timeline-background slot.
  `src/wallpaper.ts` isolates the necessary internal DOM integration: it finds `session-timeline-scroll` only when
  its parent also has the expected `session-timeline-visible` sibling. Unknown layouts are left untouched rather
  than painting the whole app. Future OpenCode releases may require an adapter update.
- Dimming changes wallpaper opacity only; it does not lower message opacity or replace theme colors.
- Large/high-resolution animated images can still be expensive to decode. Smaller images are recommended.

## Development

Use Node 22+ and npm. Dependencies are development-only. The checked-in `.npmrc` disables npm’s automatic
peer installation: the SDK exposes optional terminal/Electron peers that this GUI-only package does not need.
The Effect version matches the SDK exactly to avoid incompatible schema types.

```sh
npm ci
npm run check
npm run test:browser
npm audit
```

For browser tests, install Chromium with `npx playwright install chromium`, or set `CHROME_BIN` to an existing
Chromium executable. Tests start their own Vite server on port 4322 and close it afterwards.

```sh
npm run dev          # rebuild the GUI on changes; OpenCode reloads local GUI bundles
npm run preview:dev  # mock desktop UI at http://localhost:4321/preview/
```

Rebuild `dist/gui-experimental.cjs` with `npm run build:gui` after source changes. The GUI bundle is a single
CommonJS file with only OpenCode-provided runtime imports (`effect`, `solid-js`, and `@opencode/plugin/gui`).
Do not add install-time build scripts: the prebuilt package should be usable without registry access.

### Verification scope

Unit/DOM tests cover input restrictions, host detection, hidden/paused/disabled states, animation cleanup,
image snapshots/errors/removal, and late-mounted/cached timelines. Chromium tests run the **real plugin setup
and settings UI against a mock host**, checking painting, pause/resume, reduced motion, GIF import/freeze,
file rejection, chat pointer/keyboard interaction, narrow layouts, and unloading/reloading. Screenshots are saved
to ignored `test-results/`.

These are not a live OpenCode Desktop installation test. Verify the plugin in your actual app version before
relying on compatibility. No global OpenCode configuration is modified by the tests or build.
