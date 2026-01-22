<template>
  <div class="app-container">
    <MenuBar 
      ref="menuBarRef"
      :is-dirty="doc.isDirty.value"
      :has-file="doc.hasFile.value"
      :recent-files="doc.recentFiles.value"
      @open-file="handleOpenFile" 
      @open-folder="handleOpenFolder" 
      @save="handleSave" 
      @open-recent="handleOpenRecent"
      @clear-recent="handleClearRecent"
    />
    <div class="main-content">
      <EditorPane :content="editorContent" @update:content="handleContentUpdate" @scroll="handleEditorScroll" />
      <PreviewPane :content="previewContent" :scroll-info="scrollInfo" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import MenuBar from './components/MenuBar.vue'
import EditorPane from './components/EditorPane.vue'
import PreviewPane from './components/PreviewPane.vue'
import { useDocument } from './stores/useDocument'

// 默认示例文档（从 Markdown 文件原样加载，避免模板字符串转义导致的渲染不一致）
import defaultContent from './default-content.md?raw'

const menuBarRef = ref(null)
const scrollInfo = ref(null)

const doc = useDocument({ initialContent: defaultContent, debounceMs: 100 })

// 确保传递给组件的是字符串值而不是 ref 对象
const editorContent = computed(() => String(doc.content.value ?? ''))
const previewContent = computed(() => String(doc.debouncedContent.value ?? ''))

const getBaseName = (filePath) => {
  if (!filePath) return ''
  const parts = String(filePath).split(/[\\/]/)
  return parts[parts.length - 1] || ''
}

// 窗口标题：显示文件名 + dirty 标记
watchEffect(() => {
  const name = getBaseName(doc.currentPath.value) || 'MarkdownLite'
  document.title = `${doc.isDirty.value ? '*' : ''}${name}`
})

const handleContentUpdate = (next) => {
  doc.setContent(next)
}

const handleEditorScroll = (info) => {
  scrollInfo.value = info
}

const handleOpenFile = async () => {
  try {
    const path = await doc.openFile()
    if (!path) return
    menuBarRef.value?.setCurrentPath(path)
  } catch (error) {
    console.error('打开文件失败:', error)
  }
}

const handleOpenRecent = async (path) => {
  try {
    const opened = await doc.openPath(path)
    if (!opened) return
    menuBarRef.value?.setCurrentPath(opened)
  } catch (error) {
    console.error('打开最近文件失败:', error)
  }
}

const handleClearRecent = () => {
  doc.clearRecentFiles()
}

const handleOpenFolder = async () => {
  try {
    const folderPath = await doc.openFolder()
    if (!folderPath) return
    // 文件夹打开逻辑 - 可以扩展为文件浏览器
    console.log('打开文件夹:', folderPath)
  } catch (error) {
    console.error('打开文件夹失败:', error)
  }
}

const handleSave = async (filePathFromMenu) => {
  try {
    const targetPath =
      filePathFromMenu ? await doc.save(filePathFromMenu) : await doc.saveAs()
    if (!targetPath) return
    menuBarRef.value?.setCurrentPath(targetPath)
    console.log('文件已保存:', targetPath)
  } catch (error) {
    console.error('保存文件失败:', error)
  }
}

// 快捷键：Cmd/Ctrl + S 保存
const handleKeydown = (e) => {
  const isMac = navigator.platform?.toLowerCase().includes('mac')
  const mod = isMac ? e.metaKey : e.ctrlKey
  if (!mod) return
  if (e.key?.toLowerCase?.() !== 's') return
  e.preventDefault()
  // 有路径则直接保存，否则另存为
  handleSave(doc.hasFile.value ? doc.currentPath.value : null)
}

// 关闭/刷新前未保存提示（Tauri WebView 也会触发 beforeunload）
const handleBeforeUnload = (e) => {
  if (!doc.isDirty.value) return
  e.preventDefault()
  // 现代浏览器会忽略自定义文案，显示统一提示
  e.returnValue = ''
  return ''
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  background: var(--bg);
  color: var(--text);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
