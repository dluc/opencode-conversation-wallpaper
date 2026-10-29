import { AmbientScene } from "./scene"
import { BlockfallGame } from "./blockfall"
import { MazeGame } from "./maze"

const palette = {
  dark: ["#65d8d0", "#e69b86", "#a699e7", "#9acc87", "#82b2e9", "#dfb65b", "#d483ad"],
  light: ["#187a77", "#b55035", "#7153a5", "#467a33", "#386ca5", "#9b7116", "#a44375"],
}

export class BlockfallScene extends AmbientScene {
  private game = new BlockfallGame()
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    const game = this.game; game.advance(delta)
    const cell = Math.max(0.5, Math.min(this.width * 0.6 / game.columns, (this.height - 32) / game.rows, 28))
    const x = (this.width - cell * game.columns) / 2, y = (this.height - cell * game.rows) / 2 + 5
    const light = this.appearance === "light", colors = palette[this.appearance]
    ctx.globalAlpha = game.stage === "reset" ? Math.max(0, 1 - game.age / 2) : 0.8
    ctx.strokeStyle = light ? "#7892a7" : "#647c91"; ctx.lineWidth = 0.6
    ctx.strokeRect(x - 2, y - 2, cell * game.columns + 4, cell * game.rows + 4)
    const block = (column: number, row: number, color: number) => {
      if (row < 0) return
      ctx.fillStyle = colors[(color - 1) % colors.length]
      ctx.fillRect(x + column * cell + 1, y + row * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2))
    }
    for (let row = 0; row < game.rows; row++) for (let column = 0; column < game.columns; column++) {
      if (!game.board[row][column]) continue
      ctx.globalAlpha = game.stage === "clear" && game.clearing.includes(row) ? 0.8 * (1 - game.age / 0.45) : 0.7
      if (game.stage === "reset") ctx.globalAlpha *= Math.max(0, 1 - game.age / 2)
      block(column, row, game.board[row][column])
    }
    if (game.piece && game.stage === "fall") {
      ctx.globalAlpha = 0.85
      for (const [dx, dy] of game.piece.cells) block(game.piece.x + dx, game.fallingY + dy, game.piece.color)
    }
    ctx.globalAlpha = 0.7; ctx.fillStyle = light ? "#355366" : "#b6cbda"; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center"
    ctx.fillText(`ROUND ${game.round}  ·  ${game.totalLines} LINES`, this.width / 2, Math.max(10, y - 7))
  }
}

export class MazeChaseScene extends AmbientScene {
  private game = new MazeGame()
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    const game = this.game; game.advance(delta)
    const cell = Math.max(0.5, Math.min((this.width - 30) / game.columns, (this.height - 32) / game.rows, 30))
    const x = (this.width - cell * game.columns) / 2, y = (this.height - cell * game.rows) / 2 + 5
    const light = this.appearance === "light"
    const fade = game.stage === "playing" ? Math.min(1, 0.65 + game.age) : Math.max(0, 1 - game.age / 2.5)
    ctx.globalAlpha = 0.65 * fade
    ctx.fillStyle = light ? "#789ca6" : "#42677a"
    for (let id = 0; id < game.walls.length; id++) if (game.walls[id]) {
      ctx.fillRect(x + id % game.columns * cell + 0.8, y + Math.floor(id / game.columns) * cell + 0.8, cell - 1.6, cell - 1.6)
    }
    ctx.fillStyle = light ? "#826426" : "#d3bf7c"
    for (const id of game.pellets) {
      ctx.beginPath(); ctx.arc(x + (id % game.columns + 0.5) * cell, y + (Math.floor(id / game.columns) + 0.5) * cell,
        cell * (game.powers.has(id) ? 0.18 : 0.07), 0, Math.PI * 2); ctx.fill()
    }
    const position = (from: number, to: number) => {
      const t = game.interpolation
      return [x + (from % game.columns + (to % game.columns - from % game.columns) * t + 0.5) * cell,
        y + (Math.floor(from / game.columns) + (Math.floor(to / game.columns) - Math.floor(from / game.columns)) * t + 0.5) * cell]
    }
    const [px, py] = position(game.previousPlayer, game.player)
    ctx.globalAlpha = 0.95 * fade; ctx.fillStyle = light ? "#087b86" : "#6ce0d4"
    ctx.beginPath()
    // A rotating diamond courier and circular sentries, not recognizable branded characters.
    for (let i = 0; i < 4; i++) {
      const angle = this.time * 0.8 + i * Math.PI / 2
      const a = px + Math.cos(angle) * cell * 0.4, b = py + Math.sin(angle) * cell * 0.4
      if (!i) ctx.moveTo(a, b); else ctx.lineTo(a, b)
    }
    ctx.closePath(); ctx.fill()
    for (let i = 0; i < game.bots.length; i++) {
      const [bx, by] = position(game.previousBots[i], game.bots[i])
      ctx.fillStyle = game.shield ? (light ? "#6c70a5" : "#949cc9") : palette[this.appearance][i + 1]
      ctx.beginPath(); ctx.arc(bx, by, cell * 0.32, 0, Math.PI * 2); ctx.fill()
    }
    ctx.fillStyle = light ? "#355366" : "#b6cbda"; ctx.font = "10px ui-monospace, monospace"; ctx.textAlign = "center"
    const status = game.stage === "cleared" ? "CLEARED" : game.stage === "caught" ? "NEW ROUND SOON" : `${game.initialPellets - game.pellets.size}/${game.initialPellets}  ·  ${game.lives} LIVES`
    ctx.fillText(`ROUND ${game.round}  ·  ${status}`, this.width / 2, Math.max(10, y - 7))
  }
}
