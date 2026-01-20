<template>
  <div class="app-container">
    <MenuBar 
      ref="menuBarRef"
      @open-file="handleOpenFile" 
      @open-folder="handleOpenFolder" 
      @save="handleSave" 
    />
    <div class="main-content">
      <EditorPane :content="content" @update:content="content = $event" />
      <PreviewPane :content="content" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import MenuBar from './components/MenuBar.vue'
import EditorPane from './components/EditorPane.vue'
import PreviewPane from './components/PreviewPane.vue'

const content = ref('# 欢迎使用 MarkdownLite\n\n这是一个支持 Markdown 和 Mermaid 的编辑器。\n\n## Mermaid 示例\n\n```mermaid\ngraph TD\n    A[开始] --> B{判断条件}\n    B -->|是| C[执行操作]\n    B -->|否| D[结束]\n    C --> D\n```')

const currentFilePath = ref(null)
const menuBarRef = ref(null)

const handleOpenFile = async (fileData) => {
  if (fileData && fileData.path && fileData.content) {
    currentFilePath.value = fileData.path
    content.value = fileData.content
    if (menuBarRef.value) {
      menuBarRef.value.setCurrentPath(fileData.path)
    }
  }
}

const handleOpenFolder = async (folderPath) => {
  // 文件夹打开逻辑 - 可以扩展为文件浏览器
  console.log('打开文件夹:', folderPath)
}

const handleSave = async (filePath) => {
  if (filePath) {
    try {
      await writeTextFile(filePath, content.value)
      currentFilePath.value = filePath
      if (menuBarRef.value) {
        menuBarRef.value.setCurrentPath(filePath)
      }
      console.log('文件已保存:', filePath)
    } catch (error) {
      console.error('保存文件失败:', error)
    }
  }
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
