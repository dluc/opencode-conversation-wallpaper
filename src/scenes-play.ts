import { ArtScene, sample, tau, wrap, type Point } from "./scene-art"

export class Vinyl extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#302934", "#e7e0d8")
    const x = 0.55, y = 0.5, r = Math.min(this.width, this.height) * 0.36
    this.disc(ctx, x, y, 0.36, this.color("#121721", "#56616c"), 0.8)
    for (let i = 0; i < 26; i++) this.ring(ctx, x, y, r * (0.27 + i * 0.027) / this.width,
      r * (0.27 + i * 0.027) / this.height, this.color("#8897a6", "#b7c3cb"), 0.15)
    this.disc(ctx, x, y, 0.083, this.color("#b17e63", "#a77653"), 0.8)
    this.disc(ctx, x, y, 0.012, this.color("#171d25", "#e2d8c8"), 0.8)
    for (let i = 0; i < 5; i++) {
      const a = this.time * 0.4 + i * 0.08
      this.ring(ctx, x, y, r * (0.52 + i * 0.055) / this.width, r * (0.52 + i * 0.055) / this.height,
        this.color("#b6c5cc", "#d8e2e5"), 0.17, 2, a, a + 0.45)
    }
    const a = this.time * 0.4
    this.disc(ctx, x + Math.cos(a) * r * 0.16 / this.width, y + Math.sin(a) * r * 0.16 / this.height,
      0.004, this.color("#e1d2b9", "#ede2d0"), 0.7)
    const metal = this.color("#b1bbb9", "#687c7e")
    this.path(ctx, [[0.85, 0.2], [0.8, 0.48], [0.73, 0.59]], metal, 0.7, false, 4)
    this.disc(ctx, 0.85, 0.2, 0.018, metal, 0.75)
    this.path(ctx, [[0.715, 0.585], [0.742, 0.592], [0.738, 0.622], [0.712, 0.615]], metal, 0.8, true)
  }
}

/** Decorative notation and a breathing keyboard; no microphone, playback, or score claims. */
export class Music extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#26243a", "#e4e1ed")
    const ink = this.color("#aaa3ca", "#776494")
    for (let line = 0; line < 5; line++) {
      const points: Point[] = []
      for (let i = 0; i <= 60; i++) {
        const x = i / 60
        points.push([x, 0.28 + line * 0.045 + Math.sin(x * 5 - this.time * 0.07) * 0.035])
      }
      this.path(ctx, points, ink, 0.22)
    }
    for (let i = 0; i < 18; i++) {
      const x = wrap(sample(i) - this.time * 0.012), y = 0.25 + Math.round(sample(i + 50) * 8) * 0.0225
        + Math.sin(x * 5 - this.time * 0.07) * 0.035
      this.disc(ctx, x, y, 0.01, ink, 0.6)
      this.path(ctx, [[x + 0.007, y], [x + 0.007, y - 0.07], [x + 0.028, y - 0.058]], ink, 0.6, false, 2)
    }
    for (let i = 0; i < 28; i++) {
      const x = i / 28, height = 0.18 + Math.sin(this.time * 0.2 + i * 0.7) * 0.02
      ctx.fillStyle = this.color("#aeb6c4", "#a4a6b3"); ctx.globalAlpha = 0.22
      ctx.fillRect(x * this.width, (1 - height) * this.height, this.width / 28 - 1, height * this.height)
      if (![2, 6].includes(i % 7)) {
        ctx.fillStyle = this.color("#272b3c", "#5a5268"); ctx.globalAlpha = 0.5
        ctx.fillRect((x + 0.026) * this.width, (1 - height) * this.height, this.width * 0.019, height * this.height * 0.58)
      }
    }
  }
}

export class Court extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#183a34", "#c4ddd0")
    const white = this.color("#a5c5b2", "#598276")
    this.path(ctx, [[0.24, 0.2], [0.76, 0.2], [0.94, 0.93], [0.06, 0.93], [0.24, 0.2]], white, 0.5, false, 2)
    this.path(ctx, [[0.29, 0.2], [0.16, 0.93]], white, 0.35)
    this.path(ctx, [[0.71, 0.2], [0.84, 0.93]], white, 0.35)
    this.path(ctx, [[0.2, 0.42], [0.8, 0.42]], white, 0.4)
    this.path(ctx, [[0.13, 0.72], [0.87, 0.72]], white, 0.4)
    this.path(ctx, [[0.5, 0.42], [0.5, 0.72]], white, 0.4)
    for (let i = 0; i <= 24; i++) this.path(ctx, [[0.16 + i / 24 * 0.68, 0.51], [0.16 + i / 24 * 0.68, 0.57]], white, 0.18)
    this.path(ctx, [[0.16, 0.51], [0.84, 0.51]], white, 0.65, false, 2)
    const phase = wrap(this.time * 0.075), travel = phase < 0.5 ? phase * 2 : (1 - phase) * 2
    const x = 0.3 + Math.sin(this.time * 0.12) * 0.16 + travel * 0.35, y = 0.26 + travel * 0.59
    const lift = Math.sin(wrap(phase * 2) * Math.PI) * 0.13
    this.ring(ctx, x, y, 0.014, 0.005, this.color("#0f201b", "#587463"), 0.3, 3)
    this.disc(ctx, x, y - lift, 0.012, this.color("#dfd88c", "#96812e"), 0.85)
    for (const [px, py] of [[0.34, 0.23], [0.64, 0.89]]) {
      const offset = Math.sin(this.time * 0.12) * 0.06
      this.ring(ctx, px + offset, py, 0.022, 0.036, white, 0.7, 2)
      this.path(ctx, [[px + offset, py + 0.036], [px + offset + 0.01, py + 0.065]], white, 0.7, false, 3)
    }
  }
}

export class Racing extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#232b3c", "#dce2e9")
    const bend = Math.sin(this.time * 0.07) * 0.07, road = this.color("#444c61", "#8e99a7")
    this.path(ctx, [[0.47 + bend, 0.38], [0.53 + bend, 0.38], [1.1, 1], [-0.1, 1]], road, 0.65, true)
    for (let i = 0; i < 26; i++) {
      const age = wrap(sample(i) + this.time * 0.08), z = age * age, horizon = 0.38, y = horizon + z * 0.62
      const center = 0.5 + bend * (1 - z), spread = 0.045 + z * 0.62
      for (const side of [-1, 1]) {
        const x = center + spread * side
        this.path(ctx, [[x, y], [x, y - 0.008 - z * 0.05]], this.color("#ad9c80", "#8d7558"), 0.5, false, 2)
        if (i % 2 === 0) {
          ctx.fillStyle = this.color("#6c788c", "#8495a5"); ctx.globalAlpha = 0.35
          ctx.fillRect((x + side * 0.025) * this.width, (y - z * 0.16) * this.height, (0.01 + z * 0.07) * this.width, z * 0.16 * this.height)
        }
      }
      this.path(ctx, [[center, y], [center + bend * 0.01, y + z * 0.032]], this.color("#c0c6cb", "#e0e2e4"), 0.6, false, 2)
    }
    const x = 0.5 + Math.sin(this.time * 0.09) * 0.07, car = this.color("#b78b71", "#936850")
    this.path(ctx, [[x - 0.045, 0.82], [x - 0.035, 0.77], [x + 0.035, 0.77], [x + 0.045, 0.82],
      [x + 0.053, 0.9], [x - 0.053, 0.9]], car, 0.8, true)
    this.path(ctx, [[x - 0.029, 0.79], [x + 0.029, 0.79], [x + 0.033, 0.83], [x - 0.033, 0.83]],
      this.color("#2c4056", "#536e82"), 0.8, true)
    this.path(ctx, [[x - 0.042, 0.875], [x - 0.021, 0.875]], this.color("#d19a82", "#a85e45"), 0.75, false, 3)
    this.path(ctx, [[x + 0.042, 0.875], [x + 0.021, 0.875]], this.color("#d19a82", "#a85e45"), 0.75, false, 3)
  }
}

export class Halloween extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#302137", "#e8dfeb")
    this.disc(ctx, 0.79, 0.25, 0.12, this.color("#c6b68f", "#b2a17a"), 0.5)
    for (let i = 0; i < 9; i++) {
      const x = wrap(sample(i) + this.time * 0.015), y = 0.16 + sample(i + 30) * 0.27,
        flap = Math.sin(this.time * 0.5 + i) * 0.008
      this.path(ctx, [[x - 0.025, y - flap], [x - 0.016, y + 0.01], [x - 0.007, y + 0.004],
        [x, y + 0.01], [x + 0.007, y + 0.004], [x + 0.016, y + 0.01], [x + 0.025, y - flap], [x, y - 0.006]],
      this.color("#9383a6", "#7a658d"), 0.65, true)
    }
    const orange = this.color("#cc925b", "#b17742"), dark = this.color("#322335", "#796149")
    for (let i = 0; i < 5; i++) {
      const x = 0.12 + i * 0.19, y = 0.88 + Math.sin(i) * 0.025, radius = 0.055 + sample(i) * 0.015
      for (let lobe = -1; lobe <= 1; lobe++) this.disc(ctx, x + lobe * radius * 0.35, y, radius, orange, 0.45)
      this.path(ctx, [[x, y - radius], [x + 0.008, y - radius - 0.026]], dark, 0.7, false, 3)
      this.path(ctx, [[x - 0.024, y - 0.007], [x - 0.012, y - 0.025], [x - 0.003, y - 0.007]], dark, 0.7, true)
      this.path(ctx, [[x + 0.024, y - 0.007], [x + 0.012, y - 0.025], [x + 0.003, y - 0.007]], dark, 0.7, true)
      this.path(ctx, [[x - 0.024, y + 0.015], [x, y + 0.029 + Math.sin(this.time * 0.1 + i) * 0.002], [x + 0.024, y + 0.015]], dark, 0.7, false, 2)
    }
    for (let i = 0; i < 5; i++) {
      const y = 0.74 + i * 0.045, points: Point[] = []
      for (let j = 0; j <= 50; j++) points.push([j / 50, y + Math.sin(j * 0.2 + this.time * 0.05 + i) * 0.017])
      this.path(ctx, points, this.color("#a295b3", "#8b7b9a"), 0.12, false, 6)
    }
  }
}

export class Christmas extends ArtScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    this.wash(ctx, "#1c3436", "#e0e8e3")
    const green = this.color("#68998a", "#648674"), gold = this.color("#d4b780", "#9b7c44")
    for (let i = 0; i < 5; i++) {
      const x = 0.16 + i * 0.18, height = 0.25 + sample(i) * 0.26
      for (let tier = 0; tier < 4; tier++) {
        const y = 0.87 - height + tier * height * 0.17, width = 0.025 + tier * 0.018
        this.path(ctx, [[x, y], [x - width, y + height * 0.37], [x + width, y + height * 0.37]], green, 0.6, true)
      }
      this.disc(ctx, x, 0.87 - height, 0.006, gold, 0.6 + Math.sin(this.time * 0.12 + i) * 0.05)
      for (let j = 0; j < 7; j++) this.disc(ctx, x + (sample(i * 10 + j) - 0.5) * 0.045,
        0.87 - height + 0.07 + j * height * 0.09, 0.004, gold, 0.6)
    }
    for (let i = 0; i < 100; i++) {
      const y = wrap(sample(i + 100) + this.time * (0.014 + sample(i + 200) * 0.02))
      this.disc(ctx, wrap(sample(i) + Math.sin(this.time * 0.05 + i) * 0.02), y,
        0.0015 + sample(i + 300) * 0.002, this.color("#cadadb", "#638995"), 0.4)
    }
  }
}
