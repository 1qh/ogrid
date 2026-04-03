import type { Layout } from 'react-grid-layout'

type GridStoreState = {
  cols: number
  compact: boolean
  gap: number
  layout: Layout
  phase: 'done' | 'measuring'
  positionedIds: ReadonlySet<string>
  resizedIds: ReadonlySet<string>
  rowHeight: number
  showRings: boolean
  setCols: (cols: number) => void
  setGap: (gap: number) => void
  setRowHeight: (rowHeight: number) => void
  reset: () => void
  toggleRings: () => void
}

let state: GridStoreState | null = null
const listeners = new Set<() => void>(),
  gridStore = {
    getSnapshot: () => state,
    setState: (next: GridStoreState) => {
      state = next
      for (const listener of listeners) listener()
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
export type { GridStoreState }
export { gridStore }
