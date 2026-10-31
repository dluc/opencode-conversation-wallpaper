import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { fireLift, FIRE_MAX_PIXELS, FIRE_PALETTES } from "../src/scenes-fire"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
function frame() {
  const image = drawing.putImageData.mock.calls.at(-1)![0] as ImageData
  return { width: image.width, height: image.height, data: new Uint8ClampedArray(image.data) }
}

it("Fire carries its broad deformation upward rather than scrolling a fixed picture", () => {
  // The travelling deformation advances 0.26 / 8 canvas heights per second.
  for (const height of [0.1, 0.4, 0.8]) {
    expect(fireLift(height + 0.26 / 8 * 2, 7)).toBeCloseTo(fireLift(height, 5), 10)
  }
  const scene = createScene("fire")
  scene.resize(800, 600); scene.draw(context, 0, 1)
  const before = frame()
  for (let i = 0; i < 100; i++) scene.draw(context, 0.1, 1)
  const after = frame()
  expect(after.data).not.toEqual(before.data)
  // Each broad tongue also changes its silhouette, not merely its vertical phase.
  const edge = (image: ReturnType<typeof frame>) => Array.from({ length: image.width }, (_, x) => {
    for (let y = 0; y < image.height; y++) if (image.data[(y * image.width + x) * 4 + 3]) return y
    return image.height
  })
  const afterEdge = edge(after), shifts = edge(before).map((value, x) => afterEdge[x] - value)
  expect(new Set(shifts).size).toBeGreaterThan(10)
})

it("Fire covers most of landscape and portrait canvases with five fixed warm pigments", () => {
  for (const appearance of ["dark", "light"] as const) for (const [width, height] of [[1200, 600], [390, 844]]) {
    const scene = createScene("fire")
    scene.resize(width, height)
    for (const elapsed of [0, 10, 20]) {
      for (let i = 0; i < elapsed * 10; i++) scene.draw(context, 0.1, 1, appearance)
      scene.draw(context, 0, 1, appearance)
      const image = frame(), colors = new Set<string>(), alphas = new Set<number>()
      let painted = 0, upper = 0, bottom = 0
      for (let pixel = 0; pixel < image.data.length / 4; pixel++) {
        if (!image.data[pixel * 4 + 3]) continue
        painted++
        if (pixel < image.width * image.height * 0.2) upper++
        if (pixel >= image.width * (image.height - 1)) bottom++
        colors.add([...image.data.slice(pixel * 4, pixel * 4 + 3)].join(","))
        alphas.add(image.data[pixel * 4 + 3])
      }
      expect(painted / (image.width * image.height)).toBeGreaterThan(0.75)
      expect(upper).toBeGreaterThan(image.width * image.height * 0.05)
      expect(bottom).toBe(image.width)
      expect([...alphas]).toEqual([175])
      expect([...colors].sort()).toEqual(FIRE_PALETTES[appearance].map(color => color.join(",")).sort())
      expect(drawing.drawImage).toHaveBeenLastCalledWith(expect.any(HTMLCanvasElement), 0, 0, width, height)
    }
  }
})

it("Fire reuses a bounded raster, preserves paused time on resize, and restores dark colors", () => {
  const scene = createScene("fire")
  scene.resize(800, 600); scene.draw(context, 0.1, 1, "dark")
  const dark = frame(), allocations = drawing.createImageData.mock.calls.length
  scene.draw(context, 0, 1, "dark")
  expect(frame().data).toEqual(dark.data)
  expect(drawing.createImageData).toHaveBeenCalledTimes(allocations)
  scene.draw(context, 0, 1, "light")
  expect(frame().data).not.toEqual(dark.data)
  scene.draw(context, 0, 1, "dark")
  expect(frame().data).toEqual(dark.data)
  for (const [width, height] of [[7680, 4320], [4320, 7680], [20000, 20], [1, 1]]) {
    scene.resize(width, height); scene.draw(context, 0, 1)
    const image = frame()
    expect(image.width * image.height).toBeLessThanOrEqual(FIRE_MAX_PIXELS)
    expect(Math.max(image.width, image.height)).toBeLessThanOrEqual(320)
  }
  scene.resize(800, 600); scene.draw(context, 0, 1, "dark")
  expect(frame().data).toEqual(dark.data)
  scene.resize(0, 0)
  const paints = drawing.putImageData.mock.calls.length
  scene.draw(context, 0.1, 1)
  expect(drawing.putImageData).toHaveBeenCalledTimes(paints)
})

it("Fire changes gradually without randomized dither or whole-frame flicker", () => {
  const scene = createScene("fire")
  scene.resize(800, 600); scene.draw(context, 0, 1)
  let before = frame()
  for (let step = 0; step < 20; step++) {
    scene.draw(context, 0.1, 1)
    const after = frame()
    let changed = 0
    for (let pixel = 0; pixel < after.data.length / 4; pixel++) {
      const offset = pixel * 4
      if (after.data[offset] !== before.data[offset] || after.data[offset + 3] !== before.data[offset + 3]) changed++
    }
    expect(changed / (after.width * after.height)).toBeLessThan(0.02)
    before = after
  }
})
