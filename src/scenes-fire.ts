import { AmbientScene, type Appearance } from "./scene"

const steps = 48
const heights = [0.92, 1.015, 0.88, 0.98, 0.94]
const layers = [{ height: 1, width: 1 }, { height: 0.76, width: 0.66 }, { height: 0.48, width: 0.36 }]

/** Fixed flame colors, never a hue wheel: red edges, orange bodies, yellow cores. */
export function firePalette(appearance: Appearance) {
  return appearance === "dark"
    ? [[228, 53, 17], [250, 102, 14], [255, 164, 34], [255, 214, 109]] as const
    : [[181, 48, 16], [205, 79, 10], [218, 129, 16], [210, 165, 42]] as const
}

/** A slow deformation travelling upwards, not a whole silhouette bobbing vertically. */
export function fireLift(height: number, time: number, phase = 0) {
  return Math.sin(height * 8 - time * 0.26 + phase)
}

export interface FlameSection { y: number; left: number; right: number }

/** Bottom-rooted, tapering ribbons. Both sides meet at a sideways-curling pointed tip. */
export function fireFlame(index: number, time: number, layer = 0): FlameSection[] {
  const shape = layers[layer], phase = index * 1.93, root = -0.02 + index * 0.26
  return Array.from({ length: steps + 1 }, (_, step) => {
    const progress = step / steps, rise = progress * shape.height
    const y = 1.04 - heights[index] * rise
    const flow = fireLift(1.04 - y, time, phase)
    const center = root + Math.sin(phase + time * 0.085) * rise ** 1.8 * 0.12
      + Math.sin(rise * 5 - time * 0.2 + phase) * rise * 0.065
    const width = 0.25 * shape.width * (1 - progress) ** 0.72
      * (1 + flow * Math.sin(progress * Math.PI) * 0.16)
    const asymmetry = flow * Math.sin(progress * Math.PI) * 0.08
    return { y, left: center - width * (1 + asymmetry), right: center + width * (1 - asymmetry) }
  })
}

export class Fire extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const palette = firePalette(this.appearance)
    // Independent nested flame tongues, not filled horizontal height-map contours.
    // Source-over preserves reds/oranges instead of bleaching overlapping flames.
    ctx.globalCompositeOperation = "source-over"
    for (let layer = 0; layer < layers.length; layer++) for (let flame = 0; flame < heights.length; flame++) {
      const sections = fireFlame(flame, this.time, layer), tip = sections.at(-1)!
      const gradient = ctx.createLinearGradient(0, tip.y * this.height, 0, this.height * 1.04)
      const color = (index: number, alpha: number) => `rgba(${palette[index].join(", ")}, ${alpha})`
      gradient.addColorStop(0, color(layer, layer === 0 ? 0.28 : 0.38))
      gradient.addColorStop(0.55, color(layer + 1, 0.48))
      gradient.addColorStop(1, color(layer + 1, 0.58))
      ctx.fillStyle = gradient
      ctx.beginPath(); ctx.moveTo(sections[0].left * this.width, sections[0].y * this.height)
      for (let step = 1; step <= steps; step++) ctx.lineTo(sections[step].left * this.width, sections[step].y * this.height)
      for (let step = steps - 1; step >= 0; step--) ctx.lineTo(sections[step].right * this.width, sections[step].y * this.height)
      ctx.closePath(); ctx.fill()
    }
  }
}
