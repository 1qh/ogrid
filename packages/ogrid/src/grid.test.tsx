import { describe, expect, test } from 'bun:test'
import { computeLayoutWithCols } from './compute-layout'
import { enforceMinH } from './enforce'
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
describe('enforceMinH', () => {
  const fillSet = new Set<string>()
  const savedLayout = [
    { h: 4, i: 'a', w: 12, x: 0, y: 0 },
    { h: 4, i: 'b', w: 12, x: 12, y: 0 },
    { h: 6, i: 'c', w: 24, x: 0, y: 4 }
  ]
  test('measuring phase: grows items below minH', () => {
    const minH = new Map([
      ['a', 5],
      ['b', 3],
      ['c', 6]
    ])
    const out = enforceMinH({ fillSet, layout: savedLayout, minHByKey: minH, phase: 'measuring' })
    expect(out[0].h).toBe(5)
    expect(out[1].h).toBe(4)
    expect(out[2].h).toBe(6)
  })
  test('done phase: no growth — trusts saved heights (regression)', () => {
    const minH = new Map([
      ['a', 5],
      ['b', 5],
      ['c', 8]
    ])
    const out = enforceMinH({ fillSet, layout: savedLayout, minHByKey: minH, phase: 'done' })
    expect(out[0].h).toBe(4)
    expect(out[1].h).toBe(4)
    expect(out[2].h).toBe(6)
  })
  test('fill items: never modified', () => {
    const fills = new Set(['a'])
    const minH = new Map([['a', 99]])
    const out = enforceMinH({ fillSet: fills, layout: savedLayout, minHByKey: minH, phase: 'measuring' })
    expect(out[0].h).toBe(4)
  })
})
