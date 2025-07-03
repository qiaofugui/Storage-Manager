<template>
  <n-data-table class="h-full" :columns="columns" :data="data" :pagination="paginationConfig" :loading="loading"
    size="small" striped flex-height virtual-scroll />
</template>

<script setup>
import { h, computed, ref, watch } from 'vue'
import { NButton, NIcon, NPopconfirm, NTooltip } from 'naive-ui'
import { PAGINATION_CONFIG, TOOLTIP_CONFIG } from '../constants/index.js'
import { useIcons } from '../composables/useIcons.js'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['copy', 'delete', 'edit'])

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
      return `共 ${itemCount} 条`
    }
  }
})

const columns = computed(() => [
  {
    title: '序号',
    key: 'index',
    width: 60,
    render: (row, index) => {
      return (currentPage.value - 1) * pageSize.value + index + 1
    }
  },
  {
    title: '键',
    key: 'key',
    width: 200,
    ellipsis: {
      tooltip: true
    },
  },
  {
    title: '值',
    key: 'value',
    ellipsis: {
      tooltip: true
    },
    render: (row) => {
      const maxLength = 100
      const value = row.value
      if (value && value.length > maxLength) {
        return value.substring(0, maxLength) + '...'
      }
      return value || ''
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
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
          default: () => '编辑数据项'
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
          default: () => '复制数据项'
        }),
        h(NPopconfirm, {
          onPositiveClick: () => emit('delete', row.key),
          positiveText: '删除',
          negativeText: '取消'
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
            default: () => '删除数据项'
          }),
          default: () => `确定要删除数据项 "${row.key}" 吗？`
        })
      ])
    }
  }
])
</script>