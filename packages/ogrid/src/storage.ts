/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: SSR guards */
/* eslint-disable no-empty */
import type { GridConfig } from './types'
const STORAGE_PREFIX = 'ogrid:'
const readStorage = (id: string): GridConfig | null => {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_PREFIX + id)
    return raw ? (JSON.parse(raw) as GridConfig) : null
  } catch {
    return null
  }
}
const writeStorage = (id: string, config: GridConfig) => {
  try {
    globalThis.localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(config))
  } catch {}
}
const clearStorage = (id: string) => {
  try {
    globalThis.localStorage.removeItem(STORAGE_PREFIX + id)
  } catch {}
}
export { clearStorage, readStorage, STORAGE_PREFIX, writeStorage }
