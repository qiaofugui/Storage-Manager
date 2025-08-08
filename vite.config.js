import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  plugins: [
    vue(),
    viteCommonjs(),
    viteStaticCopy({
      targets: [
        {
          src: 'locales/*',
          dest: ''
        },
        {
          src: 'manifest.json',
          dest: ''
        },
        {
          src: 'icons/*',
          dest: 'icons'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      input: {
        popup: 'index.html'
      },
      output: {
        manualChunks: {
          'naive-ui': ['naive-ui'],
          'json-editor': ['json-editor-vue3'],
          'vue-vendor': ['vue']
        }
      }
    },
    sourcemap: false,
    minify: 'esbuild'
  },
  optimizeDeps: {
    include: ['naive-ui', 'json-editor-vue3', 'vue']
  }
})