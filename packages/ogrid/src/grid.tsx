/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/* oxlint-disable react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-continue, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @eslint-react/no-unnecessary-use-callback, @typescript-eslint/max-params, max-statements */
'use client'
import type { Layout, LayoutItem as RGLLayoutItem } from 'react-grid-layout'
import type { GridConfig } from './types'
import { Children, type ReactElement, type ReactNode, isValidElement, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { GridLayout, noCompactor, verticalCompactor } from 'react-grid-layout'
import { twMerge } from 'tailwind-merge'
import { checkOverlaps, clampLayoutToCols, computeLayoutWithCols } from './compute-layout'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT, DRAG_HANDLE_CLASS, FALLBACK_H, IDLE_TIMEOUT, MAX_TIMEOUT, RESPONSIVE_BREAKPOINT } from './constants'
import { createContentMinConstraint } from './constraint'
import { gridStore } from './context'
import { pxToGridH } from './measurement'
import Panel from './panel'

type GridProps = {
  children: ReactNode
  config?: GridConfig
}

const extractKeys = (children: ReactNode): string[] => {
    const keys: string[] = []
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) continue
      const key = (child as ReactElement).key?.replace(/^\.\$/, '')
      if (key) keys.push(key)
    }
    return keys
  },
  FREEFORM = { ...noCompactor, preventCollision: true },
  COMPACT = { ...verticalCompactor, preventCollision: false },
  DragHandle = () => (
    <div className={`${DRAG_HANDLE_CLASS} flex items-center justify-center rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800`}>
      <svg className='size-4' fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' viewBox='0 0 24 24'>
        <circle cx='9' cy='5' r='1' />
        <circle cx='9' cy='12' r='1' />
        <circle cx='9' cy='19' r='1' />
        <circle cx='15' cy='5' r='1' />
        <circle cx='15' cy='12' r='1' />
        <circle cx='15' cy='19' r='1' />
      </svg>
    </div>
  ),
  Grid = ({ children, config }: GridProps) => {
    const cols = config?.cols ?? DEFAULT_COLS,
      gap = config?.gap ?? DEFAULT_GAP,
      rowHeight = config?.rowHeight ?? DEFAULT_ROW_HEIGHT,
      margin: readonly [number, number] = useMemo(() => [gap, gap], [gap]),
      containerRef = useRef<HTMLDivElement>(null),
      cardRef = useRef(new Map<string, HTMLDivElement>()),
      minHRef = useRef(new Map<string, number>()),
      lastKnownWRef = useRef(new Map<string, number>()),
      previousMinHRef = useRef(new Map<string, number>()),
      transitionFrameRef = useRef(new Map<string, number>()),
      positionedIdsRef = useRef(new Set<string>()),
      resizedIdsRef = useRef(new Set<string>()),
      freeformLayoutRef = useRef<Layout>([]),
      compactModeRef = useRef(false),
      measureWindowRef = useRef({ phase: 'measuring' as 'measuring' | 'done', openedAt: 0, idleTimer: null as ReturnType<typeof setTimeout> | null, capTimer: null as ReturnType<typeof setTimeout> | null }),
      [phase, setPhase] = useState<'measuring' | 'done'>('measuring'),
      [compact, setCompact] = useState(false),
      rafRef = useRef(0),
      [width, setWidth] = useState(0),
      itemKeys = useMemo(() => extractKeys(children), [children]),
      fillSet = useMemo(() => {
        const s = new Set<string>()
        if (config?.layout)
          for (const item of config.layout)
            if (item.fill) s.add(item.i)
        return s
      }, [config?.layout]),
      classNameMap = useMemo(() => {
        const m = new Map<string, string>()
        if (config?.layout)
          for (const item of config.layout)
            if (item.className) m.set(item.i, item.className)
        return m
      }, [config?.layout]),
      [layout, setLayout] = useState<Layout>(() => {
        const configMap = new Map<string, (typeof config)['layout'] extends readonly (infer T)[] ? T : never>()
        if (config?.layout)
          for (const item of config.layout) configMap.set(item.i, item)
        return itemKeys.map(key => {
          const c = configMap.get(key)
          return {
            h: c?.h ?? (fillSet.has(key) ? 8 : 1),
            i: key,
            minH: c?.minH,
            minW: c?.minW,
            w: c?.w ?? cols,
            x: c?.x ?? 0,
            y: c?.y ?? 0
          }
        })
      }),
      computeLayout = useCallback((items: Layout): Layout => computeLayoutWithCols(items, cols), [cols]),
      closeMeasureWindow = useCallback(() => {
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
          const placed = computeLayoutWithCols(final, cols)
          freeformLayoutRef.current = placed
          return placed
        })
        setPhase('done')
      }, [cols, fillSet]),
      resetIdleTimer = useCallback(() => {
        const mw = measureWindowRef.current
        if (mw.phase === 'done') return
        if (mw.idleTimer) clearTimeout(mw.idleTimer)
        mw.idleTimer = setTimeout(closeMeasureWindow, IDLE_TIMEOUT)
      }, [closeMeasureWindow]),
      measureAndUpdate = useCallback(() => {
        for (const [key, el] of cardRef.current.entries()) {
          if (fillSet.has(key)) continue
          minHRef.current.set(key, pxToGridH(el.scrollHeight, rowHeight, gap))
        }
        setLayout(prev => {
          const measured = prev.map(item => {
              const minH = minHRef.current.get(item.i) ?? 1,
                targetH = Math.max(item.h, minH)
              return { ...item, h: targetH, minH }
            }),
            placed = computeLayout(measured),
            changed = prev.some((item, idx) => {
              const p = placed[idx]
              return p && (item.h !== p.h || item.y !== p.y || item.x !== p.x)
            })
          if (!changed) return prev
          return placed
        })
        resetIdleTimer()
      }, [computeLayout, fillSet, gap, resetIdleTimer, rowHeight])
    useLayoutEffect(() => {
      const originalWarn = console.warn
      console.warn = (...args: unknown[]) => {
        if (typeof args[0] === 'string' && args[0].includes('width(-1)')) return
        originalWarn.apply(console, args)
      }
      return () => { console.warn = originalWarn }
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
          const gridH = pxToGridH(el.scrollHeight, rowHeight, gap),
            prevMinH = minHRef.current.get(key)
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
    useLayoutEffect(() => {
      gridStore.setState({
        cols,
        compact,
        gap,
        layout,
        phase,
        positionedIds: positionedIdsRef.current,
        resizedIds: resizedIdsRef.current,
        rowHeight,
        setCols: () => {},
        setGap: () => {},
        setRowHeight: () => {},
        reset: () => {}
      })
    }, [cols, compact, gap, layout, phase, rowHeight])
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
      ),
      handleLayoutChange = useCallback(
        (newLayout: Layout) => {
          if (compactModeRef.current) return
          const enforced = newLayout.map(item => {
            if (fillSet.has(item.i)) return item
            const minH = minHRef.current.get(item.i) ?? item.minH ?? 1,
              h = Math.max(item.h, minH)
            return { ...item, h, minH }
          })
          const result = measureWindowRef.current.phase === 'measuring' ? computeLayout(enforced) : enforced
          checkOverlaps(result)
          freeformLayoutRef.current = result
          setLayout(result)
        },
        [computeLayout, fillSet]
      ),
      handleDragStop = useCallback((_layout: Layout, _oldItem: RGLLayoutItem | null, newItem: RGLLayoutItem | null) => {
        if (newItem) positionedIdsRef.current.add(newItem.i)
      }, []),
      handleResizeStop = useCallback((_layout: Layout, _oldItem: RGLLayoutItem | null, newItem: RGLLayoutItem | null) => {
        if (newItem) resizedIdsRef.current.add(newItem.i)
      }, []),
      setCardRef = useCallback((key: string, el: HTMLDivElement | null) => {
        if (el) {
          el.dataset.ogridKey = key
          cardRef.current.set(key, el)
        } else cardRef.current.delete(key)
      }, []),
      isFreeform = phase === 'done' && !compact,
      effectiveLayout = compact ? clampLayoutToCols(freeformLayoutRef.current.length > 0 ? freeformLayoutRef.current : layout, cols) : layout,
      effectiveCompactor = compact ? COMPACT : FREEFORM,
      childMap = useMemo(() => {
        const m = new Map<string, ReactNode>()
        for (const child of Children.toArray(children)) {
          if (!isValidElement(child)) continue
          const key = (child as ReactElement).key?.replace(/^\.\$/, '')
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
              gridConfig={{
                cols,
                containerPadding: null,
                margin,
                maxRows: Number.POSITIVE_INFINITY,
                rowHeight
              }}
              layout={effectiveLayout}
              onDragStop={handleDragStop}
              onLayoutChange={handleLayoutChange}
              onResizeStop={handleResizeStop}
              resizeConfig={{ enabled: false }}
              style={phase === 'measuring' ? { transition: 'none' } : undefined}
              width={width}>
              {itemKeys.map(key => (
                <div className='h-full rounded-lg ring-ring/0 ring-1 transition-shadow hover:ring-ring' key={key}>
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
