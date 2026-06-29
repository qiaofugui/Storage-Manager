<template>
  <n-modal v-model:show="visible" :mask-closable="false">
    <n-card :style="{ width: '95%', maxWidth: UI_CONFIG.MODAL_MAX_WIDTH, maxHeight: '560px' }"
      :bordered="false" size="medium" role="dialog" aria-modal="true">
      <template #header>
        <div class="flex min-w-0 items-center gap-3">
          <span class="shrink-0 text-base font-medium">{{ `批量编辑 ${storageType}` }}</span>
          <div class="pl-4 flex items-center">
            <n-alert type="info" show-icon>
              <template #icon>
                <n-icon>
                  <InfoIcon />
                </n-icon>
              </template>
              请编辑{{ storageType }}数据。保存后将覆盖当前所有{{ storageType }}数据。
            </n-alert>
          </div>
        </div>
      </template>

      <template #header-extra>
        <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
          <template #trigger>
            <n-button quaternary circle size="small" @click="handleClose">
              <template #icon>
                <n-icon>
                  <CloseIcon />
                </n-icon>
              </template>
            </n-button>
          </template>
          关闭
        </n-tooltip>
      </template>

      <div class="w-full" :style="{ height: UI_CONFIG.EDITOR_HEIGHT, border: '1px solid #e0e0e6' }">
        <Suspense>
          <template #default>
            <JsonEditorVue3 v-model="jsonData" :options="editorOptions" style="height: 100%;" />
          </template>
          <template #fallback>
            <div class="flex items-center justify-center h-full">
              <n-spin size="medium" />
            </div>
          </template>
        </Suspense>
      </div>

      <template #footer>
        <n-space justify="space-between">
          <n-space>
            <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
              <template #trigger>
                <n-button @click="() => loadCurrentData(true)" :loading="reloading">
                  <template #icon>
                    <n-icon>
                      <ReloadIcon />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              重新加载当前数据
            </n-tooltip>
            <n-button @click="formatJson">格式化</n-button>
          </n-space>
          <n-space>
            <n-button @click="handleClose">取消</n-button>
            <n-popconfirm @positive-click="handleSave" positive-text="保存" negative-text="取消">
              <template #trigger>
                <n-button type="primary" :disabled="saving">保存</n-button>
              </template>
              确定要覆盖所有{{ storageType }}数据吗？此操作不可撤销。
            </n-popconfirm>
          </n-space>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup>
import { computed, watch, ref, Suspense } from 'vue'
import { useJsonEditor } from '../composables/useJsonEditor.js'
import { useIcons } from '../composables/useIcons.js'
import { deepClone } from '../utils/performance.js'
import { UI_CONFIG, TOOLTIP_CONFIG } from '../constants/index.js'
import { JsonEditorVue3 } from './JsonEditorAsync.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  data: {
    type: Array,
    default: () => []
  },
  storageType: {
    type: String,
    default: 'localStorage'
  }
})

const emit = defineEmits(['update:show', 'save', 'close'])

// 使用 composables
const {
  hasValidationError,
  message,
  createEditorOptions,
  parseValue,
  validateJsonValue,
  formatJsonValue,
  validateSaveData
} = useJsonEditor()

const { CloseIcon, InfoIcon, ReloadIcon } = useIcons()

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// 状态管理
const jsonData = ref({})
const saving = ref(false)
const reloading = ref(false)
const editorOptions = ref(createEditorOptions())

const createCookieEditorLabel = (item, usedLabels) => {
  const baseLabel = item.domain || item.path
    ? `${item.name} @ ${item.domain || 'host'}${item.path || '/'}`
    : item.name
  let label = baseLabel
  let index = 2

  while (usedLabels.has(label)) {
    label = `${baseLabel} #${index}`
    index++
  }

  usedLabels.add(label)
  return label
}

// 加载当前数据到JSON编辑器
const loadCurrentData = async (showMessage = false) => {
  if (showMessage) {
    reloading.value = true
  }

  try {
    if (props.data.length > 0) {
      const dataObj = {}
      const usedCookieLabels = new Set()
      props.data.forEach(item => {
        if (props.storageType === 'cookie') {
          const label = createCookieEditorLabel(item, usedCookieLabels)
          dataObj[label] = {
            key: item.key,
            name: item.name,
            value: item.value,
            domain: item.domain,
            path: item.path,
            secure: item.secure,
            httpOnly: item.httpOnly,
            hostOnly: item.hostOnly,
            sameSite: item.sameSite,
            expirationDate: item.expirationDate,
            storeId: item.storeId,
            partitionKey: item.partitionKey
          }
          return
        }

        // 使用 parseValue 来解析值
        dataObj[item.key] = parseValue(item.value)
      })

      // 使用深度克隆确保数据独立性
      jsonData.value = deepClone(dataObj)

      if (showMessage) {
        message.success(`已重新加载 ${props.data.length} 条${props.storageType}数据`)
      }
    } else {
      jsonData.value = {}
      if (showMessage) {
        message.info(`当前${props.storageType}为空`)
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    message.error(`加载数据失败: ${error.message}`)
  } finally {
    if (showMessage) {
      reloading.value = false
    }
  }
}

// 当模态框打开时加载数据
watch(() => props.show, (show) => {
  if (show) {
    loadCurrentData()
  }
}, { immediate: true })

// 当数据变化时也重新加载
watch(() => props.data, () => {
  if (props.show) {
    loadCurrentData()
  }
}, { deep: true })

const handleClose = () => {
  emit('close')
}

const handleSave = async () => {
  // 检查编辑器是否有验证错误（编辑器右下角的错误提示）
  if (hasValidationError.value) {
    message.error('JSON格式错误，请参考编辑器右下角的错误提示')
    return
  }

  // 静默验证JSON格式 - 不显示"格式正确"消息
  if (!validateJson(true)) {
    return
  }

  saving.value = true
  try {
    // 验证数据是否为有效对象
    if (typeof jsonData.value !== 'object' || !jsonData.value) {
      message.error('数据格式不正确，请检查后重试')
      return
    }

    // 使用 composable 的验证保存数据函数
    const result = validateSaveData(jsonData.value)
    if (!result.success) {
      return
    }

    // 验证每个键值对
    const validationErrors = validateAllKeyValuePairs(result.data)
    if (validationErrors.length > 0) {
      message.error('数据验证失败：' + validationErrors.join('; '))
      return
    }

    await emit('save', result.data)
    // 保存成功的消息由父组件的 useStorage 显示
  } catch (error) {
    console.error('保存失败:', error)
    message.error('保存失败：数据格式错误 - ' + error.message)
  } finally {
    saving.value = false
  }
}

// 验证所有键值对
const validateAllKeyValuePairs = (data) => {
  const validationErrors = []

  Object.entries(data).forEach(([key, value]) => {
    // 检查键名
    if (!key || key.trim() === '') {
      validationErrors.push('存在空的键名')
      return
    }

    if (props.storageType === 'cookie') {
      const cookieName = value && typeof value === 'object' && value.name ? value.name : key
      if (!cookieName || String(cookieName).trim() === '') {
        validationErrors.push('存在空的 Cookie 名称')
        return
      }
    }

    // 检查值是否可以正确序列化
    try {
      const serializedValue = JSON.stringify(value)
      // 尝试重新解析以确保数据完整性
      JSON.parse(serializedValue)
    } catch (error) {
      validationErrors.push(`键 "${key}" 的值无法序列化为JSON: ${error.message}`)
    }
  })

  return validationErrors
}

const formatJson = () => {
  formatJsonValue(jsonData.value, (newValue) => {
    jsonData.value = newValue
  }, false)
}

const validateJson = (silent = false) => {
  return validateJsonValue(jsonData.value, false, silent)
}
</script>

<style scoped>
:deep(.n-alert .n-alert-body) {
  padding: 6px 6px 6px 36px;
}
:deep(.n-alert .n-alert__icon) {
  margin: 4px 0 0 4px;
}
:deep(.n-alert .n-alert-body .n-alert-body__content) {
  font-size: 12px;
}
</style>
