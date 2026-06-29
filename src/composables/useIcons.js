import { h } from 'vue'

// 创建SVG图标的通用函数
const createSvgIcon = (path, viewBox = '0 0 24 24', size = '16', color = 'currentColor') => {
  return () => h('svg', {
    viewBox,
    width: size,
    height: size,
    fill: color
  }, [
    h('path', { d: path, fill: color })
  ])
}

const createOutlineIcon = (children, viewBox = '0 0 24 24', size = '16', color = 'currentColor') => {
  return () => h('svg', {
    viewBox,
    width: size,
    height: size,
    fill: 'none',
    stroke: color,
    'stroke-width': '1.9',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  }, children)
}

export function useIcons () {
  // 基础图标
  const CloseIcon = createSvgIcon(
    'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'
  )

  const InfoIcon = createSvgIcon(
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z'
  )

  const ReloadIcon = createSvgIcon(
    'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'
  )

  // 操作图标
  const EditIcon = createSvgIcon(
    'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z'
  )

  const DeleteIcon = createSvgIcon(
    'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    '0 0 24 24',
    '16',
    '#D13050'
  )

  const CopyIcon = createOutlineIcon([
    h('rect', { x: '8', y: '8', width: '11', height: '11', rx: '2.5' }),
    h('path', { d: 'M5 15V6.5A1.5 1.5 0 0 1 6.5 5H15' })
  ])

  const PlusIcon = createSvgIcon(
    'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z'
  )

  const SearchIcon = createSvgIcon(
    'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'
  )

  // 文件和数据图标
  const ClipboardIcon = createSvgIcon(
    'M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm7 16H5V5h2v3h10V5h2v14z'
  )

  const RefreshIcon = createSvgIcon(
    'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z'
  )

  const TrashIcon = createSvgIcon(
    'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    '0 0 24 24',
    '16',
    '#D13050'
  )

  const MoreIcon = createSvgIcon(
    'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
  )

  // 状态图标
  const SuccessIcon = createSvgIcon(
    'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'
  )

  const ErrorIcon = createSvgIcon(
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
  )

  const WarningIcon = createSvgIcon(
    'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'
  )

  return {
    // 基础图标
    CloseIcon,
    InfoIcon,
    ReloadIcon,

    // 操作图标
    EditIcon,
    DeleteIcon,
    CopyIcon,
    PlusIcon,
    SearchIcon,

    // 文件和数据图标
    ClipboardIcon,
    RefreshIcon,
    TrashIcon,
    MoreIcon,

    // 状态图标
    SuccessIcon,
    ErrorIcon,
    WarningIcon
  }
}
