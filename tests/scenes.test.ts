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
