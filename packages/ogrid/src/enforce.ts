import type { Layout } from 'react-grid-layout'
interface EnforceArgs {
  fillSet: ReadonlySet<string>
  layout: Layout
  minHByKey: ReadonlyMap<string, number>
  phase: 'done' | 'measuring'
}
const enforceMinH = ({ fillSet, layout, minHByKey, phase }: EnforceArgs): Layout => {
  if (phase === 'done') return layout
  return layout.map(item => {
    if (fillSet.has(item.i)) return item
    const minH = minHByKey.get(item.i) ?? item.minH ?? 1
    return { ...item, h: Math.max(item.h, minH), minH }
  })
}
export { enforceMinH }
