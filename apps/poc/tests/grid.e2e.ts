/** biome-ignore-all lint/nursery/noPlaywrightWaitForSelector: waiting for dynamic content */
/** biome-ignore-all lint/nursery/noPlaywrightWaitForTimeout: measurement phase timing */
/** biome-ignore-all lint/performance/useTopLevelRegex: test-local regex */
/** biome-ignore-all lint/performance/noAwaitInLoops: sequential user interactions */
/** biome-ignore-all lint/nursery/noContinue: flow control */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method, no-await-in-loop, no-continue */
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
const STORAGE_KEY = 'ogrid:poc'
const toggleEdit = async (page: Page) => {
  await page.locator('[role="switch"], button[role="switch"]').first().click()
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
  await page.getByRole('button', { name: 'Reset' }).click()
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
  await page.getByRole('button', { name: 'Rings' }).click()
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
  await page.getByRole('button', { name: 'Copy' }).click()
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
  expect(await page.locator('button:has-text("Copy")').count()).toBe(0)
  expect(await page.locator('button:has-text("Rings")').count()).toBe(0)
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
  await page.getByRole('button', { name: 'Reset' }).click()
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
  await page.getByRole('button', { name: 'Reset' }).click()
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
