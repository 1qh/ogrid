'use client'
import type { Layout } from 'react-grid-layout'
import { useSyncExternalStore } from 'react'
import type { GridConfig, LayoutItem } from './types'
import { DEFAULT_COLS, DEFAULT_GAP, DEFAULT_ROW_HEIGHT } from './constants'
import { gridStore } from './context'
interface ToGridConfigArgs {
  cols: number
  fillSet?: ReadonlySet<string>
  gap: number
  layout: Layout
  rowHeight: number
}
const toGridConfig = ({ cols, fillSet, gap, layout, rowHeight }: ToGridConfigArgs): GridConfig => {
  const cfg: GridConfig = {}
  if (cols !== DEFAULT_COLS) cfg.cols = cols
  if (gap !== DEFAULT_GAP) cfg.gap = gap
  if (rowHeight !== DEFAULT_ROW_HEIGHT) cfg.rowHeight = rowHeight
  const items: LayoutItem[] = []
  for (const item of layout) {
    const li: LayoutItem = { i: item.i, w: item.w }
    if (item.x !== 0) li.x = item.x
    if (item.y !== 0) li.y = item.y
    if (item.h !== 1) li.h = item.h
    if (item.minH !== undefined && item.minH !== item.h) li.minH = item.minH
    if (fillSet?.has(item.i)) li.fill = true
    items.push(li)
  }
  cfg.layout = items
  return cfg
}
const useGridConfig = (): GridConfig | null => {
  const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
  if (state?.phase !== 'done') return null
  return toGridConfig({ cols: state.cols, gap: state.gap, layout: state.layout, rowHeight: state.rowHeight })
}
const useGridReset = (): (() => void) | null => {
  const state = useSyncExternalStore(gridStore.subscribe, gridStore.getSnapshot, () => null)
  return state?.reset ?? null
}
export { toGridConfig, useGridConfig, useGridReset }
