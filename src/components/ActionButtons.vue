<template>
  <n-space size="small">
    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button type="primary" size="small" @click="emit('add')">
          <template #icon>
            <n-icon>
              <PlusIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      新增数据项
    </n-tooltip>

    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button size="small" @click="emit('edit-all')">
          <template #icon>
            <n-icon>
              <EditIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      批量编辑
    </n-tooltip>

    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button size="small" @click="emit('paste')">
          <template #icon>
            <n-icon>
              <ClipboardIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      粘贴数据
    </n-tooltip>

    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button size="small" @click="emit('refresh')">
          <template #icon>
            <n-icon>
              <RefreshIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      刷新数据
    </n-tooltip>

    <n-dropdown trigger="click" :options="dropdownOptions">
      <n-button size="small">
        <template #icon>
          <n-icon>
            <MoreIcon />
          </n-icon>
        </template>
      </n-button>
    </n-dropdown>
  </n-space>
</template>

<script setup>
import { h } from 'vue'
import { useIcons } from '../composables/useIcons.js'
import { TOOLTIP_CONFIG } from '../constants/index.js'

const emit = defineEmits(['add', 'edit-all', 'paste', 'clear', 'clear-current-page', 'refresh'])

// 使用统一的图标系统
const {
  PlusIcon,
  EditIcon,
  ClipboardIcon,
  RefreshIcon,
  TrashIcon,
  MoreIcon
} = useIcons()

const clearActions = [
  {
    label: '清除当前类型数据',
    eventName: 'clear',
    positiveText: '清除',
    confirmText: '确定要清除当前类型的所有数据吗？此操作不可撤销。'
  },
  {
    label: '清除页面全部数据',
    eventName: 'clear-current-page',
    positiveText: '全部清除',
    confirmText: '确定要清除页面的 localStorage、sessionStorage 和 Cookie 吗？此操作不可撤销。'
  }
]

const dropdownOptions = clearActions.map(action => ({
  type: 'render',
  key: action.eventName,
  render: () => renderClearAction(action)
}))

const handleClearConfirm = (eventName) => {
  emit(eventName)
}

const renderClearAction = (action) => {
  return h(NPopconfirm, {
    positiveText: action.positiveText,
    negativeText: '取消',
    width: 380,
    onPositiveClick: () => handleClearConfirm(action.eventName)
  }, {
    trigger: () => h('button', {
      type: 'button',
      class: 'flex h-[34px] w-full cursor-pointer items-center border-0 bg-transparent px-3 text-left text-sm text-[#333639] hover:bg-[#f3f3f5]',
      onClick: (event) => event.stopPropagation(),
      onMousedown: (event) => event.stopPropagation()
    }, [
      h('span', {
        class: 'mr-2 inline-flex'
      }, [h(TrashIcon)]),
      action.label
    ]),
    default: () => action.confirmText
  })
}
</script>
