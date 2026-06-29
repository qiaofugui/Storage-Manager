import { ref, computed } from 'vue'
import { useMessageManager } from './useMessageManager.js'
import { StorageManager } from '../utils/storage.js'
import { debounce } from '../utils/performance.js'
import { DEBOUNCE_DELAYS, STORAGE_TYPE_LIST } from '../constants/index.js'
import { useI18n } from '../i18n/index.js'

const { getAll, setItem, removeItem, clear, setBatch, hasItem } = StorageManager

export function useStorage () {
  const { message } = useMessageManager()
  const { t } = useI18n()

  // 状态管理
  const activeTab = ref('localStorage')
  const data = ref([])
  const loading = ref(false)
  const searchQuery = ref('')
  const storageCounts = ref({
    localStorage: 0,
    sessionStorage: 0,
    cookie: 0
  })
  let refreshRequestId = 0

  // 计算属性
  const filteredData = computed(() => {
    let filtered = data.value.filter(item => item.type === activeTab.value)

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(item => {
        const keyField = activeTab.value === 'cookie' ? item.name : item.key
        const keyText = String(keyField ?? '').toLowerCase()
        const valueText = String(item.value ?? '').toLowerCase()
        return keyText.includes(query) || valueText.includes(query)
      })
    }

    return filtered
  })

  // 防抖的搜索函数
  const debouncedSearch = debounce((query) => {
    searchQuery.value = query
  }, DEBOUNCE_DELAYS.SEARCH)

  const updateStorageCount = (type, items) => {
    storageCounts.value = {
      ...storageCounts.value,
      [type]: items.length
    }
  }

  const refreshCounts = async (knownItemsByType = {}) => {
    const counts = { ...storageCounts.value }

    await Promise.all(STORAGE_TYPE_LIST.map(async (storageType) => {
      try {
        const items = knownItemsByType[storageType] || await getAll(storageType)
        counts[storageType] = items.length
      } catch (error) {
        console.error(`刷新 ${storageType} 数量失败:`, error)
      }
    }))

    storageCounts.value = counts
  }

  // 刷新数据 - 减少不必要的刷新成功消息
  const refreshData = async (showMessage = false, refreshAllCounts = false) => {
    const requestId = ++refreshRequestId
    loading.value = true
    try {
      const requestedTab = activeTab.value
      const storageData = await getAll(activeTab.value)

      if (requestId !== refreshRequestId || requestedTab !== activeTab.value) {
        return
      }

      data.value = storageData
      updateStorageCount(requestedTab, storageData)
      if (refreshAllCounts) {
        await refreshCounts({ [requestedTab]: storageData })
      }
      if (showMessage) {
        message.success(t('messageRefreshSuccess'))
      }
    } catch (error) {
      if (requestId !== refreshRequestId) {
        return
      }
      console.error('刷新数据失败:', error)
      message.error(t('messageRefreshFailed', { message: error.message }))
    } finally {
      if (requestId === refreshRequestId) {
        loading.value = false
      }
    }
  }

  // 防抖的刷新函数
  const debouncedRefresh = debounce(() => refreshData(true, true), DEBOUNCE_DELAYS.REFRESH)

  // 删除项目
  const deleteItem = async (item) => {
    try {
      const itemKey = typeof item === 'object' && item !== null ? item.key : item
      const itemToDelete = activeTab.value === 'cookie' ? item : itemKey
      await removeItem(activeTab.value, itemToDelete)
      await refreshData(false, true)
      message.success(t('messageDeleteSuccess'))
    } catch (error) {
      console.error('删除失败:', error)
      message.error(t('messageDeleteFailed', { message: error.message }))
    }
  }

  // 清除所有数据
  const clearAll = async () => {
    try {
      await clear(activeTab.value)
      await refreshData(false, true)
      message.success(t('messageClearSuccess'))
    } catch (error) {
      console.error('清除失败:', error)
      message.error(t('messageClearFailed', { message: error.message }))
    }
  }

  const clearCurrentPage = async () => {
    const results = []

    loading.value = true
    try {
      for (const storageType of STORAGE_TYPE_LIST) {
        try {
          const result = await clear(storageType)
          results.push({ type: storageType, success: true, result })
        } catch (error) {
          results.push({ type: storageType, success: false, error })
        }
      }

      await refreshData(false, true)

      const failedResults = results.filter(item => !item.success)
      if (failedResults.length === 0) {
        message.success(t('messageAllPageDataCleared'))
        return
      }

      const failedTypes = failedResults.map(item => item.type).join(', ')
      message.warning(t('messageClearPartialFailed', { types: failedTypes }))
      failedResults.forEach(item => {
        console.error(`清除 ${item.type} 失败:`, item.error)
      })
    } finally {
      loading.value = false
    }
  }

  // 保存项目
  const saveItem = async (key, value, isEditing = false, options = {}) => {
    if (!key.trim()) {
      message.error(t('messageKeyRequired'))
      return false
    }

    try {
      // 如果是新增模式，检查键名是否重复
      if (!isEditing) {
        const exists = await hasItem(activeTab.value, key)
        if (exists) {
          message.error(t('messageKeyExists', { key }))
          return false
        }
      }

      await setItem(activeTab.value, key, value, options)
      await refreshData(false, true)
      message.success(isEditing ? t('messageSaveEdited') : t('messageSaveAdded'))
      return true
    } catch (error) {
      console.error('保存失败:', error)
      message.error(t('messageSaveFailed', { message: error.message }))
      return false
    }
  }

  // 批量保存数据
  const saveAllData = async (jsonData) => {
    try {
      const result = await setBatch(activeTab.value, jsonData, true)
      await refreshData(false, true)

      if (result.rollbackPerformed) {
        message.error(t('messageBatchSaveFailedRollback'))
      } else if (result.success === result.total) {
        message.success(t('messageBatchSaveSuccess', { count: result.success }))
      } else {
        message.warning(t('messageBatchSavePartial', { success: result.success, total: result.total }))
      }
      return true
    } catch (error) {
      console.error('批量保存失败:', error)
      message.error(t('messageSaveFailed', { message: error.message }))
      return false
    }
  }

  // 复制到剪贴板
  const copyToClipboard = async (item) => {
    try {
      let textToCopy

      if (typeof item === 'string') {
        textToCopy = item
      } else {
        const copyKey = item.key
        const copyValue = activeTab.value === 'cookie'
          ? {
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
          : item.value
        const copyData = { [copyKey]: copyValue }
        textToCopy = JSON.stringify(copyData, null, 2)
      }

      await navigator.clipboard.writeText(textToCopy)

      const successMessage = typeof item === 'string'
        ? t('messageCopiedGeneric')
        : t('messageCopiedItem', { key: activeTab.value === 'cookie' ? item.name : item.key })

      message.success(successMessage)
    } catch (error) {
      console.error('复制失败:', error)
      message.error(t('messageCopyFailed'))
    }
  }

  // 切换标签页
  const handleTabChange = async (newTab) => {
    activeTab.value = newTab
    searchQuery.value = '' // 切换标签页时清除搜索
    await refreshData()
  }

  return {
    // 状态
    activeTab,
    data,
    loading,
    searchQuery,
    storageCounts,
    filteredData,

    // 方法
    refreshData,
    refreshCounts,
    debouncedRefresh,
    deleteItem,
    clearAll,
    clearCurrentPage,
    saveItem,
    saveAllData,
    copyToClipboard,
    handleTabChange,
    debouncedSearch
  }
}
