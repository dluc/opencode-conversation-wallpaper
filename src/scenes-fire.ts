import { AmbientScene, type Appearance } from "./scene"
import { FireField } from "./fire"

const dark = [[158, 27, 12], [219, 47, 12], [247, 107, 15], [255, 172, 44], [255, 225, 146]]
const light = [[157, 36, 16], [181, 51, 12], [203, 98, 14], [213, 144, 30], [208, 170, 72]]
const levels = [0, 0.15, 0.4, 0.7, 1.15]
const smooth = (t: number) => { const p = Math.max(0, Math.min(1, t)); return p * p * (3 - 2 * p) }

const tableSize = 1024, maxHeat = 1.3
const tables = new Map<Appearance, Uint8ClampedArray>()

/** Continuous warm bands, with a tighter opacity transition than the prototype.
 * This is smooth sampling, not ordered dithering or random visible grain. */
export function fireColorTable(appearance: Appearance) {
  const cached = tables.get(appearance)
  if (cached) return cached
  const palette = appearance === "dark" ? dark : light, table = new Uint8ClampedArray(tableSize * 4)
  const edgeStrength = appearance === "light" ? 0.04 : 0.2
  for (let i = 0; i < tableSize; i++) {
    const heat = i / (tableSize - 1) * maxHeat
    let level = 0
    while (level < levels.length - 2 && heat > levels[level + 1]) level++
    const blend = smooth((heat - levels[level]) / (levels[level + 1] - levels[level]))
    for (let channel = 0; channel < 3; channel++) table[i * 4 + channel] = palette[level][channel]
      + (palette[level + 1][channel] - palette[level][channel]) * blend
    table[i * 4 + 3] = 235 * smooth((heat - 0.08) / 0.065)
      * (edgeStrength + (1 - edgeStrength) * smooth((heat - 0.08) / 0.72))
  }
  tables.set(appearance, table)
  return table
}

export class Fire extends AmbientScene {
  readonly model = new FireField(96, 160, true)
  private texture = document.createElement("canvas")
  private context: CanvasRenderingContext2D | null
  private pixels: ImageData | undefined
  private paintedStep = -1
  private paintedPhase = -1
  private paintedAppearance: Appearance | undefined

  constructor() {
    super()
    this.texture.width = this.model.columns; this.texture.height = this.model.rows
    this.context = this.texture.getContext("2d")
    this.pixels = this.context?.createImageData(this.model.columns, this.model.rows)
  }

  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    if (!this.context || !this.pixels) return
    this.model.advance(delta)
    const { columns, rows, emission, previous, phase } = this.model, data = this.pixels.data
    if (this.paintedStep !== this.model.steps || this.paintedPhase !== phase || this.paintedAppearance !== this.appearance) {
      const palette = fireColorTable(this.appearance)
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const id = y * columns + x, heat = previous[id] + (emission[id] - previous[id]) * phase
        const index = Math.max(0, Math.min(tableSize - 1, Math.round(heat / maxHeat * (tableSize - 1)))) * 4
        const offset = ((rows - 1 - y) * columns + x) * 4
        data[offset] = palette[index]; data[offset + 1] = palette[index + 1]
        data[offset + 2] = palette[index + 2]; data[offset + 3] = palette[index + 3]
      }
      this.context.putImageData(this.pixels, 0, 0)
      this.paintedStep = this.model.steps; this.paintedPhase = phase; this.paintedAppearance = this.appearance
    }
    // Preserve physical proportions. This buffer is a smooth sampled field,
    // not a visible pixel texture. Resizing preserves the field and its age.
    const scale = this.height / 2.4
    const width = scale * 2.2, height = this.height
    ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true
    ctx.drawImage(this.texture, (this.width - width) / 2, this.height - height, width, height)
  }
}
