<template>
  <div class="menu-bar">
    <div class="menu-item" @click="openFile">
      <span>📁</span>
      <span>打开文件</span>
    </div>
    <div class="menu-item" @click="openFolder">
      <span>📂</span>
      <span>打开文件夹</span>
    </div>
    <div class="menu-item" @click="saveFile" :class="{ disabled: !hasFile }">
      <span>💾</span>
      <span>保存</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

const emit = defineEmits(['open-file', 'open-folder', 'save'])
const hasFile = ref(false)
const currentPath = ref(null)

const openFile = async () => {
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Markdown',
        extensions: ['md', 'markdown']
      }]
    })
    
    if (selected) {
      currentPath.value = selected
      hasFile.value = true
      const content = await readTextFile(selected)
      emit('open-file', { path: selected, content })
    }
  } catch (error) {
    console.error('打开文件失败:', error)
  }
}

const openFolder = async () => {
  try {
    const selected = await open({
      directory: true,
      multiple: false
    })
    
    if (selected) {
      emit('open-folder', selected)
    }
  } catch (error) {
    console.error('打开文件夹失败:', error)
  }
}

const saveFile = async () => {
  if (!hasFile.value) {
    // 如果没有打开的文件，使用另存为
    try {
      const selected = await save({
        filters: [{
          name: 'Markdown',
          extensions: ['md']
        }]
      })
      
      if (selected) {
        currentPath.value = selected
        hasFile.value = true
        emit('save', selected)
      }
    } catch (error) {
      console.error('保存文件失败:', error)
    }
  } else {
    emit('save', currentPath.value)
  }
}

// 暴露方法供父组件调用
const setHasFile = (value) => {
  hasFile.value = value
}

defineExpose({
  setCurrentPath: (path) => {
    currentPath.value = path
    hasFile.value = !!path
  },
  getCurrentPath: () => currentPath.value
})
</script>

<style scoped>
.menu-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  gap: 16px;
  user-select: none;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  font-size: 14px;
}

.menu-item:hover:not(.disabled) {
  background: #e0e0e0;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
