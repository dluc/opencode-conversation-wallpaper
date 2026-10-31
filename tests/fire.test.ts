import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { fireFlame, fireLift, firePalette, firePulse, fireWidthScale, FIRE_FLAME_COUNT } from "../src/scenes-fire"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
const gradients = () => drawing.createRadialGradient.mock.results.map(result => result.value.addColorStop.mock.calls)

it("Fire flames are born, grow, narrow/recede, and fade before renewing instead of perpetual grass-like sway", () => {
  expect(FIRE_FLAME_COUNT).toBe(10)
  for (let flame = 0; flame < FIRE_FLAME_COUNT; flame++) {
    const initial = firePulse(flame, 0), birth = (1 - initial.age) * initial.period
    const small = firePulse(flame, birth + initial.period * 0.05)
    const large = firePulse(flame, birth + initial.period * 0.55)
    const receding = firePulse(flame, birth + initial.period * 0.9)
    expect(large.height - small.height).toBeGreaterThan(0.3)
    if (flame % 5 === 2) expect(large.height - small.height).toBeGreaterThan(0.7)
    expect(receding.height).toBeLessThan(large.height * 0.5)
    expect(receding.width).toBeLessThan(large.width)
    expect(firePulse(flame, birth).opacity).toBeCloseTo(0, 10)
    expect(firePulse(flame, birth + initial.period).opacity).toBeCloseTo(0, 10)
    const youngShape = fireFlame(flame, birth + initial.period * 0.05)
    const tallShape = fireFlame(flame, birth + initial.period * 0.55)
    expect(youngShape[0].y).toBe(1.04)
    expect(tallShape[0].y).toBe(1.04)
    expect(youngShape.at(-1)!.y - tallShape.at(-1)!.y).toBeGreaterThan(0.3)
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

it("Fire carries deformation upward and has a taller, stronger central source than its quiet edges", () => {
  for (const height of [0.1, 0.4, 0.8]) expect(fireLift(height + 0.7 / 8 * 2, 7)).toBeCloseTo(fireLift(height, 5), 10)
  const peak = (flame: number) => {
    const pulse = firePulse(flame, 0), birth = (1 - pulse.age) * pulse.period
    return firePulse(flame, birth + pulse.period * 0.55)
  }
  expect(peak(2).height).toBeGreaterThan(peak(0).height * 1.7)
  expect(peak(2).heat).toBeGreaterThan(peak(0).heat * 3)
  expect(peak(2).heat).toBeGreaterThan(peak(1).heat)
  for (const time of [0, 2, 4, 6, 8, 10, 14, 20, 30, 60, 120, 240]) {
    expect(Math.min(...Array.from({ length: FIRE_FLAME_COUNT }, (_, flame) => fireFlame(flame, time).at(-1)!.y))).toBeLessThan(0.35)
  }
})

it("Fire keeps a tall physical width/height ratio in landscape and portrait, not width-stretched leaves", () => {
  const pulse = firePulse(2, 0), peak = (1 - pulse.age + 0.55) * pulse.period
  for (const [width, height] of [[1200, 600], [900, 540], [390, 844], [1, 1]]) {
    const sections = fireFlame(2, peak, fireWidthScale(width, height))
    const bodyWidth = (sections[0].right - sections[0].left) * width
    const bodyHeight = (sections[0].y - sections.at(-1)!.y) * height
    expect(bodyWidth / bodyHeight).toBeGreaterThan(0.15)
    expect(bodyWidth / bodyHeight).toBeLessThan(0.3)
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
  expect(dark).toHaveLength(11) // One shared hearth and ten volume-shaded tongues.
  expect(drawing.fill).toHaveBeenCalledTimes(10)
  expect(drawing.drawImage).not.toHaveBeenCalled()
  expect(drawing.fillRect).toHaveBeenCalledTimes(1)
  expect(drawing.createLinearGradient).not.toHaveBeenCalled()
  const coreStops = dark[3] // Hearth, outer flame, side flame, central flame.
  expect(coreStops[0][1]).toContain("255, 214, 109")
  expect(coreStops.at(-1)![1]).toMatch(/, 0\)$/)
  expect(coreStops.map(([stop]: [number, string]) => stop)).toEqual([0, 0.18, 0.42, 0.72, 1])
  drawing.createRadialGradient.mockClear(); drawing.lineTo.mockClear()
  scene.draw(context, 0, 1, "dark")
  expect(gradients()).toEqual(dark)
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  drawing.createRadialGradient.mockClear(); scene.draw(context, 0, 1, "light")
  expect(gradients()).not.toEqual(dark)
  drawing.createRadialGradient.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(gradients()).toEqual(dark)
  for (const [width, height] of [[1200, 600], [390, 844], [7680, 4320], [1, 1]]) {
    drawing.lineTo.mockClear(); scene.resize(width, height); scene.draw(context, 0, 1)
    expect(drawing.lineTo).toHaveBeenCalledTimes(960)
    expect(drawing.lineTo.mock.calls.every(([x, y]) => Number.isFinite(x) && Math.abs(x) < 3 && y >= -1.0000001 && y <= 0.0000001)).toBe(true)
  }
  scene.resize(800, 600); drawing.lineTo.mockClear(); scene.draw(context, 0, 1, "dark")
  expect(drawing.lineTo.mock.calls).toEqual(contour)
  scene.resize(0, 0); drawing.fill.mockClear(); scene.draw(context, 0.1, 1)
  expect(drawing.fill).not.toHaveBeenCalled()
})
