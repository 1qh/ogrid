/* eslint-disable no-console */
import type { Layout, LayoutItem } from 'react-grid-layout'
const computeLayoutWithCols = (items: Layout, cols: number): Layout => {
  const colBottoms = Array.from({ length: cols }, () => 0)
  const result: LayoutItem[] = []
  for (const item of items) {
    const w = Math.min(item.w, cols)
    let bestY = Number.POSITIVE_INFINITY
    let bestX = item.x
    for (let x = 0; x <= cols - w; x += 1) {
      let maxY = 0
      for (let col = x; col < x + w; col += 1) maxY = Math.max(maxY, colBottoms[col] ?? 0)
      if (maxY < bestY) {
        bestY = maxY
        bestX = x
      }
    }
    const placed = { ...item, w, x: bestX, y: bestY }
    result.push(placed)
    for (let col = bestX; col < bestX + placed.w; col += 1) colBottoms[col] = bestY + placed.h
  }
  return result
}
const clampLayoutToCols = (items: Layout, cols: number): Layout =>
  items.map(item => {
    const w = Math.min(item.w, cols)
    const x = Math.min(item.x, cols - w)
    return w !== item.w || x !== item.x ? { ...item, w, x } : item
  })
const checkOverlaps = (items: Layout) => {
  for (let a = 0; a < items.length; a += 1)
    for (let b = a + 1; b < items.length; b += 1) {
      const ia = items[a]
      const ib = items[b]
      if (ia && ib && ia.x < ib.x + ib.w && ia.x + ia.w > ib.x && ia.y < ib.y + ib.h && ia.y + ia.h > ib.y)
        console.warn(`[ogrid] overlap detected: '${ia.i}' and '${ib.i}'`)
    }
}
export { checkOverlaps, clampLayoutToCols, computeLayoutWithCols }
