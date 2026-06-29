import { defineAsyncComponent } from 'vue'

export const JsonEditorVue3 = defineAsyncComponent({
  loader: () => import('json-editor-vue3'),
  loadingComponent: NSpin,
  delay: 200,
  timeout: 10000
})
