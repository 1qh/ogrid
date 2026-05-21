'use client'
const EmptyState = () => (
  <div className='flex flex-col items-center justify-center gap-2 py-12 text-center'>
    <svg
      aria-hidden='true'
      className='text-muted-foreground/50'
      fill='none'
      height='48'
      stroke='currentColor'
      strokeWidth='1'
      viewBox='0 0 24 24'
      width='48'
      xmlns='http://www.w3.org/2000/svg'>
      <title>Message icon</title>
      <path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' />
    </svg>
    <span className='text-sm font-medium'>No messages yet</span>
    <span className='text-xs text-muted-foreground'>Start a conversation to see messages here</span>
  </div>
)
export default EmptyState
