import { computed } from 'vue'
import { createI18n as createVueI18n, useI18n as useVueI18n } from 'vue-i18n'
import { dateEnUS, dateZhCN, enUS, zhCN } from 'naive-ui'
import zhMessages from '../../locales/_locales/zh_CN/messages.json'
import enMessages from '../../locales/_locales/en/messages.json'

const NAIVE_LOCALES = {
  zh_CN: {
    locale: zhCN,
    dateLocale: dateZhCN
  },
  en: {
    locale: enUS,
    dateLocale: dateEnUS
  }
}
const STORAGE_KEY = 'storage-manager-locale'

function normalizeLocale (locale) {
  if (!locale) return 'zh_CN'

  const normalized = locale.replace('-', '_')
  if (normalized.toLowerCase().startsWith('zh')) {
    return 'zh_CN'
  }

  return 'en'
}

function detectLocale () {
  const storedLocale = globalThis.localStorage?.getItem(STORAGE_KEY)
  if (storedLocale) {
    return normalizeLocale(storedLocale)
  }

  const runtimeLocale = globalThis.chrome?.i18n?.getUILanguage?.()
  return normalizeLocale(runtimeLocale || globalThis.navigator?.language)
}

function interpolate (message, named) {
  return message.replace(/\{(\w+)\}/g, (match, key) => {
    const value = named(key)
    return value === undefined || value === null ? match : String(value)
  })
}

function toMessageFunction (message) {
  return ({ named }) => interpolate(message, named)
}

function toVueMessages (chromeMessages) {
  return Object.fromEntries(
    Object.entries(chromeMessages).map(([key, value]) => [
      key,
      toMessageFunction(typeof value === 'string' ? value : value.message)
    ])
  )
}

export const i18n = createVueI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'zh_CN',
  messages: {
    zh_CN: toVueMessages(zhMessages),
    en: toVueMessages(enMessages)
  }
})

export function installI18n (app) {
  app.use(i18n)
  return i18n
}

export function useI18n () {
  const composer = useVueI18n({ useScope: 'global' })
  const naiveConfig = computed(() => NAIVE_LOCALES[composer.locale.value] || NAIVE_LOCALES.zh_CN)
  const setLocale = (locale) => {
    const nextLocale = normalizeLocale(locale)
    composer.locale.value = nextLocale
    globalThis.localStorage?.setItem(STORAGE_KEY, nextLocale)
  }

  return {
    ...composer,
    setLocale,
    naiveLocale: computed(() => naiveConfig.value.locale),
    naiveDateLocale: computed(() => naiveConfig.value.dateLocale)
  }
}
