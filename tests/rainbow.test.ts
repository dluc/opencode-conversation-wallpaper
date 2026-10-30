import { expect, it } from "vitest"
import { rainbowColor, RAINBOW_CYCLE_SECONDS } from "../src/scenes-color"
import { createScene } from "../src/scenes"
import { drawing } from "./environment"

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
  scene.draw(context, 0, 1)
  expect(drawing.fillStyle).toBe(initial)
  scene.draw(context, 0.1, 1)
  expect(drawing.fillStyle).not.toBe(initial)
  const color = drawing.fillStyle
  scene.resize(360, 800); scene.draw(context, 0, 1)
  expect(drawing.fillStyle).toBe(color)
  expect(drawing.fillRect).toHaveBeenLastCalledWith(0, 0, 360, 800)
})
