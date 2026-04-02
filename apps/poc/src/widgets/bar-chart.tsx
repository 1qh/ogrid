'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceArea, ReferenceLine, XAxis, YAxis } from 'recharts'
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
  config: ChartConfig = {
    desktop: { color: 'var(--chart-1)', label: 'Desktop' },
    mobile: { color: 'var(--chart-2)', label: 'Mobile' }
  },
  BarChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Desktop vs Mobile Traffic</span>
      <span className='text-xs text-muted-foreground'>Monthly visitors with target zone</span>
      <div className='min-h-0 flex-1'>
        <ChartContainer className='h-full w-full' style={{ aspectRatio: 'auto' }} config={config}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} />
            <XAxis dataKey='month' tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <ReferenceArea fill='var(--chart-3)' fillOpacity={0.1} y1={200} y2={350} />
            <ReferenceLine label='Target' stroke='var(--chart-3)' strokeDasharray='3 3' y={250} />
            <ChartTooltip content={<ChartTooltipContent indicator='line' />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey='desktop' fill='var(--color-desktop)' radius={[4, 4, 0, 0]}>
              <LabelList className='fill-foreground' dataKey='desktop' fontSize={10} position='top' />
            </Bar>
            <Bar dataKey='mobile' fill='var(--color-mobile)' radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  )
export default BarChartWidget
