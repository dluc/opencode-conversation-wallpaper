import { LegacyFire as Fire } from "./legacy"
import type { Appearance, Scene } from "../../src/scene"
import { FieldFire } from "./renderer"
import "./style.css"

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const button = element<HTMLButtonElement>("play"), appearance = element<HTMLSelectElement>("appearance")
const speed = element<HTMLSelectElement>("speed"), dimming = element<HTMLInputElement>("dimming")
const reduce = element<HTMLInputElement>("reduce"), status = element("status")
const reduced = matchMedia("(prefers-reduced-motion: reduce)"), controller = new AbortController()
const views = [
  { canvas: element<HTMLCanvasElement>("current"), scene: new Fire(), cost: element("current-cost"), total: 0, samples: 0 },
  { canvas: element<HTMLCanvasElement>("field"), scene: new FieldFire(), cost: element("field-cost"), total: 0, samples: 0 },
] satisfies Array<{ canvas: HTMLCanvasElement; scene: Scene; cost: HTMLElement; total: number; samples: number }>
let paused = false, visible = true, frame = 0, previous = 0, lastReport = 0
const running = () => !paused && !(reduce.checked && reduced.matches) && visible && !document.hidden
const paint = (elapsed: number) => {
  for (const view of views) {
    const ctx = view.canvas.getContext("2d")
    if (!ctx) continue
    const start = performance.now()
    view.scene.draw(ctx, elapsed, Number(speed.value), appearance.value as Appearance)
    if (elapsed) { view.total += performance.now() - start; view.samples++ }
  }
}
const report = () => {
  button.textContent = paused ? "Play" : "Pause"
  button.setAttribute("aria-pressed", String(paused))
  status.textContent = paused ? "Paused manually." : reduce.checked && reduced.matches
    ? "Paused by system Reduce motion. Uncheck Follow system Reduce motion only to explicitly opt out for this study."
    : document.hidden || !visible ? "Paused while the study is hidden." : "Both renderers are running. Costs below are measured, not a Desktop compatibility claim."
  for (const view of views) view.cost.textContent = view.samples
    ? `Mean step + paint: ${(view.total / view.samples).toFixed(2)} ms · ${view.samples} sampled frames`
    : "Still frame · no animation samples yet"
}
const tick = (now: number) => {
  frame = 0
  if (!running()) { previous = 0; report(); return }
  if (!previous || now - previous >= 1000 / 24) {
    paint(previous ? Math.min(0.1, (now - previous) / 1000) : 0)
    previous = now
    if (now - lastReport >= 1000) { report(); lastReport = now }
  }
  frame = requestAnimationFrame(tick)
}
const refresh = () => {
  cancelAnimationFrame(frame); frame = 0; previous = 0
  document.documentElement.dataset.appearance = appearance.value
  element("dimming-value").textContent = `${dimming.value}%`
  for (const view of views) view.canvas.style.opacity = String(1 - Number(dimming.value) / 100)
  paint(0); report()
  if (running()) frame = requestAnimationFrame(tick)
}
const resize = new ResizeObserver(() => {
  for (const view of views) {
    const box = view.canvas.getBoundingClientRect(), ratio = Math.min(devicePixelRatio || 1, 2)
    view.canvas.width = Math.max(1, Math.round(box.width * ratio)); view.canvas.height = Math.max(1, Math.round(box.height * ratio))
    view.canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0)
    view.scene.resize(box.width, box.height)
  }
  refresh()
})
views.forEach(view => resize.observe(view.canvas))
const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh() })
intersection.observe(document.querySelector(".comparison")!)
button.addEventListener("click", () => { paused = !paused; refresh() }, { signal: controller.signal })
for (const input of [appearance, speed, dimming, reduce]) input.addEventListener("change", refresh, { signal: controller.signal })
document.addEventListener("visibilitychange", refresh, { signal: controller.signal })
reduced.addEventListener("change", refresh, { signal: controller.signal })
const dispose = () => { cancelAnimationFrame(frame); resize.disconnect(); intersection.disconnect(); controller.abort() }
window.addEventListener("pagehide", dispose, { once: true })
import.meta.hot?.dispose(dispose)
refresh()
