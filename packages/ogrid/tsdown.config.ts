import { defineConfig } from 'tsdown'
export default defineConfig({
  clean: true,
  deps: { neverBundle: ['bun'] },
  dts: true,
  copy: ['src/styles.css'],
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'dist'
})
