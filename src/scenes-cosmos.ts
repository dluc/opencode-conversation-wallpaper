import { ArtScene, sample, tau, wrap, type Point } from "./scene-art"

/** An original observation deck, not a franchise bridge or instrument dashboard. */
export class Bridge extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#16333e", "#d2e0e6"); this.stars(ctx, 70, 0.004)
    const rim = this.color("#6d8d98", "#516c7a")
    this.path(ctx, [[0, 0.05], [0.14, 0.15], [0.86, 0.15], [1, 0.05]], rim, 0.45, false, 3)
    this.path(ctx, [[0, 0.95], [0.16, 0.81], [0.84, 0.81], [1, 0.95]], rim, 0.6, false, 4)
    this.path(ctx, [[0.14, 0.15], [0.08, 0.89]], rim, 0.3, false, 3)
    this.path(ctx, [[0.86, 0.15], [0.92, 0.89]], rim, 0.3, false, 3)
    this.disc(ctx, 0.76 + Math.sin(this.time * 0.025) * 0.035, 0.4, 0.13, this.color("#59848b", "#8bacb3"), 0.5)
    this.ring(ctx, 0.76 + Math.sin(this.time * 0.025) * 0.035, 0.4, 0.16, 0.06, this.color("#b8a36e", "#806b40"), 0.5, 2)
    for (let i = 0; i < 9; i++) {
      ctx.globalAlpha = 0.35; ctx.fillStyle = this.color(i % 3 ? "#618a91" : "#c59465", i % 3 ? "#426c77" : "#9b6c3e")
      ctx.fillRect(this.width * (0.2 + i * 0.065), this.height * 0.9, this.width * 0.042,
        this.height * (0.012 + 0.004 * Math.sin(this.time * 0.2 + i)))
    }
  }
}

export class Blackhole extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#161a30", "#e3e0ec"); this.stars(ctx, 64)
    const x = 0.58, y = 0.5, r = 0.14 * Math.min(this.width, this.height)
    for (let band = 0; band < 7; band++) {
      const points: Point[] = []
      for (let i = 0; i <= 100; i++) {
        const a = i / 100 * tau, radius = r * (1.45 + band * 0.19 + Math.sin(a * 3 + this.time * 0.2) * 0.02)
        points.push([x + Math.cos(a) * radius / this.width,
          y + (Math.sin(a) * radius * 0.3 - Math.max(0, -Math.sin(a)) ** 4 * r * 1.1) / this.height])
      }
      this.path(ctx, points, this.color(band % 2 ? "#d99567" : "#ddb781", band % 2 ? "#a76d46" : "#896542"), 0.5 - band * 0.035, false, 2)
    }
    this.disc(ctx, x, y, 0.14, this.color("#050810", "#27323f"), 0.95)
    this.ring(ctx, x, y, r * 1.08 / this.width, r * 1.08 / this.height, this.color("#e4c190", "#a57e50"), 0.7, 2)
    for (let i = 0; i < 22; i++) {
      const a = sample(i) * tau + this.time * 0.15, radius = r * (1.7 + sample(i + 20))
      this.disc(ctx, x + Math.cos(a) * radius / this.width, y + Math.sin(a) * radius * 0.3 / this.height,
        0.002, this.color("#f0c999", "#996132"), 0.6)
    }
  }
}

export class Warp extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#10293e", "#dce7ed")
    for (let i = 0; i < 100; i++) {
      const angle = sample(i) * tau, age = wrap(sample(i + 100) + this.time * (0.06 + sample(i + 210) * 0.02))
      const radius = 0.025 + age * age * 0.85, tail = Math.max(0.015, radius - age * 0.09)
      const aspect = this.height / this.width
      this.path(ctx, [[0.5 + Math.cos(angle) * tail * aspect, 0.48 + Math.sin(angle) * tail],
        [0.5 + Math.cos(angle) * radius * aspect, 0.48 + Math.sin(angle) * radius]],
      this.color(i % 4 ? "#88c5df" : "#c1a8d2", i % 4 ? "#316d91" : "#795e8f"), age * 0.65, false, 1 + age)
    }
  }
}

export class Portal extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#122b35", "#dce5e6")
    const r = Math.min(this.width, this.height) * 0.31, x = 0.58, y = 0.5
    const rim = this.color("#80969c", "#60787e")
    this.ring(ctx, x, y, r / this.width, r / this.height, rim, 0.55, 9)
    this.ring(ctx, x, y, r * 0.91 / this.width, r * 0.91 / this.height, this.color("#67bdc5", "#368a98"), 0.5, 2)
    for (let band = 0; band < 16; band++) {
      const radius = r * (0.08 + band * 0.047), points: Point[] = []
      for (let i = 0; i <= 72; i++) {
        const a = i / 72 * tau, rippled = radius * (1 + Math.sin(a * 5 - this.time * 0.4 + band) * 0.04)
        points.push([x + Math.cos(a) * rippled / this.width, y + Math.sin(a) * rippled / this.height])
      }
      this.path(ctx, points, this.color("#4fabb6", "#447e9e"), 0.3, false, 2)
    }
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * tau - Math.PI / 2 + Math.sin(this.time * 0.06) * 0.015
      const point = (offset: number, radius: number): Point => [x + Math.cos(a + offset) * r * radius / this.width,
        y + Math.sin(a + offset) * r * radius / this.height]
      this.path(ctx, [point(-0.05, 1.06), point(0, 0.94), point(0.05, 1.06)], this.color("#d0a76d", "#9b733d"), 0.65, false, 3)
    }
  }
}

export class Gravity extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#17212f", "#e1e6e9")
    for (let row = 0; row < 17; row++) {
      const points: Point[] = []
      for (let col = 0; col <= 60; col++) {
        const x = col / 60, y = row / 16, distance = Math.hypot((x - 0.58) * 1.4, y - 0.42)
        points.push([x, y + Math.exp(-distance * distance * 14) * (0.16 + Math.sin(this.time * 0.12) * 0.012)])
      }
      this.path(ctx, points, this.color("#6490ac", "#5a7b93"), 0.3)
    }
    this.disc(ctx, 0.58, 0.52, 0.075, this.color("#abc1cd", "#668b9c"), 0.7)
    for (let i = 0; i < 8; i++) {
      const a = this.time * (0.07 + i * 0.012) + i * 1.7, radius = 0.16 + i * 0.025
      this.disc(ctx, 0.58 + Math.cos(a) * radius, 0.5 + Math.sin(a) * radius * 0.6,
        0.006 + sample(i) * 0.008, this.color("#cbb586", "#977746"), 0.65)
    }
  }
}

export class Lunar extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#1a2230", "#e0e5eb"); this.stars(ctx, 56)
    this.disc(ctx, 0.79, 0.23, 0.067, this.color("#699fac", "#577c9d"), 0.7)
    const ground = this.color("#8b929b", "#a4aab0")
    this.path(ctx, [[0, 0.77], [0.17, 0.72], [0.31, 0.8], [0.6, 0.76], [0.83, 0.69], [1, 0.74], [1, 1], [0, 1]], ground, 0.5, true)
    for (let i = 0; i < 12; i++) this.ring(ctx, sample(i), 0.81 + sample(i + 20) * 0.18,
      0.015 + sample(i + 40) * 0.04, 0.008, this.color("#424d61", "#707a89"), 0.4, 2)
    const settle = Math.max(0, Math.sin(this.time * 0.06)) * 0.15, y = 0.65 - settle
    const metal = this.color("#bac2ca", "#6c7782")
    this.path(ctx, [[0.47, y - 0.1], [0.56, y - 0.1], [0.58, y], [0.45, y]], metal, 0.75, true)
    this.path(ctx, [[0.46, y], [0.43, y + 0.08], [0.4, y + 0.08]], metal, 0.7, false, 2)
    this.path(ctx, [[0.57, y], [0.61, y + 0.08], [0.64, y + 0.08]], metal, 0.7, false, 2)
    this.path(ctx, [[0.5, y], [0.53, y], [0.55, y + 0.055], [0.48, y + 0.055]], this.color("#c99e6a", "#9b7143"), 0.6, true)
    if (settle > 0.005) for (let i = 0; i < 20; i++) this.disc(ctx, 0.51 + (sample(i) - 0.5) * 0.24,
      0.79 + wrap(sample(i + 80) + this.time * 0.05) * 0.07, 0.002, ground, settle * 2)
  }
}

export class Corona extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#271c20", "#f0e6dc")
    const x = 0.6, y = 0.55, r = Math.min(this.width, this.height) * 0.19
    this.disc(ctx, x, y, 0.19, this.color("#d9874d", "#cf9558"), 0.65)
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * tau + 0.06 * Math.sin(this.time * 0.07), height = 0.2 + sample(i) * 0.65
      const points: Point[] = []
      for (let j = 0; j <= 28; j++) {
        const u = j / 28, angle = a + (u - 0.5) * 0.24, radius = r * (0.98 + Math.sin(u * Math.PI) * height * (0.85 + Math.sin(this.time * 0.18 + i) * 0.15))
        points.push([x + Math.cos(angle) * radius / this.width, y + Math.sin(angle) * radius / this.height])
      }
      this.path(ctx, points, this.color("#eeb578", "#a96837"), 0.45, false, 2)
    }
    for (let i = 0; i < 24; i++) this.disc(ctx, x + (sample(i) - 0.5) * r / this.width * 1.6,
      y + (sample(i + 80) - 0.5) * r / this.height * 1.6, 0.003,
      this.color("#f2be81", "#9d653c"), 0.25 + Math.sin(this.time * 0.2 + i) * 0.08)
  }
}
