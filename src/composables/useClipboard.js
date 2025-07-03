import { useMessageManager } from './useMessageManager.js'
import { setBatchStorage, hasStorageItem } from '../utils/storage.js'
import { safeJsonParse } from '../utils/performance.js'
import { MESSAGE_CONFIG } from '../constants/index.js'

export function useClipboard (activeTab, refreshData) {
  const { message } = useMessageManager()

  // 粘贴数据
  const pasteData = async () => {
    try {
      // 检查剪贴板API是否可用
      if (!navigator.clipboard) {
        message.error('您的浏览器不支持剪贴板API，请手动复制数据')
        return
      }

      message.info('正在读取剪贴板数据...')

      const text = await navigator.clipboard.readText()

      if (!text || text.trim() === '') {
        message.warning('剪贴板为空，请先复制一些JSON数据')
        return
      }

      // 使用安全的JSON解析
      const jsonData = safeJsonParse(text)

      if (!jsonData) {
        message.error('JSON格式错误，请检查剪贴板内容')
        return
      }

      if (typeof jsonData !== 'object' || jsonData === null || Array.isArray(jsonData)) {
        message.error('粘贴的数据必须是JSON对象格式，例如: {"key": "value"}')
        return
      }

      const dataCount = Object.keys(jsonData).length
      if (dataCount === 0) {
        message.warning('JSON对象为空，没有数据可以粘贴')
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

      for (const key of keys) {
        const exists = await hasStorageItem(activeTab.value, key)
        if (exists) {
          duplicateKeys.push(key)
        }
      }

      // 如果有重复项，提示用户
      if (duplicateKeys.length > 0) {
        const duplicateList = duplicateKeys.join('", "')
        message.error(
          `发现重复的键名: "${duplicateList}"。这些键已存在于${activeTab.value}中，请手动调整数据后再粘贴，或使用批量编辑功能覆盖现有数据。`,
          {
            closable: true,
            duration: MESSAGE_CONFIG.ERROR_DURATION + 1000
          }
        )
        return
      }

      // 没有重复项，执行粘贴
      const result = await setBatchStorage(activeTab.value, jsonData, false)
      await refreshData()

      if (result.success === result.total) {
        message.success(`成功粘贴 ${result.success} 条新数据`)
      } else {
        message.warning(`粘贴了 ${result.success}/${result.total} 条数据，部分数据可能失败`)
      }

    } catch (error) {
      console.error('粘贴数据失败:', error)
      message.error(`粘贴失败: ${error.message}`)
    }
  }

  // 处理粘贴错误
  const handlePasteError = (error) => {
    if (error.name === 'NotAllowedError') {
      message.error('没有剪贴板访问权限，请允许访问剪贴板或重新安装扩展')
    } else if (error.name === 'NotFoundError') {
      message.error('剪贴板为空或无法访问')
    } else {
      message.error(`粘贴失败: ${error.message || '未知错误'}`)
    }
  }

  return {
    pasteData
  }
}