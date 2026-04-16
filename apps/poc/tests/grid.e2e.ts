/** biome-ignore-all lint/nursery/noPlaywrightWaitForSelector: waiting for dynamic content */
/** biome-ignore-all lint/nursery/noPlaywrightWaitForTimeout: measurement phase timing */
/** biome-ignore-all lint/performance/useTopLevelRegex: test-local regex */
/** biome-ignore-all lint/performance/noAwaitInLoops: sequential user interactions */
/** biome-ignore-all lint/nursery/noContinue: flow control */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method, no-await-in-loop, no-continue */
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
const STORAGE_KEY = 'ogrid:poc'
const openPanel = async (page: Page) => {
  const hasDrawer = await page.evaluate(() => document.querySelectorAll('[data-ogrid-panel] input[type=range]').length > 0)
  if (!hasDrawer) {
    await page.locator('[data-ogrid-panel] button').first().click()
    await page.waitForTimeout(300)
  }
}
const toggleEdit = async (page: Page) => {
  await openPanel(page)
  await page.locator('[role="switch"], button[role="switch"]').first().click()
  await page.waitForTimeout(100)
}
test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(k => globalThis.localStorage.removeItem(k), STORAGE_KEY)
  await page.reload()
  await page.waitForSelector('.react-grid-item')
})
test('renders grid with widgets', async ({ page }) => {
  await expect(page.locator('.react-grid-item').first()).toBeVisible()
  expect(await page.locator('.react-grid-item').count()).toBeGreaterThan(10)
})
test('editable toggle shows drag handles', async ({ page }) => {
  expect(await page.locator('.ogrid-drag-handle').count()).toBe(0)
  await toggleEdit(page)
  await page.waitForTimeout(200)
  expect(await page.locator('.ogrid-drag-handle').count()).toBeGreaterThan(0)
})
test('panel sliders render when editable', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(100)
  expect(await page.locator('input[type=range]').count()).toBeGreaterThanOrEqual(3)
})
test('reset button clears localStorage', async ({ page }) => {
  await page.evaluate(args => globalThis.localStorage.setItem(args.k, JSON.stringify({ cols: 20, layout: [] })), {
    k: STORAGE_KEY
  })
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await toggleEdit(page)
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await page.waitForTimeout(300)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(saved).toBeNull()
})
test('drag item changes its position', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const handle = page.locator('.ogrid-drag-handle').first()
  await handle.hover()
  const box = await handle.boundingBox()
  if (!box) throw new Error('no handle')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 400, box.y + 100, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(saved).not.toBeNull()
})
test('resize item changes its height', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const handle = page.locator('.react-resizable-handle-se').first()
  const box = await handle.boundingBox()
  if (!box) throw new Error('no resize handle')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 100, box.y + 300, { steps: 20 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(saved).not.toBeNull()
})
test('rings toggle shows borders', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(100)
  const ringsBefore = await page.locator('.ring-ring').count()
  await page.getByRole('button', { name: /Cell borders/u }).click()
  await page.waitForTimeout(100)
  const ringsAfter = await page.locator('.ring-ring').count()
  expect(ringsAfter).toBeGreaterThan(ringsBefore)
})
test('responsive compact mode below 768px breakpoint', async ({ page }) => {
  await page.setViewportSize({ height: 800, width: 500 })
  await page.waitForTimeout(300)
  const ys = await page.evaluate(() => {
    const items = document.querySelectorAll<HTMLElement>('.react-grid-item')
    return [...items].slice(0, 5).map(el => el.getBoundingClientRect().y)
  })
  const uniqueYs = new Set(ys)
  expect(uniqueYs.size).toBeGreaterThanOrEqual(3)
})
test('copy button writes to clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await toggleEdit(page)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Copy config' }).click()
  await page.waitForTimeout(200)
  const text = await page.evaluate(async () => globalThis.navigator.clipboard.readText())
  expect(text).toContain('layout:')
  expect(text).toContain('satisfies GridConfig')
})
test('toggle edit off hides drag handles again', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(200)
  expect(await page.locator('.ogrid-drag-handle').count()).toBeGreaterThan(0)
  await toggleEdit(page)
  await page.waitForTimeout(200)
  expect(await page.locator('.ogrid-drag-handle').count()).toBe(0)
})
test('panel item count matches rendered items', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(200)
  const panelText = await page.locator(String.raw`text=/\d+ items/`).first().textContent()
  const rendered = await page.locator('.react-grid-item').count()
  const panelCount = Number(panelText?.match(/(?<count>\d+)/u)?.groups?.count ?? 0)
  expect(panelCount).toBe(rendered)
})
test('widgets remain interactive (not swallowed by drag)', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const buttons = page.locator('.react-grid-item button:not(.ogrid-drag-handle)')
  const count = await buttons.count()
  expect(count).toBeGreaterThan(0)
})
test('fill items stretch to container height', async ({ page }) => {
  const heights = await page.evaluate(() => {
    const fills = ['chart', 'areachart', 'sparkline']
    const result: Record<string, number> = {}
    for (const key of fills) {
      const el = document.querySelector<HTMLElement>(`[data-ogrid-key="${key}"]`)?.closest('.react-grid-item')
      if (el) result[key] = (el as HTMLElement).offsetHeight
    }
    return result
  })
  for (const h of Object.values(heights)) expect(h).toBeGreaterThan(200)
})
test('panel not rendered when editable is off', async ({ page }) => {
  expect(await page.locator('button:has-text("Copy config")').count()).toBe(0)
  expect(await page.locator('button:has-text("Cell borders")').count()).toBe(0)
})
test('cross-tab localStorage sync via StorageEvent', async ({ page }) => {
  await page.evaluate(k => {
    globalThis.localStorage.setItem(k, JSON.stringify({ cols: 18, layout: [] }))
    globalThis.dispatchEvent(new StorageEvent('storage', { key: k, newValue: globalThis.localStorage.getItem(k) }))
  }, STORAGE_KEY)
  await page.waitForTimeout(300)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  const parsed = JSON.parse(saved ?? '{}') as { cols?: number }
  expect(parsed.cols).toBe(18)
})
test('drag A onto B pushes B down (vertical compaction)', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const before = await page.evaluate(() => {
    const items = document.querySelectorAll<HTMLElement>('.react-grid-item')
    const result: Record<string, number> = {}
    for (const el of items) {
      const key = el.querySelector<HTMLElement>('[data-ogrid-key]')?.dataset.ogridKey
      if (key) result[key] = el.getBoundingClientRect().y
    }
    return result
  })
  const handles = page.locator('.ogrid-drag-handle')
  const firstHandle = handles.first()
  const box = await firstHandle.boundingBox()
  if (!box) throw new Error('no handle')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 600, box.y + 50, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => {
    const items = document.querySelectorAll<HTMLElement>('.react-grid-item')
    const result: Record<string, number> = {}
    for (const el of items) {
      const key = el.querySelector<HTMLElement>('[data-ogrid-key]')?.dataset.ogridKey
      if (key) result[key] = el.getBoundingClientRect().y
    }
    return result
  })
  const movedCount = Object.keys(after).filter(k => after[k] !== before[k]).length
  expect(movedCount).toBeGreaterThan(0)
})
test('resize item larger then saved reflects new h', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const handle = page.locator('.react-resizable-handle-se').first()
  const box = await handle.boundingBox()
  if (!box) throw new Error('no handle')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 50, box.y + 200, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  const parsed = JSON.parse(saved ?? '{}') as { layout?: { fill?: boolean; h?: number; i: string }[] }
  const firstNonFill = parsed.layout?.find(l => !l.fill && (l.h ?? 0) > 1)
  expect(firstNonFill).toBeDefined()
})
test('resize fill item down allows shrinking freely', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const heightBefore = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="chart"]')?.closest('.react-grid-item')
    return (el as HTMLElement | null)?.offsetHeight ?? 0
  })
  const handleInfo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="chart"]')?.closest('.react-grid-item')
    const handle = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!handle) return null
    const rect = handle.getBoundingClientRect()
    return { height: rect.height, width: rect.width, x: rect.x, y: rect.y }
  })
  if (!handleInfo) throw new Error('no chart handle')
  await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleInfo.x, handleInfo.y - 200, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const heightAfter = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="chart"]')?.closest('.react-grid-item')
    return (el as HTMLElement | null)?.offsetHeight ?? 0
  })
  expect(heightAfter).toBeLessThan(heightBefore)
})
test('tweak cols slider reflows item widths', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(200)
  const widthBefore = await page
    .locator('.react-grid-item')
    .first()
    .evaluate((el: HTMLElement) => el.offsetWidth)
  const cols = page.locator('input[type=range]').first()
  await cols.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '12')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  const widthAfter = await page
    .locator('.react-grid-item')
    .first()
    .evaluate((el: HTMLElement) => el.offsetWidth)
  expect(widthAfter).not.toBe(widthBefore)
})
test('tweak gap slider changes spacing', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(200)
  const gap = page.locator('input[type=range]').nth(1)
  await gap.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '32')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  const parsed = JSON.parse(saved ?? '{}') as { gap?: number }
  expect(parsed.gap).toBe(32)
})
test('tweak rowHeight slider changes item heights', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(200)
  const row = page.locator('input[type=range]').nth(2)
  await row.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '80')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  const parsed = JSON.parse(saved ?? '{}') as { rowHeight?: number }
  expect(parsed.rowHeight).toBe(80)
})
test('reset restores default cols/gap/rowHeight after tweaks', async ({ page }) => {
  await page.evaluate(
    args => globalThis.localStorage.setItem(args.k, JSON.stringify({ cols: 12, gap: 32, layout: [], rowHeight: 80 })),
    { k: STORAGE_KEY }
  )
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await toggleEdit(page)
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await page.waitForTimeout(400)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(saved).toBeNull()
})
test('reset then modify creates new save', async ({ page }) => {
  await page.evaluate(args => globalThis.localStorage.setItem(args.k, JSON.stringify({ cols: 10, layout: [] })), {
    k: STORAGE_KEY
  })
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await toggleEdit(page)
  await page.waitForTimeout(200)
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await page.waitForTimeout(300)
  expect(await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)).toBeNull()
  const cols = page.locator('input[type=range]').first()
  await cols.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '16')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(400)
  const after = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(JSON.parse(after ?? '{}').cols).toBe(16)
})
test('editable off: drag does nothing', async ({ page }) => {
  const before = await page.evaluate(() => {
    const el = document.querySelectorAll<HTMLElement>('.react-grid-item')[0]
    return el?.getBoundingClientRect().y
  })
  const firstItem = page.locator('.react-grid-item').first()
  const box = await firstItem.boundingBox()
  if (!box) throw new Error('no item')
  await page.mouse.move(box.x + 50, box.y + 50)
  await page.mouse.down()
  await page.mouse.move(box.x + 500, box.y + 300, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)
  const after = await page.evaluate(() => {
    const el = document.querySelectorAll<HTMLElement>('.react-grid-item')[0]
    return el?.getBoundingClientRect().y
  })
  expect(after).toBe(before)
})
test('multiple resizes in sequence all saved', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  for (let idx = 0; idx < 2; idx += 1) {
    const handle = page.locator('.react-resizable-handle-se').nth(idx)
    const box = await handle.boundingBox()
    if (!box) continue
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 50, box.y + 100, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)
  }
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(saved).not.toBeNull()
})
test('full page reload preserves customizations', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(200)
  const cols = page.locator('input[type=range]').first()
  await cols.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '14')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(300)
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await page.waitForTimeout(500)
  const saved = await page.evaluate(k => globalThis.localStorage.getItem(k), STORAGE_KEY)
  expect(JSON.parse(saved ?? '{}').cols).toBe(14)
})
test('drag handle position is top-right of each item', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const positions = await page.evaluate(() => {
    const handles = document.querySelectorAll<HTMLElement>('.ogrid-drag-handle')
    const result: { handleX: number; handleY: number; itemX: number; itemY: number }[] = []
    for (const handle of [...handles].slice(0, 3)) {
      const item = handle.closest('.react-grid-item')
      if (!item) continue
      const hRect = handle.getBoundingClientRect()
      const iRect = item.getBoundingClientRect()
      result.push({ handleX: hRect.x, handleY: hRect.y, itemX: iRect.x, itemY: iRect.y })
    }
    return result
  })
  for (const p of positions) {
    expect(p.handleY - p.itemY).toBeLessThan(30)
    expect(p.handleX - p.itemX).toBeGreaterThan(100)
  }
})
const snapshotAll = async (page: Page) =>
  page.evaluate(() => {
    const items = document.querySelectorAll<HTMLElement>('.react-grid-item')
    const result: Record<string, { h: number; w: number; x: number; y: number }> = {}
    for (const el of items) {
      const key = el.querySelector<HTMLElement>('[data-ogrid-key]')?.dataset.ogridKey
      if (!key) continue
      const rect = el.getBoundingClientRect()
      result[key] = { h: rect.height, w: rect.width, x: Math.round(rect.x), y: Math.round(rect.y) }
    }
    return result
  })
test('resize one item: OTHER items h/w never change', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const handleInfo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!handleInfo) throw new Error('no handle')
  await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleInfo.x + 80, handleInfo.y + 200, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    if (key === 'progress') continue
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key, w: a.w }).toEqual({ h: b.h, key, w: b.w })
  }
})
test('drag one item: OTHER items h/w never change', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const handleInfo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="kpi"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.ogrid-drag-handle')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!handleInfo) throw new Error('no handle')
  await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleInfo.x - 400, handleInfo.y + 400, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    if (key === 'kpi') continue
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key, w: a.w }).toEqual({ h: b.h, key, w: b.w })
  }
})
test('reload after resize: OTHER items h/w match pre-reload', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const handleInfo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!handleInfo) throw new Error('no handle')
  await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleInfo.x + 50, handleInfo.y + 300, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const beforeReload = await snapshotAll(page)
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await page.waitForTimeout(600)
  const afterReload = await snapshotAll(page)
  for (const key of Object.keys(beforeReload)) {
    const b = beforeReload[key]
    const a = afterReload[key]
    if (!(a && b)) continue
    expect({ h: a.h, key }).toEqual({ h: b.h, key })
  }
})
test('resize then reload then resize different item: first item h stays', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const progressHandle = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!progressHandle) throw new Error('no handle')
  await page.mouse.move(progressHandle.x + progressHandle.width / 2, progressHandle.y + progressHandle.height / 2)
  await page.mouse.down()
  await page.mouse.move(progressHandle.x + 80, progressHandle.y + 250, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const snapshotAfterFirst = await snapshotAll(page)
  const progressHAfter1 = snapshotAfterFirst.progress?.h
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await page.waitForTimeout(600)
  await toggleEdit(page)
  await page.waitForTimeout(300)
  const beforeSecondResize = await snapshotAll(page)
  const kpiHandle = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="kpi"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!kpiHandle) throw new Error('no kpi handle')
  await page.mouse.move(kpiHandle.x + kpiHandle.width / 2, kpiHandle.y + kpiHandle.height / 2)
  await page.mouse.down()
  await page.mouse.move(kpiHandle.x + 40, kpiHandle.y + 100, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const afterSecondResize = await snapshotAll(page)
  expect(afterSecondResize.progress?.h).toBe(beforeSecondResize.progress?.h)
  expect(afterSecondResize.progress?.h).toBe(progressHAfter1)
})
test('multiple sliders tweak: items not being tweaked stay in same grid positions relative to each other', async ({
  page
}) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const gap = page.locator('input[type=range]').nth(1)
  await gap.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '8')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  const beforeKeys = Object.keys(before).toSorted()
  const afterKeys = Object.keys(after).toSorted()
  expect(afterKeys).toEqual(beforeKeys)
  const beforeOrder = beforeKeys
    .map(k => ({ k, y: before[k]?.y ?? 0 }))
    .toSorted((a, b) => a.y - b.y)
    .map(e => e.k)
  const afterOrder = afterKeys
    .map(k => ({ k, y: after[k]?.y ?? 0 }))
    .toSorted((a, b) => a.y - b.y)
    .map(e => e.k)
  expect(afterOrder).toEqual(beforeOrder)
})
test('resize smaller: OTHER items h/w unchanged', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const firstHandle = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!firstHandle) throw new Error('no handle')
  await page.mouse.move(firstHandle.x + firstHandle.width / 2, firstHandle.y + firstHandle.height / 2)
  await page.mouse.down()
  await page.mouse.move(firstHandle.x + 40, firstHandle.y + 250, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const shrinkHandle = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!shrinkHandle) throw new Error('no handle')
  await page.mouse.move(shrinkHandle.x + shrinkHandle.width / 2, shrinkHandle.y + shrinkHandle.height / 2)
  await page.mouse.down()
  await page.mouse.move(shrinkHandle.x, shrinkHandle.y - 150, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    if (key === 'progress') continue
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key, w: a.w }).toEqual({ h: b.h, key, w: b.w })
  }
})
test('resize width-only: OTHER items heights unchanged', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const handleInfo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!handleInfo) throw new Error('no handle')
  await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleInfo.x + 300, handleInfo.y + 5, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    if (key === 'progress') continue
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key }).toEqual({ h: b.h, key })
  }
})
test('sequential resize same item twice: OTHER items unchanged both times', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const initial = await snapshotAll(page)
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const handleInfo = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-ogrid-key="progress"]')?.closest('.react-grid-item')
      const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
      if (!h) return null
      const r = h.getBoundingClientRect()
      return { height: r.height, width: r.width, x: r.x, y: r.y }
    })
    if (!handleInfo) continue
    await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleInfo.x + 60, handleInfo.y + (attempt === 0 ? 100 : -50), { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(500)
    const snap = await snapshotAll(page)
    for (const key of Object.keys(initial)) {
      if (key === 'progress') continue
      const b = initial[key]
      const a = snap[key]
      if (!(a && b)) continue
      expect({ attempt, h: a.h, key, w: a.w }).toEqual({ attempt, h: b.h, key, w: b.w })
    }
  }
})
test('sequential resize different items: each resize only affects its target', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const targets = ['progress', 'stats', 'timeline']
  for (const target of targets) {
    const handleInfo = await page.evaluate(k => {
      const el = document.querySelector<HTMLElement>(`[data-ogrid-key="${k}"]`)?.closest('.react-grid-item')
      const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
      if (!h) return null
      const r = h.getBoundingClientRect()
      return { height: r.height, width: r.width, x: r.x, y: r.y }
    }, target)
    if (!handleInfo) continue
    await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleInfo.x + 40, handleInfo.y + 120, { steps: 15 })
    await page.mouse.up()
    await page.waitForTimeout(500)
  }
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    if (targets.includes(key)) continue
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key, w: a.w }).toEqual({ h: b.h, key, w: b.w })
  }
})
test('drag then resize same item: other items still unchanged', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const dragHandle = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="kpi"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.ogrid-drag-handle')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!dragHandle) throw new Error('no drag handle')
  await page.mouse.move(dragHandle.x + dragHandle.width / 2, dragHandle.y + dragHandle.height / 2)
  await page.mouse.down()
  await page.mouse.move(dragHandle.x - 200, dragHandle.y + 100, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const resizeHandle = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="kpi"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!resizeHandle) throw new Error('no resize handle')
  await page.mouse.move(resizeHandle.x + resizeHandle.width / 2, resizeHandle.y + resizeHandle.height / 2)
  await page.mouse.down()
  await page.mouse.move(resizeHandle.x + 60, resizeHandle.y + 150, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    if (key === 'kpi') continue
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key, w: a.w }).toEqual({ h: b.h, key, w: b.w })
  }
})
test('reload after drag: no wild height cascade (within measurement tolerance)', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const handleInfo = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-ogrid-key="kpi"]')?.closest('.react-grid-item')
    const h = el?.querySelector<HTMLElement>('.ogrid-drag-handle')
    if (!h) return null
    const r = h.getBoundingClientRect()
    return { height: r.height, width: r.width, x: r.x, y: r.y }
  })
  if (!handleInfo) throw new Error('no handle')
  await page.mouse.move(handleInfo.x + handleInfo.width / 2, handleInfo.y + handleInfo.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleInfo.x + 300, handleInfo.y + 400, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(500)
  const beforeReload = await snapshotAll(page)
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await page.waitForTimeout(600)
  const afterReload = await snapshotAll(page)
  for (const key of Object.keys(beforeReload)) {
    const b = beforeReload[key]
    const a = afterReload[key]
    if (!(a && b)) continue
    const hDiff = Math.abs(a.h - b.h)
    expect({ hDiff: hDiff < 100, key }).toEqual({ hDiff: true, key })
  }
})
test('tweak cols slider: unrelated items h preserved (only widths reflow)', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const before = await snapshotAll(page)
  const cols = page.locator('input[type=range]').first()
  await cols.evaluate((el: HTMLInputElement) => {
    const setter = Object.getOwnPropertyDescriptor(globalThis.HTMLInputElement.prototype, 'value')?.set
    setter?.call(el, '20')
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(500)
  const after = await snapshotAll(page)
  for (const key of Object.keys(before)) {
    const b = before[key]
    const a = after[key]
    if (!(a && b)) continue
    expect({ h: a.h, key }).toEqual({ h: b.h, key })
  }
})
test('reset after heavy customization: all items return to pristine state', async ({ page }) => {
  await toggleEdit(page)
  await page.waitForTimeout(500)
  const pristine = await snapshotAll(page)
  for (const target of ['progress', 'stats', 'timeline']) {
    const h = await page.evaluate(k => {
      const el = document.querySelector<HTMLElement>(`[data-ogrid-key="${k}"]`)?.closest('.react-grid-item')
      const handle = el?.querySelector<HTMLElement>('.react-resizable-handle-se')
      if (!handle) return null
      const r = handle.getBoundingClientRect()
      return { height: r.height, width: r.width, x: r.x, y: r.y }
    }, target)
    if (!h) continue
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
    await page.mouse.down()
    await page.mouse.move(h.x + 80, h.y + 150, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(400)
  }
  await openPanel(page)
  await page.getByRole('button', { name: 'Reset layout' }).click()
  await page.waitForTimeout(600)
  const resetted = await snapshotAll(page)
  for (const key of Object.keys(pristine)) {
    const p = pristine[key]
    const r = resetted[key]
    if (!(p && r)) continue
    expect({ h: r.h, key, w: r.w }).toEqual({ h: p.h, key, w: p.w })
  }
})
test('reload with saved config preserves item heights (regression)', async ({ page }) => {
  const cfg = {
    layout: [
      { fill: true, h: 8, i: 'chart', w: 12 },
      { h: 4, i: 'kpi', w: 12, x: 12 }
    ]
  }
  await page.evaluate(args => globalThis.localStorage.setItem(args.k, JSON.stringify(args.cfg)), { cfg, k: STORAGE_KEY })
  await page.reload()
  await page.waitForSelector('.react-grid-item')
  await page.waitForTimeout(500)
  const heights = await page.evaluate(() => {
    const items = document.querySelectorAll<HTMLElement>('.react-grid-item')
    const result: Record<string, number> = {}
    for (const el of items) {
      const inner = el.querySelector<HTMLElement>('[data-ogrid-key]')
      const key = inner?.dataset.ogridKey
      if (key) result[key] = el.offsetHeight
    }
    return result
  })
  expect(heights.chart).toBeGreaterThan(0)
  expect(heights.kpi).toBeGreaterThan(0)
})
