import { checkChromeAPIs, getActiveTab } from './chromeApi.js'
import { cookieIdentityMatches, normalizeCookieIdentity } from './cookieIdentity.js'
import {
  clearCookies,
  getCurrentCookies,
  hasCookieItem,
  removeCookieItem,
  setBatchCookies,
  setCookieItem
} from './cookieService.js'
import { validateCookieName, validateStorageKey, validateStorageType } from './validators.js'
import {
  clearStorage,
  getCurrentStorage,
  hasStorageItem,
  removeStorageItem,
  setBatchStorage,
  setStorageItem
} from './webStorageService.js'

/**
 * ===============================
 * StorageManager 统一封装
 * ===============================
 */
export const StorageManager = {
  /**
   * 获取所有存储项
   * @param {string} type 存储类型 ('localStorage' | 'sessionStorage' | 'cookie')
   * @returns {Promise<Array>} 存储项数组
   */
  async getAll (type) {
    validateStorageType(type)

    if (type === 'cookie') {
      return await getCurrentCookies()
    }
    return await getCurrentStorage(type)
  },

  /**
   * 获取单个存储项
   * @param {string} type 存储类型
   * @param {string} key 键名
   * @returns {Promise<Object|null>} 存储项或null
   */
  async getItem (type, key) {
    validateStorageType(type)

    try {
      if (type === 'cookie') {
        const identity = normalizeCookieIdentity(key)
        validateCookieName(identity.name)
        const cookies = await getCurrentCookies()
        return cookies.find(cookie => cookieIdentityMatches(cookie, identity)) || null
      }

      validateStorageKey(key)
      const items = await getCurrentStorage(type)
      return items.find(i => i.key === key) || null
    } catch (error) {
      throw new Error(`获取 ${type} 项 ${key} 失败: ${error.message}`)
    }
  },

  /**
   * 设置存储项
   * @param {string} type 存储类型
   * @param {string} key 键名
   * @param {any} value 值
   * @param {Object} options 选项（仅Cookie使用）
   * @returns {Promise<any>} 设置结果
   */
  async setItem (type, key, value, options = {}) {
    validateStorageType(type)

    if (type === 'cookie') {
      const identity = normalizeCookieIdentity(key, value)
      const cookieOptions = typeof key === 'object' && key !== null
        ? { ...identity, ...options }
        : options
      const cookieName = typeof key === 'string' ? key : identity.name
      return await setCookieItem(cookieName, value, cookieOptions)
    }

    validateStorageKey(key)
    return await setStorageItem(type, key, value)
  },

  /**
   * 删除存储项
   * @param {string} type 存储类型
   * @param {string} key 键名
   * @returns {Promise<Object>} 删除结果
   */
  async removeItem (type, key) {
    validateStorageType(type)

    if (type === 'cookie') {
      return await removeCookieItem(key)
    }

    validateStorageKey(key)
    return await removeStorageItem(type, key)
  },

  /**
   * 清空所有存储项
   * @param {string} type 存储类型
   * @returns {Promise<Object>} 清理结果
   */
  async clear (type) {
    validateStorageType(type)

    if (type === 'cookie') {
      return await clearCookies()
    }
    return await clearStorage(type)
  },

  /**
   * 批量设置存储项
   * @param {string} type 存储类型
   * @param {Object} data 数据对象
   * @param {boolean} clearFirst 是否先清空
   * @returns {Promise<Object>} 设置结果
   */
  async setBatch (type, data, clearFirst = false) {
    validateStorageType(type)

    if (type === 'cookie') {
      return await setBatchCookies(data, clearFirst)
    }
    return await setBatchStorage(type, data, clearFirst)
  },

  /**
   * 检查存储项是否存在
   * @param {string} type 存储类型
   * @param {string} key 键名
   * @returns {Promise<boolean>} 是否存在
   */
  async hasItem (type, key) {
    validateStorageType(type)

    if (type === 'cookie') {
      return await hasCookieItem(key)
    }

    validateStorageKey(key)
    return await hasStorageItem(type, key)
  },

  /**
   * 搜索存储项
   * @param {string} type 存储类型
   * @param {string} searchTerm 搜索词
   * @param {Object} options 搜索选项
   * @returns {Promise<Array>} 匹配的存储项
   */
  async search (type, searchTerm, options = {}) {
    validateStorageType(type)

    if (typeof searchTerm !== 'string') {
      throw new Error('searchTerm 必须是字符串')
    }

    try {
      const items = await this.getAll(type)
      const { caseSensitive = false, searchInValues = true, useRegex = false } = options

      let searchPattern
      if (useRegex) {
        try {
          searchPattern = new RegExp(searchTerm, caseSensitive ? '' : 'i')
        } catch (e) {
          throw new Error(`无效的正则表达式: ${searchTerm}`)
        }
      } else {
        searchPattern = caseSensitive ? searchTerm : searchTerm.toLowerCase()
      }

      return items.filter(item => {
        const rawKey = String(item.key || item.name || '')
        const rawValue = String(item.value ?? '')
        const keyToSearch = caseSensitive ? rawKey : rawKey.toLowerCase()
        const valueToSearch = searchInValues
          ? (caseSensitive ? rawValue : rawValue.toLowerCase())
          : ''

        if (useRegex) {
          return searchPattern.test(keyToSearch) || (searchInValues && searchPattern.test(valueToSearch))
        } else {
          return keyToSearch.includes(searchPattern) ||
            (searchInValues && valueToSearch.includes(searchPattern))
        }
      })
    } catch (error) {
      throw new Error(`搜索 ${type} 失败: ${error.message}`)
    }
  },

  /**
   * 获取存储使用情况统计
   * @param {string} type 存储类型
   * @returns {Promise<Object>} 统计信息
   */
  async getStats (type) {
    validateStorageType(type)

    try {
      const items = await this.getAll(type)
      const totalItems = items.length

      let totalSize = 0
      if (type !== 'cookie') {
        totalSize = items.reduce((sum, item) => {
          return sum + (item.key?.length || 0) + (item.value?.length || 0)
        }, 0)
      }

      return {
        type,
        totalItems,
        totalSize: type === 'cookie' ? null : totalSize,
        sizeFormatted: type === 'cookie' ? null : formatBytes(totalSize),
        items: items.map(item => ({
          key: item.key || item.name,
          size: type === 'cookie' ? null : (item.key?.length || 0) + (item.value?.length || 0)
        }))
      }
    } catch (error) {
      throw new Error(`获取 ${type} 统计信息失败: ${error.message}`)
    }
  },

  /**
   * 验证存储系统健康状态
   * @param {string} type 存储类型
   * @returns {Promise<Object>} 健康状态报告
   */
  async healthCheck (type) {
    validateStorageType(type)

    const health = {
      type,
      healthy: true,
      issues: [],
      permissions: {},
      capabilities: {}
    }

    try {
      checkChromeAPIs()
      health.permissions.tabs = true
      health.permissions.scripting = true

      if (type === 'cookie') {
        health.permissions.cookies = !!chrome.cookies
        if (!chrome.cookies) {
          health.healthy = false
          health.issues.push('缺少 Cookie 权限')
        }
      }

      try {
        await getActiveTab()
        health.capabilities.pageAccess = true
      } catch (error) {
        health.healthy = false
        health.capabilities.pageAccess = false
        health.issues.push(`页面访问失败: ${error.message}`)
      }

      if (health.capabilities.pageAccess) {
        try {
          const testKey = '__health_check_' + Date.now()
          await this.setItem(type, testKey, 'test')
          const retrieved = await this.getItem(type, testKey)
          await this.removeItem(type, testKey)

          health.capabilities.readWrite = !!retrieved
          if (!retrieved) {
            health.healthy = false
            health.issues.push('存储读写测试失败')
          }
        } catch (error) {
          health.healthy = false
          health.capabilities.readWrite = false
          health.issues.push(`存储测试失败: ${error.message}`)
        }
      }

      return health
    } catch (error) {
      return {
        type,
        healthy: false,
        issues: [`健康检查失败: ${error.message}`],
        permissions: {},
        capabilities: {}
      }
    }
  },
}

/**
 * 辅助函数：格式化字节大小
 */
function formatBytes (bytes) {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
