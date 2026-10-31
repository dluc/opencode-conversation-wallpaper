import { clamp, type BuiltinMode, type Mode } from "./preferences"
import { Rain } from "./rain"
import { AmbientScene, type Appearance, type Scene } from "./scene"
import { BouncingBalls, DiscoLights, MeteorShower, NightSky } from "./scenes-extra"
import { BlockfallScene, MazeChaseScene } from "./scenes-games"
import { PixelClouds, TrainWindow, PixelAquarium, RipplePond } from "./scenes-retro"
import { Cardiogram, FlowingRiver, PedestrianPlaza } from "./scenes-flow"
import { GameOfLife } from "./scenes-life"
import { Glass, Ocean, Coast, Embers, Leaves } from "./scenes-landscapes"
import { Constellations, Orbits, Boats, Contours } from "./scenes-patterns"
import { Tremor, Polygraph } from "./scenes-instruments"
import { Rainbow } from "./scenes-color"
import { Fire } from "./scenes-fire"
import { Elastic } from "./scenes-elastic"
import { Grass } from "./scenes-grass"
import { createExperimentalScene, experimentalCollection } from "./scenes-experimental"
export type { Appearance, Scene } from "./scene"

export const collection: ReadonlyArray<{ id: BuiltinMode; title: string; description: string }> = [
  { id: "matrix", title: "Rain", description: "Falling glyphs · Green phosphor" },
  { id: "clouds", title: "Mist", description: "Horizontal drift · Silver-blue mist" },
  { id: "fireflies", title: "Fireflies", description: "Free wandering · Warm points of light" },
  { id: "starfield", title: "Starfield", description: "Through depth · Quiet cosmic travel" },
  { id: "aurora", title: "Aurora", description: "Flowing ribbons · Teal and violet" },
  { id: "meteors", title: "Meteors", description: "Diagonal trails · Shooting stars" },
  { id: "night-sky", title: "Sky", description: "Earthbound view · Circling stars" },
  { id: "balls", title: "Bounce", description: "Playful motion · Elastic rebounds" },
  { id: "blockfall", title: "Blockfall", description: "Autoplay · Stack at the top" },
  { id: "disco", title: "Disco", description: "Slow sweeps · No strobe" },
  { id: "maze-chase", title: "Maze", description: "Autoplay · Collect, evade, repeat" },
  { id: "pixel-clouds", title: "Clouds", description: "Retro sky · Chunky drifting clouds" },
  { id: "train-window", title: "Journey", description: "Parallax hills · A quiet journey" },
  { id: "aquarium", title: "Aquarium", description: "Swimming fish · Rising bubbles" },
  { id: "ripple-pond", title: "Ripples", description: "Gentle rain · Expanding rings" },
  { id: "cardiogram", title: "Cardiogram", description: "Fixed line · Beats in place" },
  { id: "river", title: "River", description: "Winding water · Drifting currents" },
  { id: "life", title: "Life", description: "Evolving cells · Conway’s rules" },
  { id: "plaza", title: "Plaza", description: "Busy open space · People passing by" },
  { id: "constellations", title: "Constellations", description: "Connected stars · Gentle drift" },
  { id: "glass", title: "Glass", description: "Rain on a window · Sliding droplets" },
  { id: "ocean", title: "Ocean", description: "Layered waves · Open water" },
  { id: "embers", title: "Embers", description: "Warm sparks · Rising softly" },
  { id: "coast", title: "Coast", description: "Retro beach · Approaching waves" },
  { id: "boats", title: "Boats", description: "Paper boats · Drifting wakes" },
  { id: "orbits", title: "Orbits", description: "Miniature worlds · Elliptical paths" },
  { id: "leaves", title: "Leaves", description: "Autumn colors · Turning in the breeze" },
  { id: "contours", title: "Contours", description: "Topographic lines · Slow morphing" },
  { id: "tremor", title: "Tremor", description: "Seismic-style vibrations · Decorative only" },
  { id: "polygraph", title: "Polygraph", description: "Three wavering traces · Decorative only" },
  { id: "rainbow", title: "Rainbow", description: "Solid color · Slow full-spectrum cycle" },
  { id: "fire", title: "Fire", description: "Rising flow · Red, orange, yellow" },
  { id: "elastic", title: "Elastic", description: "Quiet architecture · Making room" },
  { id: "grass", title: "Grass", description: "Green blades · Slow wind-blown sway" },
  ...experimentalCollection,
]

/** Built-ins are alphabetical; the special upload option stays last.
 * Display order is independent of stable stored mode IDs and factory order. */
export const gallery: ReadonlyArray<{ id: Mode; title: string; description: string }> = [
  ...[...collection].sort((a, b) => a.title.localeCompare(b.title, "en")),
  { id: "image" as const, title: "Image", description: "Still or animated · Played as-is" },
]

export function wallpaperName(mode: string): string {
  return collection.find(scene => scene.id === mode)?.title ?? "Image"
}

/** Soft light is prerendered once, not rebuilt for every particle on every frame. */
function glowSprite(size: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, `rgba(${color}, 0.7)`)
    gradient.addColorStop(0.15, `rgba(${color}, 0.35)`)
    gradient.addColorStop(0.5, `rgba(${color}, 0.1)`)
    gradient.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return canvas
}

class CloudDrift extends AmbientScene {
  private sprite: HTMLCanvasElement | undefined
  private spriteAppearance: Appearance | undefined
  private clouds = Array.from({ length: 7 }, (_, i) => ({
    x: i / 7 * 1.6,
    y: 0.08 + (i * 0.173 % 0.62),
    scale: 0.42 + (i % 3) * 0.14,
    speed: 0.007 + (i % 3) * 0.003,
  }))

  protected paint(ctx: CanvasRenderingContext2D) {
    if (!this.sprite || this.spriteAppearance !== this.appearance) {
      this.spriteAppearance = this.appearance
      const light = this.appearance === "light"
      const color = light ? "35, 65, 95" : "176, 204, 235"
      // Overlapping wisps make one reusable, asymmetric cloud texture.
      this.sprite = document.createElement("canvas")
      this.sprite.width = 480; this.sprite.height = 180
      const spriteCtx = this.sprite.getContext("2d")
      if (spriteCtx) {
        for (let i = 0; i < 7; i++) {
          const x = 35 + i * 66, y = 90 + Math.sin(i * 1.7) * 17
          const gradient = spriteCtx.createRadialGradient(x, y, 15, x, y, 100)
          gradient.addColorStop(0, `rgba(${color}, ${light ? 0.34 : 0.22})`)
          gradient.addColorStop(0.55, `rgba(${color}, ${light ? 0.19 : 0.12})`)
          gradient.addColorStop(1, `rgba(${color}, 0)`)
          spriteCtx.fillStyle = gradient
          spriteCtx.fillRect(0, 0, 480, 180)
        }
        // Fade all texture edges to zero so overlapping scaled clouds never reveal boxes.
        spriteCtx.globalCompositeOperation = "destination-in"
        for (const [x, y] of [[480, 0], [0, 180]]) {
          const mask = spriteCtx.createLinearGradient(0, 0, x, y)
          mask.addColorStop(0, "transparent"); mask.addColorStop(0.2, "white")
          mask.addColorStop(0.8, "white"); mask.addColorStop(1, "transparent")
          spriteCtx.fillStyle = mask; spriteCtx.fillRect(0, 0, 480, 180)
        }
        spriteCtx.globalCompositeOperation = "source-over"
      }
    }
    for (const cloud of this.clouds) {
      const width = Math.max(220, this.width * cloud.scale)
      const height = width * 0.375
      const travel = this.width * 1.1 + width
      const x = (cloud.x / 1.6 * travel + this.time * cloud.speed * this.width) % travel - width
      ctx.globalAlpha = 0.5 + cloud.scale * 0.45
      ctx.drawImage(this.sprite, x, cloud.y * this.height - height / 3, width, height)
    }
  }
}

interface Mote { x: number; y: number; phase: number; size: number }
class Fireflies extends AmbientScene {
  private sprite: HTMLCanvasElement | undefined
  private spriteAppearance: Appearance | undefined
  private motes: Mote[] = []
  private count = 0
  protected layout() {
    if (!this.width || !this.height) return
    this.count = Math.round(clamp(this.width * this.height / 22000, 18, 60))
    if (this.motes.length) return
    this.motes = Array.from({ length: 60 }, () => ({
      x: 0.08 + Math.random() * 0.84, y: 0.12 + Math.random() * 0.76,
      phase: Math.random() * Math.PI * 2, size: 0.8 + Math.random() * 1.5,
    }))
  }
  protected paint(ctx: CanvasRenderingContext2D) {
    const light = this.appearance === "light"
    if (!this.sprite || this.spriteAppearance !== this.appearance) {
      this.spriteAppearance = this.appearance
      this.sprite = glowSprite(64, light ? "163, 101, 15" : "216, 241, 117")
    }
    for (let i = 0; i < this.count; i++) {
      const mote = this.motes[i]
      const x = (mote.x + Math.sin(this.time * 0.17 + mote.phase) * 0.07 + Math.cos(this.time * 0.09 + mote.phase) * 0.025) * this.width
      const y = (mote.y + Math.cos(this.time * 0.13 + mote.phase) * 0.08) * this.height
      const glow = light ? 0.7 + Math.sin(this.time * 0.6 + mote.phase) * 0.15
        : 0.6 + Math.sin(this.time * 0.6 + mote.phase) * 0.25
      const halo = 22 + mote.size * 11
      ctx.globalAlpha = glow
      ctx.drawImage(this.sprite, x - halo / 2, y - halo / 2, halo, halo)
      ctx.fillStyle = light ? "#945308" : "#edf8b1"
      ctx.beginPath(); ctx.arc(x, y, mote.size, 0, Math.PI * 2); ctx.fill()
    }
  }
}

interface Star { x: number; y: number; depth: number }
class Starfield extends AmbientScene {
  private stars: Star[] = []
  private count = 0
  protected layout() {
    if (!this.width || !this.height) return
    this.count = Math.round(clamp(this.width * this.height / 4000, 70, 220))
    if (this.stars.length) return
    this.stars = Array.from({ length: 220 }, () => ({
      x: Math.random() - 0.5, y: Math.random() - 0.5, depth: 0.12 + Math.random() * 1.08,
    }))
  }
  protected paint(ctx: CanvasRenderingContext2D, delta: number) {
    const light = this.appearance === "light"
    for (let i = 0; i < this.count; i++) {
      const star = this.stars[i]
      star.depth -= delta * 0.035
      if (star.depth < 0.12) star.depth += 1.08
      const x = this.width * (0.5 + star.x / star.depth)
      const y = this.height * (0.5 + star.y / star.depth)
      if (x < -5 || x > this.width + 5 || y < -5 || y > this.height + 5) continue
      const near = 1 - star.depth / 1.2
      ctx.globalAlpha = light ? 0.5 + near * 0.5 : 0.3 + near * 0.7
      ctx.fillStyle = light ? "#254466" : "#d8eaff"
      ctx.beginPath(); ctx.arc(x, y, light ? 0.85 + near * 1.35 : 0.55 + near * 1.2, 0, Math.PI * 2); ctx.fill()
      if (near > 0.65) {
        ctx.strokeStyle = light ? "#536a83" : "#94b6e0"; ctx.lineWidth = 0.6
        ctx.beginPath()
        ctx.moveTo(this.width * (0.5 + star.x / (star.depth + 0.008)), this.height * (0.5 + star.y / (star.depth + 0.008)))
        ctx.lineTo(x, y); ctx.stroke()
      }
    }
  }
}

class Aurora extends AmbientScene {
  protected paint(ctx: CanvasRenderingContext2D) {
    const colors = ["71, 233, 167", "63, 206, 214", "129, 123, 236", "79, 221, 175"]
    ctx.globalCompositeOperation = "screen"
    const steps = 80
    for (let band = 0; band < colors.length; band++) {
      const top = (x: number) => this.height * (0.16 + band * 0.085
        + Math.sin(x / this.width * 4.5 + this.time * 0.16 + band * 0.8) * 0.09
        + Math.sin(x / this.width * 10 - this.time * 0.11 + band) * 0.035)
      const bottom = (x: number) => top(x) + this.height * (0.14 + Math.sin(x / this.width * 5 + this.time * 0.1 + band) * 0.045)
      const gradient = ctx.createLinearGradient(0, this.height * (0.04 + band * 0.075), 0, this.height * (0.7 + band * 0.075))
      gradient.addColorStop(0, `rgba(${colors[band]}, 0)`)
      gradient.addColorStop(0.35, `rgba(${colors[band]}, 0.12)`)
      gradient.addColorStop(0.48, `rgba(${colors[band]}, 0.6)`)
      gradient.addColorStop(0.7, `rgba(${colors[band]}, 0.1)`)
      gradient.addColorStop(1, `rgba(${colors[band]}, 0)`)
      ctx.fillStyle = gradient
      ctx.beginPath(); ctx.moveTo(0, top(0))
      for (let step = 1; step <= steps; step++) { const x = step / steps * this.width; ctx.lineTo(x, top(x)) }
      for (let step = steps; step >= 0; step--) { const x = step / steps * this.width; ctx.lineTo(x, bottom(x)) }
      ctx.closePath(); ctx.fill()
    }
  }
}

export function createScene(mode: BuiltinMode): Scene {
  switch (mode) {
    case "matrix": return new Rain()
    case "clouds": return new CloudDrift()
    case "fireflies": return new Fireflies()
    case "starfield": return new Starfield()
    case "aurora": return new Aurora()
    case "meteors": return new MeteorShower()
    case "night-sky": return new NightSky()
    case "balls": return new BouncingBalls()
    case "blockfall": return new BlockfallScene()
    case "disco": return new DiscoLights()
    case "maze-chase": return new MazeChaseScene()
    case "pixel-clouds": return new PixelClouds()
    case "train-window": return new TrainWindow()
    case "aquarium": return new PixelAquarium()
    case "ripple-pond": return new RipplePond()
    case "cardiogram": return new Cardiogram()
    case "river": return new FlowingRiver()
    case "life": return new GameOfLife()
    case "plaza": return new PedestrianPlaza()
    case "constellations": return new Constellations()
    case "glass": return new Glass()
    case "ocean": return new Ocean()
    case "embers": return new Embers()
    case "coast": return new Coast()
    case "boats": return new Boats()
    case "orbits": return new Orbits()
    case "leaves": return new Leaves()
    case "contours": return new Contours()
    case "tremor": return new Tremor()
    case "polygraph": return new Polygraph()
    case "rainbow": return new Rainbow()
    case "fire": return new Fire()
    case "elastic": return new Elastic()
    case "grass": return new Grass()
    default: return createExperimentalScene(mode)
  }
}
