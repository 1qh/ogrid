'use client'
import { Calendar } from '@a/ui/calendar'
import { useState } from 'react'
const CalendarWidget = () => {
  const [date, setDate] = useState<Date | undefined>(() => new Date())
  return (
    <>
      <span className='text-sm font-medium'>Calendar</span>
      <div className='flex justify-center'>
        <Calendar mode='single' onSelect={setDate} selected={date} />
      </div>
    </>
  )
}
export default CalendarWidget
