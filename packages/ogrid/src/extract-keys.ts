/** biome-ignore-all lint/performance/useTopLevelRegex: regex used in closure */
import type { ReactElement, ReactNode } from 'react'
import { isValidElement } from 'react'
const KEY_PREFIX_RE = /^\.\$/u
const flatChildren = (children: ReactNode): ReactElement[] => {
  const result: ReactElement[] = []
  const items = Array.isArray(children) ? (children as ReactNode[]) : [children]
  for (const child of items)
    if (Array.isArray(child)) result.push(...flatChildren(child))
    else if (isValidElement(child)) result.push(child)
  return result
}
const extractKeys = (children: ReactNode): string[] => {
  const keys: string[] = []
  for (const child of flatChildren(children)) {
    const key = child.key?.replace(KEY_PREFIX_RE, '')
    if (key) keys.push(key)
  }
  return keys
}
export { extractKeys, flatChildren, KEY_PREFIX_RE }
