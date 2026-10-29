import { AmbientScene } from "./scene"
import { clamp } from "./preferences"

export class MeteorShower extends AmbientScene {
  private meteors = Array.from({ length: 14 }, (_, i) => ({
    x: 0.1 + (i * 0.237 % 1.15), y: (i * 0.173 % 0.55) - 0.25,
    phase: i * 0.41, period: 3.8 + (i % 5) * 0.73, duration: 1.6 + (i % 3) * 0.2,
  }))
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    for (const meteor of this.meteors) {
      const age = (this.time + meteor.phase + 0.4) % meteor.period
      if (age > meteor.duration) continue
      const progress = age / meteor.duration
      const distance = Math.max(this.width, this.height) * 0.85
      const x = meteor.x * this.width - distance * progress
      const y = meteor.y * this.height + distance * progress * 0.7
      const trail = Math.min(180, this.width * 0.22)
      const color = light ? "35, 78, 123" : "164, 213, 255"
      const gradient = ctx.createLinearGradient(x + trail, y - trail * 0.7, x, y)
      gradient.addColorStop(0, `rgba(${color}, 0)`)
      gradient.addColorStop(1, `rgba(${color}, 1)`)
      ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.85
      ctx.strokeStyle = gradient; ctx.lineWidth = light ? 2 : 1.6
      ctx.beginPath(); ctx.moveTo(x + trail, y - trail * 0.7); ctx.lineTo(x, y); ctx.stroke()
      ctx.fillStyle = light ? "#254d75" : "#e4f4ff"
      ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill()
    }
  }
}

export class NightSky extends AmbientScene {
  private stars: Array<{ radius: number; angle: number; size: number }> = []
  protected layout() {
    const count = Math.round(clamp(this.width * this.height / 3500, 100, 260))
    const radius = Math.hypot(this.width * 0.6, this.height)
    this.stars = Array.from({ length: count }, (_, i) => ({
      radius: Math.sqrt((i + 0.5) / count) * radius,
      angle: i * 2.399963, size: 0.65 + (i % 5) * 0.25,
    }))
  }
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light", cx = this.width * 0.5, cy = this.height * 0.13
    for (const star of this.stars) {
      // Apparent rotation around the celestial pole, not travel through space.
      const angle = star.angle + this.time * 0.045
      const x = cx + Math.cos(angle) * star.radius, y = cy + Math.sin(angle) * star.radius
      if (x < -5 || x > this.width + 5 || y < -5 || y > this.height + 5) continue
      ctx.globalAlpha = 0.65
      ctx.strokeStyle = light ? "#527299" : "#92abc9"; ctx.lineWidth = 0.7
      ctx.beginPath(); ctx.arc(cx, cy, star.radius, angle - 0.012, angle); ctx.stroke()
      ctx.fillStyle = light ? "#274b75" : "#ddeaff"
      ctx.beginPath(); ctx.arc(x, y, star.size, 0, Math.PI * 2); ctx.fill()
    }
  }
}

const colors = {
  dark: ["#65d8d0", "#ef939b", "#b3a0eb", "#eccb7c", "#8abbee", "#a5d19c"],
  light: ["#147d77", "#b7445a", "#7652ac", "#a77512", "#376da7", "#488345"],
}
const reflect = (value: number) => { const p = ((value % 2) + 2) % 2; return p <= 1 ? p : 2 - p }

export class BouncingBalls extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < 9; i++) {
      const radius = clamp(Math.min(this.width, this.height) * (0.025 + i % 4 * 0.008), 7, 30)
      const x = radius + reflect(i * 0.173 + this.time * (0.055 + i % 3 * 0.017)) * Math.max(0, this.width - radius * 2)
      const y = radius + reflect(i * 0.271 + this.time * (0.045 + i % 4 * 0.012)) * Math.max(0, this.height - radius * 2)
      const color = colors[this.appearance][i % 6]
      ctx.globalAlpha = 0.7; ctx.fillStyle = color
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
      ctx.globalAlpha = 0.18; ctx.fillStyle = "#ffffff"
      ctx.beginPath(); ctx.arc(x - radius * 0.28, y - radius * 0.3, radius * 0.3, 0, Math.PI * 2); ctx.fill()
    }
  }
}

export class DiscoLights extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const hues = this.appearance === "light" ? ["169, 43, 107", "33, 113, 155", "103, 63, 168", "183, 118, 24"]
      : ["235, 78, 163", "66, 196, 226", "147, 103, 239", "243, 181, 73"]
    // Low-frequency sweeps and constant-energy fades: deliberately no flashing/strobe.
    for (let i = 0; i < 6; i++) {
      const x = this.width * (0.5 + Math.sin(this.time * 0.16 + i * 1.7) * 0.47)
      const y = this.height * (0.5 + Math.cos(this.time * 0.12 + i * 2.1) * 0.4)
      const radius = Math.max(this.width, this.height) * 0.28
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
      gradient.addColorStop(0, `rgba(${hues[i % 4]}, 0.5)`)
      gradient.addColorStop(0.45, `rgba(${hues[i % 4]}, 0.23)`)
      gradient.addColorStop(1, `rgba(${hues[i % 4]}, 0)`)
      ctx.fillStyle = gradient; ctx.globalAlpha = 0.65 + Math.sin(this.time * 0.2 + i) * 0.08
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
      const beam = ctx.createLinearGradient(x - radius * 0.4, y, x + radius * 0.4, y)
      beam.addColorStop(0, `rgba(${hues[i % 4]}, 0)`)
      beam.addColorStop(0.5, `rgba(${hues[i % 4]}, 0.16)`)
      beam.addColorStop(1, `rgba(${hues[i % 4]}, 0)`)
      ctx.fillStyle = beam
      ctx.beginPath(); ctx.moveTo(this.width * (i / 5), -this.height * 0.1)
      ctx.lineTo(x - radius * 0.4, y); ctx.lineTo(x + radius * 0.4, y); ctx.closePath(); ctx.fill()
    }
  }
}
