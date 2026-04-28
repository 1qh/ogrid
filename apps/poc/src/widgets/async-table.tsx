/* oxlint-disable eslint-plugin-react(forbid-component-props) */
'use client'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@a/ui/table'
import { useEffect, useState } from 'react'
const DELAY = 1500
const rows = [
  { id: 1, metric: 'Revenue', q1: '$2.1M', q2: '$2.4M', trend: '+14%' },
  { id: 2, metric: 'Expenses', q1: '$1.8M', q2: '$1.7M', trend: '-6%' },
  { id: 3, metric: 'Profit', q1: '$300k', q2: '$700k', trend: '+133%' },
  { id: 4, metric: 'Headcount', q1: '45', q2: '52', trend: '+16%' },
  { id: 5, metric: 'Churn', q1: '2.1%', q2: '1.8%', trend: '-14%' }
]
const AsyncTable = () => {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), DELAY)
    return () => clearTimeout(timer)
  }, [])
  if (!loaded)
    return (
      <div className='flex flex-col gap-2'>
        <span className='text-sm font-medium'>Async Table</span>
        <div className='flex items-center gap-2 py-4 text-sm text-muted-foreground'>
          <div className='size-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
          Loading data (1.5s)...
        </div>
      </div>
    )
  return (
    <div className='flex flex-col gap-2'>
      <span className='text-sm font-medium'>Async Table (loaded)</span>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Metric</TableHead>
            <TableHead>Q1</TableHead>
            <TableHead>Q2</TableHead>
            <TableHead>Trend</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell className='font-medium'>{r.metric}</TableCell>
              <TableCell>{r.q1}</TableCell>
              <TableCell>{r.q2}</TableCell>
              <TableCell>{r.trend}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
export default AsyncTable
