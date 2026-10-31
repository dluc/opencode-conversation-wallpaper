import assert from "node:assert/strict"
import { copyFile, mkdir, writeFile } from "node:fs/promises"
import { chromium } from "playwright"
import { createServer } from "vite"

const port = Number(process.env.WALLPAPER_TEST_PORT || 4322)
const server = await createServer({ configFile: "vite.preview.config.ts", server: { port } })
await server.listen()
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || undefined, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } })
  // Observe actual Canvas calls in this test page, without adding telemetry to production rendering.
  await page.addInitScript(() => {
    const stroke = CanvasRenderingContext2D.prototype.strokeRect, text = CanvasRenderingContext2D.prototype.fillText
    const clear = CanvasRenderingContext2D.prototype.clearRect, fill = CanvasRenderingContext2D.prototype.fillRect
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      this.canvas.__blocks = []
      this.canvas.__playfield = undefined; this.canvas.__hud = undefined; this.canvas.__trace = []
      return clear.apply(this, args)
    }
    CanvasRenderingContext2D.prototype.fillRect = function (...args) {
      (this.canvas.__blocks ??= []).push({ args, alpha: this.globalAlpha })
      return fill.apply(this, args)
    }
    CanvasRenderingContext2D.prototype.strokeRect = function (...args) {
      this.canvas.__playfield = args
      return stroke.apply(this, args)
    }
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      if (String(args[0]).startsWith("ROUND ")) this.canvas.__hud = args[0]
      return text.apply(this, args)
    }
    const begin = CanvasRenderingContext2D.prototype.beginPath, line = CanvasRenderingContext2D.prototype.lineTo
    CanvasRenderingContext2D.prototype.beginPath = function (...args) {
      if ((this.canvas.dataset.wallpaper || this.canvas.parentElement?.dataset.wallpaper) === "cardiogram") this.canvas.__trace = []
      return begin.apply(this, args)
    }
    CanvasRenderingContext2D.prototype.lineTo = function (...args) {
      if ((this.canvas.dataset.wallpaper || this.canvas.parentElement?.dataset.wallpaper) === "cardiogram") this.canvas.__trace.push(args)
      return line.apply(this, args)
    }
    const draw = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (...args) {
      const result = draw.apply(this, args), source = args[0]
      if (source instanceof HTMLCanvasElement && this.canvas.closest(".cw-layer")) {
        this.canvas.__blocks = source.__blocks; this.canvas.__playfield = source.__playfield
        this.canvas.__hud = source.__hud; this.canvas.__trace = source.__trace
      }
      return result
    }
    const src = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")
    Object.defineProperty(HTMLImageElement.prototype, "src", { ...src, set(value) {
      this.__sourceAssignments = (this.__sourceAssignments || 0) + 1
      src.set.call(this, value)
    } })
  })
  const showPreview = async () => {
    await page.locator(".cw-preview").scrollIntoViewIfNeeded()
    await page.waitForFunction(() => {
      const host = document.querySelector(".cw-preview"), canvas = host.querySelector("canvas")
      if (host.querySelector(".cw-layer").dataset.wallpaper === "image") return true
      const rect = host.getBoundingClientRect()
      return Number(canvas.dataset.sceneWidth) === Math.round(rect.width) && Number(canvas.dataset.sceneHeight) === Math.round(rect.height)
    })
  }
  const setPaused = async value => {
    await page.getByRole("checkbox", { name: /^Pause animation/ }).setChecked(value)
    await showPreview()
  }
  const errors = []
  page.on("pageerror", error => errors.push(error.message))
  await page.goto(`http://localhost:${port}/preview/`)
  await page.getByRole("heading", { name: "Set the atmosphere." }).waitFor()
  await page.waitForFunction(() => document.querySelector(".cw-preview canvas").width > 300)
  const canvasPainted = () => {
    const canvas = document.querySelector(".cw-preview canvas")
    return canvas && [...canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data].some((byte, i) => i % 4 === 3 && byte > 0)
  }
  await page.waitForFunction(canvasPainted)
  await page.getByText(/Rain is animating/).waitFor()
  const speed = page.getByRole("slider", { name: "Animation speed", exact: true })
  assert.equal(await speed.getAttribute("min"), "0.1")
  assert.equal(await speed.getAttribute("max"), "10")
  await speed.evaluate(input => { input.value = "10"; input.dispatchEvent(new Event("change", { bubbles: true })) })
  assert.equal(await speed.inputValue(), "10")
  await page.getByText("10.0×", { exact: true }).waitFor()
  assert(await page.locator(".cw-controls").evaluate(controls => !!(controls.compareDocumentPosition(document.querySelector(".cw-mode")) & Node.DOCUMENT_POSITION_FOLLOWING)))
  const names = await page.locator(".cw-mode strong").allTextContents()
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")))
  await page.getByRole("region", { name: "Wallpaper settings", exact: true }).waitFor()
  await mkdir("test-results", { recursive: true })
  await page.screenshot({ path: "test-results/settings.png", fullPage: true })
  await page.locator(".cw-mode").screenshot({ path: "test-results/collection.png" })
  await showPreview()

  await setPaused(true)
  const frozen = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), frozen)
  await setPaused(false)
  await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, frozen)
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.getByText("Animation paused by your system’s Reduce motion setting.", { exact: true }).waitFor()
  const reduced = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), reduced)
  await page.getByRole("checkbox", { name: /^Follow system Reduce motion/ }).uncheck()
  await showPreview()
  await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, reduced)
  await page.getByRole("checkbox", { name: /^Follow system Reduce motion/ }).check()
  await showPreview()
  await page.getByText("Animation paused by your system’s Reduce motion setting.", { exact: true }).waitFor()
  await page.emulateMedia({ reducedMotion: "no-preference" })
  await page.getByText(/Rain is animating/).waitFor()
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
  assert.equal(await page.getByRole("radio").count(), 35)
  assert.equal(await page.getByRole("combobox", { name: /Direction/i }).count(), 0)
  await page.getByRole("radio", { name: /^Rain\b/ }).focus()
  await page.keyboard.press("ArrowRight")
  assert.equal(await page.getByRole("radio", { name: /^Rainbow\b/ }).isChecked(), true)
  const effects = [["clouds", "Mist"], ["fireflies", "Fireflies"], ["starfield", "Starfield"], ["aurora", "Aurora"],
    ["meteors", "Meteors"], ["night-sky", "Sky"], ["balls", "Bounce"],
    ["blockfall", "Blockfall"], ["disco", "Disco"], ["maze-chase", "Maze"],
    ["pixel-clouds", "Clouds"], ["train-window", "Journey"], ["aquarium", "Aquarium"],
    ["ripple-pond", "Ripples"], ["cardiogram", "Cardiogram"], ["river", "River"],
    ["life", "Life"], ["plaza", "Plaza"], ["constellations", "Constellations"], ["glass", "Glass"],
    ["ocean", "Ocean"], ["embers", "Embers"], ["coast", "Coast"], ["boats", "Boats"], ["orbits", "Orbits"],
    ["leaves", "Leaves"], ["contours", "Contours"], ["tremor", "Tremor"], ["polygraph", "Polygraph"], ["rainbow", "Rainbow"], ["fire", "Fire"], ["elastic", "Elastic"], ["grass", "Grass"]]
  for (const [mode, title] of effects) {
    await page.getByRole("radio", { name: new RegExp(`^${title}\\b`) }).check()
    await speed.evaluate(input => { input.value = "10"; input.dispatchEvent(new Event("change", { bubbles: true })) })
    await showPreview()
    await page.getByText(new RegExp(`${title} is animating`)).waitFor()
    const frame = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, frame)
    await setPaused(true)
    const still = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), still)
    if (mode === "rainbow") {
      const uniform = await page.locator(".cw-preview canvas").first().evaluate(canvas => {
        const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data
        return pixels[3] === 255 && pixels.every((value, index) => value === pixels[index % 4])
      })
      assert(uniform, "Rainbow must be one opaque solid color over the entire canvas, not a gradient or shapes")
      // Control only the mock page's Date.now; rAF/performance clocks keep running.
      await page.evaluate(() => { window.__realDateNow = Date.now; Date.now = () => 1_800_000_033_000 })
      try {
        await page.getByRole("radio", { name: /^Image\b/ }).check()
        await page.getByRole("radio", { name: /^Rainbow\b/ }).check()
        await showPreview()
        const pixel = canvas => [...canvas.getContext("2d").getImageData(0, 0, 1, 1).data]
        const color = await page.locator(".cw-preview canvas").first().evaluate(pixel)
        await page.getByRole("button", { name: "View conversation", exact: true }).click()
        await page.waitForFunction(() => {
          const canvas = document.querySelector(".test-timeline canvas")
          return canvas && canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 255
        })
        assert.deepEqual(await page.locator(".test-timeline canvas").first().evaluate(pixel), color, "Rainbow reset when navigating to the conversation")
        await page.getByRole("button", { name: "Wallpaper settings", exact: true }).click()
        await showPreview()
        await page.waitForFunction(() => {
          const canvas = document.querySelector(".cw-preview canvas")
          return canvas && canvas.getContext("2d").getImageData(0, 0, 1, 1).data[3] === 255
        })
        assert.deepEqual(await page.locator(".cw-preview canvas").first().evaluate(pixel), color, "Rainbow reset when remounting settings")
        await page.evaluate(() => { Date.now = () => 1_800_000_093_000 })
        await page.getByRole("slider", { name: "Dimming", exact: true }).evaluate(input => {
          input.value = "40"; input.dispatchEvent(new Event("change", { bubbles: true }))
        })
        assert.deepEqual(await page.locator(".cw-preview canvas").first().evaluate(pixel), color, "Paused Rainbow followed the wall clock")
        await setPaused(false)
        await page.waitForFunction(previous => {
          const pixel = document.querySelector(".cw-preview canvas").getContext("2d").getImageData(0, 0, 1, 1).data
          return pixel.some((value, i) => value !== previous[i])
        }, color)
        await setPaused(true)
      } finally {
        await page.evaluate(() => { Date.now = window.__realDateNow; delete window.__realDateNow })
      }
    }
    if (mode === "fire" || mode === "grass") {
      const coverage = await page.locator(".cw-preview canvas").first().evaluate(canvas => {
        const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data
        let visible = 0, upper = 0, first = canvas.height
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 12) {
          visible++
          first = Math.min(first, Math.floor(i / 4 / canvas.width))
          if (i < pixels.length * 0.2) upper++
        }
        return { total: visible / (pixels.length / 4), upper: upper / (pixels.length / 4), first: first / canvas.height }
      })
      if (mode === "grass") assert(coverage.total > 0.55 && coverage.upper > 0.01, `Grass must reach through the canvas: ${JSON.stringify(coverage)}`)
      else assert(coverage.total > 0.08 && coverage.first < 0.25, `Fire must have tall visible tongues without a full-width wall: ${JSON.stringify(coverage)}`)
      // Exercise later frames: Fire stays warm, Grass stays green.
      for (const appearance of ["dark", "light"]) {
        const sample = await page.evaluate(async ([appearance, mode]) => {
          const { createScene } = await import("/src/scenes.ts")
          const canvas = document.createElement("canvas"); canvas.width = 712; canvas.height = 400
          const context = canvas.getContext("2d"), scene = createScene(mode)
          scene.resize(canvas.width, canvas.height)
          for (let i = 0; i < 300; i++) scene.draw(context, 0.1, 4, appearance)
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
          let red = 0, green = 0, blue = 0
          for (let i = 0; i < pixels.length; i += 4) {
            red += pixels[i] * pixels[i + 3]; green += pixels[i + 1] * pixels[i + 3]; blue += pixels[i + 2] * pixels[i + 3]
          }
          const capture = document.createElement("canvas"); capture.width = canvas.width; capture.height = canvas.height
          const output = capture.getContext("2d")
          output.fillStyle = appearance === "dark" ? "#121513" : "#fdfefd"; output.fillRect(0, 0, capture.width, capture.height)
          output.globalAlpha = 0.45; output.drawImage(canvas, 0, 0)
          const focus = []
          if (mode === "fire") for (const [width, height] of [[1200, 600], [390, 844], [712, 240]]) {
            canvas.width = width; canvas.height = height; scene.resize(width, height); scene.draw(context, 0, 1, appearance)
            const image = context.getImageData(0, 0, width, height).data
            let core = 0, edges = 0, coreCount = 0, edgeCount = 0
            for (let y = Math.floor(height * 0.45); y < height * 0.95; y++) for (let x = 0; x < width; x++) {
              const i = (y * width + x) * 4, luminance = image[i] * 0.2126 + image[i + 1] * 0.7152 + image[i + 2] * 0.0722
              const energy = (appearance === "light" ? 255 - luminance : luminance) * image[i + 3] / 255
              if (x >= width * 0.35 && x < width * 0.65) { core += energy; coreCount++ }
              else if (x < width * 0.15 || x >= width * 0.85) { edges += energy; edgeCount++ }
            }
            focus.push({ width, height, core: core / coreCount, edges: edges / edgeCount })
          }
          return { red, green, blue, capture: capture.toDataURL("image/png"), focus }
        }, [appearance, mode])
        if (mode === "fire") assert(sample.red > sample.green && sample.green > sample.blue && sample.red > sample.blue * 1.8, `Fire must stay red/orange/yellow in ${appearance} mode`)
        else assert(sample.green > sample.red && sample.green > sample.blue, `Grass must stay green in ${appearance} mode`)
        if (mode === "fire") {
          assert(sample.focus.every(size => size.core > size.edges * 2.5), `Fire heat must concentrate at its core in ${appearance} mode: ${JSON.stringify(sample.focus)}`)
          console.log(`Fire core/edge intensity (${appearance}): ${JSON.stringify(sample.focus)}`)
        }
        await writeFile(`test-results/${mode}-tone-late-${appearance}.png`, Buffer.from(sample.capture.split(",")[1], "base64"))
      }
    }
    if (mode === "elastic") {
      const coverage = await page.evaluate(async () => {
        const { createScene } = await import("/src/scenes.ts")
        const canvas = document.createElement("canvas"), context = canvas.getContext("2d"), scene = createScene("elastic")
        const result = []
        for (const [width, height] of [[1200, 600], [390, 844], [1, 1]]) {
          canvas.width = width; canvas.height = height; scene.resize(width, height)
          scene.draw(context, 0, 1, "dark")
          const pixels = context.getImageData(0, 0, width, height).data
          let painted = 0
          for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 20) painted++
          result.push({ width, height, coverage: painted / (width * height) })
        }
        return result
      })
      assert(coverage.every(size => size.coverage > 0.85), `Elastic must cover the available surface: ${JSON.stringify(coverage)}`)
    }
    if (mode === "cardiogram") {
      const showPulse = async () => {
        await setPaused(false)
        await page.waitForFunction(() => {
          const trace = document.querySelector(".cw-preview canvas").__trace
          if (!trace?.length || Math.min(...trace.map(([, y]) => y)) >= trace[0][1] - 8) return false
          const label = [...document.querySelectorAll(".test-switch")].find(label => label.textContent.startsWith("Pause animation"))
          label.querySelector("input").click() // Freeze the observed beat in this same browser turn.
          return true
        })
        await setPaused(true)
      }
      await showPulse()
      const peak = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.__trace.reduce((a, b) => b[1] < a[1] ? b : a))
      await setPaused(false)
      await page.waitForFunction(([x, y]) => {
        const trace = document.querySelector(".cw-preview canvas").__trace
        const peak = trace.reduce((a, b) => b[1] < a[1] ? b : a)
        return Math.abs(peak[0] - x) <= 2 && Math.abs(peak[1] - y) > 2
      }, peak)
      await page.waitForFunction(() => {
        const trace = document.querySelector(".cw-preview canvas").__trace
        return trace.length && trace.every(([, y]) => y === trace[0][1])
      })
      await setPaused(true)
      await showPulse() // Seek a beat; mode changes no longer reset the simulation.
    }
    if (mode === "blockfall" || mode === "maze-chase" || mode === "fire" || mode === "elastic" || mode === "grass") {
      await page.locator(".cw-preview").evaluate(element => { element.style.minHeight = "400px" })
      await page.waitForFunction(() => document.querySelector(".cw-preview canvas").height >= 400)
    }
    await page.locator(".cw-preview").screenshot({ path: `test-results/${mode}.png` })
    if (mode === "fire" || mode === "elastic" || mode === "grass") {
      await page.locator(".cw-preview").evaluate(element => { element.style.minHeight = "" })
      await page.waitForFunction(() => document.querySelector(".cw-preview canvas").height < 300)
      await page.getByRole("button", { name: "View conversation", exact: true }).click()
      await page.waitForFunction(mode => {
        const canvas = document.querySelector(`.test-timeline .cw-layer[data-wallpaper="${mode}"] canvas`)
        return canvas?.height >= 600
      }, mode)
      await page.locator(".test-conversation").screenshot({ path: `test-results/${mode}-conversation-dark.png` })
      await page.getByRole("button", { name: "Wallpaper settings", exact: true }).click()
      await showPreview()
    }
    if (mode === "blockfall" || mode === "maze-chase") {
      await page.locator(".cw-preview").evaluate(element => { element.style.minHeight = "" })
      await page.waitForFunction(() => document.querySelector(".cw-preview canvas").height < 300)
      const hud = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.__hud)
      for (const [width, height] of [[1200, 600], [360, 800], [900, 240], [1, 1]]) {
        await page.locator(".cw-preview").evaluate((element, [w, h]) => {
          element.style.width = `${w}px`; element.style.height = `${h}px`; element.style.minHeight = "0"
        }, [width, height])
        await page.waitForFunction(([w, h]) => {
          const canvas = document.querySelector(".cw-preview canvas"), ratio = Math.min(devicePixelRatio, 2)
          return Math.abs(canvas.width - Math.max(2, w) * ratio) <= 1 && Math.abs(canvas.height - Math.max(2, h) * ratio) <= 1
        }, [width, height])
        const bounds = await page.locator(".cw-preview canvas").first().evaluate(canvas => ({
          field: canvas.__playfield, hud: canvas.__hud, rect: canvas.closest(".cw-preview").getBoundingClientRect().toJSON(),
        }))
        assert(bounds.field[2] / bounds.rect.width > 0.94 && bounds.field[3] / bounds.rect.height > 0.88, `${title} does not fill ${width}×${height}: ${JSON.stringify(bounds)}`)
        assert.equal(bounds.hud, hud, `${title} restarted or advanced while resizing a paused round`)
      }
      await page.locator(".cw-preview").evaluate(element => { element.style.width = ""; element.style.height = ""; element.style.minHeight = "" })
      await page.waitForFunction(() => document.querySelector(".cw-preview canvas").width > 300)
    }
    await setPaused(false)
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.getByText("Animation paused by your system’s Reduce motion setting.", { exact: true }).waitFor()
    if (mode === "fire" || mode === "elastic" || mode === "grass") {
      const reducedFrame = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      assert.equal(await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL()), reducedFrame)
    }
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.getByText(new RegExp(`${title} is animating`)).waitFor()
  }
  // Gallery thumbnails are static even while the selected wallpaper moves.
  const thumbnails = await page.locator(".cw-thumbnail").evaluateAll(canvases => canvases.map(canvas => canvas.toDataURL()))
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  assert.deepEqual(await page.locator(".cw-thumbnail").evaluateAll(canvases => canvases.map(canvas => canvas.toDataURL())), thumbnails)
  // Measure the wallpaper pixels themselves against white, not text or a CSS background.
  // Palettes must change even while paused, and dark mode must restore the exact still frame.
  await setPaused(true)
  await page.getByRole("slider", { name: "Dimming", exact: true }).evaluate(input => {
    input.value = "55"; input.dispatchEvent(new Event("change", { bubbles: true }))
  })
  // Start a fresh paused round to verify orientation independently of autoplay progress.
  await page.reload()
  await page.getByRole("heading", { name: "Set the atmosphere." }).waitFor()
  await setPaused(true)
  await page.getByRole("slider", { name: "Dimming", exact: true }).evaluate(input => {
    input.value = "55"; input.dispatchEvent(new Event("change", { bubbles: true }))
  })
  await page.getByRole("radio", { name: /Blockfall/ }).check()
  await showPreview()
  const orientation = await page.locator(".cw-preview canvas").first().evaluate(canvas => ({ field: canvas.__playfield, blocks: canvas.__blocks }))
  const stack = orientation.blocks.filter(block => Math.abs(block.alpha - 0.7) < 0.001)
  assert(stack.length > 10)
  assert(stack.every(({ args }) => args[1] + args[3] < orientation.field[1] + orientation.field[3] * 0.3), "Blockfall still accumulates at the bottom")
  const incomingY = Math.max(...orientation.blocks.filter(block => Math.abs(block.alpha - 0.85) < 0.001).map(block => block.args[1]))
  await setPaused(false)
  await page.waitForFunction(previous => {
    const blocks = document.querySelector(".cw-preview canvas").__blocks.filter(block => Math.abs(block.alpha - 0.85) < 0.001)
    return blocks.length && Math.max(...blocks.map(block => block.args[1])) < previous - 1
  }, incomingY)
  await setPaused(true)
  for (const [mode, title] of effects.filter(([id]) => id !== "aurora")) {
    if (mode === "rainbow") await page.evaluate(() => {
      // Sample a repeatable hue for this visibility check, not whichever hue
      // the wall clock happens to hit. Keep time advancing for the motion check.
      const real = Date.now, start = performance.now()
      window.__restoreAppearanceClock = () => { Date.now = real; delete window.__restoreAppearanceClock }
      Date.now = () => 1_800_000_000_000 + performance.now() - start
    })
    await page.getByRole("radio", { name: new RegExp(`^${title}\\b`) }).check()
    if (mode === "fire" || mode === "elastic" || mode === "grass") {
      await page.locator(".cw-preview").evaluate(element => { element.style.minHeight = "400px" })
      await page.waitForFunction(() => document.querySelector(".cw-preview canvas").height >= 400)
    }
    await showPreview()
    const dark = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    const darkState = await page.locator(".cw-preview canvas").first().evaluate(canvas => ({ ...canvas.dataset }))
    const thumbnail = page.getByRole("radio", { name: new RegExp(`^${title}\\b`) }).locator("..").locator("canvas")
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
    const restored = await page.locator(".cw-preview canvas").first().evaluate(canvas => ({ data: canvas.toDataURL(), state: { ...canvas.dataset } }))
    assert(restored.data === dark, `${title} did not restore its exact paused dark frame: ${JSON.stringify({ before: darkState, after: restored.state })}`)
    await setPaused(false)
    await page.getByRole("button", { name: "Use light theme", exact: true }).click()
    await page.locator('.cw-preview .cw-layer[data-appearance="light"][data-motion="animation"]').waitFor()
    const moving = await page.locator(".cw-preview canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.waitForFunction(previous => document.querySelector(".cw-preview canvas").toDataURL() !== previous, moving)
    await setPaused(true)
    await page.getByRole("button", { name: "Use dark theme", exact: true }).click()
    if (mode === "rainbow") await page.evaluate(() => window.__restoreAppearanceClock())
    if (mode === "fire" || mode === "elastic" || mode === "grass") {
      await page.locator(".cw-preview").evaluate(element => { element.style.minHeight = "" })
      await page.waitForFunction(() => document.querySelector(".cw-preview canvas").height < 300)
    }
  }
  await setPaused(false)
  // Every built-in keeps the same exact paused frame through conversation DOM
  // removal/remount. Use a single viewport so this proves state, not rescaling.
  for (const [mode, title] of [["matrix", "Rain"], ...effects]) {
    await page.getByRole("radio", { name: new RegExp(`^${title}\\b`) }).check()
    await setPaused(false)
    await page.getByText(new RegExp(`${title} is animating`)).waitFor()
    await setPaused(true)
    await page.getByRole("button", { name: "View conversation", exact: true }).click()
    await page.waitForFunction(() => {
      const canvas = document.querySelector(".test-timeline canvas")
      return canvas?.width > 300 && Number(canvas.dataset.sceneWidth) === Math.round(canvas.getBoundingClientRect().width)
        && Number(canvas.dataset.sceneHeight) === Math.round(canvas.getBoundingClientRect().height)
    })
    const before = await page.locator(".test-timeline canvas").first().evaluate(canvas => canvas.toDataURL())
    await page.getByRole("button", { name: "Next conversation", exact: true }).click()
    await page.waitForFunction(() => {
      const canvas = document.querySelector(".test-timeline canvas")
      return canvas?.width > 300 && Number(canvas.dataset.sceneWidth) === Math.round(canvas.getBoundingClientRect().width)
        && Number(canvas.dataset.sceneHeight) === Math.round(canvas.getBoundingClientRect().height)
    })
    assert(await page.locator(".test-timeline canvas").first().evaluate(canvas => canvas.toDataURL()) === before, `${title} reset on conversation change`)
    await page.getByRole("button", { name: "Wallpaper settings", exact: true }).click()
  }
  await setPaused(false)
  await page.getByRole("radio", { name: /^Image\b/ }).check()
  assert.equal(await page.getByRole("slider", { name: "Animation speed", exact: true }).count(), 0)
  const gif = Buffer.from("R0lGODlhEAAQAIEAAAg4IwAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAEAAQAAAIHQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFgQEBACH5BAEKAAEALAAAAAAQABAAgY//wgAAAAAAAAAAAAgdAAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWBAQEAOw==", "base64")
  await page.locator('input[type="file"]').setInputFiles({ name: "animated-test.gif", mimeType: "image/gif", buffer: gif })
  await page.getByText("animated-test.gif", { exact: true }).waitFor()
  await showPreview()
  await page.waitForFunction(() => document.querySelector(".cw-preview img")?.naturalWidth === 16)
  await page.getByRole("button", { name: "View conversation", exact: true }).click()
  await page.waitForFunction(() => { const image = document.querySelector(".test-timeline img"); return image?.naturalWidth === 16 && !image.hidden })
  const decoder = await page.locator(".test-timeline img").evaluate(image => {
    window.__uploadDecoder = image
    return image.__sourceAssignments
  })
  await page.getByRole("button", { name: "Next conversation", exact: true }).click()
  await page.waitForFunction(() => { const image = document.querySelector(".test-timeline img"); return image?.naturalWidth === 16 && !image.hidden })
  assert(await page.locator(".test-timeline img").evaluate((image, assignments) => image === window.__uploadDecoder && image.__sourceAssignments === assignments, decoder), "Conversation change restarted the image decoder")
  await page.getByRole("button", { name: "Wallpaper settings", exact: true }).click()
  await showPreview()
  await page.waitForFunction(() => { const image = document.querySelector(".cw-preview img"); return image?.naturalWidth === 16 && !image.hidden })
  await setPaused(true)
  await page.waitForFunction(() => {
    const image = document.querySelector(".cw-preview img")
    const still = document.querySelectorAll(".cw-preview canvas")[1]
    return image && !image.hasAttribute("src") && image.hidden && !still.hidden && still.width === 16
  })
  await setPaused(false)
  await page.waitForFunction(() => document.querySelector(".cw-preview img")?.naturalWidth === 16)
  const uploaded = await page.locator(".cw-preview img").getAttribute("src")
  await page.getByRole("radio", { name: /^Mist\b/ }).check()
  await page.getByRole("radio", { name: /^Image\b/ }).check()
  await showPreview()
  await page.waitForFunction(() => document.querySelector(".cw-preview img")?.naturalWidth === 16)
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
  await showPreview()
  await page.waitForFunction(() => document.querySelector(".cw-preview img")?.naturalWidth === 64)
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
  await page.getByRole("radio", { name: /^Rain\b/ }).check()
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
    const images = [
      ["collection.png", "collection.png"], ["aurora.png", "aurora-dark.png"],
      ["fireflies.png", "fireflies-dark.png"], ["clouds-light.png", "clouds-light.png"],
      ["starfield-light.png", "starfield-light.png"],
      ["blockfall.png", "blockfall-dark.png"], ["maze-chase.png", "maze-chase-dark.png"],
      ["pixel-clouds.png", "pixel-clouds-dark.png"], ["plaza-light.png", "plaza-light.png"],
      ["cardiogram.png", "cardiogram-dark.png"], ["tremor.png", "tremor-dark.png"], ["polygraph.png", "polygraph-dark.png"],
      ["fire.png", "fire-dark.png"], ["fire-light.png", "fire-light.png"],
      ["elastic.png", "elastic-dark.png"], ["elastic-light.png", "elastic-light.png"],
      ["grass.png", "grass-dark.png"], ["grass-light.png", "grass-light.png"],
    ]
    const requested = process.argv.find(arg => arg.startsWith("--doc-images="))?.slice("--doc-images=".length).split(",")
    if (requested) for (const name of requested) assert(images.some(([, target]) => target === name), `Unknown documentation image: ${name}`)
    for (const [source, target] of images) if (!requested || requested.includes(target)) {
      await copyFile(`test-results/${source}`, `docs/images/${target}`)
    }
    console.log("README screenshots refreshed in docs/images/ from the verified mock desktop layout.")
  }
  console.log("Browser checks passed: all 34 animations retain state across conversation changes, shared image-decoder handoff, alphabetical controls-first Wallpaper settings, 0.1x–10x built-in speed, stronger Elastic, light/dark themes, static thumbnails, pause/reduced motion, uploads, chat interaction, narrow layout, unload/reload. Screenshots: test-results/")
} finally {
  await browser.close()
  await server.close()
}
