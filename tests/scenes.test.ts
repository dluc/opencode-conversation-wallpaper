import { describe, expect, it, vi } from "vitest"
import { collection, createScene, wallpaperName } from "../src/scenes"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D
function commands() {
  return [drawing.fillText, drawing.drawImage, drawing.arc, drawing.moveTo, drawing.lineTo].map(fn => [...fn.mock.calls])
}
function clearCommands() {
  for (const fn of [drawing.fillText, drawing.drawImage, drawing.arc, drawing.moveTo, drawing.lineTo]) fn.mockClear()
}

describe("wallpaper collection", () => {
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
  it("offers five distinct effects without a user-configurable direction", () => {
    expect(collection.map(scene => scene.id)).toEqual(["matrix", "clouds", "fireflies", "starfield", "aurora"])
    expect(wallpaperName("image")).toBe("Your image")
  })
  for (const entry of collection) {
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
          slow.resize(390, 844); slow.draw(context, 0.1, 2)
        }).not.toThrow()
      } finally { random.mockRestore() }
    })
  }
})
