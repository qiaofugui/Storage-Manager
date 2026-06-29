/**
 * 防抖函数
 * @param {Function} func 要防抖的函数
 * @param {number} delay 延迟时间
 * @returns {Function} 防抖后的函数
 */
export function debounce (func, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} func 要节流的函数
 * @param {number} delay 节流时间
 * @returns {Function} 节流后的函数
 */
export function throttle (func, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return func.apply(this, args)
    }
  }
}

/**
 * 异步组件加载错误处理
 * @param {Function} loader 组件加载函数
 * @param {Object} options 选项
 * @returns {Object} 异步组件配置
 */
export function createAsyncComponent (loader, options = {}) {
  return {
    loader,
    loadingComponent: options.loadingComponent,
    errorComponent: options.errorComponent,
    delay: options.delay || 200,
    timeout: options.timeout || 10000
  }
}

/**
 * 安全的JSON解析
 * @param {string} str JSON字符串
 * @param {*} defaultValue 默认值
 * @returns {*} 解析结果
 */
export function safeJsonParse (str, defaultValue = null) {
  const result = tryJsonParse(str)
  return result.success ? result.value : defaultValue
}

/**
 * JSON解析结果对象，可区分合法 null 和解析失败
 * @param {string} str JSON字符串
 * @returns {{ success: boolean, value: *, error?: Error }}
 */
export function tryJsonParse (str) {
  try {
    return { success: true, value: JSON.parse(str) }
  } catch (error) {
    return { success: false, value: null, error }
  }
}

/**
 * 安全的JSON序列化
 * @param {*} obj 要序列化的对象
 * @param {number} space 缩进空格数
 * @returns {string} JSON字符串
 */
export function safeJsonStringify (obj, space = 2) {
  try {
    const result = JSON.stringify(obj, null, space)
    if (result === undefined) {
      throw new Error('值不能被序列化为 JSON')
    }
    return result
  } catch (error) {
    throw new Error(`JSON 序列化失败: ${error.message}`)
  }
}

/**
 * 深度克隆对象
 * @param {*} obj 要克隆的对象
 * @returns {*} 克隆结果
 */
export function deepClone (obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const cloned = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }
  return obj
}
