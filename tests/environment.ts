import { beforeEach, vi } from "vitest"

export const drawing = {
  clearRect: vi.fn(), fillText: vi.fn(), setTransform: vi.fn(), drawImage: vi.fn(),
  fillStyle: "", font: "", textAlign: "",
}
export let reduced = false
export const mediaListeners = new Set<() => void>()
export const frames = new Map<number, FrameRequestCallback>()
export const intersections: Array<{ callback: IntersectionObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = []
export const resizes: Array<{ callback: ResizeObserverCallback; disconnect: ReturnType<typeof vi.fn> }> = []
export function setReduced(value: boolean) { reduced = value; mediaListeners.forEach(fn => fn()) }
export function visibility(value: boolean) {
  Object.defineProperty(document, "hidden", { configurable: true, value: !value })
  document.dispatchEvent(new Event("visibilitychange"))
}
export function intersect(value: boolean, index = intersections.length - 1) {
  intersections[index].callback([{ isIntersecting: value } as IntersectionObserverEntry], {} as IntersectionObserver)
}
export function runFrame(time = 100) {
  const callbacks = [...frames.values()]
  frames.clear()
  callbacks.forEach(callback => callback(time))
}
let nextFrame = 0
beforeEach(() => {
  vi.clearAllMocks()
  document.body.replaceChildren()
  reduced = false
  mediaListeners.clear(); frames.clear(); intersections.length = 0; resizes.length = 0
  Object.defineProperty(document, "hidden", { configurable: true, value: false })
  vi.stubGlobal("devicePixelRatio", 3)
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.set(++nextFrame, callback); return nextFrame })
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id))
  vi.stubGlobal("matchMedia", () => ({
    get matches() { return reduced },
    addEventListener: (_: string, fn: () => void) => mediaListeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => mediaListeners.delete(fn),
  }))
  vi.stubGlobal("ResizeObserver", class {
    disconnect = vi.fn()
    constructor(callback: ResizeObserverCallback) { resizes.push({ callback, disconnect: this.disconnect }) }
    observe(target: Element) { resizes.at(-1)!.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver) }
  })
  vi.stubGlobal("IntersectionObserver", class {
    disconnect = vi.fn()
    constructor(callback: IntersectionObserverCallback) { intersections.push({ callback, disconnect: this.disconnect }) }
    observe() {}
  })
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => drawing as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ width: 800, height: 600 } as DOMRect)
})
