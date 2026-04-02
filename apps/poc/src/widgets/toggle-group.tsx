'use client'
import { ToggleGroup, ToggleGroupItem } from '@a/ui/toggle-group'
const GRID_DEFAULT = ['grid'] as const,
  TIME_DEFAULT = ['7d'] as const,
  ToggleGroupWidget = () => (
    <>
      <span className='text-sm font-medium'>View Mode</span>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <span className='text-sm text-muted-foreground'>Layout</span>
          <ToggleGroup defaultValue={GRID_DEFAULT}>
            <ToggleGroupItem value='grid'>Grid</ToggleGroupItem>
            <ToggleGroupItem value='list'>List</ToggleGroupItem>
            <ToggleGroupItem value='board'>Board</ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className='flex flex-col gap-2'>
          <span className='text-sm text-muted-foreground'>Time Range</span>
          <ToggleGroup defaultValue={TIME_DEFAULT}>
            <ToggleGroupItem value='1d'>1D</ToggleGroupItem>
            <ToggleGroupItem value='7d'>7D</ToggleGroupItem>
            <ToggleGroupItem value='30d'>30D</ToggleGroupItem>
            <ToggleGroupItem value='90d'>90D</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </>
  )
export default ToggleGroupWidget
