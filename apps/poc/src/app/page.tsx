/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/* oxlint-disable import/no-unassigned-import, react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-continue, no-console, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @eslint-react/no-unnecessary-use-callback, @typescript-eslint/max-params, @typescript-eslint/no-unused-vars, max-statements */
'use client'
import type { Layout, LayoutItem, ResizeHandleAxis } from 'react-grid-layout'
import { Button } from '@a/ui/button'
import { GripVertical } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import 'react-grid-layout/css/styles.css'
import { GridLayout, noCompactor, verticalCompactor } from 'react-grid-layout'
import Accordion from '~/widgets/accordion'
import AsyncTable from '~/widgets/async-table'
import Avatars from '~/widgets/avatars'
import Badges from '~/widgets/badges'
import CalendarWidget from '~/widgets/calendar'
import CheckboxWidget from '~/widgets/checkbox'
import DataTableWidget from '~/widgets/data-table'
import FormWidget from '~/widgets/form'
import KpiCard from '~/widgets/kpi-card'
import LayoutSwitchWidget from '~/widgets/layout-switch'
import ProgressBars from '~/widgets/progress-bars'
import Prose from '~/widgets/prose'
import ScrollContent from '~/widgets/scroll-content'
import SliderWidget from '~/widgets/slider'
import StatsGrid from '~/widgets/stats-grid'
import TabsPanel from '~/widgets/tabs-panel'
import TextWidget from '~/widgets/text-widget'
import Timeline from '~/widgets/timeline'
import ToggleGroup from '~/widgets/toggle-group'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false }),
  SparklineWidget = dynamic(async () => import('~/widgets/sparkline'), { ssr: false }),
  AreaChartWidget = dynamic(async () => import('~/widgets/area-chart'), { ssr: false }),
  LineChartWidget = dynamic(async () => import('~/widgets/line-chart'), { ssr: false }),
  PieChartWidget = dynamic(async () => import('~/widgets/pie-chart'), { ssr: false }),
  RadialChartWidget = dynamic(async () => import('~/widgets/radial-chart'), { ssr: false }),
  RESPONSIVE_BREAKPOINT = 768,
  DEFAULT_COLS = 24,
  COL_OPTIONS = [12, 16, 24] as const,
  ROW_HEIGHT = 50,
  MARGIN_Y = 16,
  MARGIN: readonly [number, number] = [16, MARGIN_Y],
  DRAG_HANDLE_CLASS = 'ogrid-drag-handle',
  IDLE_TIMEOUT = 200,
  MAX_TIMEOUT = 2000,
  FALLBACK_H = 4,
  pxToGridH = (px: number) => Math.ceil((px + 1 + MARGIN_Y) / (ROW_HEIGHT + MARGIN_Y)),
  FILL_ITEMS = new Set(['chart', 'scroll', 'sparkline', 'areachart', 'linechart', 'piechart', 'radialchart']),
  INITIAL_ITEMS = [
    { i: 'chart', w: 12 },
    { i: 'kpi', w: 12 },
    { i: 'areachart', w: 12 },
    { i: 'progress', w: 12 },
    { i: 'table', w: 16 },
    { i: 'stats', w: 8 },
    { i: 'scroll', w: 12 },
    { i: 'timeline', w: 12 },
    { i: 'sparkline', w: 8 },
    { i: 'linechart', w: 8 },
    { i: 'piechart', w: 8 },
    { i: 'text', w: 12 },
    { i: 'layoutswitch', w: 12 },
    { i: 'async', w: 12 },
    { i: 'accordion', w: 12 },
    { i: 'badges', w: 8 },
    { i: 'calendar', w: 8 },
    { i: 'checkbox', w: 8 },
    { i: 'form', w: 12 },
    { i: 'slider', w: 8 },
    { i: 'tabs', w: 12 },
    { i: 'toggles', w: 8 },
    { i: 'avatars', w: 8 },
    { i: 'radialchart', w: 8 },
    { i: 'prose', w: 12 }
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
    areachart: <AreaChartWidget />,
    async: <AsyncTable />,
    avatars: <Avatars />,
    badges: <Badges />,
    calendar: <CalendarWidget />,
    chart: <BarChartWidget />,
    checkbox: <CheckboxWidget />,
    form: <FormWidget />,
    kpi: <KpiCard />,
    layoutswitch: <LayoutSwitchWidget />,
    linechart: <LineChartWidget />,
    piechart: <PieChartWidget />,
    progress: <ProgressBars />,
    prose: <Prose />,
    radialchart: <RadialChartWidget />,
    scroll: <ScrollContent />,
    slider: <SliderWidget />,
    sparkline: <SparklineWidget />,
    stats: <StatsGrid />,
    table: <DataTableWidget />,
    tabs: <TabsPanel />,
    text: <TextWidget />,
    timeline: <Timeline />,
    toggles: <ToggleGroup />
  },
  checkOverlaps = (items: Layout) => {
    for (let a = 0; a < items.length; a += 1)
      for (let b = a + 1; b < items.length; b += 1) {
        const ia = items[a],
          ib = items[b]
        if (ia && ib && ia.x < ib.x + ib.w && ia.x + ia.w > ib.x && ia.y < ib.y + ib.h && ia.y + ia.h > ib.y)
          console.warn(`[ogrid] overlap detected: '${ia.i}' and '${ib.i}'`)
      }
  },
  FREEFORM_COMPACTOR = { ...noCompactor, preventCollision: true },
  COMPACT_COMPACTOR = { ...verticalCompactor, preventCollision: false },
  clampLayoutToCols = (items: Layout, cols: number): Layout =>
    items.map(item => {
      const w = Math.min(item.w, cols),
        x = Math.min(item.x, cols - w)
      return w !== item.w || x !== item.x ? { ...item, w, x } : item
    }),
  computeLayoutWithCols = (items: Layout, cols: number): Layout => {
    const t0 = performance.now(),
      colBottoms = Array.from({ length: cols }, () => 0),
      result: LayoutItem[] = []
    for (const item of items) {
      const w = Math.min(item.w, cols)
      let bestY = Number.POSITIVE_INFINITY,
        bestX = item.x
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
    console.log(`[ogrid:perf] computeLayout ${String(items.length)} items: ${(performance.now() - t0).toFixed(2)}ms`)
    return result
  },
  SKELETON_ITEMS = [
    { h: 200, w: '50%' },
    { h: 120, w: '50%' },
    { h: 120, w: '50%' },
    { h: 200, w: '66%' },
    { h: 120, w: '50%' },
    { h: 200, w: '50%' }
  ],
  Skeleton = () => (
    <div className='grid grid-cols-2 gap-4'>
      {SKELETON_ITEMS.map((s, idx) => (
        <div
          className='animate-pulse rounded-lg bg-muted'
          key={idx}
          style={{ height: s.h, width: s.w }}
        />
      ))}
    </div>
  ),
  Page = () => {
    const [mounted, setMounted] = useState(false),
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
      setLayoutCountRef = useRef(0),
      renderCountRef = useRef(0),
      dragFpsRef = useRef({ frames: 0, start: 0 }),
      [phase, setPhase] = useState<'measuring' | 'done'>('measuring'),
      [compact, setCompact] = useState(false),
      [cols, setCols] = useState(DEFAULT_COLS),
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
      trackSetLayout = useCallback((updater: Layout | ((prev: Layout) => Layout)) => {
        setLayoutCountRef.current += 1
        setLayout(updater)
      }, []),
      computeLayout = useCallback((items: Layout): Layout => computeLayoutWithCols(items, cols), [cols]),
      closeMeasureWindow = useCallback(() => {
        const mw = measureWindowRef.current
        if (mw.phase === 'done') return
        mw.phase = 'done'
        if (mw.idleTimer) clearTimeout(mw.idleTimer)
        if (mw.capTimer) clearTimeout(mw.capTimer)
        mw.idleTimer = null
        mw.capTimer = null
        const elapsed = performance.now() - mw.openedAt
        console.log(`[ogrid:perf] measurement window: ${elapsed.toFixed(0)}ms (setState calls: ${String(setLayoutCountRef.current)})`)
        trackSetLayout(prev => {
          const final = prev.map(item => {
            if (FILL_ITEMS.has(item.i)) return item
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
      }, [cols, trackSetLayout]),
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
        trackSetLayout(prev => {
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
      }, [computeLayout, resetIdleTimer, trackSetLayout])
    renderCountRef.current += 1
    useLayoutEffect(() => setMounted(true), [])
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
      const widthObserver = new ResizeObserver(entries => {
        for (const entry of entries) updateWidth(entry.contentRect.width)
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
          if (compactModeRef.current) return
          const enforced = newLayout.map(item => {
            if (FILL_ITEMS.has(item.i)) return item
            const minH = minHRef.current.get(item.i) ?? item.minH ?? 1,
              h = Math.max(item.h, minH)
            return { ...item, h, minH }
          })
          const result = measureWindowRef.current.phase === 'measuring' ? computeLayout(enforced) : enforced
          checkOverlaps(result)
          freeformLayoutRef.current = result
          setLayout(result)
        },
        [computeLayout]
      ),
      handleDragStart = useCallback(() => {
        dragFpsRef.current = { frames: 0, start: performance.now() }
      }, []),
      handleDrag = useCallback(() => {
        dragFpsRef.current.frames += 1
      }, []),
      handleDragStop = useCallback((_layout: Layout, _oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
        if (newItem) positionedIdsRef.current.add(newItem.i)
        const { frames, start } = dragFpsRef.current,
          elapsed = (performance.now() - start) / 1000
        if (elapsed > 0) console.log(`[ogrid:perf] drag fps: ${(frames / elapsed).toFixed(1)} (${String(frames)} frames in ${(elapsed * 1000).toFixed(0)}ms)`)
      }, []),
      handleResizeStop = useCallback((_layout: Layout, _oldItem: LayoutItem | null, newItem: LayoutItem | null) => {
        if (newItem) resizedIdsRef.current.add(newItem.i)
      }, []),
      handleReset = useCallback(() => {
        positionedIdsRef.current.clear()
        resizedIdsRef.current.clear()
        minHRef.current.clear()
        freeformLayoutRef.current = []
        setLayoutCountRef.current = 0
        renderCountRef.current = 0
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
      handleColsChange = useCallback(
        (newCols: number) => {
          setCols(newCols)
          setLayout(prev => {
            const clamped = clampLayoutToCols(prev, newCols),
              placed = computeLayoutWithCols(clamped, newCols)
            freeformLayoutRef.current = placed
            return placed
          })
        },
        []
      ),
      handleAddItem = useCallback(() => {
        const widgetKey = ADDABLE_WIDGETS[addCountRef.current % ADDABLE_WIDGETS.length]
        addCountRef.current += 1
        const newKey = `${widgetKey}-${String(addCountRef.current)}`
        setItemKeys(prev => [...prev, newKey])
        setLayout(prev => {
          const newItem: LayoutItem = { h: FALLBACK_H, i: newKey, w: Math.min(12, cols), x: 0, y: 0 }
          const placed = computeLayout([...prev, newItem])
          freeformLayoutRef.current = placed
          return placed
        })
      }, [computeLayout, cols]),
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
      }, []),
      isFreeform = phase === 'done' && !compact,
      effectiveLayout = compact ? clampLayoutToCols(freeformLayoutRef.current.length > 0 ? freeformLayoutRef.current : layout, cols) : layout,
      effectiveCompactor = compact ? COMPACT_COMPACTOR : FREEFORM_COMPACTOR
    return (
      <div className='flex flex-col gap-4 p-4'>
        <div className='flex flex-wrap items-center gap-4'>
          <span className='text-sm font-medium'>
            ogrid POC — Phase C ({String(itemKeys.length)} items) {compact && '(compact mode)'}
          </span>
          {phase === 'done' && !compact && (
            <>
              <Button onClick={handleAddItem} size='sm' variant='outline'>
                Add Item
              </Button>
              <Button onClick={handleReset} size='sm' variant='outline'>
                Reset
              </Button>
              <Button
                onClick={() => console.log(`[ogrid:perf] render count: ${String(renderCountRef.current)}, setState count: ${String(setLayoutCountRef.current)}`)}
                size='sm'
                variant='outline'>
                Log Metrics
              </Button>
              <div className='flex items-center gap-1'>
                <span className='text-xs text-muted-foreground'>Cols:</span>
                {COL_OPTIONS.map(c => (
                  <Button
                    key={c}
                    onClick={() => handleColsChange(c)}
                    size='sm'
                    variant={c === cols ? 'default' : 'outline'}>
                    {c}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
        <div ref={containerRef} className='relative'>
          {!mounted && <Skeleton />}
          {mounted && phase === 'measuring' && (
            <div className='absolute inset-0'>
              <Skeleton />
            </div>
          )}
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
                  margin: MARGIN,
                  maxRows: Number.POSITIVE_INFINITY,
                  rowHeight: ROW_HEIGHT
                }}
                layout={effectiveLayout}
                onDrag={handleDrag}
                onDragStart={handleDragStart}
                onDragStop={handleDragStop}
                onLayoutChange={handleLayoutChange}
                onResizeStop={handleResizeStop}
                resizeConfig={{ enabled: isFreeform, handles: ['se'] }}
                style={phase === 'measuring' ? { transition: 'none' } : undefined}
                width={width}>
                {itemKeys.map(key => (
                  <div className='group h-full rounded-lg ring-1 ring-transparent transition-shadow hover:ring-ring' key={key}>
                    <div
                      className={`relative flex flex-col rounded-lg border bg-card p-3 ${phase === 'done' ? 'h-full overflow-auto' : 'min-h-full'} ${ITEM_CLASS[key] ?? ''}`}
                      ref={el => setCardRef(key, el)}>
                      <div className='absolute right-1 top-1 z-10'>
                        <DragHandle />
                      </div>
                      <div className='flex min-h-0 min-w-0 flex-1 flex-col justify-center overflow-hidden'>{getContent(key)}</div>
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
