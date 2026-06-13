import type { Metadata } from 'next'
import { cn } from '@a/ui'
import { mono, sans } from './fonts'
import './global.css'
import './extras.css'
import { Providers } from './providers'

const metadata: Metadata = {
  title: 'ogrid'
}
const Layout = ({ children }: LayoutProps<'/'>) => (
  // biome-ignore lint/nursery/noUndeclaredClasses: Tailwind v4 generates these utilities on demand from @import 'tailwindcss'; scanner can't see on-demand utilities (biome #9156)
  <html className={cn('font-sans tracking-[-0.02em]', sans.variable, mono.variable)} lang='en' suppressHydrationWarning>
    {/* biome-ignore lint/nursery/noUndeclaredClasses: Tailwind v4 generates these utilities on demand from @import 'tailwindcss'; scanner can't see on-demand utilities (biome #9156) */}
    <body className='flex flex-col min-h-screen antialiased'>
      <Providers>{children}</Providers>
    </body>
  </html>
)
export { metadata }
export default Layout
