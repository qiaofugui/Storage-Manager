<template>
  <n-tabs :value="activeTab" type="line" size="small" @update:value="emit('tab-change', $event)">
    <n-tab-pane name="localStorage" tab="localStorage" />
    <n-tab-pane name="sessionStorage" tab="sessionStorage" />
    <!-- <n-tab-pane name="cookie" tab="cookie" /> -->
  </n-tabs>
</template>

<script setup>
defineProps({
  activeTab: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['tab-change', 'update:activeTab'])
</script>
