import { beforeEach, describe, expect, test } from 'bun:test'
import { buildLayout } from './build-layout'
import { checkOverlaps, clampLayoutToCols, computeLayoutWithCols } from './compute-layout'
import { gridStore } from './context'
import { enforceMinH } from './enforce'
import { pxToGridH } from './measurement'
import { toGridConfig } from './use-grid-config'
describe('computeLayoutWithCols', () => {
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
  test('clamps item width larger than cols', () => {
    const items = [{ h: 2, i: 'a', w: 48, x: 0, y: 0 }]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]?.w).toBe(24)
  })
  test('empty input returns empty', () => {
    expect(computeLayoutWithCols([], 24)).toEqual([])
  })
  test('stacks when row is full', () => {
    const items = [
      { h: 3, i: 'a', w: 24, x: 0, y: 0 },
      { h: 2, i: 'b', w: 12, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[1]).toMatchObject({ i: 'b', x: 0, y: 3 })
  })
})
describe('clampLayoutToCols', () => {
  test('shrinks items wider than cols', () => {
    const items = [{ h: 1, i: 'a', w: 24, x: 0, y: 0 }]
    expect(clampLayoutToCols(items, 12)[0]?.w).toBe(12)
  })
  test('moves items that overflow', () => {
    const items = [{ h: 1, i: 'a', w: 6, x: 20, y: 0 }]
    const clamped = clampLayoutToCols(items, 12)
    expect(clamped[0]).toMatchObject({ w: 6, x: 6 })
  })
  test('unchanged when fits', () => {
    const items = [{ h: 1, i: 'a', w: 6, x: 3, y: 0 }]
    const clamped = clampLayoutToCols(items, 12)
    expect(clamped[0]).toBe(items[0])
  })
})
describe('checkOverlaps', () => {
  test('does not throw on valid layout', () => {
    const items = [
      { h: 2, i: 'a', w: 12, x: 0, y: 0 },
      { h: 2, i: 'b', w: 12, x: 12, y: 0 }
    ]
    expect(() => checkOverlaps(items)).not.toThrow()
  })
})
describe('pxToGridH', () => {
  test('converts pixels to grid units with margin', () => {
    expect(pxToGridH(90, 50, 16)).toBe(2)
    expect(pxToGridH(91, 50, 16)).toBe(2)
    expect(pxToGridH(132, 50, 16)).toBe(3)
  })
  test('zero pixels still returns 1 row minimum', () => {
    expect(pxToGridH(0, 50, 16)).toBe(1)
  })
})
describe('enforceMinH', () => {
  const fillSet = new Set<string>()
  const savedLayout = [
    { h: 4, i: 'a', w: 12, x: 0, y: 0 },
    { h: 4, i: 'b', w: 12, x: 12, y: 0 },
    { h: 6, i: 'c', w: 24, x: 0, y: 4 }
  ]
  test('measuring phase grows items below minH', () => {
    const minH = new Map([
      ['a', 5],
      ['b', 3],
      ['c', 6]
    ])
    const out = enforceMinH({ fillSet, layout: savedLayout, minHByKey: minH, phase: 'measuring' })
    expect(out[0]?.h).toBe(5)
    expect(out[1]?.h).toBe(4)
    expect(out[2]?.h).toBe(6)
  })
  test('done phase returns layout unchanged (regression)', () => {
    const minH = new Map([
      ['a', 99],
      ['b', 99]
    ])
    const out = enforceMinH({ fillSet, layout: savedLayout, minHByKey: minH, phase: 'done' })
    expect(out).toBe(savedLayout)
  })
  test('fill items never modified in measuring', () => {
    const fills = new Set(['a'])
    const minH = new Map([['a', 99]])
    const out = enforceMinH({ fillSet: fills, layout: savedLayout, minHByKey: minH, phase: 'measuring' })
    expect(out[0]?.h).toBe(4)
  })
  test('falls back to item minH when minHByKey missing', () => {
    const layout = [{ h: 2, i: 'a', minH: 5, w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet, layout, minHByKey: new Map(), phase: 'measuring' })
    expect(out[0]?.h).toBe(5)
  })
  test('defaults to 1 when no minH anywhere', () => {
    const layout = [{ h: 3, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet, layout, minHByKey: new Map(), phase: 'measuring' })
    expect(out[0]?.h).toBe(3)
  })
  test('empty layout', () => {
    expect(enforceMinH({ fillSet, layout: [], minHByKey: new Map(), phase: 'measuring' })).toEqual([])
  })
  test('all-fill layout passes through', () => {
    const fills = new Set(['a', 'b'])
    const layout = [
      { h: 2, i: 'a', w: 12, x: 0, y: 0 },
      { h: 2, i: 'b', w: 12, x: 12, y: 0 }
    ]
    const minH = new Map([
      ['a', 99],
      ['b', 99]
    ])
    const out = enforceMinH({ fillSet: fills, layout, minHByKey: minH, phase: 'measuring' })
    expect(out[0]?.h).toBe(2)
    expect(out[1]?.h).toBe(2)
  })
})
describe('buildLayout', () => {
  test('uses defaults when key not in configMap', () => {
    const out = buildLayout({ cols: 24, configMap: new Map(), fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]).toMatchObject({ h: 1, i: 'a', w: 24, x: 0, y: 0 })
  })
  test('fill items default h=8', () => {
    const out = buildLayout({ cols: 24, configMap: new Map(), fillSet: new Set(['a']), itemKeys: ['a'] })
    expect(out[0]?.h).toBe(8)
  })
  test('respects explicit h/x/y/w', () => {
    const configMap = new Map([['a', { h: 5, w: 12, x: 6, y: 3 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]).toMatchObject({ h: 5, w: 12, x: 6, y: 3 })
  })
  test('explicit h overrides fill default', () => {
    const configMap = new Map([['a', { h: 3 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(['a']), itemKeys: ['a'] })
    expect(out[0]?.h).toBe(3)
  })
  test('preserves minH/minW', () => {
    const configMap = new Map([['a', { minH: 2, minW: 4 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]).toMatchObject({ minH: 2, minW: 4 })
  })
  test('ignores keys not in itemKeys', () => {
    const configMap = new Map([
      ['a', { h: 5 }],
      ['ghost', { h: 99 }]
    ])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out).toHaveLength(1)
  })
  test('empty itemKeys', () => {
    expect(buildLayout({ cols: 24, configMap: new Map(), fillSet: new Set(), itemKeys: [] })).toEqual([])
  })
  test('preserves itemKeys order', () => {
    const out = buildLayout({ cols: 24, configMap: new Map(), fillSet: new Set(), itemKeys: ['c', 'a', 'b'] })
    expect(out.map(i => i.i)).toEqual(['c', 'a', 'b'])
  })
})
describe('gridStore', () => {
  beforeEach(() => {
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'measuring',
      positionedIds: new Set(),
      reset: () => {
        /* Empty */
      },
      resizedIds: new Set(),
      rowHeight: 50,
      setCols: () => {
        /* Empty */
      },
      setGap: () => {
        /* Empty */
      },
      setRowHeight: () => {
        /* Empty */
      },
      showRings: false,
      toggleRings: () => {
        /* Empty */
      }
    })
  })
  test('getSnapshot returns set state', () => {
    expect(gridStore.getSnapshot()?.cols).toBe(24)
  })
  test('setState notifies subscribers', () => {
    let calls = 0
    const unsub = gridStore.subscribe(() => {
      calls += 1
    })
    gridStore.setState({ ...gridStore.getSnapshot(), cols: 12 })
    gridStore.setState({ ...gridStore.getSnapshot(), cols: 16 })
    unsub()
    expect(calls).toBe(2)
  })
  test('unsubscribe stops notifications', () => {
    let calls = 0
    const unsub = gridStore.subscribe(() => {
      calls += 1
    })
    unsub()
    gridStore.setState({ ...gridStore.getSnapshot(), cols: 12 })
    expect(calls).toBe(0)
  })
  test('multiple subscribers all notified', () => {
    let a = 0
    let b = 0
    const ua = gridStore.subscribe(() => {
      a += 1
    })
    const ub = gridStore.subscribe(() => {
      b += 1
    })
    gridStore.setState({ ...gridStore.getSnapshot(), cols: 12 })
    ua()
    ub()
    expect(a).toBe(1)
    expect(b).toBe(1)
  })
})
describe('bug: reload + resize causes cascade growth', () => {
  test('reload scenario: saved h smaller than measured minH — done phase preserves all', () => {
    const savedLayout = [
      { h: 4, i: 'kpi', w: 12, x: 12, y: 0 },
      { h: 4, i: 'progress', w: 12, x: 0, y: 8 },
      { h: 3, i: 'stats', w: 8, x: 16, y: 12 },
      { h: 5, i: 'timeline', w: 12, x: 12, y: 18 },
      { h: 3, i: 'text', w: 12, x: 0, y: 39 }
    ]
    const measuredMinH = new Map([
      ['kpi', 5],
      ['progress', 5],
      ['stats', 4],
      ['text', 4],
      ['timeline', 6]
    ])
    const afterResize = enforceMinH({
      fillSet: new Set(),
      layout: savedLayout,
      minHByKey: measuredMinH,
      phase: 'done'
    })
    for (let i = 0; i < savedLayout.length; i += 1) expect(afterResize[i]?.h).toBe(savedLayout[i]?.h ?? 0)
  })
  test('reload scenario: only measurement phase grows items (initial load only)', () => {
    const savedLayout = [
      { h: 4, i: 'a', w: 12, x: 0, y: 0 },
      { h: 4, i: 'b', w: 12, x: 12, y: 0 }
    ]
    const measuredMinH = new Map([
      ['a', 5],
      ['b', 5]
    ])
    const measuring = enforceMinH({ fillSet: new Set(), layout: savedLayout, minHByKey: measuredMinH, phase: 'measuring' })
    expect(measuring[0]?.h).toBe(5)
    expect(measuring[1]?.h).toBe(5)
    const done = enforceMinH({ fillSet: new Set(), layout: measuring, minHByKey: measuredMinH, phase: 'done' })
    expect(done[0]?.h).toBe(5)
    expect(done[1]?.h).toBe(5)
    const anotherLayoutChange = enforceMinH({
      fillSet: new Set(),
      layout: done,
      minHByKey: new Map([
        ['a', 99],
        ['b', 99]
      ]),
      phase: 'done'
    })
    expect(anotherLayoutChange[0]?.h).toBe(5)
    expect(anotherLayoutChange[1]?.h).toBe(5)
  })
  test('round-trip: saved config → toGridConfig after measurement preserves positions', () => {
    const originalLayout = [
      { h: 8, i: 'chart', w: 12, x: 0, y: 0 },
      { h: 4, i: 'kpi', w: 12, x: 12, y: 0 },
      { h: 8, i: 'area', w: 12, x: 12, y: 4 }
    ]
    const fillSet = new Set(['area', 'chart'])
    const cfg = toGridConfig({ cols: 24, fillSet, gap: 16, layout: originalLayout, rowHeight: 50 })
    expect(cfg.layout).toHaveLength(3)
    expect(cfg.layout?.[0]).toMatchObject({ fill: true, h: 8, i: 'chart', w: 12 })
    expect(cfg.layout?.[1]).toMatchObject({ h: 4, i: 'kpi', w: 12, x: 12 })
    expect(cfg.layout?.[2]).toMatchObject({ fill: true, h: 8, i: 'area', w: 12, x: 12, y: 4 })
  })
})
describe('round-trip: buildLayout + toGridConfig', () => {
  test('config → buildLayout → toGridConfig preserves user data', () => {
    const savedConfig = {
      layout: [
        { fill: true, h: 8, i: 'chart', w: 12 },
        { h: 4, i: 'kpi', w: 12, x: 12 },
        { h: 6, i: 'table', w: 16, y: 12 }
      ]
    }
    const itemKeys = savedConfig.layout.map(i => i.i)
    const configMap = new Map(savedConfig.layout.map(i => [i.i, i]))
    const fillSet = new Set(savedConfig.layout.filter(i => i.fill).map(i => i.i))
    const built = buildLayout({ cols: 24, configMap, fillSet, itemKeys })
    const roundTripped = toGridConfig({ cols: 24, fillSet, gap: 16, layout: built, rowHeight: 50 })
    for (const original of savedConfig.layout) {
      const round = roundTripped.layout?.find(r => r.i === original.i)
      expect(round?.h).toBe(original.h)
      expect(round?.w).toBe(original.w)
      expect(round?.fill).toBe(original.fill ?? undefined)
    }
  })
  test('default config → buildLayout produces full-width items', () => {
    const itemKeys = ['a', 'b']
    const configMap = new Map()
    const fillSet = new Set<string>()
    const built = buildLayout({ cols: 24, configMap, fillSet, itemKeys })
    expect(built[0]?.w).toBe(24)
    expect(built[1]?.w).toBe(24)
  })
})
describe('toGridConfig', () => {
  test('omits defaults, preserves non-defaults', () => {
    const layout = [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.cols).toBeUndefined()
    expect(cfg.gap).toBeUndefined()
    expect(cfg.rowHeight).toBeUndefined()
  })
  test('includes non-default cols/gap/rowHeight', () => {
    const cfg = toGridConfig({ cols: 12, gap: 8, layout: [], rowHeight: 40 })
    expect(cfg.cols).toBe(12)
    expect(cfg.gap).toBe(8)
    expect(cfg.rowHeight).toBe(40)
  })
  test('omits x=0 and y=0 in layout items', () => {
    const layout = [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    const item = cfg.layout?.[0]
    expect(item?.x).toBeUndefined()
    expect(item?.y).toBeUndefined()
  })
  test('preserves non-zero x, y, h', () => {
    const layout = [{ h: 6, i: 'a', w: 12, x: 12, y: 4 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    const item = cfg.layout?.[0]
    expect(item).toMatchObject({ h: 6, i: 'a', w: 12, x: 12, y: 4 })
  })
  test('marks fill items', () => {
    const fillSet = new Set(['a'])
    const layout = [{ h: 8, i: 'a', w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, fillSet, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.fill).toBe(true)
  })
  test('omits minH when equal to h', () => {
    const layout = [{ h: 4, i: 'a', minH: 4, w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.minH).toBeUndefined()
  })
  test('preserves minH when different from h', () => {
    const layout = [{ h: 10, i: 'a', minH: 3, w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.minH).toBe(3)
  })
})
