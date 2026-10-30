import { AmbientScene } from "./scene"
import { clamp } from "./preferences"

export class Glass extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    ctx.fillStyle = light ? "#9baeb8" : "#6e899b"; ctx.globalAlpha = 0.08; ctx.fillRect(0, 0, this.width, this.height)
    for (let i = 0; i < 48; i++) {
      const speed = 0.018 + i % 5 * 0.01, clock = i * 0.173 + this.time * speed
      const y = ((clock % 1.4) - 0.2) * this.height
      const x = (0.03 + i * 0.193 % 0.94) * this.width + Math.sin(clock * 5 + i) * 3
      const radius = 2.5 + i % 4
      ctx.strokeStyle = light ? "#456d87" : "#afccd9"; ctx.lineWidth = 0.9
      if (i % 3) {
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.moveTo(x, y - radius * 2)
        ctx.lineTo(x, y - radius * (7 + i % 4 * 3)); ctx.stroke()
      }
      ctx.globalAlpha = 0.65; ctx.beginPath(); ctx.ellipse(x, y, radius * 0.65, radius * 1.3, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.fillStyle = light ? "#789cae" : "#bfdce7"; ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.arc(x - radius * 0.18, y - radius * 0.4, radius * 0.22, 0, Math.PI * 2); ctx.fill()
    }
  }
}

export class Ocean extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    for (let band = 0; band < 6; band++) {
      const wave = (x: number) => this.height * (0.17 + band * 0.14 + Math.sin(x / this.width * (4 + band * 0.4) - this.time * (0.15 + band * 0.03) + band) * (0.018 + band * 0.005))
      ctx.fillStyle = light ? "#528da4" : "#477e99"; ctx.globalAlpha = 0.16 + band * 0.025
      ctx.beginPath(); ctx.moveTo(0, this.height); ctx.lineTo(0, wave(0))
      for (let step = 1; step <= 70; step++) { const x = step / 70 * this.width; ctx.lineTo(x, wave(x)) }
      ctx.lineTo(this.width, this.height); ctx.closePath(); ctx.fill()
      ctx.strokeStyle = light ? "#296985" : "#9acdd9"; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.1
      ctx.beginPath(); ctx.moveTo(0, wave(0))
      for (let step = 1; step <= 70; step++) { const x = step / 70 * this.width; ctx.lineTo(x, wave(x)) }
      ctx.stroke()
    }
  }
}

export class Coast extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light", step = Math.max(8, Math.round(this.width / 70))
    ctx.globalAlpha = 0.4; ctx.fillStyle = light ? "#568fa5" : "#477e9e"
    ctx.fillRect(0, this.height * 0.18, this.width, this.height * 0.82)
    for (let x = 0; x < this.width; x += step) {
      const shore = Math.floor(this.height * (0.73 + Math.sin(x / this.width * 5 + this.time * 0.12) * 0.035))
      ctx.fillStyle = light ? "#b49860" : "#cbb17c"; ctx.globalAlpha = 0.65
      ctx.fillRect(x, shore, step, this.height - shore)
      ctx.fillStyle = light ? "#ece0bf" : "#eadbc0"; ctx.globalAlpha = 0.5
      ctx.fillRect(x, shore - 3, step, 3)
    }
    for (let band = 0; band < 4; band++) {
      const progress = (band / 4 + this.time * 0.08) % 1
      ctx.fillStyle = light ? "#286e8e" : "#b7dce0"; ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.75
      for (let x = 0; x < this.width; x += step) {
        const y = Math.floor(this.height * (0.24 + progress * 0.45) + Math.sin(x / this.width * 5 + band) * 5)
        ctx.fillRect(x, y, step, 2 + band % 2)
      }
    }
  }
}

export class Embers extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    for (let i = 0; i < 65; i++) {
      const age = (i * 0.137 + this.time * (0.04 + i % 5 * 0.014)) % 1.3
      const y = (1.1 - age) * this.height
      const x = (0.03 + i * 0.193 % 0.94 + Math.sin(this.time * 0.35 + i) * 0.025) * this.width
      ctx.globalAlpha = Math.max(0, Math.sin(Math.min(1, age / 1.3) * Math.PI)) * 0.85
      ctx.strokeStyle = light ? "#a55c19" : "#d89452"; ctx.lineWidth = 0.8
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.sin(i) * 3, y + 7 + i % 4 * 4); ctx.stroke()
      ctx.fillStyle = light ? "#9a4f0e" : (i % 3 ? "#e4a95c" : "#f6d29a")
      ctx.beginPath(); ctx.arc(x, y, 0.9 + i % 3 * 0.55, 0, Math.PI * 2); ctx.fill()
    }
  }
}

export class Leaves extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const colors = this.appearance === "light" ? ["#a46b1c", "#9a4b31", "#637b35", "#a66b42"] : ["#d7ad62", "#d38b65", "#9fb46c", "#d4a47b"]
    for (let i = 0; i < 28; i++) {
      const y = (((i * 0.137 + this.time * (0.025 + i % 4 * 0.008)) % 1.3) - 0.15) * this.height
      const x = (0.04 + i * 0.193 % 0.92 + Math.sin(this.time * 0.3 + i) * 0.06) * this.width
      const angle = i * 0.8 + this.time * (0.18 + i % 3 * 0.06)
      const size = clamp(this.height * (0.018 + i % 3 * 0.005), 4, 15)
      ctx.fillStyle = colors[i % 4]; ctx.globalAlpha = 0.72
      ctx.beginPath(); ctx.ellipse(x, y, size, size * 0.4, angle, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = this.appearance === "light" ? "#614b29" : "#e9d4a2"; ctx.lineWidth = 0.7; ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.moveTo(x - Math.cos(angle) * size, y - Math.sin(angle) * size)
      ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size); ctx.stroke()
    }
  }
}
