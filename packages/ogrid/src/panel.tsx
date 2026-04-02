'use client'
import { useSyncExternalStore } from 'react'
import { COL_OPTIONS, DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
import { gridStore } from './context'

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
  },
  Panel = () => {
    const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
    if (!state) return null
    return (
      <div className='flex flex-wrap items-center gap-3 rounded-lg border bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur dark:bg-gray-900/80'>
        <span className='font-medium'>ogrid</span>
        <span className='text-gray-500'>{String(state.layout.length)} items</span>
        <div className='flex items-center gap-1'>
          <span className='text-xs text-gray-500'>Cols:</span>
          {COL_OPTIONS.map(c => (
            <button
              className={`rounded px-2 py-0.5 text-xs ${c === state.cols ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'border hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              key={c}
              onClick={() => state.setCols(c)}
              type='button'>
              {c}
            </button>
          ))}
        </div>
        <label className='flex items-center gap-1 text-xs text-gray-500'>
          Gap: {String(state.gap)}
          <input
            className='w-16'
            max='32'
            min='0'
            onChange={e => state.setGap(Number(e.target.value))}
            step='4'
            type='range'
            value={state.gap}
          />
        </label>
        <label className='flex items-center gap-1 text-xs text-gray-500'>
          Row: {String(state.rowHeight)}
          <input
            className='w-16'
            max='100'
            min='20'
            onChange={e => state.setRowHeight(Number(e.target.value))}
            step='10'
            type='range'
            value={state.rowHeight}
          />
        </label>
        {state.phase === 'done' && (
          <>
            <button
              className='rounded border px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800'
              onClick={() => {
                const code = generateConfig(state)
                navigator.clipboard.writeText(code).catch(() => {})
              }}
              type='button'>
              Copy
            </button>
            <button
              className='rounded border px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800'
              onClick={state.reset}
              type='button'>
              Reset
            </button>
          </>
        )}
      </div>
    )
  }
export default Panel
