/* oxlint-disable import/no-unassigned-import, react-perf/jsx-no-new-object-as-prop, react-perf/jsx-no-new-array-as-prop */
/* eslint-disable no-console, @typescript-eslint/max-params, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, @typescript-eslint/no-unused-vars */
'use client'
import type { Layout, LayoutItem, ResizeHandleAxis } from 'react-grid-layout'
import { cn } from '@a/ui'
import { GripVertical } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import 'react-grid-layout/css/styles.css'
import { GridLayout, noCompactor } from 'react-grid-layout'
import DataTableWidget from '~/widgets/data-table'
import ScrollContent from '~/widgets/scroll-content'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false }),
  KpiCard = dynamic(async () => import('~/widgets/kpi-card'), { ssr: false }),
  COLS = 4,
  ROW_HEIGHT = 30,
  MARGIN: readonly [number, number] = [16, 16],
  DRAG_HANDLE_CLASS = 'ogrid-drag-handle',
  initialLayout: Layout = [
    { h: 8, i: 'kpi', w: 2, x: 0, y: 0 },
    { h: 8, i: 'chart', w: 2, x: 2, y: 0 },
    { h: 12, i: 'table', w: 3, x: 0, y: 8 },
    { h: 8, i: 'scroll', w: 1, x: 3, y: 8 }
  ],
  hardcodedMinH: Record<string, number> = {
    kpi: 7,
    scroll: 4,
    table: 12
  },
  contentMinConstraint = {
    constrainSize: (_item: LayoutItem, w: number, h: number, _handle: ResizeHandleAxis) => {
      const minH = hardcodedMinH[_item.i]
      if (minH) {
        const clamped = Math.max(h, minH)
        console.log(
          `[constrainSize] ${_item.i}: proposed h=${String(h)}, min=${String(minH)}, returned h=${String(clamped)}`
        )
        return { h: clamped, w }
      }
      console.log(`[constrainSize] ${_item.i}: proposed w=${String(w)} h=${String(h)} (unclamped)`)
      return { h, w }
    },
    name: 'content-min'
  },
  DragHandle = () => (
    <div
      className={`${DRAG_HANDLE_CLASS} flex cursor-grab items-center justify-center rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing`}>
      <GripVertical className='size-4' />
    </div>
  ),
  items: Record<string, { content: React.ReactNode; fill?: boolean; label: string }> = {
    chart: { content: <BarChartWidget />, fill: true, label: 'Bar Chart' },
    kpi: { content: <KpiCard />, label: 'KPI Card' },
    scroll: { content: <ScrollContent />, label: 'Scroll Area' },
    table: { content: <DataTableWidget />, label: 'Data Table' }
  },
  Page = () => {
    const containerRef = useRef<HTMLDivElement>(null),
      [width, setWidth] = useState(0),
      [layout, setLayout] = useState(initialLayout),
      [preventCollision, setPreventCollision] = useState(true)
    useLayoutEffect(() => {
      const el = containerRef.current
      if (!el) return
      setWidth(el.getBoundingClientRect().width)
      const observer = new ResizeObserver(entries => {
        for (const entry of entries) setWidth(entry.contentRect.width)
      })
      observer.observe(el)
      return () => observer.disconnect()
    }, [])
    const handleLayoutChange = useCallback((newLayout: Layout) => {
        setLayout(newLayout)
      }, []),
      compactor = useMemo(() => ({ ...noCompactor, preventCollision }), [preventCollision])
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
              {Object.entries(items).map(([key, { content, fill }]) => (
                <div
                  className={cn('flex h-full flex-col rounded-lg border bg-card p-3', fill ? '' : 'justify-center')}
                  key={key}>
                  <div className={cn('flex items-start gap-2', fill ? 'min-h-0 flex-1' : 'max-h-full')}>
                    <DragHandle />
                    <div className={cn('min-w-0 flex-1 self-stretch', fill ? 'overflow-hidden' : 'overflow-y-auto')}>
                      {content}
                    </div>
                  </div>
                </div>
              ))}
            </GridLayout>
          )}
        </div>
      </div>
    )
  }
export default Page
