<template>
  <n-config-provider class="h-full" :theme-overrides="theme_overrides" :locale="zhCN" :date-locale="dateZhCN">
    <n-message-provider>
      <div class="h-full bg-gray-50">
        <StorageManager />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { NConfigProvider, NMessageProvider, zhCN, dateZhCN } from 'naive-ui'
import StorageManager from './components/StorageManager.vue'

const theme_overrides = {
  common: {
    primaryColor: '#3F9EFF',
    primaryColorHover: '#3F9EFF',
    primaryColorPressed: '#3F9EFF',
    primaryColorSuppl: '#3F9EFF'
  }
}
</script>
