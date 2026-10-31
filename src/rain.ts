import { clamp, MAX_SPEED, MIN_SPEED } from "./preferences"

const glyphs = "アイウエオカキクケコサシスセソタチツテトナニヌネノ012345789Z<>:+=*"
const cell = 20
interface Stream { head: number; speed: number; length: number; seed: number }

/** Time-based (not frame-based) rain. No accumulating fill, so a paused frame stays crisp. */
export class Rain {
  private streams: Stream[] = []
  private width = 0
  private height = 0
  private time = 0
  private layoutHeight = 0
  private count = 0

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    if (!width || !height) return
    if (this.layoutHeight && height !== this.layoutHeight) {
      for (const stream of this.streams) stream.head *= height / this.layoutHeight
    }
    this.layoutHeight = height
    this.count = Math.min(512, Math.ceil(width / cell))
    while (this.streams.length < this.count) this.streams.push({
      head: Math.random() * (height / cell + 24), speed: 2 + Math.random() * 5,
      length: 8 + Math.floor(Math.random() * 20), seed: Math.floor(Math.random() * 1000),
    })
  }

  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number) {
    const delta = clamp(elapsed, 0, 0.1) * clamp(speed, MIN_SPEED, MAX_SPEED)
    this.time += delta
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.font = `15px ui-monospace, monospace`
    ctx.textAlign = "center"
    for (let column = 0; column < this.count; column++) {
      const stream = this.streams[column]
      stream.head += delta * stream.speed
      if ((stream.head - stream.length) * cell > this.height) stream.head = -Math.random() * 12
      for (let tail = stream.length; tail >= 0; tail--) {
        // Move smoothly between cells, rather than looking static for several frames.
        const row = stream.head - tail
        if (row < 0 || row * cell > this.height + cell) continue
        const index = Math.abs(Math.floor(stream.seed + Math.floor(row) * 17 + this.time * 2)) % glyphs.length
        ctx.fillStyle = tail === 0 ? "#d2ffe3" : `rgba(36, 231, 110, ${0.15 + (1 - tail / stream.length) * 0.85})`
        ctx.fillText(glyphs[index], (column + 0.5) * this.width / this.count, row * cell)
      }
    }
  }
}
