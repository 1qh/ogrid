'use client'
import { Separator } from '@a/ui/separator'
const SeparatorWidget = () => (
  <>
    <span className='text-sm font-medium'>Dividers</span>
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Section One</span>
        <span className='text-xs text-muted-foreground'>Content for the first section goes here</span>
      </div>
      <Separator />
      <div className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Section Two</span>
        <span className='text-xs text-muted-foreground'>Another section with different content</span>
      </div>
      <Separator />
      <div className='flex flex-col gap-1'>
        <span className='text-sm font-medium'>Section Three</span>
        <span className='text-xs text-muted-foreground'>The final section wraps things up</span>
      </div>
    </div>
  </>
)
export default SeparatorWidget
