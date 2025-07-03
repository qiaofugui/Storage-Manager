<template>
  <div class="h-full flex flex-col">
    <Header @add="showAddModal = true" @edit-all="showEditAllModal = true" @paste="pasteData" @clear="clearAll"
      @refresh="debouncedRefresh" />

    <!-- 标签页 -->
    <div class="bg-white px-2 py-1.5">
      <div class="flex justify-between items-center pb-1.5 border-b border-gray-200">
        <!-- 标签页 -->
        <StorageTabs :active-tab="activeTab" @tab-change="handleTabChange" />
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="flex-1 p-2 bg-white overflow-hidden flex flex-col">
      <!-- 搜索框 -->
      <div class="mb-3">
        <n-input :value="searchQuery" @update:value="debouncedSearch" placeholder="搜索键名或值..." clearable class="w-full">
          <template #prefix>
            <n-icon>
              <SearchIcon />
            </n-icon>
          </template>
        </n-input>
      </div>

      <!-- 表格 -->
      <div class="flex-1 overflow-hidden">
        <StorageTable :data="filteredData" :loading="loading" @copy="copyToClipboard" @delete="deleteItem"
          @edit="editItem" />
      </div>
    </div>

    <!-- 新增/编辑模态框 -->
    <AddEditModal v-model:show="showAddModal" :editing-item="editingItem" :form-data="formData" @save="saveItem"
      @close="closeModal" />

    <!-- 批量编辑模态框 -->
    <EditAllModal v-model:show="showEditAllModal" :data="filteredData" :storage-type="activeTab" @save="saveAllData"
      @close="showEditAllModal = false" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { NInput, NIcon } from 'naive-ui'
import { useStorage } from '../composables/useStorage.js'
import { useClipboard } from '../composables/useClipboard.js'
import { useIcons } from '../composables/useIcons.js'
import Header from './Header.vue'
import StorageTabs from './StorageTabs.vue'
import ActionButtons from './ActionButtons.vue'
import StorageTable from './StorageTable.vue'
import AddEditModal from './AddEditModal.vue'
import EditAllModal from './EditAllModal.vue'

// 使用统一的图标系统
const { SearchIcon } = useIcons()

// 使用存储管理组合式API
const {
  activeTab,
  data,
  loading,
  searchQuery,
  filteredData,
  refreshData,
  debouncedRefresh,
  deleteItem,
  clearAll,
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

// 编辑项目
const editItem = (item) => {
  editingItem.value = item
  formData.key = item.key
  formData.value = item.value
  showAddModal.value = true
}

// 保存项目 - 与存储服务交互
const saveItem = async () => {
  const isEditing = !!editingItem.value
  const success = await storageServiceSaveItem(formData.key, formData.value, isEditing)

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

onMounted(() => {
  refreshData()
})
</script>