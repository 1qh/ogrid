/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: intentional empty catch */
/* oxlint-disable jsx-a11y/label-has-associated-control, react-perf/jsx-no-new-object-as-prop, react/jsx-handler-names */
/* eslint-disable @typescript-eslint/strict-void-return, no-empty, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
'use client'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from './cn'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
import { gridStore } from './context'
const POSITION_KEY = 'ogrid:panel-position'
const BUBBLE_SIZE = 48
const EDGE_MARGIN = 16
const generateConfig = (state: NonNullable<ReturnType<typeof gridStore.getSnapshot>>) => {
  const lines: string[] = ['const grid = {']
  if (state.cols !== DEFAULT_COLS) lines.push(`  cols: ${String(state.cols)},`)
  if (state.gap !== DEFAULT_GAP) lines.push(`  gap: ${String(state.gap)},`)
  if (state.rowHeight !== DEFAULT_ROW_HEIGHT) lines.push(`  rowHeight: ${String(state.rowHeight)},`)
  lines.push('  layout: [')
  for (const item of state.layout) {
    const parts: string[] = [`i: "${item.i}"`]
    if (item.x !== 0) parts.push(`x: ${String(item.x)}`)
    if (item.y !== 0) parts.push(`y: ${String(item.y)}`)
    parts.push(`w: ${String(item.w)}`)
    parts.push(`h: ${String(item.h)}`)
    if (item.minH !== undefined && item.minH !== item.h) parts.push(`minH: ${String(item.minH)}`)
    lines.push(`    { ${parts.join(', ')} },`)
  }
  lines.push('  ],')
  lines.push('} satisfies GridConfig')
  return lines.join('\n')
}
const readPosition = (): null | { x: number; y: number } => {
  try {
    const raw = globalThis.localStorage.getItem(POSITION_KEY)
    return raw ? (JSON.parse(raw) as { x: number; y: number }) : null
  } catch {
    return null
  }
}
const writePosition = (pos: { x: number; y: number }) => {
  try {
    globalThis.localStorage.setItem(POSITION_KEY, JSON.stringify(pos))
  } catch {}
}
const GridIcon = () => (
  <svg
    aria-hidden='true'
    className='size-5 text-white'
    fill='none'
    stroke='currentColor'
    strokeLinecap='round'
    strokeLinejoin='round'
    strokeWidth='2'
    viewBox='0 0 24 24'>
    <rect height='7' rx='1' width='7' x='3' y='3' />
    <rect height='7' rx='1' width='7' x='14' y='3' />
    <rect height='7' rx='1' width='7' x='14' y='14' />
    <rect height='7' rx='1' width='7' x='3' y='14' />
  </svg>
)
const Slider = ({
  label,
  max,
  min,
  onChange,
  value
}: {
  label: string
  max: number
  min: number
  onChange: (v: number) => void
  value: number
}) => (
  <label className='flex flex-col gap-1 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300'>
    <div className='flex items-center justify-between'>
      <span>{label}</span>
      <span className='font-mono tabular-nums'>{String(value)}</span>
    </div>
    <input
      className='w-full'
      max={max}
      min={min}
      onChange={e => onChange(Number(e.target.value))}
      step='1'
      type='range'
      value={value}
    />
  </label>
)
const Panel = ({ children, trailing }: { children?: ReactNode; trailing?: ReactNode }) => {
  const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
  const editable = state?.editable ?? false
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<null | { x: number; y: number }>(null)
  const [mounted, setMounted] = useState(false)
  const dragRef = useRef<null | { dx: number; dy: number; moved: boolean; startX: number; startY: number }>(null)
  useEffect(() => {
    setMounted(true)
    const saved = readPosition()
    if (saved) setPosition(saved)
    else
      setPosition({
        x: globalThis.innerWidth - BUBBLE_SIZE - EDGE_MARGIN,
        y: globalThis.innerHeight / 2 - BUBBLE_SIZE / 2
      })
  }, [])
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (target?.closest('[data-ogrid-panel]')) return
      setOpen(false)
    }
    globalThis.addEventListener('mousedown', handler)
    return () => globalThis.removeEventListener('mousedown', handler)
  }, [open])
  if (!((editable || children || trailing) && mounted && position)) return null
  const onBubbleDown = (e: React.PointerEvent) => {
    dragRef.current = {
      dx: e.clientX - position.x,
      dy: e.clientY - position.y,
      moved: false,
      startX: e.clientX,
      startY: e.clientY
    }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onBubbleMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const distSq = (e.clientX - dragRef.current.startX) ** 2 + (e.clientY - dragRef.current.startY) ** 2
    if (distSq > 16) dragRef.current.moved = true
    if (!dragRef.current.moved) return
    const maxX = globalThis.innerWidth - BUBBLE_SIZE - EDGE_MARGIN
    const maxY = globalThis.innerHeight - BUBBLE_SIZE - EDGE_MARGIN
    const x = Math.max(EDGE_MARGIN, Math.min(maxX, e.clientX - dragRef.current.dx))
    const y = Math.max(EDGE_MARGIN, Math.min(maxY, e.clientY - dragRef.current.dy))
    setPosition({ x, y })
  }
  const onBubbleUp = (e: React.PointerEvent) => {
    const d = dragRef.current
    dragRef.current = null
    ;(e.target as Element).releasePointerCapture(e.pointerId)
    if (!d) return
    if (d.moved) {
      const midX = globalThis.innerWidth / 2
      const snappedX =
        position.x + BUBBLE_SIZE / 2 < midX ? EDGE_MARGIN : globalThis.innerWidth - BUBBLE_SIZE - EDGE_MARGIN
      const snapped = { x: snappedX, y: position.y }
      setPosition(snapped)
      writePosition(snapped)
    } else setOpen(prev => !prev)
  }
  const rightAligned = position.x + BUBBLE_SIZE / 2 > globalThis.innerWidth / 2
  const menuStyle = rightAligned
    ? { right: globalThis.innerWidth - position.x, top: position.y }
    : { left: position.x + BUBBLE_SIZE + 8, top: position.y }
  return (
    <div className='pointer-events-none fixed inset-0 z-50' data-ogrid-panel>
      <button
        className='pointer-events-auto fixed flex items-center justify-center rounded-full bg-gray-900 shadow-lg transition-transform hover:scale-105 active:scale-95 dark:bg-gray-100'
        onPointerDown={onBubbleDown}
        onPointerMove={onBubbleMove}
        onPointerUp={onBubbleUp}
        style={{ height: BUBBLE_SIZE, left: position.x, top: position.y, touchAction: 'none', width: BUBBLE_SIZE }}
        type='button'>
        <GridIcon />
      </button>
      {open ? (
        <div
          className='pointer-events-auto fixed flex w-56 flex-col gap-1 rounded-lg border border-border bg-background py-2 shadow-2xl'
          style={menuStyle}>
          {children ? <div className='flex flex-col gap-1 border-b border-border pb-2'>{children}</div> : null}
          {editable && state ? (
            <>
              <Slider label='Cols' max={48} min={1} onChange={state.setCols} value={state.cols} />
              <Slider label='Gap' max={48} min={0} onChange={state.setGap} value={state.gap} />
              <Slider label='Row' max={120} min={10} onChange={state.setRowHeight} value={state.rowHeight} />
              <div className='flex flex-col gap-0.5 border-t border-border px-1 pt-2'>
                <button
                  className={cn(
                    'flex items-center justify-between rounded px-2 py-1 text-left text-xs hover:bg-muted',
                    state.showRings && 'bg-muted font-medium'
                  )}
                  onClick={() => state.toggleRings()}
                  type='button'>
                  <span>Cell borders</span>
                  <span>{state.showRings ? 'on' : 'off'}</span>
                </button>
                {state.phase === 'done' ? (
                  <button
                    className='rounded px-2 py-1 text-left text-xs hover:bg-muted'
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(generateConfig(state))
                      } catch {}
                    }}
                    type='button'>
                    Copy config
                  </button>
                ) : null}
                <button
                  className='rounded px-2 py-1 text-left text-xs hover:bg-muted'
                  onClick={() => state.reset()}
                  type='button'>
                  Reset layout
                </button>
              </div>
              <div className='border-t border-border px-3 pt-2 text-xs text-muted-foreground'>
                {String(state.layout.length)} items
              </div>
            </>
          ) : null}
          {trailing ? <div className='border-t border-border pt-2'>{trailing}</div> : null}
        </div>
      ) : null}
    </div>
  )
}
export default Panel
