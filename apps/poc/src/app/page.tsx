/** biome-ignore-all lint/nursery/noContinue: loop control flow */
/* oxlint-disable import/no-unassigned-import, react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-console, no-continue, @typescript-eslint/max-params, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @typescript-eslint/no-unused-vars */
'use client'
import type { Layout, LayoutItem, ResizeHandleAxis } from 'react-grid-layout'
import { cn } from '@a/ui'
import { GripVertical } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import 'react-grid-layout/css/styles.css'
import { GridLayout, noCompactor } from 'react-grid-layout'
import DataTableWidget from '~/widgets/data-table'
import ScrollContent from '~/widgets/scroll-content'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false }),
  KpiCard = dynamic(async () => import('~/widgets/kpi-card'), { ssr: false }),
  COLS = 4,
  ROW_HEIGHT = 30,
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
      rafRef = useRef(0),
      stateCountRef = useRef(0),
      callbackCountRef = useRef(new Map<string, number>()),
      [width, setWidth] = useState(0),
      [layout, setLayout] = useState<Layout>(() =>
        itemKeys.map((key, idx) => ({
          h: 1,
          i: key,
          w: 2,
          x: (idx % 2) * 2,
          y: Math.floor(idx / 2)
        }))
      ),
      [preventCollision, setPreventCollision] = useState(true)
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
    const flushMeasurements = useCallback(() => {
      setLayout(prev => {
        const next: LayoutItem[] = []
        let layoutChanged = false
        for (const item of prev) {
          if (FILL_ITEMS.has(item.i)) {
            next.push(item)
            continue
          }
          const el = cardRef.current.get(item.i)
          if (!el) {
            next.push(item)
            continue
          }
          const gridH = pxToGridH(el.scrollHeight)
          if (gridH === item.h) {
            next.push(item)
            continue
          }
          layoutChanged = true
          next.push({ ...item, h: gridH })
        }
        if (!layoutChanged) return prev
        stateCountRef.current += 1
        console.log(`[measurement] setState #${String(stateCountRef.current)}`)
        return next
      })
    }, [])
    useEffect(() => {
      flushMeasurements()
    }, [flushMeasurements])
    useLayoutEffect(() => {
      const observer = new ResizeObserver(entries => {
        let changed = false
        for (const entry of entries) {
          const el = entry.target
          if (!(el instanceof HTMLDivElement)) continue
          const key = el.dataset.itemKey
          if (!key || FILL_ITEMS.has(key)) continue
          const prev = callbackCountRef.current.get(key) ?? 0
          callbackCountRef.current.set(key, prev + 1)
          changed = true
          console.log(
            `[observer] ${key}: scrollHeight=${String(el.scrollHeight)}px → h=${String(pxToGridH(el.scrollHeight))} (callback #${String(callbackCountRef.current.get(key))})`
          )
        }
        if (changed) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(flushMeasurements)
        }
      })
      for (const el of cardRef.current.values()) observer.observe(el)
      return () => observer.disconnect()
    }, [flushMeasurements])
    const contentMinConstraint = useMemo(
        () => ({
          constrainSize: (_item: LayoutItem, w: number, h: number, _handle: ResizeHandleAxis) => {
            if (FILL_ITEMS.has(_item.i)) return { h, w }
            const el = cardRef.current.get(_item.i)
            if (!el) return { h, w }
            const naturalH = el.scrollHeight,
              minH = pxToGridH(naturalH),
              clamped = Math.max(h, minH)
            console.log(
              `[constrainSize] ${_item.i}: proposed h=${String(h)}, scrollHeight=${String(naturalH)}px → minH=${String(minH)}, returned h=${String(clamped)}`
            )
            return { h: clamped, w }
          },
          name: 'content-min'
        }),
        []
      ),
      handleLayoutChange = useCallback((newLayout: Layout) => {
        setLayout(newLayout)
      }, []),
      compactor = useMemo(() => ({ ...noCompactor, preventCollision }), [preventCollision]),
      setCardRef = useCallback((key: string, el: HTMLDivElement | null) => {
        if (el) {
          el.dataset.itemKey = key
          cardRef.current.set(key, el)
        } else cardRef.current.delete(key)
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
                  <div
                    className={cn('flex h-full flex-col rounded-lg border bg-card p-3', fill ? '' : 'justify-center')}
                    key={key}
                    ref={el => setCardRef(key, el)}>
                    <div className={cn('flex items-start gap-2', fill ? 'min-h-0 flex-1' : 'max-h-full')}>
                      <DragHandle />
                      <div className={cn('min-w-0 flex-1 self-stretch', fill ? 'overflow-hidden' : '')}>
                        {itemContent[key]}
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
