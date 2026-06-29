/**
 * 参数验证工具函数
 */
function validateStorageType (storageType) {
  if (!storageType || (storageType !== 'localStorage' && storageType !== 'sessionStorage' && storageType !== 'cookie')) {
    throw new Error('storageType 必须是 "localStorage"、"sessionStorage" 或 "cookie"')
  }
}

function validateNonEmptyString (value, fieldName) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} 必须是非空字符串`)
  }
}

function validateStorageKey (key) {
  validateNonEmptyString(key, 'key')

  if (key.length > 1024) {
    throw new Error('key 长度不能超过 1024 个字符')
  }
}

function validateCookieName (name) {
  validateNonEmptyString(name, 'Cookie 名称')

  if (name.length > 1024) {
    throw new Error('Cookie 名称长度不能超过 1024 个字符')
  }

  // Cookie name follows the HTTP token rules; Web Storage keys are validated separately.
  if (/[\u0000-\u001F\u007F\s()<>@,;:\\"/\[\]?={}]/.test(name)) {
    throw new Error('Cookie 名称包含无效字符')
  }
}

function validateUrl (url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL 无效或为空')
  }

  // 扩展受限协议列表，包含更多特殊页面
  const restrictedProtocols = [
    'chrome://', 'edge://', 'chrome-extension://', 'moz-extension://',
    'chrome-devtools://', 'devtools://', 'about:', 'data:', 'blob:',
    'filesystem:', 'chrome-search://', 'chrome-ui://'
  ]

  if (restrictedProtocols.some(protocol => url.startsWith(protocol))) {
    throw new Error('无法在此页面操作（特殊协议页面）')
  }

  // 检查新标签页和空白页
  if (url === 'about:blank' || url === 'about:newtab' || url === '' || url === 'chrome://newtab/' || url === 'edge://newtab/') {
    throw new Error('无法在新标签页或空白页面操作')
  }
}

function createUrl (urlString) {
  try {
    const url = new URL(urlString)
    // 确保是http或https协议
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`不支持的协议: ${url.protocol}`)
    }
    return url
  } catch (error) {
    throw new Error(`无效的 URL: ${urlString}`)
  }
}

function normalizeCookieDomain (domain) {
  return typeof domain === 'string' ? domain.trim() : ''
}

function getCookieHost (domain, fallbackHost) {
  const normalizedDomain = normalizeCookieDomain(domain)
  return (normalizedDomain || fallbackHost).replace(/^\./, '')
}

function normalizeCookiePath (path) {
  return typeof path === 'string' && path.startsWith('/') ? path : '/'
}

function createCookieUrl (cookie, currentUrl) {
  const pageUrl = createUrl(currentUrl)
  const protocol = cookie.secure ? 'https:' : pageUrl.protocol
  const host = getCookieHost(cookie.domain, pageUrl.hostname)
  const path = normalizeCookiePath(cookie.path)

  return `${protocol}//${host}${path}`
}

function normalizeSameSite (sameSite) {
  if (!sameSite) return 'lax'

  const normalized = sameSite === 'none' ? 'no_restriction' : sameSite
  const validSameSiteValues = ['strict', 'lax', 'no_restriction', 'unspecified']

  return validSameSiteValues.includes(normalized) ? normalized : 'lax'
}

function getCookieInputName (key, value) {
  if (typeof value === 'object' && value !== null && typeof value.name === 'string' && value.name.trim()) {
    return value.name
  }

  return key
}

function createCookieEditorKey (cookie) {
  const parts = [
    cookie.name,
    cookie.domain || '',
    cookie.path || '/',
    cookie.storeId || '',
    cookie.partitionKey ? JSON.stringify(cookie.partitionKey) : ''
  ]

  return parts.map(part => encodeURIComponent(part)).join('|')
}

function parseCookieEditorKey (key) {
  if (typeof key !== 'string' || !key.includes('|')) {
    return null
  }

  const rawParts = key.split('|')
  if (rawParts.length !== 5) {
    return null
  }

  let parts
  try {
    parts = rawParts.map(part => decodeURIComponent(part))
  } catch {
    return null
  }

  const [name, domain = '', path = '/', storeId = '', partitionKeyText = ''] = parts

  if (!name) {
    return null
  }

  const identity = {
    name,
    domain,
    path: normalizeCookiePath(path)
  }

  if (storeId) {
    identity.storeId = storeId
  }

  if (partitionKeyText) {
    try {
      identity.partitionKey = JSON.parse(partitionKeyText)
    } catch {
      identity.partitionKey = partitionKeyText
    }
  }

  return identity
}

function normalizeCookieIdentity (item, fallbackValue) {
  if (typeof item === 'object' && item !== null) {
    const parsedKey = parseCookieEditorKey(item.key)
    return {
      ...parsedKey,
      ...item,
      name: item.name || parsedKey?.name || item.key,
      value: item.value ?? fallbackValue
    }
  }

  const parsedKey = parseCookieEditorKey(item)
  return parsedKey || { name: item, value: fallbackValue }
}

function cookieIdentityMatches (cookie, identity) {
  if (cookie.name !== identity.name) {
    return false
  }

  if (identity.domain && cookie.domain !== identity.domain) {
    return false
  }

  if (identity.path && cookie.path !== identity.path) {
    return false
  }

  if (identity.storeId && cookie.storeId !== identity.storeId) {
    return false
  }

  if (identity.partitionKey) {
    return JSON.stringify(cookie.partitionKey || null) === JSON.stringify(identity.partitionKey)
  }

  return true
}

/**
 * 检查Chrome API可用性
 */
function checkChromeAPIs () {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    throw new Error('Chrome Tabs API 不可用')
  }
  if (!chrome.scripting) {
    throw new Error('Chrome Scripting API 不可用') // 确保 manifest.json 中包含 "scripting" 权限
  }
}

/**
 * 获取活动标签页的辅助函数
 */
async function getActiveTab () {
  checkChromeAPIs()

  return new Promise((resolve, reject) => {
    // 添加超时机制
    const timeoutId = setTimeout(() => {
      reject(new Error('获取活动标签页超时'))
    }, 5000)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      clearTimeout(timeoutId)

      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message))
      }

      if (!tabs || tabs.length === 0) {
        return reject(new Error('无法获取当前标签页'))
      }

      const tab = tabs[0]

      // 检查标签页状态
      if (tab.status !== 'complete') {
        return reject(new Error('页面仍在加载中，请等待加载完成'))
      }

      if (!tab.url) {
        return reject(new Error('无法获取标签页URL'))
      }

      // 验证URL
      try {
        validateUrl(tab.url)
        resolve(tab)
      } catch (error) {
        reject(error)
      }
    })
  })
}

/**
 * 安全执行脚本的辅助函数
 */
async function executeScript (tabId, func, args = []) {
  return new Promise((resolve, reject) => {
    // 添加超时机制
    const timeoutId = setTimeout(() => {
      reject(new Error('脚本执行超时'))
    }, 10000) // 10秒超时

    try {
      chrome.scripting.executeScript({
        target: { tabId },
        func,
        args
      }, (results) => {
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          return reject(new Error(`脚本注入失败: ${chrome.runtime.lastError.message}`))
        }

        if (!results || results.length === 0) {
          return reject(new Error('脚本执行失败，无返回结果'))
        }

        const result = results[0]
        if (result.error) {
          return reject(new Error(`脚本执行错误: ${result.error}`))
        }

        resolve(result.result)
      })
    } catch (error) {
      clearTimeout(timeoutId)
      reject(new Error(`执行脚本异常: ${error.message}`))
    }
  })
}

/**
 * 安全的JSON解析
 */
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
async function getCurrentStorage (storageType) {
  validateStorageType(storageType)

  try {
    const tab = await getActiveTab()

    const result = await executeScript(tab.id, (type) => {
      try {
        const result = []
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage

        // 检查 storage 是否可用
        if (!storage) {
          throw new Error(`${type} 不可用`)
        }

        // 检查是否在隐身模式或存储被禁用
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

        // 安全获取所有项目
        const storageLength = storage.length
        for (let i = 0; i < storageLength; i++) {
          try {
            const key = storage.key(i)
            if (key !== null && !key.startsWith('__storage_test_')) { // 过滤测试 key
              const value = storage.getItem(key)
              if (value !== null) { // 确保 value 不为 null
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
async function setStorageItem (storageType, key, value) {
  validateStorageType(storageType)
  validateStorageKey(key)

  if (value === undefined) {
    throw new Error('value 不能为 undefined')
  }

  try {
    const tab = await getActiveTab()

    // 转换value为字符串并检查大小
    const stringValue = safeJSONStringify(value)

    // 更精确的存储大小检查
    const estimatedSize = new Blob([key + stringValue]).size
    if (estimatedSize > 100 * 1024 * 1024) { // 100MB 限制
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
async function removeStorageItem (storageType, key) {
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

        // 检查项目是否存在
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
async function clearStorage (storageType) {
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

        // 验证清空是否成功
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
async function setBatchStorage (storageType, data, clearFirst = false) {
  validateStorageType(storageType)

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data 必须是对象')
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    return { success: 0, total: 0, errors: [] }
  }

  // 验证所有 key 并计算总大小
  let totalSize = 0
  entries.forEach(([key, value]) => {
    validateStorageKey(key)
    const stringValue = safeJSONStringify(value)
    totalSize += new Blob([key + stringValue]).size
  })

  // 检查批量数据总大小
  if (totalSize > 1000 * 1024 * 1024) { // 1000MB 限制
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

        // 先清空（如果需要）
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

        // 批量设置 - 使用事务式思维
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
async function hasStorageItem (storageType, key) {
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

        // 使用 in 操作符和 getItem 双重检查
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

/**
 * ===============================
 * Cookie 管理函数
 * ===============================
 */

/**
 * 验证Cookie名称和值
 */
function validateCookieData (name, value) {
  validateCookieName(name)

  if (value !== undefined && typeof value === 'string') {
    // Cookie 值不能包含某些特殊字符，并检查长度
    if (value.includes(';') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
      throw new Error('Cookie 值包含无效字符')
    }

    if (value.length > 4096) { // Cookie 值长度限制
      throw new Error('Cookie值过长，超过 4KB 限制')
    }
  }
}

async function getCurrentCookies () {
  try {
    const tab = await getActiveTab()

    // 检查必要的权限
    if (!chrome.cookies) {
      throw new Error('缺少 Cookie 权限') // 确保 manifest.json 中包含 "cookies" 权限
    }

    const cookies = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('获取 Cookie 超时'))
      }, 5000)

      chrome.cookies.getAll({
        url: tab.url // 使用完整 URL 而不是domain
      }, (cookies) => {
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(cookies || [])
        }
      })
    })

    const result = cookies.map(cookie => ({
      key: createCookieEditorKey(cookie),
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      hostOnly: cookie.hostOnly,
      sameSite: cookie.sameSite,
      expirationDate: cookie.expirationDate,
      session: !cookie.expirationDate, // 会话Cookie标识
      storeId: cookie.storeId, // 添加存储ID
      partitionKey: cookie.partitionKey,
      type: 'cookie'
    }))

    return result
  } catch (error) {
    throw new Error(`获取 Cookie 失败: ${error.message}`)
  }
}

async function setCookieItem (name, value, options = {}) {
  validateCookieData(name, value)

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const tab = await getActiveTab()
    const url = createUrl(tab.url)

    const cookieDetails = {
      url: createCookieUrl(options, tab.url),
      name: name,
      value: String(value), // 确保是字符串
      path: normalizeCookiePath(options.path),
      secure: Boolean(options.secure),
      httpOnly: Boolean(options.httpOnly),
      sameSite: normalizeSameSite(options.sameSite)
    }

    if (options.storeId) {
      cookieDetails.storeId = options.storeId
    }

    if (options.partitionKey) {
      cookieDetails.partitionKey = options.partitionKey
    }

    const normalizedDomain = normalizeCookieDomain(options.domain)
    const shouldSetDomain = normalizedDomain && (options.hostOnly === false || normalizedDomain.startsWith('.'))
    if (shouldSetDomain) {
      cookieDetails.domain = normalizedDomain
    }

    // 处理过期时间 - 更严格的验证
    if (options.expirationDate) {
      let expiration
      if (typeof options.expirationDate === 'number') {
        expiration = options.expirationDate
      } else if (options.expirationDate instanceof Date) {
        expiration = Math.floor(options.expirationDate.getTime() / 1000)
      } else if (typeof options.expirationDate === 'string') {
        const date = new Date(options.expirationDate)
        if (isNaN(date.getTime())) {
          throw new Error('无效的过期时间格式')
        }
        expiration = Math.floor(date.getTime() / 1000)
      }

      // 检查过期时间是否在未来
      if (expiration && expiration <= Math.floor(Date.now() / 1000)) {
        throw new Error('过期时间必须在未来')
      }

      cookieDetails.expirationDate = expiration
    }

    // secure为true时，必须是https
    if (cookieDetails.secure && url.protocol !== 'https:') {
      throw new Error('Secure Cookie只能在 HTTPS 页面设置')
    }

    // sameSite为none时，必须设置secure
    if (cookieDetails.sameSite === 'no_restriction' && !cookieDetails.secure) {
      throw new Error('sameSite=none 的 Cookie 必须设置 secure=true')
    }

    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('设置 Cookie 超时'))
      }, 5000)

      chrome.cookies.set(cookieDetails, (cookie) => {
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else if (!cookie) {
          reject(new Error('Cookie 设置失败，可能被浏览器策略阻止'))
        } else {
          resolve(cookie)
        }
      })
    })

    return result
  } catch (error) {
    throw new Error(`设置 Cookie 失败: ${error.message}`)
  }
}

async function removeCookieItem (item) {
  const cookie = normalizeCookieIdentity(item)
  const name = cookie.name
  validateCookieName(name)

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const tab = await getActiveTab()
    const removeDetails = {
      url: createCookieUrl(cookie, tab.url),
      name: name
    }

    if (cookie.storeId) {
      removeDetails.storeId = cookie.storeId
    }

    if (cookie.partitionKey) {
      removeDetails.partitionKey = cookie.partitionKey
    }

    const result = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('删除 Cookie 超时'))
      }, 5000)

      chrome.cookies.remove(removeDetails, (details) => {
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(details)
        }
      })
    })

    return { existed: !!result }
  } catch (error) {
    throw new Error(`删除 Cookie 失败: ${error.message}`)
  }
}

async function clearCookies () {
  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const cookies = await getCurrentCookies()

    if (cookies.length === 0) {
      return { clearedCount: 0, total: 0, errors: [] }
    }

    const removePromises = cookies.map(async cookie => {
      try {
        await removeCookieItem(cookie)
        return { success: true, name: cookie.name }
      } catch (error) {
        return { success: false, name: cookie.name, error: error.message }
      }
    })

    const results = await Promise.all(removePromises)
    const successCount = results.filter(r => r.success).length
    const errors = results.filter(r => !r.success)

    return {
      clearedCount: successCount,
      total: cookies.length,
      errors: errors.map(e => `删除${e.name}失败: ${e.error}`)
    }
  } catch (error) {
    throw new Error(`清空 Cookie 失败: ${error.message}`)
  }
}

async function setBatchCookies (data, clearFirst = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data 必须是对象')
  }

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    return { success: 0, total: 0, errors: [], clearedCount: 0 }
  }

  // 预先验证所有Cookie数据
  entries.forEach(([key, value]) => {
    const cookieName = getCookieInputName(key, value)
    if (typeof value === 'object' && value !== null) {
      validateCookieData(cookieName, value.value)
    } else {
      validateCookieData(cookieName, value)
    }
  })

  try {
    let clearedCount = 0
    const errors = []
    let backupCookies = []
    let rollbackPerformed = false
    let rollbackError = null

    // 如果需要先清空
    if (clearFirst) {
      try {
        backupCookies = await getCurrentCookies()
        const clearResult = await clearCookies()
        clearedCount = clearResult.clearedCount
        if (clearResult.errors && clearResult.errors.length > 0) {
          errors.push(...clearResult.errors)
        }
      } catch (e) {
        errors.push(`清空 Cookie 失败: ${e.message}`)
      }
    }

    const total = entries.length
    const setPromises = entries.map(async ([key, value]) => {
      try {
        // 处理不同的value格式
        let cookieName = key
        let cookieValue, options = {}

        if (typeof value === 'object' && value !== null) {
          const identity = normalizeCookieIdentity(value)
          cookieName = getCookieInputName(key, value)
          cookieValue = value.value !== undefined ? value.value : JSON.stringify(value)
          options = { ...identity, ...value }
          delete options.name // name 单独作为 Cookie 名称处理
          delete options.value // 移除value属性，避免混淆
          delete options.key // key 只作为编辑器内部身份使用
        } else {
          cookieValue = typeof value === 'string' ? value : JSON.stringify(value)
        }

        await setCookieItem(cookieName, cookieValue, options)
        return { success: true, key: cookieName }
      } catch (e) {
        return { success: false, key, error: e.message }
      }
    })

    const results = await Promise.all(setPromises)
    const successCount = results.filter(r => r.success).length
    const failedResults = results.filter(r => !r.success)

    failedResults.forEach(r => {
      errors.push(`设置 Cookie ${r.key} 失败: ${r.error}`)
    })

    if (clearFirst && failedResults.length > 0) {
      try {
        await clearCookies()

        for (const cookie of backupCookies) {
          const {
            key,
            name,
            value,
            domain,
            path,
            secure,
            httpOnly,
            hostOnly,
            sameSite,
            expirationDate,
            storeId,
            partitionKey
          } = cookie

          await setCookieItem(name, value, {
            key,
            domain,
            path,
            secure,
            httpOnly,
            hostOnly,
            sameSite,
            expirationDate,
            storeId,
            partitionKey
          })
        }

        rollbackPerformed = true
        errors.push('批量写入 Cookie 失败，已恢复原始 Cookie')
      } catch (e) {
        rollbackError = e.message
        errors.push(`批量写入 Cookie 失败，恢复原始 Cookie 也失败: ${e.message}`)
      }
    }

    return {
      success: rollbackPerformed ? 0 : successCount,
      total,
      clearedCount,
      errors,
      failedKeys: failedResults.map(r => r.key),
      rollbackPerformed,
      rollbackError
    }
  } catch (error) {
    throw new Error(`批量设置 Cookie 失败: ${error.message}`)
  }
}

async function hasCookieItem (name) {
  const identity = normalizeCookieIdentity(name)
  validateCookieName(identity.name)

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const tab = await getActiveTab()

    const cookies = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('检查 Cookie 超时'))
      }, 5000)

      chrome.cookies.getAll({
        url: tab.url,
        name: identity.name
      }, (cookies) => {
        clearTimeout(timeoutId)

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve(cookies || [])
        }
      })
    })

    return cookies.some(cookie => cookieIdentityMatches(cookie, identity))
  } catch (error) {
    throw new Error(`检查 Cookie 失败: ${error.message}`)
  }
}

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
      // 检查基本权限
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

      // 检查当前页面可访问性
      try {
        await getActiveTab()
        health.capabilities.pageAccess = true
      } catch (error) {
        health.healthy = false
        health.capabilities.pageAccess = false
        health.issues.push(`页面访问失败: ${error.message}`)
      }

      // 检查存储读写能力
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

/**
 * 全局错误处理器
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason)
  })
}
