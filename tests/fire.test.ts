import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { fireContours, fireLift, firePalette, FIRE_COLOR_CYCLE_SECONDS } from "../src/scenes-fire"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
const gradients = () => drawing.createLinearGradient.mock.results.map(result => result.value.addColorStop.mock.calls)

it("Fire carries its deformation upward and independently morphs its flame silhouettes", () => {
  for (const height of [0.1, 0.4, 0.8]) {
    expect(fireLift(height + 0.26 / 8 * 2, 7)).toBeCloseTo(fireLift(height, 5), 10)
  }
  const before = fireContours(0), after = fireContours(10)
  expect(after).not.toEqual(before)
  const shifts = before[0].map((value, x) => Math.round((after[0][x] - value) * 1000))
  expect(new Set(shifts).size).toBeGreaterThan(10)
})

it("Fire has broad bounded contours covering most of the canvas throughout its color cycle", () => {
  for (let time = 0; time <= FIRE_COLOR_CYCLE_SECONDS; time += 5) {
    const contours = fireContours(time)
    expect(contours).toHaveLength(5)
    const outer = contours[0]
    expect(1 - outer.reduce((sum, y) => sum + y, 0) / outer.length).toBeGreaterThan(0.75)
    expect(Math.min(...outer)).toBeLessThan(0.05)
    for (const contour of contours) {
      expect(contour).toHaveLength(81)
      expect([...contour].every(y => Number.isFinite(y) && y >= 0 && y <= 1)).toBe(true)
    }
  }
})

it("Fire slowly cycles warm to cool as one narrow palette, never mixed warm/cool flames", () => {
  expect(FIRE_COLOR_CYCLE_SECONDS).toBe(240)
  for (const appearance of ["dark", "light"] as const) {
    const warm = firePalette(0, appearance), cool = firePalette(120, appearance)
    expect(warm.map(color => color.hue)).toEqual([5, 18, 32, 43, 55])
    expect(cool.map(color => color.hue)).toEqual([165, 178, 192, 203, 215])
    expect(firePalette(240, appearance)).toEqual(warm)
    for (let time = 0; time < 240; time++) {
      const hues = firePalette(time, appearance).map(color => color.hue)
      expect(Math.max(...hues) - Math.min(...hues)).toBeCloseTo(50, 10)
      expect(!(hues.some(hue => hue < 60) && hues.some(hue => hue >= 150))).toBe(true)
      expect(Math.abs(firePalette(time + 0.1, appearance)[0].hue - hues[0])).toBeLessThan(0.21)
    }
  }
  expect(firePalette(0, "light")).not.toEqual(firePalette(0, "dark"))
})

it("Fire uses only five smooth vector-gradient fills, with stable pause/theme/resize repainting", () => {
  const scene = createScene("fire")
  scene.resize(800, 600); scene.draw(context, 0.1, 1, "dark")
  const dark = gradients(), contour = drawing.lineTo.mock.calls.map(call => [...call])
  expect(dark).toHaveLength(5)
  expect(drawing.fill).toHaveBeenCalledTimes(5)
  expect(drawing.drawImage).not.toHaveBeenCalled()
  expect(drawing.fillRect).not.toHaveBeenCalled()
  drawing.createLinearGradient.mockClear(); drawing.lineTo.mockClear()
  scene.draw(context, 0, 1, "dark")
  expect(gradients()).toEqual(dark)
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  drawing.createLinearGradient.mockClear()
  scene.draw(context, 0, 1, "light")
  expect(gradients()).not.toEqual(dark)
  drawing.createLinearGradient.mockClear()
  scene.draw(context, 0, 1, "dark")
  expect(gradients()).toEqual(dark)
  for (const [width, height] of [[1200, 600], [390, 844], [7680, 4320], [1, 1]]) {
    drawing.lineTo.mockClear()
    scene.resize(width, height); scene.draw(context, 0, 1)
    expect(drawing.lineTo).toHaveBeenCalledTimes(410)
    expect(drawing.lineTo.mock.calls.every(([x, y]) => x >= 0 && x <= width && y >= 0 && y <= height)).toBe(true)
  }
  scene.resize(800, 600); drawing.lineTo.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  scene.resize(0, 0); drawing.fill.mockClear(); scene.draw(context, 0.1, 1)
  expect(drawing.fill).not.toHaveBeenCalled()
})
