import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { rainbowColor, RAINBOW_CYCLE_SECONDS } from "../src/scenes-color"
import { createScene } from "../src/scenes"
import { drawing } from "./environment"

const epoch = 1_800_000_000_000
beforeEach(() => { vi.spyOn(Date, "now").mockReturnValue(epoch + 33000) })
afterEach(() => { vi.mocked(Date.now).mockRestore() })

it("Rainbow visits every primary/secondary hue and seamlessly repeats after three minutes", () => {
  expect(RAINBOW_CYCLE_SECONDS).toBe(180)
  for (const [seconds, hue] of [[0, 0], [30, 60], [60, 120], [90, 180], [120, 240], [150, 300]]) {
    expect(rainbowColor(seconds, "dark")).toBe(`hsl(${hue}, 65%, 24%)`)
    expect(rainbowColor(seconds, "light")).toBe(`hsl(${hue}, 65%, 80%)`)
  }
  expect(rainbowColor(180, "dark")).toBe(rainbowColor(0, "dark"))
  expect(rainbowColor(360, "light")).toBe(rainbowColor(0, "light"))
  expect(Number(rainbowColor(179.99, "dark").match(/^hsl\(([^,]+)/)![1])).toBeCloseTo(359.98, 8)
})

it("Rainbow paints one uniform full-area rectangle, and freezes when elapsed time is zero", () => {
  const scene = createScene("rainbow"), context = drawing as unknown as CanvasRenderingContext2D
  scene.resize(1234, 567); scene.draw(context, 0, 1)
  expect(drawing.fillRect).toHaveBeenLastCalledWith(0, 0, 1234, 567)
  expect(drawing.fillRect).toHaveBeenCalledTimes(1)
  expect(drawing.globalAlpha).toBe(1)
  const initial = drawing.fillStyle
  vi.mocked(Date.now).mockReturnValue(epoch + 63000)
  scene.draw(context, 0, 1)
  expect(drawing.fillStyle).toBe(initial)
  scene.draw(context, 0.1, 1)
  expect(drawing.fillStyle).not.toBe(initial)
  const color = drawing.fillStyle
  scene.resize(360, 800); scene.draw(context, 0, 1)
  expect(drawing.fillStyle).toBe(color)
  expect(drawing.fillRect).toHaveBeenLastCalledWith(0, 0, 360, 800)
})

it("Rainbow mounts at the timestamp's hue and stays synchronized across navigation and instances", () => {
  const context = drawing as unknown as CanvasRenderingContext2D
  const first = createScene("rainbow")
  first.resize(800, 600); first.draw(context, 0, 1)
  expect(drawing.fillStyle).toBe(rainbowColor((epoch + 33000) / 1000, "dark"))
  expect(drawing.fillStyle).not.toBe(rainbowColor(0, "dark"))
  vi.mocked(Date.now).mockReturnValue(epoch + 73000)
  first.draw(context, 0.05, 1)
  const current = drawing.fillStyle
  const navigated = createScene("rainbow")
  navigated.resize(390, 844); navigated.draw(context, 0, 1)
  expect(drawing.fillStyle).toBe(current)
  vi.mocked(Date.now).mockReturnValue(epoch + 173000)
  first.draw(context, 0.01, 1); const resumed = drawing.fillStyle
  navigated.draw(context, 0.1, 1)
  expect(drawing.fillStyle).toBe(resumed) // Frame deltas do not determine hue.
})

it("Rainbow freezes its hue during still repaints, adapts appearance, then catches up on resume", () => {
  const scene = createScene("rainbow"), context = drawing as unknown as CanvasRenderingContext2D
  scene.resize(800, 600); scene.draw(context, 0, 1)
  const initial = drawing.fillStyle
  vi.mocked(Date.now).mockReturnValue(epoch + 93000)
  scene.draw(context, 0, 1, "light")
  expect(drawing.fillStyle).toBe(rainbowColor((epoch + 33000) / 1000, "light"))
  scene.draw(context, 0, 1, "dark")
  expect(drawing.fillStyle).toBe(initial)
  scene.draw(context, 0.05, 1)
  expect(drawing.fillStyle).toBe(rainbowColor((epoch + 93000) / 1000, "dark"))
})

it("Rainbow's timestamp cycle still respects the shared 0.2x–4x speed range", () => {
  const context = drawing as unknown as CanvasRenderingContext2D
  for (const speed of [0.2, 1, 4]) {
    vi.mocked(Date.now).mockReturnValue(epoch)
    const scene = createScene("rainbow")
    scene.resize(800, 600); scene.draw(context, 0, speed)
    const start = drawing.fillStyle
    vi.mocked(Date.now).mockReturnValue(epoch + 30000 / speed)
    scene.draw(context, 0.05, speed)
    expect(drawing.fillStyle).toBe("hsl(60, 65%, 24%)")
    vi.mocked(Date.now).mockReturnValue(epoch + 180000 / speed)
    scene.draw(context, 0.05, speed)
    expect(drawing.fillStyle).toBe(start)
  }
})
