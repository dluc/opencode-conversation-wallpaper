/** Conway's B3/S23 rule on a toroidal board. Every generation reads only the old board. */
export function stepLife(cells: Uint8Array, columns: number, rows: number): Uint8Array {
  const next = new Uint8Array(cells.length)
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    let neighbors = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx || dy) neighbors += cells[((y + dy + rows) % rows) * columns + (x + dx + columns) % columns]
    }
    const id = y * columns + x
    next[id] = neighbors === 3 || (cells[id] === 1 && neighbors === 2) ? 1 : 0
  }
  return next
}

export class LifeGame {
  readonly columns: number
  readonly rows: number
  cells: Uint8Array
  previous: Uint8Array
  generation = 0
  round = 1
  stage: "running" | "reseed" = "running"
  private age = 0
  private accumulator = 0
  private seed = 19371
  private history: number[] = []
  private stagnant = 0
  constructor(columns = 64, rows = 36) {
    this.columns = Math.max(5, Math.min(96, Math.round(columns)))
    this.rows = Math.max(5, Math.min(64, Math.round(rows)))
    this.cells = new Uint8Array(this.columns * this.rows)
    this.previous = new Uint8Array(this.cells.length)
    this.seedBoard()
  }
  private seedBoard() {
    for (let i = 0; i < this.cells.length; i++) {
      this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0
      this.cells[i] = this.seed / 4294967296 < 0.26 ? 1 : 0
    }
    this.previous.fill(0)
    this.generation = 0; this.age = 0; this.accumulator = 0; this.history = []; this.stagnant = 0; this.stage = "running"
  }
  get phase() { return Math.min(1, Math.max(0, this.accumulator / 0.3)) }
  get opacity() { return this.stage === "reseed" ? Math.max(0, 1 - this.age / 2) : 1 }
  advance(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    const delta = Math.min(seconds, 1)
    if (this.stage === "reseed") {
      this.age += delta
      if (this.age >= 2) { this.round++; this.seedBoard() }
      return
    }
    this.accumulator += delta
    while (this.accumulator + 1e-9 >= 0.3) {
      this.accumulator = Math.max(0, this.accumulator - 0.3)
      this.previous = this.cells; this.cells = stepLife(this.cells, this.columns, this.rows)
      this.generation++
      let population = 0, hash = 2166136261
      for (let i = 0; i < this.cells.length; i++) { population += this.cells[i]; hash = Math.imul(hash ^ this.cells[i], 16777619) >>> 0 }
      this.stagnant = this.history.includes(hash) ? this.stagnant + 1 : 0
      this.history.push(hash); if (this.history.length > 12) this.history.shift()
      if (!population || this.stagnant >= 30 || this.generation >= 240) { this.stage = "reseed"; this.age = 0; break }
    }
  }
}
