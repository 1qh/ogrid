/** biome-ignore-all lint/suspicious/noEmptyBlockStatements: intentional empty catch */
/* oxlint-disable import/no-unassigned-import */
'use client'
import type { GridConfig } from 'ogrid'
import { Button } from '@a/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@a/ui/toggle-group'
import { atom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import dynamic from 'next/dynamic'
import { Grid, useGridConfig, useGridReset } from 'ogrid'
import 'ogrid/styles.css'
import { useMemo } from 'react'
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
import ToggleGroupWidget from '~/widgets/toggle-group'
const BarChartWidget = dynamic(async () => import('~/widgets/bar-chart'), { ssr: false })
const SparklineWidget = dynamic(async () => import('~/widgets/sparkline'), { ssr: false })
const AreaChartWidget = dynamic(async () => import('~/widgets/area-chart'), { ssr: false })
const LineChartWidget = dynamic(async () => import('~/widgets/line-chart'), { ssr: false })
const PieChartWidget = dynamic(async () => import('~/widgets/pie-chart'), { ssr: false })
const RadialChartWidget = dynamic(async () => import('~/widgets/radial-chart'), { ssr: false })
const defaultConfig: GridConfig = {
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
const chartsOnlyConfig: GridConfig = {
  cols: 12,
  gap: 24,
  layout: [
    { fill: true, i: 'chart', w: 6 },
    { fill: true, i: 'areachart', w: 6 },
    { fill: true, i: 'sparkline', w: 4 },
    { fill: true, i: 'linechart', w: 4 },
    { fill: true, i: 'piechart', w: 4 },
    { fill: true, i: 'radialchart', w: 6 },
    { i: 'kpi', w: 6 }
  ]
}
const compactConfig: GridConfig = {
  cols: 12,
  gap: 8,
  layout: [
    { i: 'kpi', w: 12 },
    { i: 'stats', w: 12 },
    { i: 'progress', w: 6 },
    { i: 'badges', w: 6 },
    { i: 'timeline', w: 12 },
    { i: 'table', w: 12 },
    { i: 'accordion', w: 12 }
  ],
  rowHeight: 40
}
const presets: Record<string, GridConfig> = {
  charts: chartsOnlyConfig,
  compact: compactConfig,
  default: defaultConfig
}
const editingAtom = atom(false)
const presetAtom = atomWithStorage('ogrid-poc-preset', 'default')
const savedConfigAtom = atomWithStorage<GridConfig | null>('ogrid-poc-config', null)
const LiveConfig = () => {
  const config = useGridConfig()
  if (!config) return <span className='text-xs text-muted-foreground'>measuring...</span>
  return (
    <span className='font-mono text-xs text-muted-foreground'>
      {config.layout?.length ?? 0} items · {String(config.cols ?? 24)} cols · {String(config.gap ?? 16)}px gap
    </span>
  )
}
const ResetButton = () => {
  const reset = useGridReset()
  if (!reset) return null
  return (
    <Button onClick={reset} size='sm' variant='outline'>
      Reset
    </Button>
  )
}
const Page = () => {
  const [editing, setEditing] = useAtom(editingAtom)
  const [preset, setPreset] = useAtom(presetAtom)
  const [savedConfig, setSavedConfig] = useAtom(savedConfigAtom)
  const config = useMemo(() => savedConfig ?? presets[preset] ?? defaultConfig, [savedConfig, preset])
  const presetValue = useMemo(() => [preset], [preset])
  return (
    <div className='flex flex-col gap-4 p-4'>
      <div className='flex flex-wrap items-center gap-3'>
        <Button onClick={() => setEditing(p => !p)} size='sm' variant={editing ? 'default' : 'outline'}>
          {editing ? 'Done' : 'Customize'}
        </Button>
        {editing ? <ResetButton /> : null}
        {savedConfig ? (
          <Button onClick={() => setSavedConfig(null)} size='sm' variant='ghost'>
            Clear saved
          </Button>
        ) : null}
        <ToggleGroup
          onValueChange={v => {
            const val = v[0]
            if (!val) return
            setPreset(val)
            setSavedConfig(null)
          }}
          size='sm'
          value={presetValue}
          variant='outline'>
          <ToggleGroupItem value='default'>Full</ToggleGroupItem>
          <ToggleGroupItem value='charts'>Charts</ToggleGroupItem>
          <ToggleGroupItem value='compact'>Compact</ToggleGroupItem>
        </ToggleGroup>
        <LiveConfig />
        {savedConfig ? <span className='text-xs text-primary'>● saved</span> : null}
      </div>
      <Grid.Panel />
      <Grid config={config} editable={editing} onConfigChange={setSavedConfig}>
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
    </div>
  )
}
export default Page
