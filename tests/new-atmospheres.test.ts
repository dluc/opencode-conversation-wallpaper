import { expect, it } from "vitest"
import { makePedestrians, pedestrianPosition } from "../src/pedestrians"
import { pulseAt } from "../src/scenes-flow"
import { createScene } from "../src/scenes"
import { drawing } from "./environment"

it("the plaza has a large bounded crowd with offscreen entrances and exits", () => {
  expect(makePedestrians(2).length).toBe(180)
  const people = makePedestrians(10000)
  expect(people.length).toBe(360)
  const offscreen = (point: readonly number[]) => point.some(value => value < 0 || value > 1)
  for (const person of people) {
    expect(offscreen(person.start)).toBe(true); expect(offscreen(person.end)).toBe(true)
    const start = pedestrianPosition(person, -person.phase, 800, 600)
    expect(start.x).toBeCloseTo(person.start[0] * 800, 6)
    expect(start.y).toBeCloseTo(person.start[1] * 600, 6)
    const end = pedestrianPosition(person, person.duration * 0.99999 - person.phase, 800, 600)
    expect(Math.hypot(end.x - person.end[0] * 800, end.y - person.end[1] * 600)).toBeLessThan(0.1)
    const current = pedestrianPosition(person, 5, 800, 600), moved = pedestrianPosition(person, 5.1, 800, 600)
    expect([current.x, current.y]).not.toEqual([moved.x, moved.y])
    expect(Number.isFinite(current.angle)).toBe(true)
  }
})
it("the decorative cardiogram is a periodic simple pulse, without real vital readings", () => {
  expect(pulseAt(0.4)).toBeGreaterThan(0.9)
  expect(pulseAt(0.43)).toBeLessThan(-0.3)
  expect(Math.abs(pulseAt(0.9))).toBeLessThan(0.001)
  for (let i = 0; i < 100; i++) expect(pulseAt(i / 100)).toBeCloseTo(pulseAt(i / 100 + 1), 8)
})
it("retro pixel clouds drift horizontally, with fixed vertical positions", () => {
  const scene = createScene("pixel-clouds"), context = drawing as unknown as CanvasRenderingContext2D
  scene.resize(800, 600); scene.draw(context, 0, 1)
  const before = drawing.fillRect.mock.calls.map(call => [...call])
  drawing.fillRect.mockClear(); scene.draw(context, 0.1, 1)
  expect(drawing.fillRect.mock.calls.map(call => call[1])).toEqual(before.map(call => call[1]))
  expect(drawing.fillRect.mock.calls.map(call => call[0])).not.toEqual(before.map(call => call[0]))
})
