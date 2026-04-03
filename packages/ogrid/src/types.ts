interface GridConfig {
  cols?: number
  gap?: number
  layout?: GridLayout
  rowHeight?: number
}
type GridLayout = readonly LayoutItem[]
interface LayoutItem {
  className?: string
  fill?: boolean
  h?: number
  i: string
  minH?: number
  minW?: number
  w?: number
  x?: number
  y?: number
}
export type { GridConfig, GridLayout, LayoutItem }
