/** Original generated maze and autonomous match; no borrowed maps, characters, or assets. */
export class MazeGame {
  readonly columns = 23
  readonly rows = 15
  walls: boolean[] = []
  pellets = new Set<number>()
  powers = new Set<number>()
  player = 0
  previousPlayer = 0
  bots: number[] = []
  previousBots: number[] = []
  lives = 3
  round = 1
  initialPellets = 0
  stage: "playing" | "cleared" | "caught" = "playing"
  age = 0
  shield = 0
  grace = 0
  completed = 0
  cleared = 0
  private accumulator = 0
  private ticks = 0
  private seed = 173
  private home = 0
  private starts: number[] = []
  constructor() { this.reset() }
  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296 }
  neighbors(tile: number) {
    const x = tile % this.columns, y = Math.floor(tile / this.columns)
    return [[x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1]]
      .filter(([a, b]) => a >= 0 && a < this.columns && b >= 0 && b < this.rows)
      .map(([a, b]) => b * this.columns + a).filter(id => !this.walls[id])
  }
  private reset() {
    this.walls = Array(this.columns * this.rows).fill(true)
    const start = this.columns + 1, stack = [start]
    this.walls[start] = false
    while (stack.length) {
      const current = stack[stack.length - 1], x = current % this.columns, y = Math.floor(current / this.columns)
      const options = [[x + 2, y], [x - 2, y], [x, y + 2], [x, y - 2]]
        .filter(([a, b]) => a > 0 && a < this.columns - 1 && b > 0 && b < this.rows - 1 && this.walls[b * this.columns + a])
      if (!options.length) { stack.pop(); continue }
      const [a, b] = options[Math.floor(this.random() * options.length)]
      this.walls[((y + b) / 2) * this.columns + (x + a) / 2] = false
      this.walls[b * this.columns + a] = false; stack.push(b * this.columns + a)
    }
    // A few loops keep chases from being only dead-end reversals.
    for (let y = 2; y < this.rows - 2; y += 2) for (let x = 2; x < this.columns - 2; x += 3) {
      const id = y * this.columns + x
      if ((!this.walls[id - 1] && !this.walls[id + 1]) || (!this.walls[id - this.columns] && !this.walls[id + this.columns])) this.walls[id] = false
    }
    const corridors = this.walls.flatMap((wall, id) => wall ? [] : [id])
    this.home = start
    this.starts = [corridors[corridors.length - 1], corridors[Math.floor(corridors.length / 2)]]
    this.pellets = new Set(corridors.filter(id => id !== start))
    this.initialPellets = this.pellets.size
    this.powers = new Set([this.columns + this.columns - 2, (this.rows - 2) * this.columns + 1, (this.rows - 2) * this.columns + this.columns - 2])
    this.player = this.previousPlayer = start
    this.bots = [...this.starts]; this.previousBots = [...this.bots]
    this.lives = 3; this.stage = "playing"; this.age = 0; this.accumulator = 0; this.ticks = 0; this.shield = 0; this.grace = 3
  }
  /** BFS returns one legal next step toward a reachable goal. */
  private toward(start: number, goal: (tile: number) => boolean, avoid = false) {
    const queue = [start], first = new Map<number, number>([[start, start]])
    for (let index = 0; index < queue.length; index++) {
      const tile = queue[index]
      if (tile !== start && goal(tile)) return first.get(tile)!
      const options = this.neighbors(tile)
      if (avoid) options.sort((a, b) => this.distanceFromBots(b) - this.distanceFromBots(a))
      for (const next of options) if (!first.has(next)) { first.set(next, tile === start ? next : first.get(tile)!); queue.push(next) }
    }
    return start
  }
  private distanceFromBots(tile: number) {
    return Math.min(...this.bots.map(bot => Math.abs(bot % this.columns - tile % this.columns) + Math.abs(Math.floor(bot / this.columns) - Math.floor(tile / this.columns))))
  }
  private step() {
    this.ticks++
    this.previousPlayer = this.player; this.previousBots = [...this.bots]
    this.player = this.toward(this.player, tile => this.pellets.has(tile), !this.shield)
    this.pellets.delete(this.player)
    if (this.powers.delete(this.player)) this.shield = 7
    if (this.ticks % 2 === 0) this.bots = this.bots.map((bot, index) => {
      if (this.shield) return this.neighbors(bot).sort((a, b) => {
        const distance = (id: number) => Math.abs(id % this.columns - this.player % this.columns) + Math.abs(Math.floor(id / this.columns) - Math.floor(this.player / this.columns))
        return distance(b) - distance(a)
      })[0] ?? bot
      const target = index === 0 ? this.player : this.starts[Math.floor(this.ticks / 28) % this.starts.length]
      return this.toward(bot, tile => tile === target)
    })
    for (let i = 0; i < this.bots.length; i++) {
      const collision = this.bots[i] === this.player || (this.previousBots[i] === this.player && this.bots[i] === this.previousPlayer)
      if (!collision || this.grace > 0) continue
      if (this.shield) { this.bots[i] = this.previousBots[i] = this.starts[i]; continue }
      this.lives--; this.grace = 3
      this.player = this.previousPlayer = this.home
      this.bots = [...this.starts]; this.previousBots = [...this.bots]
      break
    }
    if (!this.pellets.size) { this.stage = "cleared"; this.age = 0; this.cleared++ }
    else if (!this.lives) { this.stage = "caught"; this.age = 0 }
  }
  get interpolation() { return this.stage === "playing" ? Math.min(1, this.accumulator / 0.16) : 1 }
  advance(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) return
    const delta = Math.min(seconds, 1)
    this.age += delta
    if (this.stage !== "playing") {
      if (this.age >= 2.5) { this.completed++; this.round++; this.reset() }
      return
    }
    this.shield = Math.max(0, this.shield - delta); this.grace = Math.max(0, this.grace - delta)
    this.accumulator += delta
    while (this.accumulator >= 0.16 && this.stage === "playing") { this.accumulator -= 0.16; this.step() }
    if (this.age >= 90) { this.stage = "caught"; this.age = 0 }
  }
}
