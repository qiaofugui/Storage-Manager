/**
 * 参数验证工具函数
 */
export function validateStorageType (storageType) {
  if (!storageType || (storageType !== 'localStorage' && storageType !== 'sessionStorage' && storageType !== 'cookie')) {
    throw new Error('storageType 必须是 "localStorage"、"sessionStorage" 或 "cookie"')
  }
}

function validateNonEmptyString (value, fieldName) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${fieldName} 必须是非空字符串`)
  }
}

export function validateStorageKey (key) {
  validateNonEmptyString(key, 'key')

  if (key.length > 1024) {
    throw new Error('key 长度不能超过 1024 个字符')
  }
}

export function validateCookieName (name) {
  validateNonEmptyString(name, 'Cookie 名称')

  if (name.length > 1024) {
    throw new Error('Cookie 名称长度不能超过 1024 个字符')
  }

  // Cookie name follows the HTTP token rules; Web Storage keys are validated separately.
  if (/[\u0000-\u001F\u007F\s()<>@,;:\\"/\[\]?={}]/.test(name)) {
    throw new Error('Cookie 名称包含无效字符')
  }
}

export function validateUrl (url) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL 无效或为空')
  }

  const restrictedProtocols = [
    'chrome://', 'edge://', 'chrome-extension://', 'moz-extension://',
    'chrome-devtools://', 'devtools://', 'about:', 'data:', 'blob:',
    'filesystem:', 'chrome-search://', 'chrome-ui://'
  ]

  if (restrictedProtocols.some(protocol => url.startsWith(protocol))) {
    throw new Error('无法在此页面操作（特殊协议页面）')
  }

  if (url === 'about:blank' || url === 'about:newtab' || url === '' || url === 'chrome://newtab/' || url === 'edge://newtab/') {
    throw new Error('无法在新标签页或空白页面操作')
  }
}

export function createUrl (urlString) {
  try {
    const url = new URL(urlString)
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`不支持的协议: ${url.protocol}`)
    }
    return url
  } catch (error) {
    throw new Error(`无效的 URL: ${urlString}`)
  }
}
