/* oxlint-disable promise/prefer-await-to-callbacks */
/* eslint-disable @typescript-eslint/unbound-method, func-name-matching */
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register()
class MockResizeObserver {
  readonly #cb: ResizeObserverCallback
  readonly #targets = new Set<Element>()
  public constructor(cb: ResizeObserverCallback) {
    this.#cb = cb
  }
  public disconnect() {
    this.#targets.clear()
  }
  public observe(el: Element) {
    this.#targets.add(el)
    queueMicrotask(() => {
      if (!this.#targets.has(el)) return
      const entry = { contentRect: el.getBoundingClientRect(), target: el } as unknown as ResizeObserverEntry
      this.#cb([entry], this)
    })
  }
  public unobserve(el: Element) {
    this.#targets.delete(el)
  }
}
globalThis.ResizeObserver = MockResizeObserver
const originalGetRect = globalThis.Element.prototype.getBoundingClientRect
globalThis.Element.prototype.getBoundingClientRect = function patchedGetRect(this: Element) {
  const r = originalGetRect.call(this)
  if (r.width > 0 && r.height > 0) return r
  return new DOMRect(r.x, r.y, r.width || 1200, r.height || 600)
}
