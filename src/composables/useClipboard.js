import { useMessageManager } from './useMessageManager.js'
import { StorageManager } from '../utils/storage.js'
import { tryJsonParse } from '../utils/performance.js'
import { MESSAGE_CONFIG } from '../constants/index.js'
import { useI18n } from '../i18n/index.js'

const { getAll, setBatch } = StorageManager

export function useClipboard (activeTab, refreshData) {
  const { message } = useMessageManager()
  const { t } = useI18n()

  const createCookieDuplicateKey = (key, value) => {
    if (value && typeof value === 'object') {
      if (value.key) {
        return value.key
      }

      const name = value.name || key
      return [name, value.domain || '', value.path || '/'].join('|')
    }

    return [key, '', '/'].join('|')
  }

  // 粘贴数据
  const pasteData = async () => {
    try {
      // 检查剪贴板API是否可用
      if (!navigator.clipboard) {
        message.error(t('messageClipboardNotSupported'))
        return
      }

      // message.info(t('messageReadClipboard'))

      const text = await navigator.clipboard.readText()

      if (!text || text.trim() === '') {
        message.warning(t('messageClipboardEmpty'))
        return
      }

      // 使用安全的JSON解析
      const parseResult = tryJsonParse(text)

      if (!parseResult.success) {
        message.error(t('messageInvalidClipboardJson'))
        return
      }

      const jsonData = parseResult.value
      if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
        message.error(t('messageInvalidJsonObject', { example: '{"key": "value"}' }))
        return
      }

      const dataCount = Object.keys(jsonData).length
      if (dataCount === 0) {
        message.warning(t('messageJsonObjectEmpty'))
        return
      }

      // 检查重复项
      await checkAndPasteData(jsonData)

    } catch (error) {
      console.error('粘贴操作错误:', error)
      handlePasteError(error)
    }
  }

  // 检查并粘贴数据
  const checkAndPasteData = async (jsonData) => {
    try {
      // 检查重复的键名
      const duplicateKeys = []
      const keys = Object.keys(jsonData)
      const currentItems = await getAll(activeTab.value)
      const existingKeys = new Set(
        currentItems.map(item => activeTab.value === 'cookie'
          ? createCookieDuplicateKey(item.name, item)
          : item.key
        )
      )

      for (const key of keys) {
        const value = jsonData[key]
        const duplicateKey = activeTab.value === 'cookie' ? createCookieDuplicateKey(key, value) : key
        if (existingKeys.has(duplicateKey)) {
          duplicateKeys.push(activeTab.value === 'cookie' && value && typeof value === 'object'
            ? value.name || key
            : key
          )
        }
      }

      // 如果有重复项，提示用户
      if (duplicateKeys.length > 0) {
        const duplicateList = duplicateKeys.join('", "')
        message.error(
          t('messageDuplicateKeys', { keys: duplicateList, storageType: activeTab.value }),
          {
            closable: true,
            duration: MESSAGE_CONFIG.ERROR_DURATION + 1000
          }
        )
        return
      }

      // 没有重复项，执行粘贴
      const result = await setBatch(activeTab.value, jsonData, false)
      await refreshData()

      if (result.success === result.total) {
        message.success(t('messagePasteSuccess', { count: result.success }))
      } else {
        message.warning(t('messagePastePartial', { success: result.success, total: result.total }))
      }

    } catch (error) {
      console.error('粘贴数据失败:', error)
      message.error(t('messagePasteFailed', { message: error.message }))
    }
  }

  // 处理粘贴错误
  const handlePasteError = (error) => {
    if (error.name === 'NotAllowedError') {
      message.error(t('messageNoClipboardAccess'))
    } else if (error.name === 'NotFoundError') {
      message.error(t('messageClipboardEmpty'))
    } else {
      message.error(t('messagePasteFailed', { message: error.message || 'Unknown error' }))
    }
  }

  return {
    pasteData
  }
}
