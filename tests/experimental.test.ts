import { expect, it, vi } from "vitest"
import { EXPERIMENTAL_MODES } from "../src/preferences"
import { createScene } from "../src/scenes"
import { experimentalCollection } from "../src/scenes-experimental"
import { labyrinthPlan, Noise } from "../src/scenes-earth"
import { Calendar, Clock } from "../src/scenes-time"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
const geometry = () => [drawing.arc, drawing.ellipse, drawing.moveTo, drawing.lineTo, drawing.fillRect]
  .flatMap(fn => fn.mock.calls.flat().filter(value => typeof value === "number"))
const clear = () => vi.clearAllMocks()

it("the temporary batch covers 23 distinct concepts without replacing existing wallpaper IDs", () => {
  expect(experimentalCollection.map(item => item.id)).toEqual([...EXPERIMENTAL_MODES])
  expect(new Set(experimentalCollection.map(item => item.title)).size).toBe(23)
  expect(new Set(EXPERIMENTAL_MODES.map(mode => createScene(mode).constructor)).size).toBe(23)
})

for (const mode of EXPERIMENTAL_MODES) it(`${mode} has bounded, finite geometry and stable resize-safe artwork`, () => {
  const scene = createScene(mode)
  const random = vi.spyOn(Math, "random")
  for (const [width, height] of [[1, 1], [390, 844], [1600, 900], [1, 800]]) {
    scene.resize(width, height)
    for (let frame = 0; frame < 4; frame++) {
      clear(); scene.draw(context, 0.1, 10, frame % 2 ? "light" : "dark")
      expect(geometry().every(Number.isFinite)).toBe(true)
      expect(geometry().length).toBeLessThan(20000)
      expect(drawing.arc.mock.calls.every(([, , radius]) => radius >= 0)).toBe(true)
      expect(drawing.ellipse.mock.calls.every(([, , rx, ry]) => rx >= 0 && ry >= 0)).toBe(true)
      expect(drawing.globalAlpha).toBeGreaterThanOrEqual(0)
      expect(drawing.globalAlpha).toBeLessThanOrEqual(1)
    }
  }
  scene.resize(800, 600); clear(); scene.draw(context, 0, 1, "dark")
  const before = geometry()
  scene.resize(0, 0); scene.draw(context, 0.1, 10)
  scene.resize(800, 600); clear(); scene.draw(context, 0, 1, "light")
  expect(geometry()).toEqual(before)
  expect(random).not.toHaveBeenCalled()
  random.mockRestore()
})

it("Labyrinth is a connected spanning tree and the explorer walks only legal passages", () => {
  const plan = labyrinthPlan(), count = plan.columns * plan.rows
  expect(plan.passages).toHaveLength(216)
  expect(plan.passages.flat()).toHaveLength(2 * (count - 1))
  expect(new Set(plan.walk).size).toBe(count)
  expect(plan.walk).toHaveLength(2 * count - 1)
  expect(plan.walk[0]).toBe(plan.walk.at(-1))
  for (let cell = 0; cell < count; cell++) for (const next of plan.passages[cell]) {
    const distance = Math.abs(cell % plan.columns - next % plan.columns)
      + Math.abs(Math.floor(cell / plan.columns) - Math.floor(next / plan.columns))
    expect(distance).toBe(1)
    expect(plan.passages[next]).toContain(cell)
  }
  for (let i = 1; i < plan.walk.length; i++) expect(plan.passages[plan.walk[i - 1]]).toContain(plan.walk[i])
  expect(labyrinthPlan()).toEqual(plan)
})

it("Clock freezes real local time while paused and catches up without accelerating its hands", () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(new Date(2028, 1, 29, 10, 15, 0).getTime())
  const clock = new Clock(); clock.resize(800, 600); clock.draw(context, 0, 1)
  const before = geometry(); now.mockReturnValue(new Date(2028, 1, 29, 11, 25, 0).getTime())
  clear(); clock.draw(context, 0, 10, "light")
  expect(geometry()).toEqual(before)
  clear(); clock.draw(context, 0.1, 1); const hands = drawing.lineTo.mock.calls.slice(-3)
  expect(geometry()).not.toEqual(before)
  clear(); clock.draw(context, 0.1, 10)
  expect(drawing.lineTo.mock.calls.slice(-3)).toEqual(hands)
  now.mockRestore()
})

it("Calendar handles leap February and midnight while keeping paused dates unchanged", () => {
  const now = vi.spyOn(Date, "now").mockReturnValue(new Date(2028, 1, 29, 23, 59, 59).getTime())
  const calendar = new Calendar(); calendar.resize(800, 600); calendar.draw(context, 0, 1)
  expect(drawing.fillText.mock.calls[0][0]).toBe("2028 · 02")
  expect(drawing.fillText.mock.calls.slice(8).map(([text]) => text)).toEqual(Array.from({ length: 29 }, (_, i) => String(i + 1)))
  now.mockReturnValue(new Date(2028, 2, 1, 0, 0, 1).getTime())
  clear(); calendar.draw(context, 0, 1)
  expect(drawing.fillText.mock.calls[0][0]).toBe("2028 · 02")
  clear(); calendar.draw(context, 0.1, 1)
  expect(drawing.fillText.mock.calls[0][0]).toBe("2028 · 03")
  expect(drawing.fillText.mock.calls.slice(8)).toHaveLength(31)
  now.mockRestore()
})

it("Noise uses a fixed bounded texture and smooth intensity changes even at 10x", () => {
  let alpha = 1
  const values: number[] = [], ctx = Object.create(context)
  Object.defineProperty(ctx, "globalAlpha", { get: () => alpha, set: (value: number) => { alpha = value; values.push(value) } })
  const noise = new Noise(); noise.resize(800, 600); noise.draw(ctx, 0, 1)
  const before = values.slice(1); values.length = 0
  noise.draw(ctx, 0.1, 10)
  const after = values.slice(1)
  expect(before).toHaveLength(64 * 36)
  expect(after).toHaveLength(before.length)
  expect(after.every(value => value >= 0.11 && value <= 0.23)).toBe(true)
  expect(Math.max(...after.map((value, i) => Math.abs(value - before[i])))).toBeLessThan(0.005)
})
