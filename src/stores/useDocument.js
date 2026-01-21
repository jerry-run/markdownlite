import { computed, ref, watch } from 'vue'
import {
  openMarkdownFile,
  pickFolder,
  pickSaveMarkdownPath,
  readFileAsText,
  writeFileText,
} from '../services/fileService'

/**
 * 轻量文档状态层（迭代 5.1：只下沉 App.vue 的逻辑，不引入 Pinia）
 */
export function useDocument(options = {}) {
  const initialContent = options.initialContent ?? ''

  const recentStorageKey = options.recentStorageKey ?? 'markdownlite.recentFiles'
  const recentLimit = options.recentLimit ?? 10

  const content = ref(String(initialContent ?? ''))
  const debouncedContent = ref(String(initialContent ?? ''))
  const currentPath = ref(null)
  const lastSavedContent = ref(String(initialContent ?? ''))
  const recentFiles = ref([])

  const isDirty = computed(() => content.value !== lastSavedContent.value)
  const hasFile = computed(() => !!currentPath.value)

  const loadRecentFiles = () => {
    try {
      const raw = localStorage.getItem(recentStorageKey)
      const parsed = raw ? JSON.parse(raw) : []
      if (Array.isArray(parsed)) {
        recentFiles.value = parsed.filter((x) => typeof x === 'string' && x.length > 0)
      } else {
        recentFiles.value = []
      }
    } catch {
      recentFiles.value = []
    }
  }

  const persistRecentFiles = () => {
    try {
      localStorage.setItem(recentStorageKey, JSON.stringify(recentFiles.value))
    } catch {
      // ignore
    }
  }

  const addRecentFile = (path) => {
    const p = String(path ?? '')
    if (!p) return
    const next = [p, ...recentFiles.value.filter((x) => x !== p)].slice(0, recentLimit)
    recentFiles.value = next
    persistRecentFiles()
  }

  const clearRecentFiles = () => {
    recentFiles.value = []
    persistRecentFiles()
  }

  // 初始化加载
  if (typeof localStorage !== 'undefined') loadRecentFiles()

  // 统一预览防抖：只在状态层做一次
  const debounceMs = options.debounceMs ?? 100
  let previewDebounceTimer = null
  watch(
    content,
    (val) => {
      if (previewDebounceTimer) clearTimeout(previewDebounceTimer)
      previewDebounceTimer = setTimeout(() => {
        debouncedContent.value = val
      }, debounceMs)
    },
    { immediate: true }
  )

  async function openFile() {
    const fileData = await openMarkdownFile()
    if (!fileData?.path) return null
    currentPath.value = fileData.path
    content.value = String(fileData.content ?? '')
    // 打开文件后立即同步一次预览内容，避免等待防抖
    debouncedContent.value = content.value
    lastSavedContent.value = content.value
    addRecentFile(fileData.path)
    return fileData.path
  }

  async function openPath(path) {
    const p = String(path ?? '')
    if (!p) return null
    const text = await readFileAsText(p)
    currentPath.value = p
    content.value = String(text ?? '')
    debouncedContent.value = content.value
    lastSavedContent.value = content.value
    addRecentFile(p)
    return p
  }

  async function openFolderAction() {
    const folderPath = await pickFolder()
    return folderPath || null
  }

  function setContent(next) {
    content.value = String(next ?? '')
  }

  function markSaved() {
    lastSavedContent.value = content.value
  }

  async function save(filePathFromMenu) {
    const targetPath =
      filePathFromMenu || currentPath.value || (await pickSaveMarkdownPath())
    if (!targetPath) return null

    await writeFileText(targetPath, content.value)
    currentPath.value = targetPath
    markSaved()
    addRecentFile(targetPath)
    return targetPath
  }

  async function saveAs() {
    const targetPath = await pickSaveMarkdownPath()
    if (!targetPath) return null

    await writeFileText(targetPath, content.value)
    currentPath.value = targetPath
    markSaved()
    addRecentFile(targetPath)
    return targetPath
  }

  return {
    content,
    debouncedContent,
    currentPath,
    hasFile,
    isDirty,
    lastSavedContent,
    recentFiles,
    addRecentFile,
    clearRecentFiles,
    setContent,
    openFile,
    openPath,
    openFolder: openFolderAction,
    save,
    saveAs,
  }
}

