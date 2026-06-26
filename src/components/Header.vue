<template>
  <div class="bg-white px-4 py-3 border-b border-gray-200 shadow-sm">
    <div class="flex items-center justify-between space-x-3">
      <!-- Logo -->
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <img :src="logoSrc" alt="Storage Manager Logo" class="w-8 h-8" @error="handleImageError" />
        </div>

        <!-- 标题和描述 -->
        <div class="flex-1">
          <h1 class="text-lg font-semibold text-gray-900">Storage Manager</h1>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex-shrink-0">
        <ActionButtons
          @add="$emit('add')"
          @edit-all="$emit('edit-all')"
          @paste="$emit('paste')"
          @clear="$emit('clear')"
          @clear-current-page="$emit('clear-current-page')"
          @refresh="$emit('refresh')"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import ActionButtons from './ActionButtons.vue'

const logoSrc = ref('/icons/icon-128.png')

// 定义事件
defineEmits(['add', 'edit-all', 'paste', 'clear', 'clear-current-page', 'refresh'])

// 处理图片加载错误
const handleImageError = (event) => {
  console.warn('Logo image failed to load:', event.target.src)
  // 可以设置一个默认图标或隐藏图片
  event.target.style.display = 'none'
}
</script>
