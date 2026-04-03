import type { Layout } from 'react-grid-layout'
interface GridStoreState {
  cols: number
  compact: boolean
  gap: number
  layout: Layout
  phase: 'done' | 'measuring'
  positionedIds: ReadonlySet<string>
  reset: () => void
  resizedIds: ReadonlySet<string>
  rowHeight: number
  setCols: (cols: number) => void
  setGap: (gap: number) => void
  setRowHeight: (rowHeight: number) => void
  showRings: boolean
  toggleRings: () => void
}
let state: GridStoreState | null = null
const listeners = new Set<() => void>()
const gridStore = {
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
