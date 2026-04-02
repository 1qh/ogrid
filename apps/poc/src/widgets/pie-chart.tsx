'use client'
import type { ChartConfig } from '@a/ui/chart'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Cell, Label, Pie, PieChart } from 'recharts'
const outerData = [
    { fill: 'var(--chart-1)', name: 'Chrome', value: 275 },
    { fill: 'var(--chart-2)', name: 'Safari', value: 200 },
    { fill: 'var(--chart-3)', name: 'Firefox', value: 187 },
    { fill: 'var(--chart-4)', name: 'Edge', value: 173 },
    { fill: 'var(--chart-5)', name: 'Other', value: 90 }
  ],
  innerData = [
    { fill: 'var(--chart-1)', name: 'Desktop', value: 580 },
    { fill: 'var(--chart-2)', name: 'Mobile', value: 290 },
    { fill: 'var(--chart-4)', name: 'Tablet', value: 55 }
  ],
  TOTAL = outerData.reduce((sum, d) => sum + d.value, 0),
  config: ChartConfig = {
    Chrome: { color: 'var(--chart-1)', label: 'Chrome' },
    Desktop: { color: 'var(--chart-1)', label: 'Desktop' },
    Edge: { color: 'var(--chart-4)', label: 'Edge' },
    Firefox: { color: 'var(--chart-3)', label: 'Firefox' },
    Mobile: { color: 'var(--chart-2)', label: 'Mobile' },
    Other: { color: 'var(--chart-5)', label: 'Other' },
    Safari: { color: 'var(--chart-2)', label: 'Safari' },
    Tablet: { color: 'var(--chart-4)', label: 'Tablet' }
  },
  PieChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Browser & Device Share</span>
      <span className='text-xs text-muted-foreground'>Nested donut with total center label</span>
      <div className='min-h-0 flex-1'>
        <ChartContainer className='h-full w-full' config={config}>
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey='name' />} />
            <ChartLegend content={<ChartLegendContent nameKey='name' />} />
            <Pie data={innerData} dataKey='value' innerRadius={30} nameKey='name' outerRadius={55}>
              {innerData.map(entry => (
                <Cell fill={entry.fill} key={entry.name} />
              ))}
            </Pie>
            <Pie data={outerData} dataKey='value' innerRadius={65} label nameKey='name' outerRadius={90}>
              {outerData.map(entry => (
                <Cell fill={entry.fill} key={entry.name} />
              ))}
              <Label
                className='fill-foreground text-2xl font-bold'
                position='center'
                value={String(TOTAL)}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  )
export default PieChartWidget
