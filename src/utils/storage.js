/**
 * 获取当前标签页的存储数据 (localStorage / sessionStorage)
 * @param {string} storageType 存储类型
 * @returns {Promise<Array>} 存储数据数组
 */
async function getCurrentStorage (storageType) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!tabs[0]) return reject(new Error('无法获取当前标签页'))

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type) => {
          const result = []
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i)
            result.push({ key, value: storage.getItem(key), type })
          }
          return result
        },
        args: [storageType]
      }, (results) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        resolve(results[0]?.result || [])
      })
    })
  })
}

/**
 * 设置存储项 (localStorage / sessionStorage)
 */
async function setStorageItem (storageType, key, value) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!tabs[0]) return reject(new Error('无法获取当前标签页'))

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, k, v) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          storage.setItem(k, v)
        },
        args: [storageType, key, value]
      }, () => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        resolve()
      })
    })
  })
}

/**
 * 删除存储项 (localStorage / sessionStorage)
 */
async function removeStorageItem (storageType, key) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!tabs[0]) return reject(new Error('无法获取当前标签页'))

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, k) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          storage.removeItem(k)
        },
        args: [storageType, key]
      }, () => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        resolve()
      })
    })
  })
}

/**
 * 清空存储 (localStorage / sessionStorage)
 */
async function clearStorage (storageType) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!tabs[0]) return reject(new Error('无法获取当前标签页'))

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          storage.clear()
        },
        args: [storageType]
      }, () => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        resolve()
      })
    })
  })
}

/**
 * 批量设置存储数据 (localStorage / sessionStorage)
 */
async function setBatchStorage (storageType, data, clearFirst = false) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!tabs[0]) return reject(new Error('无法获取当前标签页'))

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, dataToSet, shouldClearFirst) => {
          try {
            const storage = type === 'localStorage' ? localStorage : sessionStorage
            if (shouldClearFirst) storage.clear()
            let successCount = 0
            const total = Object.keys(dataToSet).length
            Object.entries(dataToSet).forEach(([key, value]) => {
              try {
                storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
                successCount++
              } catch (e) { console.error(`设置 ${key} 失败:`, e) }
            })
            return { success: successCount, total, error: null }
          } catch (error) {
            return { success: 0, total: 0, error: error.message }
          }
        },
        args: [storageType, data, clearFirst]
      }, (results) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        const result = results[0]?.result
        if (result?.error) reject(new Error(result.error))
        else resolve({ success: result.success, total: result.total })
      })
    })
  })
}

/**
 * 检查存储项是否存在 (localStorage / sessionStorage)
 */
async function hasStorageItem (storageType, key) {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
      if (!tabs[0]) return reject(new Error('无法获取当前标签页'))

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (type, k) => {
          const storage = type === 'localStorage' ? localStorage : sessionStorage
          return storage.getItem(k) !== null
        },
        args: [storageType, key]
      }, (results) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message))
        resolve(results[0]?.result || false)
      })
    })
  })
}

/**
 * ===============================
 * Cookie 管理函数
 * ===============================
 */
async function getCurrentCookies () {

}

async function setCookieItem (name, value, options = {}) {

}

async function removeCookieItem (name) {

}

async function clearCookies () {

}

async function setBatchCookies (data, clearFirst = false) {

}

async function hasCookieItem (name) {

}

/**
 * ===============================
 * StorageManager 统一封装
 * ===============================
 */
export const StorageManager = {
  async getAll (type) {
    if (type === 'cookie') return await getCurrentCookies()
    return await getCurrentStorage(type)
  },
  async getItem (type, key) {
    if (type === 'cookie') {
      const cookies = await getCurrentCookies()
      return cookies.find(c => c.name === key) || []
    }
    const items = await getCurrentStorage(type)
    return items.find(i => i.key === key) || []
  },
  async setItem (type, key, value, options = {}) {
    if (type === 'cookie') return await setCookieItem(key, value, options)
    return await setStorageItem(type, key, value)
  },
  async removeItem (type, key) {
    if (type === 'cookie') return await removeCookieItem(key)
    return await removeStorageItem(type, key)
  },
  async clear (type) {
    if (type === 'cookie') return await clearCookies()
    return await clearStorage(type)
  },
  async setBatch (type, data, clearFirst = false) {
    if (type === 'cookie') return await setBatchCookies(data, clearFirst)
    return await setBatchStorage(type, data, clearFirst)
  },
  async hasItem (type, key) {
    if (type === 'cookie') return await hasCookieItem(key)
    return await hasStorageItem(type, key)
  }
}
