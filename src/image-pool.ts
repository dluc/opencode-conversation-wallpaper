import { imageSource } from "./preferences"

interface ImageClient {
  layer: HTMLElement
  still: HTMLCanvasElement
  error(message: string): void
  priority: number
  visible: boolean
  animated: boolean
  fit: "cover" | "contain"
}
export interface ImageView {
  update(source: string, fit: "cover" | "contain", visible: boolean, animated: boolean, forcePause: boolean): void
  dispose(): void
}

/** One local image decoder per window. Moving its actual img node between visible
 * hosts preserves embedded GIF/APNG/WebP playback during navigation. Other visible
 * views copy its frame; explicit pause/hidden document still snapshot and unload. */
export class ImagePool {
  private image = document.createElement("img")
  private snapshot = document.createElement("canvas")
  private clients = new Set<ImageClient>()
  private owner: ImageClient | undefined
  private source = ""
  private loaded = ""
  private failed = ""
  private frozen = false
  private forced = false
  private playing = false
  private frame = 0
  private freezeFrame = 0
  private previous = 0

  constructor() {
    this.image.alt = ""; this.image.draggable = false
    this.image.onload = () => { if (this.loaded) this.refresh() }
    this.image.onerror = () => {
      if (!this.loaded) return
      this.failed = this.source; this.loaded = ""; this.image.removeAttribute("src"); this.image.hidden = true
      for (const client of this.clients) client.error("This wallpaper could not be decoded. Choose another image in Wallpaper settings.")
      this.refresh()
    }
  }

  view(layer: HTMLElement, still: HTMLCanvasElement, error: (message: string) => void, priority = 0): ImageView {
    const client: ImageClient = { layer, still, error, priority, visible: false, animated: false, fit: "cover" }
    this.clients.add(client)
    return {
      update: (value, fit, visible, animated, forcePause) => {
        const next = imageSource(value)
        if (next !== this.source) {
          this.source = next; this.loaded = ""; this.failed = ""; this.frozen = false
          this.image.removeAttribute("src"); this.snapshot.width = this.snapshot.height = 0
        }
        client.fit = fit; client.visible = visible; client.animated = animated; this.forced = forcePause
        this.refresh()
      },
      dispose: () => {
        this.clients.delete(client); client.still.hidden = true; client.still.width = client.still.height = 0
        if (this.owner === client) { this.owner = undefined; this.image.remove() }
        this.refresh()
      },
    }
  }

  private decoded() { return !!this.loaded && this.image.complete && this.image.naturalWidth > 0 }

  private draw(target: HTMLCanvasElement, source: HTMLImageElement | HTMLCanvasElement) {
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height
    if (!width || !height) return false
    const scale = Math.min(1, 2048 / Math.max(width, height))
    target.width = Math.max(1, Math.round(width * scale)); target.height = Math.max(1, Math.round(height * scale))
    const context = target.getContext("2d")
    if (!context) return false
    context.drawImage(source, 0, 0, target.width, target.height)
    return true
  }

  private freeze() {
    if (!this.frozen && this.decoded()) {
      if (!this.draw(this.snapshot, this.image)) {
        this.snapshot.width = this.snapshot.height = 0
        for (const client of this.clients) client.error("This image cannot be frozen because canvas rendering is unavailable.")
      }
      this.frozen = true; this.image.removeAttribute("src"); this.loaded = ""
    }
    this.image.hidden = true; this.playing = false
    for (const client of this.clients) this.render(client)
  }

  private render(client: ImageClient) {
    client.still.style.objectFit = client.fit
    if (!client.visible || !this.source || this.source === this.failed) {
      client.still.hidden = true; client.still.width = client.still.height = 0; return
    }
    if (this.frozen && this.snapshot.width) {
      client.still.hidden = !this.draw(client.still, this.snapshot)
    } else if (client !== this.owner && this.decoded()) {
      client.still.hidden = !this.draw(client.still, this.image)
    } else client.still.hidden = true
  }

  private refresh() {
    cancelAnimationFrame(this.frame); this.frame = 0; this.previous = 0
    const visible = [...this.clients].filter(client => client.visible).sort((a, b) => b.priority - a.priority)
    const owner = visible[0] ?? [...this.clients][0]
    if (owner !== this.owner) {
      this.owner = owner
      if (owner) owner.layer.append(this.image)
      else this.image.remove()
    }
    const animate = !this.forced && visible.some(client => client.animated)
    if (animate || this.forced) { cancelAnimationFrame(this.freezeFrame); this.freezeFrame = 0 }
    if (this.source && this.source !== this.failed && (!this.frozen || animate) && this.loaded !== this.source) {
      this.loaded = this.source; this.image.src = this.source
    }
    if (animate && this.decoded()) this.frozen = false
    this.image.style.objectFit = owner?.fit ?? "cover"
    if (this.forced || !animate && !this.playing && !this.freezeFrame) this.freeze()
    else if (!animate && !this.freezeFrame) {
      // Batch a navigation handoff until the next frame. A new visible host can
      // take the same decoder before it is unloaded. Document/manual pauses above
      // freeze immediately, so hidden tabs never retain running GIF decoders.
      this.freezeFrame = requestAnimationFrame(() => { this.freezeFrame = 0; if (![...this.clients].some(client => client.visible && client.animated)) this.freeze() })
    }
    this.playing = animate && this.decoded()
    this.image.hidden = !owner?.visible || this.forced || this.frozen || !this.source || this.source === this.failed
    for (const client of this.clients) this.render(client)
    if (this.playing && visible.length > 1) this.frame = requestAnimationFrame(this.tick)
  }

  private tick = (now: number) => {
    this.frame = 0
    if (!this.playing || this.forced) return
    if (!this.previous || now - this.previous >= 1000 / 24) {
      for (const client of this.clients) if (client !== this.owner) this.render(client)
      this.previous = now
    }
    this.frame = requestAnimationFrame(this.tick)
  }

  dispose = () => {
    cancelAnimationFrame(this.frame); cancelAnimationFrame(this.freezeFrame)
    this.image.onload = this.image.onerror = null; this.image.removeAttribute("src"); this.image.remove()
    this.snapshot.width = this.snapshot.height = 0; this.clients.clear(); this.owner = undefined
    this.source = this.loaded = this.failed = ""; this.playing = false
  }
}
