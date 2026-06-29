<template>
  <n-modal v-model:show="visible" :mask-closable="false">
    <n-card :style="{ width: '95%', maxWidth: UI_CONFIG.MODAL_MAX_WIDTH, maxHeight: UI_CONFIG.MODAL_MAX_HEIGHT }"
      content-class="!pb-0" :bordered="false" size="medium" role="dialog" aria-modal="true">
      <template #header>
        <div class="flex min-w-0 items-center gap-3">
          <span class="shrink-0 text-base font-medium">{{ editingItem ? '编辑数据项' : '新增数据项' }}</span>
          <div class="pl-4 flex items-center">
            <div class="text-sm">键：</div>
            <n-input
              v-model:value="formData.key"
              class="min-w-0 flex-1"
              placeholder="请输入键名"
              size="small"
              :disabled="!!editingItem"
            />
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

      <n-form :model="formData" label-placement="top">
        <n-form-item label="值" :show-label="false" path="value">
          <div class="w-full" :style="{ height: UI_CONFIG.EDITOR_HEIGHT, border: '1px solid #e0e0e6' }">
            <Suspense>
              <template #default>
                <JsonEditorVue3 :key="editorKey" v-model="parsedValue" :options="editorOptions"
                  style="height: 100%;" />
              </template>
              <template #fallback>
                <div class="flex items-center justify-center h-full">
                  <n-spin size="medium" />
                </div>
              </template>
            </Suspense>
          </div>
        </n-form-item>
      </n-form>

      <template #footer>
        <n-space justify="space-between">
          <n-space>
            <n-button @click="resetValue">重置</n-button>
            <n-button @click="formatValue">格式化</n-button>
          </n-space>
          <n-space>
            <n-button @click="handleClose">取消</n-button>
            <n-button type="primary" @click="handleSave" :disabled="saving">保存</n-button>
          </n-space>
        </n-space>
      </template>
    </n-card>
  </n-modal>
</template>

<script setup>
import { computed, ref, watch, nextTick, Suspense, defineAsyncComponent } from 'vue'
import { useJsonEditor } from '../composables/useJsonEditor.js'
import { useIcons } from '../composables/useIcons.js'
import { safeJsonParse } from '../utils/performance.js'
import { UI_CONFIG, TOOLTIP_CONFIG } from '../constants/index.js'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  editingItem: {
    type: Object,
    default: null
  },
  formData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:show', 'save', 'close'])

// 动态导入 JsonEditorVue3 以减少初始包大小
const JsonEditorVue3 = defineAsyncComponent({
  loader: () => import('json-editor-vue3'),
  loadingComponent: NSpin,
  delay: 200,
  timeout: 10000
})

// 使用 composables
const {
  hasValidationError,
  currentRawText,
  message,
  createEditorOptions,
  parseValue,
  stringifyValue,
  validateJsonValue,
  formatJsonValue
} = useJsonEditor()

const { CloseIcon } = useIcons()

const visible = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// 状态管理
const saving = ref(false)
const editorOptions = ref(createEditorOptions())
const parsedValue = ref('')
const editorKey = ref(0)
const originalValue = ref(null)
const originalKey = ref(null)

// 添加标记防止循环更新
const isUpdatingFromFormData = ref(false)
const isUpdatingFromParsedValue = ref(false)

// 同步机制优化
const syncParsedValueFromFormData = () => {
  if (!isUpdatingFromParsedValue.value) {
    isUpdatingFromFormData.value = true
    parsedValue.value = parseValue(props.formData.value)
    nextTick(() => {
      isUpdatingFromFormData.value = false
    })
  }
}

const syncFormDataFromParsedValue = () => {
  if (!isUpdatingFromFormData.value) {
    isUpdatingFromParsedValue.value = true
    props.formData.value = stringifyValue(parsedValue.value)
    nextTick(() => {
      isUpdatingFromParsedValue.value = false
    })
  }
}

// 监听器
watch(() => props.formData.value, syncParsedValueFromFormData, { immediate: true })
watch(parsedValue, syncFormDataFromParsedValue, { deep: true })

// 当模态框显示状态变化时，正确加载数据
watch(() => props.show, (show) => {
  if (show) {
    // 保存原始值
    if (props.editingItem) {
      originalValue.value = props.editingItem.value
      originalKey.value = props.editingItem.key
    } else {
      originalValue.value = ''
      originalKey.value = ''
    }

    // 初始化原始文本
    currentRawText.value = props.formData.value || ''

    // 根据模式处理初始化
    if (!props.editingItem) {
      props.formData.value = ''
      parsedValue.value = ''
      currentRawText.value = ''
    } else {
      // 编辑模式：正常加载数据
      syncParsedValueFromFormData()
    }
  }
}, { immediate: true })

// 当editingItem变化时，更新原始值
watch(() => props.editingItem, (newItem) => {
  if (props.show && newItem) {
    originalValue.value = newItem.value
    originalKey.value = newItem.key
  }
}, { immediate: true })

// 格式化值
const formatValue = () => {
  formatJsonValue(parsedValue.value, (newValue) => {
    parsedValue.value = newValue
  }, true)
}

// 验证JSON格式 - 使用静默模式
const validateValue = (silent = false) => {
  return validateJsonValue(parsedValue.value, true, silent)
}

// 重置值
const resetValue = async () => {
  // 禁用所有监听器
  isUpdatingFromFormData.value = true
  isUpdatingFromParsedValue.value = true

  if (props.editingItem) {
    // 编辑模式：重置到保存的原始值
    props.formData.key = originalKey.value
    props.formData.value = originalValue.value

    await nextTick()
    parsedValue.value = parseValue(originalValue.value)
    message.success('已重置到原始值')
  } else {
    // 新增模式：重置键名和值为空
    props.formData.key = ''
    props.formData.value = ''

    await nextTick()
    parsedValue.value = ''  // 设置为空字符串
    currentRawText.value = ''  // 清空原始文本
    message.success('已重置表单')
  }

  // 强制重新渲染编辑器组件
  editorKey.value++

  // 短暂延迟后恢复监听器
  setTimeout(() => {
    isUpdatingFromFormData.value = false
    isUpdatingFromParsedValue.value = false
  }, 100)
}

const handleClose = () => {
  emit('close')
}

const handleSave = async () => {
  // 验证必填字段
  if (!props.formData.key || props.formData.key.trim() === '') {
    message.error('键名不能为空')
    return
  }

  // 如果没有验证错误，进行常规验证
  if (!hasValidationError.value) {
    // 静默验证JSON格式 - 不显示"格式正确"消息
    if (!validateValue(true)) {
      return
    }
  }
  // 如果有验证错误，我们会在保存逻辑中特殊处理

  saving.value = true
  try {
    let finalValue = ''

    // 特殊处理：如果编辑器有验证错误，检查是否可以作为字符串保存
    if (hasValidationError.value && currentRawText.value && currentRawText.value.trim() !== '') {
      const rawText = currentRawText.value.trim()

      // 检查是否是简单字符串（不是JSON但可以作为字符串值）
      const quotedString = `"${rawText}"`
      const quotedParsed = safeJsonParse(quotedString)

      if (quotedParsed !== null) {
        // 这是一个有效的字符串，使用原始文本作为字符串值
        finalValue = rawText
        message.success('已将输入作为字符串值保存')
      } else {
        // 真正的格式错误，不能保存
        message.error('JSON格式错误，请参考编辑器右下角的错误提示')
        return
      }
    } else {
      // 没有验证错误，使用正常的转换逻辑
      finalValue = stringifyValue(parsedValue.value)

      // 兜底处理：如果转换失败但有原始输入，使用原始输入
      if ((finalValue === '' || finalValue === null || finalValue === undefined) &&
        currentRawText.value && currentRawText.value.trim() !== '') {
        finalValue = currentRawText.value.trim()
      }
    }

    props.formData.value = finalValue
    await emit('save')
    // 保存成功的消息由父组件的 useStorage 显示
  } catch (error) {
    message.error('保存失败：' + error.message)
  } finally {
    saving.value = false
  }
}
</script>
