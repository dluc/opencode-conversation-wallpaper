import type { ExperimentalMode } from "./preferences"
import type { Scene } from "./scene"
import { Blackhole, Bridge, Corona, Gravity, Lunar, Portal, Warp } from "./scenes-cosmos"
import { Fault, Fur, Labyrinth, Noise, Resonance, Underwater, Volcano } from "./scenes-earth"
import { Christmas, Court, Halloween, Music, Racing, Vinyl } from "./scenes-play"
import { Calendar, Clock, Sundial } from "./scenes-time"

/** Temporary branch collection: original procedural artwork, no franchise assets. */
export const experimentalCollection: ReadonlyArray<{ id: ExperimentalMode; title: string; description: string }> = [
  { id: "volcano", title: "Volcano", description: "Quiet eruption · Lava and ash" },
  { id: "bridge", title: "Bridge", description: "Observation deck · An original starship" },
  { id: "labyrinth", title: "Labyrinth", description: "True maze · A patient explorer" },
  { id: "underwater", title: "Underwater", description: "Kelp forest · Filtered sunlight" },
  { id: "blackhole", title: "Blackhole", description: "Dark center · A curling accretion disc" },
  { id: "warp", title: "Warp", description: "Radial star trails · Quiet acceleration" },
  { id: "portal", title: "Portal", description: "Sculpted ring · Rippling blue threshold" },
  { id: "fur", title: "Fur", description: "Fine fibers · A flowing velvet field" },
  { id: "gravity", title: "Gravity", description: "Curved spacetime · Orbiting bodies" },
  { id: "court", title: "Court", description: "Tennis study · An endless gentle rally" },
  { id: "vinyl", title: "Vinyl", description: "Spinning record · Silent grooves" },
  { id: "music", title: "Music", description: "Drifting notation · A breathing keyboard" },
  { id: "racing", title: "Racing", description: "Open road · An original driving scene" },
  { id: "halloween", title: "Halloween", description: "Pumpkins and bats · Moonlit mist" },
  { id: "christmas", title: "Christmas", description: "Snowy evergreens · Warm ornaments" },
  { id: "fault", title: "Fault", description: "Geological layers · Slow tectonic slip" },
  { id: "resonance", title: "Resonance", description: "Seismic wavefronts · No screen shake" },
  { id: "lunar", title: "Lunar", description: "Moon landing · A quiet descent" },
  { id: "corona", title: "Corona", description: "Solar prominences · Magnetic loops" },
  { id: "clock", title: "Clock", description: "Local wall time · A quiet analog dial" },
  { id: "sundial", title: "Sundial", description: "Decorative daylight · A moving shadow" },
  { id: "calendar", title: "Calendar", description: "Local month and date · Today in focus" },
  { id: "noise", title: "Noise", description: "Soft visual static · Slow crossfades" },
]

const factories: Record<ExperimentalMode, new () => Scene> = {
  volcano: Volcano, bridge: Bridge, labyrinth: Labyrinth, underwater: Underwater, blackhole: Blackhole,
  warp: Warp, portal: Portal, fur: Fur, gravity: Gravity, court: Court, vinyl: Vinyl, music: Music,
  racing: Racing, halloween: Halloween, christmas: Christmas, fault: Fault, resonance: Resonance,
  lunar: Lunar, corona: Corona, clock: Clock, sundial: Sundial, calendar: Calendar, noise: Noise,
}

export function createExperimentalScene(mode: ExperimentalMode): Scene { return new factories[mode]() }
