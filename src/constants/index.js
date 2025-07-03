// 应用常量配置
export const STORAGE_TYPES = {
  LOCAL: 'localStorage',
  SESSION: 'sessionStorage',
  COOKIE: 'cookie'
}

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50],
  MAX_VISIBLE_CHILDREN: 50
}

export const EDITOR_CONFIG = {
  MODES: ['tree', 'code', 'form', 'text'],
  DEFAULT_INDENTATION: 2,
  MAX_VISIBLE_CHILDREN: 100
}

export const UI_CONFIG = {
  MODAL_MAX_WIDTH: '800px',
  MODAL_MAX_HEIGHT: '580px',
  TABLE_MIN_HEIGHT: '200px',
  EDITOR_HEIGHT: '280px'
}

export const MESSAGE_CONFIG = {
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 5000,
  WARNING_DURATION: 4000
}

export const TOOLTIP_CONFIG = {
  DELAY: 400,
  TRIGGER: 'hover'
}

export const DEBOUNCE_DELAYS = {
  SEARCH: 60,
  SAVE: 100,
  REFRESH: 200
}