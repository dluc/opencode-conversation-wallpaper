import { expect, it, vi } from "vitest"
import { ImagePool } from "../src/image-pool"
import { drawing, runFrame } from "./environment"

const source = "data:image/gif;base64,R0lGODlhAQABAIA="
const layer = () => { const host = document.createElement("div"), still = document.createElement("canvas"); host.append(still); document.body.append(host); return { host, still } }

it("conversation handoff reuses the actual image decoder without reassigning its source", () => {
  const pool = new ImagePool(), first = layer(), a = pool.view(first.host, first.still, vi.fn(), 1)
  a.update(source, "cover", true, true, false)
  const image = first.host.querySelector("img")!
  Object.defineProperties(image, { complete: { configurable: true, value: true }, naturalWidth: { configurable: true, value: 16 }, naturalHeight: { configurable: true, value: 16 } })
  image.dispatchEvent(new Event("load"))
  const set = vi.spyOn(image, "src", "set")
  a.dispose()
  const second = layer(), b = pool.view(second.host, second.still, vi.fn(), 1)
  b.update(source, "cover", false, false, false) // Visibility observer has not reported the new host yet.
  b.update(source, "cover", true, true, false)
  runFrame(100)
  expect(second.host.querySelector("img")).toBe(image)
  expect(image.getAttribute("src")).toBe(source)
  expect(set).not.toHaveBeenCalled()
  pool.dispose()
})

it("explicit pause still snapshots and unloads the shared GIF source, including secondary views", () => {
  const pool = new ImagePool(), first = layer(), second = layer()
  const a = pool.view(first.host, first.still, vi.fn(), 1), b = pool.view(second.host, second.still, vi.fn())
  a.update(source, "cover", true, true, false)
  const image = first.host.querySelector("img")!
  Object.defineProperties(image, { complete: { configurable: true, value: true }, naturalWidth: { configurable: true, value: 16 }, naturalHeight: { configurable: true, value: 16 } })
  image.dispatchEvent(new Event("load")); b.update(source, "contain", true, true, false)
  a.update(source, "cover", true, false, true)
  expect(image.hasAttribute("src")).toBe(false)
  expect(image.hidden).toBe(true)
  expect(first.still.hidden).toBe(false)
  expect(second.still.hidden).toBe(false)
  expect(drawing.drawImage).toHaveBeenCalled()
  expect(second.still.style.objectFit).toBe("contain")
  pool.dispose()
})
