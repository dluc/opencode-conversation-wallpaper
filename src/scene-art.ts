import { AmbientScene } from "./scene"

export type Point = readonly [number, number]
export const tau = Math.PI * 2
export const wrap = (value: number) => (value % 1 + 1) % 1
/** Fixed procedural samples: layout changes never reseed an illustration. */
export const sample = (index: number) => wrap(Math.sin(index * 127.1 + 311.7) * 43758.5453)

/** Small drawing vocabulary; all artwork and motion live in the scene subclasses. */
export abstract class ArtScene extends AmbientScene {
  protected color(dark: string, light: string) { return this.appearance === "light" ? light : dark }
  protected wash(ctx: CanvasRenderingContext2D, dark: string, light: string) {
    ctx.globalAlpha = 0.2; ctx.fillStyle = this.color(dark, light); ctx.fillRect(0, 0, this.width, this.height)
  }
  protected path(ctx: CanvasRenderingContext2D, points: readonly Point[], color: string, alpha = 0.6, fill = false, line = 1) {
    if (!points.length) return
    ctx.globalAlpha = alpha; ctx.fillStyle = ctx.strokeStyle = color; ctx.lineWidth = line
    ctx.beginPath(); ctx.moveTo(points[0][0] * this.width, points[0][1] * this.height)
    for (const [x, y] of points.slice(1)) ctx.lineTo(x * this.width, y * this.height)
    if (fill) { ctx.closePath(); ctx.fill() } else ctx.stroke()
  }
  protected disc(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha = 0.6) {
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath()
    ctx.arc(x * this.width, y * this.height, radius * Math.min(this.width, this.height), 0, tau); ctx.fill()
  }
  protected ring(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number,
    color: string, alpha = 0.5, line = 1, start = 0, end = tau) {
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = line; ctx.beginPath()
    ctx.ellipse(x * this.width, y * this.height, rx * this.width, ry * this.height, 0, start, end); ctx.stroke()
  }
  protected stars(ctx: CanvasRenderingContext2D, count = 64, drift = 0) {
    const color = this.color("#b5d3de", "#375c76")
    for (let i = 0; i < count; i++) this.disc(ctx, wrap(sample(i) + this.time * drift), sample(i + 80),
      0.001 + sample(i + 170) * 0.002, color, 0.25 + sample(i + 240) * 0.3)
  }
}
