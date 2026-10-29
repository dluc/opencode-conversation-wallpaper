import { describe, expect, it, vi } from "vitest"
import { defaults } from "../src/preferences"
import { collection } from "../src/scenes"
import { mountWallpaper, statusMessage, timelineHost, watchTimelines } from "../src/wallpaper"
import { drawing, frames, intersect, intersections, mediaListeners, resizes, runFrame, setReduced, visibility } from "./environment"

function timeline() {
  const host = document.createElement("div")
  host.innerHTML = '<div data-slot="session-timeline-scroll"><p>Conversation text</p></div><div data-slot="session-timeline-visible"></div>'
  document.body.append(host)
  return host
}

describe("wallpaper lifecycle", () => {
  for (const entry of collection) {
    it(`${entry.title} uses the shared animation lifecycle and does not animate uploads`, () => {
      const host = timeline(), report = vi.fn()
      const prefs = { ...defaults, mode: entry.id }
      const controller = mountWallpaper(host, prefs, vi.fn(), report)
      intersect(true)
      expect(frames.size).toBe(1)
      runFrame(100); runFrame(150)
      expect(report.mock.lastCall![0]).toMatchObject({ reason: "animation", name: entry.title, frames: 1 })
      controller.update({ ...prefs, paused: true })
      expect(frames.size).toBe(0)
      controller.update(prefs)
      expect(frames.size).toBe(1)
      setReduced(true)
      expect(frames.size).toBe(0)
      setReduced(false)
      expect(frames.size).toBe(1)
      intersect(false)
      expect(frames.size).toBe(0)
      intersect(true)
      controller.update({ ...prefs, mode: "image" })
      expect(frames.size).toBe(0)
      expect(host.querySelector("canvas")!.hidden).toBe(true)
      controller.update({ ...prefs, enabled: false })
      expect(frames.size).toBe(0)
      controller.dispose()
    })
  }
  it("switches built-ins without accumulating layers or animation loops", () => {
    const host = timeline(), report = vi.fn()
    const controller = mountWallpaper(host, defaults, vi.fn(), report)
    intersect(true)
    for (const entry of [...collection, ...collection]) {
      controller.update({ ...defaults, mode: entry.id })
      expect(host.querySelectorAll(".cw-layer")).toHaveLength(1)
      expect(frames.size).toBe(1)
      expect(report.mock.lastCall![0].name).toBe(entry.title)
    }
    controller.dispose()
    expect(frames.size).toBe(0)
  })
  it("recognizes the current host and fails closed on unknown layouts", () => {
    const host = timeline()
    expect(timelineHost(host.firstElementChild!)).toBe(host)
    host.lastElementChild!.remove()
    expect(timelineHost(host.firstElementChild!)).toBeUndefined()
  })
  it("paints behind messages, limits pixel ratio, and never modifies chat content", () => {
    const host = timeline()
    const controller = mountWallpaper(host, defaults, vi.fn())
    expect(host.firstElementChild!.className).toBe("cw-layer")
    expect(host.querySelector("p")!.textContent).toBe("Conversation text")
    expect(host.querySelector("canvas")!.width).toBe(1600)
    expect(host.querySelector(".cw-layer")!.getAttribute("aria-hidden")).toBe("true")
    expect(Number((host.firstElementChild as HTMLElement).style.opacity)).toBeCloseTo(0.45)
    expect(frames.size).toBe(0) // not yet visible
    intersect(true)
    expect(frames.size).toBe(1)
    runFrame()
    expect(drawing.fillText).toHaveBeenCalled()
    controller.dispose()
    expect(host.classList.contains("cw-host")).toBe(false)
    expect(host.querySelector(".cw-layer")).toBeNull()
    expect(frames.size).toBe(0)
    expect(mediaListeners.size).toBe(0)
    expect(resizes[0].disconnect).toHaveBeenCalledOnce()
    expect(intersections[0].disconnect).toHaveBeenCalledOnce()
  })
  it("stops scheduling on pause, reduced motion, hidden tabs, hidden timelines and disable", () => {
    const controller = mountWallpaper(timeline(), defaults, vi.fn())
    intersect(true)
    expect(frames.size).toBe(1)
    controller.update({ ...defaults, paused: true })
    expect(frames.size).toBe(0)
    controller.update(defaults)
    setReduced(true)
    expect(frames.size).toBe(0)
    setReduced(false)
    expect(frames.size).toBe(1)
    visibility(false)
    expect(frames.size).toBe(0)
    visibility(true)
    expect(frames.size).toBe(1)
    intersect(false)
    expect(frames.size).toBe(0)
    intersect(true)
    controller.update({ ...defaults, enabled: false })
    expect(frames.size).toBe(0)
    controller.dispose()
  })
  it("reports why animation stopped, counts advancing frames, and only overrides reduced motion by explicit choice", () => {
    setReduced(true)
    const report = vi.fn()
    // Missing preference is an existing 0.1.0 installation: keep respecting the OS.
    const prefs = { ...defaults, respectReducedMotion: undefined }
    const controller = mountWallpaper(timeline(), prefs, vi.fn(), report)
    intersect(true)
    expect(report.mock.lastCall![0].reason).toBe("reduced-motion")
    expect(statusMessage(report.mock.lastCall![0])).toContain("system’s Reduce motion")
    expect(frames.size).toBe(0)
    controller.update({ ...prefs, respectReducedMotion: false })
    expect(frames.size).toBe(1)
    runFrame(100)
    runFrame(150)
    expect(report.mock.lastCall![0]).toMatchObject({ reason: "animation", name: "Digital rain", frames: 1, width: 800, height: 600 })
    expect(statusMessage(report.mock.lastCall![0])).toContain("1 frames painted")
    controller.update({ ...prefs, respectReducedMotion: false, paused: true })
    expect(report.mock.lastCall![0].reason).toBe("paused")
    expect(frames.size).toBe(0)
    controller.dispose()
  })
  it("snapshots animated images when paused and unloads their decoder", () => {
    const host = timeline()
    const source = "data:image/gif;base64,R0lGODlhAQABAIA="
    const prefs = { ...defaults, mode: "image" as const, image: source }
    const controller = mountWallpaper(host, prefs, vi.fn())
    intersect(true)
    const image = host.querySelector("img")!
    Object.defineProperties(image, {
      complete: { configurable: true, value: true },
      naturalWidth: { configurable: true, value: 100 },
      naturalHeight: { configurable: true, value: 100 },
    })
    image.dispatchEvent(new Event("load"))
    expect(image.getAttribute("src")).toBe(source)
    controller.update({ ...prefs, paused: true })
    expect(drawing.drawImage).toHaveBeenCalled()
    expect(image.hidden).toBe(true)
    expect(image.hasAttribute("src")).toBe(false)
    expect((host.querySelectorAll("canvas")[1]).hidden).toBe(false)
    controller.update(prefs)
    expect(image.hidden).toBe(false)
    expect(image.getAttribute("src")).toBe(source)
    controller.update({ ...prefs, image: "" })
    expect(image.hasAttribute("src")).toBe(false)
    expect(image.hidden).toBe(true)
    controller.dispose()
  })
  it("surfaces image decoding errors without repeatedly retrying", () => {
    const host = timeline(), report = vi.fn()
    const prefs = { ...defaults, mode: "image" as const, image: "data:image/png;base64,YQ==" }
    const controller = mountWallpaper(host, prefs, report)
    const image = host.querySelector("img")!
    image.dispatchEvent(new Event("error"))
    expect(report).toHaveBeenCalledOnce()
    controller.update(prefs)
    expect(image.hasAttribute("src")).toBe(false)
    expect(image.hidden).toBe(true)
    controller.dispose()
  })
  it("rejects stored remote URLs before creating a request", () => {
    const host = timeline()
    const controller = mountWallpaper(host, { ...defaults, mode: "image", image: "https://example.com/image.gif" }, vi.fn())
    expect(host.querySelector("img")!.hasAttribute("src")).toBe(false)
    controller.dispose()
  })
})

describe("host discovery", () => {
  it("discovers late-mounted and cached timelines, ignores streaming text, and cleans up removed ones", async () => {
    let prefs = { ...defaults }
    const controller = watchTimelines(() => prefs, vi.fn())
    const host = timeline()
    await Promise.resolve()
    runFrame()
    expect(host.querySelectorAll(".cw-layer")).toHaveLength(1)
    host.querySelector("p")!.textContent += " streamed text"
    await Promise.resolve()
    expect(frames.size).toBe(0)
    const second = timeline()
    await Promise.resolve()
    runFrame()
    expect(document.querySelectorAll(".cw-layer")).toHaveLength(2)
    prefs = { ...defaults, enabled: false }
    controller.update()
    expect((second.firstElementChild as HTMLElement).hidden).toBe(true)
    host.remove()
    await Promise.resolve()
    runFrame()
    expect(host.querySelector(".cw-layer")).toBeNull()
    controller.dispose()
    expect(document.querySelectorAll(".cw-layer")).toHaveLength(0)
  })
})
