'use client'
import { ScrollArea } from '@a/ui/scroll-area'
import { Separator } from '@a/ui/separator'
const items = Array.from({ length: 20 }, (_, i) => `Item ${String(i + 1)}`),
  ScrollContent = () => (
    <>
      <span className='text-sm font-medium'>Scroll Area</span>
      <ScrollArea className='h-48'>
        {items.map((item, i) => (
          <div key={item}>
            <div className='py-2 text-sm'>{item}</div>
            {i < items.length - 1 && <Separator />}
          </div>
        ))}
      </ScrollArea>
    </>
  )
export default ScrollContent
