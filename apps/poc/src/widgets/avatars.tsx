'use client'
import { Avatar, AvatarFallback } from '@a/ui/avatar'
const people = [
    { initials: 'AJ', name: 'Alice' },
    { initials: 'BS', name: 'Bob' },
    { initials: 'CW', name: 'Carol' },
    { initials: 'DB', name: 'Dave' },
    { initials: 'ED', name: 'Eve' }
  ],
  Avatars = () => (
    <>
      <span className='text-sm font-medium'>Team</span>
      <div className='flex gap-2'>
        {people.map(p => (
          <Avatar key={p.name}>
            <AvatarFallback>{p.initials}</AvatarFallback>
          </Avatar>
        ))}
      </div>
    </>
  )
export default Avatars
