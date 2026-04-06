import { defineConfig } from 'tsdown'
export default defineConfig({
  clean: true,
  copy: ['src/styles.css'],
  deps: { neverBundle: ['react', 'react-dom'] },
  dts: true,
  entry: ['src/index.ts'],
  format: ['esm']
})
