import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteCommonjs } from '@originjs/vite-plugin-commonjs'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      imports: [
        'vue',
        {
          'naive-ui': [
            'dateZhCN',
            'NButton',
            'NIcon',
            'NPopconfirm',
            'NSpin',
            'NTooltip',
            'useMessage',
            'zhCN'
          ]
        }
      ],
      dts: false
    }),
    Components({
      resolvers: [NaiveUiResolver()],
      dts: false
    }),
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
    modulePreload: {
      resolveDependencies: (filename, deps) => deps.filter(dep => !dep.includes('json-editor'))
    },
    rollupOptions: {
      input: {
        popup: 'index.html'
      },
      output: {
        manualChunks: {
          'json-editor': ['json-editor-vue3'],
          'vue-vendor': ['vue']
        }
      }
    },
    sourcemap: false,
    minify: 'esbuild'
  },
  resolve: {
    alias: {
      'vue-i18n': 'vue-i18n/dist/vue-i18n.runtime.esm-bundler.js'
    }
  },
  optimizeDeps: {
    include: ['json-editor-vue3', 'vue']
  }
})
