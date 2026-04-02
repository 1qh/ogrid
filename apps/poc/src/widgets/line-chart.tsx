'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceDot, ReferenceLine, XAxis, YAxis } from 'recharts'
const data = [
    { cac: 42, month: 'Jan', profit: 2400, revenue: 4000 },
    { cac: 38, month: 'Feb', profit: 1398, revenue: 3000 },
    { cac: 51, month: 'Mar', profit: 9800, revenue: 2000 },
    { cac: 35, month: 'Apr', profit: 3908, revenue: 2780 },
    { cac: 44, month: 'May', profit: 4800, revenue: 1890 },
    { cac: 29, month: 'Jun', profit: 3800, revenue: 2390 },
    { cac: 33, month: 'Jul', profit: 5200, revenue: 3100 },
    { cac: 41, month: 'Aug', profit: 4500, revenue: 3500 },
    { cac: 36, month: 'Sep', profit: 3600, revenue: 2900 },
    { cac: 39, month: 'Oct', profit: 4100, revenue: 3200 },
    { cac: 28, month: 'Nov', profit: 6200, revenue: 3800 },
    { cac: 31, month: 'Dec', profit: 5800, revenue: 4100 }
  ],
  config: ChartConfig = {
    cac: { color: 'var(--chart-4)', label: 'CAC ($)' },
    profit: { color: 'var(--chart-2)', label: 'Profit' },
    revenue: { color: 'var(--chart-1)', label: 'Revenue' }
  },
  LineChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Revenue, Profit & CAC</span>
      <span className='text-xs text-muted-foreground'>3 metrics with dual Y-axes and annotations</span>
      <div className='min-h-0 flex-1'>
        <ChartContainer className='h-full w-full' config={config}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray='3 3' />
            <XAxis dataKey='month' tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} yAxisId='left' />
            <YAxis orientation='right' tick={{ fontSize: 12 }} yAxisId='right' />
            <ReferenceArea fill='var(--chart-3)' fillOpacity={0.08} label='Danger' y1={0} y2={2000} yAxisId='left' />
            <ReferenceLine label='Target' stroke='var(--chart-3)' strokeDasharray='3 3' y={4000} yAxisId='left' />
            <ReferenceDot fill='var(--chart-4)' label='Peak' r={6} stroke='var(--chart-4)' x='Mar' y={9800} yAxisId='left' />
            <ChartTooltip content={<ChartTooltipContent indicator='dashed' />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line activeDot={{ r: 6 }} dataKey='revenue' dot={{ r: 3 }} stroke='var(--color-revenue)' strokeWidth={2} type='monotone' yAxisId='left' />
            <Line activeDot={{ r: 6 }} dataKey='profit' dot={{ r: 3 }} stroke='var(--color-profit)' strokeWidth={2} type='monotone' yAxisId='left' />
            <Line dataKey='cac' stroke='var(--color-cac)' strokeDasharray='5 5' strokeWidth={1.5} type='monotone' yAxisId='right' />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  )
export default LineChartWidget
