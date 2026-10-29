import { expect, it, vi } from "vitest"
import { Rain } from "../src/rain"
import { drawing } from "./environment"

it("moves glyphs continuously between cells instead of appearing frozen between grid steps", () => {
  const random = vi.spyOn(Math, "random").mockReturnValue(0.5)
  try {
    const rain = new Rain()
    rain.resize(100, 600)
    rain.draw(drawing as unknown as CanvasRenderingContext2D, 0, 1)
    const previousY = drawing.fillText.mock.calls[0][2]
    drawing.fillText.mockClear()
    rain.draw(drawing as unknown as CanvasRenderingContext2D, 0.05, 1)
    expect(drawing.fillText.mock.calls[0][2]).toBeGreaterThan(previousY)
    expect(drawing.fillText.mock.calls[0][2] - previousY).toBeLessThan(20)
  } finally { random.mockRestore() }
})
