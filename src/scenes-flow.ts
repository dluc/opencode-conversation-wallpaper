import { AmbientScene } from "./scene"
import { clamp } from "./preferences"
import { makePedestrians, pedestrianPosition, type Pedestrian } from "./pedestrians"

/** Fixed spatial pulse, briefly activated once per beat. Nothing translates horizontally. */
export function cardiogramAt(position: number, time: number) {
  const phase = ((time + 0.22) % 1.6 + 1.6) % 1.6
  const envelope = phase < 0.5 ? Math.sin(phase / 0.5 * Math.PI) ** 2 : 0
  if (!envelope) return 0
  const peak = (center: number, width: number) => Math.exp(-(((position - center) / width) ** 2))
  const shape = 0.1 * peak(0.43, 0.018) - 0.18 * peak(0.482, 0.006) + peak(0.5, 0.006)
    - 0.35 * peak(0.52, 0.009) + 0.23 * peak(0.59, 0.03)
  return shape * envelope
}

export class Cardiogram extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.appearance === "light" ? "#16745e" : "#78d8b0"; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.85
    const amplitude = Math.min(90, this.height * 0.28)
    ctx.beginPath()
    for (let x = 0; x <= this.width; x += 2) {
      const y = this.height * 0.54 - cardiogramAt(x / this.width, this.time) * amplitude
      if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export class FlowingRiver extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    const center = (y: number) => this.width * (0.5 + Math.sin(y / this.height * 4 + 0.5) * 0.16)
    const half = this.width * 0.24
    ctx.fillStyle = light ? "#6babb6" : "#396e82"; ctx.globalAlpha = 0.35
    ctx.beginPath(); ctx.moveTo(center(0) - half, 0)
    for (let i = 1; i <= 50; i++) { const y = i / 50 * this.height; ctx.lineTo(center(y) - half, y) }
    for (let i = 50; i >= 0; i--) { const y = i / 50 * this.height; ctx.lineTo(center(y) + half, y) }
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = light ? "#557d64" : "#77a68d"; ctx.lineWidth = 2; ctx.globalAlpha = 0.5
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(center(0) + side * half, 0)
      for (let i = 1; i <= 50; i++) { const y = i / 50 * this.height; ctx.lineTo(center(y) + side * half, y) }
      ctx.stroke()
    }
    for (let i = 0; i < 48; i++) {
      const progress = ((i * 0.137 + this.time * (0.045 + i % 4 * 0.012)) % 1.3) - 0.15
      const y = progress * this.height, lane = (i * 0.317 % 1 - 0.5) * half * 1.7
      const length = Math.max(12, this.height * (0.04 + i % 3 * 0.015))
      ctx.strokeStyle = light ? "#2e718c" : "#a4dbe3"; ctx.lineWidth = 0.9 + i % 3 * 0.3; ctx.globalAlpha = 0.6
      ctx.beginPath(); ctx.moveTo(center(y) + lane, y)
      for (let step = 1; step <= 8; step++) { const next = y + length * step / 8; ctx.lineTo(center(next) + lane, next) }
      ctx.stroke()
    }
  }
}

export class PedestrianPlaza extends AmbientScene {
  private people: Pedestrian[] = []
  protected layout() { this.people = makePedestrians(this.width * this.height / 900) }
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    const coats = light ? ["#386c8b", "#9c503a", "#526c45", "#72548b", "#9b791d", "#3e7d77"]
      : ["#8bb9ce", "#d89b85", "#a1bb8f", "#b3a0cf", "#d6be76", "#87c4b8"]
    ctx.strokeStyle = light ? "#87988e" : "#647a6d"; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.18
    for (let i = 1; i < 6; i++) {
      ctx.beginPath(); ctx.moveTo(i / 6 * this.width, 0); ctx.lineTo(i / 6 * this.width, this.height); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i / 6 * this.height); ctx.lineTo(this.width, i / 6 * this.height); ctx.stroke()
    }
    const positions = this.people.map(person => ({ person, ...pedestrianPosition(person, this.time, this.width, this.height) })).sort((a, b) => a.y - b.y)
    const scale = clamp(Math.min(this.width, this.height) / 300, 0.95, 1.7)
    for (const { person, x, y, angle } of positions) {
      if (x < -15 || y < -15 || x > this.width + 15 || y > this.height + 15) continue
      const size = person.size * scale, dx = Math.cos(angle), dy = Math.sin(angle), swing = Math.sin(this.time * 4 + person.phase) * 1.3 * size
      ctx.globalAlpha = 0.75; ctx.lineCap = "round"; ctx.strokeStyle = coats[person.color]; ctx.lineWidth = 1.3 * size
      ctx.beginPath()
      ctx.moveTo(x, y); ctx.lineTo(x - dx * 3 * size - dy * swing, y - dy * 3 * size + dx * swing)
      ctx.moveTo(x, y); ctx.lineTo(x - dx * 3 * size + dy * swing, y - dy * 3 * size - dx * swing)
      ctx.moveTo(x - dy * 1.9 * size, y + dx * 1.9 * size); ctx.lineTo(x + dy * 1.9 * size, y - dx * 1.9 * size); ctx.stroke()
      ctx.fillStyle = coats[person.color]
      ctx.beginPath(); ctx.ellipse(x, y, 2.2 * size, 1.6 * size, angle, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = light ? "#805d48" : "#dbbba0"
      ctx.beginPath(); ctx.arc(x + dx * 2 * size, y + dy * 2 * size, 1.45 * size, 0, Math.PI * 2); ctx.fill()
    }
  }
}
