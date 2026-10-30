import { expect, it } from "vitest"
import { createScene } from "../src/scenes"
import { cardiogramAt } from "../src/scenes-flow"
import { polygraphAt, tremorAt } from "../src/scenes-instruments"
import { drawing } from "./environment"

it("Cardiogram keeps its peak at the same x coordinate as its height changes", () => {
  const scene = createScene("cardiogram"), context = drawing as unknown as CanvasRenderingContext2D
  scene.resize(800, 600); scene.draw(context, 0, 1)
  const first = drawing.lineTo.mock.calls.map(call => [...call])
  drawing.lineTo.mockClear(); scene.draw(context, 0.1, 1)
  const second = drawing.lineTo.mock.calls
  const peak = (points: number[][]) => points.reduce((lowest, point) => point[1] < lowest[1] ? point : lowest)
  expect(peak(first)[0]).toBe(400)
  expect(peak(second)[0]).toBe(400)
  expect(peak(second)[1]).not.toBe(peak(first)[1])
  expect(first.map(point => point[0])).toEqual(second.map(point => point[0]))
  for (let i = 0; i < 7; i++) scene.draw(context, 0.1, 1)
  drawing.lineTo.mockClear(); scene.draw(context, 0, 1)
  expect(drawing.lineTo.mock.calls.every(([, y]) => y === 600 * 0.54)).toBe(true)
})

it("the fixed pulse is localized instead of repeating or traveling across the whole line", () => {
  for (const time of [0, 0.1, 0.2, 1.6, 1.7]) {
    const samples = Array.from({ length: 101 }, (_, i) => cardiogramAt(i / 100, time))
    expect(samples.indexOf(Math.max(...samples))).toBe(50)
    expect(Math.abs(samples[10])).toBeLessThan(1e-10)
    expect(Math.abs(samples[90])).toBeLessThan(1e-10)
  }
})

it("seismic-style vibrations have bursts and a quiet interval, within bounded amplitudes", () => {
  const energy = (time: number) => Array.from({ length: 101 }, (_, i) => Math.abs(tremorAt(i / 100, time))).reduce((a, b) => a + b, 0)
  expect(energy(0)).toBeGreaterThan(energy(3) * 4)
  for (let i = 0; i < 200; i++) expect(Math.abs(tremorAt(i / 199, i * 0.17))).toBeLessThanOrEqual(1)
})

it("polygraph-style channels are distinct procedural traces, with no person or sensor input", () => {
  const traces = [0, 1, 2].map(channel => Array.from({ length: 50 }, (_, i) => polygraphAt(i / 49, 1, channel)))
  expect(traces[0]).not.toEqual(traces[1]); expect(traces[1]).not.toEqual(traces[2])
  expect(traces.flat().every(value => Number.isFinite(value) && Math.abs(value) <= 1)).toBe(true)
})
