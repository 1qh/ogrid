'use client'
import { useSyncExternalStore } from 'react'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
import { gridStore } from './context'
const darkSubscribe = (cb: () => void) => {
  const observer = new MutationObserver(cb)
  observer.observe(document.documentElement, { attributeFilter: ['class'], attributes: true })
  return () => observer.disconnect()
}
const getDark = () => document.documentElement.classList.contains('dark')
const toggleDark = () => document.documentElement.classList.toggle('dark')
const generateConfig = (state: NonNullable<ReturnType<typeof gridStore.getSnapshot>>) => {
  const lines: string[] = []
  lines.push('const grid = {')
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
const Panel = () => {
  const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
  const dark = useSyncExternalStore(darkSubscribe, getDark, () => false)
  if (!state) return null
  return (
    <div className='flex flex-wrap items-center gap-3 px-3 py-2 text-sm'>
      <label className='flex items-center gap-1 text-xs text-gray-500'>
        Cols {String(state.cols)}
        <input
          className='w-20'
          max='48'
          min='1'
          onChange={e => state.setCols(Number(e.target.value))}
          step='1'
          type='range'
          value={state.cols}
        />
      </label>
      <label className='flex items-center gap-1 text-xs text-gray-500'>
        Gap {String(state.gap)}
        <input
          className='w-20'
          max='48'
          min='0'
          onChange={e => state.setGap(Number(e.target.value))}
          step='1'
          type='range'
          value={state.gap}
        />
      </label>
      <label className='flex items-center gap-1 text-xs text-gray-500'>
        Row {String(state.rowHeight)}
        <input
          className='w-20'
          max='120'
          min='10'
          onChange={e => state.setRowHeight(Number(e.target.value))}
          step='1'
          type='range'
          value={state.rowHeight}
        />
      </label>
      <button
        className={`px-2 py-0.5 text-xs ${state.showRings ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'border hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        onClick={state.toggleRings}
        type='button'>
        Rings
      </button>
      {state.phase === 'done' && (
        <>
          <button
            className='px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800'
            onClick={() => {
              const code = generateConfig(state)
              navigator.clipboard.writeText(code).catch(() => {})
            }}
            type='button'>
            Copy
          </button>
          <button
            className='px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800'
            onClick={state.reset}
            type='button'>
            Reset
          </button>
        </>
      )}
      <p className='grow' />
      <span className='text-gray-500'>{String(state.layout.length)} items</span>
      <button onClick={toggleDark} type='button'>
        {dark ? '☀️' : '🌙'}
      </button>
    </div>
  )
}
export default Panel
