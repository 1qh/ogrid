/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/* oxlint-disable import/no-unassigned-import, react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-continue, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @eslint-react/no-unnecessary-use-callback, @typescript-eslint/max-params, @typescript-eslint/no-unused-vars, max-statements */
'use client'
import type { Layout, LayoutItem, ResizeHandleAxis } from 'react-grid-layout'
import { Button } from '@a/ui/button'
import { GripVertical } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import 'react-grid-layout/css/styles.css'
import { GridLayout, noCompactor } from 'react-grid-layout'
import Accordion from '~/widgets/accordion'
import AsyncTable from '~/widgets/async-table'
import Badges from '~/widgets/badges'
import DataTableWidget from '~/widgets/data-table'
import KpiCard from '~/widgets/kpi-card'
import LayoutSwitch from '~/widgets/layout-switch'
import ProgressBars from '~/widgets/progress-bars'
import Prose from '~/widgets/prose'
import ScrollContent from '~/widgets/scroll-content'
import StatsGrid from '~/widgets/stats-grid'
import TextWidget from '~/widgets/text-widget'
import Timeline from '~/widgets/timeline'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false }),
  SparklineWidget = dynamic(async () => import('~/widgets/sparkline'), { ssr: false }),
  COLS = 24,
  ROW_HEIGHT = 50,
  MARGIN_Y = 16,
  MARGIN: readonly [number, number] = [16, MARGIN_Y],
  DRAG_HANDLE_CLASS = 'ogrid-drag-handle',
  IDLE_TIMEOUT = 200,
  MAX_TIMEOUT = 2000,
  FALLBACK_H = 4,
  pxToGridH = (px: number) => Math.ceil((px + 1 + MARGIN_Y) / (ROW_HEIGHT + MARGIN_Y)),
  FILL_ITEMS = new Set(['chart', 'scroll', 'sparkline']),
  INITIAL_ITEMS = [
    { i: 'chart', w: 12 },
    { i: 'kpi', w: 12 },
    { i: 'progress', w: 12 },
    { i: 'table', w: 16 },
    { i: 'stats', w: 12 },
    { i: 'scroll', w: 12 },
    { i: 'timeline', w: 8 },
    { i: 'sparkline', w: 8 },
    { i: 'text', w: 12 },
    { i: 'layoutswitch', w: 12 },
    { i: 'async', w: 12 }
  ] as const,
  ADDABLE_WIDGETS = ['badges', 'accordion', 'prose'] as const,
  ITEM_CLASS: Record<string, string> = {
    kpi: 'bg-muted/50 rounded-lg',
    stats: 'bg-muted/50 rounded-lg'
  },
  DragHandle = () => (
    <div
      className={`${DRAG_HANDLE_CLASS} flex cursor-grab items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing`}>
      <GripVertical className='size-4' />
    </div>
  ),
  ITEM_CONTENT: Record<string, React.ReactNode> = {
    accordion: <Accordion />,
    async: <AsyncTable />,
    badges: <Badges />,
    chart: <BarChartWidget />,
    kpi: <KpiCard />,
    layoutswitch: <LayoutSwitch />,
    progress: <ProgressBars />,
    prose: <Prose />,
    scroll: <ScrollContent />,
    sparkline: <SparklineWidget />,
    stats: <StatsGrid />,
    table: <DataTableWidget />,
    text: <TextWidget />,
    timeline: <Timeline />
  },
  COMPACTOR = { ...noCompactor, preventCollision: true },
  Page = () => {
    const containerRef = useRef<HTMLDivElement>(null),
      cardRef = useRef(new Map<string, HTMLDivElement>()),
      minHRef = useRef(new Map<string, number>()),
      lastKnownWRef = useRef(new Map<string, number>()),
      previousMinHRef = useRef(new Map<string, number>()),
      transitionFrameRef = useRef(new Map<string, number>()),
      positionedIdsRef = useRef(new Set<string>()),
      resizedIdsRef = useRef(new Set<string>()),
      measureWindowRef = useRef({ phase: 'measuring' as 'measuring' | 'done', openedAt: 0, idleTimer: null as ReturnType<typeof setTimeout> | null, capTimer: null as ReturnType<typeof setTimeout> | null }),
      [phase, setPhase] = useState<'measuring' | 'done'>('measuring'),
      rafRef = useRef(0),
      [width, setWidth] = useState(0),
      [itemKeys, setItemKeys] = useState<string[]>(() => INITIAL_ITEMS.map(i => i.i)),
      addCountRef = useRef(0),
      [layout, setLayout] = useState<Layout>(() =>
        INITIAL_ITEMS.map(item => ({
          h: FILL_ITEMS.has(item.i) ? 8 : 1,
          i: item.i,
          w: item.w,
          x: 0,
          y: 0
        }))
      ),
      computeLayout = useCallback((items: Layout): Layout => {
        const colBottoms = Array.from({ length: COLS }, () => 0),
          result: LayoutItem[] = []
        for (const item of items) {
          let bestY = Number.POSITIVE_INFINITY,
            bestX = item.x
          for (let x = 0; x <= COLS - item.w; x += 1) {
            let maxY = 0
            for (let col = x; col < x + item.w; col += 1) maxY = Math.max(maxY, colBottoms[col] ?? 0)
            if (maxY < bestY) {
              bestY = maxY
              bestX = x
            }
          }
          const placed = { ...item, x: bestX, y: bestY }
          result.push(placed)
          for (let col = bestX; col < bestX + placed.w; col += 1) colBottoms[col] = bestY + placed.h
        }
        return result
      }, []),
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
            if (FILL_ITEMS.has(item.i)) return item
            const minH = minHRef.current.get(item.i)
            if (minH === undefined || minH <= 0) {
              console.warn(`[ogrid] item '${item.i}' unmeasured at window close, using fallback h:${String(FALLBACK_H)}`)
              return { ...item, h: FALLBACK_H, minH: 1 }
            }
            return { ...item, h: Math.max(item.h, minH), minH }
          })
          return computeLayout(final)
        })
        setPhase('done')
      }, [computeLayout]),
      resetIdleTimer = useCallback(() => {
        const mw = measureWindowRef.current
        if (mw.phase === 'done') return
        if (mw.idleTimer) clearTimeout(mw.idleTimer)
        mw.idleTimer = setTimeout(closeMeasureWindow, IDLE_TIMEOUT)
      }, [closeMeasureWindow]),
      measureAndUpdate = useCallback(() => {
        for (const [key, el] of cardRef.current.entries()) {
          if (FILL_ITEMS.has(key)) continue
          minHRef.current.set(key, pxToGridH(el.scrollHeight))
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
      }, [computeLayout, resetIdleTimer])
    useLayoutEffect(() => {
      const el = containerRef.current
      if (!el) return
      setWidth(el.getBoundingClientRect().width)
      const widthObserver = new ResizeObserver(entries => {
        for (const entry of entries) setWidth(entry.contentRect.width)
      })
      widthObserver.observe(el)
      return () => widthObserver.disconnect()
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
          const key = el.dataset.itemKey
          if (!key || FILL_ITEMS.has(key)) continue
          const gridH = pxToGridH(el.scrollHeight),
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
    }, [measureAndUpdate])
    const measureNaturalHeight = useCallback((el: HTMLDivElement) => {
        const parent = el.parentElement
        if (!parent) return el.scrollHeight
        const prevHeight = parent.style.height
        parent.style.height = 'auto'
        const natural = el.scrollHeight
        parent.style.height = prevHeight
        return natural
      }, []),
      contentMinConstraint = useMemo(
        () => ({
          constrainSize: (_item: LayoutItem, w: number, h: number, _handle: ResizeHandleAxis) => {
            if (FILL_ITEMS.has(_item.i)) return { h, w }
            const el = cardRef.current.get(_item.i)
            if (!el) return { h, w }
            const currentMinH = pxToGridH(measureNaturalHeight(el)),
              lastW = lastKnownWRef.current.get(_item.i),
              MAX_GUARD_FRAMES = 10
            let effectiveMinH = currentMinH
            if (lastW !== undefined && lastW !== w) {
              previousMinHRef.current.set(_item.i, currentMinH)
              transitionFrameRef.current.set(_item.i, 0)
              lastKnownWRef.current.set(_item.i, w)
            } else {
              lastKnownWRef.current.set(_item.i, w)
              const prevMinH = previousMinHRef.current.get(_item.i)
              if (prevMinH !== undefined) {
                const frames = (transitionFrameRef.current.get(_item.i) ?? 0) + 1
                transitionFrameRef.current.set(_item.i, frames)
                if (frames >= MAX_GUARD_FRAMES) {
                  previousMinHRef.current.delete(_item.i)
                  transitionFrameRef.current.delete(_item.i)
                } else effectiveMinH = Math.max(currentMinH, prevMinH)
              }
            }
            return { h: Math.max(h, effectiveMinH), w }
          },
          name: 'content-min'
        }),
        [measureNaturalHeight]
      ),
      handleLayoutChange = useCallback(
        (newLayout: Layout) => {
          const enforced = newLayout.map(item => {
            if (FILL_ITEMS.has(item.i)) return item
            const minH = minHRef.current.get(item.i) ?? item.minH ?? 1,
              h = Math.max(item.h, minH)
            return { ...item, h, minH }
          })
          setLayout(measureWindowRef.current.phase === 'measuring' ? computeLayout(enforced) : enforced)
        },
        [computeLayout]
      ),
      handleDragStop = useCallback((_layout: Layout, _oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
        if (newItem) positionedIdsRef.current.add(newItem.i)
      }, []),
      handleResizeStop = useCallback((_layout: Layout, _oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
        if (newItem) resizedIdsRef.current.add(newItem.i)
      }, []),
      handleReset = useCallback(() => {
        positionedIdsRef.current.clear()
        resizedIdsRef.current.clear()
        minHRef.current.clear()
        measureWindowRef.current = { phase: 'measuring', openedAt: performance.now(), idleTimer: null, capTimer: setTimeout(closeMeasureWindow, MAX_TIMEOUT) }
        setPhase('measuring')
        setLayout(
          INITIAL_ITEMS.map(item => ({
            h: FILL_ITEMS.has(item.i) ? 8 : 1,
            i: item.i,
            w: item.w,
            x: 0,
            y: 0
          }))
        )
        setItemKeys(INITIAL_ITEMS.map(i => i.i))
      }, [closeMeasureWindow]),
      handleAddItem = useCallback(() => {
        const widgetKey = ADDABLE_WIDGETS[addCountRef.current % ADDABLE_WIDGETS.length]
        addCountRef.current += 1
        const newKey = `${widgetKey}-${String(addCountRef.current)}`
        setItemKeys(prev => [...prev, newKey])
        setLayout(prev => {
          const newItem: LayoutItem = { h: FALLBACK_H, i: newKey, w: 12, x: 0, y: 0 }
          return computeLayout([...prev, newItem])
        })
      }, [computeLayout]),
      setCardRef = useCallback((key: string, el: HTMLDivElement | null) => {
        if (el) {
          el.dataset.itemKey = key
          cardRef.current.set(key, el)
        } else cardRef.current.delete(key)
      }, []),
      getContent = useCallback((key: string): React.ReactNode => {
        if (ITEM_CONTENT[key]) return ITEM_CONTENT[key]
        const base = key.replace(/-\d+$/, '')
        if (ITEM_CONTENT[base]) return ITEM_CONTENT[base]
        return <span className='text-sm text-muted-foreground'>{key}</span>
      }, [])
    return (
      <div className='flex flex-col gap-4 p-4'>
        <div className='flex items-center gap-4'>
          <span className='text-sm font-medium'>ogrid POC — Phase B</span>
          {phase === 'done' && (
            <>
              <Button onClick={handleAddItem} size='sm' variant='outline'>
                Add Item
              </Button>
              <Button onClick={handleReset} size='sm' variant='outline'>
                Reset
              </Button>
            </>
          )}
        </div>
        <div ref={containerRef}>
          {width > 0 && (
            <div
              className={phase === 'measuring' ? 'opacity-0' : 'opacity-100 transition-opacity duration-150'}
              style={phase === 'measuring' ? { pointerEvents: 'none' } : undefined}>
              <GridLayout
                compactor={COMPACTOR}
                constraints={[contentMinConstraint]}
                dragConfig={{ bounded: false, enabled: phase === 'done', handle: `.${DRAG_HANDLE_CLASS}`, threshold: 3 }}
                gridConfig={{
                  cols: COLS,
                  containerPadding: null,
                  margin: MARGIN,
                  maxRows: Number.POSITIVE_INFINITY,
                  rowHeight: ROW_HEIGHT
                }}
                layout={layout}
                onDragStop={handleDragStop}
                onLayoutChange={handleLayoutChange}
                onResizeStop={handleResizeStop}
                resizeConfig={{ enabled: phase === 'done', handles: ['se'] }}
                style={phase === 'measuring' ? { transition: 'none' } : undefined}
                width={width}>
                {itemKeys.map(key => (
                  <div className='group h-full rounded-lg ring-1 ring-transparent transition-shadow hover:ring-ring' key={key}>
                    <div
                      className={`flex flex-col rounded-lg border bg-card p-3 ${phase === 'done' ? 'h-full overflow-auto' : 'min-h-full'} ${ITEM_CLASS[key] ?? ''}`}
                      ref={el => setCardRef(key, el)}>
                      <div className='flex min-h-0 flex-1 items-start gap-2'>
                        <DragHandle />
                        <div className='min-w-0 flex-1 self-stretch overflow-hidden'>{getContent(key)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </GridLayout>
            </div>
          )}
        </div>
      </div>
    )
  }
export default Page
