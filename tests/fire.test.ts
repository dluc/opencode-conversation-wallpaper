import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { fireFlame, fireLift, firePalette, firePulse, FIRE_FLAME_COUNT } from "../src/scenes-fire"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
const gradients = () => drawing.createLinearGradient.mock.results.map(result => result.value.addColorStop.mock.calls)

it("Fire flames are born, grow, narrow/recede, and fade before renewing instead of perpetual grass-like sway", () => {
  expect(FIRE_FLAME_COUNT).toBe(10)
  for (let flame = 0; flame < FIRE_FLAME_COUNT; flame++) {
    const initial = firePulse(flame, 0), birth = (1 - initial.age) * initial.period
    const small = firePulse(flame, birth + initial.period * 0.05)
    const large = firePulse(flame, birth + initial.period * 0.55)
    const receding = firePulse(flame, birth + initial.period * 0.9)
    expect(large.height - small.height).toBeGreaterThan(0.6)
    expect(receding.height).toBeLessThan(large.height * 0.5)
    expect(receding.width).toBeLessThan(large.width)
    expect(firePulse(flame, birth).opacity).toBeCloseTo(0, 10)
    expect(firePulse(flame, birth + initial.period).opacity).toBeCloseTo(0, 10)
    const youngShape = fireFlame(flame, birth + initial.period * 0.05)
    const tallShape = fireFlame(flame, birth + initial.period * 0.55)
    expect(youngShape[0].y).toBe(1.04)
    expect(tallShape[0].y).toBe(1.04)
    expect(youngShape.at(-1)!.y - tallShape.at(-1)!.y).toBeGreaterThan(0.6)
    expect(tallShape.at(-1)!.left).toBe(tallShape.at(-1)!.right)
  }
})

it("Fire lifetimes are staggered and renew smoothly, with no synchronized fade or reset pop", () => {
  expect(new Set(Array.from({ length: FIRE_FLAME_COUNT }, (_, flame) => firePulse(flame, 0).period)).size).toBe(5)
  for (let time = 0; time <= 60; time += 0.1) {
    const pulses = Array.from({ length: FIRE_FLAME_COUNT }, (_, flame) => firePulse(flame, time))
    expect(pulses.filter(pulse => pulse.opacity > 0.5).length).toBeGreaterThanOrEqual(5)
    for (let flame = 0; flame < FIRE_FLAME_COUNT; flame++) {
      expect(Math.abs(firePulse(flame, time + 0.1).opacity - pulses[flame].opacity)).toBeLessThan(0.13)
    }
  }
})

it("Fire carries deformation upward and remains broad while its flame tips grow and recede", () => {
  for (const height of [0.1, 0.4, 0.8]) expect(fireLift(height + 0.7 / 8 * 2, 7)).toBeCloseTo(fireLift(height, 5), 10)
  for (const time of [0, 2, 4, 6, 8, 10, 14, 20, 30, 60, 120, 240]) {
    const shapes = Array.from({ length: FIRE_FLAME_COUNT }, (_, flame) => fireFlame(flame, time))
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
      for (const span of spans) { coverage += Math.max(0, span.right - Math.max(end, span.left)) / 100; end = Math.max(end, span.right) }
    }
    expect(coverage).toBeGreaterThan(0.4)
    expect(coverage).toBeLessThan(0.95)
    expect(Math.min(...shapes.map(shape => shape.at(-1)!.y))).toBeLessThan(0.35)
  }
})

it("Fire stays red/orange/yellow, with contrasting light/dark palettes", () => {
  for (const appearance of ["dark", "light"] as const) for (const [red, green, blue] of firePalette(appearance)) {
    expect(red).toBeGreaterThan(green)
    expect(green).toBeGreaterThan(blue)
    expect(red).toBeGreaterThan(blue * 1.8)
  }
  expect(firePalette("light")).not.toEqual(firePalette("dark"))
})

it("Fire uses bounded vector geometry and preserves paused age/shape across theme and resize changes", () => {
  const scene = createScene("fire")
  scene.resize(800, 600); scene.draw(context, 0.1, 1, "dark")
  const dark = gradients(), contour = drawing.lineTo.mock.calls.map(call => [...call])
  expect(dark).toHaveLength(30)
  expect(drawing.fill).toHaveBeenCalledTimes(30)
  expect(drawing.drawImage).not.toHaveBeenCalled()
  expect(drawing.fillRect).not.toHaveBeenCalled()
  drawing.createLinearGradient.mockClear(); drawing.lineTo.mockClear()
  scene.draw(context, 0, 1, "dark")
  expect(gradients()).toEqual(dark)
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  drawing.createLinearGradient.mockClear(); scene.draw(context, 0, 1, "light")
  expect(gradients()).not.toEqual(dark)
  drawing.createLinearGradient.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(gradients()).toEqual(dark)
  for (const [width, height] of [[1200, 600], [390, 844], [7680, 4320], [1, 1]]) {
    drawing.lineTo.mockClear(); scene.resize(width, height); scene.draw(context, 0, 1)
    expect(drawing.lineTo).toHaveBeenCalledTimes(2880)
    expect(drawing.lineTo.mock.calls.every(([x, y]) => Number.isFinite(x) && x >= -width * 0.4 && x <= width * 1.4 && y >= 0 && y <= height * 1.04)).toBe(true)
  }
  scene.resize(800, 600); drawing.lineTo.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  scene.resize(0, 0); drawing.fill.mockClear(); scene.draw(context, 0.1, 1)
  expect(drawing.fill).not.toHaveBeenCalled()
})
