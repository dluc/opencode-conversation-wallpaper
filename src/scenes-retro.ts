import { AmbientScene } from "./scene"
import { clamp } from "./preferences"

const cloudRows = ["00001111000000", "00111111100000", "01111111111000", "11111111111110", "11111111111111", "00111111111100"]

export class PixelClouds extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 4; i++) {
      const pixel = clamp(Math.min(this.width / 80, this.height / 26) * (0.7 + layer * 0.3), 2, 12)
      const cloudWidth = cloudRows[0].length * pixel, travel = this.width + cloudWidth * 2
      const x = Math.floor(((i / 4 * travel + layer * travel * 0.13 + this.time * (7 + layer * 9)) % travel) - cloudWidth)
      const y = Math.floor(this.height * (0.1 + ((i * 0.19 + layer * 0.23) % 0.65)))
      ctx.globalAlpha = 0.38 + layer * 0.2
      for (let row = 0; row < cloudRows.length; row++) {
        ctx.fillStyle = light ? (row < 4 ? "#7899b8" : "#4e7598") : (row < 4 ? "#d2e0eb" : "#839db5")
        const start = cloudRows[row].indexOf("1"), end = cloudRows[row].lastIndexOf("1") + 1
        ctx.fillRect(x + start * pixel, y + row * pixel, (end - start) * pixel, pixel)
      }
    }
  }
}

export class TrainWindow extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    for (let layer = 0; layer < 3; layer++) {
      ctx.globalAlpha = 0.3 + layer * 0.13
      ctx.fillStyle = light ? ["#8ca8b0", "#6e947f", "#436f5a"][layer] : ["#668a9e", "#527b6b", "#6c9e76"][layer]
      const hill = (x: number) => this.height * (0.4 + layer * 0.18
        + Math.sin(x / this.width * (4 + layer) + this.time * (0.035 + layer * 0.045)) * (0.1 - layer * 0.018))
      ctx.beginPath(); ctx.moveTo(0, this.height); ctx.lineTo(0, hill(0))
      for (let step = 1; step <= 60; step++) { const x = step / 60 * this.width; ctx.lineTo(x, hill(x)) }
      ctx.lineTo(this.width, this.height); ctx.closePath(); ctx.fill()
    }
    for (let layer = 0; layer < 2; layer++) for (let i = 0; i < 10; i++) {
      const size = Math.max(12, this.height * (0.09 + layer * 0.08))
      const span = this.width + size * 4
      const x = ((i / 10 * span - this.time * (14 + layer * 32)) % span + span) % span - size * 2
      const y = this.height * (0.78 + layer * 0.16)
      ctx.globalAlpha = 0.55 + layer * 0.15; ctx.fillStyle = light ? "#376b50" : "#86b78d"
      ctx.fillRect(x - size * 0.035, y - size * 0.35, size * 0.07, size * 0.35)
      ctx.beginPath(); ctx.moveTo(x, y - size); ctx.lineTo(x - size * 0.3, y - size * 0.25)
      ctx.lineTo(x + size * 0.3, y - size * 0.25); ctx.closePath(); ctx.fill()
    }
  }
}

export class PixelAquarium extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    const colors = light ? ["#a95831", "#287e92", "#78549b", "#567f2f"] : ["#e6a478", "#7ecbd9", "#bd9bd9", "#abc982"]
    for (let i = 0; i < 12; i++) {
      const direction = i % 2 ? -1 : 1, size = clamp(this.height * (0.025 + i % 3 * 0.008), 4, 17)
      const span = this.width + size * 8
      const x = ((i * 0.177 * span + direction * this.time * (11 + i % 5 * 4)) % span + span) % span - size * 4
      const y = this.height * (0.15 + i * 0.071 % 0.68) + Math.sin(this.time * 0.4 + i) * this.height * 0.025
      ctx.globalAlpha = 0.78; ctx.fillStyle = colors[i % 4]
      const pixel = Math.max(1, Math.round(size / 3)), px = Math.floor(x), py = Math.floor(y)
      for (let row = 0; row < 5; row++) {
        const inset = Math.abs(row - 2)
        ctx.fillRect(px + (inset - 4) * pixel, py + (row - 2) * pixel, (8 - inset * 2) * pixel, pixel)
      }
      const tail = px - direction * 4 * pixel, swing = Math.round(Math.sin(this.time * 3 + i)) * pixel
      ctx.fillRect(tail - (direction > 0 ? 2 * pixel : 0), py - 2 * pixel + swing, 2 * pixel, 5 * pixel)
      ctx.fillStyle = light ? "#263b42" : "#e8f4ec"
      ctx.fillRect(px + direction * 2 * pixel, py - pixel, pixel, pixel)
    }
    ctx.strokeStyle = light ? "#528f9e" : "#8ed0d7"; ctx.lineWidth = 0.8
    for (let i = 0; i < 16; i++) {
      const y = this.height * (1.1 - ((i * 0.137 + this.time * (0.025 + i % 4 * 0.008)) % 1.2))
      const x = this.width * (0.08 + i * 0.193 % 0.85) + Math.sin(y / 35 + i) * 5
      ctx.globalAlpha = 0.5
      ctx.beginPath(); ctx.arc(x, y, 1.4 + i % 3, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.strokeStyle = light ? "#44805d" : "#78ae88"; ctx.lineWidth = 2
    for (let i = 0; i < 9; i++) {
      const x = (i + 0.5) / 9 * this.width, length = this.height * (0.1 + i % 3 * 0.04)
      ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.moveTo(x, this.height)
      for (let step = 1; step <= 12; step++) ctx.lineTo(x + Math.sin(this.time * 0.6 + i + step * 0.15) * step, this.height - length * step / 12)
      ctx.stroke()
    }
  }
}

export class RipplePond extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.appearance === "light" ? "#326f91" : "#91c7d7"; ctx.lineWidth = 1.4
    for (let i = 0; i < 9; i++) {
      const period = 5 + i % 4 * 0.7, clock = this.time + i * 0.61, cycle = Math.floor(clock / period)
      const age = clock % period, progress = age / period
      const hash = (seed: number) => { const value = Math.sin(seed * 127.1) * 43758.5453; return value - Math.floor(value) }
      const x = (0.08 + hash(i * 7 + cycle * 3 + 1) * 0.84) * this.width
      const y = (0.15 + hash(i * 13 + cycle * 7 + 4) * 0.7) * this.height
      const radius = 5 + progress * Math.min(this.width, this.height) * 0.55
      ctx.globalAlpha = (1 - progress) * 0.8
      ctx.beginPath(); ctx.ellipse(x, y, radius, radius * 0.45, 0, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha *= 0.45
      ctx.beginPath(); ctx.ellipse(x, y, radius * 0.72, radius * 0.324, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }
}
