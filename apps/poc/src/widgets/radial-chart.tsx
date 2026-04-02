'use client'
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts'
const POLAR_DOMAIN = [0, 100] as const,
  data = [{ fill: 'var(--chart-1)', value: 72 }],
  RadialChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Radial Progress</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <RadialBarChart data={data} endAngle={90 + 360 * 0.72} innerRadius={80} outerRadius={110} startAngle={90}>
            <PolarAngleAxis angleAxisId={0} domain={POLAR_DOMAIN} tick={false} type='number' />
            <RadialBar cornerRadius={10} dataKey='value' />
            <text
              className='fill-foreground text-3xl font-bold'
              dominantBaseline='middle'
              textAnchor='middle'
              x='50%'
              y='50%'>
              72%
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
export default RadialChartWidget
