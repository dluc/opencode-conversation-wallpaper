import { expect, it } from "vitest"
import { LifeGame, stepLife } from "../src/life"

const board = (points: number[][], columns = 5, rows = 5) => {
  const cells = new Uint8Array(columns * rows)
  for (const [x, y] of points) cells[y * columns + x] = 1
  return cells
}
it("Game of Life follows B3/S23: stable blocks and a period-two blinker", () => {
  const block = board([[1, 1], [1, 2], [2, 1], [2, 2]])
  expect(stepLife(block, 5, 5)).toEqual(block)
  const horizontal = board([[1, 2], [2, 2], [3, 2]])
  const vertical = board([[2, 1], [2, 2], [2, 3]])
  expect(stepLife(horizontal, 5, 5)).toEqual(vertical)
  expect(stepLife(vertical, 5, 5)).toEqual(horizontal)
})
it("gliders travel and cells interact across the toroidal boundaries", () => {
  let glider: Uint8Array = board([[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]], 8, 8)
  const original = glider.slice()
  for (let i = 0; i < 4; i++) glider = stepLife(glider, 8, 8)
  expect(glider).toEqual(board([[2, 1], [3, 2], [1, 3], [2, 3], [3, 3]], 8, 8))
  expect(original.reduce((sum, cell) => sum + cell, 0)).toBe(5)
  const crossing = board([[4, 2], [0, 2], [1, 2]])
  expect(stepLife(crossing, 5, 5)).toEqual(board([[0, 1], [0, 2], [0, 3]]))
})
it("evolution stops at zero elapsed time and reseeds bounded boards instead of stalling forever", () => {
  const game = new LifeGame(30, 20)
  const before = game.cells.slice()
  game.advance(0)
  expect(game.cells).toEqual(before); expect(game.generation).toBe(0)
  game.advance(0.3)
  expect(game.generation).toBe(1)
  for (let i = 0; i < 6000; i++) game.advance(0.1)
  expect(game.round).toBeGreaterThan(2)
  expect(game.cells.length).toBe(600)
  expect(game.previous.length).toBe(600)
  expect([...game.cells].every(cell => cell === 0 || cell === 1)).toBe(true)
  expect(new LifeGame(10000, 10000).cells.length).toBe(96 * 64)
})
