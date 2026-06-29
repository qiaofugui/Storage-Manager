import { getActiveTab } from './chromeApi.js'
import { mapWithConcurrency } from './async.js'
import {
  cookieIdentityMatches,
  createCookieEditorKey,
  createCookieUrl,
  getCookieInputName,
  normalizeCookieDomain,
  normalizeCookieIdentity,
  normalizeCookiePath,
  normalizeSameSite
} from './cookieIdentity.js'
import { createUrl, validateCookieName } from './validators.js'

/**
 * 验证Cookie名称和值
 */
function validateCookieData (name, value) {
  validateCookieName(name)

  if (value !== undefined && typeof value === 'string') {
    if (value.includes(';') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
      throw new Error('Cookie 值包含无效字符')
    }

    if (value.length > 4096) {
      throw new Error('Cookie值过长，超过 4KB 限制')
    }
  }
}

function formatCookieForEditor (cookie) {
  return {
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
    session: !cookie.expirationDate,
    storeId: cookie.storeId,
    partitionKey: cookie.partitionKey,
    type: 'cookie'
  }
}

async function getCookiesByUrl (url) {
  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  return await new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('获取 Cookie 超时'))
    }, 5000)

    chrome.cookies.getAll({
      url
    }, (cookies) => {
      clearTimeout(timeoutId)

      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
      } else {
        resolve(cookies || [])
      }
    })
  })
}

export async function getCurrentCookies (currentUrl = null) {
  try {
    const url = currentUrl || (await getActiveTab()).url
    const cookies = await getCookiesByUrl(url)

    return cookies.map(formatCookieForEditor)
  } catch (error) {
    throw new Error(`获取 Cookie 失败: ${error.message}`)
  }
}

export async function setCookieItem (name, value, options = {}, currentUrl = null) {
  validateCookieData(name, value)

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const pageUrlText = currentUrl || (await getActiveTab()).url
    const url = createUrl(pageUrlText)

    const cookieDetails = {
      url: createCookieUrl(options, pageUrlText),
      name: name,
      value: String(value),
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

      if (expiration && expiration <= Math.floor(Date.now() / 1000)) {
        throw new Error('过期时间必须在未来')
      }

      cookieDetails.expirationDate = expiration
    }

    if (cookieDetails.secure && url.protocol !== 'https:') {
      throw new Error('Secure Cookie只能在 HTTPS 页面设置')
    }

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

export async function removeCookieItem (item, currentUrl = null) {
  const cookie = normalizeCookieIdentity(item)
  const name = cookie.name
  validateCookieName(name)

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const pageUrlText = currentUrl || (await getActiveTab()).url
    const removeDetails = {
      url: createCookieUrl(cookie, pageUrlText),
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

export async function clearCookies (currentCookies = null, currentUrl = null) {
  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  try {
    const pageUrlText = currentUrl || (await getActiveTab()).url
    const cookies = currentCookies || await getCurrentCookies(pageUrlText)

    if (cookies.length === 0) {
      return { clearedCount: 0, total: 0, errors: [] }
    }

    const results = await mapWithConcurrency(cookies, 6, async cookie => {
      try {
        await removeCookieItem(cookie, pageUrlText)
        return { success: true, name: cookie.name }
      } catch (error) {
        return { success: false, name: cookie.name, error: error.message }
      }
    })
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

export async function setBatchCookies (data, clearFirst = false) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('data 必须是对象')
  }

  if (!chrome.cookies) {
    throw new Error('缺少 Cookie 权限')
  }

  const entries = Object.entries(data)
  if (entries.length === 0) {
    if (clearFirst) {
      const clearResult = await clearCookies()
      return {
        success: 0,
        total: 0,
        errors: clearResult.errors || [],
        clearedCount: clearResult.clearedCount || 0
      }
    }

    return { success: 0, total: 0, errors: [], clearedCount: 0 }
  }

  entries.forEach(([key, value]) => {
    const cookieName = getCookieInputName(key, value)
    if (typeof value === 'object' && value !== null) {
      validateCookieData(cookieName, value.value)
    } else {
      validateCookieData(cookieName, value)
    }
  })

  try {
    const pageUrlText = (await getActiveTab()).url
    let clearedCount = 0
    const errors = []
    let backupCookies = []
    let rollbackPerformed = false
    let rollbackError = null

    if (clearFirst) {
      try {
        backupCookies = await getCurrentCookies(pageUrlText)
        const clearResult = await clearCookies(backupCookies, pageUrlText)
        clearedCount = clearResult.clearedCount
        if (clearResult.errors && clearResult.errors.length > 0) {
          errors.push(...clearResult.errors)
        }
      } catch (e) {
        errors.push(`清空 Cookie 失败: ${e.message}`)
      }
    }

    const total = entries.length
    const results = await mapWithConcurrency(entries, 6, async ([key, value]) => {
      try {
        let cookieName = key
        let cookieValue, options = {}

        if (typeof value === 'object' && value !== null) {
          const identity = normalizeCookieIdentity(value)
          cookieName = getCookieInputName(key, value)
          cookieValue = value.value !== undefined ? value.value : JSON.stringify(value)
          options = { ...identity, ...value }
          delete options.name
          delete options.value
          delete options.key
        } else {
          cookieValue = typeof value === 'string' ? value : JSON.stringify(value)
        }

        await setCookieItem(cookieName, cookieValue, options, pageUrlText)
        return { success: true, key: cookieName }
      } catch (e) {
        return { success: false, key, error: e.message }
      }
    })
    const successCount = results.filter(r => r.success).length
    const failedResults = results.filter(r => !r.success)

    failedResults.forEach(r => {
      errors.push(`设置 Cookie ${r.key} 失败: ${r.error}`)
    })

    if (clearFirst && failedResults.length > 0) {
      try {
        await clearCookies(null, pageUrlText)

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
          }, pageUrlText)
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

export async function hasCookieItem (name) {
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
