type LayoutItem = {
  i: string
  w?: number
  h?: number
  x?: number
  y?: number
  minH?: number
  minW?: number
  className?: string
  fill?: boolean
}

type GridLayout = readonly LayoutItem[]

type GridConfig = {
  cols?: number
  gap?: number
  rowHeight?: number
  layout?: GridLayout
}

export type { GridConfig, GridLayout, LayoutItem }
