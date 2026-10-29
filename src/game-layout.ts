/** Full-area playfields with a small edge inset and a single compact HUD row. */
export function playfield(width: number, height: number) {
  const x = Math.min(8, width * 0.02), y = Math.min(20, height * 0.08)
  return { x, y, width: Math.max(0.001, width - x * 2), height: Math.max(0.001, height - y - Math.min(8, height * 0.02)) }
}

/** Choose near-square cells for the available aspect ratio; simulation work stays bounded. */
export function adaptiveGrid(width: number, height: number, cells: number, maze = false) {
  const field = playfield(width, height)
  const size = Math.sqrt(field.width * field.height / cells)
  const bound = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)))
  if (maze) return {
    columns: bound(field.width / size / 2, 5, 30) * 2 + 1,
    rows: bound(field.height / size / 2, 3, 20) * 2 + 1,
  }
  return { columns: bound(field.width / size, 8, 36), rows: bound(field.height / size, 8, 36) }
}
