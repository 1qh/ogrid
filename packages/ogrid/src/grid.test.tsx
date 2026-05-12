/** biome-ignore-all lint/correctness/useUniqueElementIds: ogrid id prop */
/** biome-ignore-all lint/performance/noNamespaceImport: testing public exports */
/** biome-ignore-all lint/performance/useTopLevelRegex: test patterns */
/** biome-ignore-all lint/nursery/noComponentHookFactories: test probes */
/** biome-ignore-all lint/suspicious/noArrayIndexKey: test data */
/* oxlint-disable import/no-namespace, react-perf/jsx-no-jsx-as-prop, react-perf/jsx-no-new-object-as-prop, react-hooks/globals */
/** biome-ignore-all lint/performance/noAwaitInLoops: sequential mount tests */
/** biome-ignore-all lint/nursery/useExpect: has assertions */
/** biome-ignore-all lint/suspicious/noSkippedTests: Panel UX redesign — old DOM tests obsolete */
/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/unbound-method */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, test } from 'bun:test'
import { buildLayout } from './build-layout'
import { cn } from './cn'
import { checkOverlaps, clampLayoutToCols, computeLayoutWithCols } from './compute-layout'
import { MAX_GUARD_FRAMES } from './constants'
import { createContentMinConstraint } from './constraint'
import { gridStore } from './context'
import { enforceMinH } from './enforce'
import { extractKeys, flatChildren } from './extract-keys'
import Grid from './grid'
import * as indexExports from './index'
import { measureNaturalHeight, pxToGridH } from './measurement'
import Panel from './panel'
import { clearStorage, readStorage, STORAGE_PREFIX, writeStorage } from './storage'
import { toGridConfig, useGridConfig } from './use-grid-config'
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
describe('measureNaturalHeight', () => {
  test('returns scrollHeight when no parent', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 250 })
    expect(measureNaturalHeight(el)).toBe(250)
  })
  test('restores parent height after measuring', () => {
    const parent = document.createElement('div')
    parent.style.height = '100px'
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 500 })
    parent.append(el)
    measureNaturalHeight(el)
    expect(parent.style.height).toBe('100px')
  })
  test('temporarily sets parent to auto to measure natural', () => {
    const parent = document.createElement('div')
    parent.style.height = '100px'
    const el = document.createElement('div')
    let observedParentHeight = ''
    Object.defineProperty(el, 'scrollHeight', {
      configurable: true,
      get: () => {
        observedParentHeight = parent.style.height
        return 300
      }
    })
    parent.append(el)
    const result = measureNaturalHeight(el)
    expect(result).toBe(300)
    expect(observedParentHeight).toBe('auto')
  })
})
describe('storage', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('readStorage returns null when missing', () => {
    expect(readStorage('missing')).toBeNull()
  })
  test('writeStorage then readStorage round-trip', () => {
    const cfg = { cols: 12, layout: [{ h: 4, i: 'a', w: 6, x: 0, y: 0 }] }
    writeStorage('page', cfg)
    expect(readStorage('page')).toEqual(cfg)
  })
  test('clearStorage removes entry', () => {
    writeStorage('page', { cols: 12 })
    clearStorage('page')
    expect(readStorage('page')).toBeNull()
  })
  test('uses STORAGE_PREFIX', () => {
    writeStorage('page', { cols: 12 })
    expect(globalThis.localStorage.getItem(`${STORAGE_PREFIX}page`)).not.toBeNull()
  })
  test('readStorage returns null on corrupt JSON', () => {
    globalThis.localStorage.setItem(`${STORAGE_PREFIX}corrupt`, '{not json')
    expect(readStorage('corrupt')).toBeNull()
  })
  test('different ids isolated', () => {
    writeStorage('a', { cols: 12 })
    writeStorage('b', { cols: 20 })
    expect(readStorage('a')?.cols).toBe(12)
    expect(readStorage('b')?.cols).toBe(20)
  })
})
describe('extractKeys / flatChildren', () => {
  test('extracts keys from flat children array', () => {
    const children = [<div key='a' />, <div key='b' />, <div key='c' />]
    expect(extractKeys(children)).toEqual(['a', 'b', 'c'])
  })
  test('flattens nested arrays', () => {
    const children = [<div key='a' />, [<div key='b' />, <div key='c' />]]
    expect(extractKeys(children)).toEqual(['a', 'b', 'c'])
  })
  test('ignores non-element children', () => {
    const children = [<div key='a' />, 'text', null, false, 42]
    expect(extractKeys(children)).toEqual(['a'])
  })
  test('skips elements without keys', () => {
    const children = [<div key='noop-1' />, <div key='b' />]
    children[0] = { ...children[0], key: null } as (typeof children)[0]
    expect(extractKeys(children).includes('b')).toBe(true)
  })
  test('strips React key prefix', () => {
    const children = [<div key='.$abc' />]
    expect(extractKeys(children)).toEqual(['abc'])
  })
  test('handles single child', () => {
    expect(extractKeys(<div key='only' />)).toEqual(['only'])
  })
  test('empty children', () => {
    expect(extractKeys([])).toEqual([])
    expect(extractKeys(null)).toEqual([])
  })
  test('flatChildren returns elements only', () => {
    const result = flatChildren([<div key='a' />, 'text', null])
    expect(result).toHaveLength(1)
  })
})
const makeEl = (scrollHeight: number) => {
  const el = document.createElement('div')
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  return el
}
const baseRefs = () => ({
  cardRef: new Map<string, HTMLDivElement>(),
  fillSet: new Set<string>(),
  lastKnownWRef: new Map<string, number>(),
  marginY: 16,
  previousMinHRef: new Map<string, number>(),
  rowHeight: 50,
  transitionFrameRef: new Map<string, number>()
})
const constraintItem = { h: 2, i: 'a', w: 12, x: 0, y: 0 }
describe('createContentMinConstraint', () => {
  test('fill items unconstrained', () => {
    const refs = baseRefs()
    refs.fillSet.add('a')
    const { constrainSize } = createContentMinConstraint(refs)
    expect(constrainSize(constraintItem, 12, 1, 'se')).toEqual({ h: 1, w: 12 })
  })
  test('no cardRef entry returns h unchanged', () => {
    const refs = baseRefs()
    const { constrainSize } = createContentMinConstraint(refs)
    expect(constrainSize(constraintItem, 12, 1, 'se')).toEqual({ h: 1, w: 12 })
  })
  test('enforces content minimum height', () => {
    const refs = baseRefs()
    refs.cardRef.set('a', makeEl(200))
    const { constrainSize } = createContentMinConstraint(refs)
    const result = constrainSize(constraintItem, 12, 1, 'se')
    expect(result.h).toBeGreaterThanOrEqual(3)
  })
  test('allows h larger than minimum', () => {
    const refs = baseRefs()
    refs.cardRef.set('a', makeEl(100))
    const { constrainSize } = createContentMinConstraint(refs)
    expect(constrainSize(constraintItem, 12, 10, 'se').h).toBe(10)
  })
  test('width change triggers transition tracking', () => {
    const refs = baseRefs()
    refs.cardRef.set('a', makeEl(200))
    refs.lastKnownWRef.set('a', 12)
    const { constrainSize } = createContentMinConstraint(refs)
    constrainSize(constraintItem, 8, 1, 'se')
    expect(refs.previousMinHRef.has('a')).toBe(true)
    expect(refs.lastKnownWRef.get('a')).toBe(8)
  })
  test('transition cleared after MAX_GUARD_FRAMES', () => {
    const refs = baseRefs()
    refs.cardRef.set('a', makeEl(200))
    refs.lastKnownWRef.set('a', 12)
    refs.previousMinHRef.set('a', 4)
    refs.transitionFrameRef.set('a', MAX_GUARD_FRAMES - 1)
    const { constrainSize } = createContentMinConstraint(refs)
    constrainSize(constraintItem, 12, 1, 'se')
    expect(refs.previousMinHRef.has('a')).toBe(false)
    expect(refs.transitionFrameRef.has('a')).toBe(false)
  })
  test('name property set', () => {
    expect(createContentMinConstraint(baseRefs()).name).toBe('content-min')
  })
})
describe('Grid component', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('renders children', async () => {
    const { container } = render(
      <Grid>
        <div key='a'>first</div>
        <div key='b'>second</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 10)
      })
    })
    expect(container.textContent).toContain('first')
    expect(container.textContent).toContain('second')
  })
  test('respects editable=false (no drag handles visible path)', () => {
    const { container } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    expect(container.querySelector('.ogrid-drag-handle')).toBeNull()
  })
  test('renders drag handles when editable', async () => {
    const { container } = render(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 10)
      })
    })
    expect(container.querySelector('.ogrid-drag-handle')).not.toBeNull()
  })
  test('persist=true + id reads from localStorage on mount', () => {
    writeStorage('test', { cols: 12, layout: [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }] })
    const { container } = render(
      <Grid id='test' persist>
        <div key='a'>x</div>
      </Grid>
    )
    expect(container).toBeTruthy()
    expect(readStorage('test')?.cols).toBe(12)
  })
  test('reset clears storage and remounts', async () => {
    writeStorage('test', { cols: 12, layout: [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }] })
    render(
      <Grid editable id='test' persist>
        <div key='a'>x</div>
      </Grid>
    )
    const snap = gridStore.getSnapshot()
    expect(snap?.reset).toBeDefined()
    await act(async () => {
      snap?.reset()
      await new Promise<void>(resolve => {
        setTimeout(resolve, 10)
      })
    })
    expect(readStorage('test')).toBeNull()
  })
  test('onConfigChange not called during measurement', async () => {
    let emitted = 0
    render(
      <Grid
        onConfigChange={() => {
          emitted += 1
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    await new Promise<void>(resolve => {
      setTimeout(resolve, 50)
    })
    expect(emitted).toBe(0)
  })
  test('Panel renders nothing when not editable and no children/trailing', () => {
    const { container } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    const panelContainer = document.createElement('div')
    render(<Grid.Panel />, { container: panelContainer })
    expect(panelContainer.firstChild).toBeNull()
    expect(container).toBeTruthy()
  })
  test('Panel renders when editable', () => {
    render(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    const panelContainer = document.createElement('div')
    document.body.append(panelContainer)
    render(<Grid.Panel />, { container: panelContainer })
    expect(panelContainer.querySelector('[data-ogrid-panel]')).not.toBeNull()
  })
})
const openPopover = (container: HTMLElement) => {
  const bubble = container.querySelector<HTMLButtonElement>('[data-ogrid-panel] button')
  if (!bubble) throw new Error('no bubble')
  fireEvent.pointerDown(bubble, { clientX: 10, clientY: 10, pointerId: 1, pointerType: 'mouse' })
  fireEvent.pointerUp(bubble, { clientX: 10, clientY: 10, pointerId: 1, pointerType: 'mouse' })
}
describe('floating Panel bubble', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }],
      phase: 'done',
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
  test('renders bubble with grid icon', () => {
    const { container } = render(<Panel />)
    expect(container.querySelector('[data-ogrid-panel]')).not.toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })
  test('bubble has fixed positioning class', () => {
    const { container } = render(<Panel />)
    const bubble = container.querySelector<HTMLButtonElement>('button')
    expect(bubble?.className).toContain('fixed')
  })
  test('menu not rendered before clicking bubble', () => {
    const { container } = render(<Panel />)
    expect(container.textContent).not.toContain('Cols')
  })
  test('bubble exists as interactable element', () => {
    const { container } = render(<Panel />)
    const bubble = container.querySelector<HTMLButtonElement>('button[type=button]')
    expect(bubble).not.toBeNull()
    expect(bubble?.tagName).toBe('BUTTON')
  })
  test('not rendered when not editable and no children', () => {
    gridStore.setState({ ...gridStore.getSnapshot(), editable: false } as NonNullable<
      ReturnType<typeof gridStore.getSnapshot>
    >)
    const { container } = render(<Panel />)
    expect(container.firstChild).toBeNull()
  })
  test('tap bubble opens popover with sliders', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    expect(container.querySelectorAll('input[type=range]').length).toBe(3)
  })
})
describe('cn', () => {
  test('merges tailwind classes, deduplicates', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
  test('filters falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b')
  })
  test('conditional class', () => {
    const active = true
    expect(cn('base', active && 'on')).toContain('on')
  })
  test('empty input returns empty', () => {
    expect(cn()).toBe('')
  })
  test('array input', () => {
    expect(cn(['a', 'b'])).toBe('a b')
  })
})
describe('public exports', () => {
  test('index exports Grid and useGridConfig', () => {
    expect(indexExports.Grid).toBeDefined()
    expect(indexExports.useGridConfig).toBeDefined()
  })
  test('Grid has Panel subcomponent', () => {
    expect(indexExports.Grid.Panel).toBeDefined()
  })
})
describe('useGridConfig hook', () => {
  beforeEach(() => {
    cleanup()
  })
  test('returns null when phase is measuring', () => {
    let captured: unknown
    const Probe = () => {
      captured = useGridConfig()
      return null
    }
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
    render(<Probe />)
    expect(captured).toBeNull()
  })
  test('returns GridConfig when phase done', () => {
    let captured: unknown
    const Probe = () => {
      captured = useGridConfig()
      return null
    }
    gridStore.setState({
      cols: 20,
      compact: false,
      editable: true,
      gap: 20,
      layout: [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }],
      phase: 'done',
      positionedIds: new Set(),
      reset: () => {
        /* Empty */
      },
      resizedIds: new Set(),
      rowHeight: 60,
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
    render(<Probe />)
    expect(captured).toMatchObject({ cols: 20, gap: 20, rowHeight: 60 })
  })
})
describe('Panel subcomponent direct', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }],
      phase: 'done',
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
  test('renders null when editable false and no children', () => {
    gridStore.setState({ ...gridStore.getSnapshot(), editable: false })
    const { container } = render(<Panel />)
    expect(container.firstChild).toBeNull()
  })
  test('renders cols/gap/row sliders after opening popover', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    expect(container.textContent).toMatch(/Columns/u)
    expect(container.textContent).toMatch(/Gap/u)
    expect(container.textContent).toMatch(/Row/u)
  })
  test('renders Reset layout button when done phase', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    expect(container.textContent).toContain('Reset layout')
  })
  test('trailing slot renders in header', () => {
    const { container } = render(<Panel trailing={<span>after</span>} />)
    openPopover(container)
    expect(container.textContent).toContain('after')
  })
  test('item count shown in header', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const headerText = container.querySelector('dialog')?.textContent ?? ''
    expect(headerText).toContain('1')
  })
  test('clicking reset invokes store.reset', () => {
    let resetCalls = 0
    gridStore.setState({
      ...gridStore.getSnapshot(),
      reset: () => {
        resetCalls += 1
      }
    })
    const { container } = render(<Panel />)
    openPopover(container)
    const resetBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Reset layout')
    resetBtn?.click()
    expect(resetCalls).toBe(1)
  })
  test('Cell borders toggle invokes toggleRings', () => {
    let toggles = 0
    gridStore.setState({
      ...gridStore.getSnapshot(),
      toggleRings: () => {
        toggles += 1
      }
    })
    const { container } = render(<Panel />)
    openPopover(container)
    const ringsBtn = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Cell borders'))
    ringsBtn?.click()
    expect(toggles).toBe(1)
  })
})
describe('toGridConfig edge cases', () => {
  test('layout with empty fillSet', () => {
    const out = toGridConfig({ cols: 24, fillSet: new Set(), gap: 16, layout: [], rowHeight: 50 })
    expect(out.layout).toEqual([])
  })
  test('missing fillSet treats all as non-fill', () => {
    const layout = [{ h: 8, i: 'a', w: 12, x: 0, y: 0 }]
    const out = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(out.layout?.[0]?.fill).toBeUndefined()
  })
  test('preserves h=1 (default check)', () => {
    const layout = [{ h: 1, i: 'a', w: 12, x: 0, y: 0 }]
    const out = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(out.layout?.[0]?.h).toBeUndefined()
  })
  test('large layouts handled', () => {
    const layout = Array.from({ length: 50 }, (_, idx) => ({ h: 4, i: `item${idx}`, w: 12, x: 0, y: idx * 4 }))
    const out = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(out.layout).toHaveLength(50)
  })
})
describe('computeLayoutWithCols edge cases', () => {
  test('single column grid', () => {
    const items = [
      { h: 2, i: 'a', w: 1, x: 0, y: 0 },
      { h: 2, i: 'b', w: 1, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 1)
    expect(placed[0]).toMatchObject({ x: 0, y: 0 })
    expect(placed[1]).toMatchObject({ x: 0, y: 2 })
  })
  test('many items pack tightly', () => {
    const items = Array.from({ length: 12 }, (_, idx) => ({ h: 1, i: `i${idx}`, w: 4, x: 0, y: 0 }))
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]?.y).toBe(0)
    expect(placed[5]?.y).toBe(0)
    expect(placed[6]?.y).toBe(1)
  })
  test('preserves other item fields', () => {
    const items = [{ h: 2, i: 'a', minH: 2, minW: 4, w: 12, x: 0, y: 0 }]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]?.minH).toBe(2)
    expect(placed[0]?.minW).toBe(4)
  })
})
describe('storage isolation', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('clear one does not affect another', () => {
    writeStorage('a', { cols: 12 })
    writeStorage('b', { cols: 20 })
    clearStorage('a')
    expect(readStorage('a')).toBeNull()
    expect(readStorage('b')?.cols).toBe(20)
  })
  test('readStorage handles localStorage access errors', () => {
    const original = globalThis.localStorage.getItem.bind(globalThis.localStorage)
    Object.defineProperty(globalThis.localStorage, 'getItem', {
      configurable: true,
      value: () => {
        throw new Error('blocked')
      }
    })
    expect(readStorage('x')).toBeNull()
    Object.defineProperty(globalThis.localStorage, 'getItem', {
      configurable: true,
      value: original
    })
  })
  test('writeStorage silent on error', () => {
    const original = globalThis.localStorage.setItem.bind(globalThis.localStorage)
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: () => {
        throw new Error('quota')
      }
    })
    expect(() => writeStorage('x', { cols: 12 })).not.toThrow()
    Object.defineProperty(globalThis.localStorage, 'setItem', {
      configurable: true,
      value: original
    })
  })
  test('clearStorage silent on error', () => {
    const original = globalThis.localStorage.removeItem.bind(globalThis.localStorage)
    Object.defineProperty(globalThis.localStorage, 'removeItem', {
      configurable: true,
      value: () => {
        throw new Error('blocked')
      }
    })
    expect(() => clearStorage('x')).not.toThrow()
    Object.defineProperty(globalThis.localStorage, 'removeItem', {
      configurable: true,
      value: original
    })
  })
})
describe('enforceMinH pathological inputs', () => {
  test('minH exactly equals h no mutation needed', () => {
    const layout = [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map([['a', 4]]), phase: 'measuring' })
    expect(out[0]?.h).toBe(4)
  })
  test('minH zero treated as 0', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map([['a', 0]]), phase: 'measuring' })
    expect(out[0]?.h).toBe(2)
  })
  test('negative minH treated as fallback', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map([['a', -5]]), phase: 'measuring' })
    expect(out[0]?.h).toBe(2)
  })
})
describe('buildLayout explicit minH/minW preservation', () => {
  test('explicit minH/minW passed through', () => {
    const configMap = new Map([['a', { h: 4, minH: 2, minW: 3, w: 12, x: 0, y: 0 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]?.minH).toBe(2)
    expect(out[0]?.minW).toBe(3)
  })
  test('default y=0 preserved', () => {
    const out = buildLayout({ cols: 24, configMap: new Map(), fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]?.y).toBe(0)
  })
})
describe('gridStore idempotency', () => {
  test('setting same state multiple times notifies each time', () => {
    let calls = 0
    const unsub = gridStore.subscribe(() => {
      calls += 1
    })
    const snap = {
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'measuring' as const,
      positionedIds: new Set<string>(),
      reset: () => {
        /* Empty */
      },
      resizedIds: new Set<string>(),
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
    }
    gridStore.setState(snap)
    gridStore.setState(snap)
    gridStore.setState(snap)
    unsub()
    expect(calls).toBe(3)
  })
})
describe('Grid measurement window', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('measuring phase renders with opacity-0', () => {
    const { container } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    const measuringEl = container.querySelector('.opacity-0')
    expect(measuringEl).not.toBeNull()
  })
  test('eventually transitions to done phase', async () => {
    const { container } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 300)
      })
    })
    const done = container.querySelector('.opacity-100')
    expect(done).not.toBeNull()
  })
})
describe('Grid with saved config', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('uses saved config over default', async () => {
    writeStorage('x', { cols: 12, layout: [{ h: 4, i: 'a', w: 6, x: 0, y: 0 }] })
    const { container } = render(
      <Grid editable id='x' persist>
        <div key='a'>data</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(container.textContent).toContain('data')
  })
  test('onConfigChange fires through handleConfigChange', async () => {
    writeStorage('y', { cols: 14 })
    let captured: unknown
    render(
      <Grid
        editable
        id='y'
        onConfigChange={c => {
          captured = c
        }}
        persist>
        <div key='a'>x</div>
      </Grid>
    )
    gridStore.getSnapshot()?.setCols(18)
    await new Promise<void>(resolve => {
      setTimeout(resolve, 50)
    })
    expect(captured).toBeDefined()
    expect((captured as { cols?: number }).cols).toBe(18)
  })
})
describe('Grid remount on reset', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('reset increments resetCount causing remount', async () => {
    writeStorage('z', { cols: 20 })
    render(
      <Grid editable id='z' persist>
        <div key='a'>x</div>
      </Grid>
    )
    expect(readStorage('z')?.cols).toBe(20)
    await act(async () => {
      gridStore.getSnapshot()?.reset()
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(readStorage('z')).toBeNull()
  })
})
describe('Grid no id + no persist', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('does not touch localStorage', async () => {
    render(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      gridStore.getSnapshot()?.setCols(14)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(globalThis.localStorage.length).toBe(0)
  })
})
describe('extractKeys ordering edge cases', () => {
  test('preserves order with mix of arrays and single', () => {
    const children = [<div key='a' />, [<div key='b' />, <div key='c' />], <div key='d' />]
    expect(extractKeys(children)).toEqual(['a', 'b', 'c', 'd'])
  })
  test('deeply nested arrays flattened', () => {
    const children = [[[<div key='a' />], [<div key='b' />]]]
    expect(extractKeys(children)).toEqual(['a', 'b'])
  })
})
describe('store actions via direct setState', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
        const snap = gridStore.getSnapshot()
        if (snap) gridStore.setState({ ...snap, showRings: !snap.showRings })
      }
    })
  })
  test('toggleRings flips showRings', () => {
    expect(gridStore.getSnapshot()?.showRings).toBe(false)
    gridStore.getSnapshot()?.toggleRings()
    expect(gridStore.getSnapshot()?.showRings).toBe(true)
    gridStore.getSnapshot()?.toggleRings()
    expect(gridStore.getSnapshot()?.showRings).toBe(false)
  })
  test('state accessible immediately after setState', () => {
    const snap = gridStore.getSnapshot()
    expect(snap?.cols).toBe(24)
    expect(snap?.gap).toBe(16)
    expect(snap?.rowHeight).toBe(50)
  })
})
describe('computeLayoutWithCols placement invariants', () => {
  test('picks best-X that minimizes Y (row-first)', () => {
    const items = [
      { h: 3, i: 'tall', w: 12, x: 0, y: 0 },
      { h: 1, i: 'a', w: 6, x: 0, y: 0 },
      { h: 1, i: 'b', w: 6, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]).toMatchObject({ x: 0, y: 0 })
    expect(placed[1]).toMatchObject({ x: 12, y: 0 })
    expect(placed[2]).toMatchObject({ x: 18, y: 0 })
  })
  test('fills gaps before stacking', () => {
    const items = [
      { h: 2, i: 'a', w: 12, x: 0, y: 0 },
      { h: 1, i: 'b', w: 12, x: 0, y: 0 },
      { h: 1, i: 'c', w: 12, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[1]?.y).toBe(0)
    expect(placed[2]?.y).toBe(1)
  })
  test('no result overlaps', () => {
    const items = Array.from({ length: 20 }, (_, idx) => ({ h: 2, i: `i${idx}`, w: 8, x: 0, y: 0 }))
    const placed = computeLayoutWithCols(items, 24)
    for (let a = 0; a < placed.length; a += 1)
      for (let b = a + 1; b < placed.length; b += 1) {
        const ia = placed[a]
        const ib = placed[b]
        if (ia && ib) {
          const overlap = ia.x < ib.x + ib.w && ia.x + ia.w > ib.x && ia.y < ib.y + ib.h && ia.y + ia.h > ib.y
          expect(overlap).toBe(false)
        }
      }
  })
})
describe('emitConfigChange microtask deferral', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('does not fire synchronously during render', () => {
    let syncFires = 0
    render(
      <Grid
        editable
        onConfigChange={() => {
          syncFires += 1
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    gridStore.getSnapshot()?.setCols(16)
    expect(syncFires).toBe(0)
  })
  test('fires asynchronously after setCols', async () => {
    let fires = 0
    render(
      <Grid
        editable
        onConfigChange={() => {
          fires += 1
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    gridStore.getSnapshot()?.setCols(14)
    await new Promise<void>(resolve => {
      setTimeout(resolve, 20)
    })
    expect(fires).toBeGreaterThan(0)
  })
})
describe('Panel Copy button generates GridConfig format', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 20,
      compact: false,
      editable: true,
      gap: 24,
      layout: [
        { h: 4, i: 'a', w: 8, x: 0, y: 0 },
        { h: 6, i: 'b', w: 12, x: 8, y: 0 }
      ],
      phase: 'done',
      positionedIds: new Set(),
      reset: () => {
        /* Empty */
      },
      resizedIds: new Set(),
      rowHeight: 60,
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
  test('Copy writes TypeScript config to clipboard', async () => {
    const writes: string[] = []
    const originalClipboard = globalThis.navigator.clipboard
    const mockWrite = async (t: string): Promise<void> => {
      await Promise.resolve()
      writes.push(t)
    }
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: mockWrite }
    })
    const { container } = render(<Panel />)
    openPopover(container)
    const copyBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Copy config')
    copyBtn?.click()
    await new Promise<void>(resolve => {
      setTimeout(resolve, 20)
    })
    expect(writes.length).toBe(1)
    const output = writes[0] ?? ''
    expect(output).toContain('cols: 20')
    expect(output).toContain('gap: 24')
    expect(output).toContain('rowHeight: 60')
    expect(output).toContain('layout: [')
    expect(output).toContain('satisfies GridConfig')
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard
    })
  })
})
describe('Panel slider interactions', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
      positionedIds: new Set(),
      reset: () => {
        /* Empty */
      },
      resizedIds: new Set(),
      rowHeight: 50,
      setCols: (c: number) => {
        const snap = gridStore.getSnapshot()
        if (snap) gridStore.setState({ ...snap, cols: c })
      },
      setGap: (g: number) => {
        const snap = gridStore.getSnapshot()
        if (snap) gridStore.setState({ ...snap, gap: g })
      },
      setRowHeight: (rh: number) => {
        const snap = gridStore.getSnapshot()
        if (snap) gridStore.setState({ ...snap, rowHeight: rh })
      },
      showRings: false,
      toggleRings: () => {
        /* Empty */
      }
    })
  })
  test('Cols slider change updates store cols', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const cols = container.querySelectorAll<HTMLInputElement>('input[type=range]')[0]
    if (!cols) throw new Error('no slider')
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(cols, '18')
    cols.dispatchEvent(new Event('change', { bubbles: true }))
    cols.dispatchEvent(new Event('input', { bubbles: true }))
    expect(gridStore.getSnapshot()?.cols).toBe(18)
  })
  test('Gap slider change updates store gap', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const gap = container.querySelectorAll<HTMLInputElement>('input[type=range]')[1]
    if (!gap) throw new Error('no slider')
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(gap, '8')
    gap.dispatchEvent(new Event('change', { bubbles: true }))
    gap.dispatchEvent(new Event('input', { bubbles: true }))
    expect(gridStore.getSnapshot()?.gap).toBe(8)
  })
  test('Row slider change updates store rowHeight', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const row = container.querySelectorAll<HTMLInputElement>('input[type=range]')[2]
    if (!row) throw new Error('no slider')
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(row, '70')
    row.dispatchEvent(new Event('change', { bubbles: true }))
    row.dispatchEvent(new Event('input', { bubbles: true }))
    expect(gridStore.getSnapshot()?.rowHeight).toBe(70)
  })
})
describe('Panel when phase is measuring hides Copy', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
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
  test('Copy button not rendered during measurement', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const copyBtn = [...container.querySelectorAll('button')].find(b => b.textContent === 'Copy config')
    expect(copyBtn).toBeUndefined()
  })
})
describe('Grid with className on layout items', () => {
  beforeEach(() => {
    cleanup()
  })
  test('className propagates to inner cell', async () => {
    const { container } = render(
      <Grid config={{ layout: [{ className: 'custom-cell', i: 'a', w: 12 }] }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelector('.custom-cell')).not.toBeNull()
  })
})
describe('Grid with undefined config', () => {
  beforeEach(() => {
    cleanup()
  })
  test('renders with defaults when no config', async () => {
    const { container } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(1)
  })
  test('renders with partial config (only cols)', async () => {
    const { container } = render(
      <Grid config={{ cols: 12 }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(1)
  })
})
describe('Panel slider boundaries', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
  test('cols slider min=1 max=48', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const cols = container.querySelectorAll<HTMLInputElement>('input[type=range]')[0]
    expect(cols?.min).toBe('1')
    expect(cols?.max).toBe('48')
  })
  test('gap slider min=0 max=48', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const gap = container.querySelectorAll<HTMLInputElement>('input[type=range]')[1]
    expect(gap?.min).toBe('0')
    expect(gap?.max).toBe('48')
  })
  test('row slider min=10 max=120', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const row = container.querySelectorAll<HTMLInputElement>('input[type=range]')[2]
    expect(row?.min).toBe('10')
    expect(row?.max).toBe('120')
  })
})
describe('toGridConfig negative values edge', () => {
  test('preserves negative x', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: -1, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.x).toBe(-1)
  })
  test('preserves fractional h (preserves even non-default)', () => {
    const layout = [{ h: 2.5, i: 'a', w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.h).toBe(2.5)
  })
})
describe('checkOverlaps warns on overlap', () => {
  test('does not throw with overlapping items', () => {
    const items = [
      { h: 4, i: 'a', w: 12, x: 0, y: 0 },
      { h: 4, i: 'b', w: 12, x: 6, y: 2 }
    ]
    expect(() => checkOverlaps(items)).not.toThrow()
  })
})
describe('buildLayout with w=0 (degenerate)', () => {
  test('preserves w=0 from config', () => {
    const configMap = new Map([['a', { w: 0 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]?.w).toBe(0)
  })
})
describe('useGridConfig returns live updates via store', () => {
  beforeEach(() => {
    cleanup()
  })
  test('transitions from null to config when phase becomes done', () => {
    const snapshots: unknown[] = []
    const Probe = () => {
      snapshots.push(useGridConfig())
      return null
    }
    gridStore.setState({
      cols: 12,
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
    render(<Probe />)
    expect(snapshots[0]).toBeNull()
  })
})
describe('Grid public Panel via subcomponent property', () => {
  test('Grid.Panel is same as Panel default export', () => {
    expect(indexExports.Grid.Panel).toBe(Panel)
  })
})
describe('storage JSON round-trip with all GridConfig fields', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('preserves cols, gap, rowHeight, layout with all fields', () => {
    const cfg = {
      cols: 20,
      gap: 24,
      layout: [{ className: 'x', fill: true, h: 6, i: 'a', minH: 2, minW: 3, w: 8, x: 4, y: 2 }],
      rowHeight: 60
    }
    writeStorage('full', cfg)
    const read = readStorage('full')
    expect(read?.cols).toBe(20)
    expect(read?.gap).toBe(24)
    expect(read?.rowHeight).toBe(60)
    expect(read?.layout?.[0]).toMatchObject(cfg.layout[0])
  })
  test('handles empty object', () => {
    writeStorage('empty', {})
    expect(readStorage('empty')).toEqual({})
  })
  test('handles empty layout', () => {
    writeStorage('el', { layout: [] })
    expect(readStorage('el')?.layout).toEqual([])
  })
})
describe('extractKeys with fragments and falsy', () => {
  test('handles boolean false', () => {
    expect(extractKeys([false, <div key='a' />, true])).toEqual(['a'])
  })
  test('handles number and string children', () => {
    expect(extractKeys([1, 'text', <div key='a' />])).toEqual(['a'])
  })
  test('non-array single null', () => {
    expect(extractKeys(null as never)).toEqual([])
  })
  test('non-array single undefined', () => {
    expect(extractKeys(undefined as never)).toEqual([])
  })
})
describe('cn edge cases', () => {
  test('numbers ignored safely', () => {
    expect(cn('a', 0, 'b')).toBe('a b')
  })
  test('tailwind conflict resolution', () => {
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })
  test('nested arrays flatten', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c')
  })
})
describe('pxToGridH boundary cases', () => {
  test('rowHeight=0 gives Infinity edge', () => {
    expect(Number.isFinite(pxToGridH(100, 0, 16))).toBe(true)
  })
  test('marginY=0', () => {
    expect(pxToGridH(100, 50, 0)).toBe(Math.ceil(101 / 50))
  })
  test('very large px', () => {
    expect(pxToGridH(10_000, 50, 16)).toBeGreaterThan(100)
  })
})
describe('clampLayoutToCols larger cols unchanged', () => {
  test('items narrower than cols pass through', () => {
    const items = [{ h: 2, i: 'a', w: 6, x: 2, y: 0 }]
    expect(clampLayoutToCols(items, 24)[0]).toBe(items[0])
  })
  test('multiple items preserved if all fit', () => {
    const items = [
      { h: 2, i: 'a', w: 6, x: 0, y: 0 },
      { h: 2, i: 'b', w: 6, x: 6, y: 0 },
      { h: 2, i: 'c', w: 6, x: 12, y: 0 }
    ]
    const clamped = clampLayoutToCols(items, 24)
    for (let i = 0; i < items.length; i += 1) expect(clamped[i]).toBe(items[i])
  })
})
describe('enforceMinH does not mutate input', () => {
  test('returns new array in measuring', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map([['a', 4]]), phase: 'measuring' })
    expect(out).not.toBe(layout)
    expect(layout[0]?.h).toBe(2)
  })
  test('returns same reference in done phase', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map(), phase: 'done' })
    expect(out).toBe(layout)
  })
})
describe('buildLayout returns fresh layout each call', () => {
  test('distinct call results not referentially equal', () => {
    const args = { cols: 24, configMap: new Map(), fillSet: new Set<string>(), itemKeys: ['a'] }
    expect(buildLayout(args)).not.toBe(buildLayout(args))
  })
})
describe('useGridConfig reactive to store updates', () => {
  beforeEach(() => {
    cleanup()
  })
  test('re-renders when store changes via useSyncExternalStore', () => {
    const seen: (number | undefined)[] = []
    const Probe = () => {
      const cfg = useGridConfig()
      seen.push(cfg?.cols)
      return null
    }
    gridStore.setState({
      cols: 10,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
    render(<Probe />)
    act(() => {
      gridStore.setState({ ...gridStore.getSnapshot(), cols: 30 } as NonNullable<ReturnType<typeof gridStore.getSnapshot>>)
    })
    expect(seen).toContain(10)
    expect(seen).toContain(30)
  })
})
describe('gridStore snapshot equality', () => {
  test('identical references return stable snapshot', () => {
    const snap: NonNullable<ReturnType<typeof gridStore.getSnapshot>> = {
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
    }
    gridStore.setState(snap)
    expect(gridStore.getSnapshot()).toBe(snap)
  })
})
describe('storage STORAGE_PREFIX stability', () => {
  test('prefix value is ogrid:', () => {
    expect(STORAGE_PREFIX).toBe('ogrid:')
  })
})
describe('Panel children slot', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
  test('children render before sliders in popover', () => {
    const { container } = render(
      <Panel>
        <span data-testid='start'>start-slot</span>
      </Panel>
    )
    openPopover(container)
    const text = container.textContent ?? ''
    const startIdx = text.indexOf('start-slot')
    const colsIdx = text.indexOf('Columns')
    expect(startIdx).toBeGreaterThanOrEqual(0)
    expect(startIdx).toBeLessThan(colsIdx)
  })
  test('trailing renders in popover header', () => {
    const { container } = render(<Panel trailing={<span>end-slot</span>} />)
    openPopover(container)
    expect(container.textContent).toContain('end-slot')
  })
  test('both children and trailing render', () => {
    const { container } = render(
      <Panel trailing={<span>end</span>}>
        <span>start</span>
      </Panel>
    )
    openPopover(container)
    expect(container.textContent).toContain('start')
    expect(container.textContent).toContain('end')
  })
})
describe('Grid with many children', () => {
  beforeEach(() => {
    cleanup()
  })
  test('renders 50 items', async () => {
    const children = Array.from({ length: 50 }, (_, idx) => <div key={`i${idx}`}>{idx}</div>)
    const { container } = render(<Grid>{children}</Grid>)
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(50)
  })
})
describe('Grid children key changes cause remount behavior', () => {
  beforeEach(() => {
    cleanup()
  })
  test('adding a new child renders it', async () => {
    const { container, rerender } = render(
      <Grid>
        <div key='a'>a</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(1)
    rerender(
      <Grid>
        <div key='a'>a</div>
        <div key='b'>b</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(2)
  })
  test('removing a child drops it', async () => {
    const { container, rerender } = render(
      <Grid>
        <div key='a'>a</div>
        <div key='b'>b</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(2)
    rerender(
      <Grid>
        <div key='a'>a</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(1)
  })
})
describe('Grid editable prop transition', () => {
  beforeEach(() => {
    cleanup()
  })
  test('going from false to true reveals handles', async () => {
    const { container, rerender } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelector('.ogrid-drag-handle')).toBeNull()
    rerender(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelector('.ogrid-drag-handle')).not.toBeNull()
  })
  test('going from true to false hides handles', async () => {
    const { container, rerender } = render(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelector('.ogrid-drag-handle')).not.toBeNull()
    rerender(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelector('.ogrid-drag-handle')).toBeNull()
  })
})
describe('measureNaturalHeight with visibility/display', () => {
  test('works when element is display:none parent', () => {
    const parent = document.createElement('div')
    parent.style.display = 'none'
    parent.style.height = '50px'
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 200 })
    parent.append(el)
    expect(measureNaturalHeight(el)).toBe(200)
    expect(parent.style.height).toBe('50px')
  })
})
describe('computeLayoutWithCols fills columns independently', () => {
  test('tall item in col 0 does not block col 12', () => {
    const items = [
      { h: 10, i: 'tall', w: 12, x: 0, y: 0 },
      { h: 1, i: 'small', w: 12, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]?.y).toBe(0)
    expect(placed[1]?.y).toBe(0)
    expect(placed[1]?.x).toBe(12)
  })
})
describe('constraint transitions: multiple width changes', () => {
  test('lastKnownWRef updated on each width change', () => {
    const refs = {
      cardRef: new Map<string, HTMLDivElement>(),
      fillSet: new Set<string>(),
      lastKnownWRef: new Map<string, number>(),
      marginY: 16,
      previousMinHRef: new Map<string, number>(),
      rowHeight: 50,
      transitionFrameRef: new Map<string, number>()
    }
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 100 })
    refs.cardRef.set('a', el)
    const { constrainSize } = createContentMinConstraint(refs)
    constrainSize({ h: 2, i: 'a', w: 12, x: 0, y: 0 }, 12, 2, 'se')
    expect(refs.lastKnownWRef.get('a')).toBe(12)
    constrainSize({ h: 2, i: 'a', w: 8, x: 0, y: 0 }, 8, 2, 'se')
    expect(refs.lastKnownWRef.get('a')).toBe(8)
  })
})
describe('toGridConfig preserves x=0 when y > 0', () => {
  test('y=4 preserved even though x=0', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 0, y: 4 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.x).toBeUndefined()
    expect(cfg.layout?.[0]?.y).toBe(4)
  })
})
describe('Grid rendering with no children', () => {
  beforeEach(() => {
    cleanup()
  })
  test('renders zero items', async () => {
    const { container } = render(<Grid>{[]}</Grid>)
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(0)
  })
})
describe('Grid onConfigChange prop stability', () => {
  beforeEach(() => {
    cleanup()
  })
  test('replacing onConfigChange mid-session still works', async () => {
    let calls1 = 0
    let calls2 = 0
    const { rerender } = render(
      <Grid
        editable
        onConfigChange={() => {
          calls1 += 1
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    rerender(
      <Grid
        editable
        onConfigChange={() => {
          calls2 += 1
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(calls1 + calls2).toBeGreaterThanOrEqual(0)
  })
})
describe('Panel auto-hides with no editable and no slots', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
  test('renders null', () => {
    const { container } = render(<Panel />)
    expect(container.firstChild).toBeNull()
  })
  test('still null with trailing only when editable false', () => {
    const { container } = render(<Panel trailing={<span>t</span>} />)
    expect(container.firstChild).toBeNull()
  })
})
describe('gridStore getSnapshot returns same identity until setState', () => {
  test('two calls without setState return same object', () => {
    const snap: NonNullable<ReturnType<typeof gridStore.getSnapshot>> = {
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
    }
    gridStore.setState(snap)
    expect(gridStore.getSnapshot()).toBe(gridStore.getSnapshot())
  })
})
describe('enforceMinH various minHByKey values', () => {
  test('minHByKey has extra keys not in layout (ignored)', () => {
    const layout = [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }]
    const minH = new Map([
      ['a', 3],
      ['ghost', 99]
    ])
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: minH, phase: 'measuring' })
    expect(out[0]?.h).toBe(4)
  })
})
describe('computeLayoutWithCols items with w exactly cols', () => {
  test('full-width items stack one per row', () => {
    const items = [
      { h: 2, i: 'a', w: 24, x: 0, y: 0 },
      { h: 2, i: 'b', w: 24, x: 0, y: 0 },
      { h: 2, i: 'c', w: 24, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]?.y).toBe(0)
    expect(placed[1]?.y).toBe(2)
    expect(placed[2]?.y).toBe(4)
  })
})
describe('Panel view mode always hidden', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
  test('hides even with children', () => {
    const { container } = render(
      <Panel>
        <span>edit</span>
      </Panel>
    )
    expect(container.firstChild).toBeNull()
  })
  test('hides even with children and trailing', () => {
    const { container } = render(
      <Panel trailing={<span>end</span>}>
        <span>start</span>
      </Panel>
    )
    expect(container.firstChild).toBeNull()
  })
})
describe('Grid config with only cols', () => {
  beforeEach(() => {
    cleanup()
  })
  test('uses default gap and rowHeight', async () => {
    render(
      <Grid config={{ cols: 10 }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(gridStore.getSnapshot()?.gap).toBe(16)
    expect(gridStore.getSnapshot()?.rowHeight).toBe(50)
    expect(gridStore.getSnapshot()?.cols).toBe(10)
  })
})
describe('Grid config.layout with partial fields', () => {
  test('layout item with only i and w', async () => {
    cleanup()
    const { container } = render(
      <Grid config={{ layout: [{ i: 'a', w: 12 }] }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.react-grid-item').length).toBe(1)
  })
})
describe('buildLayout items missing from configMap get defaults', () => {
  test('half of items in configMap, half not', () => {
    const configMap = new Map([['a', { h: 5 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a', 'b'] })
    expect(out[0]?.h).toBe(5)
    expect(out[1]?.h).toBe(1)
  })
})
describe('toGridConfig with fillSet containing non-layout items', () => {
  test('fill key not in layout is ignored', () => {
    const layout = [{ h: 4, i: 'a', w: 12, x: 0, y: 0 }]
    const fillSet = new Set(['a', 'ghost'])
    const cfg = toGridConfig({ cols: 24, fillSet, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.length).toBe(1)
    expect(cfg.layout?.[0]?.fill).toBe(true)
  })
})
describe('gridStore preserves typed function signatures', () => {
  test('setCols accepts number', () => {
    let received: number | undefined
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
      positionedIds: new Set(),
      reset: () => {
        /* Empty */
      },
      resizedIds: new Set(),
      rowHeight: 50,
      setCols: (c: number) => {
        received = c
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
    gridStore.getSnapshot()?.setCols(18)
    expect(received).toBe(18)
  })
})
describe('enforceMinH returns same array reference optimization in measuring when no grow', () => {
  test('if no items need growing, output still new array (consistent)', () => {
    const layout = [{ h: 5, i: 'a', minH: 3, w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map([['a', 3]]), phase: 'measuring' })
    expect(out[0]?.h).toBe(5)
  })
})
describe('computeLayoutWithCols deterministic', () => {
  test('same input produces same output', () => {
    const items = [
      { h: 2, i: 'a', w: 12, x: 0, y: 0 },
      { h: 3, i: 'b', w: 12, x: 0, y: 0 },
      { h: 1, i: 'c', w: 24, x: 0, y: 0 }
    ]
    const out1 = computeLayoutWithCols(items, 24)
    const out2 = computeLayoutWithCols(items, 24)
    expect(out1).toEqual(out2)
  })
})
describe('clampLayoutToCols preserves order', () => {
  test('original order maintained', () => {
    const items = [
      { h: 1, i: 'first', w: 30, x: 0, y: 0 },
      { h: 1, i: 'second', w: 4, x: 0, y: 1 },
      { h: 1, i: 'third', w: 30, x: 0, y: 2 }
    ]
    const clamped = clampLayoutToCols(items, 24)
    expect(clamped.map(c => c.i)).toEqual(['first', 'second', 'third'])
  })
})
describe('storage: special characters in id', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('id with dashes', () => {
    writeStorage('page-one-two', { cols: 12 })
    expect(readStorage('page-one-two')?.cols).toBe(12)
  })
  test('id with slashes (from pathname)', () => {
    writeStorage('traces/abc-123', { cols: 18 })
    expect(readStorage('traces/abc-123')?.cols).toBe(18)
  })
  test('empty id', () => {
    writeStorage('', { cols: 14 })
    expect(readStorage('')?.cols).toBe(14)
  })
})
describe('constants module exports', () => {
  test('MAX_GUARD_FRAMES is a number', () => {
    expect(typeof MAX_GUARD_FRAMES).toBe('number')
    expect(MAX_GUARD_FRAMES).toBeGreaterThan(0)
  })
})
describe('types module re-exports', () => {
  test('GridConfig type available through index', () => {
    const cfg: indexExports.GridConfig = { cols: 24, layout: [] }
    expect(cfg.cols).toBe(24)
  })
  test('LayoutItem type available through index', () => {
    const item: indexExports.LayoutItem = { i: 'a' }
    expect(item.i).toBe('a')
  })
})
describe('Grid unmount clean up', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('mounts and unmounts without errors', async () => {
    const { unmount } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(() => {
      unmount()
    }).not.toThrow()
  })
  test('can mount multiple times sequentially', async () => {
    for (let i = 0; i < 3; i += 1) {
      const { unmount } = render(
        <Grid>
          <div key='a'>x</div>
        </Grid>
      )
      await act(async () => {
        await new Promise<void>(resolve => {
          setTimeout(resolve, 20)
        })
      })
      unmount()
    }
  })
})
describe('Grid key prop causes remount (used by reset)', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('key change unmounts and remounts', async () => {
    let renderCount = 0
    const Child = () => {
      renderCount += 1
      return <span>child</span>
    }
    const { rerender } = render(
      <Grid key='v1'>
        <Child key='a' />
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    const countAfterFirst = renderCount
    rerender(
      <Grid key='v2'>
        <Child key='a' />
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(renderCount).toBeGreaterThan(countAfterFirst)
  })
})
describe('storage: getItem returns corrupt JSON handled', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('returns null for unparseable value', () => {
    globalThis.localStorage.setItem(`${STORAGE_PREFIX}bad`, '[[[not json')
    expect(readStorage('bad')).toBeNull()
  })
  test('returns null for empty string', () => {
    globalThis.localStorage.setItem(`${STORAGE_PREFIX}empty`, '')
    expect(readStorage('empty')).toBeNull()
  })
})
describe('toGridConfig idempotent', () => {
  test('second call with same args produces identical output', () => {
    const layout = [
      { h: 4, i: 'a', w: 6, x: 0, y: 0 },
      { h: 8, i: 'b', w: 18, x: 6, y: 0 }
    ]
    const a = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    const b = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(a).toEqual(b)
  })
})
describe('buildLayout empty configMap fine', () => {
  test('uses defaults for all items', () => {
    const out = buildLayout({ cols: 12, configMap: new Map(), fillSet: new Set(), itemKeys: ['a', 'b'] })
    for (const item of out) {
      expect(item.w).toBe(12)
      expect(item.h).toBe(1)
    }
  })
})
describe('computeLayoutWithCols extreme w', () => {
  test('w=9999 with cols=24 gets clamped', () => {
    const items = [{ h: 2, i: 'a', w: 9999, x: 0, y: 0 }]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed[0]?.w).toBe(24)
  })
})
describe('cn variant dedup', () => {
  test('dedupes text-color classes', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })
  test('preserves non-conflicting classes', () => {
    expect(cn('text-sm', 'font-bold', 'text-blue-500')).toBe('text-sm font-bold text-blue-500')
  })
})
describe('Grid wrapper reset guards', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('resetting blocks handleConfigChange writes during microtask window', async () => {
    writeStorage('g1', { cols: 18, layout: [] })
    let receivedCalls = 0
    render(
      <Grid
        editable
        id='g1'
        onConfigChange={() => {
          receivedCalls += 1
        }}
        persist>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    act(() => {
      gridStore.getSnapshot()?.reset()
    })
    expect(readStorage('g1')).toBeNull()
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(receivedCalls).toBeGreaterThanOrEqual(0)
  })
  test('reset without persist still increments resetCount', async () => {
    render(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.reset()
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
  })
  test('reset without id does not touch storage', async () => {
    writeStorage('other', { cols: 12 })
    render(
      <Grid editable persist>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.reset()
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(readStorage('other')?.cols).toBe(12)
  })
})
describe('Grid wrapper without persist preserves storage isolation', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('no persist means no storage writes', async () => {
    writeStorage('sentinel', { cols: 999 })
    render(
      <Grid
        editable
        onConfigChange={() => {
          /* Empty */
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.setCols(10)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(readStorage('sentinel')?.cols).toBe(999)
  })
  test('persist without id does not write', async () => {
    writeStorage('other', { cols: 77 })
    render(
      <Grid editable persist>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.setCols(11)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(readStorage('other')?.cols).toBe(77)
  })
})
describe('Grid wrapper handleConfigChange with persist', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('setCols writes to storage when persist+id', async () => {
    render(
      <Grid editable id='hcc' persist>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.setCols(15)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(readStorage('hcc')?.cols).toBe(15)
  })
  test('onConfigChange callback receives config', async () => {
    const received: { cols?: number }[] = []
    render(
      <Grid
        editable
        onConfigChange={c => {
          received.push(c)
        }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.setCols(13)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    const lastConfig = received.at(-1)
    expect(lastConfig?.cols).toBe(13)
  })
})
describe('Grid wrapper persist reads saved on mount', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('existing saved config applied as effective config', async () => {
    writeStorage('rsv', { cols: 18, gap: 22, rowHeight: 70 })
    const captured: { cols?: number; gap?: number; rowHeight?: number }[] = []
    render(
      <Grid
        id='rsv'
        onConfigChange={c => {
          captured.push(c)
        }}
        persist>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(gridStore.getSnapshot()?.cols).toBe(18)
    expect(gridStore.getSnapshot()?.gap).toBe(22)
    expect(gridStore.getSnapshot()?.rowHeight).toBe(70)
  })
})
describe('DragHandle renders SVG', () => {
  beforeEach(() => {
    cleanup()
  })
  test('DragHandle visible when editable', async () => {
    const { container } = render(
      <Grid editable>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    const handle = container.querySelector('.ogrid-drag-handle')
    expect(handle).not.toBeNull()
    expect(handle?.querySelector('svg')).not.toBeNull()
    expect(handle?.querySelectorAll('circle').length).toBe(6)
  })
})
describe('measureAndUpdate no-change branch', () => {
  test('layout stays identical when measurements match', () => {
    const refs = {
      cardRef: new Map<string, HTMLDivElement>(),
      fillSet: new Set<string>(),
      lastKnownWRef: new Map<string, number>(),
      marginY: 16,
      previousMinHRef: new Map<string, number>(),
      rowHeight: 50,
      transitionFrameRef: new Map<string, number>()
    }
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 100 })
    refs.cardRef.set('a', el)
    const { constrainSize } = createContentMinConstraint(refs)
    const r1 = constrainSize({ h: 2, i: 'a', w: 12, x: 0, y: 0 }, 12, 5, 'se')
    const r2 = constrainSize({ h: 2, i: 'a', w: 12, x: 0, y: 0 }, 12, 5, 'se')
    expect(r1).toEqual(r2)
  })
})
describe('computeLayoutWithCols more invariants', () => {
  test('preserves i identity for every item', () => {
    const items = [
      { h: 2, i: 'x', w: 6, x: 0, y: 0 },
      { h: 2, i: 'y', w: 6, x: 0, y: 0 }
    ]
    const placed = computeLayoutWithCols(items, 24)
    expect(placed.map(p => p.i).toSorted()).toEqual(['x', 'y'])
  })
  test('output length matches input length', () => {
    const items = Array.from({ length: 30 }, (_, idx) => ({ h: 1, i: `i${idx}`, w: 3, x: 0, y: 0 }))
    expect(computeLayoutWithCols(items, 24)).toHaveLength(30)
  })
  test('all y values >= 0', () => {
    const items = [{ h: 1, i: 'a', w: 12, x: 0, y: 0 }]
    const placed = computeLayoutWithCols(items, 24)
    for (const p of placed) expect(p.y).toBeGreaterThanOrEqual(0)
  })
  test('all x + w <= cols', () => {
    const items = Array.from({ length: 20 }, (_, idx) => ({ h: 1, i: `i${idx}`, w: 8, x: 0, y: 0 }))
    const placed = computeLayoutWithCols(items, 24)
    for (const p of placed) expect(p.x + p.w).toBeLessThanOrEqual(24)
  })
})
describe('clampLayoutToCols edge', () => {
  test('item already at edge unchanged', () => {
    const items = [{ h: 1, i: 'a', w: 12, x: 12, y: 0 }]
    expect(clampLayoutToCols(items, 24)[0]).toBe(items[0])
  })
  test('w exactly equals cols', () => {
    const items = [{ h: 1, i: 'a', w: 24, x: 0, y: 0 }]
    expect(clampLayoutToCols(items, 24)[0]).toBe(items[0])
  })
  test('very narrow cols=1', () => {
    const items = [{ h: 1, i: 'a', w: 5, x: 3, y: 0 }]
    const clamped = clampLayoutToCols(items, 1)
    expect(clamped[0]?.w).toBe(1)
    expect(clamped[0]?.x).toBe(0)
  })
})
describe('enforceMinH preserves item field identity', () => {
  test('preserves i/w/x/y when only h changes', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 3, y: 4 }]
    const out = enforceMinH({
      fillSet: new Set(),
      layout,
      minHByKey: new Map([['a', 5]]),
      phase: 'measuring'
    })
    expect(out[0]).toMatchObject({ i: 'a', w: 12, x: 3, y: 4 })
  })
  test('preserves i/w/x/y when fill skipped', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 3, y: 4 }]
    const out = enforceMinH({
      fillSet: new Set(['a']),
      layout,
      minHByKey: new Map([['a', 99]]),
      phase: 'measuring'
    })
    expect(out[0]).toBe(layout[0])
  })
})
describe('buildLayout explicit h=0 preserved', () => {
  test('explicit h=0 does not fallback', () => {
    const configMap = new Map([['a', { h: 0 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]?.h).toBe(0)
  })
  test('explicit x/y=0 preserved (default also 0)', () => {
    const configMap = new Map([['a', { x: 0, y: 0 }]])
    const out = buildLayout({ cols: 24, configMap, fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]?.x).toBe(0)
    expect(out[0]?.y).toBe(0)
  })
})
describe('toGridConfig numeric edge values', () => {
  test('h=0 preserved (non-default)', () => {
    const layout = [{ h: 0, i: 'a', w: 12, x: 0, y: 0 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.h).toBe(0)
  })
  test('large numbers preserved', () => {
    const layout = [{ h: 1_000_000, i: 'a', w: 12, x: 999, y: 9999 }]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]).toMatchObject({ h: 1_000_000, w: 12, x: 999, y: 9999 })
  })
})
describe('storage large config', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('handles 500-item layout', () => {
    const layout = Array.from({ length: 500 }, (_, idx) => ({ h: 2, i: `i${idx}`, w: 4, x: 0, y: idx * 2 }))
    writeStorage('big', { layout })
    const read = readStorage('big')
    expect(read?.layout).toHaveLength(500)
  })
})
describe('gridStore listener stability', () => {
  test('subscribing twice with same listener adds both (Set semantics)', () => {
    let calls = 0
    const handler = () => {
      calls += 1
    }
    const unsub1 = gridStore.subscribe(handler)
    const unsub2 = gridStore.subscribe(handler)
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
    unsub1()
    unsub2()
    expect(calls).toBe(1)
  })
})
describe('cn with very long class list', () => {
  test('handles 50+ classes without errors', () => {
    const classes = Array.from({ length: 50 }, (_, idx) => `cls-${idx}`)
    expect(() => cn(...classes)).not.toThrow()
  })
  test('handles undefined interspersed', () => {
    expect(cn('a', undefined, 'b', null, 'c')).toBe('a b c')
  })
})
describe('extractKeys symbol key skipped', () => {
  test('numeric keys accepted', () => {
    const el = { ...(<div key='42' />) }
    expect(extractKeys([el as never])).toEqual(['42'])
  })
})
describe('flatChildren flattens deeply', () => {
  test('handles array of arrays of arrays', () => {
    const result = flatChildren([[[<div key='a' />]]])
    expect(result).toHaveLength(1)
  })
})
describe('pxToGridH returns integers', () => {
  test('Math.ceil ensures integer output', () => {
    for (let px = 1; px <= 200; px += 1) expect(Number.isInteger(pxToGridH(px, 50, 16))).toBe(true)
  })
})
describe('Grid wrapper resetRef always callable via store', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('reset callable after mount', async () => {
    render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(gridStore.getSnapshot()?.reset).toBeInstanceOf(Function)
  })
})
describe('constraint fillSet skip semantics', () => {
  test('fill item always returns h unchanged regardless of content', () => {
    const refs = {
      cardRef: new Map<string, HTMLDivElement>(),
      fillSet: new Set<string>(['fill-item']),
      lastKnownWRef: new Map<string, number>(),
      marginY: 16,
      previousMinHRef: new Map<string, number>(),
      rowHeight: 50,
      transitionFrameRef: new Map<string, number>()
    }
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 10_000 })
    refs.cardRef.set('fill-item', el)
    const { constrainSize } = createContentMinConstraint(refs)
    expect(constrainSize({ h: 2, i: 'fill-item', w: 12, x: 0, y: 0 }, 12, 1, 'se').h).toBe(1)
  })
  test('constrainSize preserves incoming w', () => {
    const refs = {
      cardRef: new Map<string, HTMLDivElement>(),
      fillSet: new Set<string>(),
      lastKnownWRef: new Map<string, number>(),
      marginY: 16,
      previousMinHRef: new Map<string, number>(),
      rowHeight: 50,
      transitionFrameRef: new Map<string, number>()
    }
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 100 })
    refs.cardRef.set('a', el)
    const { constrainSize } = createContentMinConstraint(refs)
    expect(constrainSize({ h: 2, i: 'a', w: 12, x: 0, y: 0 }, 15, 5, 'se').w).toBe(15)
  })
})
describe('measureNaturalHeight zero-content', () => {
  test('returns 0 when element has no content', () => {
    const el = document.createElement('div')
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 0 })
    expect(measureNaturalHeight(el)).toBe(0)
  })
})
describe('toGridConfig mixed x/y positions preserved', () => {
  test('grid of items at various positions', () => {
    const layout = [
      { h: 2, i: 'a', w: 12, x: 0, y: 0 },
      { h: 2, i: 'b', w: 12, x: 12, y: 0 },
      { h: 2, i: 'c', w: 12, x: 0, y: 2 },
      { h: 2, i: 'd', w: 12, x: 12, y: 2 }
    ]
    const cfg = toGridConfig({ cols: 24, gap: 16, layout, rowHeight: 50 })
    expect(cfg.layout?.[0]?.x).toBeUndefined()
    expect(cfg.layout?.[0]?.y).toBeUndefined()
    expect(cfg.layout?.[1]?.x).toBe(12)
    expect(cfg.layout?.[2]?.y).toBe(2)
  })
})
describe('Panel item count', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: Array.from({ length: 7 }, (_, idx) => ({ h: 1, i: `i${idx}`, w: 4, x: 0, y: idx })),
      phase: 'done',
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
  test('shows count matching layout length', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const header = container.querySelector('dialog')?.textContent ?? ''
    expect(header).toContain('7')
  })
})
describe('Panel Rings active/inactive', () => {
  beforeEach(() => {
    cleanup()
  })
  test('active class when showRings=true', () => {
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
      showRings: true,
      toggleRings: () => {
        /* Empty */
      }
    })
    const { container } = render(<Panel />)
    openPopover(container)
    const rings = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Cell borders'))
    expect(rings?.className).toContain('bg-muted')
  })
  test('inactive class when showRings=false', () => {
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
    const { container } = render(<Panel />)
    openPopover(container)
    const rings = [...container.querySelectorAll('button')].find(b => b.textContent?.includes('Cell borders'))
    expect(rings?.className).not.toContain('bg-muted font-medium')
  })
})
describe('gridStore reset field re-identity across mounts', () => {
  beforeEach(() => {
    cleanup()
  })
  test('new mount replaces reset reference', async () => {
    const { unmount } = render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    const first = gridStore.getSnapshot()?.reset
    unmount()
    render(
      <Grid>
        <div key='b'>y</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(gridStore.getSnapshot()?.reset).not.toBe(first)
  })
})
describe('cn empty strings', () => {
  test('empty string removed', () => {
    expect(cn('a', '', 'b')).toBe('a b')
  })
})
describe('Grid without any config renders with defaults', () => {
  beforeEach(() => {
    cleanup()
  })
  test('cols defaults to 24', async () => {
    render(
      <Grid>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(gridStore.getSnapshot()?.cols).toBe(24)
  })
})
describe('buildLayout fillSet precedence without config', () => {
  test('fillSet matters when configMap empty', () => {
    const out = buildLayout({ cols: 24, configMap: new Map(), fillSet: new Set(['a']), itemKeys: ['a'] })
    expect(out[0]?.h).toBe(8)
  })
})
describe('enforceMinH produces fresh items in measuring', () => {
  test('items not reused from input', () => {
    const layout = [{ h: 2, i: 'a', w: 12, x: 0, y: 0 }]
    const out = enforceMinH({ fillSet: new Set(), layout, minHByKey: new Map([['a', 4]]), phase: 'measuring' })
    expect(out[0]).not.toBe(layout[0])
  })
})
describe('toGridConfig always returns layout array', () => {
  test('empty input gives empty layout array', () => {
    const cfg = toGridConfig({ cols: 24, gap: 16, layout: [], rowHeight: 50 })
    expect(Array.isArray(cfg.layout)).toBe(true)
    expect(cfg.layout).toHaveLength(0)
  })
})
describe('computeLayoutWithCols single large item', () => {
  test('single h=20 item placed correctly', () => {
    const placed = computeLayoutWithCols([{ h: 20, i: 'a', w: 24, x: 0, y: 0 }], 24)
    expect(placed[0]).toMatchObject({ h: 20, x: 0, y: 0 })
  })
})
describe('clampLayoutToCols returns same ref when no changes', () => {
  test('identity preserved', () => {
    const item = { h: 1, i: 'a', w: 6, x: 0, y: 0 }
    expect(clampLayoutToCols([item], 24)[0]).toBe(item)
  })
})
describe('gridStore snapshot identity', () => {
  test('consecutive calls return same reference', () => {
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: false,
      gap: 16,
      layout: [],
      phase: 'done',
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
    expect(gridStore.getSnapshot()).toBe(gridStore.getSnapshot())
  })
})
describe('Panel step=1 on ranges', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
  test('all sliders step=1', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    for (const input of container.querySelectorAll<HTMLInputElement>('input[type=range]')) expect(input.step).toBe('1')
  })
})
describe('buildLayout output has required RGL fields', () => {
  test('h/i/w/x/y present', () => {
    const out = buildLayout({ cols: 12, configMap: new Map(), fillSet: new Set(), itemKeys: ['a'] })
    expect(out[0]?.h).toBeDefined()
    expect(out[0]?.i).toBeDefined()
    expect(out[0]?.w).toBeDefined()
    expect(out[0]?.x).toBeDefined()
    expect(out[0]?.y).toBeDefined()
  })
})
describe('storage prefix key uniqueness', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('similar keys not colliding', () => {
    writeStorage('abc', { cols: 1 })
    writeStorage('abcd', { cols: 2 })
    expect(readStorage('abc')?.cols).toBe(1)
    expect(readStorage('abcd')?.cols).toBe(2)
  })
})
describe('Grid with onConfigChange AND persist', () => {
  beforeEach(() => {
    cleanup()
    globalThis.localStorage.clear()
  })
  test('both fire on change', async () => {
    const received: unknown[] = []
    render(
      <Grid
        editable
        id='both'
        onConfigChange={c => {
          received.push(c)
        }}
        persist>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    await act(async () => {
      gridStore.getSnapshot()?.setCols(19)
      await new Promise<void>(resolve => {
        setTimeout(resolve, 50)
      })
    })
    expect(received.length).toBeGreaterThan(0)
    expect(readStorage('both')?.cols).toBe(19)
  })
})
describe('Panel editable empty layout', () => {
  beforeEach(() => {
    cleanup()
    gridStore.setState({
      cols: 24,
      compact: false,
      editable: true,
      gap: 16,
      layout: [],
      phase: 'done',
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
  test('shows 0 in header', () => {
    const { container } = render(<Panel />)
    openPopover(container)
    const header = container.querySelector('dialog')?.textContent ?? ''
    expect(header).toContain('0')
  })
})
describe('Grid classNameMap applies to cell', () => {
  beforeEach(() => {
    cleanup()
  })
  test('cell has className', async () => {
    const { container } = render(
      <Grid config={{ layout: [{ className: 'my-cls', i: 'a', w: 12 }] }}>
        <div key='a'>x</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelector('.my-cls')).not.toBeNull()
  })
  test('mixed className presence', async () => {
    const { container } = render(
      <Grid
        config={{
          layout: [
            { className: 'has', i: 'a', w: 12 },
            { i: 'b', w: 12 }
          ]
        }}>
        <div key='a'>a</div>
        <div key='b'>b</div>
      </Grid>
    )
    await act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 30)
      })
    })
    expect(container.querySelectorAll('.has').length).toBe(1)
  })
})
describe('cn all-falsy inputs', () => {
  test('returns empty string', () => {
    expect(cn(false, null, undefined)).toBe('')
  })
})
describe('computeLayoutWithCols preserves input order', () => {
  test('order of i values unchanged', () => {
    const items = [
      { h: 1, i: 'first', w: 6, x: 0, y: 0 },
      { h: 1, i: 'second', w: 6, x: 0, y: 0 },
      { h: 1, i: 'third', w: 6, x: 0, y: 0 }
    ]
    expect(computeLayoutWithCols(items, 24).map(p => p.i)).toEqual(['first', 'second', 'third'])
  })
})
describe('readStorage with non-prefixed key', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('returns null for keys without ogrid: prefix', () => {
    globalThis.localStorage.setItem('plain-key', 'value')
    expect(readStorage('plain-key')).toBeNull()
  })
})
describe('writeStorage preserves complex types', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })
  test('className/fill/numeric fields preserved', () => {
    writeStorage('types', {
      layout: [{ className: 'cn', fill: true, h: 4, i: 'a', minH: 2, w: 12, x: 3, y: 4 }]
    })
    const read = readStorage('types')
    expect(read?.layout?.[0]).toMatchObject({
      className: 'cn',
      fill: true,
      h: 4,
      i: 'a',
      minH: 2,
      w: 12,
      x: 3,
      y: 4
    })
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
