/* oxlint-disable import/no-unassigned-import */
import { cn } from '@a/ui'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { mono, sans } from './fonts'
import { Providers } from './providers'
import './globals.css'
const metadata: Metadata = {
  title: 'ogrid poc'
}
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html className={cn('font-sans', sans.variable, mono.variable)} lang='en' suppressHydrationWarning>
    <body className='bg-background text-foreground antialiased'>
      <Providers>{children}</Providers>
    </body>
  </html>
)
export { metadata }
export default RootLayout
