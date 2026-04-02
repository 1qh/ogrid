'use client'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
const kpis = [
    {
      change: '+20.1%',
      data: [{ v: 30 }, { v: 35 }, { v: 28 }, { v: 40 }, { v: 38 }, { v: 45 }],
      label: 'Total Revenue',
      up: true,
      value: '$45,231'
    },
    {
      change: '+180.1%',
      data: [{ v: 10 }, { v: 15 }, { v: 22 }, { v: 18 }, { v: 28 }, { v: 35 }],
      label: 'Subscriptions',
      up: true,
      value: '+2,350'
    },
    {
      change: '+201',
      data: [{ v: 50 }, { v: 48 }, { v: 55 }, { v: 52 }, { v: 58 }, { v: 57 }],
      label: 'Active Now',
      up: true,
      value: '573'
    }
  ],
  MiniChart = ({ data }: { data: { v: number }[] }) => (
    <div className='h-8 w-16'>
      <ResponsiveContainer height='100%' width='100%'>
        <AreaChart data={data}>
          <Area
            dataKey='v'
            fill='var(--chart-1)'
            fillOpacity={0.2}
            stroke='var(--chart-1)'
            strokeWidth={1.5}
            type='monotone'
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  ),
  KpiCard = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Key Metrics</span>
      <div className='flex flex-col gap-4'>
        {kpis.map(k => (
          <div className='flex items-center justify-between' key={k.label}>
            <div className='flex flex-col gap-0.5'>
              <span className='text-sm text-muted-foreground'>{k.label}</span>
              <span className='text-2xl font-bold'>{k.value}</span>
            </div>
            <div className='flex items-center gap-2'>
              <MiniChart data={k.data} />
              <span className='text-sm text-primary'>{k.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
export default KpiCard
