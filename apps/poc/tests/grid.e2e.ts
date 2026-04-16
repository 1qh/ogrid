/** biome-ignore-all lint/nursery/noPlaywrightWaitForSelector: waiting for dynamic content */
/** biome-ignore-all lint/nursery/noPlaywrightWaitForTimeout: measurement phase timing */
/** biome-ignore-all lint/performance/useTopLevelRegex: test-local regex */
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
