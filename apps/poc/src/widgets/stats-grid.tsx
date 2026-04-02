'use client'
const stats = [
    { label: 'Users', value: '12.5k' },
    { label: 'Sessions', value: '45.2k' },
    { label: 'Bounce Rate', value: '24.3%' },
    { label: 'Avg Duration', value: '3m 42s' },
    { label: 'Page Views', value: '89.1k' },
    { label: 'Conversions', value: '1,234' }
  ],
  StatsGrid = () => (
    <div className='grid grid-cols-3 gap-4 pt-6'>
      {stats.map(s => (
        <div className='flex flex-col items-center gap-1 text-center' key={s.label}>
          <span className='text-2xl font-bold'>{s.value}</span>
          <span className='text-xs text-muted-foreground'>{s.label}</span>
        </div>
      ))}
    </div>
  )
export default StatsGrid
