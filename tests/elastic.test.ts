import { expect, it } from "vitest"
import { elasticBlocks } from "../src/scenes-elastic"
import { createScene } from "../src/scenes"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
const positions = () => [...drawing.moveTo.mock.calls, ...drawing.lineTo.mock.calls].map(point => [...point])

it("Elastic stays bounded with one amber region and non-overlapping positive blocks", () => {
  for (let time = 0; time <= 360; time += 0.5) {
    const blocks = elasticBlocks(time)
    expect(blocks.length).toBeGreaterThanOrEqual(9)
    expect(blocks.length).toBeLessThanOrEqual(10)
    expect(blocks.filter(block => block.material === 3)).toHaveLength(1)
    for (const block of blocks) {
      expect(block.width).toBeGreaterThan(0)
      expect(block.height).toBeGreaterThan(0)
      expect(block.opacity).toBeGreaterThanOrEqual(0)
      expect(block.opacity).toBeLessThanOrEqual(1)
      expect(block.x).toBeGreaterThanOrEqual(-1)
      expect(block.y).toBeGreaterThanOrEqual(-1)
      expect(block.x + block.width).toBeLessThanOrEqual(2)
      expect(block.y + block.height).toBeLessThanOrEqual(2)
    }
    for (let a = 0; a < blocks.length; a++) for (let b = a + 1; b < blocks.length; b++) {
      const first = blocks[a], second = blocks[b]
      const overlapX = Math.min(first.x + first.width, second.x + second.width) - Math.max(first.x, second.x)
      const overlapY = Math.min(first.y + first.height, second.y + second.height) - Math.max(first.y, second.y)
      expect(overlapX > 1e-10 && overlapY > 1e-10).toBe(false)
    }
  }
})

it("Elastic subdivides and rejoins gradually instead of popping or scrolling a fixed board", () => {
  const whole = elasticBlocks(0), divided = elasticBlocks(30), rejoined = elasticBlocks(60)
  expect(whole).toHaveLength(9)
  expect(divided).toHaveLength(10)
  expect(rejoined).toHaveLength(9)
  expect(divided.find(block => block.material === 3)!.width).toBeLessThan(whole.find(block => block.material === 3)!.width)
  const beginning = elasticBlocks(0.01).find(block => block.opacity < 1)!
  expect(beginning.width).toBeLessThan(0.00001)
  expect(beginning.opacity).toBeLessThan(0.00001)
  const a = elasticBlocks(15), b = elasticBlocks(15.1)
  expect(a).toHaveLength(b.length)
  for (let i = 0; i < a.length; i++) for (const key of ["x", "y", "width", "height"] as const) {
    expect(Math.abs(a[i][key] - b[i][key])).toBeLessThan(0.002)
  }
})

it("Elastic preserves geometry/time through paused theme switches and resizing", () => {
  const scene = createScene("elastic")
  const paint = (appearance: "dark" | "light") => {
    drawing.moveTo.mockClear(); drawing.lineTo.mockClear(); drawing.createLinearGradient.mockClear()
    scene.draw(context, 0, 1, appearance)
    const colors = drawing.createLinearGradient.mock.results.flatMap(result => result.value.addColorStop.mock.calls.map((call: [number, string]) => call[1]))
    return { positions: positions(), colors }
  }
  scene.resize(800, 600); scene.draw(context, 0.1, 1)
  const dark = paint("dark"), light = paint("light")
  expect(light.positions).toEqual(dark.positions)
  expect(light.colors).not.toEqual(dark.colors)
  expect(paint("dark")).toEqual(dark)
  for (const [width, height] of [[1200, 600], [390, 844], [7680, 4320], [1, 1]]) {
    scene.resize(width, height)
    const frame = paint("dark")
    expect(frame.positions.every(point => point.every(Number.isFinite))).toBe(true)
    expect(drawing.createLinearGradient.mock.calls.length).toBeLessThanOrEqual(10)
    expect(frame.positions.some(([x]) => x < 0)).toBe(true)
    expect(frame.positions.some(([x]) => x > width)).toBe(true)
    expect(frame.positions.some(([, y]) => y < 0)).toBe(true)
    expect(frame.positions.some(([, y]) => y > height)).toBe(true)
  }
  scene.resize(800, 600)
  expect(paint("dark")).toEqual(dark)
  scene.resize(0, 0); drawing.fill.mockClear(); scene.draw(context, 0.1, 1)
  expect(drawing.fill).not.toHaveBeenCalled()
  expect(drawing.fillText).not.toHaveBeenCalled()
  expect(drawing.drawImage).not.toHaveBeenCalled()
  expect(drawing.createRadialGradient).not.toHaveBeenCalled()
})
