import { createRoot, createSignal, onCleanup, Show, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { render } from "solid-js/web"
import definition from "../src/gui"
import { defaults, type Preferences } from "../src/preferences"
import "./style.css"

// Test the real plugin setup and UI against a minimal, honest mock of the host API.
// This is not a substitute for installing in a real desktop app.
function TestHost() {
  const [prefs, setPrefs] = createStore<Preferences>({ ...defaults })
  const [settings, setSettings] = createSignal(true)
  const [enabled, setEnabled] = createSignal(true)
  const [page, setPage] = createSignal<() => JSX.Element>()
  const [bridge, setBridge] = createSignal<() => JSX.Element>()
  const [notice, setNotice] = createSignal("")
  let stop: (() => void) | undefined
  const start = () => createRoot((dispose) => {
    stop = dispose
    const styles: HTMLStyleElement[] = []
    // Runtime mock intentionally implements only the APIs used by this plugin.
    const ctx = {
      stores: { preferences: {
        get value() { return prefs },
        update(fn: (draft: Preferences) => void) { const draft = { ...prefs }; fn(draft); setPrefs(draft) },
      } },
      add(registry: string, value: any) {
        if (registry === "Style") { const style = document.createElement("style"); style.textContent = value; document.head.append(style); styles.push(style) }
        if (registry === "SettingsPage") setPage(() => value.render)
        if (registry === "Slot") setBridge(() => value.render)
      },
      toast: { show: (value: { description: string }) => setNotice(value.description) },
      layout: { settings: () => setSettings(true) },
      ui: {
        Switch: (props: { checked: boolean; onChange(value: boolean): void; label: string; description?: string }) => <label class="test-switch"><span><strong>{props.label}</strong><small>{props.description}</small></span><input type="checkbox" checked={props.checked} onChange={(event) => props.onChange(event.currentTarget.checked)} /></label>,
        Button: (props: { children: JSX.Element; onClick?(): void; busy?: boolean }) => <button disabled={props.busy} onClick={props.onClick}>{props.children}</button>,
      },
    }
    definition.setup!(ctx as never)
    onCleanup(() => { styles.forEach(style => style.remove()); setPage(undefined); setBridge(undefined) })
  })
  start()
  onCleanup(() => stop?.())
  return <>
    <header class="test-toolbar"><strong>WALLPAPER / TEST HOST</strong>
      <button onClick={() => setSettings(!settings())}>{settings() ? "View conversation" : "Wallpaper settings"}</button>
      <button onClick={() => { if (enabled()) stop?.(); else start(); setEnabled(!enabled()) }}>{enabled() ? "Unload plugin" : "Load plugin"}</button>
    </header>
    <p class="test-disclaimer">Mock desktop layout · Real plugin code · No conversation data</p>
    <Show when={notice()}><p role="alert">{notice()}</p></Show>
    <main class="test-main">
      <section class="test-conversation" style={{ display: settings() ? "none" : "block" }}>
        <div class="test-timeline">
          <div data-slot="session-timeline-scroll"><header>Conversation</header>
            <article><span>YOU</span><p>Give this conversation a little atmosphere.</p></article>
            <article><span>OPENCODE</span><h1>Follow the white rabbit.</h1><p>Subtle digital rain behind your work. Your messages, code blocks, and controls remain fully readable and interactive.</p>
              <pre><code>const atmosphere = "matrix"<br />const focus = "your conversation"</code></pre>
              <button onClick={(event) => { event.currentTarget.textContent = "Interaction works" }}>Test interaction</button>
            </article>
          </div>
          <div data-slot="session-timeline-visible"></div>
        </div>
        <textarea placeholder="Message OpenCode…" aria-label="Message OpenCode" />
      </section>
      <Show when={settings()}>{page()?.()}</Show>
    </main>
    {bridge()?.()}
  </>
}
render(() => <TestHost />, document.getElementById("root")!)
