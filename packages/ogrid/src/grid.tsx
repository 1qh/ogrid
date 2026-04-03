/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/* oxlint-disable react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-continue, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @typescript-eslint/max-params */
'use client'
import type { ReactElement, ReactNode } from 'react'
import type { Layout, LayoutItem as RGLLayoutItem } from 'react-grid-layout'
import { Children, isValidElement, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GridLayout, noCompactor, verticalCompactor } from 'react-grid-layout'
import { twMerge } from 'tailwind-merge'
import type { GridConfig } from './types'
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
interface GridProps {
  children: ReactNode
  config?: GridConfig
}
const extractKeys = (children: ReactNode): string[] => {
  const keys: string[] = []
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue
    const key = (child as ReactElement).key?.replace(/^\.\$/u, '')
    if (key) keys.push(key)
  }
  return keys
}
const FREEFORM = { ...noCompactor, preventCollision: true }
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
const Grid = ({ children, config }: GridProps) => {
  const [cols, setCols] = useState(config?.cols ?? DEFAULT_COLS)
  const [gap, setGap] = useState(config?.gap ?? DEFAULT_GAP)
  const [rowHeight, setRowHeight] = useState(config?.rowHeight ?? DEFAULT_ROW_HEIGHT)
  const margin: readonly [number, number] = useMemo(() => [gap, gap], [gap])
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
    measureAndUpdate()
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
  useEffect(() => {
    gridStore.setState({
      cols,
      compact,
      gap,
      layout,
      phase,
      positionedIds: positionedIdsRef.current,
      reset: () => {
        setCols(config?.cols ?? DEFAULT_COLS)
        setGap(config?.gap ?? DEFAULT_GAP)
        setRowHeight(config?.rowHeight ?? DEFAULT_ROW_HEIGHT)
        positionedIdsRef.current.clear()
        resizedIdsRef.current.clear()
        minHRef.current = new Map(initialMinHRef.current)
        freeformLayoutRef.current = initialLayoutRef.current
        settingLayoutRef.current = true
        setLayout(initialLayoutRef.current)
      },
      resizedIds: resizedIdsRef.current,
      rowHeight,
      setCols: (c: number) => {
        setCols(c)
        setLayout(prev => computeLayoutWithCols(clampLayoutToCols(prev, c), c))
      },
      setGap,
      setRowHeight,
      showRings,
      toggleRings: () => setShowRings(prev => !prev)
    })
  }, [closeMeasureWindow, cols, compact, config, configMap, fillSet, gap, itemKeys, layout, phase, rowHeight, showRings])
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
  const handleDragStop = useCallback((_layout: Layout, _oldItem: null | RGLLayoutItem, newItem: null | RGLLayoutItem) => {
    if (newItem) positionedIdsRef.current.add(newItem.i)
  }, [])
  const handleResizeStop = useCallback(
    (_layout: Layout, _oldItem: null | RGLLayoutItem, newItem: null | RGLLayoutItem) => {
      if (newItem) resizedIdsRef.current.add(newItem.i)
    },
    []
  )
  const setCardRef = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) {
      el.dataset.ogridKey = key
      cardRef.current.set(key, el)
    } else cardRef.current.delete(key)
  }, [])
  const isFreeform = phase === 'done' && !compact
  const effectiveLayout = compact
    ? clampLayoutToCols(freeformLayoutRef.current.length > 0 ? freeformLayoutRef.current : layout, cols)
    : layout
  const effectiveCompactor = compact ? COMPACT : FREEFORM
  const childMap = useMemo(() => {
    const m = new Map<string, ReactNode>()
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) continue
      const key = (child as ReactElement).key?.replace(/^\.\$/u, '')
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
                className={`h-full rounded-lg ring-1 transition-shadow ${showRings ? 'ring-ring' : 'ring-ring/0 hover:ring-ring'}`}
                key={key}>
                <div
                  className={twMerge(
                    'relative flex flex-col',
                    phase === 'done' ? 'h-full overflow-auto' : 'min-h-full',
                    classNameMap.get(key)
                  )}
                  ref={el => setCardRef(key, el)}>
                  <div className='absolute right-1 top-1 z-10'>
                    <DragHandle />
                  </div>
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
Grid.Panel = Panel
export default Grid
