import { Command, Plugin, SettingsPage, Slot, Store, Style } from "@opencode/plugin/gui"
import { Schema } from "effect"
import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { defaults, MAX_SPEED, MIN_SPEED, MODES, validateImage, type BuiltinMode, type Preferences } from "./preferences"
import { collection, createScene, wallpaperName } from "./scenes"
import { mountWallpaper, statusMessage, watchTimelines, type WallpaperStatus } from "./wallpaper"
import css from "./style.css?inline"

const PreferencesSchema = Schema.Struct({
  enabled: Schema.Boolean,
  mode: Schema.Literals(MODES),
  image: Schema.String,
  imageName: Schema.String,
  dimming: Schema.Number,
  speed: Schema.Number,
  paused: Schema.Boolean,
  respectReducedMotion: Schema.optionalKey(Schema.Boolean),
  fit: Schema.Literals(["cover", "contain"]),
})

export default Plugin.define({
  stores: { preferences: Store.global(PreferencesSchema, defaults) },
  setup(ctx) {
    ctx.add(Style, css)
    const appearance = () => ctx.appearance.mode()
    // Read every field before passing preferences into imperative rendering. Its
    // short-circuit branches must not decide which store changes effects track.
    const prefs = (): Preferences => ({
      ...ctx.stores.preferences.value,
      respectReducedMotion: ctx.stores.preferences.value.respectReducedMotion,
    })
    const change = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      ctx.stores.preferences.update((draft) => { draft[key] = value })
    }
    const [error, setError] = createSignal("")
    const reportError = (message: string) => {
      if (error() === message) return
      setError(message)
      ctx.toast.show({ variant: "error", title: "Wallpaper unavailable", description: message })
    }

    // The slot supplies a mounted lifecycle, not the wallpaper's position. Timelines may
    // hide their header, so do not depend on session.header to discover them.
    function TimelineBridge() {
      onMount(() => {
        const controller = watchTimelines(prefs, reportError, appearance)
        createEffect(() => { prefs(); appearance(); controller.update() })
        onCleanup(controller.dispose)
      })
      return null
    }
    ctx.add(Slot, { at: "window.bottom", render: () => <TimelineBridge /> })

    function Thumbnail(props: { mode: BuiltinMode }) {
      let canvas!: HTMLCanvasElement
      onMount(() => {
        const context = canvas.getContext("2d")
        if (!context) return
        const scene = createScene(props.mode)
        scene.resize(canvas.width, canvas.height)
        // Gallery thumbnails are stills. Only the selected wallpaper has an animation loop.
        createEffect(() => { scene.draw(context, 0, 1, appearance()) })
      })
      return <canvas ref={canvas} class="cw-thumbnail" classList={{ "cw-light": appearance() === "light" }} width="300" height="120" aria-hidden="true" />
    }

    function Preview() {
      let host!: HTMLDivElement
      const [status, setStatus] = createSignal<WallpaperStatus>()
      onMount(() => {
        const wallpaper = mountWallpaper(host, prefs(), reportError, setStatus, appearance())
        createEffect(() => { wallpaper.update(prefs(), appearance()) })
        onCleanup(wallpaper.dispose)
      })
      return <><div ref={host} class="cw-preview" aria-label="Wallpaper preview">
        <div class="cw-preview-content">
        <Show when={prefs().mode !== "blockfall" && prefs().mode !== "maze-chase"}
          fallback={<span class="cw-game-preview-label cw-kicker">LIVE PREVIEW · {wallpaperName(prefs().mode)}</span>}>
        <div class="cw-preview-copy"><span class="cw-kicker">LIVE PREVIEW</span>
          <strong>A little atmosphere.<br />A clear train of thought.</strong>
          <p>Your conversations stay in the foreground.</p>
        </div>
        </Show>
        </div>
      </div>
        <p class="cw-motion-status">{status() ? statusMessage(status()!) : "Preparing preview…"}</p>
      </>
    }

    function Settings() {
      const [loading, setLoading] = createSignal(false)
      let input!: HTMLInputElement
      let alive = true
      onCleanup(() => { alive = false })
      const upload = async (file?: File) => {
        if (!file) return
        setError(""); setLoading(true)
        try {
          validateImage(file)
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error("The image could not be read. Please try again."))
            reader.onabort = () => reject(new Error("Image loading was cancelled."))
            reader.readAsDataURL(file)
          })
          if (!alive) return
          ctx.stores.preferences.update((draft) => {
            draft.image = data; draft.imageName = file.name; draft.mode = "image"; draft.enabled = true
          })
        } catch (cause) {
          if (alive) setError(cause instanceof Error ? cause.message : "Could not load this image.")
        } finally { if (alive) { setLoading(false); input.value = "" } }
      }
      const ui = ctx.ui
      return <section class="cw-settings" aria-label="Conversation wallpaper settings">
        <header class="cw-heading"><span class="cw-kicker">CONVERSATION WALLPAPER</span>
          <h2>Set the atmosphere.</h2>
          <p>{collection.length} atmospheres. Or something of your own. Always behind the conversation.</p>
        </header>
        <Preview />
        <div class="cw-controls">
          <ui.Switch label="Enable wallpaper" description="Applies to conversations in every workspace."
            checked={prefs().enabled} onChange={(value) => change("enabled", value)} />
          <fieldset class="cw-mode"><legend>Choose your atmosphere</legend>
            <For each={collection}>{(wallpaper) =>
              <label classList={{ "cw-selected": prefs().mode === wallpaper.id }}>
                <input type="radio" name="cw-mode" value={wallpaper.id} checked={prefs().mode === wallpaper.id}
                  onChange={() => { change("mode", wallpaper.id); setError("") }} />
                <Thumbnail mode={wallpaper.id} />
                <span class="cw-card-copy"><strong>{wallpaper.title}</strong><small>{wallpaper.description}</small></span>
              </label>
            }</For>
            <label classList={{ "cw-selected": prefs().mode === "image" }}>
              <input type="radio" name="cw-mode" value="image" checked={prefs().mode === "image"}
                onChange={() => change("mode", "image")} />
              <div class="cw-upload-thumbnail" aria-hidden="true"><span>＋</span><small>BRING YOUR OWN</small></div>
              <span class="cw-card-copy"><strong>Your image</strong><small>Still or animated · Played as-is</small></span>
            </label>
          </fieldset>
          <Show when={prefs().mode === "image"}>
            <div class="cw-image-controls">
              <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/gif,image/webp,image/avif"
                aria-label="Choose wallpaper image" onChange={(event) => void upload(event.currentTarget.files?.[0])} />
              <ui.Button onClick={() => input.click()} busy={loading()}>{prefs().image ? "Replace image" : "Choose image…"}</ui.Button>
              <span class="cw-file-name">{prefs().imageName || "No image selected"}</span>
              <Show when={prefs().image}><ui.Button variant="ghost" onClick={() => {
                ctx.stores.preferences.update((draft) => { draft.image = ""; draft.imageName = "" })
                setError("")
              }}>Remove image</ui.Button></Show>
              <p>PNG, JPEG, GIF, WebP or AVIF · Up to 8 MB. Animated GIFs work too.
                Images are saved locally in OpenCode’s app storage; nothing is uploaded.</p>
              <p>Still images stay still. Animated images use their own motion and playback speed—no added effects.</p>
              <label class="cw-select-label">Image fit
                <select value={prefs().fit} onChange={(event) => change("fit", event.currentTarget.value as Preferences["fit"])}>
                  <option value="cover">Fill conversation</option><option value="contain">Show entire image</option>
                </select>
              </label>
            </div>
          </Show>
          <Show when={error()}><p class="cw-error" role="alert">{error()}</p></Show>
          <label class="cw-range"><span>Dimming <output>{prefs().dimming}%</output></span>
            <input type="range" aria-label="Dimming" min="0" max="100" step="1" value={prefs().dimming}
              onChange={(event) => change("dimming", event.currentTarget.valueAsNumber)} />
            <small>Only the wallpaper is faded, never the messages. Try 35–55% if it is too faint.</small>
          </label>
          <Show when={prefs().mode !== "image"}>
            <ui.Button onClick={() => {
              ctx.stores.preferences.update((draft) => {
                draft.enabled = true; draft.dimming = 40; draft.speed = 1.2; draft.paused = false
              })
            }}>Make wallpaper more visible</ui.Button>
            <label class="cw-range"><span>Animation speed <output>{prefs().speed.toFixed(1)}×</output></span>
              <input type="range" aria-label="Animation speed" min={MIN_SPEED} max={MAX_SPEED} step="0.1" value={prefs().speed}
                onChange={(event) => change("speed", event.currentTarget.valueAsNumber)} />
            </label>
          </Show>
          <ui.Switch label="Pause animation" checked={prefs().paused} onChange={(value) => change("paused", value)}
            description="Freezes built-in wallpapers and animated images." />
          <ui.Switch label="Follow system Reduce motion" checked={prefs().respectReducedMotion !== false}
            onChange={(value) => change("respectReducedMotion", value)}
            description="Enabled by default. Turn off only if you explicitly want wallpaper animation despite your system’s reduced-motion preference." />
        </div>
        <footer class="cw-footer">LOCAL ONLY <span>·</span> NO MODEL CALLS <span>·</span> NO REMOTE ASSETS</footer>
      </section>
    }

    ctx.add(SettingsPage, {
      id: "wallpaper", title: "Conversation wallpaper", icon: "settings-gear",
      entries: [
        { id: "background", title: "Wallpaper collection and uploaded images", keywords: "matrix rain clouds fireflies starfield aurora meteors night sky balls blockfall disco maze chase wallpaper gif animation dimming pause" },
      ],
      render: () => <Settings />,
    })
    ctx.add(Command, {
      id: "settings", title: "Conversation wallpaper settings", group: "Wallpaper",
      run: () => ctx.layout.settings("wallpaper"),
    })
    ctx.add(Command, () => ({
      id: "toggle", title: prefs().enabled ? "Hide conversation wallpaper" : "Show conversation wallpaper",
      group: "Wallpaper", run: () => change("enabled", !prefs().enabled),
    }))
    ctx.add(Command, () => ({
      id: "pause", title: prefs().paused ? "Resume wallpaper animation" : "Pause wallpaper animation",
      group: "Wallpaper", run: () => change("paused", !prefs().paused),
    }))
  },
})
