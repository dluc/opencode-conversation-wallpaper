import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { fireFlame, fireLift, firePalette } from "../src/scenes-fire"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
const gradients = () => drawing.createLinearGradient.mock.results.map(result => result.value.addColorStop.mock.calls)

it("Fire uses bottom-rooted tapered tongues with separate pointed tips, not horizontal wave bands", () => {
  for (let flame = 0; flame < 5; flame++) for (let layer = 0; layer < 3; layer++) {
    const shape = fireFlame(flame, 0, layer), root = shape[0], tip = shape.at(-1)!
    expect(shape).toHaveLength(49)
    expect(root.y).toBe(1.04)
    expect(root.right - root.left).toBeGreaterThan(0.17)
    expect(tip.left).toBe(tip.right)
    expect(tip.y).toBeLessThan(root.y - 0.4)
    expect(shape[40].right - shape[40].left).toBeLessThan((root.right - root.left) * 0.35)
    expect(shape.every((section, index) => section.left <= section.right && (!index || section.y < shape[index - 1].y))).toBe(true)
    if (layer) expect(tip.y).toBeGreaterThan(fireFlame(flame, 0, layer - 1).at(-1)!.y)
  }
})

it("Fire's deformation travels upward and curls sideways without bobbing its entire silhouette", () => {
  for (const height of [0.1, 0.4, 0.8]) {
    expect(fireLift(height + 0.26 / 8 * 2, 7)).toBeCloseTo(fireLift(height, 5), 10)
  }
  for (let flame = 0; flame < 5; flame++) {
    const before = fireFlame(flame, 0), after = fireFlame(flame, 10)
    expect(after.map(section => section.y)).toEqual(before.map(section => section.y))
    expect(after[0]).toEqual(before[0])
    expect(after.at(-1)!.left).not.toBe(before.at(-1)!.left)
    expect(after[24].right - after[24].left).not.toBe(before[24].right - before[24].left)
  }
})

it("Fire's flame shapes occupy most of the canvas while leaving natural gaps between their tips", () => {
  for (const time of [0, 10, 30, 60, 120, 240]) {
    const shapes = Array.from({ length: 5 }, (_, flame) => fireFlame(flame, time))
    let coverage = 0
    for (let row = 0; row < 100; row++) {
      const y = (row + 0.5) / 100
      const spans = shapes.flatMap(shape => {
        const index = shape.findIndex(section => section.y <= y)
        if (index <= 0) return []
        const a = shape[index - 1], b = shape[index], t = (a.y - y) / (a.y - b.y)
        return [{ left: Math.max(0, a.left + (b.left - a.left) * t), right: Math.min(1, a.right + (b.right - a.right) * t) }]
      }).sort((a, b) => a.left - b.left)
      let end = 0
      for (const span of spans) {
        coverage += Math.max(0, span.right - Math.max(end, span.left)) / 100
        end = Math.max(end, span.right)
      }
    }
    expect(coverage).toBeGreaterThan(0.6)
    expect(coverage).toBeLessThan(0.95)
    expect(Math.min(...shapes.map(shape => shape.at(-1)!.y))).toBeLessThan(0.03)
  }
})

it("Fire stays red/orange/yellow, with contrasting light/dark palettes and no cool color cycle", () => {
  for (const appearance of ["dark", "light"] as const) {
    const palette = firePalette(appearance)
    expect(palette).toHaveLength(4)
    for (const [red, green, blue] of palette) {
      expect(red).toBeGreaterThan(green)
      expect(green).toBeGreaterThan(blue)
      expect(red).toBeGreaterThan(blue * 1.8)
    }
  }
  expect(firePalette("light")).not.toEqual(firePalette("dark"))
})

it("Fire uses bounded smooth gradient geometry and preserves paused shapes across theme/resize changes", () => {
  const scene = createScene("fire")
  scene.resize(800, 600); scene.draw(context, 0.1, 1, "dark")
  const dark = gradients(), contour = drawing.lineTo.mock.calls.map(call => [...call])
  expect(dark).toHaveLength(15)
  expect(drawing.fill).toHaveBeenCalledTimes(15)
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
    expect(drawing.lineTo).toHaveBeenCalledTimes(1440)
    expect(drawing.lineTo.mock.calls.every(([x, y]) => Number.isFinite(x) && x >= -width * 0.4 && x <= width * 1.4 && y >= 0 && y <= height * 1.04)).toBe(true)
  }
  scene.resize(800, 600); drawing.lineTo.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  scene.resize(0, 0); drawing.fill.mockClear(); scene.draw(context, 0.1, 1)
  expect(drawing.fill).not.toHaveBeenCalled()
})
