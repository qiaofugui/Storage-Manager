import { executeScript, getActiveTab } from './chromeApi.js'
import { validateStorageKey, validateStorageType } from './validators.js'

function safeJSONStringify (value) {
  try {
    return typeof value === 'string' ? value : JSON.stringify(value)
  } catch (error) {
    throw new Error(`JSON 序列化失败: ${error.message}`)
  }
}

/**
 * 获取当前标签页的存储数据 (localStorage / sessionStorage)
 * @param {string} storageType 存储类型
 * @returns {Promise<Array>} 存储数据数组
 */
export async function getCurrentStorage (storageType) {
  validateStorageType(storageType)

  try {
    const tab = await getActiveTab()

    const result = await executeScript(tab.id, (type) => {
      try {
        const result = []
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        if (!storage) {
          throw new Error(`${type} 不可用`)
        }

        try {
          const testKey = '__storage_test_' + Date.now()
          storage.setItem(testKey, 'test')
          storage.removeItem(testKey)
        } catch (e) {
          if (e.name === 'QuotaExceededError') {
            throw new Error(`${type} 存储空间已满`)
          } else if (e.name === 'SecurityError') {
            throw new Error(`${type} 在隐私模式下被禁用`)
          } else {
            throw new Error(`${type} 被禁用或不可访问: ${e.message}`)
          }
        }

        const storageLength = storage.length
        for (let i = 0; i < storageLength; i++) {
          try {
            const key = storage.key(i)
            if (key !== null && !key.startsWith('__storage_test_')) {
              const value = storage.getItem(key)
              if (value !== null) {
                result.push({ key, value, type })
              }
            }
          } catch (e) {
            console.warn(`获取存储项 ${i} 失败:`, e)
          }
        }

        return { success: true, data: result }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, [storageType])

    if (!result.success) {
      throw new Error(result.error)
    }

    return result.data || []
  } catch (error) {
    throw new Error(`获取 ${storageType} 失败: ${error.message}`)
  }
}

/**
 * 设置存储项 (localStorage / sessionStorage)
 */
export async function setStorageItem (storageType, key, value) {
  validateStorageType(storageType)
  validateStorageKey(key)

  if (value === undefined) {
    throw new Error('value 不能为 undefined')
  }

  try {
    const tab = await getActiveTab()
    const stringValue = safeJSONStringify(value)

    const estimatedSize = new Blob([key + stringValue]).size
    if (estimatedSize > 100 * 1024 * 1024) {
      throw new Error('数据过大，可能超出存储限制')
    }

    const result = await executeScript(tab.id, (type, k, v) => {
      try {
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        if (!storage) {
          throw new Error(`${type} 不可用`)
        }

        storage.setItem(k, v)
        return { success: true }
      } catch (error) {
        let errorMsg = error.message
        if (error.name === 'QuotaExceededError') {
          errorMsg = `${type} 存储空间不足`
        } else if (error.name === 'SecurityError') {
          errorMsg = `${type} 访问被拒绝（可能在隐私模式）`
        }
        return { success: false, error: errorMsg }
      }
    }, [storageType, key, stringValue])

    if (!result.success) {
      throw new Error(result.error)
    }
  } catch (error) {
    throw new Error(`设置 ${storageType} 项失败: ${error.message}`)
  }
}

/**
 * 删除存储项 (localStorage / sessionStorage)
 */
export async function removeStorageItem (storageType, key) {
  validateStorageType(storageType)
  validateStorageKey(key)

  try {
    const tab = await getActiveTab()

    const result = await executeScript(tab.id, (type, k) => {
      try {
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        if (!storage) {
          throw new Error(`${type} 不可用`)
        }

        const exists = storage.getItem(k) !== null
        storage.removeItem(k)

        return { success: true, existed: exists }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, [storageType, key])

    if (!result.success) {
      throw new Error(result.error)
    }

    return { existed: result.existed }
  } catch (error) {
    throw new Error(`删除 ${storageType} 项失败: ${error.message}`)
  }
}

/**
 * 清空存储 (localStorage / sessionStorage)
 */
export async function clearStorage (storageType) {
  validateStorageType(storageType)

  try {
    const tab = await getActiveTab()

    const result = await executeScript(tab.id, (type) => {
      try {
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        if (!storage) {
          throw new Error(`${type} 不可用`)
        }

        const initialLength = storage.length
        storage.clear()

        const finalLength = storage.length
        if (finalLength > 0) {
          throw new Error('存储清空不完全，可能有受保护的项目')
        }

        return { success: true, clearedCount: initialLength }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, [storageType])

    if (!result.success) {
      throw new Error(result.error)
    }

    return { clearedCount: result.clearedCount }
  } catch (error) {
    throw new Error(`清空 ${storageType} 失败: ${error.message}`)
  }
}

/**
 * 批量设置存储数据 (localStorage / sessionStorage)
 */
export async function setBatchStorage (storageType, data, clearFirst = false) {
  validateStorageType(storageType)

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data 必须是对象')
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    if (clearFirst) {
      const clearResult = await clearStorage(storageType)
      return {
        success: 0,
        total: 0,
        errors: [],
        clearedCount: clearResult.clearedCount || 0
      }
    }

    return { success: 0, total: 0, errors: [] }
  }

  let totalSize = 0
  entries.forEach(([key, value]) => {
    validateStorageKey(key)
    const stringValue = safeJSONStringify(value)
    totalSize += new Blob([key + stringValue]).size
  })

  if (totalSize > 1000 * 1024 * 1024) {
    throw new Error('批量数据总大小过大')
  }

  try {
    const tab = await getActiveTab()

    const result = await executeScript(tab.id, (type, dataToSet, shouldClearFirst) => {
      try {
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        if (!storage) {
          throw new Error(`${type} 不可用`)
        }

        const errors = []
        let successCount = 0
        const total = Object.keys(dataToSet).length
        const backupData = {}
        let rollbackPerformed = false
        let rollbackError = null

        if (shouldClearFirst) {
          try {
            const backupKeys = []
            for (let i = 0; i < storage.length; i++) {
              const backupKey = storage.key(i)
              if (backupKey !== null) backupKeys.push(backupKey)
            }

            for (const backupKey of backupKeys) {
              backupData[backupKey] = storage.getItem(backupKey)
            }
            storage.clear()
          } catch (e) {
            errors.push(`清空存储失败: ${e.message}`)
          }
        }

        const failedEntries = []
        Object.entries(dataToSet).forEach(([key, value]) => {
          try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
            storage.setItem(key, stringValue)
            successCount++
          } catch (e) {
            let errorMsg = e.message
            if (e.name === 'QuotaExceededError') {
              errorMsg = '存储空间不足'
            }
            errors.push(`设置 ${key} 失败: ${errorMsg}`)
            failedEntries.push(key)
          }
        })

        if (shouldClearFirst && failedEntries.length > 0) {
          try {
            storage.clear()
            Object.entries(backupData).forEach(([key, value]) => {
              storage.setItem(key, value)
            })
            rollbackPerformed = true
            successCount = 0
            errors.push('批量写入失败，已恢复原始数据')
          } catch (e) {
            rollbackError = e.message
            errors.push(`批量写入失败，恢复原始数据也失败: ${e.message}`)
          }
        }

        return { success: true, successCount, total, errors, failedEntries, rollbackPerformed, rollbackError }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, [storageType, data, clearFirst])

    if (!result.success) {
      throw new Error(result.error)
    }

    return {
      success: result.successCount,
      total: result.total,
      errors: result.errors,
      failedKeys: result.failedEntries,
      rollbackPerformed: result.rollbackPerformed,
      rollbackError: result.rollbackError
    }
  } catch (error) {
    throw new Error(`批量设置 ${storageType} 失败: ${error.message}`)
  }
}

/**
 * 检查存储项是否存在 (localStorage / sessionStorage)
 */
export async function hasStorageItem (storageType, key) {
  validateStorageType(storageType)
  validateStorageKey(key)

  try {
    const tab = await getActiveTab()

    const result = await executeScript(tab.id, (type, k) => {
      try {
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        if (!storage) {
          return { success: true, exists: false }
        }

        const exists = k in storage && storage.getItem(k) !== null
        return { success: true, exists }
      } catch (error) {
        return { success: false, error: error.message }
      }
    }, [storageType, key])

    if (!result.success) {
      throw new Error(result.error)
    }

    return result.exists
  } catch (error) {
    throw new Error(`检查 ${storageType} 项失败: ${error.message}`)
  }
}
