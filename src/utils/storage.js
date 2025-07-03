import { STORAGE_TYPES } from '../constants/index.js'

/**
 * 获取当前标签页的存储数据
 * @param {string} storageType 存储类型
 * @returns {Promise<Array>} 存储数据数组
 */
export async function getCurrentStorage (storageType) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0]) {
        reject(new Error('无法获取当前标签页'))
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type) => {
          const result = []
          const storage = type === 'localStorage' ? localStorage : sessionStorage

          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i)
            const value = storage.getItem(key)
            result.push({ key, value, type })
          }
          return result
        },
        args: [storageType]
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(results[0]?.result || [])
      })
    })
  })
}

/**
 * 设置存储项
 * @param {string} storageType 存储类型
 * @param {string} key 键
 * @param {string} value 值
 * @returns {Promise<void>}
 */
export async function setStorageItem (storageType, key, value) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0]) {
        reject(new Error('无法获取当前标签页'))
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, k, v) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          storage.setItem(k, v)
        },
        args: [storageType, key, value]
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  })
}

/**
 * 删除存储项
 * @param {string} storageType 存储类型
 * @param {string} key 键
 * @returns {Promise<void>}
 */
export async function removeStorageItem (storageType, key) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0]) {
        reject(new Error('无法获取当前标签页'))
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, k) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          storage.removeItem(k)
        },
        args: [storageType, key]
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  })
}

/**
 * 清空存储
 * @param {string} storageType 存储类型
 * @returns {Promise<void>}
 */
export async function clearStorage (storageType) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0]) {
        reject(new Error('无法获取当前标签页'))
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          storage.clear()
        },
        args: [storageType]
      }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve()
      })
    })
  })
}

/**
 * 批量设置存储数据
 * @param {string} storageType 存储类型
 * @param {Object} data 数据对象
 * @param {boolean} clearFirst 是否先清空
 * @returns {Promise<{success: number, total: number}>}
 */
export async function setBatchStorage (storageType, data, clearFirst = false) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0]) {
        reject(new Error('无法获取当前标签页'))
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, dataToSet, shouldClearFirst) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage

            if (shouldClearFirst) {
              storage.clear()
            }

            let successCount = 0
            const total = Object.keys(dataToSet).length

            Object.entries(dataToSet).forEach(([key, value]) => {
              try {
                const valueToStore = typeof value === 'string' ? value : JSON.stringify(value)
                storage.setItem(key, valueToStore)
                successCount++
              } catch (e) {
                console.error(`设置 ${key} 失败:`, e)
              }
            })

            return { success: successCount, total, error: null }
          } catch (error) {
            return { success: 0, total: 0, error: error.message }
          }
        },
        args: [storageType, data, clearFirst]
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        const result = results[0]?.result
        if (result?.error) {
          reject(new Error(result.error))
        } else {
          resolve({ success: result.success, total: result.total })
        }
      })
    })
  })
}

/**
 * 检查存储项是否存在
 * @param {string} storageType 存储类型
 * @param {string} key 键
 * @returns {Promise<boolean>}
 */
export async function hasStorageItem (storageType, key) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      if (!tabs[0]) {
        reject(new Error('无法获取当前标签页'))
        return
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, k) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          return storage.getItem(k) !== null
        },
        args: [storageType, key]
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }
        resolve(results[0]?.result || false)
      })
    })
  })
}