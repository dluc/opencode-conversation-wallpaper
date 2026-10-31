import { expect, it, vi } from "vitest"
import { ScenePool } from "../src/scene-pool"
import { collection, createScene } from "../src/scenes"
import type { Scene } from "../src/scene"
import { drawing } from "./environment"

const context = drawing as unknown as CanvasRenderingContext2D

it("staggered view frame limits use shared elapsed time instead of doubling motion", () => {
  let time = 0
  const scene: Scene = { resize: vi.fn(), draw: (_ctx, elapsed) => { time += elapsed } }
  const pool = new ScenePool(() => scene), a = pool.view("aurora"), b = pool.view("aurora")
  for (const view of [a, b]) { view.resize(800, 400); view.setActive(true) }
  a.draw(context, 0.05, 1, "dark", 100)
  b.draw(context, 0.05, 1, "dark", 125)
  a.draw(context, 0.05, 1, "dark", 150)
  b.draw(context, 0.05, 1, "dark", 175)
  a.draw(context, 0.05, 1, "dark", 200)
  expect(time).toBeCloseTo(0.15)
  pool.dispose()
})

it("one global simulation advances once per frame, not once per visible view", () => {
  let time = 0
  const scene: Scene = { resize: vi.fn(), draw: vi.fn((_ctx, elapsed, speed) => { time += elapsed * speed }) }
  const pool = new ScenePool(() => scene), a = pool.view("aurora"), b = pool.view("aurora", 1)
  a.resize(800, 240); b.resize(800, 600); a.setActive(true); b.setActive(true)
  a.draw(context, 0, 1, "dark", 100)
  expect(scene.resize).toHaveBeenLastCalledWith(800, 600)
  a.draw(context, 0.05, 1, "dark", 150); b.draw(context, 0.05, 1, "dark", 150)
  expect(time).toBe(0.05)
  b.draw(context, 0.05, 10, "dark", 200); a.draw(context, 0.05, 10, "dark", 200)
  expect(time).toBe(0.55)
  a.setActive(false, true); b.setActive(false, true)
  a.draw(context, 20, 10, "light", 9000)
  expect(time).toBe(0.55)
  pool.dispose()
})

for (const wallpaper of collection) it(`${wallpaper.title} retains its scene across conversation removal/remount and mode changes`, () => {
  const factory = vi.fn(createScene), pool = new ScenePool(factory)
  const first = pool.view(wallpaper.id, 1)
  first.resize(800, 600); first.setActive(true)
  first.draw(context, 0, 1, "dark", 100); first.draw(context, 0.1, 1, "dark", 200)
  const scene = factory.mock.results[0].value, draw = vi.spyOn(scene, "draw"), resize = vi.spyOn(scene, "resize")
  first.dispose()
  const other = pool.view(wallpaper.id === "aurora" ? "elastic" : "aurora")
  other.resize(500, 300); other.setActive(true); other.draw(context, 0.1, 1, "dark", 300); other.dispose()
  const second = pool.view(wallpaper.id, 1)
  second.resize(800, 600); second.setActive(false, true)
  const random = vi.spyOn(Math, "random")
  second.draw(context, 0, 1, "dark", 9000)
  expect(factory.mock.calls.filter(([mode]) => mode === wallpaper.id)).toHaveLength(1)
  expect(draw).toHaveBeenLastCalledWith(expect.anything(), 0, 1, "dark")
  expect(resize).not.toHaveBeenCalled()
  expect(random).not.toHaveBeenCalled()
  random.mockRestore(); second.dispose(); pool.dispose()
})

it("paused visible layouts repaint on resize, while hidden cached timelines cannot take over layout", () => {
  const scene: Scene = { resize: vi.fn(), draw: vi.fn() }, pool = new ScenePool(() => scene)
  const visible = pool.view("fire"), hidden = pool.view("fire", 1)
  visible.resize(800, 400); hidden.resize(1600, 900)
  visible.setActive(false, true); hidden.setActive(false, false)
  visible.draw(context, 0, 1, "dark", 100)
  expect(scene.resize).toHaveBeenLastCalledWith(800, 400)
  visible.resize(390, 844); hidden.draw(context, 0, 1, "light", 100)
  expect(scene.resize).toHaveBeenLastCalledWith(390, 844)
  pool.dispose()
})
