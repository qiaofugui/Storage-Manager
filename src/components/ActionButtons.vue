<template>
  <n-space size="small">
    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button type="primary" size="small" @click="emit('add')">
          <template #icon>
            <n-icon>
              <PlusIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      {{ t('actionAdd') }}
    </n-tooltip>

    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button size="small" @click="emit('edit-all')">
          <template #icon>
            <n-icon>
              <EditIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      {{ t('actionBatchEdit') }}
    </n-tooltip>

    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button size="small" @click="emit('paste')">
          <template #icon>
            <n-icon>
              <ClipboardIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      {{ t('actionPaste') }}
    </n-tooltip>

    <n-tooltip trigger="hover" :delay="TOOLTIP_CONFIG.DELAY">
      <template #trigger>
        <n-button size="small" @click="emit('refresh')">
          <template #icon>
            <n-icon>
              <RefreshIcon />
            </n-icon>
          </template>
        </n-button>
      </template>
      {{ t('actionRefresh') }}
    </n-tooltip>

    <n-dropdown trigger="click" :options="dropdownOptions">
      <n-button size="small">
        <template #icon>
          <n-icon>
            <MoreIcon />
          </n-icon>
        </template>
      </n-button>
    </n-dropdown>
  </n-space>
</template>

<script setup>
import { h } from 'vue'
import { useIcons } from '../composables/useIcons.js'
import { APP_LINKS, TOOLTIP_CONFIG } from '../constants/index.js'
import { useI18n } from '../i18n/index.js'

const emit = defineEmits(['add', 'edit-all', 'paste', 'clear', 'clear-current-page', 'refresh'])
const { t } = useI18n()

// 使用统一的图标系统
const {
  PlusIcon,
  EditIcon,
  ClipboardIcon,
  RefreshIcon,
  TrashIcon,
  MoreIcon,
  GitHubIcon
} = useIcons()

const clearActions = [
  {
    label: () => t('actionClearCurrentType'),
    eventName: 'clear',
    positiveText: () => t('buttonClear'),
    confirmText: () => t('confirmClearCurrentType')
  },
  {
    label: () => t('actionClearPage'),
    eventName: 'clear-current-page',
    positiveText: () => t('buttonClearAll'),
    confirmText: () => t('confirmClearPage')
  }
]

const dropdownOptions = [
  ...clearActions.map(action => ({
    type: 'render',
    key: action.eventName,
    render: () => renderClearAction(action)
  })),
  {
    type: 'divider',
    key: 'about-divider'
  },
  {
    type: 'render',
    key: 'about-github',
    render: () => renderGitHubAction()
  }
]

const handleClearConfirm = (eventName) => {
  emit(eventName)
}

const renderClearAction = (action) => {
  return h(NPopconfirm, {
    positiveText: action.positiveText(),
    negativeText: t('buttonCancel'),
    width: 380,
    onPositiveClick: () => handleClearConfirm(action.eventName)
  }, {
    trigger: () => h('button', {
      type: 'button',
      class: 'flex h-[34px] w-full cursor-pointer items-center border-0 bg-transparent px-3 text-left text-sm text-[#333639] hover:bg-[#f3f3f5]',
      onClick: (event) => event.stopPropagation(),
      onMousedown: (event) => event.stopPropagation()
    }, [
      h('span', {
        class: 'mr-2 inline-flex'
      }, [h(TrashIcon)]),
      action.label()
    ]),
    default: () => action.confirmText()
  })
}

const renderGitHubAction = () => {
  return h('button', {
    type: 'button',
    class: 'flex h-[34px] w-full cursor-pointer items-center border-0 bg-transparent px-3 text-left text-sm text-[#333639] hover:bg-[#f3f3f5]',
    onClick: (event) => {
      event.stopPropagation()
      globalThis.open(APP_LINKS.GITHUB, '_blank', 'noopener,noreferrer')
    },
    onMousedown: (event) => event.stopPropagation()
  }, [
    h('span', {
      class: 'mr-2 inline-flex'
    }, [h(GitHubIcon)]),
    t('actionAboutGitHub')
  ])
}
</script>
