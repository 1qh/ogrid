'use client'
import { Bubble } from 'levitato'
import { Settings } from 'lucide-react'
import { Grid, type GridConfig } from 'ogrid'
import 'ogrid/styles.css'
import Link from 'next/link'
import { useState } from 'react'
const config: GridConfig = {
  layout: [
    { i: 'a', w: 8 },
    { i: 'b', w: 8 },
    { i: 'c', w: 8 },
    { i: 'd', w: 8 }
  ]
}
const tiles = [
  { color: 'oklch(0.85 0.12 250)', id: 'a', label: 'A' },
  { color: 'oklch(0.85 0.12 100)', id: 'b', label: 'B' },
  { color: 'oklch(0.85 0.12 30)', id: 'c', label: 'C' },
  { color: 'oklch(0.85 0.12 170)', id: 'd', label: 'D' }
]
const Page = () => {
  const [editing, setEditing] = useState(false)
  return (
    <div className='flex flex-1 flex-col gap-6 px-4 py-8'>
      <div className='flex flex-col items-center gap-3 text-center'>
        <h1 className='text-5xl font-extrabold tracking-tighter'>ogrid</h1>
        <p className='text-xl text-fd-muted-foreground'>Content-aware dashboard grid for React</p>
        <code className='rounded-lg bg-fd-muted px-4 py-2 text-sm'>bun add ogrid</code>
        <Link
          className='rounded-full bg-fd-primary px-6 py-2 text-sm font-semibold text-fd-primary-foreground transition-opacity hover:opacity-90'
          href='/docs'>
          Get Started
        </Link>
      </div>
      <div className='mx-auto w-full max-w-5xl'>
        <Grid config={config} editable={editing} id='ogrid-demo' persist>
          {tiles.map(t => (
            <div
              className='flex h-full w-full items-center justify-center rounded-xl text-2xl font-bold'
              key={t.id}
              style={{ background: t.color }}>
              {t.label}
            </div>
          ))}
        </Grid>
      </div>
      <Bubble icon={<Settings className='size-4' />} title='Grid'>
        <div className='flex flex-col gap-2 px-4 py-3 text-sm'>
          <button
            className='rounded-md border px-3 py-2 text-left hover:bg-fd-muted'
            onClick={() => setEditing(p => !p)}
            type='button'>
            {editing ? 'Exit edit mode' : 'Enter edit mode'}
          </button>
          <p className='text-xs text-fd-muted-foreground'>Drag-resize tiles when edit mode is on.</p>
        </div>
      </Bubble>
    </div>
  )
}
export default Page
