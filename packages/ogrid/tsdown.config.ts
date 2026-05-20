import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  copy: ['src/styles.css'],
  deps: { neverBundle: ['bun'] },
  dts: true,
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'dist'
})
