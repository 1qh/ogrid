'use client'
import { Button } from '@a/ui/button'
import { Skeleton } from '@a/ui/skeleton'
import { useState } from 'react'
const SkeletonWidget = () => {
  const [loading, setLoading] = useState(true)
  return (
    <>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>Loading State</span>
        <Button onClick={() => setLoading(!loading)} size='sm' variant='outline'>
          {loading ? 'Show' : 'Loading'}
        </Button>
      </div>
      <div className='flex flex-col gap-3'>
        {loading ? (
          <>
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-4 w-1/2' />
            <Skeleton className='h-20 w-full' />
            <div className='flex gap-2'>
              <Skeleton className='h-8 w-8 rounded-full' />
              <Skeleton className='h-8 w-8 rounded-full' />
              <Skeleton className='h-8 w-8 rounded-full' />
            </div>
          </>
        ) : (
          <>
            <span className='text-sm'>Content loaded successfully!</span>
            <span className='text-sm text-muted-foreground'>This demonstrates the skeleton loading state toggle.</span>
          </>
        )}
      </div>
    </>
  )
}
export default SkeletonWidget
