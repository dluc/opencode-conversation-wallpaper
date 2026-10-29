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

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.streams = Array.from({ length: Math.ceil(width / cell) }, () => ({
      head: Math.random() * (height / cell + 24),
      speed: 2 + Math.random() * 5,
      length: 8 + Math.floor(Math.random() * 20),
      seed: Math.floor(Math.random() * 1000),
    }))
  }

  draw(ctx: CanvasRenderingContext2D, elapsed: number, speed: number) {
    const delta = clamp(elapsed, 0, 0.1) * clamp(speed, MIN_SPEED, MAX_SPEED)
    this.time += delta
    ctx.clearRect(0, 0, this.width, this.height)
    ctx.font = `15px ui-monospace, monospace`
    ctx.textAlign = "center"
    this.streams.forEach((stream, column) => {
      stream.head += delta * stream.speed
      if ((stream.head - stream.length) * cell > this.height) stream.head = -Math.random() * 12
      for (let tail = stream.length; tail >= 0; tail--) {
        // Move smoothly between cells, rather than looking static for several frames.
        const row = stream.head - tail
        if (row < 0 || row * cell > this.height + cell) continue
        const index = Math.abs(Math.floor(stream.seed + Math.floor(row) * 17 + this.time * 2)) % glyphs.length
        ctx.fillStyle = tail === 0 ? "#d2ffe3" : `rgba(36, 231, 110, ${0.15 + (1 - tail / stream.length) * 0.85})`
        ctx.fillText(glyphs[index], column * cell + cell / 2, row * cell)
      }
    })
  }
}
