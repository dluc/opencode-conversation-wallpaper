import { clamp, imageSource, type Preferences } from "./preferences"
import { Rain } from "./rain"

export interface Wallpaper {
  update(preferences: Preferences): void
  dispose(): void
}

/** Only this adapter knows the host's internal DOM. Fail closed if its layout changes. */
export const TIMELINE_SELECTOR = '[data-slot="session-timeline-scroll"]'
export function timelineHost(scroll: Element): HTMLElement | undefined {
  const parent = scroll.parentElement
  // Verify a known sibling, rather than painting arbitrary parents after a host update.
  return parent?.querySelector(':scope > [data-slot="session-timeline-visible"]') ? parent : undefined
}

export function mountWallpaper(host: HTMLElement, initial: Preferences, reportError: (message: string) => void): Wallpaper {
  const layer = document.createElement("div")
  layer.className = "cw-layer"
  layer.setAttribute("aria-hidden", "true")
  const canvas = document.createElement("canvas")
  const image = document.createElement("img")
  image.alt = ""
  image.draggable = false
  const still = document.createElement("canvas")
  layer.append(canvas, image, still)
  host.prepend(layer)
  host.classList.add("cw-host")
  const context = canvas.getContext("2d")
  const rain = new Rain()
  const reduced = matchMedia("(prefers-reduced-motion: reduce)")
  let prefs = initial
  let visible = false
  let disposed = false
  let frame = 0
  let previous = 0
  let width = 0
  let height = 0
  let loadedSource = ""
  let failedSource = ""
  let frozen = false
  let source = ""

  const animated = () => !prefs.paused && !reduced.matches && visible && !document.hidden
  const stop = () => { cancelAnimationFrame(frame); frame = 0; previous = 0 }
  const paint = (elapsed: number) => { if (context) rain.draw(context, elapsed, prefs.speed) }
  const tick = (now: number) => {
    frame = 0
    if (disposed || !animated() || prefs.mode !== "matrix" || !prefs.enabled) return
    // Limit to 24fps. Text streaming and interaction retain priority.
    if (!previous || now - previous >= 1000 / 24) {
      paint(previous ? (now - previous) / 1000 : 0)
      previous = now
    }
    frame = requestAnimationFrame(tick)
  }

  const freeze = () => {
    if (!image.complete || !image.naturalWidth || frozen) return
    // A snapshot actually freezes GIF/APNG/WebP; CSS animation-play-state does not.
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight))
    still.width = Math.max(1, Math.round(image.naturalWidth * scale))
    still.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = still.getContext("2d")
    if (!ctx) return
    ctx.drawImage(image, 0, 0, still.width, still.height)
    frozen = true
    image.hidden = true
    still.hidden = false
    image.removeAttribute("src")
    loadedSource = ""
  }

  const refresh = () => {
    stop()
    layer.hidden = !prefs.enabled
    layer.style.opacity = String(1 - clamp(prefs.dimming, 0, 100) / 100)
    canvas.hidden = prefs.mode !== "matrix"
    image.style.objectFit = still.style.objectFit = prefs.fit === "contain" ? "contain" : "cover"
    if (!prefs.enabled || prefs.mode !== "image") {
      image.hidden = still.hidden = true
      image.removeAttribute("src")
      loadedSource = ""
      frozen = false
    } else {
      const next = imageSource(prefs.image)
      if (next !== source) {
        source = next; frozen = false; failedSource = ""; loadedSource = ""
        image.removeAttribute("src")
      }
      image.hidden = frozen || !source || source === failedSource
      still.hidden = !frozen
      if (source && source !== failedSource && (!frozen || animated()) && loadedSource !== source) {
        frozen = false
        still.hidden = true
        image.hidden = false
        loadedSource = source
        image.src = source
      }
      if (!animated()) freeze()
    }
    if (prefs.enabled && prefs.mode === "matrix") {
      paint(0)
      if (animated() && context && width && height) frame = requestAnimationFrame(tick)
    }
  }

  image.onload = () => { if (!animated()) freeze() }
  image.onerror = () => {
    if (!loadedSource || disposed) return
    failedSource = loadedSource
    loadedSource = ""
    image.hidden = true
    image.removeAttribute("src")
    reportError("This wallpaper could not be decoded. Choose another image in Conversation wallpaper settings.")
  }
  const resize = new ResizeObserver(() => {
    const rect = host.getBoundingClientRect()
    width = Math.round(rect.width)
    height = Math.round(rect.height)
    const ratio = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context?.setTransform(ratio, 0, 0, ratio, 0, 0)
    rain.resize(width, height)
    refresh()
  })
  resize.observe(host)
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh() })
  intersection.observe(host)
  document.addEventListener("visibilitychange", refresh)
  reduced.addEventListener("change", refresh)
  refresh()

  return {
    update(next) { prefs = next; refresh() },
    dispose() {
      disposed = true
      stop()
      resize.disconnect()
      intersection.disconnect()
      document.removeEventListener("visibilitychange", refresh)
      reduced.removeEventListener("change", refresh)
      image.onload = image.onerror = null
      image.removeAttribute("src")
      layer.remove()
      host.classList.remove("cw-host")
    },
  }
}

/** Cached timelines are independent; observe topology, not streamed text mutations. */
export function watchTimelines(getPreferences: () => Preferences, reportError: (message: string) => void) {
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
      if (host && !mounted.has(host)) mounted.set(host, mountWallpaper(host, getPreferences(), reportError))
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
    update() { for (const wallpaper of mounted.values()) wallpaper.update(getPreferences()) },
    dispose() {
      observer.disconnect()
      cancelAnimationFrame(pending)
      for (const wallpaper of mounted.values()) wallpaper.dispose()
      mounted.clear()
    },
  }
}
