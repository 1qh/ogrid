'use client'
import { Badge } from '@a/ui/badge'
const tags = [
    { label: 'React', variant: 'default' as const },
    { label: 'TypeScript', variant: 'secondary' as const },
    { label: 'Tailwind', variant: 'outline' as const },
    { label: 'Next.js', variant: 'default' as const },
    { label: 'Deprecated', variant: 'destructive' as const },
    { label: 'Stable', variant: 'secondary' as const },
    { label: 'Beta', variant: 'outline' as const },
    { label: 'New', variant: 'default' as const }
  ],
  Badges = () => (
    <>
      <span className='text-sm font-medium'>Tags</span>
      <div className='flex flex-wrap gap-2'>
        {tags.map(t => (
          <Badge key={t.label} variant={t.variant}>
            {t.label}
          </Badge>
        ))}
      </div>
    </>
  )
export default Badges
