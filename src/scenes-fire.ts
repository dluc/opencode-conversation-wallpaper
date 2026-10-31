import { AmbientScene, type Appearance } from "./scene"

const steps = 48
export const FIRE_FLAME_COUNT = 10
const heights = [0.94, 1.015, 0.90, 0.98, 0.99]
const periods = [10.4, 12.7, 11.3, 14.6, 9.8]
const offsets = [0.18, 0.52, 0.34, 0.61, 0.43]
const layers = [{ height: 1, width: 1 }, { height: 0.76, width: 0.66 }, { height: 0.48, width: 0.36 }]
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }

/** Fixed flame colors, never a hue wheel: red edges, orange bodies, yellow cores. */
export function firePalette(appearance: Appearance) {
  return appearance === "dark"
    ? [[228, 53, 17], [250, 102, 14], [255, 164, 34], [255, 214, 109]] as const
    : [[181, 48, 16], [205, 79, 10], [218, 129, 16], [210, 165, 42]] as const
}

/** Deformation travels upward through growing flames, never a fixed leaf swaying in wind. */
export function fireLift(height: number, time: number, phase = 0) {
  return Math.sin(height * 8 - time * 0.7 + phase)
}

export interface FlameSection { y: number; left: number; right: number }

/** Staggered birth/growth/recession: renew only after fading out, with no reset pop. */
export function firePulse(index: number, time: number) {
  // Two overlapping generations at each of five origins keep the fire alive as
  // individual tongues die back. Different origin periods avoid a shared pulse.
  const origin = index % heights.length, generation = Math.floor(index / heights.length)
  const clock = time / periods[origin] + offsets[origin] + generation * 0.5, cycle = Math.floor(clock), age = clock - cycle
  const growth = smooth(age / 0.3), recession = smooth((1 - age) / 0.38)
  return {
    age, cycle, period: periods[origin],
    height: 0.18 + (heights[origin] - 0.18) * growth * recession,
    width: 0.26 * (0.6 + growth * 0.4) * (1 - age * 0.25),
    opacity: smooth(age / 0.12) * smooth((1 - age) / 0.18),
    root: -0.02 + origin * 0.26 + Math.sin(cycle * 2.7 + index) * 0.015,
    curl: Math.sin(index * 1.93 + cycle * 1.3) * 0.045,
  }
}

/** The base stays put while height, width, tip shape, and brightness evolve over each life. */
export function fireFlame(index: number, time: number, layer = 0): FlameSection[] {
  const shape = layers[layer], phase = index * 1.93, pulse = firePulse(index, time)
  return Array.from({ length: steps + 1 }, (_, step) => {
    const progress = step / steps, rise = progress * shape.height
    const y = 1.04 - pulse.height * rise
    const flow = fireLift(1.04 - y, time, phase)
    const center = pulse.root + pulse.curl * rise ** 2
      + Math.sin((1.04 - y) * 6 - time * 0.5 + phase) * rise * 0.025
    const width = pulse.width * shape.width * (1 - progress) ** (0.68 + pulse.age * 0.6)
      * (1 + flow * Math.sin(progress * Math.PI) * 0.22)
    const asymmetry = flow * Math.sin(progress * Math.PI) * 0.08
    return { y, left: center - width * (1 + asymmetry), right: center + width * (1 - asymmetry) }
  })
}

export class Fire extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const palette = firePalette(this.appearance)
    // Independent growing/receding tongues, not perpetual wind-blown leaves.
    // Source-over preserves reds/oranges instead of bleaching overlapping flames.
    ctx.globalCompositeOperation = "source-over"
    for (let layer = 0; layer < layers.length; layer++) for (let flame = 0; flame < FIRE_FLAME_COUNT; flame++) {
      const sections = fireFlame(flame, this.time, layer), tip = sections.at(-1)!
      ctx.globalAlpha = firePulse(flame, this.time).opacity
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
