// Original implementation of semi-Lagrangian scalar transport under an upward
// curl-noise field. This is fluid-inspired, not a pressure/combustion solver.
const stepSeconds = 1 / 30
const flowColumns = 20, flowRows = 32
const worldWidth = 2.2, worldHeight = 2.4
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const hash = (x: number, y: number, z: number) => {
  let value = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1442695041)
  value = Math.imul(value ^ (value >>> 13), 1274126177)
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295 * 2 - 1
}

/** Smooth coherent noise changes the velocity field, never visible grain/dither. */
export function flowNoise(x: number, y: number, z: number) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z)
  const u = fade(x - ix), v = fade(y - iy), w = fade(z - iz)
  const plane = (layer: number) => mix(
    mix(hash(ix, iy, layer), hash(ix + 1, iy, layer), u),
    mix(hash(ix, iy + 1, layer), hash(ix + 1, iy + 1, layer), u), v)
  return mix(plane(iz), plane(iz + 1), w)
}

function sample(field: Float32Array, width: number, height: number, x: number, y: number) {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return 0
  const ix = Math.floor(x), iy = Math.floor(y), right = Math.min(ix + 1, width - 1), top = Math.min(iy + 1, height - 1)
  return mix(mix(field[iy * width + ix], field[iy * width + right], x - ix),
    mix(field[top * width + ix], field[top * width + right], x - ix), y - iy)
}

export class FireField {
  readonly columns: number
  readonly rows: number
  readonly emission: Float32Array
  readonly previous: Float32Array
  readonly velocityX: Float32Array
  readonly velocityY: Float32Array
  sourceEnabled = true
  time = 0
  steps = 0
  private accumulator = 0
  private advected: Float32Array
  private source: Float32Array
  private potential = new Float32Array((flowColumns + 2) * (flowRows + 2))
  private flowX = new Float32Array(flowColumns * flowRows)
  private flowY = new Float32Array(flowColumns * flowRows)

  constructor(columns = 96, rows = 160, formed = false) {
    this.columns = Math.max(24, Math.min(128, Math.round(columns)))
    this.rows = Math.max(32, Math.min(192, Math.round(rows)))
    const size = this.columns * this.rows
    this.emission = new Float32Array(size); this.previous = new Float32Array(size); this.advected = new Float32Array(size)
    this.velocityX = new Float32Array(size); this.velocityY = new Float32Array(size)
    this.source = new Float32Array(this.columns)
    if (formed) this.initialize()
  }

  /** Seed a formed scalar field in one bounded pass, without hidden simulation
   * time or the prototype's 150-step startup stall. Flow immediately takes over. */
  private initialize() {
    this.updateFlow()
    for (let y = 0; y < this.rows; y++) {
      const py = y / (this.rows - 1) * worldHeight
      const heightFade = Math.max(0, 1 - py / 2.15)
      const bend = flowNoise(py * 1.6, 0, 4) * 0.12
      const width = Math.max(0.1, 0.52 * (1 - py / 3))
      for (let x = 1; x < this.columns - 1; x++) {
        const px = x / (this.columns - 1) * worldWidth - worldWidth / 2
        this.emission[y * this.columns + x] = heightFade * Math.exp(-(((px - bend) / width) ** 2) * 1.6)
      }
    }
    this.injectSource()
    this.previous.set(this.emission)
  }

  private injectSource() {
    if (this.sourceEnabled) for (let y = 0; y < 5; y++) for (let x = 1; x < this.columns - 1; x++) {
      const id = y * this.columns + x
      this.emission[id] = Math.max(this.emission[id], this.source[x] * (1 - y / 6))
    }
  }

  private updateFlow() {
    const dx = worldWidth / (flowColumns - 1), dy = worldHeight / (flowRows - 1)
    const pitch = flowColumns + 2
    for (let y = -1; y <= flowRows; y++) for (let x = -1; x <= flowColumns; x++) {
      const px = x * dx - worldWidth / 2, py = y * dy
      const large = flowNoise(px * 1.6, py * 1.6 - this.time * 0.4, this.time * 0.1)
      const small = flowNoise(px * 3.2 + 13, py * 3.2 - this.time * 0.64, this.time * 0.14 + 7)
      const envelope = Math.min(1, Math.max(0, py / 0.3)) * Math.exp(-px * px / 1.1)
      this.potential[(y + 1) * pitch + x + 1] = (large * 0.1 + small * 0.045) * envelope
    }
    // Curl of the stream function gives swirling flow. The prescribed vertical
    // updraft varies across x only. We do not claim a dynamically solved velocity.
    for (let y = 0; y < flowRows; y++) for (let x = 0; x < flowColumns; x++) {
      const id = (y + 1) * pitch + x + 1, px = x * dx - worldWidth / 2
      this.flowX[y * flowColumns + x] = (this.potential[id + pitch] - this.potential[id - pitch]) / (2 * dy)
      this.flowY[y * flowColumns + x] = -(this.potential[id + 1] - this.potential[id - 1]) / (2 * dx)
        + 0.42 + Math.exp(-px * px / 0.35) * 0.12
    }
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
      const fx = x / (this.columns - 1) * (flowColumns - 1), fy = y / (this.rows - 1) * (flowRows - 1)
      this.velocityX[y * this.columns + x] = sample(this.flowX, flowColumns, flowRows, fx, fy)
      this.velocityY[y * this.columns + x] = sample(this.flowY, flowColumns, flowRows, fx, fy)
    }
    for (let x = 0; x < this.columns; x++) {
      const px = x / (this.columns - 1) * worldWidth - worldWidth / 2
      this.source[x] = Math.exp(-((px / 0.62) ** 2) * 1.6)
        * (0.85 + flowNoise(px * 5, 0, this.time * 0.65) * 0.45)
    }
  }

  advance(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    this.accumulator += Math.min(0.4, seconds)
    while (this.accumulator + 1e-9 >= stepSeconds) {
      this.accumulator = Math.max(0, this.accumulator - stepSeconds)
      this.step()
    }
  }

  get phase() { return Math.min(1, this.accumulator / stepSeconds) }

  private step() {
    this.previous.set(this.emission)
    if (this.steps % 2 === 0) this.updateFlow()
    const { columns, rows, emission, advected } = this
    const dx = worldWidth / (columns - 1), dy = worldHeight / (rows - 1)
    const decay = Math.exp(-0.18 * stepSeconds)
    // Backtrace through the shared velocity field and bilinearly sample the old
    // emission. There are no independent flame objects or prescribed outlines.
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const id = y * columns + x
      const carried = sample(emission, columns, rows,
        x - this.velocityX[id] * stepSeconds / dx, y - this.velocityY[id] * stepSeconds / dy)
      advected[id] = Math.max(0, carried * decay - (0.06 + y * dy * 0.07) * stepSeconds)
    }
    // A little diffusion suppresses cell artifacts; transport also dissipates.
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const id = y * columns + x
      if (!x || !y || x === columns - 1 || y === rows - 1) { emission[id] = 0; continue }
      emission[id] = advected[id] * 0.97 + (advected[id - 1] + advected[id + 1]
        + advected[id - columns] + advected[id + columns]) * 0.0075
    }
    this.injectSource()
    this.time += stepSeconds; this.steps++
  }
}
