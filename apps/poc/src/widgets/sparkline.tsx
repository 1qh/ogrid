'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Area, AreaChart, ReferenceLine, XAxis, YAxis } from 'recharts'
const data = [
    { d: '03-16', v: 40 },
    { d: '03-17', v: 30 },
    { d: '03-18', v: 45 },
    { d: '03-19', v: 50 },
    { d: '03-20', v: 49 },
    { d: '03-21', v: 60 },
    { d: '03-22', v: 70 },
    { d: '03-23', v: 91 },
    { d: '03-24', v: 80 },
    { d: '03-25', v: 75 },
    { d: '03-26', v: 85 },
    { d: '03-27', v: 90 },
    { d: '03-28', v: 88 },
    { d: '03-29', v: 95 },
    { d: '03-30', v: 100 },
    { d: '03-31', v: 92 },
    { d: '04-01', v: 98 }
  ],
  AVG = Math.round(data.reduce((s, d) => s + d.v, 0) / data.length),
  config: ChartConfig = {
    v: { color: 'var(--chart-1)', label: 'DAU' }
  },
  Sparkline = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Sparkline Trend</span>
      <span className='text-xs text-muted-foreground'>17-day DAU with average line</span>
      <div className='min-h-0 flex-1'>
        <ChartContainer className='h-full w-full' config={config}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id='sparkGrad' x1='0' x2='0' y1='0' y2='1'>
                <stop offset='5%' stopColor='var(--color-v)' stopOpacity={0.4} />
                <stop offset='95%' stopColor='var(--color-v)' stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey='d' hide />
            <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
            <ReferenceLine stroke='var(--chart-3)' strokeDasharray='3 3' y={AVG} />
            <ChartTooltip content={<ChartTooltipContent hideLabel indicator='line' />} />
            <Area
              dataKey='v'
              dot={{ fill: 'var(--color-v)', r: 2 }}
              fill='url(#sparkGrad)'
              stroke='var(--color-v)'
              strokeWidth={2}
              type='monotone'
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <div className='flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>Last 17 days (avg: {String(AVG)})</span>
        <span className='font-medium text-primary'>+145%</span>
      </div>
    </div>
  )
export default Sparkline
