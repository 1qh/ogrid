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
  grid: GridConfig = {
    layout: [
      { i: 'chart', w: 12, fill: true },
      { i: 'kpi', w: 12 },
      { i: 'areachart', w: 12, fill: true },
      { i: 'progress', w: 12 },
      { i: 'table', w: 16 },
      { i: 'stats', w: 8 },
      { i: 'scroll', w: 12, fill: true },
      { i: 'timeline', w: 12 },
      { i: 'sparkline', w: 8, fill: true },
      { i: 'linechart', w: 8, fill: true },
      { i: 'piechart', w: 8, fill: true },
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
      { i: 'radialchart', w: 8, fill: true },
      { i: 'prose', w: 12 }
    ]
  },
  Page = () => (
    <>
      <Grid.Panel />
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
    </>
  )
export default Page
