import { ref } from 'vue'
import { useMessageManager } from './useMessageManager.js'
import { safeJsonStringify, tryJsonParse } from '../utils/performance.js'
import { EDITOR_CONFIG } from '../constants/index.js'
import { useI18n } from '../i18n/index.js'

export function useJsonEditor () {
  const { message, silentMessage, forceMessage } = useMessageManager()
  const { t } = useI18n()
  const hasValidationError = ref(false)
  const currentRawText = ref('')

  // 优化的 JSON 编辑器配置选项 - 适配 json-editor-vue3
  const createEditorOptions = () => ({
    mode: 'code', // 代码模式
    modes: EDITOR_CONFIG.MODES, // 可用模式
    search: true, // 启用搜索
    history: true, // 启用历史记录
    indentation: 2, // 缩进
    enableTransform: false,
    enableSort: false,
    onError: (error) => {
      console.error('JSON Editor Error:', error)
      hasValidationError.value = true
      message.error(t('messageInvalidJsonData'))
    },
    onChange: () => {
      // 当JSON发生变化时的回调
      hasValidationError.value = false
    },
    onChangeText: (text) => {
      // 保存原始文本
      currentRawText.value = text || ''

      // 当文本内容变化时验证格式
      if (text && text.trim()) {
        const trimmedText = text.trim()

        // 尝试解析JSON - 编辑器在 Code 模式下期望有效的JSON
        const parsed = tryJsonParse(trimmedText)

        // 特殊处理：对于简单字符串，需要用引号包围才是有效JSON
        if (!parsed.success) {
          // 检查是否是未加引号的简单字符串
          const quotedParsed = tryJsonParse(JSON.stringify(trimmedText))
          if (quotedParsed.success) {
            // 这是一个未加引号的字符串，设置为错误但不显示消息
            hasValidationError.value = true
          } else {
            // 真正的JSON格式错误
            hasValidationError.value = true
          }
        } else {
          // JSON解析成功
          hasValidationError.value = false
        }
      } else {
        hasValidationError.value = false
      }
    }
  })

  // 解析字符串值为JSON对象或保持原样
  const parseValue = (value) => {
    // 处理空值情况 - 返回空字符串让编辑器显示为空内容，而不是{}
    if (value === null || value === undefined || value === '') {
      return ''
    }

    // 如果已经是对象，直接返回
    if (typeof value === 'object') {
      return value
    }

    // 如果是字符串，尝试解析为JSON
    if (typeof value === 'string') {
      const trimmedValue = value.trim()

      // 先检查是否是简单的JSON值（数字、布尔值、null）
      if (trimmedValue === 'null') return null
      if (trimmedValue === 'true') return true
      if (trimmedValue === 'false') return false

      // 检查是否是数字
      if (/^-?\d+(\.\d+)?$/.test(trimmedValue)) {
        const num = Number(trimmedValue)
        if (!isNaN(num)) return num
      }

      // 只有当字符串明显是JSON结构时才尝试解析
      if ((trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
        (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))) {
        const parsed = tryJsonParse(trimmedValue)
        return parsed.success ? parsed.value : value
      }

      // 对于普通字符串，直接返回原值
      return value
    }

    // 其他类型直接返回
    return value
  }

  // 将值转换为字符串
  const stringifyValue = (value) => {
    if (value === null || value === undefined) return ''

    if (typeof value === 'string') {
      return value
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value)
    }

    return safeJsonStringify(value)
  }

  // JSON格式验证函数 - 支持静默模式
  const validateJsonValue = (value, isStringValue = true, silent = false) => {
    const messageHandler = silent ? silentMessage : message

    // 检查编辑器是否有验证错误
    if (hasValidationError.value) {
      messageHandler.error(t('messageInvalidJsonCheckInput'))
      return false
    }

    try {
      let rawValue
      if (isStringValue) {
        // 对于字符串值的验证（AddEditModal）
        rawValue = stringifyValue(value)
      } else {
        // 对于对象值的验证（EditAllModal）
        rawValue = safeJsonStringify(value)
      }

      if (!rawValue || rawValue.trim() === '' || rawValue === '{}') {
        // 静默模式下不显示"数据为空"的成功消息
        if (!silent) {
          messageHandler.success(t('messageDataEmptyValid'))
        }
        return true
      }

      // 对于字符串值，进行更宽松的验证
      if (isStringValue) {
        // 如果是简单的字符串值、数字或布尔值，直接认为是有效的
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          if (!silent) {
            messageHandler.success(t('messageDataFormatCorrect'))
          }
          return true
        }

        // 如果是对象或数组，需要验证JSON格式
        if (typeof value === 'object' && value !== null) {
          try {
            safeJsonStringify(value)
            if (!silent) {
              messageHandler.success(t('messageJsonFormatCorrect'))
            }
            return true
          } catch (error) {
            throw new Error('对象格式不正确')
          }
        }

        // 如果是null值，也认为是有效的
        if (value === null) {
          if (!silent) {
            messageHandler.success(t('messageDataFormatCorrect'))
          }
          return true
        }
      } else {
        // 严格验证JSON格式
        const trimmedValue = rawValue.trim()
        const lines = trimmedValue.split('\n').filter(line => line.trim() !== '')

        if (lines.length > 1) {
          // 如果有多行，必须是有效的JSON格式（对象或数组）
          const parsed = tryJsonParse(trimmedValue)
          if (!parsed.success) {
            throw new Error('多行内容必须是有效的JSON格式')
          }
        } else {
          // 单行也需要是有效的JSON值
          const parsed = tryJsonParse(trimmedValue)
          if (!parsed.success) {
            throw new Error('单行内容必须是有效的JSON值')
          }
        }

        // 再次验证是否可以正确序列化
        if (typeof value === 'object' && value !== null) {
          safeJsonStringify(value)
        } else {
          throw new Error('数据格式不正确')
        }
      }

      // 静默模式下不显示"JSON格式正确"的成功消息
      if (!silent) {
        messageHandler.success(t('messageJsonFormatCorrect'))
      }
      return true
    } catch (error) {
      messageHandler.error(t('messageInvalidJsonData'))
      return false
    }
  }

  // 格式化JSON - 只在用户主动触发时显示消息
  const formatJsonValue = (value, setValue, isStringValue = true, showMessage = true) => {
    try {
      if (isStringValue) {
        // 字符串值的格式化
        if (value !== null) {
          // 触发重新渲染以格式化显示
          const temp = JSON.parse(safeJsonStringify(value))
          setValue(temp)
          if (showMessage) {
            message.success(t('messageFormatSuccess'))
          }
        } else {
          if (showMessage) {
            message.error(t('messageNoFormatData'))
          }
        }
      } else {
        // 对象值的格式化
        if (typeof value === 'object') {
          // 触发重新渲染
          const temp = JSON.parse(safeJsonStringify(value))
          setValue(temp)
          if (showMessage) {
            message.success(t('messageJsonFormatSuccess'))
          }
        } else {
          if (showMessage) {
            message.error(t('messageJsonInvalidCannotFormat'))
          }
        }
      }
    } catch (error) {
      if (showMessage) {
        message.error(t('messageFormatFailed'))
      }
    }
  }

  // 验证保存数据 - 静默模式
  const validateSaveData = (data) => {
    try {
      // 获取最终要保存的数据
      const finalData = JSON.parse(safeJsonStringify(data))

      // 额外验证：确保最终数据是有效的JSON格式
      safeJsonStringify(finalData)

      return { success: true, data: finalData }
    } catch (parseError) {
      // 这里使用强制消息，因为这是保存失败的关键错误
      forceMessage.error(t('messageSaveFailedInvalidJson'))
      return { success: false, data: null }
    }
  }

  return {
    hasValidationError,
    currentRawText,
    message,
    silentMessage,
    forceMessage,
    createEditorOptions,
    parseValue,
    stringifyValue,
    validateJsonValue,
    formatJsonValue,
    validateSaveData
  }
}
