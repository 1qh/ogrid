/* oxlint-disable jsx-no-new-object-as-prop */
'use client'
import { PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts'

const POLAR_DOMAIN = [0, 100] as const
const data = [
  { fill: 'var(--chart-3)', metric: 'CPU', value: 89 },
  { fill: 'var(--chart-2)', metric: 'Memory', value: 65 },
  { fill: 'var(--chart-1)', metric: 'Disk', value: 42 }
]
const RadialChartWidget = () => (
  <div className='flex h-full flex-col gap-2'>
    <span className='text-sm font-medium'>System Health</span>
    <span className='text-xs text-muted-foreground'>Multi-ring radial with axis and tooltip</span>
    <div className='min-h-0 flex-1'>
      <ResponsiveContainer height='100%' width='100%'>
        <RadialBarChart cx='50%' cy='50%' data={data} innerRadius={30} outerRadius={100}>
          <PolarAngleAxis angleAxisId={0} domain={POLAR_DOMAIN} tick={false} type='number' />
          <PolarRadiusAxis angle={90} tick={{ fontSize: 10 }} type='category' />
          <Tooltip />
          <RadialBar
            cornerRadius={6}
            dataKey='value'
            label={{ fill: 'var(--foreground)', fontSize: 11, position: 'insideStart' }}
          />
          <text
            className='fill-foreground text-lg font-bold'
            dominantBaseline='middle'
            textAnchor='middle'
            x='50%'
            y='50%'>
            Health
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  </div>
)
export default RadialChartWidget
