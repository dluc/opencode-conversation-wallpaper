import { AmbientScene } from "./scene"

export interface ElasticBlock {
  x: number
  y: number
  width: number
  height: number
  material: number
  opacity: number
}

const gap = 0.012

/** A bounded partition, not demand telemetry: neighbours share moving boundaries. */
export function elasticBlocks(time: number): ElasticBlock[] {
  const rows = [-1, 0.25 + Math.sin(time * 0.08) * 0.045, 0.73 + Math.sin(time * 0.06) * 0.04, 2]
  const split = (1 - Math.cos(time * Math.PI / 30)) / 2
  const blocks: ElasticBlock[] = []
  for (let row = 0; row < 3; row++) {
    const offset = Math.sin(time * 0.055 + row * 2) * 0.055
    const columns = [-1, 0.3 + Math.sin(time * 0.09) * 0.04 + offset,
      0.72 + Math.sin(time * 0.07) * 0.05 + offset, 2]
    for (let column = 0; column < 3; column++) {
      const block = { x: columns[column] + gap / 2, y: rows[row] + gap / 2,
        width: columns[column + 1] - columns[column] - gap, height: rows[row + 1] - rows[row] - gap,
        material: (row * 2 + column) % 3, opacity: 1 }
      if (row === 1 && column === 1) {
        block.material = 3
        // A seam opens smoothly as a neutral neighbour takes part of the amber
        // region. At zero it rejoins exactly, with no sudden topology switch.
        const width = block.width * split * 0.38, seam = gap * split
        if (width > 0) blocks.push({ ...block, x: block.x + block.width - width, width, material: 0, opacity: split })
        block.width -= width + seam
      }
      blocks.push(block)
    }
  }
  return blocks
}

const palettes = {
  dark: [
    ["#2b4353", "#203442", "#182c39"], ["#3c5360", "#304653", "#233b49"],
    ["#30474d", "#253b43", "#1c3038"], ["#b08043", "#936632", "#72502d"],
  ],
  light: [
    ["#d9e0e0", "#c2ced1", "#a5b6bc"], ["#ebe9e0", "#d8d9cf", "#b8bfb4"],
    ["#cad8d3", "#b9cbc6", "#9baea9"], ["#dfc393", "#c9aa78", "#ae946e"],
  ],
} as const

type Point = readonly [number, number]

/** Architectural masses, not ribbons, server diagrams, or an activity dashboard. */
export class Elastic extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const palette = palettes[this.appearance]
    const project = (x: number, y: number, lift = 0): Point => [
      this.width * (0.5 + 0.94 * (x - 0.5) - 0.52 * (y - 0.5)),
      this.height * (0.5 + 0.2 * (x - 0.5) + 0.7 * (y - 0.5) - lift),
    ]
    const polygon = (points: readonly Point[]) => {
      ctx.beginPath(); ctx.moveTo(...points[0])
      for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i])
      ctx.closePath(); ctx.fill()
    }
    const blocks = elasticBlocks(this.time).sort((a, b) =>
      (a.y + a.height) * 0.7 + (a.x + a.width) * 0.2 - (b.y + b.height) * 0.7 - (b.x + b.width) * 0.2)
    for (const block of blocks) {
      const { x, y, width, height, material } = block
      const lift = material === 3 ? 0.012 : 0.006
      const top = [project(x, y, lift), project(x + width, y, lift),
        project(x + width, y + height, lift), project(x, y + height, lift)]
      const bottom = [project(x + width, y), project(x + width, y + height), project(x, y + height)]
      const colors = palette[material]
      ctx.globalAlpha = 0.78 * block.opacity
      ctx.fillStyle = colors[2]
      polygon([top[1], bottom[0], bottom[1], top[2]])
      polygon([top[2], bottom[1], bottom[2], top[3]])
      const gradient = ctx.createLinearGradient(...top[0], ...top[2])
      gradient.addColorStop(0, colors[0]); gradient.addColorStop(1, colors[1])
      ctx.fillStyle = gradient
      polygon(top)
    }
  }
}
