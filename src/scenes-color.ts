import { AmbientScene, type Appearance } from "./scene"

export const RAINBOW_CYCLE_SECONDS = 180

/** A continuous full hue wheel; dark shades/pastels keep the app's text readable. */
export function rainbowColor(time: number, appearance: Appearance) {
  const hue = ((time / RAINBOW_CYCLE_SECONDS * 360) % 360 + 360) % 360
  return `hsl(${hue}, 65%, ${appearance === "light" ? 80 : 24}%)`
}

export class Rainbow extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = 1
    ctx.fillStyle = rainbowColor(this.time, this.appearance)
    ctx.fillRect(0, 0, this.width, this.height)
  }
}
