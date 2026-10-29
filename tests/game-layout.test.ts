import { expect, it } from "vitest"
import { adaptiveGrid, playfield } from "../src/game-layout"
import { createScene } from "../src/scenes"
import { BlockfallGame } from "../src/blockfall"
import { MazeGame } from "../src/maze"
import { drawing } from "./environment"

for (const mode of ["blockfall", "maze-chase"] as const) {
  it(`${mode} fills wide, tall, compact, and large playfields while preserving round progress`, () => {
    const scene = createScene(mode)
    scene.resize(800, 600)
    for (let i = 0; i < 30; i++) scene.draw(drawing as unknown as CanvasRenderingContext2D, 0.1, 1)
    const hud = drawing.fillText.mock.lastCall![0]
    for (const [width, height] of [[1440, 900], [712, 240], [360, 800], [1600, 300], [800, 600]]) {
      drawing.strokeRect.mockClear()
      scene.resize(width, height)
      scene.draw(drawing as unknown as CanvasRenderingContext2D, 0, 1)
      const [x, y, w, h] = drawing.strokeRect.mock.calls[0]
      expect(w / width).toBeGreaterThan(0.94)
      expect(h / height).toBeGreaterThan(0.88)
      expect(x + w).toBeLessThanOrEqual(width)
      expect(y + h).toBeLessThanOrEqual(height)
      expect(drawing.fillText.mock.lastCall![0]).toBe(hud)
    }
  })
}

it("layout work stays bounded and remains valid at tiny positive sizes", () => {
  for (const [width, height] of [[1, 1], [800, 600], [4000, 400], [400, 4000]]) {
    const field = playfield(width, height)
    expect(field.width).toBeGreaterThan(0); expect(field.height).toBeGreaterThan(0)
    const blocks = adaptiveGrid(width, height, 220)
    expect(blocks.columns).toBeLessThanOrEqual(36); expect(blocks.rows).toBeLessThanOrEqual(36)
    const maze = adaptiveGrid(width, height, 420, true)
    expect(maze.columns % 2).toBe(1); expect(maze.rows % 2).toBe(1)
    expect(maze.columns * maze.rows).toBeLessThanOrEqual(61 * 41)
  }
})

it("Blockfall retains the stack, round counters, and piece age when the board grows", () => {
  const game = new BlockfallGame()
  game.advance(0.35)
  const count = game.board.flat().filter(Boolean).length, age = game.age
  game.resize(14, 22)
  expect(game.board.flat().filter(Boolean).length).toBe(count)
  expect(game.round).toBe(1); expect(game.pieces).toBe(0); expect(game.totalLines).toBe(0)
  expect(game.age).toBe(age)
  expect(game.board[21].filter(Boolean).length).toBe(8)
})

it("Maze Chase keeps its active match intact and adopts the new grid only at the next round", () => {
  const game = new MazeGame()
  expect([game.columns, game.rows]).toEqual([23, 15])
  for (let i = 0; i < 30; i++) game.advance(0.1)
  const state = { walls: [...game.walls], pellets: [...game.pellets], player: game.player, lives: game.lives }
  game.setNextLayout(41, 9); game.advance(0)
  expect({ walls: game.walls, pellets: [...game.pellets], player: game.player, lives: game.lives }).toEqual(state)
  for (let i = 0; i < 1000 && game.round === 1; i++) game.advance(0.1)
  expect(game.round).toBeGreaterThan(1)
  expect([game.columns, game.rows]).toEqual([41, 9])
})
