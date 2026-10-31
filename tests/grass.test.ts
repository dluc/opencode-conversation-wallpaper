import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { grassBlade, grassPalette } from "../src/scenes-grass"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D

it("Grass preserves the former Fire's five tall layered blades and fixed-height wind-blown sway", () => {
  for (let blade = 0; blade < 5; blade++) for (let layer = 0; layer < 3; layer++) {
    const before = grassBlade(blade, 0, layer), after = grassBlade(blade, 10, layer)
    expect(before).toHaveLength(49)
    expect(after[0]).toEqual(before[0])
    expect(after.map(section => section.y)).toEqual(before.map(section => section.y))
    expect(after.at(-1)!.left).not.toBe(before.at(-1)!.left)
    expect(before.at(-1)!.left).toBe(before.at(-1)!.right)
    expect(before[0].y).toBe(1.04)
  }
})

it("Grass uses green-only light/dark tones, not the warm Fire palette", () => {
  for (const appearance of ["dark", "light"] as const) for (const [red, green, blue] of grassPalette(appearance)) {
    expect(green).toBeGreaterThan(red)
    expect(green).toBeGreaterThan(blue)
  }
  expect(grassPalette("light")).not.toEqual(grassPalette("dark"))
})

it("Grass has static pause/theme repaints, bounded smooth geometry, and no added image/particle layers", () => {
  const scene = createScene("grass")
  const colors = () => drawing.createLinearGradient.mock.results.map(result => result.value.addColorStop.mock.calls)
  scene.resize(800, 600); scene.draw(context, 0.1, 1, "dark")
  const shape = drawing.lineTo.mock.calls.map(call => [...call]), dark = colors()
  expect(drawing.fill).toHaveBeenCalledTimes(15)
  expect(drawing.lineTo).toHaveBeenCalledTimes(1440)
  expect(drawing.drawImage).not.toHaveBeenCalled()
  drawing.createLinearGradient.mockClear(); drawing.lineTo.mockClear(); scene.draw(context, 0, 1, "light")
  expect(drawing.lineTo.mock.calls).toEqual(shape)
  expect(colors()).not.toEqual(dark)
  drawing.createLinearGradient.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(colors()).toEqual(dark)
  scene.resize(390, 844); scene.draw(context, 0, 1)
  scene.resize(800, 600); drawing.lineTo.mockClear(); scene.draw(context, 0, 1)
  expect(drawing.lineTo.mock.calls).toEqual(shape)
})
