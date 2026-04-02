/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/* oxlint-disable import/no-unassigned-import, react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-console, no-continue, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @eslint-react/no-unnecessary-use-callback, @typescript-eslint/max-params, @typescript-eslint/no-unused-vars */
'use client'
import type { Layout, LayoutItem, ResizeHandleAxis } from 'react-grid-layout'
import { cn } from '@a/ui'
import { GripVertical } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import 'react-grid-layout/css/styles.css'
import { GridLayout, noCompactor } from 'react-grid-layout'
import DataTableWidget from '~/widgets/data-table'
import KpiCard from '~/widgets/kpi-card'
import ScrollContent from '~/widgets/scroll-content'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false }),
  COLS = 24,
  ROW_HEIGHT = 50,
  MARGIN_Y = 16,
  MARGIN: readonly [number, number] = [16, MARGIN_Y],
  DRAG_HANDLE_CLASS = 'ogrid-drag-handle',
  pxToGridH = (px: number) => Math.ceil((px + 1 + MARGIN_Y) / (ROW_HEIGHT + MARGIN_Y)),
  FILL_ITEMS = new Set(['chart']),
  itemKeys = ['kpi', 'chart', 'table', 'scroll'] as const,
  DragHandle = () => (
    <div
      className={`${DRAG_HANDLE_CLASS} flex cursor-grab items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing`}>
      <GripVertical className='size-4' />
    </div>
  ),
  itemContent: Record<string, React.ReactNode> = {
    chart: <BarChartWidget />,
    kpi: <KpiCard />,
    scroll: <ScrollContent />,
    table: <DataTableWidget />
  },
  Page = () => {
    const containerRef = useRef<HTMLDivElement>(null),
      cardRef = useRef(new Map<string, HTMLDivElement>()),
      minHRef = useRef(new Map<string, number>()),
      rafRef = useRef(0),
      stateCountRef = useRef(0),
      [width, setWidth] = useState(0),
      [layout, setLayout] = useState<Layout>(() =>
        itemKeys.map((key, idx) => ({
          h: FILL_ITEMS.has(key) ? 8 : 1,
          i: key,
          w: 12,
          x: (idx % 2) * 12,
          y: 0
        }))
      ),
      [preventCollision, setPreventCollision] = useState(true),
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
          stateCountRef.current += 1
          console.log(`[measurement] setState #${String(stateCountRef.current)}`)
          return placed
        })
      }, [computeLayout])
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
    // biome-ignore lint/correctness/useExhaustiveDependencies: width triggers re-measurement
    useLayoutEffect(() => {
      if (cardRef.current.size === 0) return
      measureAndUpdate()
    }, [measureAndUpdate, width])
    useLayoutEffect(() => {
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
          console.log(`[observer] ${key}: scrollHeight=${String(el.scrollHeight)}px → minH=${String(gridH)}`)
        }
        if (changed) {
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
            console.log(
              `[constrainSize CALLED] ${_item.i}: w=${String(w)} h=${String(h)}, cardRef has keys: [${[...cardRef.current.keys()].join(', ')}]`
            )
            if (FILL_ITEMS.has(_item.i)) return { h, w }
            const el = cardRef.current.get(_item.i)
            if (!el) {
              console.log(`[constrainSize] ${_item.i}: NO REF FOUND`)
              return { h, w }
            }
            const natural = measureNaturalHeight(el),
              minH = pxToGridH(natural)
            console.log(
              `[constrainSize] ${_item.i}: proposed h=${String(h)}, natural=${String(natural)}px, minH=${String(minH)}, returning h=${String(Math.max(h, minH))}`
            )
            return { h: Math.max(h, minH), w }
          },
          name: 'content-min'
        }),
        [measureNaturalHeight]
      ),
      handleLayoutChange = useCallback(
        (newLayout: Layout) => {
          setLayout(prev => {
            const measured = newLayout.map(item => {
              const minH = minHRef.current.get(item.i) ?? item.minH ?? 1,
                prevItem = prev.find(p => p.i === item.i),
                h = Math.max(item.h, minH, prevItem?.minH ?? 1)
              return { ...item, h, minH }
            })
            return computeLayout(measured)
          })
        },
        [computeLayout]
      ),
      compactor = useMemo(() => ({ ...noCompactor, preventCollision }), [preventCollision]),
      setCardRef = useCallback((key: string, el: HTMLDivElement | null) => {
        if (el) {
          el.dataset.itemKey = key
          cardRef.current.set(key, el)
          console.log(`[ref] SET ${key}, map size=${String(cardRef.current.size)}`)
        } else {
          cardRef.current.delete(key)
          console.log(`[ref] DELETE ${key}, map size=${String(cardRef.current.size)}`)
        }
      }, [])
    return (
      <div className='flex flex-col gap-4 p-4'>
        <div className='flex items-center gap-4'>
          <span className='text-sm font-medium'>ogrid POC — Phase A</span>
          <button className='rounded border px-3 py-1 text-sm' onClick={() => setPreventCollision(p => !p)} type='button'>
            preventCollision: {String(preventCollision)}
          </button>
        </div>
        <div ref={containerRef}>
          {width > 0 && (
            <GridLayout
              compactor={compactor}
              constraints={[contentMinConstraint]}
              dragConfig={{ bounded: false, enabled: true, handle: `.${DRAG_HANDLE_CLASS}`, threshold: 3 }}
              gridConfig={{
                cols: COLS,
                containerPadding: null,
                margin: MARGIN,
                maxRows: Number.POSITIVE_INFINITY,
                rowHeight: ROW_HEIGHT
              }}
              layout={layout}
              onLayoutChange={handleLayoutChange}
              resizeConfig={{ enabled: true, handles: ['se'] }}
              width={width}>
              {itemKeys.map(key => {
                const fill = FILL_ITEMS.has(key)
                return (
                  <div key={key}>
                    <div
                      className={cn(
                        'flex min-h-full flex-col rounded-lg border bg-card p-3',
                        fill ? '' : 'justify-center'
                      )}
                      ref={el => setCardRef(key, el)}>
                      <div className={cn('flex items-start gap-2', fill ? 'min-h-0 flex-1' : 'max-h-full')}>
                        <DragHandle />
                        <div className={cn('min-w-0 flex-1 self-stretch', fill ? 'overflow-hidden' : '')}>
                          {itemContent[key]}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </GridLayout>
          )}
        </div>
      </div>
    )
  }
export default Page
