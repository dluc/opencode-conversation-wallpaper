import assert from "node:assert/strict"
import { copyFile, mkdir } from "node:fs/promises"
import { chromium } from "playwright"
import { createServer } from "vite"

const server = await createServer({ configFile: "vite.preview.config.ts", server: { port: 4322 } })
await server.listen()
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } })
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto("http://localhost:4322/preview/")
  await page.getByRole("heading", { name: "Set the atmosphere." }).waitFor()
  await page.waitForFunction(() => document.querySelector(".cw-preview canvas").width > 300)
  const canvasPainted = () => {
    const canvas = document.querySelector(".cw-preview canvas")
    return canvas && [...canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data].some((byte, i) => i % 4 === 3 && byte > 0)
  }
  await page.waitForFunction(canvasPainted)
  await page.getByText(/Digital rain is animating/).waitFor()
  await mkdir("test-results", { recursive: true })
  await page.screenshot({ path: "test-results/settings.png", fullPage: true })
  await page.locator(".cw-mode").screenshot({ path: "test-results/collection.png" })

  await page.getByRole("checkbox", { name: /^Pause animation/ }).check()
  const frozen = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), frozen)
  await page.getByRole("checkbox", { name: /^Pause animation/ }).uncheck()
  await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, frozen)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.getByText("Animation paused by your system’s Reduce motion setting.", { exact: true }).waitFor()
  const reduced = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), reduced)
  await page.getByRole("checkbox", { name: /^Follow system Reduce motion/ }).uncheck()
  await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, reduced)
  await page.getByRole("checkbox", { name: /^Follow system Reduce motion/ }).check()
  await page.getByText("Animation paused by your system’s Reduce motion setting.", { exact: true }).waitFor()
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.getByText(/Digital rain is animating/).waitFor()
  await page.getByRole("button", { name: "Make wallpaper more visible" }).click()
  assert.equal(await page.getByRole("slider", { name: "Dimming", exact: true }).inputValue(), "40")

  await page.getByRole("button", { name: "View conversation" }).click()
  await page.waitForFunction(() => document.querySelector(".test-timeline canvas").width > 300)
  const conversationFrame = await page.locator(".test-timeline canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.waitForFunction(previous => document.querySelector(".test-timeline canvas").toDataURL() !== previous, conversationFrame)
  await page.getByRole("button", { name: "Test interaction" }).click()
  await page.getByRole("button", { name: "Interaction works" }).waitFor()
  await page.getByRole("textbox", { name: "Message OpenCode" }).fill("Wallpaper does not intercept typing.")
  assert.equal(await page.getByRole("textbox", { name: "Message OpenCode" }).inputValue(), "Wallpaper does not intercept typing.")
  await page.screenshot({ path: "test-results/conversation.png", fullPage: true })

  await page.getByRole("button", { name: "Wallpaper settings" }).click()
  assert.equal(await page.getByRole("radio").count(), 6)
  assert.equal(await page.getByRole("combobox", { name: /Direction/i }).count(), 0)
  await page.getByRole("radio", { name: /Digital rain/ }).focus()
  await page.keyboard.press("ArrowRight")
  assert.equal(await page.getByRole("radio", { name: /Cloud Drift/ }).isChecked(), true)
  for (const [mode, title] of [["clouds", "Cloud Drift"], ["fireflies", "Fireflies"], ["starfield", "Starfield"], ["aurora", "Aurora"]]) {
    await page.getByRole("radio", { name: new RegExp(title) }).check()
    await page.getByText(new RegExp(`${title} is animating`)).waitFor()
    const frame = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, frame)
    await page.getByRole("checkbox", { name: /^Pause animation/ }).check()
    const still = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), still)
    await page.locator(".cw-preview").screenshot({ path: `test-results/${mode}.png` })
    await page.getByRole("checkbox", { name: /^Pause animation/ }).uncheck()
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.getByText("Animation paused by your system’s Reduce motion setting.", { exact: true }).waitFor()
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.getByText(new RegExp(`${title} is animating`)).waitFor()
  }
  // Gallery thumbnails are static even while the selected wallpaper moves.
  const thumbnails = await page.locator(".cw-thumbnail").evaluateAll(canvases => canvases.map(canvas => canvas.toDataURL()))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.deepEqual(await page.locator(".cw-thumbnail").evaluateAll(canvases => canvases.map(canvas => canvas.toDataURL())), thumbnails)
  // Measure the wallpaper pixels themselves against white, not text or a CSS background.
  // Palettes must change even while paused, and dark mode must restore the exact still frame.
  await page.getByRole("checkbox", { name: /^Pause animation/ }).check()
  await page.getByRole("slider", { name: "Dimming", exact: true }).evaluate(input => {
    input.value = "55"; input.dispatchEvent(new Event("change", { bubbles: true }))
  })
  for (const [mode, title] of [["clouds", "Cloud Drift"], ["fireflies", "Fireflies"], ["starfield", "Starfield"]]) {
    await page.getByRole("radio", { name: new RegExp(title) }).check()
    const dark = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    const thumbnail = page.getByRole("radio", { name: new RegExp(title) }).locator("..").locator("canvas")
    const darkThumbnail = await thumbnail.evaluate(canvas => canvas.toDataURL())
    await page.getByRole("button", { name: "Use light theme", exact: true }).click()
    await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, dark)
    assert.notEqual(await thumbnail.evaluate(canvas => canvas.toDataURL()), darkThumbnail)
    const contrast = await page.locator(".cw-preview canvas").first().evaluate(canvas => {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data
      const opacity = Number(getComputedStyle(canvas.parentElement).opacity)
      let max = 0, visible = 0
      for (let i = 0; i < pixels.length; i += 4) {
        const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722
        const delta = (255 - luminance) * pixels[i + 3] / 255 * opacity
        max = Math.max(max, delta)
        if (delta > 12) visible++
      }
      return { max, visible }
    })
    assert(contrast.max > 20 && contrast.visible > 10, `${title} is too faint on white: ${JSON.stringify(contrast)}`)
    console.log(`Light-theme contrast at 55% dimming: ${title}: ${JSON.stringify(contrast)}`)
    await page.locator(".cw-preview").screenshot({ path: `test-results/${mode}-light.png` })
    const light = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), light)
    await page.getByRole("button", { name: "Use dark theme", exact: true }).click()
    assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), dark)
    await page.getByRole("checkbox", { name: /^Pause animation/ }).uncheck()
    await page.getByRole("button", { name: "Use light theme", exact: true }).click()
    await page.locator('.cw-preview .cw-layer[data-appearance="light"][data-motion="animation"]').waitFor()
    const moving = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, moving)
    await page.getByRole("checkbox", { name: /^Pause animation/ }).check()
    await page.getByRole("button", { name: "Use dark theme", exact: true }).click()
  }
  await page.getByRole("checkbox", { name: /^Pause animation/ }).uncheck()
  await page.getByRole("radio", { name: /Your image/ }).check()
  assert.equal(await page.getByRole("slider", { name: "Animation speed", exact: true }).count(), 0)
  const gif = Buffer.from("R0lGODlhEAAQAIEAAAg4IwAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAEKAAEALAAAAAAQABAAgY//wgAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==", "base64")
  await page.locator('input[type="file"]').setInputFiles({ name: "animated-test.gif", mimeType: "image/gif", buffer: gif })
  await page.getByText("animated-test.gif", { exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector(".cw-preview img").naturalWidth === 16)
  await page.getByRole("checkbox", { name: /^Pause animation/ }).check()
  await page.waitForFunction(() => {
    const image = document.querySelector(".cw-preview img")
    const still = document.querySelectorAll(".cw-preview canvas")[1]
    return !image.hasAttribute("src") && image.hidden && !still.hidden && still.width === 16
  })
  await page.getByRole("checkbox", { name: /^Pause animation/ }).uncheck()
  await page.waitForFunction(() => document.querySelector(".cw-preview img").naturalWidth === 16)
  const uploaded = await page.locator(".cw-preview img").getAttribute("src")
  await page.getByRole("radio", { name: /Cloud Drift/ }).check()
  await page.getByRole("radio", { name: /Your image/ }).check()
  await page.waitForFunction(() => document.querySelector(".cw-preview img").naturalWidth === 16)
  assert.equal(await page.locator(".cw-preview img").getAttribute("src"), uploaded)
  await page.getByRole("button", { name: "Remove image", exact: true }).click()
  assert.equal(await page.locator(".cw-preview img").getAttribute("src"), null)

  const png = await page.evaluate(() => {
    const canvas = document.createElement("canvas"); canvas.width = 64; canvas.height = 32
    const ctx = canvas.getContext("2d"); ctx.fillStyle = "#456d83"; ctx.fillRect(0, 0, 64, 32)
    return canvas.toDataURL("image/png").split(",")[1]
  })
  await page.locator('input[type="file"]').setInputFiles({ name: "still-test.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") })
  await page.getByText("still-test.png", { exact: true }).waitFor()
  await page.waitForFunction(() => document.querySelector(".cw-preview img").naturalWidth === 64)
  const stillSource = await page.locator(".cw-preview img").getAttribute("src")
  await page.getByRole("button", { name: "Use light theme", exact: true }).click()
  assert.equal(await page.locator(".cw-preview img").getAttribute("src"), stillSource)
  await page.getByRole("button", { name: "Use dark theme", exact: true }).click()
  assert.equal(await page.locator(".cw-preview img").evaluate(image => getComputedStyle(image).transform), "none")
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.hidden), true)
  assert.equal(await page.getByRole("slider", { name: "Animation speed", exact: true }).count(), 0)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview img").getAttribute("src"), stillSource)
  await page.getByRole("button", { name: "Remove image", exact: true }).click()

  await page.locator('input[type="file"]').setInputFiles({ name: "not-an-image.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") })
  await page.getByRole("alert").filter({ hasText: "Choose a PNG" }).waitFor()
  await page.getByRole("radio", { name: /Digital rain/ }).check()
  await page.getByRole("checkbox", { name: /^Enable wallpaper/ }).uncheck()
  assert.equal(await page.locator(".cw-preview .cw-layer").evaluate(layer => layer.hidden), true)
  await page.getByRole("checkbox", { name: /^Enable wallpaper/ }).check()

  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: "test-results/mobile-settings.png", fullPage: true })
  await page.getByRole("radio", { name: /Aurora/ }).check()
  await page.getByRole("button", { name: "Unload plugin" }).click()
  assert.equal(await page.locator(".cw-layer").count(), 0)
  await page.getByRole("button", { name: "Load plugin" }).click()
  await page.getByRole("heading", { name: "Set the atmosphere." }).waitFor()
  assert.equal(await page.getByRole("radio", { name: /Aurora/ }).isChecked(), true)
  assert.equal(await page.locator(".cw-layer").count(), 2)
  assert.deepEqual(errors, [])
  if (process.argv.includes("--update-doc-images")) {
    await mkdir("docs/images", { recursive: true })
    for (const [source, target] of [
      ["collection.png", "collection.png"], ["aurora.png", "aurora-dark.png"],
      ["fireflies.png", "fireflies-dark.png"], ["clouds-light.png", "clouds-light.png"],
      ["starfield-light.png", "starfield-light.png"],
    ]) await copyFile(`test-results/${source}`, `docs/images/${target}`)
    console.log("README screenshots refreshed in docs/images/ from the verified mock desktop layout.")
  }
  console.log("Browser checks passed: all five animations, light-theme pixel contrast, live and paused theme changes, original dark palettes, static gallery thumbnails, pause/resume, reduced motion, image/GIF import and freeze, unchanged uploads, built-in-only speed, chat interaction, narrow layout, unload/reload. Screenshots: test-results/")
} finally {
  await browser.close()
  await server.close()
}
