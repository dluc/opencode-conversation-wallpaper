import { clamp, MAX_SPEED, MIN_SPEED } from "./preferences"

export type Appearance = "light" | "dark"
export interface Scene {
  resize(width: number, height: number): void
  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number, appearance?: Appearance): void
}

/** Fixed motion belongs to each scene; only elapsed time is scaled by the shared speed. */
export abstract class AmbientScene implements Scene {
  protected width = 0
  protected height = 0
  protected time = 0
  protected appearance: Appearance = "dark"
  resize(width: number, height: number) {
    this.width = Math.max(0, width); this.height = Math.max(0, height)
    this.layout()
  }
  protected layout() {}
  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number, appearance: Appearance = "dark") {
    if (!this.width || !this.height) return
    this.appearance = appearance
    const delta = clamp(elapsed, 0, 0.1) * clamp(speed, MIN_SPEED, MAX_SPEED)
    this.time += delta
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.save(); this.paint(ctx, delta); ctx.restore()
  }
  protected abstract paint(ctx: CanvasRenderingContext2D, delta: number): void
}
