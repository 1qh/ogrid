import type { NextConfig } from 'next'
import { resolve } from 'node:path'
const config: NextConfig = {
  transpilePackages: ['@a/ui', 'ogrid'],
  turbopack: { root: resolve(import.meta.dirname, '../..') }
}
export default config
