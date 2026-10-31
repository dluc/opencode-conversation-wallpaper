import { ArtScene, tau, wrap, type Point } from "./scene-art"

/** Actual local wall time, sampled only on active draws. Speed controls the orbit,
 * not the hands: a 10x setting must not turn this into a misleading clock. */
export class Clock extends ArtScene {
  private instant: number | undefined
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    if (this.instant === undefined || delta > 0) this.instant = Date.now()
    const date = new Date(this.instant), seconds = date.getSeconds() + date.getMilliseconds() / 1000
    const minutes = date.getMinutes() + seconds / 60, hours = date.getHours() % 12 + minutes / 60
    this.wash(ctx, "#202c36", "#e2e6e8")
    const x = 0.63, y = 0.5, radius = Math.min(this.width, this.height) * 0.33
    const ink = this.color("#a7bbc4", "#647d8c"), accent = this.color("#c2a87c", "#977246")
    this.ring(ctx, x, y, radius / this.width, radius / this.height, ink, 0.25, 2)
    const point = (angle: number, length: number): Point => [x + Math.sin(angle) * radius * length / this.width,
      y - Math.cos(angle) * radius * length / this.height]
    for (let i = 0; i < 60; i++) this.path(ctx, [point(i / 60 * tau, i % 5 ? 0.96 : 0.9), point(i / 60 * tau, 1)], ink, i % 5 ? 0.2 : 0.5, false, i % 5 ? 1 : 2)
    this.path(ctx, [[x, y], point(hours / 12 * tau, 0.5)], ink, 0.75, false, 4)
    this.path(ctx, [[x, y], point(minutes / 60 * tau, 0.73)], ink, 0.65, false, 2.5)
    this.path(ctx, [point(seconds / 60 * tau, -0.12), point(seconds / 60 * tau, 0.85)], accent, 0.6)
    this.disc(ctx, x, y, 0.009, accent, 0.8)
    const orbit = point(this.time * 0.06, 1.09)
    this.disc(ctx, orbit[0], orbit[1], 0.004, accent, 0.5)
  }
}

/** A decorative accelerated daylight study, not location-aware solar telemetry. */
export class Sundial extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#302d2c", "#eee5d6")
    const ink = this.color("#b7a98b", "#947c57"), x = 0.57, y = 0.61, angle = this.time * 0.025 + 0.7
    this.ring(ctx, x, y, 0.3, 0.16, ink, 0.45, 2)
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * tau
      this.path(ctx, [[x + Math.cos(a) * 0.27, y + Math.sin(a) * 0.144],
        [x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.16]], ink, 0.45)
    }
    const shadow: Point = [x + Math.cos(angle) * 0.26, y + Math.sin(angle) * 0.13]
    this.path(ctx, [[x - 0.012, y], [x + 0.012, y], shadow], this.color("#555165", "#797482"), 0.3, true)
    this.path(ctx, [[x - 0.008, y], [x, y - 0.14], [x + 0.025, y]], ink, 0.7, true)
    this.disc(ctx, 0.5 + Math.cos(angle) * 0.34, 0.3 - Math.sin(angle) * 0.13, 0.035,
      this.color("#d6b276", "#bc995e"), 0.6)
    this.path(ctx, [[0.05, 0.85], [0.3, 0.83], [0.7, 0.86], [0.95, 0.84]], ink, 0.25)
  }
}

export class Calendar extends ArtScene {
  private instant: number | undefined
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    if (this.instant === undefined || delta > 0) this.instant = Date.now()
    const date = new Date(this.instant), year = date.getFullYear(), month = date.getMonth()
    const first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate()
    this.wash(ctx, "#293032", "#e4e7df")
    const ink = this.color("#b7c4b8", "#627969"), accent = this.color("#cbb58b", "#9b7950")
    const left = 0.22, top = 0.3, cellWidth = 0.56 / 7, cellHeight = 0.08
    ctx.textAlign = "center"; ctx.font = `${Math.max(6, Math.min(18, this.width / 45, this.height / 25))}px ui-monospace, monospace`
    ctx.fillStyle = ink; ctx.globalAlpha = 0.55
    ctx.fillText(`${year} · ${String(month + 1).padStart(2, "0")}`, this.width * 0.5, this.height * 0.2)
    for (let i = 0; i < 7; i++) ctx.fillText(["S", "M", "T", "W", "T", "F", "S"][i],
      this.width * (left + (i + 0.5) * cellWidth), this.height * (top - 0.035))
    for (let day = 1; day <= days; day++) {
      const slot = first + day - 1, x = left + (slot % 7 + 0.5) * cellWidth, y = top + (Math.floor(slot / 7) + 0.5) * cellHeight
      if (day === date.getDate()) this.ring(ctx, x, y - 0.006, cellWidth * 0.34, cellHeight * 0.36, accent,
        0.55 + Math.sin(this.time * 0.1) * 0.05, 2)
      ctx.fillStyle = day === date.getDate() ? accent : ink; ctx.globalAlpha = 0.6
      ctx.fillText(String(day), this.width * x, this.height * y)
    }
    const u = wrap(this.time * 0.012)
    this.path(ctx, [[left, 0.85], [left + 0.56, 0.85]], ink, 0.25)
    this.disc(ctx, left + u * 0.56, 0.85, 0.004, accent, 0.6)
  }
}
