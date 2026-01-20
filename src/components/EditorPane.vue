<template>
  <div class="editor-pane">
    <div class="pane-header">编辑器</div>
    <textarea
      ref="editorRef"
      v-model="localContent"
      class="editor"
      @input="handleInput"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:content'])

const editorRef = ref(null)
const localContent = ref(props.content)

watch(() => props.content, (newVal) => {
  if (localContent.value !== newVal) {
    localContent.value = newVal
  }
})

const handleInput = () => {
  emit('update:content', localContent.value)
}
</script>

<style scoped>
.editor-pane {
  display: flex;
  flex-direction: column;
  width: 50%;
  border-right: 1px solid #ddd;
  background: #fff;
}

.pane-header {
  padding: 8px 16px;
  background: #f9f9f9;
  border-bottom: 1px solid #ddd;
  font-weight: 500;
  font-size: 14px;
  color: #666;
}

.editor {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: #fff;
  overflow-y: auto;
}
</style>
