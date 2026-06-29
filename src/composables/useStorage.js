import { ref, computed } from 'vue'
import { useMessageManager } from './useMessageManager.js'
import { StorageManager } from '../utils/storage.js'
import { debounce } from '../utils/performance.js'
import { DEBOUNCE_DELAYS, STORAGE_TYPE_LIST } from '../constants/index.js'

const { getAll, setItem, removeItem, clear, setBatch, hasItem } = StorageManager

export function useStorage () {
  const { message } = useMessageManager()

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

  // 计算属性
  const filteredData = computed(() => {
    let filtered = data.value.filter(item => item.type === activeTab.value)

    if (searchQuery.value.trim()) {
      const query = searchQuery.value.toLowerCase().trim()
      filtered = filtered.filter(item => {
        const keyField = activeTab.value === 'cookie' ? item.name : item.key
        return keyField.toLowerCase().includes(query) ||
          item.value.toLowerCase().includes(query)
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

  const refreshCounts = async () => {
    const counts = { ...storageCounts.value }

    await Promise.all(STORAGE_TYPE_LIST.map(async (storageType) => {
      try {
        const items = await getAll(storageType)
        counts[storageType] = items.length
      } catch (error) {
        console.error(`刷新 ${storageType} 数量失败:`, error)
      }
    }))

    storageCounts.value = counts
  }

  // 刷新数据 - 减少不必要的刷新成功消息
  const refreshData = async (showMessage = false, refreshAllCounts = false) => {
    loading.value = true
    try {
      const storageData = await getAll(activeTab.value)
      data.value = storageData
      updateStorageCount(activeTab.value, storageData)
      if (refreshAllCounts) {
        await refreshCounts()
      }
      if (showMessage) {
        message.success('数据已刷新')
      }
    } catch (error) {
      console.error('刷新数据失败:', error)
      message.error(`刷新失败: ${error.message}`)
    } finally {
      loading.value = false
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
      message.success('删除成功')
    } catch (error) {
      console.error('删除失败:', error)
      message.error(`删除失败: ${error.message}`)
    }
  }

  // 清除所有数据
  const clearAll = async () => {
    try {
      await clear(activeTab.value)
      await refreshData(false, true)
      message.success('清除成功')
    } catch (error) {
      console.error('清除失败:', error)
      message.error(`清除失败: ${error.message}`)
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
        message.success('已清除当前页面全部数据')
        return
      }

      const failedTypes = failedResults.map(item => item.type).join('、')
      message.warning(`部分数据清除失败: ${failedTypes}`)
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
      message.error('请输入键名')
      return false
    }

    try {
      // 如果是新增模式，检查键名是否重复
      if (!isEditing) {
        const exists = await hasItem(activeTab.value, key)
        if (exists) {
          message.error(`键名 "${key}" 已存在，请使用编辑功能修改现有数据项或更换键名`)
          return false
        }
      }

      await setItem(activeTab.value, key, value, options)
      await refreshData(false, true)
      message.success(isEditing ? '修改成功' : '添加成功')
      return true
    } catch (error) {
      console.error('保存失败:', error)
      message.error(`保存失败: ${error.message}`)
      return false
    }
  }

  // 批量保存数据
  const saveAllData = async (jsonData) => {
    try {
      const result = await setBatch(activeTab.value, jsonData, true)
      await refreshData(false, true)

      if (result.rollbackPerformed) {
        message.error('批量保存失败，已恢复原始数据')
      } else if (result.success === result.total) {
        message.success(`批量保存成功，共保存 ${result.success} 条数据`)
      } else {
        message.warning(`部分保存成功，成功 ${result.success}/${result.total} 条`)
      }
      return true
    } catch (error) {
      console.error('批量保存失败:', error)
      message.error(`批量保存失败: ${error.message}`)
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
        ? '已复制到剪贴板'
        : `已复制数据项 "${activeTab.value === 'cookie' ? item.name : item.key}" 到剪贴板`

      message.success(successMessage)
    } catch (error) {
      console.error('复制失败:', error)
      message.error('复制失败')
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
