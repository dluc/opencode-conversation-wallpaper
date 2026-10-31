import { ArtScene, sample, tau, wrap, type Point } from "./scene-art"

export class Volcano extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#231d2c", "#e8e0df")
    const rock = this.color("#535465", "#8b8a91"), lava = this.color("#e9a06a", "#b25d35")
    this.path(ctx, [[0, 0.96], [0.2, 0.83], [0.43, 0.44], [0.57, 0.44], [0.82, 0.84], [1, 0.97], [1, 1], [0, 1]], rock, 0.7, true)
    this.ring(ctx, 0.5, 0.44, 0.07, 0.018, lava, 0.8, 3)
    for (let flow = 0; flow < 3; flow++) {
      const points: Point[] = []
      for (let i = 0; i <= 35; i++) {
        const u = i / 35
        points.push([0.49 + flow * 0.015 + Math.sin(u * 9 + flow + this.time * 0.05) * 0.012 * u
          + (flow - 1) * u * 0.06, 0.45 + u * 0.47])
      }
      this.path(ctx, points, lava, 0.4 + Math.sin(this.time * 0.1 + flow) * 0.06, false, 3)
    }
    for (let i = 0; i < 36; i++) {
      const age = wrap(sample(i) + this.time * 0.035)
      this.disc(ctx, 0.5 + Math.sin(age * 4 + i) * age * 0.065,
        0.42 - age * 0.32, 0.012 + age * 0.024, rock, (1 - age) * 0.17)
    }
    for (let i = 0; i < 22; i++) {
      const age = wrap(sample(i) + this.time * 0.07), spread = (sample(i + 100) - 0.5) * 0.3
      this.disc(ctx, 0.5 + spread * age, 0.44 - Math.sin(age * Math.PI) * (0.05 + sample(i + 30) * 0.12),
        0.0025, lava, Math.sin(age * Math.PI) * 0.5)
    }
  }
}

/** Light shafts and a kelp canopy, deliberately different from the pixel aquarium. */
export class Underwater extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#164551", "#a8d2d8")
    const light = this.color("#8cc7cf", "#4f929e")
    for (let i = 0; i < 7; i++) {
      const x = i * 0.18 + Math.sin(this.time * 0.035 + i) * 0.06
      this.path(ctx, [[x, 0], [x + 0.025, 0], [x + 0.22, 1], [x + 0.1, 1]], light, 0.1, true)
    }
    const kelp = this.color("#548c76", "#3c7764")
    for (let i = 0; i < 25; i++) {
      const x = i / 24, height = 0.15 + sample(i) * 0.33, points: Point[] = []
      for (let j = 0; j <= 25; j++) {
        const u = j / 25
        points.push([x + Math.sin(u * 5 + this.time * 0.25 + i) * 0.015 * u, 1 - u * height])
      }
      this.path(ctx, points, kelp, 0.4, false, 2 + sample(i + 10) * 3)
    }
    for (let i = 0; i < 42; i++) {
      const age = wrap(sample(i) + this.time * (0.013 + sample(i + 20) * 0.015))
      this.ring(ctx, sample(i + 80) + Math.sin(this.time * 0.12 + i) * 0.005, 1 - age,
        0.002 + sample(i + 130) * 0.003, 0.004 + sample(i + 130) * 0.005, light, 0.2)
    }
    for (let i = 0; i < 14; i++) {
      const x = wrap(sample(i) + this.time * 0.009), y = 0.35 + sample(i + 30) * 0.25
      this.path(ctx, [[x - 0.012, y], [x, y - 0.005], [x + 0.012, y], [x, y + 0.004],
        [x - 0.012, y], [x - 0.018, y - 0.005], [x - 0.018, y + 0.005]], kelp, 0.5, true)
    }
  }
}

export class Fur extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#302a35", "#e6ded5")
    for (let row = 0; row < 24; row++) for (let col = 0; col < 36; col++) {
      const id = row * 36 + col, x = (col + sample(id) * 0.6) / 36, y = row / 24
      const angle = Math.sin(x * 7 + y * 5 + this.time * 0.13) * 0.7 + Math.sin(this.time * 0.08 + y * 6) * 0.3
      const length = 0.025 + sample(id + 1000) * 0.035, points: Point[] = []
      for (let j = 0; j <= 4; j++) {
        const u = j / 4
        points.push([x + Math.sin(angle) * length * u * u, y - Math.cos(angle) * length * u])
      }
      this.path(ctx, points, this.color(id % 3 ? "#b4a794" : "#927f94", id % 3 ? "#89735a" : "#806d88"), 0.3, false, 1)
    }
  }
}

/** A calm geological cross-section. Never shakes the host or conversation text. */
export class Fault extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#282632", "#e6dfd5")
    const colors = this.appearance === "light" ? ["#a89984", "#8a8e8f", "#aa8a6c"] : ["#7e807e", "#626d85", "#a18162"]
    const slip = Math.sin(this.time * 0.14) * 0.025
    for (let row = 0; row < 9; row++) {
      const y = 0.13 + row * 0.1
      this.path(ctx, [[0, y], [0.54, y + 0.03], [0.5, y + 0.13], [0, y + 0.1]], colors[row % 3], 0.45, true)
      this.path(ctx, [[0.57, y + slip], [1, y - 0.02 + slip], [1, y + 0.08 + slip], [0.53, y + 0.1 + slip]], colors[row % 3], 0.45, true)
    }
    this.path(ctx, [[0.57, 0], [0.51, 0.28], [0.57, 0.45], [0.5, 0.65], [0.54, 0.78], [0.48, 1]],
      this.color("#cfac81", "#8c6546"), 0.6, false, 2)
    for (let i = 0; i < 5; i++) {
      const age = wrap(i / 5 + this.time * 0.025)
      this.ring(ctx, 0.52, 0.67, age * 0.45, age * 0.3, this.color("#9ba9b3", "#717a85"), (1 - age) * 0.2)
    }
  }
}

/** Seismic wavefronts instead of the existing instrument-style Tremor trace. */
export class Resonance extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#202c33", "#dfe5e1")
    for (let wave = 0; wave < 18; wave++) {
      const age = wrap(wave / 18 + this.time * 0.018), points: Point[] = []
      for (let i = 0; i <= 80; i++) {
        const a = i / 80 * tau, radius = age * 0.85,
          ripple = Math.sin(a * 7 + this.time * 0.2 + wave * 0.4) * radius * 0.022
        points.push([0.36 + Math.cos(a) * (radius + ripple) * this.height / this.width,
          0.56 + Math.sin(a) * (radius + ripple)])
      }
      this.path(ctx, points, this.color(wave % 4 ? "#7caaa4" : "#c2a37a", wave % 4 ? "#467d78" : "#9b7952"), (1 - age) * 0.4)
    }
  }
}

/** Fixed low-resolution texture with slow coherent crossfades, not flashing TV static. */
export class Noise extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#283039", "#dbe0e4")
    const columns = 64, rows = 36
    ctx.fillStyle = this.color("#b3c3cc", "#405b6d")
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const id = row * columns + col
      ctx.globalAlpha = 0.11 + sample(id) * 0.07 + (1 + Math.sin(this.time * 0.16 + sample(id + 2304) * tau)) * 0.025
      ctx.fillRect(col / columns * this.width, row / rows * this.height, this.width / columns + 0.5, this.height / rows + 0.5)
    }
  }
}

export interface LabyrinthPlan { columns: number; rows: number; passages: number[][]; walk: number[] }
/** Deterministic depth-first spanning tree and its complete backtracking walk. */
export function labyrinthPlan(columns = 18, rows = 12): LabyrinthPlan {
  const count = columns * rows, passages: number[][] = Array.from({ length: count }, () => [])
  const seen = new Set([0]), stack = [0], walk = [0]
  while (stack.length) {
    const cell = stack.at(-1)!, x = cell % columns, y = Math.floor(cell / columns)
    const candidates = [x > 0 ? cell - 1 : -1, x + 1 < columns ? cell + 1 : -1,
      y > 0 ? cell - columns : -1, y + 1 < rows ? cell + columns : -1].filter(next => next >= 0 && !seen.has(next))
    if (candidates.length) {
      const next = candidates[Math.floor(sample(cell + seen.size * 7) * candidates.length)]
      passages[cell].push(next); passages[next].push(cell); seen.add(next); stack.push(next); walk.push(next)
    } else { stack.pop(); if (stack.length) walk.push(stack.at(-1)!) }
  }
  return { columns, rows, passages, walk }
}

export class Labyrinth extends ArtScene {
  readonly plan = labyrinthPlan()
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#1c302e", "#e0e6df")
    const { columns, rows, passages, walk } = this.plan
    const point = (cell: number): Point => [(cell % columns + 0.5) / columns, (Math.floor(cell / columns) + 0.5) / rows]
    const wall = this.color("#688e84", "#5e7f70")
    for (let cell = 0; cell < passages.length; cell++) {
      const x = cell % columns, y = Math.floor(cell / columns)
      if (x === 0) this.path(ctx, [[0, y / rows], [0, (y + 1) / rows]], wall, 0.4)
      if (y === 0) this.path(ctx, [[x / columns, 0], [(x + 1) / columns, 0]], wall, 0.4)
      if (!passages[cell].includes(cell + 1) || x === columns - 1)
        this.path(ctx, [[(x + 1) / columns, y / rows], [(x + 1) / columns, (y + 1) / rows]], wall, 0.4)
      if (!passages[cell].includes(cell + columns))
        this.path(ctx, [[x / columns, (y + 1) / rows], [(x + 1) / columns, (y + 1) / rows]], wall, 0.4)
    }
    const progress = wrap(this.time * 0.014) * (walk.length - 1), index = Math.floor(progress), u = progress - index
    const a = point(walk[index]), b = point(walk[index + 1]), head: Point = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]
    this.path(ctx, [...walk.slice(Math.max(0, index - 16), index + 1).map(point), head],
      this.color("#d4b980", "#a06d36"), 0.75, false, 2)
    this.disc(ctx, head[0], head[1], 0.007, this.color("#e2cc9c", "#96652f"), 0.8)
  }
}
