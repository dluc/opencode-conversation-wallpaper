import { AmbientScene } from "./scene"
import { clamp } from "./preferences"

export class Constellations extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const count = Math.round(clamp(this.width * this.height / 7000, 28, 70))
    const points = Array.from({ length: count }, (_, i) => ({
      x: (0.04 + i * 0.618034 % 0.92 + Math.sin(this.time * 0.09 + i) * 0.025) * this.width,
      y: (0.07 + i * 0.414214 % 0.86 + Math.cos(this.time * 0.07 + i * 1.7) * 0.035) * this.height,
    }))
    ctx.strokeStyle = this.appearance === "light" ? "#416a91" : "#9bbbd8"; ctx.lineWidth = 0.8
    const reach = Math.min(this.width, this.height) * 0.3
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const a = points[i], b = points[j], distance = Math.hypot(a.x - b.x, a.y - b.y)
      if (distance > reach) continue
      ctx.globalAlpha = (1 - distance / reach) * 0.45
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
    }
    ctx.fillStyle = this.appearance === "light" ? "#315776" : "#c8ddeb"; ctx.globalAlpha = 0.8
    for (const point of points) { ctx.beginPath(); ctx.arc(point.x, point.y, 1.7, 0, Math.PI * 2); ctx.fill() }
  }
}

export class Orbits extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light", cx = this.width * 0.5, cy = this.height * 0.5
    const colors = light ? ["#397b86", "#a4652d", "#7558a4", "#4d8156", "#a25067"] : ["#87cbd2", "#e2af77", "#b6a1e2", "#9ac9a0", "#dd9bb1"]
    for (let i = 0; i < 5; i++) {
      const rx = this.width * (0.1 + i * 0.075), ry = this.height * (0.1 + i * 0.075)
      ctx.strokeStyle = light ? "#758b9a" : "#8396ab"; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.35
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke()
      const angle = i * 1.7 + this.time * (0.13 + (4 - i) * 0.04)
      ctx.globalAlpha = 0.85; ctx.fillStyle = colors[i]
      ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, 2.5 + i * 0.8, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = light ? "#a27421" : "#e5c779"; ctx.globalAlpha = 0.9
    ctx.beginPath(); ctx.arc(cx, cy, clamp(Math.min(this.width, this.height) * 0.025, 3, 15), 0, Math.PI * 2); ctx.fill()
  }
}

export class Boats extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    for (let i = 0; i < 7; i++) {
      const size = clamp(this.height * (0.045 + i % 3 * 0.008), 10, 32), span = this.width + size * 4
      const x = (i / 7 * span + this.time * (7 + i % 3 * 3)) % span - size * 2
      const y = this.height * (0.15 + i * 0.113) + Math.sin(this.time * 0.45 + i) * 3
      ctx.globalAlpha = 0.4; ctx.strokeStyle = light ? "#4f8198" : "#85b9ca"; ctx.lineWidth = 0.9
      ctx.beginPath(); ctx.ellipse(x, y + size * 0.4, size * 1.7, size * 0.25, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = 0.85; ctx.fillStyle = light ? "#6f91a7" : "#b5cedb"
      ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y)
      ctx.lineTo(x + size * 0.5, y + size * 0.4); ctx.lineTo(x - size * 0.5, y + size * 0.4); ctx.closePath(); ctx.fill()
      ctx.fillStyle = light ? "#476e86" : "#e0e9e9"
      ctx.beginPath(); ctx.moveTo(x - size * 0.6, y); ctx.lineTo(x + size * 0.1, y - size * 0.85); ctx.lineTo(x + size * 0.1, y); ctx.closePath(); ctx.fill()
      ctx.fillStyle = light ? "#9b7955" : "#d7c3a3"
      ctx.beginPath(); ctx.moveTo(x + size * 0.1, y - size * 0.85); ctx.lineTo(x + size * 0.8, y); ctx.lineTo(x + size * 0.1, y); ctx.closePath(); ctx.fill()
    }
  }
}

export class Contours extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.appearance === "light" ? "#55755d" : "#94b59a"; ctx.lineWidth = 0.8
    for (let island = 0; island < 3; island++) for (let level = 0; level < 9; level++) {
      const cx = this.width * (0.16 + island * 0.34), cy = this.height * (0.3 + island % 2 * 0.4)
      const scale = 0.28 + level * 0.13
      ctx.globalAlpha = 0.3 + level * 0.025
      ctx.beginPath()
      for (let step = 0; step <= 64; step++) {
        const angle = step / 64 * Math.PI * 2
        const wave = 1 + Math.sin(angle * 3 + this.time * 0.13 + island) * 0.16 + Math.cos(angle * 5 - this.time * 0.09 + level * 0.08) * 0.06
        const x = cx + Math.cos(angle) * this.width * 0.15 * scale * wave
        const y = cy + Math.sin(angle) * this.height * 0.34 * scale * wave
        if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.closePath(); ctx.stroke()
    }
  }
}
