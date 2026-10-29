import assert from "node:assert/strict"
import { mkdir } from "node:fs/promises"
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
  await mkdir("test-results", { recursive: true })
  await page.screenshot({ path: "test-results/settings.png", fullPage: true })

  await page.getByRole("checkbox", { name: /^Pause animation/ }).check()
  const frozen = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), frozen)
  await page.getByRole("checkbox", { name: /^Pause animation/ }).uncheck()
  await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, frozen)
  await page.emulateMedia({ reducedMotion: "reduce" })
  const reduced = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), reduced)
  await page.emulateMedia({ reducedMotion: "no-preference" })

  await page.getByRole("button", { name: "View conversation" }).click()
  await page.waitForFunction(() => document.querySelector(".test-timeline canvas").width > 300)
  await page.getByRole("button", { name: "Test interaction" }).click()
  await page.getByRole("button", { name: "Interaction works" }).waitFor()
  await page.getByRole("textbox", { name: "Message OpenCode" }).fill("Wallpaper does not intercept typing.")
  assert.equal(await page.getByRole("textbox", { name: "Message OpenCode" }).inputValue(), "Wallpaper does not intercept typing.")
  await page.screenshot({ path: "test-results/conversation.png", fullPage: true })

  await page.getByRole("button", { name: "Wallpaper settings" }).click()
  await page.getByRole("radio", { name: /Your image/ }).check()
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
  await page.getByRole("button", { name: "Remove image", exact: true }).click()
  assert.equal(await page.locator(".cw-preview img").getAttribute("src"), null)

  await page.locator('input[type="file"]').setInputFiles({ name: "not-an-image.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") })
  await page.getByRole("alert").filter({ hasText: "Choose a PNG" }).waitFor()
  await page.getByRole("radio", { name: /Digital rain/ }).check()
  await page.getByRole("checkbox", { name: /^Enable wallpaper/ }).uncheck()
  assert.equal(await page.locator(".cw-preview .cw-layer").evaluate(layer => layer.hidden), true)
  await page.getByRole("checkbox", { name: /^Enable wallpaper/ }).check()

  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: "test-results/mobile-settings.png", fullPage: true })
  await page.getByRole("button", { name: "Unload plugin" }).click()
  assert.equal(await page.locator(".cw-layer").count(), 0)
  await page.getByRole("button", { name: "Load plugin" }).click()
  await page.getByRole("heading", { name: "Set the atmosphere." }).waitFor()
  assert.equal(await page.locator(".cw-layer").count(), 2)
  assert.deepEqual(errors, [])
  console.log("Browser checks passed: rain painting, pause/resume, reduced motion, image/GIF import and freeze, rejection, controls, interaction, narrow layout, unload/reload. Screenshots: test-results/")
} finally {
  await browser.close()
  await server.close()
}
