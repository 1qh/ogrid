import { defineConfig } from 'tsdown'
export default defineConfig({
  clean: true,
  copy: ['src/styles.css'],
  dts: true,
  entry: ['src/index.ts'],
  format: 'esm',
  outDir: 'dist'
})
