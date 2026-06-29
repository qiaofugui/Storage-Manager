<template>
  <div class="h-full flex flex-col">
    <Header @add="showAddModal = true" @edit-all="showEditAllModal = true" @paste="pasteData" @clear="clearAll"
      @clear-current-page="clearCurrentPage" @refresh="debouncedRefresh" />

    <!-- 标签页 -->
    <div class="bg-white px-2 pt-2">
      <div class="flex justify-between items-center">
        <!-- 标签页 -->
        <div class="flex-grow-[7]">
          <StorageTabs :active-tab="activeTab" :counts="storageCounts" @tab-change="handleTabChange" />
        </div>

        <!-- 搜索框 -->
        <div class="pl-4 pb-2 flex-grow-[3]">
          <n-input :value="searchQuery" @update:value="debouncedSearch" :placeholder="t('placeholderSearch')" clearable class="w-full">
            <template #prefix>
              <n-icon>
                <SearchIcon />
              </n-icon>
            </template>
          </n-input>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="flex-1 pb-2 px-2 bg-white overflow-hidden flex flex-col">

      <!-- 表格 -->
      <div class="flex-1 overflow-hidden">
        <StorageTable :data="filteredData" :loading="loading" :active-tab="activeTab" :search-query="searchQuery" @copy="copyToClipboard" @delete="deleteItem"
          @edit="editItem" />
      </div>
    </div>

    <!-- 新增/编辑模态框 -->
    <AddEditModal v-model:show="showAddModal" :editing-item="editingItem" :form-data="formData" @save="saveItem"
      @close="closeModal" />

    <!-- 批量编辑模态框 -->
    <EditAllModal v-model:show="showEditAllModal" :data="currentTabData" :storage-type="activeTab" @save="saveAllData"
      @close="showEditAllModal = false" />
  </div>
</template>

<script setup>
import { defineAsyncComponent, ref, reactive, computed, onMounted } from 'vue'
import { useStorage } from '../composables/useStorage.js'
import { useClipboard } from '../composables/useClipboard.js'
import { useIcons } from '../composables/useIcons.js'
import { useI18n } from '../i18n/index.js'
import Header from './Header.vue'
import StorageTabs from './StorageTabs.vue'
import StorageTable from './StorageTable.vue'
const AddEditModal = defineAsyncComponent(() => import('./AddEditModal.vue'))
const EditAllModal = defineAsyncComponent(() => import('./EditAllModal.vue'))

// 使用统一的图标系统
const { SearchIcon } = useIcons()
const { t } = useI18n()

// 使用存储管理组合式API
const {
  activeTab,
  data,
  loading,
  searchQuery,
  storageCounts,
  filteredData,
  refreshData,
  debouncedRefresh,
  deleteItem,
  clearAll,
  clearCurrentPage,
  saveItem: storageServiceSaveItem,
  saveAllData,
  copyToClipboard,
  handleTabChange,
  debouncedSearch
} = useStorage()

// 使用剪贴板组合式API
const { pasteData } = useClipboard(activeTab, refreshData)

// 模态框状态
const showAddModal = ref(false)
const showEditAllModal = ref(false)
const editingItem = ref(null)

// 表单数据
const formData = reactive({
  key: '',
  value: ''
})

const currentTabData = computed(() => {
  return data.value.filter(item => item.type === activeTab.value)
})

// 编辑项目
const editItem = (item) => {
  editingItem.value = item
  formData.key = activeTab.value === 'cookie' ? item.name : item.key
  formData.value = item.value
  showAddModal.value = true
}

// 保存项目 - 与存储服务交互
const saveItem = async () => {
  const isEditing = !!editingItem.value
  const options = activeTab.value === 'cookie' && editingItem.value
    ? {
        domain: editingItem.value.domain,
        path: editingItem.value.path,
        secure: editingItem.value.secure,
        httpOnly: editingItem.value.httpOnly,
        hostOnly: editingItem.value.hostOnly,
        sameSite: editingItem.value.sameSite,
        expirationDate: editingItem.value.expirationDate,
        storeId: editingItem.value.storeId,
        partitionKey: editingItem.value.partitionKey
      }
    : {}
  const success = await storageServiceSaveItem(formData.key, formData.value, isEditing, options)

  if (success) {
    closeModal()
  }
}

// 关闭模态框
const closeModal = () => {
  showAddModal.value = false
  editingItem.value = null
  formData.key = ''
  formData.value = ''
}

onMounted(async () => {
  await refreshData(false, true)
})
</script>
