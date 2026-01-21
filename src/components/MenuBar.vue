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
    <div class="menu-item recent-item" ref="recentItemRef" @click="toggleRecent">
      <span>🕘</span>
      <span>最近</span>
    </div>
    <div class="menu-item save-item" @click="saveFile" :class="{ 'is-dirty': isDirty, 'has-file': hasFile }">
      <span>💾</span>
      <span>保存</span>
      <span v-if="isDirty" class="dirty-indicator">● 未保存</span>
    </div>

    <div
      v-if="showRecent"
      ref="recentPopoverRef"
      class="recent-popover"
      :style="popoverStyle"
      @click.stop
    >
      <div class="recent-header">
        <span>最近打开</span>
        <button class="recent-clear" :disabled="!recentFiles.length" @click="clearRecent">
          清空
        </button>
      </div>
      <div v-if="!recentFiles.length" class="recent-empty">暂无记录</div>
      <div v-else class="recent-list">
        <button
          v-for="p in recentFiles"
          :key="p"
          class="recent-row"
          @click="openRecent(p)"
          :title="p"
        >
          {{ p }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  isDirty: {
    type: Boolean,
    default: false,
  },
  hasFile: {
    type: Boolean,
    default: false,
  },
  recentFiles: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['open-file', 'open-folder', 'save', 'open-recent', 'clear-recent'])
const currentPath = ref(null)
const showRecent = ref(false)
const recentItemRef = ref(null)
const recentPopoverRef = ref(null)

const popoverStyle = computed(() => {
  if (!recentItemRef.value) return {}
  const rect = recentItemRef.value.getBoundingClientRect()
  return {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
  }
})

const openFile = async () => {
  // 仅发出意图事件，具体 I/O 由父组件处理
  emit('open-file')
}

const openFolder = async () => {
  // 仅发出意图事件，具体 I/O 由父组件处理
  emit('open-folder')
}

const saveFile = async () => {
  // 仅发出意图事件，具体 I/O 由父组件处理
  // 与原行为一致：未打开文件时也允许触发“另存为”
  emit('save', props.hasFile ? currentPath.value : null)
}

const toggleRecent = (e) => {
  e?.stopPropagation?.()
  showRecent.value = !showRecent.value
}

const openRecent = (path) => {
  showRecent.value = false
  emit('open-recent', path)
}

const clearRecent = (e) => {
  e?.stopPropagation?.()
  emit('clear-recent')
}

const handleDocClick = (e) => {
  // 如果点击的是菜单栏内的元素，不关闭弹窗
  const menuBar = e.target.closest('.menu-bar')
  if (menuBar) return
  showRecent.value = false
}

onMounted(() => {
  // 使用捕获阶段，确保在其他点击处理之前执行
  document.addEventListener('click', handleDocClick, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick, true)
})

defineExpose({
  setCurrentPath: (path) => {
    currentPath.value = path
  },
  getCurrentPath: () => currentPath.value,
})
</script>

<style scoped>
.menu-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  gap: 16px;
  user-select: none;
  color: var(--text);
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
  color: var(--text);
}

.menu-item:hover:not(.disabled) {
  background: var(--panel-2);
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-item.is-dirty {
  background: var(--panel-2);
  border: 1px solid var(--accent);
}

.save-item.is-dirty:hover {
  background: var(--panel-2);
  border-color: var(--accent);
}

.dirty-indicator {
  margin-left: 6px;
  font-size: 12px;
  color: var(--accent);
  opacity: 0.8;
}

.recent-item {
  position: relative;
}

.recent-popover {
  position: fixed;
  width: 520px;
  max-height: 320px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  z-index: 1000;
}

.recent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
  font-size: 13px;
}

.recent-clear {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.recent-clear:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recent-empty {
  padding: 14px 12px;
  color: var(--muted);
  font-size: 13px;
}

.recent-list {
  overflow: auto;
}

.recent-row {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.recent-row:hover {
  background: var(--panel-2);
}
</style>
