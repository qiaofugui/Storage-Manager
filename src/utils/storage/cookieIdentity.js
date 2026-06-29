import { createUrl } from './validators.js'

export function normalizeCookieDomain (domain) {
  return typeof domain === 'string' ? domain.trim() : ''
}

function getCookieHost (domain, fallbackHost) {
  const normalizedDomain = normalizeCookieDomain(domain)
  return (normalizedDomain || fallbackHost).replace(/^\./, '')
}

export function normalizeCookiePath (path) {
  return typeof path === 'string' && path.startsWith('/') ? path : '/'
}

export function createCookieUrl (cookie, currentUrl) {
  const pageUrl = createUrl(currentUrl)
  const protocol = cookie.secure ? 'https:' : pageUrl.protocol
  const host = getCookieHost(cookie.domain, pageUrl.hostname)
  const path = normalizeCookiePath(cookie.path)

  return `${protocol}//${host}${path}`
}

export function normalizeSameSite (sameSite) {
  if (!sameSite) return 'lax'

  const normalized = sameSite === 'none' ? 'no_restriction' : sameSite
  const validSameSiteValues = ['strict', 'lax', 'no_restriction', 'unspecified']

  return validSameSiteValues.includes(normalized) ? normalized : 'lax'
}

export function getCookieInputName (key, value) {
  if (typeof value === 'object' && value !== null && typeof value.name === 'string' && value.name.trim()) {
    return value.name
  }

  return key
}

export function createCookieEditorKey (cookie) {
  const parts = [
    cookie.name,
    cookie.domain || '',
    cookie.path || '/',
    cookie.storeId || '',
    cookie.partitionKey ? JSON.stringify(cookie.partitionKey) : ''
  ]

  return parts.map(part => encodeURIComponent(part)).join('|')
}

export function parseCookieEditorKey (key) {
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

export function normalizeCookieIdentity (item, fallbackValue) {
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

export function cookieIdentityMatches (cookie, identity) {
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
