import { defineConfig } from 'tsup'

export default defineConfig((options) => ({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm', 'iife'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: !options.watch, // Only clean on full builds
  outDir: 'dist',
  globalName: 'bylight',
  watch: options.watch, // Enable watch mode when the --watch flag is used
  // Customize the IIFE output
  esbuildOptions(options, context) {
    if (context.format === 'iife') {
      delete options["outdir"]
      options.outfile = 'dist/index.global.js'
      options.footer = {
        js: 'window.bylight = bylight.default || bylight;',
      }
    }
  },
}))