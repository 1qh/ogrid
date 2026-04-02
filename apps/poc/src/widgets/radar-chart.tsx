'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from 'recharts'
const data = [
    { a: 120, b: 110, c: 90, subject: 'Math' },
    { a: 98, b: 130, c: 85, subject: 'Chinese' },
    { a: 86, b: 130, c: 110, subject: 'English' },
    { a: 99, b: 100, c: 95, subject: 'Geography' },
    { a: 85, b: 90, c: 120, subject: 'Physics' },
    { a: 65, b: 85, c: 100, subject: 'History' },
    { a: 110, b: 95, c: 75, subject: 'Chemistry' },
    { a: 92, b: 115, c: 88, subject: 'Biology' }
  ],
  config: ChartConfig = {
    a: { color: 'var(--chart-1)', label: 'Alice' },
    b: { color: 'var(--chart-2)', label: 'Bob' },
    c: { color: 'var(--chart-3)', label: 'Carol' }
  },
  RadarChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Student Comparison</span>
      <span className='text-xs text-muted-foreground'>3 students across 8 subjects</span>
      <div className='min-h-0 flex-1'>
        <ChartContainer className='h-full w-full' config={config}>
          <RadarChart data={data}>
            <PolarGrid gridType='polygon' />
            <PolarAngleAxis dataKey='subject' tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 140]} tick={{ fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Radar dataKey='a' fill='var(--color-a)' fillOpacity={0.4} stroke='var(--color-a)' strokeWidth={2} />
            <Radar dataKey='b' fill='var(--color-b)' fillOpacity={0.4} stroke='var(--color-b)' strokeWidth={2} />
            <Radar dataKey='c' fill='var(--color-c)' fillOpacity={0.3} stroke='var(--color-c)' strokeDasharray='5 5' strokeWidth={1.5} />
          </RadarChart>
        </ChartContainer>
      </div>
    </div>
  )
export default RadarChartWidget
