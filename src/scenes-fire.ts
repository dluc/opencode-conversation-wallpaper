import { AmbientScene, type Appearance } from "./scene"

export const FIRE_COLOR_CYCLE_SECONDS = 240
const columns = 80, rows = 64, bands = 5

/** One coordinated hue family at a time, never warm and cool flames together. */
export function firePalette(time: number, appearance: Appearance) {
  const phase = ((time % FIRE_COLOR_CYCLE_SECONDS) + FIRE_COLOR_CYCLE_SECONDS) % FIRE_COLOR_CYCLE_SECONDS
  const cool = (1 - Math.cos(phase / FIRE_COLOR_CYCLE_SECONDS * Math.PI * 2)) / 2
  const center = 25 + cool * 160
  return [-20, -7, 7, 18, 30].map((offset, band) => ({
    hue: center + offset,
    saturation: appearance === "light" ? 58 : 68,
    lightness: (appearance === "light" ? 34 : 36) + band * (appearance === "light" ? 5 : 8),
  }))
}

/** Features move toward increasing height, i.e. up from the canvas bottom. */
export function fireLift(height: number, time: number) {
  return Math.sin(height * 8 - time * 0.26)
}

/** Bounded contour sampling preserves the broad morphing silhouettes without a pixel grid. */
export function fireContours(time: number) {
  const contours = Array.from({ length: bands }, () => new Float64Array(columns + 1).fill(1))
  const previous = new Float64Array(columns + 1)
  const tongues = Array.from({ length: 5 }, (_, i) => ({
    center: -0.02 + i * 0.26,
    height: 1.02 + Math.sin(i * 2.1 + time * 0.09) * 0.12,
    width: 0.23 + Math.sin(i * 1.7 - time * 0.07) * 0.035,
    phase: i * 1.9,
  }))
  const row = tongues.map(() => ({ center: 0, width: 0, heat: 0 }))
  for (let y = 0; y <= rows; y++) {
    const rise = 1 - y / rows, lift = fireLift(rise, time)
    for (let i = 0; i < tongues.length; i++) {
      const tongue = tongues[i]
      row[i].center = tongue.center + rise * (Math.sin(rise * 4 - time * 0.12 + tongue.phase) * 0.16
        + Math.sin(rise * 7 - time * 0.19 + tongue.phase) * 0.035)
      row[i].width = tongue.width * (1 - rise * 0.68)
      row[i].heat = (tongue.height - rise) / tongue.height + lift * 0.045
    }
    for (let x = 0; x <= columns; x++) {
      let heat = -1
      for (const tongue of row) {
        const distance = (x / columns - tongue.center) / tongue.width
        const next = tongue.heat - distance * distance * 0.22
        const blend = Math.max(0, 0.1 - Math.abs(heat - next)) / 0.1
        heat = Math.max(heat, next) + blend * blend * 0.025
      }
      for (let band = 0; band < bands; band++) {
        const level = (band + 0.5) / bands - 0.07
        if (contours[band][x] !== 1 || heat < level) continue
        contours[band][x] = y === 0 ? 0 : (y - 1 + (level - previous[x]) / (heat - previous[x])) / rows
      }
      previous[x] = heat
    }
  }
  return contours
}

export class Fire extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const contours = fireContours(this.time), palette = firePalette(this.time, this.appearance)
    // Like Aurora: large translucent gradient bands, no raster, stipple, or noise.
    ctx.globalCompositeOperation = this.appearance === "dark" ? "screen" : "source-over"
    for (let band = 0; band < contours.length; band++) {
      const { hue, saturation, lightness } = palette[band]
      const color = (alpha: number) => `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
      const gradient = ctx.createLinearGradient(0, this.height, 0, 0)
      gradient.addColorStop(0, color(0.5))
      gradient.addColorStop(0.55, color(0.32))
      gradient.addColorStop(1, color(0.08))
      ctx.fillStyle = gradient
      ctx.beginPath(); ctx.moveTo(0, this.height)
      for (let x = 0; x <= columns; x++) ctx.lineTo(x / columns * this.width, contours[band][x] * this.height)
      ctx.lineTo(this.width, this.height); ctx.closePath(); ctx.fill()
    }
  }
}
