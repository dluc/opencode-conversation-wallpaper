export type Mode = "matrix" | "image"
export interface Preferences {
  enabled: boolean
  mode: Mode
  image: string
  imageName: string
  dimming: number
  speed: number
  paused: boolean
  fit: "cover" | "contain"
}

export const defaults: Preferences = {
  enabled: true,
  mode: "matrix",
  image: "",
  imageName: "",
  dimming: 75,
  speed: 1,
  paused: false,
  fit: "cover",
}

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif"]

export function validateImage(file: Pick<File, "type" | "size">): void {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Choose a PNG, JPEG, GIF, WebP, or AVIF image.")
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Choose an image smaller than 8 MB.")
  if (!file.size) throw new Error("This image is empty.")
}

// Stored values may come from an older version or manual edits. Never load a remote URL.
export function imageSource(value: string): string {
  return /^data:image\/(png|jpeg|gif|webp|avif);base64,[A-Za-z0-9+/=\r\n]+$/.test(value)
    && value.length <= Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 128 ? value : ""
}

export function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min
}
