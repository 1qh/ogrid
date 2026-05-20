import type { Layout, LayoutItem as RGLLayoutItem } from 'react-grid-layout'

interface BuildLayoutArgs {
  cols: number
  configMap: ReadonlyMap<string, ConfigEntry>
  fillSet: ReadonlySet<string>
  itemKeys: readonly string[]
}
interface ConfigEntry {
  h?: number
  minH?: number
  minW?: number
  w?: number
  x?: number
  y?: number
}
const buildLayout = ({ cols, configMap, fillSet, itemKeys }: BuildLayoutArgs): Layout => {
  const result: RGLLayoutItem[] = []
  for (const key of itemKeys) {
    const c = configMap.get(key)
    result.push({
      h: c?.h ?? (fillSet.has(key) ? 8 : 1),
      i: key,
      minH: c?.minH,
      minW: c?.minW,
      w: c?.w ?? cols,
      x: c?.x ?? 0,
      y: c?.y ?? 0
    })
  }
  return result
}
export type { ConfigEntry }
export { buildLayout }
