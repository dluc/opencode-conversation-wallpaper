import { describe, expect, it, vi } from "vitest"
import { collection, createScene, wallpaperName } from "../src/scenes"
import { MAX_SPEED, MODES } from "../src/preferences"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
function commands() {
  return [drawing.fillText, drawing.drawImage, drawing.arc, drawing.ellipse, drawing.moveTo, drawing.lineTo, drawing.fillRect, drawing.strokeRect].map(fn => [...fn.mock.calls])
}
function clearCommands() {
  for (const fn of [drawing.fillText, drawing.drawImage, drawing.arc, drawing.ellipse, drawing.moveTo, drawing.lineTo, drawing.fillRect, drawing.strokeRect]) fn.mockClear()
}

describe("wallpaper collection", () => {
  it("keeps clouds horizontal and the night sky rotating around a fixed pole", () => {
    const clouds = createScene("clouds")
    clouds.resize(800, 600); clouds.draw(context, 0, 1)
    const before = drawing.drawImage.mock.calls[0]
    drawing.drawImage.mockClear(); clouds.draw(context, 0.1, 1)
    expect(drawing.drawImage.mock.calls[0][1]).toBeGreaterThan(before[1])
    expect(drawing.drawImage.mock.calls[0][2]).toBe(before[2])
    const sky = createScene("night-sky")
    sky.resize(800, 600); drawing.arc.mockClear(); sky.draw(context, 0, 1)
    const star = drawing.arc.mock.calls[1]
    drawing.arc.mockClear(); sky.draw(context, 0.1, 1)
    const moved = drawing.arc.mock.calls[1]
    expect(moved.slice(0, 2)).not.toEqual(star.slice(0, 2))
    expect(Math.hypot(moved[0] - 400, moved[1] - 78)).toBeCloseTo(Math.hypot(star[0] - 400, star[1] - 78), 6)
  })
  it("uses blue-gray cloud textures in light mode, and rebuilds the original texture when returning to dark mode", () => {
    const scene = createScene("clouds")
    scene.resize(800, 600)
    scene.draw(context, 0, 1, "dark")
    const darkSprite = drawing.drawImage.mock.calls[0][0]
    const gradients = () => drawing.createRadialGradient.mock.results.flatMap(result => result.value.addColorStop.mock.calls)
    expect(gradients().some(call => String(call[1]).includes("176, 204, 235"))).toBe(true)
    drawing.createRadialGradient.mockClear(); drawing.drawImage.mockClear()
    scene.draw(context, 0, 1, "light")
    expect(gradients().some(call => String(call[1]).includes("35, 65, 95"))).toBe(true)
    expect(drawing.drawImage.mock.calls[0][0]).not.toBe(darkSprite)
    drawing.createRadialGradient.mockClear()
    scene.draw(context, 0, 1, "dark")
    expect(gradients().some(call => String(call[1]).includes("176, 204, 235"))).toBe(true)
  })
  for (const [mode, dark, light] of [["fireflies", "#edf8b1", "#945308"], ["starfield", "#d8eaff", "#254466"]] as const) {
    it(`${mode} uses a contrasting light palette and restores its dark palette without reseeding`, () => {
      const random = vi.spyOn(Math, "random").mockReturnValue(0.5)
      try {
        const scene = createScene(mode)
        scene.resize(800, 600)
        scene.draw(context, 0, 1, "dark")
        expect(drawing.fillStyle).toBe(dark)
        clearCommands()
        scene.draw(context, 0, 1, "dark")
        const darkPositions = [...drawing.arc.mock.calls].map(call => call.slice(0, 2))
        scene.draw(context, 0, 1, "light")
        expect(drawing.fillStyle).toBe(light)
        clearCommands()
        scene.draw(context, 0, 1, "dark")
        expect(drawing.fillStyle).toBe(dark)
        expect(drawing.arc.mock.calls.map(call => call.slice(0, 2))).toEqual(darkPositions)
      } finally { random.mockRestore() }
    })
  }
  it("offers each built-in exactly once without a user-configurable direction", () => {
    expect(collection.map(scene => scene.id)).toEqual(MODES.filter(mode => mode !== "image"))
    expect(new Set(collection.map(scene => scene.id)).size).toBe(19)
    expect(wallpaperName("image")).toBe("Your image")
  })
  for (const entry of collection) {
    it(`${entry.title} really runs at 4x instead of silently clamping at 2x`, () => {
      const random = vi.spyOn(Math, "random").mockReturnValue(0.5)
      try {
        const standard = createScene(entry.id), maximum = createScene(entry.id)
        standard.resize(800, 600); maximum.resize(800, 600)
        standard.draw(context, 0, 1); maximum.draw(context, 0, 1)
        clearCommands()
        standard.draw(context, 0.1, 1)
        const normal = commands()
        clearCommands()
        expect(MAX_SPEED).toBe(4)
        maximum.draw(context, 0.025, MAX_SPEED)
        expect(commands()).toEqual(normal)
      } finally { random.mockRestore() }
    })
    it(`${entry.title} paints a stable still frame and advances with elapsed time`, () => {
      const random = vi.spyOn(Math, "random").mockReturnValue(0.5)
      try {
        const scene = createScene(entry.id)
        scene.resize(800, 600)
        scene.draw(context, 0, 1) // initializes any reusable sprites
        clearCommands()
        scene.draw(context, 0, 1)
        const still = commands()
        expect(still.some(calls => calls.length > 0)).toBe(true)
        clearCommands()
        scene.draw(context, 0, 1)
        expect(commands()).toEqual(still)
        clearCommands()
        scene.draw(context, 0.1, 1)
        if (entry.id === "life") {
          // Cellular evolution advances once per 0.3 simulated seconds, not on every draw.
          clearCommands(); scene.draw(context, 0.1, 1)
          clearCommands(); scene.draw(context, 0.1, 1)
        }
        expect(commands()).not.toEqual(still)
      } finally { random.mockRestore() }
    })
    it(`${entry.title} scales motion by speed and handles empty/changed layouts`, () => {
      const random = vi.spyOn(Math, "random").mockReturnValue(0.5)
      try {
        const slow = createScene(entry.id), fast = createScene(entry.id)
        slow.resize(800, 600); fast.resize(800, 600)
        slow.draw(context, 0, 1); fast.draw(context, 0, 1)
        clearCommands()
        slow.draw(context, 0.1, 0.5)
        const halfSpeed = commands()
        clearCommands()
        fast.draw(context, 0.05, 1)
        expect(commands()).toEqual(halfSpeed)
        expect(() => {
          slow.resize(0, 0); slow.draw(context, 0.1, 1)
          slow.resize(1, 1); slow.draw(context, 0.1, 1)
          slow.resize(390, 844); slow.draw(context, 0.1, 2)
        }).not.toThrow()
      } finally { random.mockRestore() }
    })
  }
})
