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

    <n-dropdown trigger="hover" :options="dropdownOptions" @select="handleDropdownSelect">
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

const emit = defineEmits(['add', 'edit-all', 'paste', 'clear', 'refresh'])

// 使用统一的图标系统
const {
  PlusIcon,
  EditIcon,
  ClipboardIcon,
  RefreshIcon,
  TrashIcon,
  MoreIcon
} = useIcons()

// 下拉菜单选项
const dropdownOptions = [
  {
    label: '清除所有数据',
    key: 'clear',
    icon: () => h(TrashIcon),
  }
]

// 处理下拉菜单选择
const handleDropdownSelect = (key) => {
  if (key === 'clear') {
    emit('clear')
  }
}
</script>
