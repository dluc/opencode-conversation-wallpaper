export interface Pedestrian {
  start: readonly [number, number]
  end: readonly [number, number]
  phase: number
  duration: number
  size: number
  color: number
}

export function makePedestrians(requested: number): Pedestrian[] {
  const count = Math.max(180, Math.min(360, Math.round(Number.isFinite(requested) ? requested : 180)))
  let seed = 19381
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
  const edge = (side: number, along: number): readonly [number, number] =>
    side === 0 ? [-0.08, along] : side === 1 ? [1.08, along] : side === 2 ? [along, -0.08] : [along, 1.08]
  return Array.from({ length: count }, (_, i) => {
    const side = i % 4, destination = i % 3 ? side ^ 1 : (side + 2) % 4
    const duration = 18 + random() * 20
    return { start: edge(side, random()), end: edge(destination, random()), phase: random() * duration,
      duration, size: 0.8 + random() * 0.5, color: i % 6 }
  })
}

/** Offscreen entry/exit endpoints make each analytical wrap invisible, not a teleport across the plaza. */
export function pedestrianPosition(person: Pedestrian, time: number, width: number, height: number) {
  const clock = ((time + person.phase) % person.duration + person.duration) % person.duration
  const progress = clock / person.duration, bend = Math.sin(progress * Math.PI) * Math.sin(time * 0.55 + person.phase) * 0.008
  return {
    x: (person.start[0] + (person.end[0] - person.start[0]) * progress + bend) * width,
    y: (person.start[1] + (person.end[1] - person.start[1]) * progress - bend) * height,
    angle: Math.atan2((person.end[1] - person.start[1]) * height, (person.end[0] - person.start[0]) * width),
  }
}
