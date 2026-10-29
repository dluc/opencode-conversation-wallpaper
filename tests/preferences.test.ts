import { describe, expect, it } from "vitest"
import { clamp, imageSource, MAX_IMAGE_BYTES, validateImage } from "../src/preferences"

describe("image validation", () => {
  it("accepts local still and animated raster formats", () => {
    for (const type of ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]) {
      expect(() => validateImage({ type, size: 1234 })).not.toThrow()
      expect(imageSource(`data:${type};base64,R0lGODlhAQABAIA=`)).not.toBe("")
    }
  })
  it("rejects active content, empty files, and oversized files", () => {
    expect(() => validateImage({ type: "image/svg+xml", size: 10 })).toThrow("Choose a PNG")
    expect(() => validateImage({ type: "image/png", size: 0 })).toThrow("empty")
    expect(() => validateImage({ type: "image/gif", size: MAX_IMAGE_BYTES + 1 })).toThrow("8 MB")
  })
  it("never loads remote URLs or arbitrary data schemes from storage", () => {
    for (const source of ["https://example.com/image.png", "file:///image.png", "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zz4=", "data:image/png;base64,???"]) {
      expect(imageSource(source)).toBe("")
    }
  })
  it("bounds rendering controls including non-finite numbers", () => {
    expect(clamp(300, 0, 100)).toBe(100)
    expect(clamp(-4, 0, 100)).toBe(0)
    expect(clamp(NaN, 0, 100)).toBe(0)
  })
})
