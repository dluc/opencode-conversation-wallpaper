import { AmbientScene, type Appearance } from "./scene"

const steps = 48
export const FIRE_FLAME_COUNT = 10
const heights = [0.58, 0.79, 1.015, 0.86, 0.56]
const heat = [0.22, 0.58, 1, 0.75, 0.19]
const roots = [0.2, 0.37, 0.5, 0.61, 0.78]
const periods = [10.4, 12.7, 11.3, 14.6, 9.8]
const offsets = [0.18, 0.52, 0.34, 0.61, 0.43]
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
    width: 0.14 * (0.8 + heat[origin] * 0.2) * (0.6 + growth * 0.4) * (1 - age * 0.25),
    opacity: smooth(age / 0.12) * smooth((1 - age) / 0.18),
    heat: heat[origin],
    root: roots[origin] + Math.sin(cycle * 2.7 + index) * 0.012,
    curl: Math.sin(index * 1.93 + cycle * 1.3) * 0.045,
  }
}

/** Use physical height for width, with a bound for exceptionally narrow viewports. */
export function fireWidthScale(width: number, height: number) {
  return Math.min(2, height * 0.95 / Math.max(1, width))
}

/** The base stays put while height, width, tip shape, and brightness evolve over each life. */
export function fireFlame(index: number, time: number, widthScale = 1): FlameSection[] {
  const phase = index * 1.93, pulse = firePulse(index, time)
  const root = 0.5 + (pulse.root - 0.5) * Math.min(1, widthScale * 1.6 / 0.95)
  return Array.from({ length: steps + 1 }, (_, step) => {
    const progress = step / steps, rise = progress
    const y = 1.04 - pulse.height * rise
    const flow = fireLift(1.04 - y, time, phase)
    const center = root + (pulse.curl * rise ** 2
      + Math.sin((1.04 - y) * 6 - time * 0.5 + phase) * rise * 0.025) * widthScale
    const width = pulse.width * widthScale * (1 - progress) ** (0.68 + pulse.age * 0.6)
      * (1 + flow * Math.sin(progress * Math.PI) * 0.22)
    const asymmetry = flow * Math.sin(progress * Math.PI) * 0.08
    return { y, left: center - width * (1 + asymmetry), right: center + width * (1 - asymmetry) }
  })
}

export class Fire extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const palette = firePalette(this.appearance)
    const color = (index: number, alpha: number) => `rgba(${palette[index].join(", ")}, ${alpha})`
    const widthScale = fireWidthScale(this.width, this.height)
    ctx.globalCompositeOperation = "source-over"

    // A shared, low hearth glow joins the tongues into one fire. It has a hot
    // center and fades both sideways and upward, never an even horizontal stripe.
    ctx.save()
    ctx.globalAlpha = 1
    ctx.translate(this.width * 0.5, this.height * 1.04)
    ctx.scale(this.width * 0.47, this.height * 0.36)
    const hearth = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    hearth.addColorStop(0, color(3, 0.45)); hearth.addColorStop(0.32, color(2, 0.4))
    hearth.addColorStop(0.68, color(1, 0.16)); hearth.addColorStop(1, color(0, 0))
    ctx.fillStyle = hearth; ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()

    for (let flame = 0; flame < FIRE_FLAME_COUNT; flame++) {
      const pulse = firePulse(flame, this.time), sections = fireFlame(flame, this.time, widthScale)
      const rootX = (sections[0].left + sections[0].right) / 2 * this.width, baseY = this.height * 1.04
      const radiusX = pulse.width * widthScale * this.width, radiusY = pulse.height * this.height
      ctx.save()
      ctx.translate(rootX, baseY); ctx.scale(radiusX, radiusY)
      ctx.globalAlpha = pulse.opacity * pulse.heat
      // Elliptical volume shading: hot at the lower center, orange outward,
      // then red and transparent at the sides/tip. No nested leaf-shaped fills.
      const gradient = ctx.createRadialGradient(0, -0.12, 0, 0, -0.12, 1.12)
      gradient.addColorStop(0, color(pulse.heat > 0.9 ? 3 : 2, 0.9))
      gradient.addColorStop(0.18, color(2, 0.78))
      gradient.addColorStop(0.42, color(1, 0.57))
      gradient.addColorStop(0.72, color(0, 0.26))
      gradient.addColorStop(1, color(0, 0))
      ctx.fillStyle = gradient
      const x = (value: number) => (value * this.width - rootX) / radiusX
      const y = (value: number) => (value * this.height - baseY) / radiusY
      ctx.beginPath(); ctx.moveTo(x(sections[0].left), y(sections[0].y))
      for (let step = 1; step <= steps; step++) ctx.lineTo(x(sections[step].left), y(sections[step].y))
      for (let step = steps - 1; step >= 0; step--) ctx.lineTo(x(sections[step].right), y(sections[step].y))
      ctx.closePath(); ctx.fill()
      ctx.restore()
    }
  }
}
