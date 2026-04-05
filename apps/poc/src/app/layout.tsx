/* oxlint-disable import/no-unassigned-import */
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import './globals.css'
const metadata: Metadata = {
  title: 'ogrid poc'
}
const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang='en' suppressHydrationWarning>
    <body className='bg-background text-foreground antialiased'>
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        {children}
      </ThemeProvider>
    </body>
  </html>
)
export { metadata }
export default RootLayout
