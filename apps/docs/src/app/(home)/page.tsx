/** biome-ignore-all lint/correctness/useUniqueElementIds: recharts SVG */
/* oxlint-disable react-perf/jsx-no-jsx-as-prop, react-perf/jsx-no-new-object-as-prop */
'use client'
import type { GridConfig } from 'ogrid'
import { Bubble } from 'levitato'
import { Moon, Settings, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import dynamic from 'next/dynamic'
import { Grid } from 'ogrid'
import 'ogrid/styles.css'
import { useState } from 'react'
import Accordion from '@/widgets/accordion'
import AsyncTable from '@/widgets/async-table'
import Avatars from '@/widgets/avatars'
import Badges from '@/widgets/badges'
import CalendarWidget from '@/widgets/calendar'
import CheckboxWidget from '@/widgets/checkbox'
import DataTableWidget from '@/widgets/data-table'
import FormWidget from '@/widgets/form'
import KpiCard from '@/widgets/kpi-card'
import LayoutSwitchWidget from '@/widgets/layout-switch'
import ProgressBars from '@/widgets/progress-bars'
import Prose from '@/widgets/prose'
import ScrollContent from '@/widgets/scroll-content'
import Separator from '@/widgets/separator'
import StatsGrid from '@/widgets/stats-grid'
import TabsPanel from '@/widgets/tabs-panel'
import TextWidget from '@/widgets/text-widget'
import Timeline from '@/widgets/timeline'
import ToggleGroupWidget from '@/widgets/toggle-group'

const BarChartWidget = dynamic(async () => import('@/widgets/bar-chart'), { ssr: false })
const SparklineWidget = dynamic(async () => import('@/widgets/sparkline'), { ssr: false })
const AreaChartWidget = dynamic(async () => import('@/widgets/area-chart'), { ssr: false })
const LineChartWidget = dynamic(async () => import('@/widgets/line-chart'), { ssr: false })
const PieChartWidget = dynamic(async () => import('@/widgets/pie-chart'), { ssr: false })
const RadialChartWidget = dynamic(async () => import('@/widgets/radial-chart'), { ssr: false })
const config: GridConfig = {
  layout: [
    { fill: true, i: 'chart', w: 12 },
    { i: 'kpi', w: 12 },
    { fill: true, i: 'areachart', w: 12 },
    { i: 'progress', w: 12 },
    { i: 'table', w: 16 },
    { i: 'stats', w: 8 },
    { fill: true, i: 'scroll', w: 12 },
    { i: 'timeline', w: 12 },
    { fill: true, i: 'sparkline', w: 8 },
    { fill: true, i: 'linechart', w: 8 },
    { fill: true, i: 'piechart', w: 8 },
    { i: 'text', w: 12 },
    { i: 'layoutswitch', w: 12 },
    { i: 'async', w: 12 },
    { i: 'accordion', w: 12 },
    { i: 'badges', w: 8 },
    { i: 'calendar', w: 8 },
    { i: 'checkbox', w: 8 },
    { i: 'form', w: 12 },
    { i: 'separator', w: 8 },
    { i: 'tabs', w: 12 },
    { i: 'toggles', w: 8 },
    { i: 'avatars', w: 8 },
    { fill: true, i: 'radialchart', w: 8 },
    { i: 'prose', w: 12 }
  ]
}
const Page = () => {
  const [editing, setEditing] = useState(false)
  const { setTheme, theme } = useTheme()
  return (
    <div className='px-4 py-4'>
      <Grid config={config} editable={editing} id='poc' persist>
        <BarChartWidget key='chart' />
        <KpiCard key='kpi' />
        <AreaChartWidget key='areachart' />
        <ProgressBars key='progress' />
        <DataTableWidget key='table' />
        <StatsGrid key='stats' />
        <ScrollContent key='scroll' />
        <Timeline key='timeline' />
        <SparklineWidget key='sparkline' />
        <LineChartWidget key='linechart' />
        <PieChartWidget key='piechart' />
        <TextWidget key='text' />
        <LayoutSwitchWidget key='layoutswitch' />
        <AsyncTable key='async' />
        <Accordion key='accordion' />
        <Badges key='badges' />
        <CalendarWidget key='calendar' />
        <CheckboxWidget key='checkbox' />
        <FormWidget key='form' />
        <Separator key='separator' />
        <TabsPanel key='tabs' />
        <ToggleGroupWidget key='toggles' />
        <Avatars key='avatars' />
        <RadialChartWidget key='radialchart' />
        <Prose key='prose' />
      </Grid>
      <Bubble
        icon={<Settings className='size-4' />}
        title='Grid'
        trailing={
          <button
            className='rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground'
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            type='button'>
            {theme === 'dark' ? <Sun className='size-4' /> : <Moon className='size-4' />}
          </button>
        }>
        <div className='flex flex-col gap-2 px-4 py-3 text-sm'>
          <button
            className='rounded-md border px-3 py-2 text-left hover:bg-muted'
            onClick={() => setEditing(p => !p)}
            type='button'>
            {editing ? 'Exit edit mode' : 'Enter edit mode'}
          </button>
          <p className='text-xs text-muted-foreground'>Drag, resize, swap tiles in edit mode.</p>
        </div>
      </Bubble>
    </div>
  )
}
export default Page
