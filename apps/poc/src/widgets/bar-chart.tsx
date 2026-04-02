'use client'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
const data = [
    { desktop: 186, month: 'Jan' },
    { desktop: 305, month: 'Feb' },
    { desktop: 237, month: 'Mar' },
    { desktop: 73, month: 'Apr' },
    { desktop: 209, month: 'May' },
    { desktop: 214, month: 'Jun' }
  ],
  BarChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Bar Chart</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey='month' />
            <YAxis />
            <Bar dataKey='desktop' fill='var(--chart-1)' />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
export default BarChartWidget
