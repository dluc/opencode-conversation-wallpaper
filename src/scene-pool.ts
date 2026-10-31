import { createScene, type Appearance, type Scene } from "./scenes"
import type { BuiltinMode } from "./preferences"
import { ImagePool } from "./image-pool"

export interface SceneView {
  resize(width: number, height: number): void
  setActive(active: boolean, visible?: boolean): void
  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number, appearance: Appearance, timestamp?: number): void
  dispose(): void
}

interface Client {
  width: number
  height: number
  priority: number
  active: boolean
  visible: boolean
  context?: CanvasRenderingContext2D
}
interface Entry {
  mode: BuiltinMode
  scene: Scene
  clients: Set<Client>
  width: number
  height: number
  lastFrame?: number
  speed: number
  frames: number
}

/** Window-lifetime simulation state, shared by timelines and the settings preview.
 * One reusable surface avoids retaining a full-size bitmap for every wallpaper.
 * Thumbnails deliberately bypass this pool. No timers or conversation data here. */
export class ScenePool {
  readonly images = new ImagePool()
  private entries = new Map<BuiltinMode, Entry>()
  private surface: HTMLCanvasElement | undefined
  private context: CanvasRenderingContext2D | null = null
  private rendered: Entry | undefined
  private appearance: Appearance | undefined
  private disposed = false

  constructor(private factory: (mode: BuiltinMode) => Scene = createScene) {}

  view(mode: BuiltinMode, priority = 0): SceneView {
    let entry = this.entries.get(mode)
    if (!entry) {
      entry = { mode, scene: this.factory(mode), clients: new Set(), width: 0, height: 0, speed: 1, frames: 0 }
      this.entries.set(mode, entry)
    }
    const state = entry, client: Client = { width: 0, height: 0, priority, active: false, visible: false }
    state.clients.add(client)
    let released = false
    return {
      resize(width, height) { client.width = Math.max(0, width); client.height = Math.max(0, height) },
      setActive: (active, visible = active) => {
        client.active = active; client.visible = visible
        if (![...state.clients].some(view => view.active)) state.lastFrame = undefined
        this.refreshLayout(state)
      },
      draw: (ctx, elapsed, speed, appearance, timestamp = performance.now()) => {
        if (released || this.disposed || !client.width || !client.height) return
        client.context = ctx
        this.paint(state, client, elapsed, speed, appearance, timestamp)
      },
      dispose: () => {
        if (released) return
        released = true; state.clients.delete(client); client.context = undefined
        if (![...state.clients].some(view => view.active)) state.lastFrame = undefined
        this.refreshLayout(state)
        if (![...this.entries.values()].some(item => item.clients.size)) this.clearSurface()
      },
    }
  }

  private paint(entry: Entry, requester: Client, elapsed: number, speed: number, appearance: Appearance, timestamp: number) {
    entry.speed = speed
    const visible = [...entry.clients].filter(client => client.visible && client.width && client.height)
    // A visible conversation owns layout when a preview is also visible. Hidden
    // cached timelines cannot resize or advance the shared simulation.
    const leader = visible.sort((a, b) => b.priority - a.priority || b.width * b.height - a.width * a.height)[0]
    const layout = leader ?? (entry.width && entry.height ? undefined : requester)
    let resized = false
    if (layout && (layout.width !== entry.width || layout.height !== entry.height)) {
      entry.width = layout.width; entry.height = layout.height
      entry.scene.resize(entry.width, entry.height); resized = true
    }
    // View loops may have different 24fps phases after a remount. Deduplicating
    // identical rAF timestamps alone would let staggered views double the speed.
    const sinceFrame = entry.lastFrame === undefined ? elapsed : (timestamp - entry.lastFrame) / 1000
    const advance = requester.active && elapsed > 0 && (entry.lastFrame === undefined || sinceFrame >= 1 / 24)
    if (advance) { entry.lastFrame = timestamp; entry.frames++ }
    const repaint = advance || resized || this.rendered !== entry || this.appearance !== appearance
    if (repaint) {
      this.surface ??= document.createElement("canvas")
      this.surface.dataset.wallpaper = entry.mode
      const ratio = Math.min(devicePixelRatio || 1, 2)
      const width = Math.round(entry.width * ratio), height = Math.round(entry.height * ratio)
      if (this.surface.width !== width || this.surface.height !== height) {
        this.surface.width = width; this.surface.height = height
        this.context = this.surface.getContext("2d")
        this.context?.setTransform(ratio, 0, 0, ratio, 0, 0)
      } else if (!this.context) this.context = this.surface.getContext("2d")
      this.context?.setTransform(ratio, 0, 0, ratio, 0, 0)
      if (this.context) entry.scene.draw(this.context, advance ? sinceFrame : 0, speed, appearance)
      this.rendered = entry; this.appearance = appearance
    }
    if (!this.surface || !this.context) return
    // Refresh views already painted earlier in this rAF too, so callers do not
    // see different simulation ages just because their callback order differs.
    const targets = repaint ? new Set([...visible, requester]) : new Set([requester])
    for (const target of targets) if (target.context && target.width && target.height) {
      target.context.clearRect(0, 0, target.width, target.height)
      target.context.drawImage(this.surface, 0, 0, target.width, target.height)
      if (target.context.canvas) {
        target.context.canvas.dataset.sceneWidth = String(entry.width)
        target.context.canvas.dataset.sceneHeight = String(entry.height)
        target.context.canvas.dataset.sceneFrame = String(entry.frames)
      }
    }
  }

  private refreshLayout(entry: Entry) {
    const target = [...entry.clients].find(client => client.visible && client.context && client.width && client.height)
    if (target && this.rendered === entry) this.paint(entry, target, 0, entry.speed, this.appearance ?? "dark", performance.now())
  }

  private clearSurface() {
    if (this.surface) { this.surface.width = 0; this.surface.height = 0 }
    this.surface = undefined; this.context = null; this.rendered = undefined; this.appearance = undefined
  }

  dispose = () => {
    this.disposed = true
    for (const entry of this.entries.values()) entry.clients.clear()
    this.entries.clear(); this.clearSurface()
    this.images.dispose()
  }
}
