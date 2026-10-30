import { AmbientScene } from "./scene"
import { LifeGame } from "./life"

export class GameOfLife extends AmbientScene {
  private game: LifeGame | undefined
  protected layout() {
    if (this.game || !this.width || !this.height) return
    const cell = Math.sqrt(this.width * this.height / 1600)
    this.game = new LifeGame(Math.max(24, Math.round(this.width / cell)), Math.max(16, Math.round(this.height / cell)))
  }
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    const game = this.game!; game.advance(delta)
    const cellX = this.width / game.columns, cellY = this.height / game.rows
    const gap = Math.min(1.5, cellX * 0.12, cellY * 0.12)
    ctx.fillStyle = this.appearance === "light" ? "#286c53" : "#79c99d"
    for (let id = 0; id < game.cells.length; id++) {
      const alive = game.cells[id], before = game.previous[id]
      if (!alive && !before) continue
      const alpha = alive ? (before ? 0.7 : 0.45 + game.phase * 0.3) : (1 - game.phase) * 0.45
      ctx.globalAlpha = alpha * game.opacity
      ctx.fillRect(id % game.columns * cellX + gap / 2, Math.floor(id / game.columns) * cellY + gap / 2, cellX - gap, cellY - gap)
    }
  }
}
