import assert from "node:assert/strict"
import { mkdir, writeFile } from "node:fs/promises"
import { chromium } from "playwright"
import { createServer } from "vite"

const port = Number(process.env.FIRE_STUDY_PORT || 4347)
const server = await createServer({ configFile: "vite.preview.config.ts", server: { port, strictPort: true } })
await server.listen()
let browser
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true })
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.goto(`http://localhost:${port}/preview/fire-study/`)
  await page.waitForFunction(() => [...document.querySelectorAll("canvas")].every(canvas => canvas.width > 100))
  await mkdir("test-results", { recursive: true })
  const frames = () => page.locator(".viewport canvas").evaluateAll(canvases => canvases.map(canvas => canvas.toDataURL()))
  const twoFrames = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.getByRole("button", { name: "Pause", exact: true }).click()
  const paused = await frames(); await twoFrames(); assert.deepEqual(await frames(), paused)
  await page.locator(".comparison").screenshot({ path: "test-results/fire-field-comparison-dark.png" })
  await page.getByLabel("Mock appearance").selectOption("light")
  const light = await frames(); assert.notDeepEqual(light, paused)
  await twoFrames(); assert.deepEqual(await frames(), light)
  await page.locator(".comparison").screenshot({ path: "test-results/fire-field-comparison-light.png" })
  await page.getByLabel("Mock appearance").selectOption("dark")
  assert.deepEqual(await frames(), paused)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.setViewportSize({ width: 1500, height: 1100 })
  await page.locator(".comparison").scrollIntoViewIfNeeded()
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.getByRole("button", { name: "Play", exact: true }).click()
  await page.getByText(/^Paused by system Reduce motion/).waitFor()
  const reduced = await frames(); await twoFrames(); assert.deepEqual(await frames(), reduced)
  await page.getByLabel("Follow system Reduce motion").uncheck()
  await page.waitForFunction(before => document.querySelector("#field").toDataURL() !== before, reduced[1])
  await page.getByLabel("Follow system Reduce motion").check()
  await page.emulateMedia({ reducedMotion: "no-preference" })

  const benchmark = await page.evaluate(async () => {
    const { LegacyFire: Fire } = await import("/preview/fire-study/legacy.ts")
    const { FieldFire } = await import("/preview/fire-study/renderer.ts")
    const result = []
    for (const [name, Type] of [["reference", Fire], ["field", FieldFire]]) for (const speed of [1, 4]) {
      const start = performance.now(), scene = new Type(), initializationMs = performance.now() - start
      const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 540
      const context = canvas.getContext("2d"); scene.resize(900, 540)
      const firstPaint = performance.now(); scene.draw(context, 0, speed, "dark")
      const firstPaintMs = performance.now() - firstPaint
      const samples = []
      for (let frame = 0; frame < 100; frame++) {
        const start = performance.now(); scene.draw(context, 1 / 24, speed, "dark")
        if (frame >= 20) samples.push(performance.now() - start)
      }
      samples.sort((a, b) => a - b)
      result.push({ name, speed, initializationMs, firstPaintMs, samples: samples.length,
        medianMs: samples[40], p95Ms: samples[76], maxMs: samples.at(-1),
        gridCells: name === "field" ? scene.model.emission.length : null })
    }
    return result
  })
  await writeFile("test-results/fire-field-benchmark.json", JSON.stringify(benchmark, null, 2))
  console.log("Measured CPU time around draw(), not completed GPU time:", JSON.stringify(benchmark))
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Both renderers"))
  const recording = await page.evaluate(async () => {
    const sources = [...document.querySelectorAll(".viewport canvas")]
    const width = sources[0].width, height = sources[0].height
    const output = document.createElement("canvas"); output.width = width * 2 + 16; output.height = height + 72
    const context = output.getContext("2d"), stream = output.captureStream(24)
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8", videoBitsPerSecond: 1000000 })
    const chunks = [], stopped = new Promise(resolve => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      recorder.onstop = resolve
    })
    const paint = () => {
      context.globalAlpha = 1; context.fillStyle = "#121513"; context.fillRect(0, 0, output.width, output.height)
      for (let pane = 0; pane < 2; pane++) {
        const x = pane * (width + 16)
        context.globalAlpha = 0.45; context.drawImage(sources[pane], x, 72)
        context.globalAlpha = 1; context.fillStyle = "#e4e9e5"; context.font = "18px system-ui"
        context.fillText(pane ? "NEW FIRE / ADVECTED EMISSION" : "REFERENCE / 0.9.1 SHAPED TONGUES", x + 20, 32)
        context.font = "12px system-ui"; context.fillText("Real renderers · 1× speed · mock comparison", x + 20, 55)
        context.font = "22px system-ui"; context.fillText("A clear train of thought.", x + 28, 145)
        context.font = "13px system-ui"; context.fillText("Keep the conversation in the foreground.", x + 28, 176)
      }
    }
    paint(); recorder.start()
    await new Promise(resolve => {
      const start = performance.now()
      const tick = now => { paint(); if (now - start >= 30000) { recorder.stop(); resolve() } else requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    })
    await stopped; stream.getTracks().forEach(track => track.stop())
    const bytes = new Uint8Array(await new Blob(chunks, { type: "video/webm" }).arrayBuffer()), parts = []
    for (let offset = 0; offset < bytes.length; offset += 8192) parts.push(String.fromCharCode(...bytes.subarray(offset, offset + 8192)))
    return { base64: btoa(parts.join("")), bytes: bytes.length }
  })
  await writeFile("test-results/fire-field-comparison.webm", Buffer.from(recording.base64, "base64"))
  assert.deepEqual(errors, [])
  console.log(`Comparison checks passed: pause, theme restoration, narrow layout, reduced motion and opt-out; 30-second 1× video (${recording.bytes} bytes). No global configuration changed.`)
} finally {
  await browser?.close()
  await server.close()
}
