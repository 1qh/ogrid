'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
const data = [
    { month: 'Jan', sessions: 4000, users: 2400 },
    { month: 'Feb', sessions: 3000, users: 1398 },
    { month: 'Mar', sessions: 2000, users: 9800 },
    { month: 'Apr', sessions: 2780, users: 3908 },
    { month: 'May', sessions: 1890, users: 4800 },
    { month: 'Jun', sessions: 2390, users: 3800 },
    { month: 'Jul', sessions: 3100, users: 4200 },
    { month: 'Aug', sessions: 3500, users: 4500 },
    { month: 'Sep', sessions: 2900, users: 3600 },
    { month: 'Oct', sessions: 3200, users: 4100 },
    { month: 'Nov', sessions: 3800, users: 5200 },
    { month: 'Dec', sessions: 4100, users: 5800 }
  ],
  config: ChartConfig = {
    sessions: { color: 'var(--chart-1)', label: 'Sessions' },
    users: { color: 'var(--chart-2)', label: 'Users' }
  },
  AreaChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Sessions & Users Over Time</span>
      <span className='text-xs text-muted-foreground'>12-month trend with peak season highlighted</span>
      <ChartContainer className='aspect-auto min-h-0 flex-1' config={config}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id='gradSessions' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='5%' stopColor='var(--color-sessions)' stopOpacity={0.8} />
              <stop offset='95%' stopColor='var(--color-sessions)' stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id='gradUsers' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='5%' stopColor='var(--color-users)' stopOpacity={0.8} />
              <stop offset='95%' stopColor='var(--color-users)' stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray='3 3' vertical={false} />
          <XAxis dataKey='month' tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <ReferenceArea fill='var(--chart-4)' fillOpacity={0.08} label='Peak Season' x1='Oct' x2='Dec' />
          <ReferenceLine label='Avg' stroke='var(--chart-5)' strokeDasharray='5 5' y={3000} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Area dataKey='sessions' fill='url(#gradSessions)' fillOpacity={1} stroke='var(--color-sessions)' strokeWidth={2} type='monotone' />
          <Area dataKey='users' fill='url(#gradUsers)' fillOpacity={1} stroke='var(--color-users)' strokeWidth={2} type='monotone' />
        </AreaChart>
      </ChartContainer>
    </div>
  )
export default AreaChartWidget
