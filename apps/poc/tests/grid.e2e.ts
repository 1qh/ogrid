/** biome-ignore-all lint/nursery/noPlaywrightWaitForSelector: waiting for dynamic content */
/** biome-ignore-all lint/nursery/noPlaywrightWaitForTimeout: measurement phase timing */
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
