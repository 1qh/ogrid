'use client'
import { cn } from '@a/ui'
import { useLayoutEffect, useRef, useState } from 'react'

const items = [
  { label: 'Revenue', value: '$12.4k' },
  { label: 'Orders', value: '1,234' },
  { label: 'Conversion', value: '3.2%' },
  { label: 'AOV', value: '$48' },
  { label: 'Returns', value: '2.1%' },
  { label: 'Churn', value: '0.8%' }
]
const LayoutSwitch = () => {
  const ref = useRef<HTMLDivElement>(null)
  const [wide, setWide] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) setWide(entry.contentRect.width > 400)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref}>
      <span className='text-sm font-medium'>Layout Switch {wide ? '(2-col)' : '(1-col)'}</span>
      <div className={cn(wide ? 'grid grid-cols-2 gap-3 pt-2' : 'flex flex-col gap-2 pt-2')}>
        {items.map(i => (
          <div className='flex items-center justify-between rounded border p-2 text-sm' key={i.label}>
            <span className='text-muted-foreground'>{i.label}</span>
            <span className='font-medium'>{i.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
export default LayoutSwitch
