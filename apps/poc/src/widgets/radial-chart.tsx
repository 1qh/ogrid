'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts'
const POLAR_DOMAIN = [0, 100] as const,
  data = [
    { fill: 'var(--color-cpu)', metric: 'CPU', value: 89 },
    { fill: 'var(--color-memory)', metric: 'Memory', value: 65 },
    { fill: 'var(--color-disk)', metric: 'Disk', value: 42 }
  ],
  config: ChartConfig = {
    cpu: { color: 'var(--chart-3)', label: 'CPU' },
    disk: { color: 'var(--chart-1)', label: 'Disk' },
    memory: { color: 'var(--chart-2)', label: 'Memory' }
  },
  RadialChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>System Health</span>
      <span className='text-xs text-muted-foreground'>Multi-ring radial with axis and tooltip</span>
      <div className='min-h-0 flex-1'>
        <ChartContainer className='h-full w-full' config={config}>
          <RadialBarChart cx='50%' cy='50%' data={data} innerRadius={30} outerRadius={100}>
            <PolarAngleAxis angleAxisId={0} domain={POLAR_DOMAIN} tick={false} type='number' />
            <PolarRadiusAxis angle={90} tick={{ fontSize: 10 }} type='category' />
            <ChartTooltip content={<ChartTooltipContent nameKey='metric' />} />
            <RadialBar cornerRadius={6} dataKey='value' label={{ fill: 'var(--foreground)', fontSize: 11, position: 'insideStart' }} />
            <text
              className='fill-foreground text-lg font-bold'
              dominantBaseline='middle'
              textAnchor='middle'
              x='50%'
              y='50%'>
              Health
            </text>
          </RadialBarChart>
        </ChartContainer>
      </div>
    </div>
  )
export default RadialChartWidget
