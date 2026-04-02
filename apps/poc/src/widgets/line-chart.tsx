'use client'
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
const data = [
    { month: 'Jan', profit: 2400, revenue: 4000 },
    { month: 'Feb', profit: 1398, revenue: 3000 },
    { month: 'Mar', profit: 9800, revenue: 2000 },
    { month: 'Apr', profit: 3908, revenue: 2780 },
    { month: 'May', profit: 4800, revenue: 1890 },
    { month: 'Jun', profit: 3800, revenue: 2390 }
  ],
  tooltipContent = <ChartTooltipContent />,
  legendContent = <ChartLegendContent />,
  LineChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Line Chart</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='month' />
            <YAxis />
            <ReferenceLine label='Target' stroke='var(--chart-3)' strokeDasharray='3 3' y={4000} />
            <ChartTooltip content={tooltipContent} />
            <ChartLegend content={legendContent} />
            <Line dataKey='revenue' stroke='var(--chart-1)' type='monotone' />
            <Line dataKey='profit' stroke='var(--chart-2)' type='monotone' />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
export default LineChartWidget
