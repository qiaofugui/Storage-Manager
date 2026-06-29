<template>
  <n-data-table class="h-full" :columns="columns" :data="data" :pagination="paginationConfig" :loading="loading"
    size="small" striped flex-height />
</template>

<script setup>
import { h, computed, ref, watch } from 'vue'
import { PAGINATION_CONFIG, TOOLTIP_CONFIG } from '../constants/index.js'
import { useIcons } from '../composables/useIcons.js'
import { useI18n } from '../i18n/index.js'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  },
  activeTab: {
    type: String,
    default: ''
  },
  searchQuery: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['copy', 'delete', 'edit'])
const { t } = useI18n()

// 使用统一的图标系统
const { CopyIcon, EditIcon, DeleteIcon } = useIcons()

// 分页状态管理
const currentPage = ref(1)
const pageSize = ref(PAGINATION_CONFIG.DEFAULT_PAGE_SIZE)

// 监听数据变化，自动调整页码
watch(
  () => props.data.length,
  (newLength) => {
    const totalPages = Math.ceil(newLength / pageSize.value)
    if (currentPage.value > totalPages && totalPages > 0) {
      currentPage.value = totalPages
    }
  }
)

watch(
  () => [props.activeTab, props.searchQuery],
  () => {
    currentPage.value = 1
  }
)

// 响应式分页配置
const paginationConfig = computed(() => {
  return {
    page: currentPage.value,
    pageSize: pageSize.value,
    itemCount: props.data.length,
    showSizePicker: true,
    pageSizes: PAGINATION_CONFIG.PAGE_SIZES,
    onUpdatePage: (page) => {
      currentPage.value = page
    },
    onUpdatePageSize: (size) => {
      pageSize.value = size
      currentPage.value = 1 // 重置到第一页
    },
    prefix: ({ itemCount }) => {
      return t('tablePageTotal', { count: itemCount })
    }
  }
})

const columns = computed(() => [
  {
    title: t('tableIndex'),
    key: 'index',
    width: 50,
    render: (row, index) => {
      return (currentPage.value - 1) * pageSize.value + index + 1
    }
  },
  {
    title: t('tableKey'),
    key: 'key',
    width: 200,
    ellipsis: {
      tooltip: true
    },
    render: (row) => row.name || row.key
  },
  {
    title: t('tableValue'),
    key: 'value',
    ellipsis: {
      tooltip: true
    },
    render: (row) => {
      const maxLength = 100
      const value = String(row.value ?? '')
      if (value && value.length > maxLength) {
        return value.substring(0, maxLength) + '...'
      }
      return value
    }
  },
  {
    title: t('tableActions'),
    key: 'actions',
    width: 140,
    render: (row) => {
      return h('div', { class: 'flex gap-2' }, [
        h(NTooltip, {
          trigger: 'hover',
          delay: TOOLTIP_CONFIG.DELAY
        }, {
          trigger: () => h(NButton, {
            size: 'small',
            type: 'warning',
            quaternary: true,
            onClick: () => emit('edit', row)
          }, {
            icon: () => h(NIcon, null, { default: () => h(EditIcon) })
          }),
          default: () => t('tooltipEditItem')
        }),
        h(NTooltip, {
          trigger: 'hover',
          delay: TOOLTIP_CONFIG.DELAY
        }, {
          trigger: () => h(NButton, {
            size: 'small',
            type: 'info',
            quaternary: true,
            onClick: () => emit('copy', row)
          }, {
            icon: () => h(NIcon, null, { default: () => h(CopyIcon) })
          }),
          default: () => t('tooltipCopyItem')
        }),
        h(NPopconfirm, {
          onPositiveClick: () => emit('delete', row),
          positiveText: t('buttonDelete'),
          negativeText: t('buttonCancel')
        }, {
          trigger: () => h(NTooltip, {
            trigger: 'hover',
            delay: TOOLTIP_CONFIG.DELAY
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
              quaternary: true
            }, {
              icon: () => h(NIcon, null, { default: () => h(DeleteIcon) })
            }),
            default: () => t('tooltipDeleteItem')
          }),
          default: () => t('confirmDeleteItem', { key: row.name || row.key })
        })
      ])
    }
  }
])
</script>
