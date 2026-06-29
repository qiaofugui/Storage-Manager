<template>
  <n-tabs :value="activeTab" type="segment" animated size="small" @update:value="emit('tab-change', $event)">
    <n-tab-pane v-for="tab in tabs" :key="tab.name" :name="tab.name">
      <template #tab>
        <span class="inline-flex items-center gap-1.5">
          <span>{{ tab.label }}</span>
          <n-badge :value="counts[tab.name] || 0" :max="999" color="grey" />
        </span>
      </template>
    </n-tab-pane>
  </n-tabs>
</template>

<script setup>
defineProps({
  activeTab: {
    type: String,
    required: true
  },
  counts: {
    type: Object,
    default: () => ({})
  }
})

const tabs = [
  { name: 'localStorage', label: 'localStorage' },
  { name: 'sessionStorage', label: 'sessionStorage' },
  { name: 'cookie', label: 'cookie' }
]

const emit = defineEmits(['tab-change', 'update:activeTab'])
</script>
