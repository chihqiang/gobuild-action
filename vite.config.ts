import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    target: 'node22',
    outDir: 'dist',
    sourcemap: false,
    minify: false,
    rollupOptions: {
      external: [...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
    },
  },
});
