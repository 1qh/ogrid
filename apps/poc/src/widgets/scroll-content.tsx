'use client'
import { Separator } from '@a/ui/separator'
const items = Array.from({ length: 20 }, (_, i) => `Item ${String(i + 1)}`),
  ScrollContent = () => (
    <>
      <span className='text-sm font-medium'>Scroll Area</span>
      <div className='h-48 overflow-auto'>
        {items.map((item, i) => (
          <div key={item}>
            <div className='py-2 text-sm'>{item}</div>
            {i < items.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </>
  )
export default ScrollContent
