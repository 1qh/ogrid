'use client'
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
const data = [
    { desktop: 186, mobile: 80, month: 'Jan' },
    { desktop: 305, mobile: 200, month: 'Feb' },
    { desktop: 237, mobile: 120, month: 'Mar' },
    { desktop: 73, mobile: 190, month: 'Apr' },
    { desktop: 209, mobile: 130, month: 'May' },
    { desktop: 214, mobile: 140, month: 'Jun' },
    { desktop: 280, mobile: 160, month: 'Jul' },
    { desktop: 320, mobile: 210, month: 'Aug' },
    { desktop: 198, mobile: 170, month: 'Sep' },
    { desktop: 250, mobile: 150, month: 'Oct' },
    { desktop: 340, mobile: 230, month: 'Nov' },
    { desktop: 290, mobile: 180, month: 'Dec' }
  ],
  BarChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Desktop vs Mobile Traffic</span>
      <span className='text-xs text-muted-foreground'>Monthly visitors with target zone</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='month' tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ReferenceArea fill='var(--chart-3)' fillOpacity={0.1} y1={200} y2={350} />
            <ReferenceLine label='Target' stroke='var(--chart-3)' strokeDasharray='3 3' y={250} />
            <Tooltip />
            <Legend />
            <Bar dataKey='desktop' fill='var(--chart-1)' radius={[4, 4, 0, 0]}>
              <LabelList className='fill-foreground' dataKey='desktop' fontSize={10} position='top' />
            </Bar>
            <Bar dataKey='mobile' fill='var(--chart-2)' radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
export default BarChartWidget
