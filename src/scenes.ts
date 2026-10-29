import { clamp, MAX_SPEED, MIN_SPEED, type BuiltinMode } from "./preferences"
import { Rain } from "./rain"

export type Appearance = "light" | "dark"

export interface Scene {
  resize(width: number, height: number): void
  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number, appearance?: Appearance): void
}

export const collection: ReadonlyArray<{ id: BuiltinMode; title: string; description: string }> = [
  { id: "matrix", title: "Digital rain", description: "Falling glyphs · Green phosphor" },
  { id: "clouds", title: "Cloud Drift", description: "Horizontal drift · Silver-blue mist" },
  { id: "fireflies", title: "Fireflies", description: "Free wandering · Warm points of light" },
  { id: "starfield", title: "Starfield", description: "Through depth · Quiet cosmic travel" },
  { id: "aurora", title: "Aurora", description: "Flowing ribbons · Teal and violet" },
]

export function wallpaperName(mode: string): string {
  return collection.find(scene => scene.id === mode)?.title ?? "Your image"
}

/** Fixed motion belongs to each scene. Only a shared speed multiplier is configurable. */
abstract class AmbientScene implements Scene {
  protected width = 0
  protected height = 0
  protected time = 0
  protected appearance: Appearance = "dark"

  resize(width: number, height: number) {
    this.width = Math.max(0, width)
    this.height = Math.max(0, height)
    this.layout()
  }
  protected layout() {}
  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number, appearance: Appearance = "dark") {
    if (!this.width || !this.height) return
    this.appearance = appearance
    const delta = clamp(elapsed, 0, 0.1) * clamp(speed, MIN_SPEED, MAX_SPEED)
    this.time += delta
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.save()
    this.paint(ctx, delta)
    ctx.restore()
  }
  protected abstract paint(ctx: CanvasRenderingContext2D, delta: number): void
}

/** Soft light is prerendered once, not rebuilt for every particle on every frame. */
function glowSprite(size: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, `rgba(${color}, 0.7)`)
    gradient.addColorStop(0.15, `rgba(${color}, 0.35)`)
    gradient.addColorStop(0.5, `rgba(${color}, 0.1)`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return canvas
}

class CloudDrift extends AmbientScene {
  private sprite: HTMLCanvasElement | undefined
  private spriteAppearance: Appearance | undefined
  private clouds = Array.from({ length: 7 }, (_, i) => ({
    x: i / 7 * 1.6,
    y: 0.08 + (i * 0.173 % 0.62),
    scale: 0.42 + (i % 3) * 0.14,
    speed: 0.007 + (i % 3) * 0.003,
  }))

  protected paint(ctx: CanvasRenderingContext2D) {
    if (!this.sprite || this.spriteAppearance !== this.appearance) {
      this.spriteAppearance = this.appearance
      const light = this.appearance === "light"
      const color = light ? "35, 65, 95" : "176, 204, 235"
      // Overlapping wisps make one reusable, asymmetric cloud texture.
      this.sprite = document.createElement("canvas")
      this.sprite.width = 480; this.sprite.height = 180
      const spriteCtx = this.sprite.getContext("2d")
      if (spriteCtx) {
        for (let i = 0; i < 7; i++) {
          const x = 35 + i * 66, y = 90 + Math.sin(i * 1.7) * 17
          const gradient = spriteCtx.createRadialGradient(x, y, 15, x, y, 100)
          gradient.addColorStop(0, `rgba(${color}, ${light ? 0.34 : 0.22})`)
          gradient.addColorStop(0.55, `rgba(${color}, ${light ? 0.19 : 0.12})`)
          gradient.addColorStop(1, `rgba(${color}, 0)`)
          spriteCtx.fillStyle = gradient
          spriteCtx.fillRect(0, 0, 480, 180)
        }
        // Fade all texture edges to zero so overlapping scaled clouds never reveal boxes.
        spriteCtx.globalCompositeOperation = "destination-in"
        for (const [x, y] of [[480, 0], [0, 180]]) {
          const mask = spriteCtx.createLinearGradient(0, 0, x, y)
          mask.addColorStop(0, "transparent"); mask.addColorStop(0.2, "white")
          mask.addColorStop(0.8, "white"); mask.addColorStop(1, "transparent")
          spriteCtx.fillStyle = mask; spriteCtx.fillRect(0, 0, 480, 180)
        }
        spriteCtx.globalCompositeOperation = "source-over"
      }
    }
    for (const cloud of this.clouds) {
      const width = Math.max(220, this.width * cloud.scale)
      const height = width * 0.375
      const travel = this.width * 1.1 + width
      const x = (cloud.x / 1.6 * travel + this.time * cloud.speed * this.width) % travel - width
      ctx.globalAlpha = 0.5 + cloud.scale * 0.45
      ctx.drawImage(this.sprite, x, cloud.y * this.height - height / 3, width, height)
    }
  }
}

interface Mote { x: number; y: number; phase: number; size: number }
class Fireflies extends AmbientScene {
  private sprite: HTMLCanvasElement | undefined
  private spriteAppearance: Appearance | undefined
  private motes: Mote[] = []
  protected layout() {
    const count = Math.round(clamp(this.width * this.height / 22000, 18, 60))
    this.motes = Array.from({ length: count }, () => ({
      x: 0.08 + Math.random() * 0.84, y: 0.12 + Math.random() * 0.76,
      phase: Math.random() * Math.PI * 2, size: 0.8 + Math.random() * 1.5,
    }))
  }
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    if (!this.sprite || this.spriteAppearance !== this.appearance) {
      this.spriteAppearance = this.appearance
      this.sprite = glowSprite(64, light ? "163, 101, 15" : "216, 241, 117")
    }
    for (const mote of this.motes) {
      const x = (mote.x + Math.sin(this.time * 0.17 + mote.phase) * 0.07 + Math.cos(this.time * 0.09 + mote.phase) * 0.025) * this.width
      const y = (mote.y + Math.cos(this.time * 0.13 + mote.phase) * 0.08) * this.height
      const glow = light ? 0.7 + Math.sin(this.time * 0.6 + mote.phase) * 0.15
        : 0.6 + Math.sin(this.time * 0.6 + mote.phase) * 0.25
      const halo = 22 + mote.size * 11
      ctx.globalAlpha = glow
      ctx.drawImage(this.sprite, x - halo / 2, y - halo / 2, halo, halo)
      ctx.fillStyle = light ? "#945308" : "#edf8b1"
      ctx.beginPath(); ctx.arc(x, y, mote.size, 0, Math.PI * 2); ctx.fill()
    }
  }
}

interface Star { x: number; y: number; depth: number }
class Starfield extends AmbientScene {
  private stars: Star[] = []
  protected layout() {
    const count = Math.round(clamp(this.width * this.height / 4000, 70, 220))
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() - 0.5, y: Math.random() - 0.5, depth: 0.12 + Math.random() * 1.08,
    }))
  }
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    const light = this.appearance === "light"
    for (const star of this.stars) {
      star.depth -= delta * 0.035
      if (star.depth < 0.12) star.depth += 1.08
      const x = this.width * (0.5 + star.x / star.depth)
      const y = this.height * (0.5 + star.y / star.depth)
      if (x < -5 || x > this.width + 5 || y < -5 || y > this.height + 5) continue
      const near = 1 - star.depth / 1.2
      ctx.globalAlpha = light ? 0.5 + near * 0.5 : 0.3 + near * 0.7
      ctx.fillStyle = light ? "#254466" : "#d8eaff"
      ctx.beginPath(); ctx.arc(x, y, light ? 0.85 + near * 1.35 : 0.55 + near * 1.2, 0, Math.PI * 2); ctx.fill()
      if (near > 0.65) {
        ctx.strokeStyle = light ? "#536a83" : "#94b6e0"; ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(this.width * (0.5 + star.x / (star.depth + 0.008)), this.height * (0.5 + star.y / (star.depth + 0.008)))
        ctx.lineTo(x, y); ctx.stroke()
      }
    }
  }
}

class Aurora extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const colors = ["71, 233, 167", "63, 206, 214", "129, 123, 236", "79, 221, 175"]
    ctx.globalCompositeOperation = "screen"
    const steps = 80
    for (let band = 0; band < colors.length; band++) {
      const top = (x: number) => this.height * (0.16 + band * 0.085
        + Math.sin(x / this.width * 4.5 + this.time * 0.16 + band * 0.8) * 0.09
        + Math.sin(x / this.width * 10 - this.time * 0.11 + band) * 0.035)
      const bottom = (x: number) => top(x) + this.height * (0.14 + Math.sin(x / this.width * 5 + this.time * 0.1 + band) * 0.045)
      const gradient = ctx.createLinearGradient(0, this.height * (0.04 + band * 0.075), 0, this.height * (0.7 + band * 0.075))
      gradient.addColorStop(0, `rgba(${colors[band]}, 0)`)
      gradient.addColorStop(0.35, `rgba(${colors[band]}, 0.12)`)
      gradient.addColorStop(0.48, `rgba(${colors[band]}, 0.6)`)
      gradient.addColorStop(0.7, `rgba(${colors[band]}, 0.1)`)
      gradient.addColorStop(1, `rgba(${colors[band]}, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath(); ctx.moveTo(0, top(0))
      for (let step = 1; step <= steps; step++) { const x = step / steps * this.width; ctx.lineTo(x, top(x)) }
      for (let step = steps; step >= 0; step--) { const x = step / steps * this.width; ctx.lineTo(x, bottom(x)) }
      ctx.closePath(); ctx.fill()
    }
  }
}

export function createScene(mode: BuiltinMode): Scene {
  switch (mode) {
    case "matrix": return new Rain()
    case "clouds": return new CloudDrift()
    case "fireflies": return new Fireflies()
    case "starfield": return new Starfield()
    case "aurora": return new Aurora()
  }
}
