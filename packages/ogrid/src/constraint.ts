import type { LayoutItem, ResizeHandleAxis } from 'react-grid-layout'
import { MAX_GUARD_FRAMES } from './constants'
import { measureNaturalHeight, pxToGridH } from './measurement'
interface ConstraintRefs {
  cardRef: Map<string, HTMLDivElement>
  fillSet: Set<string>
  lastKnownWRef: Map<string, number>
  marginY: number
  previousMinHRef: Map<string, number>
  rowHeight: number
  transitionFrameRef: Map<string, number>
}
const createContentMinConstraint = (refs: ConstraintRefs) => ({
  constrainSize: (item: LayoutItem, w: number, h: number, _handle: ResizeHandleAxis) => {
    if (refs.fillSet.has(item.i)) return { h, w }
    const el = refs.cardRef.get(item.i)
    if (!el) return { h, w }
    const currentMinH = pxToGridH(measureNaturalHeight(el), refs.rowHeight, refs.marginY)
    const lastW = refs.lastKnownWRef.get(item.i)
    let effectiveMinH = currentMinH
    if (lastW !== undefined && lastW !== w) {
      refs.previousMinHRef.set(item.i, currentMinH)
      refs.transitionFrameRef.set(item.i, 0)
      refs.lastKnownWRef.set(item.i, w)
    } else {
      refs.lastKnownWRef.set(item.i, w)
      const prevMinH = refs.previousMinHRef.get(item.i)
      if (prevMinH !== undefined) {
        const frames = (refs.transitionFrameRef.get(item.i) ?? 0) + 1
        refs.transitionFrameRef.set(item.i, frames)
        if (frames >= MAX_GUARD_FRAMES) {
          refs.previousMinHRef.delete(item.i)
          refs.transitionFrameRef.delete(item.i)
        } else effectiveMinH = Math.max(currentMinH, prevMinH)
      }
    }
    return { h: Math.max(h, effectiveMinH), w }
  },
  name: 'content-min'
})
export { createContentMinConstraint }
