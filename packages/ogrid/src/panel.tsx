/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: intentional empty catch */
/** biome-ignore-all lint/nursery/noReactNativeLiteralColors: web project, RN rule false positive on inline gradient */
/* oxlint-disable react-perf/jsx-no-new-object-as-prop, react/jsx-handler-names */
/* eslint-disable @typescript-eslint/strict-void-return, no-empty, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect */
'use client'
import type { ReactNode } from 'react'
import { animate, AnimatePresence, motion, MotionConfig, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from './cn'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
import { gridStore } from './context'

const POSITION_KEY = 'ogrid:panel-position'
const BUBBLE_SIZE = 40
const EDGE_MARGIN = 12
const DISMISS_RADIUS = 80
const FLICK_VELOCITY = 1800
const MAGNET_STRENGTH = 0.35
const SPRING = { damping: 28, mass: 0.8, stiffness: 320, type: 'spring' as const }
const vibrate = (pattern: number | number[]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {}
}
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
const SlidersIcon = ({ className = 'size-[18px]' }: { className?: string }) => (
  <svg
    aria-hidden='true'
    className={className}
    fill='none'
    stroke='currentColor'
    strokeLinecap='round'
    strokeLinejoin='round'
    strokeWidth='2'
    viewBox='0 0 24 24'>
    <line x1='4' x2='4' y1='21' y2='14' />
    <line x1='4' x2='4' y1='10' y2='3' />
    <line x1='12' x2='12' y1='21' y2='12' />
    <line x1='12' x2='12' y1='8' y2='3' />
    <line x1='20' x2='20' y1='21' y2='16' />
    <line x1='20' x2='20' y1='12' y2='3' />
    <line x1='1' x2='7' y1='14' y2='14' />
    <line x1='9' x2='15' y1='8' y2='8' />
    <line x1='17' x2='23' y1='16' y2='16' />
  </svg>
)
const CloseIcon = ({ className = 'size-3.5' }: { className?: string }) => (
  <svg aria-hidden='true' className={className} fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
    <path d='M6 6l12 12M6 18L18 6' strokeLinecap='round' />
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
}) => {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <label className='flex flex-col gap-1.5 px-4 py-2 text-xs text-muted-foreground'>
      <div className='flex items-center justify-between'>
        <span className='font-medium text-foreground'>{label}</span>
        <span className='font-mono tabular-nums'>{String(value)}</span>
      </div>
      <input
        aria-label={label}
        className='h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110'
        max={max}
        min={min}
        onChange={e => onChange(Number(e.target.value))}
        step='1'
        style={{
          background: `linear-gradient(to right, currentColor 0%, currentColor ${String(pct)}%, rgb(0 0 0 / 0.12) ${String(pct)}%, rgb(0 0 0 / 0.12) 100%)`,
          color: 'var(--foreground, #111827)'
        }}
        type='range'
        value={value}
      />
    </label>
  )
}
const computeRestingX = (dock: 'left' | 'right') =>
  dock === 'right' ? globalThis.innerWidth - BUBBLE_SIZE - EDGE_MARGIN : EDGE_MARGIN
const EditControls = ({ state }: { state: NonNullable<ReturnType<typeof gridStore.getSnapshot>> }) => (
  <>
    <Slider label='Columns' max={48} min={1} onChange={state.setCols} value={state.cols} />
    <Slider label='Gap' max={48} min={0} onChange={state.setGap} value={state.gap} />
    <Slider label='Row height' max={120} min={10} onChange={state.setRowHeight} value={state.rowHeight} />
    <div className='mx-2 flex flex-col gap-0.5 border-t border-border px-1 pt-2'>
      <button
        className={cn(
          'flex items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted',
          state.showRings && 'bg-muted font-medium'
        )}
        onClick={() => state.toggleRings()}
        type='button'>
        <span>Cell borders</span>
        <span className='text-xs text-muted-foreground'>{state.showRings ? 'on' : 'off'}</span>
      </button>
      {state.phase === 'done' ? (
        <button
          className='rounded-md px-3 py-2 text-left text-sm hover:bg-muted'
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
        className='rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10'
        onClick={() => state.reset()}
        type='button'>
        Reset layout
      </button>
    </div>
  </>
)
const matchesHotkey = (e: KeyboardEvent, spec: string) => {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map(p => p.trim())
  const key = parts.at(-1) ?? ''
  const mods = new Set(parts.slice(0, -1))
  const wantMod = mods.has('mod') || mods.has('cmd') || mods.has('meta')
  const wantCtrl = mods.has('ctrl') || (mods.has('mod') && !(e.metaKey || e.ctrlKey))
  const wantShift = mods.has('shift')
  const wantAlt = mods.has('alt') || mods.has('option')
  if (wantMod && !(e.metaKey || e.ctrlKey)) return false
  if (wantCtrl && !e.ctrlKey) return false
  if (wantShift !== e.shiftKey) return false
  if (wantAlt !== e.altKey) return false
  return e.key.toLowerCase() === key
}
const Panel = ({
  children,
  hotkey = 'mod+k',
  onToggle,
  trailing
}: {
  children?: ReactNode
  hotkey?: false | string
  onToggle?: () => void
  trailing?: ReactNode
}) => {
  const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
  const editable = state?.editable ?? false
  const [open, setOpen] = useState(false)
  const [dock, setDock] = useState<'left' | 'right'>('right')
  const [dragging, setDragging] = useState(false)
  const [overDismiss, setOverDismiss] = useState(false)
  const [mounted, setMounted] = useState(false)
  const overDismissRef = useRef(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const pointerRef = useRef<null | {
    did: boolean
    id: number
    ox: number
    oy: number
    samples: { t: number; x: number; y: number }[]
    startX: number
    startY: number
  }>(null)
  useEffect(() => {
    setMounted(true)
    const saved = readPosition()
    const initialY = saved?.y ?? globalThis.innerHeight / 2 - BUBBLE_SIZE / 2
    const initialDock: 'left' | 'right' = saved && saved.x + BUBBLE_SIZE / 2 < globalThis.innerWidth / 2 ? 'left' : 'right'
    setDock(initialDock)
    x.set(computeRestingX(initialDock))
    y.set(initialY)
  }, [x, y])
  useEffect(() => {
    if (hotkey === false) return
    const shortcut = (e: KeyboardEvent) => {
      if (matchesHotkey(e, hotkey)) {
        e.preventDefault()
        onToggle?.()
      }
    }
    globalThis.addEventListener('keydown', shortcut)
    return () => globalThis.removeEventListener('keydown', shortcut)
  }, [hotkey, onToggle])
  useEffect(() => {
    if (!open) return
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as Element | null
      if (target?.closest('[data-ogrid-panel]')) return
      setOpen(false)
    }
    globalThis.addEventListener('keydown', keyHandler)
    globalThis.addEventListener('mousedown', clickHandler)
    return () => {
      globalThis.removeEventListener('keydown', keyHandler)
      globalThis.removeEventListener('mousedown', clickHandler)
    }
  }, [open])
  if (!(mounted && editable)) return null
  const popoverTop = Math.max(EDGE_MARGIN, Math.min(globalThis.innerHeight - 280, y.get()))
  const zoneCenter = { x: globalThis.innerWidth / 2, y: globalThis.innerHeight - 70 }
  return (
    <MotionConfig reducedMotion='user'>
      <div className='pointer-events-none fixed inset-0 z-[60]' data-ogrid-panel>
        <AnimatePresence>
          {dragging ? (
            <motion.div
              animate={{ opacity: 1, scale: overDismiss ? 1.3 : 1, y: 0 }}
              className={cn(
                'pointer-events-none fixed bottom-10 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full text-white shadow-lg',
                overDismiss ? 'bg-red-600 shadow-[0_0_32px_rgba(239,68,68,0.55)]' : 'bg-red-500/75'
              )}
              exit={{ opacity: 0, y: 60 }}
              initial={{ opacity: 0, y: 60 }}
              transition={SPRING}>
              <CloseIcon className='size-5' />
            </motion.div>
          ) : null}
        </AnimatePresence>
        <AnimatePresence>
          {open ? (
            <motion.dialog
              animate={{ opacity: 1, scale: 1, y: 0 }}
              aria-label='Grid settings'
              className={cn(
                'pointer-events-auto fixed flex max-h-[min(480px,80vh)] w-72 flex-col overflow-hidden rounded-xl border border-border bg-popover/95 text-popover-foreground shadow-xl backdrop-blur-xl',
                dock === 'right' ? 'origin-top-right' : 'origin-top-left'
              )}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              key='popover'
              open
              style={{ [dock === 'right' ? 'right' : 'left']: EDGE_MARGIN + BUBBLE_SIZE + 10, top: popoverTop }}
              transition={{ damping: 28, mass: 0.7, stiffness: 380, type: 'spring' }}>
              <div className='flex items-center justify-between border-b border-border px-3 py-2'>
                <div className='flex items-baseline gap-2'>
                  <span className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>Grid</span>
                  {state ? (
                    <span className='font-mono text-[10px] tabular-nums text-muted-foreground/60'>
                      {String(state.layout.length)}
                    </span>
                  ) : null}
                </div>
                <div className='flex items-center gap-1'>
                  {trailing ?? null}
                  <button
                    aria-label='Close'
                    className='rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
                    onClick={() => setOpen(false)}
                    type='button'>
                    <CloseIcon />
                  </button>
                </div>
              </div>
              <div className='flex flex-1 flex-col gap-1 overflow-y-auto pt-2 pb-3'>
                {children ? <div className='flex flex-col gap-1 border-b border-border pb-2'>{children}</div> : null}
                {state ? <EditControls state={state} /> : null}
              </div>
            </motion.dialog>
          ) : null}
        </AnimatePresence>
        <motion.button
          animate={{ opacity: 1, scale: dragging ? 1.1 : 1 }}
          aria-expanded={open}
          aria-label='Grid settings'
          className='pointer-events-auto fixed top-0 left-0 flex items-center justify-center rounded-full bg-foreground text-background shadow-md transition-shadow hover:shadow-lg'
          initial={{ opacity: 0, scale: 0.6 }}
          onPointerDown={e => {
            if (e.button !== 0 && e.pointerType === 'mouse') return
            e.currentTarget.setPointerCapture(e.pointerId)
            pointerRef.current = {
              did: false,
              id: e.pointerId,
              ox: e.clientX - x.get(),
              oy: e.clientY - y.get(),
              samples: [{ t: performance.now(), x: x.get(), y: y.get() }],
              startX: e.clientX,
              startY: e.clientY
            }
          }}
          onPointerMove={e => {
            const p = pointerRef.current
            if (p?.id !== e.pointerId) return
            const dist2 = (e.clientX - p.startX) ** 2 + (e.clientY - p.startY) ** 2
            if (!p.did && dist2 > 25) {
              p.did = true
              vibrate(8)
              setDragging(true)
              setOpen(false)
            }
            if (!p.did) return
            const minX = -BUBBLE_SIZE / 2
            const maxX = globalThis.innerWidth - BUBBLE_SIZE / 2
            const minY = EDGE_MARGIN / 2
            const maxY = globalThis.innerHeight - BUBBLE_SIZE - EDGE_MARGIN / 2
            let nx = Math.max(minX, Math.min(maxX, e.clientX - p.ox))
            let ny = Math.max(minY, Math.min(maxY, e.clientY - p.oy))
            const bcx = nx + BUBBLE_SIZE / 2
            const bcy = ny + BUBBLE_SIZE / 2
            const zdx = bcx - zoneCenter.x
            const zdy = bcy - zoneCenter.y
            const zdist2 = zdx * zdx + zdy * zdy
            const inside = zdist2 < DISMISS_RADIUS * DISMISS_RADIUS
            if (inside !== overDismissRef.current) {
              overDismissRef.current = inside
              setOverDismiss(inside)
              if (inside) vibrate(15)
            }
            if (inside) {
              const k = MAGNET_STRENGTH * (1 - Math.sqrt(zdist2) / DISMISS_RADIUS)
              nx += (zoneCenter.x - BUBBLE_SIZE / 2 - nx) * k
              ny += (zoneCenter.y - BUBBLE_SIZE / 2 - ny) * k
            }
            x.set(nx)
            y.set(ny)
            p.samples.push({ t: performance.now(), x: nx, y: ny })
            if (p.samples.length > 5) p.samples.shift()
          }}
          onPointerUp={e => {
            const p = pointerRef.current
            if (p?.id !== e.pointerId) return
            pointerRef.current = null
            try {
              e.currentTarget.releasePointerCapture(e.pointerId)
            } catch {}
            if (!p.did) {
              setOpen(prev => !prev)
              return
            }
            setDragging(false)
            const now = performance.now()
            const fallback = p.samples[0] ?? { t: now, x: x.get(), y: y.get() }
            const first = p.samples.find(s => now - s.t < 80) ?? fallback
            const last = p.samples.at(-1) ?? fallback
            const dt = Math.max(1, last.t - first.t)
            const vx = ((last.x - first.x) / dt) * 1000
            const vy = ((last.y - first.y) / dt) * 1000
            const speed = Math.hypot(vx, vy)
            if (overDismissRef.current || speed > FLICK_VELOCITY) {
              vibrate([20, 40, 30])
              overDismissRef.current = false
              setOverDismiss(false)
              onToggle?.()
              return
            }
            overDismissRef.current = false
            setOverDismiss(false)
            const projectedX = x.get() + vx * 0.15
            const nextDock: 'left' | 'right' = projectedX + BUBBLE_SIZE / 2 < globalThis.innerWidth / 2 ? 'left' : 'right'
            const maxY = globalThis.innerHeight - BUBBLE_SIZE - EDGE_MARGIN
            const targetY = Math.max(EDGE_MARGIN, Math.min(maxY, y.get() + vy * 0.05))
            setDock(nextDock)
            animate(x, computeRestingX(nextDock), { ...SPRING, velocity: vx })
            animate(y, targetY, { ...SPRING, velocity: vy })
            writePosition({ x: computeRestingX(nextDock), y: targetY })
          }}
          style={{ height: BUBBLE_SIZE, touchAction: 'none', width: BUBBLE_SIZE, x, y }}
          transition={SPRING}
          type='button'
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}>
          <SlidersIcon />
        </motion.button>
      </div>
    </MotionConfig>
  )
}
export default Panel
