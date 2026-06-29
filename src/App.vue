<template>
  <n-config-provider class="h-full" :theme-overrides="theme_overrides" :locale="naiveLocale" :date-locale="naiveDateLocale">
    <n-message-provider>
      <div class="h-full bg-gray-50">
        <StorageManager />
      </div>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import StorageManager from './components/StorageManager.vue'
import { useI18n } from './i18n/index.js'

const { naiveLocale, naiveDateLocale } = useI18n()

const theme_overrides = {
  common: {
    primaryColor: '#3F9EFF',
    primaryColorHover: '#3F9EFF',
    primaryColorPressed: '#3F9EFF',
    primaryColorSuppl: '#3F9EFF'
  }
}
</script>
