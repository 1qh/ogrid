/* oxlint-disable import/no-unassigned-import */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
const metadata: Metadata = {
  title: 'ogrid poc'
}
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang='en' suppressHydrationWarning>
    <body className='bg-background text-foreground antialiased'>{children}</body>
  </html>
)
export { metadata }
export default RootLayout
