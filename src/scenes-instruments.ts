import { AmbientScene } from "./scene"

export function tremorAt(position: number, time: number) {
  const phase = ((time + 2.8) % 7) / 7
  const burst = 0.05 + Math.exp(-(((phase - 0.4) / 0.13) ** 2)) * 0.75
  return burst * (Math.sin(position * 91 + time * 12) + Math.sin(position * 173 - time * 19) * 0.45 + Math.sin(position * 337 + time * 27) * 0.18) / 1.63
}

export function polygraphAt(position: number, time: number, channel: number) {
  const pressure = 0.25 + (Math.sin(time * 0.45 + channel * 1.9) + 1) * 0.3
  return pressure * (Math.sin(position * (24 + channel * 9) + time * (0.8 + channel * 0.2)) * 0.6
    + Math.sin(position * (71 + channel * 7) - time * 2.3 + channel) * 0.25
    + Math.sin(position * 137 + time * 3.1) * 0.1)
}

/** Procedural instrument aesthetics, not sensor readings or assessments of people. */
export class Tremor extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = this.appearance === "light" ? "#8e5c31" : "#d8ae7d"; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.2
    const amplitude = Math.min(95, this.height * 0.3)
    ctx.beginPath()
    for (let x = 0; x <= this.width; x += 2) {
      const y = this.height * 0.5 + tremorAt(x / this.width, this.time) * amplitude
      if (!x) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export class Polygraph extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const colors = this.appearance === "light" ? ["#247963", "#466b9d", "#9b5b59"] : ["#7bceb0", "#95b8e3", "#dcaaa5"]
    const amplitude = this.height * 0.09
    for (let channel = 0; channel < 3; channel++) {
      ctx.strokeStyle = colors[channel]; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.2
      ctx.beginPath()
      for (let step = 0; step <= 220; step++) {
        const position = step / 220, x = (0.04 + position * 0.92) * this.width
        const y = this.height * (0.25 + channel * 0.25) + polygraphAt(position, this.time, channel) * amplitude
        if (!step) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.fillStyle = colors[channel]
      ctx.beginPath(); ctx.arc(this.width * 0.96, this.height * (0.25 + channel * 0.25) + polygraphAt(1, this.time, channel) * amplitude, 2.2, 0, Math.PI * 2); ctx.fill()
    }
  }
}
