/* oxlint-disable import/no-unassigned-import */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import DarkToggle from './dark-toggle'
const metadata: Metadata = {
    title: 'ogrid poc'
  },
  RootLayout = ({ children }: { children: ReactNode }) => (
    <html lang='en' suppressHydrationWarning>
      <body className='bg-background text-foreground antialiased'>
        <DarkToggle />
        {children}
      </body>
    </html>
  )
export { metadata }
export default RootLayout
