'use client'
import { useEffect, useRef } from 'react'
import { Pane } from 'tweakpane'

interface GridSettings {
  cols: number
  editing: boolean
  gap: number
  rowHeight: number
}
interface TweakPanelProps {
  initial: GridSettings
  onChange: (settings: GridSettings) => void
}
const TweakPanel = ({ initial, onChange }: TweakPanelProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  const initialRef = useRef(initial)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const state = { ...initialRef.current }
    const initialState = { ...initialRef.current }
    const pane = new Pane({ container: host, title: 'Grid' })
    pane.addBinding(state, 'editing', { label: 'edit mode' })
    pane.addBinding(state, 'cols', { label: 'columns', max: 48, min: 1, step: 1 })
    pane.addBinding(state, 'gap', { label: 'gap', max: 48, min: 0, step: 1 })
    pane.addBinding(state, 'rowHeight', { label: 'row height', max: 120, min: 10, step: 1 })
    pane.addButton({ title: 'Reset to defaults' }).on('click', () => {
      Object.assign(state, initialState)
      pane.refresh()
    })
    pane.on('change', () => onChangeRef.current({ ...state }))
    return () => pane.dispose()
  }, [])
  return <div className='[&_.tp-dfwv]:!w-full' ref={ref} />
}
export type { GridSettings }
export default TweakPanel
