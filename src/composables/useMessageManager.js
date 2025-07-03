import { useMessage } from 'naive-ui'
import { MESSAGE_CONFIG } from '../constants/index.js'

export function useMessageManager () {
  const message = useMessage()

  // 消息去重管理
  const messageCache = new Map()
  const MESSAGE_DEBOUNCE_TIME = 300 // 300ms内的相同消息会被去重

  // 清理过期的消息缓存
  const cleanupCache = () => {
    const now = Date.now()
    for (const [key, timestamp] of messageCache.entries()) {
      if (now - timestamp > MESSAGE_DEBOUNCE_TIME) {
        messageCache.delete(key)
      }
    }
  }

  // 检查是否应该显示消息（去重逻辑）
  const shouldShowMessage = (content, type) => {
    const key = `${type}:${content}`
    const now = Date.now()

    if (messageCache.has(key)) {
      const lastTime = messageCache.get(key)
      if (now - lastTime < MESSAGE_DEBOUNCE_TIME) {
        return false // 短时间内的重复消息不显示
      }
    }

    messageCache.set(key, now)
    cleanupCache()
    return true
  }

  // 静默验证（不显示消息的验证）
  const silentValidation = {
    success: () => true,
    error: () => false,
    warning: () => false,
    info: () => false
  }

  // 包装原生消息方法，加入去重逻辑
  const showMessage = {
    success: (content, options = {}) => {
      if (shouldShowMessage(content, 'success')) {
        return message.success(content, {
          duration: MESSAGE_CONFIG.SUCCESS_DURATION,
          ...options
        })
      }
    },

    error: (content, options = {}) => {
      if (shouldShowMessage(content, 'error')) {
        return message.error(content, {
          duration: MESSAGE_CONFIG.ERROR_DURATION,
          ...options
        })
      }
    },

    warning: (content, options = {}) => {
      if (shouldShowMessage(content, 'warning')) {
        return message.warning(content, {
          duration: MESSAGE_CONFIG.WARNING_DURATION,
          ...options
        })
      }
    },

    info: (content, options = {}) => {
      if (shouldShowMessage(content, 'info')) {
        return message.info(content, {
          duration: MESSAGE_CONFIG.SUCCESS_DURATION,
          ...options
        })
      }
    }
  }

  // 强制显示消息（跳过去重逻辑）
  const forceShowMessage = {
    success: (content, options = {}) => message.success(content, {
      duration: MESSAGE_CONFIG.SUCCESS_DURATION,
      ...options
    }),

    error: (content, options = {}) => message.error(content, {
      duration: MESSAGE_CONFIG.ERROR_DURATION,
      ...options
    }),

    warning: (content, options = {}) => message.warning(content, {
      duration: MESSAGE_CONFIG.WARNING_DURATION,
      ...options
    }),

    info: (content, options = {}) => message.info(content, {
      duration: MESSAGE_CONFIG.SUCCESS_DURATION,
      ...options
    })
  }

  return {
    // 智能消息（带去重）
    message: showMessage,
    // 静默验证消息
    silentMessage: silentValidation,
    // 强制显示消息
    forceMessage: forceShowMessage,
    // 原生消息对象
    rawMessage: message
  }
}