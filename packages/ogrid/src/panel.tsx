/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: intentional empty catch */
/* oxlint-disable jsx-a11y/label-has-associated-control, react-perf/jsx-no-new-object-as-prop, react/jsx-handler-names */
/* eslint-disable @typescript-eslint/strict-void-return, no-empty, @eslint-react/hooks-extra/no-direct-set-state-in-use-effect, complexity */
/* oxlint-disable eslint/complexity */
'use client'
import type { ReactNode } from 'react'
import { animate, AnimatePresence, motion, useMotionValue } from 'motion/react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { cn } from './cn'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
import { gridStore } from './context'
const POSITION_KEY = 'ogrid:panel-position'
const HIDDEN_KEY = 'ogrid:panel-hidden'
const BUBBLE_SIZE = 56
const EDGE_MARGIN = 16
const TUCK_RATIO = 0.18
const TUCK_DELAY = 2800
const DISMISS_RADIUS = 90
const FLICK_VELOCITY = 1800
const MAGNET_STRENGTH = 0.35
const BUBBLE_LAYOUT_ID = 'ogrid-bubble'
const SPRING = { damping: 28, mass: 0.8, stiffness: 320, type: 'spring' as const }
const DRAWER_SPRING = { damping: 30, mass: 0.85, stiffness: 360, type: 'spring' as const }
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
const readHidden = () => {
  try {
    return globalThis.localStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}
const writeHidden = (v: boolean) => {
  try {
    if (v) globalThis.localStorage.setItem(HIDDEN_KEY, '1')
    else globalThis.localStorage.removeItem(HIDDEN_KEY)
  } catch {}
}
const GridIcon = ({ className = 'size-6 text-white' }: { className?: string }) => (
  <svg
    aria-hidden='true'
    className={className}
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
const CloseIcon = ({ className = 'size-4' }: { className?: string }) => (
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
}) => (
  <label className='flex flex-col gap-1.5 px-4 py-2 text-xs text-gray-600 dark:text-gray-300'>
    <div className='flex items-center justify-between'>
      <span className='font-medium'>{label}</span>
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
const clampElastic = (v: number, lo: number, hi: number) => {
  if (v < lo) return lo - (lo - v) * 0.25
  if (v > hi) return hi + (v - hi) * 0.25
  return v
}
const computeRestingX = (dock: 'left' | 'right', reveal: boolean) => {
  if (dock === 'left') return reveal ? EDGE_MARGIN : -BUBBLE_SIZE * TUCK_RATIO
  return reveal
    ? globalThis.innerWidth - BUBBLE_SIZE - EDGE_MARGIN
    : globalThis.innerWidth - BUBBLE_SIZE * (1 - TUCK_RATIO)
}
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
    <div className='mt-auto border-t border-border px-4 py-3 text-xs text-muted-foreground'>
      {String(state.layout.length)} items · {String(state.cols)} cols
    </div>
  </>
)
const Panel = ({ children, trailing }: { children?: ReactNode; trailing?: ReactNode }) => {
  const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
  const editable = state?.editable ?? false
  const [open, setOpen] = useState(false)
  const [dock, setDock] = useState<'left' | 'right'>('right')
  const [hover, setHover] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [overDismiss, setOverDismiss] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const prevEditableRef = useRef(false)
  const prevOverDismissRef = useRef(false)
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
    setHidden(readHidden())
    x.set(computeRestingX(initialDock, true))
    y.set(initialY)
  }, [x, y])
  useEffect(() => {
    if (!prevEditableRef.current && editable && hidden) {
      setHidden(false)
      setDismissing(false)
      writeHidden(false)
    }
    prevEditableRef.current = editable
  }, [editable, hidden])
  useEffect(() => {
    if (overDismiss && !prevOverDismissRef.current) vibrate(15)
    prevOverDismissRef.current = overDismiss
  }, [overDismiss])
  useEffect(() => {
    if (dragging || hover || open) {
      setTucked(false)
      return
    }
    const t = setTimeout(() => setTucked(true), TUCK_DELAY)
    return () => clearTimeout(t)
  }, [dragging, hover, open])
  useEffect(() => {
    if (dragging || open) return
    const reveal = !tucked || hover
    animate(x, computeRestingX(dock, reveal), SPRING)
  }, [dock, hover, open, dragging, tucked, x])
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
  if (!((editable || children || trailing) && mounted) || hidden) return null
  const zoneCenter = { x: globalThis.innerWidth / 2, y: globalThis.innerHeight - 90 }
  const liftedShadow = '0 24px 48px rgba(0,0,0,0.4), 0 10px 20px rgba(0,0,0,0.25)'
  const restShadow =
    dock === 'right'
      ? '-4px 6px 18px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.12)'
      : '4px 6px 18px rgba(0,0,0,0.22), 0 2px 4px rgba(0,0,0,0.12)'
  const triggerDismiss = () => {
    vibrate([20, 40, 30])
    setOverDismiss(false)
    setDismissing(true)
    setOpen(false)
    setTimeout(() => {
      setHidden(true)
      writeHidden(true)
      setDismissing(false)
    }, 380)
  }
  return (
    <div className='pointer-events-none fixed inset-0 z-[60]' data-ogrid-panel>
      <AnimatePresence>
        {open ? (
          <motion.div
            animate={{ opacity: 1 }}
            className='pointer-events-none fixed inset-0 bg-gradient-to-l from-black/25 to-transparent'
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            style={{
              backgroundImage: dock === 'left' ? 'linear-gradient(to right, rgba(0,0,0,0.25), transparent)' : undefined
            }}
            transition={{ duration: 0.25 }}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {dragging ? (
          <motion.div
            animate={{ opacity: 1, scale: overDismiss ? 1.4 : 1, y: 0 }}
            className={cn(
              'pointer-events-none fixed bottom-14 left-1/2 flex size-[72px] -translate-x-1/2 items-center justify-center rounded-full text-white transition-colors',
              overDismiss ? 'bg-red-600 shadow-[0_0_40px_rgba(239,68,68,0.6)]' : 'bg-red-500/75 shadow-lg'
            )}
            exit={{ opacity: 0, y: 80 }}
            initial={{ opacity: 0, y: 80 }}
            transition={SPRING}>
            <motion.div animate={{ rotate: overDismiss ? 90 : 0 }} transition={SPRING}>
              <CloseIcon className='size-7' />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <AnimatePresence mode='popLayout'>
        {open ? (
          <motion.div
            animate={{ x: 0 }}
            className={cn(
              'pointer-events-auto fixed top-0 bottom-0 flex w-[340px] flex-col bg-background shadow-2xl',
              dock === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              'border-border'
            )}
            exit={{ x: dock === 'right' ? '100%' : '-100%' }}
            initial={{ x: dock === 'right' ? '100%' : '-100%' }}
            key='drawer'
            transition={DRAWER_SPRING}>
            <div className='flex items-center justify-between border-b border-border px-4 py-3'>
              <div className='flex items-center gap-2'>
                <motion.button
                  className='flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-800 to-gray-950 dark:from-gray-100 dark:to-gray-300'
                  layoutId={BUBBLE_LAYOUT_ID}
                  onClick={() => setOpen(false)}
                  transition={DRAWER_SPRING}
                  type='button'
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}>
                  <GridIcon className='size-[18px] text-white dark:text-gray-900' />
                </motion.button>
                <span className='text-sm font-semibold'>Grid</span>
              </div>
              <button
                aria-label='Close'
                className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                onClick={() => setOpen(false)}
                type='button'>
                <CloseIcon />
              </button>
            </div>
            <div className='flex flex-1 flex-col gap-1 overflow-y-auto py-3'>
              {children ? <div className='flex flex-col gap-1 border-b border-border pb-3'>{children}</div> : null}
              {editable && state ? <EditControls state={state} /> : null}
              {trailing ? <div className='border-t border-border pt-3'>{trailing}</div> : null}
            </div>
          </motion.div>
        ) : (
          <motion.button
            animate={{ opacity: 1, rotate: 0, scale: dragging ? 1.18 : 1 }}
            className='pointer-events-auto fixed top-0 left-0 flex items-center justify-center rounded-full bg-gradient-to-br from-gray-800 to-gray-950 dark:from-gray-100 dark:to-gray-300'
            exit={
              dismissing
                ? { opacity: 0, rotate: 180, scale: 0, transition: { duration: 0.38, ease: 'easeIn' } }
                : { opacity: 0, scale: 0.5 }
            }
            initial={{ opacity: 0, scale: 0.5 }}
            key='bubble'
            layoutId={dismissing ? undefined : BUBBLE_LAYOUT_ID}
            onHoverEnd={() => setHover(false)}
            onHoverStart={() => setHover(true)}
            onPointerDown={e => {
              if (e.button !== 0 && e.pointerType === 'mouse') return
              const el = e.currentTarget
              el.setPointerCapture(e.pointerId)
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
              const rawX = e.clientX - p.ox
              const rawY = e.clientY - p.oy
              const minX = -BUBBLE_SIZE / 2
              const maxX = globalThis.innerWidth - BUBBLE_SIZE / 2
              const minY = EDGE_MARGIN / 2
              const maxY = globalThis.innerHeight - BUBBLE_SIZE - EDGE_MARGIN / 2
              let nx = clampElastic(rawX, minX, maxX)
              let ny = clampElastic(rawY, minY, maxY)
              const bcx = nx + BUBBLE_SIZE / 2
              const bcy = ny + BUBBLE_SIZE / 2
              const zdx = bcx - zoneCenter.x
              const zdy = bcy - zoneCenter.y
              const zdist2 = zdx * zdx + zdy * zdy
              const inside = zdist2 < DISMISS_RADIUS * DISMISS_RADIUS
              setOverDismiss(inside)
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
              if (overDismiss || speed > FLICK_VELOCITY) {
                triggerDismiss()
                return
              }
              setOverDismiss(false)
              const projectedX = x.get() + vx * 0.15
              const nextDock: 'left' | 'right' =
                projectedX + BUBBLE_SIZE / 2 < globalThis.innerWidth / 2 ? 'left' : 'right'
              const maxY = globalThis.innerHeight - BUBBLE_SIZE - EDGE_MARGIN
              const targetY = Math.max(EDGE_MARGIN, Math.min(maxY, y.get() + vy * 0.05))
              setDock(nextDock)
              animate(x, computeRestingX(nextDock, true), { ...SPRING, velocity: vx })
              animate(y, targetY, { ...SPRING, velocity: vy })
              writePosition({ x: computeRestingX(nextDock, true), y: targetY })
            }}
            style={{
              boxShadow: dragging ? liftedShadow : restShadow,
              height: BUBBLE_SIZE,
              touchAction: 'none',
              width: BUBBLE_SIZE,
              x,
              y
            }}
            transition={SPRING}
            type='button'
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: dragging ? 1.18 : 0.92 }}>
            <GridIcon />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
export default Panel
