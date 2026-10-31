import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { Fire, fireColorTable } from "../src/scenes-fire"
import { drawing } from "./environment"
import { MAX_SPEED } from "../src/preferences"

const context = drawing as unknown as CanvasRenderingContext2D
const pixels = () => new Uint8ClampedArray((drawing.putImageData.mock.calls.at(-1)![0] as ImageData).data)

it("registered Fire is the transported field, with a formed first frame and no simulation warm-up", () => {
  const scene = createScene("fire") as Fire
  expect(scene).toBeInstanceOf(Fire)
  expect(scene.model.steps).toBe(0)
  expect(scene.model.time).toBe(0)
  scene.resize(900, 540); scene.draw(context, 0, 1, "dark")
  expect(pixels().some((value, i) => i % 4 === 3 && value > 0)).toBe(true)
  expect(scene.model.steps).toBe(0)
  expect(drawing.createImageData).toHaveBeenCalledTimes(1)
})

it("Fire freezes field age and pixels while paused, including repaint/theme/resize changes", () => {
  const scene = new Fire()
  scene.resize(800, 600); scene.draw(context, 0.1, 1, "dark")
  const dark = pixels(), field = new Float32Array(scene.model.emission), age = scene.model.time
  const paints = drawing.putImageData.mock.calls.length
  scene.draw(context, 0, 1, "dark")
  expect(drawing.putImageData).toHaveBeenCalledTimes(paints)
  expect(scene.model.emission).toEqual(field)
  scene.draw(context, 0, 1, "light")
  expect(pixels()).not.toEqual(dark)
  expect(scene.model.time).toBe(age)
  expect(scene.model.emission).toEqual(field)
  scene.draw(context, 0, 1, "dark")
  expect(pixels()).toEqual(dark)
  for (const [width, height] of [[1200, 600], [390, 844], [7680, 4320], [1, 1]]) {
    scene.resize(width, height); scene.draw(context, 0, 1)
    expect(scene.model.time).toBe(age)
    expect(scene.model.emission).toEqual(field)
    expect(drawing.drawImage).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement),
      (width - height / 2.4 * 2.2) / 2, 0, height / 2.4 * 2.2, height)
  }
  expect(drawing.createImageData).toHaveBeenCalledTimes(1)
})

it("Fire has cached, continuous warm transfer tables, with a defined edge and no dithering", () => {
  for (const appearance of ["dark", "light"] as const) {
    const table = fireColorTable(appearance)
    expect(table).toBe(fireColorTable(appearance))
    expect(table).toHaveLength(4096)
    expect(table[3]).toBe(0)
    for (let i = 0; i < table.length; i += 4) {
      expect(table[i]).toBeGreaterThan(table[i + 1])
      expect(table[i + 1]).toBeGreaterThan(table[i + 2])
      expect(table[i + 3]).toBeLessThanOrEqual(235)
      if (i) expect(table[i + 3]).toBeGreaterThanOrEqual(table[i - 1])
    }
  }
  expect(fireColorTable("light")).not.toEqual(fireColorTable("dark"))
})

it("Fire advances only with positive elapsed time and bounds work at shared maximum speed", () => {
  const scene = new Fire()
  scene.resize(800, 600); scene.draw(context, 0, 1)
  const still = pixels()
  scene.draw(context, 0.1, MAX_SPEED)
  expect(scene.model.steps).toBe(30)
  expect(pixels()).not.toEqual(still)
  const age = scene.model.time, paints = drawing.putImageData.mock.calls.length
  scene.resize(0, 0); scene.draw(context, 0.1, MAX_SPEED)
  expect(scene.model.time).toBe(age)
  expect(drawing.putImageData).toHaveBeenCalledTimes(paints)
})
