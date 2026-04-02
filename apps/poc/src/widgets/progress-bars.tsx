'use client'
import { Progress } from '@a/ui/progress'
const items = [
    { label: 'Storage', value: 72 },
    { label: 'Memory', value: 45 },
    { label: 'CPU', value: 89 },
    { label: 'Network', value: 31 }
  ],
  ProgressBars = () => (
    <>
      <span className='text-sm font-medium'>System Usage</span>
      <div className='flex flex-col gap-4'>
        {items.map(p => (
          <div className='flex flex-col gap-1.5' key={p.label}>
            <div className='flex items-center justify-between text-sm'>
              <span>{p.label}</span>
              <span className='text-muted-foreground'>{String(p.value)}%</span>
            </div>
            <Progress value={p.value} />
          </div>
        ))}
      </div>
    </>
  )
export default ProgressBars
