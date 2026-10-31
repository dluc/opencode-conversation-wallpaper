import { clamp, imageSource, type Preferences } from "./preferences"
import { wallpaperName, type Appearance } from "./scenes"
import { ScenePool } from "./scene-pool"
import type { ImageView } from "./image-pool"

export interface Wallpaper {
  update(preferences: Preferences, appearance?: Appearance): void
  dispose(): void
}

export interface WallpaperStatus {
  reason: "disabled" | "paused" | "reduced-motion" | "hidden" | "offscreen" | "no-size" | "no-canvas" | "no-image" | "image" | "animation"
  name: string
  frames: number
  width: number
  height: number
  opacity: number
}

export function statusMessage(status: WallpaperStatus): string {
  switch (status.reason) {
    case "disabled": return "Wallpaper is switched off."
    case "paused": return "Animation paused by the Pause animation switch."
    case "reduced-motion": return "Animation paused by your system’s Reduce motion setting."
    case "hidden": return "Animation paused while the app document is hidden."
    case "offscreen": return "Animation paused while this wallpaper is offscreen."
    case "no-size": return "Waiting for the conversation layout to have a visible size."
    case "no-canvas": return "Canvas rendering is unavailable in this window."
    case "no-image": return "Choose an image to display a wallpaper."
    case "image": return "Image displayed. Animated image playback is allowed."
    case "animation": return status.frames ? `${status.name} is animating · ${status.frames} frames painted.` : `${status.name} is waiting for its first animation frame.`
  }
}

/** Only this adapter knows the host's internal DOM. Fail closed if its layout changes. */
export const TIMELINE_SELECTOR = '[data-slot="session-timeline-scroll"]'
export function timelineHost(scroll: Element): HTMLElement | undefined {
  const parent = scroll.parentElement
  // Verify a known sibling, rather than painting arbitrary parents after a host update.
  return parent?.querySelector(':scope > [data-slot="session-timeline-visible"]') ? parent : undefined
}

export function mountWallpaper(host: HTMLElement, initial: Preferences, reportError: (message: string) => void,
  reportStatus?: (status: WallpaperStatus) => void, initialAppearance: Appearance = "dark", sharedScenes?: ScenePool,
  priority = 0): Wallpaper {
  const scenes = sharedScenes ?? new ScenePool()
  const layer = document.createElement("div")
  layer.className = "cw-layer"
  layer.setAttribute("aria-hidden", "true")
  const canvas = document.createElement("canvas")
  const still = document.createElement("canvas")
  layer.append(canvas, still)
  host.prepend(layer)
  host.classList.add("cw-host")
  const context = canvas.getContext("2d")
  const reduced = matchMedia("(prefers-reduced-motion: reduce)")
  let prefs = initial
  let appearance = initialAppearance
  let sceneMode = initial.mode
  let scene = initial.mode === "image" ? undefined : scenes.view(initial.mode, priority)
  let visible = false
  let disposed = false
  let frame = 0
  let previous = 0
  let width = 0
  let height = 0
  let image: ImageView | undefined
  let paintedFrames = 0
  let lastStatusTime = 0

  const reducedMotion = () => reduced.matches && prefs.respectReducedMotion !== false
  const animated = () => !prefs.paused && !reducedMotion() && visible && !document.hidden
  const status = () => {
    const reason: WallpaperStatus["reason"] = !prefs.enabled ? "disabled" : prefs.mode !== "image" && !context ? "no-canvas"
      : prefs.mode === "image" && !imageSource(prefs.image) ? "no-image" : prefs.paused ? "paused"
      : reducedMotion() ? "reduced-motion" : document.hidden ? "hidden" : !visible ? "offscreen"
      : !width || !height ? "no-size" : prefs.mode !== "image" ? "animation" : "image"
    layer.dataset.motion = reason
    layer.dataset.frames = String(paintedFrames)
    reportStatus?.({ reason, name: wallpaperName(prefs.mode), frames: paintedFrames, width, height, opacity: 1 - clamp(prefs.dimming, 0, 100) / 100 })
  }
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0 }
  const paint = (elapsed: number, now?: number) => { if (context) scene?.draw(context, elapsed, prefs.speed, appearance, now) }
  const tick = (now: number) => {
    frame = 0
    if (disposed) return
    if (!animated() || prefs.mode === "image" || !prefs.enabled) { status(); return }
    // Limit to 24fps. Text streaming and interaction retain priority.
    if (!previous || now - previous >= 1000 / 24) {
      const elapsed = previous ? (now - previous) / 1000 : 0
      paint(elapsed, now)
      if (elapsed) {
        paintedFrames++
        if (paintedFrames === 1 || now - lastStatusTime >= 1000) { lastStatusTime = now; status() }
      }
      previous = now
    }
    frame = requestAnimationFrame(tick)
  }

  const refresh = () => {
    stop()
    if (prefs.mode !== sceneMode) {
      sceneMode = prefs.mode
      scene?.dispose()
      scene = prefs.mode === "image" ? undefined : scenes.view(prefs.mode, priority)
      scene?.resize(width, height)
      paintedFrames = 0; lastStatusTime = 0
    }
    layer.dataset.wallpaper = prefs.mode
    layer.dataset.appearance = appearance
    layer.hidden = !prefs.enabled
    layer.style.opacity = String(1 - clamp(prefs.dimming, 0, 100) / 100)
    canvas.hidden = prefs.mode === "image"
    if (prefs.mode === "image") {
      image ??= scenes.images.view(layer, still, reportError, priority)
      image.update(prefs.image, prefs.fit, prefs.enabled && visible && !!width && !!height,
        prefs.enabled && animated(), !prefs.enabled || prefs.paused || reducedMotion() || document.hidden)
    } else { image?.dispose(); image = undefined; still.hidden = true }
    if (prefs.enabled && prefs.mode !== "image") {
      scene?.setActive(animated() && !!context && !!width && !!height, visible && !!width && !!height)
      paint(0)
      if (animated() && context && width && height) frame = requestAnimationFrame(tick)
    }
    else scene?.setActive(false)
    status()
  }

  const resize = new ResizeObserver(() => {
    const rect = host.getBoundingClientRect()
    width = Math.round(rect.width)
    height = Math.round(rect.height)
    const ratio = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context?.setTransform(ratio, 0, 0, ratio, 0, 0)
    scene?.resize(width, height)
    refresh()
  })
  resize.observe(host)
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh() })
  intersection.observe(host)
  document.addEventListener("visibilitychange", refresh)
  reduced.addEventListener("change", refresh)
  refresh()

  return {
    update(next, nextAppearance = appearance) { prefs = next; appearance = nextAppearance; refresh() },
    dispose() {
      disposed = true
      stop()
      resize.disconnect()
      intersection.disconnect()
      document.removeEventListener("visibilitychange", refresh)
      reduced.removeEventListener("change", refresh)
      image?.dispose(); image = undefined
      scene?.dispose(); scene = undefined
      if (!sharedScenes) scenes.dispose()
      layer.remove()
      host.classList.remove("cw-host")
    },
  }
}

/** Cached timelines are independent; observe topology, not streamed text mutations. */
export function watchTimelines(getPreferences: () => Preferences, reportError: (message: string) => void,
  getAppearance: () => Appearance = () => "dark", sharedScenes?: ScenePool) {
  const scenes = sharedScenes ?? new ScenePool()
  const mounted = new Map<HTMLElement, Wallpaper>()
  let pending = 0
  const scan = () => {
    pending = 0
    for (const [host, wallpaper] of mounted) {
      if (!host.isConnected || !host.querySelector(`:scope > ${TIMELINE_SELECTOR}`)) {
        wallpaper.dispose(); mounted.delete(host)
      }
    }
    document.querySelectorAll(TIMELINE_SELECTOR).forEach((scroll) => {
      const host = timelineHost(scroll)
      if (host && !mounted.has(host)) mounted.set(host, mountWallpaper(host, getPreferences(), reportError, undefined, getAppearance(), scenes, 1))
    })
  }
  const relevant = (node: Node) => node instanceof Element &&
    (node.matches(TIMELINE_SELECTOR) || !!node.querySelector(TIMELINE_SELECTOR))
  const observer = new MutationObserver((records) => {
    if (!pending && records.some(record => [...record.addedNodes, ...record.removedNodes].some(relevant))) {
      pending = requestAnimationFrame(scan)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  scan()
  return {
    update() { for (const wallpaper of mounted.values()) wallpaper.update(getPreferences(), getAppearance()) },
    dispose() {
      observer.disconnect()
      cancelAnimationFrame(pending)
      for (const wallpaper of mounted.values()) wallpaper.dispose()
      mounted.clear()
      if (!sharedScenes) scenes.dispose()
    },
  }
}
