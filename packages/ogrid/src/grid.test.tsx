import { describe, expect, test } from 'bun:test'
import { computeLayoutWithCols } from './compute-layout'
import { pxToGridH } from './measurement'
describe('computeLayout', () => {
  test('places items row by row', () => {
    const items = [
      { h: 2, i: 'a', w: 12, x: 0, y: 0 },
      { h: 2, i: 'b', w: 12, x: 0, y: 0 },
      { h: 2, i: 'c', w: 24, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]).toMatchObject({ i: 'a', x: 0, y: 0 })
    expect(placed[1]).toMatchObject({ i: 'b', x: 12, y: 0 })
    expect(placed[2]).toMatchObject({ i: 'c', x: 0, y: 2 })
  })
})
describe('pxToGridH', () => {
  test('converts pixels to grid units with margin', () => {
    expect(pxToGridH(90, 50, 16)).toBe(2)
    expect(pxToGridH(91, 50, 16)).toBe(2)
    expect(pxToGridH(132, 50, 16)).toBe(3)
  })
})
