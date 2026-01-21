<template>
  <div class="preview-pane">
    <div class="pane-header">预览</div>
    <div ref="previewRef" class="preview-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import 'highlight.js/styles/github-dark.min.css'
import { renderMarkdownToHtml } from '../render/markdown'
import { renderMermaidInContainer } from '../render/mermaid'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const previewRef = ref(null)
const renderedContent = ref('')

// 防止多次 renderContent 并发执行导致“旧节点写入 / rect=0 / 插入错位”等问题
let activeRenderId = 0

const renderContent = async () => {
  const myRenderId = ++activeRenderId
  try {
    const contentSnapshot = String(props.content ?? '')
    // 如果内容为空，清空预览
    if (!contentSnapshot || contentSnapshot.trim() === '') {
      renderedContent.value = ''
      return
    }
    
    // 渲染 markdown
    const html = renderMarkdownToHtml(contentSnapshot)
    
    // 先设置 HTML，触发 v-html 更新
    renderedContent.value = html
    
    // 等待 DOM 更新后渲染 mermaid
    // 需要等待 v-html 完全渲染完成
    await nextTick()
    await nextTick() // 双重 nextTick 确保 DOM 完全更新
    
    // 额外等待，确保 v-html 完全渲染
    await new Promise(resolve => setTimeout(resolve, 150))

    // 如果期间发生了新的渲染请求或内容变化，放弃当前渲染（避免对旧 DOM 写入）
    if (myRenderId !== activeRenderId || props.content !== contentSnapshot) {
      return
    }
    
    // 再次确认 previewRef 已经更新
    if (!previewRef.value) {
      return
    }
    
    // 渲染 Mermaid：避免并发/旧节点写入，具体逻辑在 render 层封装
    await renderMermaidInContainer(previewRef.value, {
      renderId: myRenderId,
      isStale: () => myRenderId !== activeRenderId || props.content !== contentSnapshot,
    })
  } catch (error) {
    console.error('渲染错误:', error)
    // 安全：避免把未转义的错误信息写入 v-html
    const msg = String(error?.message ?? '未知错误')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
    renderedContent.value = `<p style="color: #f48771;">渲染错误: ${msg}</p>`
  }
}

watch(() => props.content, (newContent) => {
  // 预览防抖已上移到 App.vue，这里只做最小的“内容变化即渲染”
  renderContent()
}, { immediate: true })
</script>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  width: 50%;
  background: var(--bg);
  overflow: hidden;
  color: var(--text);
}

.pane-header {
  padding: 8px 16px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  font-weight: 500;
  font-size: 14px;
  color: var(--muted);
}

.preview-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  overflow-x: visible;
  line-height: 1.8;
  color: var(--text);
  background: var(--bg);
  position: relative;
}

.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3),
.preview-content :deep(h4),
.preview-content :deep(h5),
.preview-content :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.preview-content :deep(h1) {
  font-size: 2em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
}

.preview-content :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
}

.preview-content :deep(h3) {
  font-size: 1.25em;
}

.preview-content :deep(p) {
  margin-bottom: 16px;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 2em;
}

.preview-content :deep(li) {
  margin-bottom: 4px;
}

.preview-content :deep(blockquote) {
  padding: 0 1em;
  color: var(--muted);
  border-left: 0.25em solid var(--border);
  margin-bottom: 16px;
}

.preview-content :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: var(--panel-2);
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.preview-content :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: var(--panel);
  border-radius: 6px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
}

.preview-content :deep(pre code) {
  display: inline;
  max-width: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  line-height: inherit;
  word-wrap: normal;
  background-color: transparent;
  border: 0;
}

.preview-content :deep(table) {
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.preview-content :deep(table th),
.preview-content :deep(table td) {
  padding: 6px 13px;
  border: 1px solid var(--border);
}

.preview-content :deep(table th) {
  font-weight: 600;
  background-color: var(--panel);
}

.preview-content :deep(img) {
  max-width: 100%;
  box-sizing: content-box;
  background-color: var(--bg);
  margin-bottom: 16px;
}

.preview-content :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.preview-content :deep(a:hover) {
  text-decoration: underline;
}

.preview-content :deep(.mermaid) {
  text-align: center;
  margin: 16px 0;
  display: block;
  width: 100%;
  overflow-x: auto; /* 图太宽时允许横向滚动 */
  overflow-y: hidden;
}

/* 关键点：只限制 max-width，避免把图“放大到 100% 宽度” */
.preview-content :deep(.mermaid svg) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 0 auto;
  background: transparent;
}

/* 确保 Mermaid 节点中的文字完整显示 */
.preview-content :deep(.mermaid svg .nodeLabel),
.preview-content :deep(.mermaid svg .edgeLabel),
.preview-content :deep(.mermaid svg .cluster-label text),
.preview-content :deep(.mermaid svg text) {
  white-space: normal !important;
  word-wrap: break-word !important;
  overflow: visible !important;
  text-overflow: clip !important;
}

/* 确保节点矩形有足够空间，允许自动调整大小 */
.preview-content :deep(.mermaid svg .node rect),
.preview-content :deep(.mermaid svg .node polygon),
.preview-content :deep(.mermaid svg .flowchart-node rect),
.preview-content :deep(.mermaid svg .flowchart-node polygon) {
  rx: 4px;
  ry: 4px;
}

/* 确保 HTML 标签（htmlLabels）中的文字可以换行 */
.preview-content :deep(.mermaid svg foreignObject),
.preview-content :deep(.mermaid svg foreignObject div) {
  overflow: visible !important;
  word-wrap: break-word !important;
  white-space: normal !important;
}

.preview-content :deep(.mermaid[data-processed]) {
  /* 已处理的 Mermaid 图表样式 */
  display: block !important;
  visibility: visible !important;
}
</style>
