import { ref, computed } from 'vue'
import { useMessageManager } from './useMessageManager.js'
import { StorageManager } from '../utils/storage.js'
import { debounce } from '../utils/performance.js'
import { DEBOUNCE_DELAYS } from '../constants/index.js'

const { getAll, setItem, removeItem, clear, setBatch, hasItem } = StorageManager

export function useStorage () {
  const { message } = useMessageManager()

  // 状态管理
  const activeTab = ref('localStorage')
  const data = ref([])
  const loading = ref(false)
  const searchQuery = ref('')

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

  // 刷新数据 - 减少不必要的刷新成功消息
  const refreshData = async (showMessage = false) => {
    loading.value = true
    try {
      const storageData = await getAll(activeTab.value)
      data.value = storageData
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
  const debouncedRefresh = debounce(() => refreshData(true), DEBOUNCE_DELAYS.REFRESH)

  // 删除项目
  const deleteItem = async (key) => {
    try {
      await removeItem(activeTab.value, key)
      await refreshData()
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
      await refreshData()
      message.success('清除成功')
    } catch (error) {
      console.error('清除失败:', error)
      message.error(`清除失败: ${error.message}`)
    }
  }

  // 保存项目
  const saveItem = async (key, value, isEditing = false) => {
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

      await setItem(activeTab.value, key, value)
      await refreshData()
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
      await refreshData()

      if (result.success === result.total) {
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
        const copyData = { [item.key]: item.value }
        textToCopy = JSON.stringify(copyData, null, 2)
      }

      await navigator.clipboard.writeText(textToCopy)

      const successMessage = typeof item === 'string'
        ? '已复制到剪贴板'
        : `已复制数据项 "${item.key}" 到剪贴板`

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
    filteredData,

    // 方法
    refreshData,
    debouncedRefresh,
    deleteItem,
    clearAll,
    saveItem,
    saveAllData,
    copyToClipboard,
    handleTabChange,
    debouncedSearch
  }
}