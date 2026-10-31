import { AmbientScene, type Appearance } from "./scene"

// Five pigments, not a bright photographic fire. Transparency lets the app's
// surface remain part of the picture; light mode uses warm terracotta/pastels.
export const FIRE_PALETTES = {
  dark: [[113, 42, 48], [164, 60, 43], [193, 95, 48], [215, 143, 73], [231, 185, 113]],
  light: [[177, 99, 91], [191, 116, 87], [205, 143, 97], [219, 171, 120], [231, 197, 151]],
} as const satisfies Record<Appearance, readonly (readonly [number, number, number])[]>
export const FIRE_MAX_PIXELS = 49152

// A stationary ordered screen avoids random sparkling as the flames morph.
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
const smooth = (value: number) => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t) }

/** Features move toward increasing height, i.e. up from the canvas bottom. */
export function fireLift(height: number, time: number) {
  return Math.sin(height * 8 - time * 0.26)
}

export class Fire extends AmbientScene {
  private texture: HTMLCanvasElement | undefined
  private context: CanvasRenderingContext2D | null = null
  private pixels: ImageData | undefined

  protected layout() {
    if (!this.width || !this.height) return
    this.texture ??= document.createElement("canvas")
    const scale = Math.min(1, 320 / this.width, 320 / this.height, Math.sqrt(FIRE_MAX_PIXELS / (this.width * this.height)))
    const width = Math.max(1, Math.floor(this.width * scale)), height = Math.max(1, Math.floor(this.height * scale))
    if (this.pixels?.width === width && this.pixels.height === height) return
    this.texture.width = width; this.texture.height = height
    this.context = this.texture.getContext("2d")
    this.pixels = this.context?.createImageData(width, height)
  }

  protected paint(ctx: CanvasRenderingContext2D) {
    if (!this.texture || !this.context || !this.pixels) return
    const { width, height, data } = this.pixels, palette = FIRE_PALETTES[this.appearance]
    // Broad overlapping tongues share a base. Their heights, widths, and bends
    // evolve independently: this is a morphing field, never a translated bitmap.
    const tongues = Array.from({ length: 5 }, (_, i) => ({
      center: -0.02 + i * 0.26,
      height: 1.02 + Math.sin(i * 2.1 + this.time * 0.09) * 0.12,
      width: 0.23 + Math.sin(i * 1.7 - this.time * 0.07) * 0.035,
      phase: i * 1.9,
    }))
    const row = tongues.map(() => ({ center: 0, width: 0, heat: 0 }))
    for (let y = 0; y < height; y++) {
      const rise = 1 - (y + 0.5) / height, lift = fireLift(rise, this.time)
      // Trigonometry is evaluated per row/tongue, not for each output pixel.
      for (let i = 0; i < tongues.length; i++) {
        const tongue = tongues[i]
        row[i].center = tongue.center + rise * (Math.sin(rise * 4 - this.time * 0.12 + tongue.phase) * 0.16
          + Math.sin(rise * 7 - this.time * 0.19 + tongue.phase) * 0.035)
        row[i].width = tongue.width * (1 - rise * 0.68)
        row[i].heat = (tongue.height - rise) / tongue.height + lift * 0.045
      }
      for (let x = 0; x < width; x++) {
        const horizontal = (x + 0.5) / width
        let heat = -1
        for (const tongue of row) {
          const distance = (horizontal - tongue.center) / tongue.width
          const next = tongue.heat - distance * distance * 0.22
          const blend = Math.max(0, 0.1 - Math.abs(heat - next)) / 0.1
          heat = Math.max(heat, next) + blend * blend * 0.025
        }
        // Wide flat bands with a little ordered mixing only at their boundaries.
        // Index zero is transparent; the five remaining levels use fixed pigments.
        const level = Math.max(0, Math.min(5, heat * 5 + 0.35)), lower = Math.floor(level)
        const fraction = smooth((level - lower - 0.3) / 0.4)
        const index = Math.min(5, lower + (fraction > (bayer[(y % 4) * 4 + x % 4] + 0.5) / 16 ? 1 : 0))
        const offset = (y * width + x) * 4, color = palette[Math.max(0, index - 1)]
        data[offset] = color[0]; data[offset + 1] = color[1]; data[offset + 2] = color[2]
        data[offset + 3] = index ? 175 : 0
      }
    }
    this.context.putImageData(this.pixels, 0, 0)
    ctx.globalAlpha = 1
    // Soft upscaling keeps the tiny dither screen subordinate to reading text.
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.texture, 0, 0, this.width, this.height)
  }
}
