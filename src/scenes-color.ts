import { AmbientScene, type Appearance } from "./scene"
import { clamp, MIN_SPEED, MAX_SPEED } from "./preferences"

export const RAINBOW_CYCLE_SECONDS = 180

/** A continuous full hue wheel; dark shades/pastels keep the app's text readable. */
export function rainbowColor(time: number, appearance: Appearance) {
  const hue = ((time / RAINBOW_CYCLE_SECONDS * 360) % 360 + 360) % 360
  return `hsl(${hue}, 65%, ${appearance === "light" ? 80 : 24}%)`
}

export class Rainbow extends AmbientScene {
  private initialized = false

  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number, appearance: Appearance = "dark") {
    if (!this.width || !this.height) return
    // Every mounted timeline samples the same epoch clock, not a local start time.
    // Zero elapsed means a still repaint: freeze across pause/theme/resize updates.
    if (!this.initialized || elapsed > 0) {
      this.time = Date.now() / 1000 * clamp(speed, MIN_SPEED, MAX_SPEED)
      this.initialized = true
    }
    super.draw(ctx, 0, 1, appearance)
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = 1
    ctx.fillStyle = rainbowColor(this.time, this.appearance)
    ctx.fillRect(0, 0, this.width, this.height)
  }
}
