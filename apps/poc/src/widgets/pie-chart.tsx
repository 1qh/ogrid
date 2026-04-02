'use client'
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Pie, PieChart, ResponsiveContainer } from 'recharts'
const data = [
    { fill: 'var(--chart-1)', name: 'Chrome', value: 275 },
    { fill: 'var(--chart-2)', name: 'Safari', value: 200 },
    { fill: 'var(--chart-3)', name: 'Firefox', value: 187 },
    { fill: 'var(--chart-4)', name: 'Edge', value: 173 },
    { fill: 'var(--chart-5)', name: 'Other', value: 90 }
  ],
  tooltipContent = <ChartTooltipContent />,
  legendContent = <ChartLegendContent />,
  PieChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Pie Chart</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <PieChart>
            <ChartTooltip content={tooltipContent} />
            <ChartLegend content={legendContent} />
            <Pie data={data} dataKey='value' nameKey='name' />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
export default PieChartWidget
