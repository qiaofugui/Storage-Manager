export { StorageManager } from './storage/manager.js'

/**
 * 全局错误处理器
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason)
  })
}
