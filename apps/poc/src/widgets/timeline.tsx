'use client'
const events = [
    { desc: 'v2.4.0 rolling out to production', time: '09:00', title: 'Deployment started' },
    { desc: 'All instances healthy', time: '09:15', title: 'Health check passed' },
    { desc: 'Latency spike detected in us-east-1', time: '10:30', title: 'Alert triggered' },
    { desc: 'Auto-scaled to handle traffic', time: '10:45', title: 'Incident resolved' },
    { desc: 'Daily snapshot stored', time: '14:00', title: 'Backup completed' }
  ],
  Timeline = () => (
    <>
      <span className='text-sm font-medium'>Activity</span>
      <div className='flex flex-col gap-4'>
        {events.map(e => (
          <div className='flex gap-3' key={e.time}>
            <span className='shrink-0 text-xs text-muted-foreground'>{e.time}</span>
            <div className='flex flex-col gap-0.5'>
              <span className='text-sm font-medium'>{e.title}</span>
              <span className='text-xs text-muted-foreground'>{e.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
export default Timeline
