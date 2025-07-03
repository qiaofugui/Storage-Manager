import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

import {
  create,
  // 核心组件
  NConfigProvider,
  NMessageProvider,
  // 基础UI组件
  NButton,
  NCard,
  NTabs,
  NTabPane,
  NDataTable,
  NInput,
  NModal,
  NForm,
  NFormItem,
  NSpace,
  NIcon,
  NAlert,
  NTooltip,
  NDropdown,
  NPopconfirm,
  NSpin
} from 'naive-ui'

// 创建Naive UI实例
const naive = create({
  components: [
    NConfigProvider,
    NMessageProvider,
    NButton,
    NCard,
    NTabs,
    NTabPane,
    NDataTable,
    NInput,
    NModal,
    NForm,
    NFormItem,
    NSpace,
    NIcon,
    NAlert,
    NTooltip,
    NDropdown,
    NPopconfirm,
    NSpin
  ]
})

const app = createApp(App)
app.use(naive)
app.mount('#app')