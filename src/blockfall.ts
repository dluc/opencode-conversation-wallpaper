export type Cell = readonly [number, number]
const shapes: readonly (readonly Cell[])[] = [
  [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [1, 1], [2, 1]], [[2, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
]
function rotations(shape: readonly Cell[]): Cell[][] {
  const result: Cell[][] = []
  let cells = shape.map(([x, y]): Cell => [x, y])
  for (let turn = 0; turn < 4; turn++) {
    result.push(cells)
    const rotated = cells.map(([x, y]): Cell => [-y, x])
    const minX = Math.min(...rotated.map(([x]) => x)), minY = Math.min(...rotated.map(([, y]) => y))
    cells = rotated.map(([x, y]) => [x - minX, y - minY])
  }
  return result
}

/** Small bounded falling-block simulation. Planning runs once per piece, never per frame. */
export class BlockfallGame {
  columns: number
  rows: number
  board: number[][] = []
  round = 1
  pieces = 0
  totalLines = 0
  stage: "fall" | "clear" | "reset" = "fall"
  age = 0
  clearing: number[] = []
  piece: { cells: Cell[]; x: number; landing: number; color: number } | undefined
  private seed = 193
  constructor(columns = 10, rows = 18) {
    this.columns = Math.max(8, Math.min(36, Math.round(columns)))
    this.rows = Math.max(8, Math.min(36, Math.round(rows)))
    this.reset()
  }
  /** Reflow the existing stack, anchored at the floor; keep round, counters, and piece age. */
  resize(columns: number, rows: number) {
    columns = Math.max(8, Math.min(36, Math.round(columns)))
    rows = Math.max(8, Math.min(36, Math.round(rows)))
    if (columns === this.columns && rows === this.rows) return
    const board = Array.from({ length: rows }, () => Array(columns).fill(0))
    const dx = Math.floor((columns - this.columns) / 2), dy = rows - this.rows
    for (let y = 0; y < this.rows; y++) for (let x = 0; x < this.columns; x++) {
      if (y + dy >= 0 && y + dy < rows && x + dx >= 0 && x + dx < columns) board[y + dy][x + dx] = this.board[y][x]
    }
    const age = this.age, kind = (this.piece?.color ?? 1) - 1
    this.clearing = this.clearing.map(y => y + dy).filter(y => y >= 0 && y < rows)
    this.columns = columns; this.rows = rows; this.board = board
    if (this.stage === "fall") { this.spawn(kind); this.age = Math.min(age, this.duration) }
    else this.piece = undefined
  }
  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296 }
  private reset() {
    this.board = Array.from({ length: this.rows }, () => Array(this.columns).fill(0))
    // A compact opening stack gives the first round a meaningful two-line clear.
    for (let y = this.rows - 2; y < this.rows; y++) for (let x = 0; x < this.columns - 2; x++) this.board[y][x] = 1 + x % 6
    this.pieces = 0; this.age = 0; this.clearing = []; this.spawn(0)
  }
  private fits(cells: readonly Cell[], x: number, y: number) {
    return cells.every(([dx, dy]) => x + dx >= 0 && x + dx < this.columns && y + dy >= 0 && y + dy < this.rows && !this.board[y + dy][x + dx])
  }
  private spawn(kind = Math.floor(this.random() * shapes.length)) {
    let best: { cells: Cell[]; x: number; landing: number; color: number } | undefined, bestScore = -Infinity
    for (const cells of rotations(shapes[kind])) for (let x = 0; x < this.columns; x++) {
      if (!this.fits(cells, x, 0)) continue
      let y = 0
      while (this.fits(cells, x, y + 1)) y++
      const trial = this.board.map(row => [...row])
      for (const [dx, dy] of cells) trial[y + dy][x + dx] = kind + 1
      const full = trial.filter(row => row.every(Boolean)).length
      const compact = trial.filter(row => !row.every(Boolean))
      while (compact.length < this.rows) compact.unshift(Array(this.columns).fill(0))
      let holes = 0
      const heights = Array.from({ length: this.columns }, (_, column) => {
        const top = compact.findIndex(row => row[column])
        if (top < 0) return 0
        for (let row = top; row < this.rows; row++) if (!compact[row][column]) holes++
        return this.rows - top
      })
      const bump = heights.slice(1).reduce((sum, height, index) => sum + Math.abs(height - heights[index]), 0)
      const score = full * 12 - holes * 9 - heights.reduce((a, b) => a + b, 0) * 0.45 - bump * 0.25
      if (score > bestScore) { bestScore = score; best = { cells, x, landing: y, color: kind + 1 } }
    }
    this.piece = best; this.stage = best && this.pieces < 45 ? "fall" : "reset"
  }
  get duration() { return this.stage === "fall" ? 1.15 : this.stage === "clear" ? 0.45 : 2 }
  get fallingY() { return -1 + Math.min(1, this.age / 1.15) * ((this.piece?.landing ?? 0) + 1) }
  advance(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    // Frame deltas are bounded upstream. Keep this public simulation bounded too.
    let remaining = Math.min(seconds, 1)
    while (remaining > 0) {
      const step = Math.min(remaining, this.duration - this.age)
      this.age += step; remaining -= step
      if (this.age + 1e-9 < this.duration) break
      this.age = 0
      if (this.stage === "reset") { this.round++; this.reset(); continue }
      if (this.stage === "clear") {
        this.totalLines += this.clearing.length
        this.board = this.board.filter((_, y) => !this.clearing.includes(y))
        while (this.board.length < this.rows) this.board.unshift(Array(this.columns).fill(0))
        this.clearing = []; this.spawn(); continue
      }
      const piece = this.piece!
      for (const [dx, dy] of piece.cells) this.board[piece.landing + dy][piece.x + dx] = piece.color
      this.pieces++
      this.clearing = this.board.flatMap((row, y) => row.every(Boolean) ? [y] : [])
      if (this.clearing.length) this.stage = "clear"
      else this.spawn()
    }
  }
}
