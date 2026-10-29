import { expect, it } from "vitest"
import { BlockfallGame } from "../src/blockfall"
import { MazeGame } from "../src/maze"

it("Blockfall plays, clears real full rows, and restarts bounded rounds indefinitely", () => {
  const game = new BlockfallGame()
  for (let frame = 0; frame < 3600; frame++) {
    game.advance(0.1)
    expect(game.board.length).toBe(18)
    expect(game.board.every(row => row.length === 10 && row.every(cell => cell >= 0 && cell <= 7))).toBe(true)
  }
  expect(game.totalLines).toBeGreaterThan(10)
  expect(game.round).toBeGreaterThan(2)
})

it("Maze Chase generates a connected original maze and plays complete rounds without escaping walls", () => {
  const game = new MazeGame()
  const seen = new Set([game.player]), queue = [game.player]
  for (let i = 0; i < queue.length; i++) for (const id of game.neighbors(queue[i])) if (!seen.has(id)) { seen.add(id); queue.push(id) }
  expect(seen.size).toBe(game.walls.filter(wall => !wall).length)
  let collected = false, lifeLost = false
  for (let frame = 0; frame < 3600; frame++) {
    game.advance(0.1)
    expect(game.walls[game.player]).toBe(false)
    expect(game.bots.every(id => !game.walls[id])).toBe(true)
    expect(game.pellets.size).toBeLessThanOrEqual(game.initialPellets)
    expect(game.interpolation).toBeGreaterThanOrEqual(0)
    expect(game.interpolation).toBeLessThanOrEqual(1)
    if (game.pellets.size < game.initialPellets - 10) collected = true
    if (game.lives < 3) lifeLost = true
  }
  expect(collected).toBe(true)
  expect(lifeLost).toBe(true)
  expect(game.completed).toBeGreaterThan(2)
  expect(game.cleared).toBeGreaterThan(0)
})

it("both simulations are unchanged by zero elapsed time, including between rounds", () => {
  for (const game of [new MazeGame(), new BlockfallGame()]) {
    for (let i = 0; i < 1000; i++) game.advance(0.2)
    const before = JSON.stringify(game, (_, value) => value instanceof Set ? [...value] : value)
    game.advance(0)
    expect(JSON.stringify(game, (_, value) => value instanceof Set ? [...value] : value)).toBe(before)
  }
})
