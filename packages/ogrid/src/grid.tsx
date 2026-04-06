/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/** biome-ignore-all lint/performance/useTopLevelRegex: regex used in closures */
/* oxlint-disable react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop, complexity */
/* eslint-disable no-continue, no-console, complexity, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @typescript-eslint/max-params, react-hooks/refs */
'use client'
import type { ReactElement, ReactNode } from 'react'
import type { Layout, LayoutItem as RGLLayoutItem } from 'react-grid-layout'
import { isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GridLayout, verticalCompactor } from 'react-grid-layout'
import type { GridConfig } from './types'
import { cn } from './cn'
import { checkOverlaps, clampLayoutToCols, computeLayoutWithCols } from './compute-layout'
import {
  DEFAULT_COLS,
  DEFAULT_GAP,
  DEFAULT_ROW_HEIGHT,
  DRAG_HANDLE_CLASS,
  FALLBACK_H,
  IDLE_TIMEOUT,
  MAX_TIMEOUT,
  RESPONSIVE_BREAKPOINT
} from './constants'
import { createContentMinConstraint } from './constraint'
import { gridStore } from './context'
import { pxToGridH } from './measurement'
import Panel from './panel'
import { toGridConfig } from './use-grid-config'
interface GridInnerProps {
  children: ReactNode
  config?: GridConfig
  editable?: boolean
  onConfigChange?: (config: GridConfig) => void
}
interface GridProps extends GridInnerProps {
  id?: string
  persist?: boolean
}
const KEY_PREFIX_RE = /^\.\$/u
const flatChildren = (children: ReactNode): ReactElement[] => {
  const result: ReactElement[] = []
  const items = Array.isArray(children) ? (children as ReactNode[]) : [children]
  for (const child of items)
    if (Array.isArray(child)) result.push(...flatChildren(child))
    else if (isValidElement(child)) result.push(child)
  return result
}
const extractKeys = (children: ReactNode): string[] => {
  const keys: string[] = []
  for (const child of flatChildren(children)) {
    const key = child.key?.replace(KEY_PREFIX_RE, '')
    if (key) keys.push(key)
  }
  return keys
}
const FREEFORM = { ...verticalCompactor, preventCollision: false }
const COMPACT = { ...verticalCompactor, preventCollision: false }
const DragHandle = () => (
  <div
    className={`${DRAG_HANDLE_CLASS} flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}>
    <svg
      className='size-4'
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth='2'
      viewBox='0 0 24 24'>
      <title>Drag handle</title>
      <circle cx='9' cy='5' r='1' />
      <circle cx='9' cy='12' r='1' />
      <circle cx='9' cy='19' r='1' />
      <circle cx='15' cy='5' r='1' />
      <circle cx='15' cy='12' r='1' />
      <circle cx='15' cy='19' r='1' />
    </svg>
  </div>
)
const buildLayout = (
  itemKeys: string[],
  configMap: Map<string, { h?: number; minH?: number; minW?: number; w?: number; x?: number; y?: number }>,
  fillSet: Set<string>,
  cols: number
): Layout => {
  const result: RGLLayoutItem[] = []
  for (const key of itemKeys) {
    const c = configMap.get(key)
    result.push({
      h: c?.h ?? (fillSet.has(key) ? 8 : 1),
      i: key,
      minH: c?.minH,
      minW: c?.minW,
      w: c?.w ?? cols,
      x: c?.x ?? 0,
      y: c?.y ?? 0
    })
  }
  return result
}
const GridInner = ({ children, config, editable = false, onConfigChange }: GridInnerProps) => {
  const [cols, setCols] = useState(config?.cols ?? DEFAULT_COLS)
  const [gap, setGap] = useState(config?.gap ?? DEFAULT_GAP)
  const [rowHeight, setRowHeight] = useState(config?.rowHeight ?? DEFAULT_ROW_HEIGHT)
  const margin: readonly [number, number] = useMemo(() => [gap, gap], [gap])
  const onConfigChangeRef = useRef(onConfigChange)
  onConfigChangeRef.current = onConfigChange
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef(new Map<string, HTMLDivElement>())
  const minHRef = useRef(new Map<string, number>())
  const lastKnownWRef = useRef(new Map<string, number>())
  const previousMinHRef = useRef(new Map<string, number>())
  const transitionFrameRef = useRef(new Map<string, number>())
  const settingLayoutRef = useRef(false)
  const positionedIdsRef = useRef(new Set<string>())
  const resizedIdsRef = useRef(new Set<string>())
  const freeformLayoutRef = useRef<Layout>([])
  const initialLayoutRef = useRef<Layout>([])
  const initialMinHRef = useRef(new Map<string, number>())
  const compactModeRef = useRef(false)
  const measureWindowRef = useRef({
    capTimer: null as null | ReturnType<typeof setTimeout>,
    idleTimer: null as null | ReturnType<typeof setTimeout>,
    openedAt: 0,
    phase: 'measuring' as 'done' | 'measuring'
  })
  const [phase, setPhase] = useState<'done' | 'measuring'>('measuring')
  const [compact, setCompact] = useState(false)
  const [showRings, setShowRings] = useState(false)
  const rafRef = useRef(0)
  const [width, setWidth] = useState(0)
  const itemKeys = useMemo(() => extractKeys(children), [children])
  const fillSet = useMemo(() => {
    const s = new Set<string>()
    if (config?.layout) for (const item of config.layout) if (item.fill) s.add(item.i)
    return s
  }, [config?.layout])
  const classNameMap = useMemo(() => {
    const m = new Map<string, string>()
    if (config?.layout) for (const item of config.layout) if (item.className) m.set(item.i, item.className)
    return m
  }, [config?.layout])
  const configMap = useMemo(() => {
    const m = new Map<string, { h?: number; minH?: number; minW?: number; w?: number; x?: number; y?: number }>()
    if (config?.layout) for (const item of config.layout) m.set(item.i, item)
    return m
  }, [config?.layout])
  const colsRef = useRef(cols)
  const gapRef = useRef(gap)
  const rowHeightRef = useRef(rowHeight)
  const [layout, setLayout] = useState<Layout>(() => buildLayout(itemKeys, configMap, fillSet, cols))
  const emitConfigChange = useCallback(
    (l: Layout) => {
      queueMicrotask(() => {
        onConfigChangeRef.current?.(
          toGridConfig({ cols: colsRef.current, fillSet, gap: gapRef.current, layout: l, rowHeight: rowHeightRef.current })
        )
      })
    },
    [fillSet]
  )
  const computeLayout = useCallback((items: Layout): Layout => computeLayoutWithCols(items, colsRef.current), [])
  const closeMeasureWindow = useCallback(() => {
    const mw = measureWindowRef.current
    if (mw.phase === 'done') return
    mw.phase = 'done'
    if (mw.idleTimer) clearTimeout(mw.idleTimer)
    if (mw.capTimer) clearTimeout(mw.capTimer)
    mw.idleTimer = null
    mw.capTimer = null
    setLayout(prev => {
      const final = prev.map(item => {
        if (fillSet.has(item.i)) return item
        const minH = minHRef.current.get(item.i)
        if (minH === undefined || minH <= 0) {
          console.warn(`[ogrid] item '${item.i}' unmeasured at window close, using fallback h:${String(FALLBACK_H)}`)
          return { ...item, h: FALLBACK_H, minH: 1 }
        }
        return { ...item, h: Math.max(item.h, minH), minH }
      })
      const placed = computeLayoutWithCols(final, colsRef.current)
      freeformLayoutRef.current = placed
      if (initialLayoutRef.current.length === 0) {
        initialLayoutRef.current = placed
        initialMinHRef.current = new Map(minHRef.current)
      }
      return placed
    })
    setPhase('done')
  }, [fillSet])
  const resetIdleTimer = useCallback(() => {
    const mw = measureWindowRef.current
    if (mw.phase === 'done') return
    if (mw.idleTimer) clearTimeout(mw.idleTimer)
    mw.idleTimer = setTimeout(closeMeasureWindow, IDLE_TIMEOUT)
  }, [closeMeasureWindow])
  const measureAndUpdate = useCallback(() => {
    for (const [key, el] of cardRef.current.entries()) {
      if (fillSet.has(key)) continue
      minHRef.current.set(key, pxToGridH(el.scrollHeight, rowHeight, gap))
    }
    settingLayoutRef.current = true
    setLayout(prev => {
      const measured = prev.map(item => {
        const minH = minHRef.current.get(item.i) ?? 1
        const targetH = Math.max(item.h, minH)
        return { ...item, h: targetH, minH }
      })
      const placed = computeLayout(measured)
      const changed = prev.some((item, idx) => {
        const p = placed[idx]
        return p && (item.h !== p.h || item.y !== p.y || item.x !== p.x)
      })
      if (!changed) {
        settingLayoutRef.current = false
        return prev
      }
      return placed
    })
    resetIdleTimer()
  }, [computeLayout, fillSet, gap, resetIdleTimer, rowHeight])
  colsRef.current = cols
  gapRef.current = gap
  rowHeightRef.current = rowHeight
  useLayoutEffect(() => {
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      if (typeof args[0] === 'string' && args[0].includes('width(-1)')) return
      originalWarn.apply(console, args)
    }
    return () => {
      console.warn = originalWarn
    }
  }, [])
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateWidth = (w: number) => {
      setWidth(w)
      const isCompact = w < RESPONSIVE_BREAKPOINT
      compactModeRef.current = isCompact
      setCompact(isCompact)
    }
    updateWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) updateWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  useLayoutEffect(() => {
    const mw = measureWindowRef.current
    mw.openedAt = performance.now()
    mw.capTimer = setTimeout(closeMeasureWindow, MAX_TIMEOUT)
    return () => {
      if (mw.idleTimer) clearTimeout(mw.idleTimer)
      if (mw.capTimer) clearTimeout(mw.capTimer)
    }
  }, [closeMeasureWindow])
  // biome-ignore lint/correctness/useExhaustiveDependencies: width triggers re-measurement
  useLayoutEffect(() => {
    if (cardRef.current.size === 0) return
    if (measureWindowRef.current.phase === 'measuring') measureAndUpdate()
  }, [measureAndUpdate, width])
  useLayoutEffect(() => {
    const mw = measureWindowRef.current
    const observer = new ResizeObserver(entries => {
      let changed = false
      for (const entry of entries) {
        const el = entry.target
        if (!(el instanceof HTMLDivElement)) continue
        const key = el.dataset.ogridKey
        if (!key || fillSet.has(key)) continue
        const gridH = pxToGridH(el.scrollHeight, rowHeight, gap)
        const prevMinH = minHRef.current.get(key)
        if (prevMinH === gridH) continue
        minHRef.current.set(key, gridH)
        changed = true
      }
      if (changed && mw.phase === 'measuring') {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = requestAnimationFrame(measureAndUpdate)
      }
    })
    for (const el of cardRef.current.values()) observer.observe(el)
    return () => observer.disconnect()
  }, [fillSet, gap, measureAndUpdate, rowHeight])
  // biome-ignore lint/correctness/useExhaustiveDependencies: gridStore sync uses all relevant state
  useEffect(() => {
    gridStore.setState({
      ...gridStore.getSnapshot(),
      cols,
      compact,
      editable,
      gap,
      layout,
      phase,
      positionedIds: positionedIdsRef.current,
      resizedIds: resizedIdsRef.current,
      rowHeight,
      setCols: (c: number) => {
        setCols(c)
        setLayout(prev => {
          const next = computeLayoutWithCols(clampLayoutToCols(prev, c), c)
          freeformLayoutRef.current = next
          emitConfigChange(next)
          return next
        })
      },
      setGap: (g: number) => {
        setGap(g)
        emitConfigChange(freeformLayoutRef.current)
      },
      setRowHeight: (rh: number) => {
        setRowHeight(rh)
        emitConfigChange(freeformLayoutRef.current)
      },
      showRings,
      toggleRings: () => setShowRings(prev => !prev)
    })
  }, [
    closeMeasureWindow,
    cols,
    compact,
    config,
    configMap,
    editable,
    emitConfigChange,
    fillSet,
    gap,
    itemKeys,
    layout,
    phase,
    rowHeight,
    showRings
  ])
  const contentMinConstraint = useMemo(
    () =>
      createContentMinConstraint({
        cardRef: cardRef.current,
        fillSet,
        lastKnownWRef: lastKnownWRef.current,
        marginY: gap,
        previousMinHRef: previousMinHRef.current,
        rowHeight,
        transitionFrameRef: transitionFrameRef.current
      }),
    [fillSet, gap, rowHeight]
  )
  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      if (compactModeRef.current) return
      if (settingLayoutRef.current) {
        settingLayoutRef.current = false
        return
      }
      const enforced = newLayout.map(item => {
        if (fillSet.has(item.i)) return item
        const minH = minHRef.current.get(item.i) ?? item.minH ?? 1
        const h = Math.max(item.h, minH)
        return { ...item, h, minH }
      })
      const result = measureWindowRef.current.phase === 'measuring' ? computeLayout(enforced) : enforced
      checkOverlaps(result)
      freeformLayoutRef.current = result
      setLayout(result)
    },
    [computeLayout, fillSet]
  )
  const handleDragStop = useCallback(
    (_layout: Layout, _oldItem: null | RGLLayoutItem, newItem: null | RGLLayoutItem) => {
      if (newItem) positionedIdsRef.current.add(newItem.i)
      emitConfigChange(freeformLayoutRef.current)
    },
    [emitConfigChange]
  )
  const handleResizeStop = useCallback(
    (_layout: Layout, _oldItem: null | RGLLayoutItem, newItem: null | RGLLayoutItem) => {
      if (newItem) resizedIdsRef.current.add(newItem.i)
      emitConfigChange(freeformLayoutRef.current)
    },
    [emitConfigChange]
  )
  const setCardRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) {
      el.dataset.ogridKey = key
      cardRef.current.set(key, el)
    } else cardRef.current.delete(key)
  }, [])
  const isFreeform = editable && phase === 'done' && !compact
  const effectiveLayout = compact
    ? clampLayoutToCols(freeformLayoutRef.current.length > 0 ? freeformLayoutRef.current : layout, cols)
    : layout
  const effectiveCompactor = compact ? COMPACT : FREEFORM
  const childMap = useMemo(() => {
    const m = new Map<string, ReactNode>()
    for (const child of flatChildren(children)) {
      const key = child.key?.replace(KEY_PREFIX_RE, '')
      if (key) m.set(key, child)
    }
    return m
  }, [children])
  return (
    <div ref={containerRef}>
      {width > 0 && (
        <div
          className={phase === 'measuring' ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
          style={phase === 'measuring' ? { pointerEvents: 'none' } : undefined}>
          <GridLayout
            compactor={effectiveCompactor}
            constraints={compact ? undefined : [contentMinConstraint]}
            dragConfig={{ bounded: false, enabled: isFreeform, handle: `.${DRAG_HANDLE_CLASS}`, threshold: 3 }}
            gridConfig={{ cols, containerPadding: null, margin, maxRows: Number.POSITIVE_INFINITY, rowHeight }}
            layout={effectiveLayout}
            onDragStop={handleDragStop}
            onLayoutChange={handleLayoutChange}
            onResizeStop={handleResizeStop}
            resizeConfig={{ enabled: isFreeform, handles: ['se'] }}
            style={phase === 'measuring' ? { transition: 'none' } : undefined}
            width={width}>
            {itemKeys.map(key => (
              <div
                className={cn(
                  'h-full rounded-lg ring-1 transition-shadow',
                  showRings && editable ? 'ring-ring' : editable ? 'ring-ring/0 hover:ring-ring' : 'ring-ring/0'
                )}
                key={key}>
                <div
                  className={cn(
                    'relative flex flex-col',
                    phase === 'done' ? 'h-full overflow-auto' : 'min-h-full',
                    classNameMap.get(key)
                  )}
                  ref={el => setCardRef(key, el)}>
                  {editable ? (
                    <div className='absolute right-1 top-1 z-10'>
                      <DragHandle />
                    </div>
                  ) : null}
                  <div className='flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden'>
                    {childMap.get(key)}
                  </div>
                </div>
              </div>
            ))}
          </GridLayout>
        </div>
      )}
    </div>
  )
}
const STORAGE_PREFIX = 'ogrid:'
const readStorage = (id: string): GridConfig | null => {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_PREFIX + id)
    return raw ? (JSON.parse(raw) as GridConfig) : null
  } catch {
    return null
  }
}
const writeStorage = (id: string, config: GridConfig) => {
  try {
    globalThis.localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(config))
  } catch {
    /* SSR */
  }
}
const clearStorage = (id: string) => {
  try {
    globalThis.localStorage.removeItem(STORAGE_PREFIX + id)
  } catch {
    /* SSR */
  }
}
const Grid = ({ children, config, editable = false, id, onConfigChange, persist = false }: GridProps) => {
  const [resetCount, setResetCount] = useState(0)
  const saved = persist && id ? readStorage(id) : null
  const effectiveConfig = saved ?? config
  const handleConfigChange = useCallback(
    (c: GridConfig) => {
      if (persist && id) writeStorage(id, c)
      onConfigChange?.(c)
    },
    [id, onConfigChange, persist]
  )
  const resetRef = useRef<() => void>(undefined)
  resetRef.current = () => {
    if (persist && id) clearStorage(id)
    setResetCount(c => c + 1)
  }
  useEffect(() => {
    const prev = gridStore.getSnapshot()
    if (prev) gridStore.setState({ ...prev, reset: () => resetRef.current?.() })
  }, [])
  return (
    <GridInner config={effectiveConfig} editable={editable} key={resetCount} onConfigChange={handleConfigChange}>
      {children}
    </GridInner>
  )
}
Grid.Panel = Panel
export default Grid
