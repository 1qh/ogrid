'use client'
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Area, AreaChart, Brush, CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
const data = [
    { bounceRate: 42, month: 'Jan', sessions: 4000, users: 2400 },
    { bounceRate: 38, month: 'Feb', sessions: 3000, users: 1398 },
    { bounceRate: 51, month: 'Mar', sessions: 2000, users: 9800 },
    { bounceRate: 35, month: 'Apr', sessions: 2780, users: 3908 },
    { bounceRate: 44, month: 'May', sessions: 1890, users: 4800 },
    { bounceRate: 29, month: 'Jun', sessions: 2390, users: 3800 },
    { bounceRate: 33, month: 'Jul', sessions: 3100, users: 4200 },
    { bounceRate: 41, month: 'Aug', sessions: 3500, users: 4500 },
    { bounceRate: 36, month: 'Sep', sessions: 2900, users: 3600 },
    { bounceRate: 39, month: 'Oct', sessions: 3200, users: 4100 },
    { bounceRate: 28, month: 'Nov', sessions: 3800, users: 5200 },
    { bounceRate: 31, month: 'Dec', sessions: 4100, users: 5800 }
  ],
  tooltipContent = <ChartTooltipContent />,
  legendContent = <ChartLegendContent />,
  BRUSH_STYLE = { height: 20 },
  AreaChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Sessions & Users Over Time</span>
      <span className='text-xs text-muted-foreground'>12-month trend with peak season highlighted</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='gradSessions' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='5%' stopColor='var(--chart-1)' stopOpacity={0.8} />
                <stop offset='95%' stopColor='var(--chart-1)' stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id='gradUsers' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='5%' stopColor='var(--chart-2)' stopOpacity={0.8} />
                <stop offset='95%' stopColor='var(--chart-2)' stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='month' tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ReferenceArea fill='var(--chart-4)' fillOpacity={0.08} label='Peak Season' x1='Oct' x2='Dec' />
            <ReferenceLine label='Avg' stroke='var(--chart-5)' strokeDasharray='5 5' y={3000} />
            <ChartTooltip content={tooltipContent} />
            <ChartLegend content={legendContent} />
            <Area dataKey='sessions' fill='url(#gradSessions)' fillOpacity={1} stroke='var(--chart-1)' strokeWidth={2} type='monotone' />
            <Area dataKey='users' fill='url(#gradUsers)' fillOpacity={1} stroke='var(--chart-2)' strokeWidth={2} type='monotone' />
            <Brush dataKey='month' height={BRUSH_STYLE.height} stroke='var(--chart-2)' />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
export default AreaChartWidget
