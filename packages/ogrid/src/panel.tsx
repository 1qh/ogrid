'use client'
import { useSyncExternalStore } from 'react'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
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
    const handleCopy = () => {
      const code = generateConfig(state)
      navigator.clipboard.writeText(code).catch(() => {})
    }
    return (
      <div className='flex flex-wrap items-center gap-3 rounded-lg border bg-white/80 px-3 py-2 text-sm shadow-sm backdrop-blur dark:bg-gray-900/80'>
        <span className='font-medium'>ogrid</span>
        <span className='text-gray-500'>{String(state.layout.length)} items</span>
        {state.phase === 'done' && (
          <button
            className='rounded border px-2 py-0.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-800'
            onClick={handleCopy}
            type='button'>
            Copy
          </button>
        )}
      </div>
    )
  }
export default Panel
