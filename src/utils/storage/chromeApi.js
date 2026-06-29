import { delay } from './async.js'
import { validateUrl } from './validators.js'

const ACTIVE_TAB_TIMEOUT = 5000
const PAGE_READY_TIMEOUT = 4000
const PAGE_READY_POLL_INTERVAL = 250
const SCRIPT_TIMEOUT = 10000

/**
 * 检查Chrome API可用性
 */
export function checkChromeAPIs () {
  if (typeof chrome === 'undefined' || !chrome.tabs) {
    throw new Error('Chrome Tabs API 不可用')
  }
  if (!chrome.scripting) {
    throw new Error('Chrome Scripting API 不可用')
  }
}

function queryActiveTab () {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('获取活动标签页超时'))
    }, ACTIVE_TAB_TIMEOUT)

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      clearTimeout(timeoutId)

      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message))
      }

      if (!tabs || tabs.length === 0) {
        return reject(new Error('无法获取当前标签页'))
      }

      resolve(tabs[0])
    })
  })
}

function getTabById (tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.get(tabId, (tab) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message))
      }

      resolve(tab)
    })
  })
}

function assertUsableTabUrl (tab) {
  if (!tab.url) {
    throw new Error('无法获取标签页URL')
  }

  validateUrl(tab.url)
}

async function waitForTabReady (tab) {
  if (tab.url) {
    validateUrl(tab.url)
  }

  if (tab.status === 'complete') {
    assertUsableTabUrl(tab)
    return tab
  }

  const startedAt = Date.now()
  let latestTab = tab

  while (Date.now() - startedAt < PAGE_READY_TIMEOUT) {
    await delay(PAGE_READY_POLL_INTERVAL)
    latestTab = await getTabById(tab.id)

    if (latestTab.url) {
      validateUrl(latestTab.url)
    }

    if (latestTab.status === 'complete') {
      assertUsableTabUrl(latestTab)
      return latestTab
    }
  }

  throw new Error('页面仍在加载中，请稍后重试')
}

/**
 * 获取活动标签页的辅助函数。页面加载中时会短暂等待，避免用户刚打开弹窗就失败。
 */
export async function getActiveTab () {
  checkChromeAPIs()
  const tab = await queryActiveTab()
  return await waitForTabReady(tab)
}

/**
 * 安全执行脚本的辅助函数
 */
export async function executeScript (tabId, func, args = []) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('脚本执行超时'))
    }, SCRIPT_TIMEOUT)

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
