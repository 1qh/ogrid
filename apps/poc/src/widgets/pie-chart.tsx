'use client'
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@a/ui/chart'
import { Cell, Label, Pie, PieChart, ResponsiveContainer } from 'recharts'
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
  tooltipContent = <ChartTooltipContent />,
  legendContent = <ChartLegendContent />,
  PieChartWidget = () => (
    <div className='flex h-full flex-col gap-2'>
      <span className='text-sm font-medium'>Browser & Device Share</span>
      <span className='text-xs text-muted-foreground'>Nested donut with total center label</span>
      <div className='min-h-0 flex-1'>
        <ResponsiveContainer height='100%' width='100%'>
          <PieChart>
            <ChartTooltip content={tooltipContent} />
            <ChartLegend content={legendContent} />
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
        </ResponsiveContainer>
      </div>
    </div>
  )
export default PieChartWidget
