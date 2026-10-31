import { expect, it } from "vitest"
import { FireField, flowNoise } from "../src/fire"

const advance = (field: FireField, seconds: number) => {
  for (let frame = 0; frame < Math.round(seconds * 30); frame++) field.advance(1 / 30)
}

it("Fire's coherent noise is deterministic, continuous, and bounded, not frame-random grain", () => {
  for (let i = 0; i < 50; i++) {
    const x = i * 0.173, y = i * 0.317 - 4, z = i * 0.091
    expect(flowNoise(x, y, z)).toBe(flowNoise(x, y, z))
    expect(Math.abs(flowNoise(x, y, z))).toBeLessThanOrEqual(1)
    expect(Math.abs(flowNoise(x + 0.001, y, z) - flowNoise(x, y, z))).toBeLessThan(0.01)
  }
})

it("a formed first frame is seeded directly without pre-warming simulation or advancing its clock", () => {
  const field = new FireField(96, 160, true)
  expect(field.steps).toBe(0)
  expect(field.time).toBe(0)
  expect(field.previous).toEqual(field.emission)
  expect(Math.max(...field.emission)).toBeGreaterThan(0.5)
  expect([...field.emission].filter(value => value > 0.1).length).toBeGreaterThan(1000)
  const before = new Float32Array(field.emission)
  field.advance(0)
  expect(field.emission).toEqual(before)
})

it("render interpolation is bounded and frozen with zero time instead of stepping at low playback speeds", () => {
  const field = new FireField(48, 80, true)
  field.advance(0.05)
  expect(field.steps).toBe(1)
  expect(field.phase).toBeCloseTo(0.5, 10)
  expect(field.previous).not.toEqual(field.emission)
  const phase = field.phase, previous = new Float32Array(field.previous)
  field.advance(0)
  expect(field.phase).toBe(phase)
  expect(field.previous).toEqual(previous)
})

it("the emission/velocity grids are bounded and reused instead of accumulating flame objects", () => {
  const field = new FireField()
  expect(field.emission).toHaveLength(96 * 160)
  const emission = field.emission, vx = field.velocityX, vy = field.velocityY
  advance(field, 3)
  expect(field.emission).toBe(emission)
  expect(field.velocityX).toBe(vx)
  expect(field.velocityY).toBe(vy)
  expect([...field.emission].every(value => Number.isFinite(value) && value >= 0 && value <= 1.3)).toBe(true)
  expect([...vx, ...vy].every(Number.isFinite)).toBe(true)
  const bounded = new FireField(10000, 10000)
  expect(bounded.columns * bounded.rows).toBeLessThanOrEqual(128 * 192)
})

it("fixed-step transport is independent of painted frame grouping, and zero elapsed freezes state", () => {
  const a = new FireField(48, 80), b = new FireField(48, 80)
  for (let frame = 0; frame < 20; frame++) a.advance(0.1)
  advance(b, 2)
  expect(a.steps).toBe(60)
  expect(a.emission).toEqual(b.emission)
  const still = new Float32Array(a.emission), time = a.time, steps = a.steps
  for (let frame = 0; frame < 10; frame++) a.advance(0)
  a.advance(Number.NaN); a.advance(-1)
  expect(a.emission).toEqual(still)
  expect(a.time).toBe(time)
  expect(a.steps).toBe(steps)
  a.advance(1000)
  expect(a.steps - steps).toBe(30) // A 10x frame stays bounded, without a hidden 4x clamp.
})

it("the shared source is strongest near the base center and the flow has actual lateral curl", () => {
  const field = new FireField(48, 80)
  advance(field, 2)
  const row = field.emission.slice(0, field.columns)
  expect(row[Math.floor(field.columns / 2)]).toBeGreaterThan(row[3] * 5)
  expect(row[Math.floor(field.columns / 2)]).toBeGreaterThan(row[field.columns - 4] * 5)
  expect(Math.min(...field.velocityX)).toBeLessThan(-0.02)
  expect(Math.max(...field.velocityX)).toBeGreaterThan(0.02)
  const middle = Math.floor(field.columns / 2)
  expect(field.velocityY[Math.floor(field.rows / 2) * field.columns + middle]).toBeGreaterThan(0.1)
})

it("emission travels upward through the flow rather than resizing a stationary flame outline", () => {
  const field = new FireField(48, 80)
  field.sourceEnabled = false
  for (let y = 8; y <= 13; y++) for (let x = 20; x <= 27; x++) field.emission[y * field.columns + x] = 1
  const centroid = () => {
    let mass = 0, height = 0
    field.emission.forEach((value, id) => { mass += value; height += value * Math.floor(id / field.columns) })
    return height / mass
  }
  const before = centroid()
  advance(field, 1)
  expect(centroid()).toBeGreaterThan(before + 6)
  expect(Math.max(...field.emission)).toBeLessThan(1)
})

it("the field extinguishes without a source instead of retaining persistent leaf-shaped objects", () => {
  const field = new FireField(32, 48)
  advance(field, 3)
  expect(Math.max(...field.emission)).toBeGreaterThan(0.5)
  field.sourceEnabled = false
  advance(field, 12)
  expect(Math.max(...field.emission)).toBeLessThan(0.001)
})
