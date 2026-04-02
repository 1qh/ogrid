/* oxlint-disable promise/prefer-await-to-callbacks */
'use client'
import { useSyncExternalStore } from 'react'
const subscribe = (cb: () => void) => {
    const observer = new MutationObserver(cb)
    observer.observe(document.documentElement, { attributeFilter: ['class'], attributes: true })
    return () => observer.disconnect()
  },
  getSnapshot = () => document.documentElement.classList.contains('dark'),
  DarkToggle = () => {
    const dark = useSyncExternalStore(subscribe, getSnapshot, () => false)
    return (
      <button
        className='fixed right-2 top-2 z-[9999] cursor-pointer text-sm opacity-50 hover:opacity-100'
        onClick={() => {
          document.documentElement.classList.toggle('dark')
        }}
        type='button'>
        {dark ? '☀️' : '🌙'}
      </button>
    )
  }
export default DarkToggle
