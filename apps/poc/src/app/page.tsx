/* oxlint-disable import/no-unassigned-import */
'use client'
import type { GridConfig } from 'ogrid'
import dynamic from 'next/dynamic'
import { Grid } from 'ogrid'
import 'ogrid/styles.css'
import Accordion from '~/widgets/accordion'
import AsyncTable from '~/widgets/async-table'
import Avatars from '~/widgets/avatars'
import Badges from '~/widgets/badges'
import CalendarWidget from '~/widgets/calendar'
import CheckboxWidget from '~/widgets/checkbox'
import DataTableWidget from '~/widgets/data-table'
import FormWidget from '~/widgets/form'
import KpiCard from '~/widgets/kpi-card'
import LayoutSwitchWidget from '~/widgets/layout-switch'
import ProgressBars from '~/widgets/progress-bars'
import Prose from '~/widgets/prose'
import ScrollContent from '~/widgets/scroll-content'
import Separator from '~/widgets/separator'
import StatsGrid from '~/widgets/stats-grid'
import TabsPanel from '~/widgets/tabs-panel'
import TextWidget from '~/widgets/text-widget'
import Timeline from '~/widgets/timeline'
import ToggleGroup from '~/widgets/toggle-group'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false }),
  SparklineWidget = dynamic(async () => import('~/widgets/sparkline'), { ssr: false }),
  AreaChartWidget = dynamic(async () => import('~/widgets/area-chart'), { ssr: false }),
  LineChartWidget = dynamic(async () => import('~/widgets/line-chart'), { ssr: false }),
  PieChartWidget = dynamic(async () => import('~/widgets/pie-chart'), { ssr: false }),
  RadialChartWidget = dynamic(async () => import('~/widgets/radial-chart'), { ssr: false }),
  CARD = 'rounded-lg border bg-card p-3',
  grid: GridConfig = {
    layout: [
      { i: 'chart', w: 12, fill: true, className: CARD },
      { i: 'kpi', w: 12, className: CARD },
      { i: 'areachart', w: 12, fill: true, className: CARD },
      { i: 'progress', w: 12, className: CARD },
      { i: 'table', w: 16, className: CARD },
      { i: 'stats', w: 8, className: CARD },
      { i: 'scroll', w: 12, fill: true, className: CARD },
      { i: 'timeline', w: 12, className: CARD },
      { i: 'sparkline', w: 8, fill: true, className: CARD },
      { i: 'linechart', w: 8, fill: true, className: CARD },
      { i: 'piechart', w: 8, fill: true, className: CARD },
      { i: 'text', w: 12, className: CARD },
      { i: 'layoutswitch', w: 12, className: CARD },
      { i: 'async', w: 12, className: CARD },
      { i: 'accordion', w: 12, className: CARD },
      { i: 'badges', w: 8, className: CARD },
      { i: 'calendar', w: 8, className: CARD },
      { i: 'checkbox', w: 8, className: CARD },
      { i: 'form', w: 12, className: CARD },
      { i: 'separator', w: 8, className: CARD },
      { i: 'tabs', w: 12, className: CARD },
      { i: 'toggles', w: 8, className: CARD },
      { i: 'avatars', w: 8, className: CARD },
      { i: 'radialchart', w: 8, fill: true, className: CARD },
      { i: 'prose', w: 12, className: CARD }
    ]
  },
  Page = () => (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex items-center gap-4'>
        <span className='text-sm font-medium'>ogrid — Package Test (25 items)</span>
        <Grid.Panel />
      </div>
      <Grid config={grid}>
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
        <ToggleGroup key='toggles' />
        <Avatars key='avatars' />
        <RadialChartWidget key='radialchart' />
        <Prose key='prose' />
      </Grid>
    </div>
  )
export default Page
