<template>
  <div class="preview-pane">
    <div class="pane-header">预览</div>
    <div ref="previewRef" class="preview-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import 'highlight.js/styles/github-dark.min.css'
import { renderMarkdownToHtml } from '../render/markdown'
import { renderMermaidInContainer } from '../render/mermaid'

const props = defineProps({
  content: {
    type: String,
    default: ''
  },
  scrollInfo: {
    type: Object,
    default: null
  }
})

const previewRef = ref(null)
const renderedContent = ref('')

// 防止多次 renderContent 并发执行导致“旧节点写入 / rect=0 / 插入错位”等问题
let activeRenderId = 0

// 滚动同步：避免循环触发
let isScrollingFromEditor = false
let scrollSyncRafId = null
// 缓存行号到元素的映射，减少 DOM 查询
let lineElementCache = new Map()

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
    // 即使 Mermaid 渲染出错，也不影响整个预览（错误已在 renderMermaidInContainer 中单独处理）
    try {
      await renderMermaidInContainer(previewRef.value, {
        renderId: myRenderId,
        isStale: () => myRenderId !== activeRenderId || props.content !== contentSnapshot,
      })
    } catch (error) {
      // 如果 renderMermaidInContainer 本身出错（不应该发生），记录但不影响预览
      console.error('Mermaid 渲染容器错误:', error)
      // 不替换 renderedContent，保持已渲染的 Markdown 内容
    }
    
    // 渲染完成后重建行号元素缓存
    rebuildLineElementCache()
  } catch (error) {
    // 只有在 Markdown 渲染阶段出错时才替换整个预览
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

// 重建行号元素缓存
const rebuildLineElementCache = () => {
  if (!previewRef.value) return
  
  lineElementCache.clear()
  const elements = previewRef.value.querySelectorAll('[data-line]')
  elements.forEach(el => {
    const line = parseInt(el.getAttribute('data-line'), 10)
    if (!isNaN(line)) {
      // 存储该行号对应的第一个元素
      if (!lineElementCache.has(line)) {
        lineElementCache.set(line, el)
      }
    }
  })
}

// 监听编辑器滚动事件，同步预览窗格滚动
watch(() => props.scrollInfo, (scrollInfo) => {
  if (!scrollInfo || !previewRef.value || isScrollingFromEditor) return
  
  // 验证 scrollInfo 的有效性
  if (typeof scrollInfo.lineNumber !== 'number' || 
      typeof scrollInfo.scrollRatio !== 'number' ||
      isNaN(scrollInfo.lineNumber) || 
      isNaN(scrollInfo.scrollRatio)) {
    return
  }
  
  // 取消之前的 RAF
  if (scrollSyncRafId !== null) {
    cancelAnimationFrame(scrollSyncRafId)
  }
  
  // 使用 requestAnimationFrame 实现流畅滚动
  scrollSyncRafId = requestAnimationFrame(() => {
    try {
      isScrollingFromEditor = true
      
      const { lineNumber, scrollRatio } = scrollInfo
      const container = previewRef.value
      
      // 检查容器是否仍然有效
      if (!container || !container.scrollHeight) {
        isScrollingFromEditor = false
        scrollSyncRafId = null
        return
      }
      
      // 方法1：优先使用缓存查找元素
      let targetElement = null
      try {
        targetElement = lineElementCache.get(lineNumber)
        
        // 如果缓存中没有，尝试查询（可能是新渲染的内容）
        if (!targetElement) {
          targetElement = container.querySelector(`[data-line="${lineNumber}"]`)
          if (targetElement) {
            lineElementCache.set(lineNumber, targetElement)
          }
        }
      } catch (e) {
        // 查询失败，使用滚动比例
      }
      
      if (targetElement) {
        try {
          // 直接计算并设置 scrollTop，性能更好
          const containerRect = container.getBoundingClientRect()
          const elementRect = targetElement.getBoundingClientRect()
          
          // 检查坐标是否有效
          if (containerRect && elementRect) {
            // 计算目标滚动位置：元素顶部对齐到容器顶部
            const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top)
            
            // 验证滚动位置是否有效
            if (!isNaN(targetScrollTop) && isFinite(targetScrollTop)) {
              // 直接设置 scrollTop，避免 scrollTo 的开销
              container.scrollTop = Math.max(0, Math.min(targetScrollTop, container.scrollHeight - container.clientHeight))
            }
          }
        } catch (e) {
          // 计算失败，使用滚动比例
          const maxScroll = container.scrollHeight - container.clientHeight
          if (maxScroll > 0 && !isNaN(scrollRatio) && isFinite(scrollRatio)) {
            container.scrollTop = Math.max(0, Math.min(scrollRatio * maxScroll, maxScroll))
          }
        }
      } else {
        // 方法2：如果找不到精确行号，使用滚动比例（最快）
        try {
          const maxScroll = container.scrollHeight - container.clientHeight
          if (maxScroll > 0 && !isNaN(scrollRatio) && isFinite(scrollRatio)) {
            container.scrollTop = Math.max(0, Math.min(scrollRatio * maxScroll, maxScroll))
          }
        } catch (e) {
          // 滚动比例计算失败，静默处理
        }
      }
      
      // 短暂延迟后重置标志，避免影响用户手动滚动
      setTimeout(() => {
        isScrollingFromEditor = false
      }, 50) // 减少延迟时间
    } catch (error) {
      // 静默处理错误，避免影响预览显示
      isScrollingFromEditor = false
    } finally {
      scrollSyncRafId = null
    }
  })
}, { deep: true })

// 清理资源
onBeforeUnmount(() => {
  if (scrollSyncRafId !== null) {
    cancelAnimationFrame(scrollSyncRafId)
    scrollSyncRafId = null
  }
  lineElementCache.clear()
})
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

/* Mermaid 错误状态样式 */
.preview-content :deep(.mermaid-error) {
  display: block !important;
  visibility: visible !important;
  margin: 16px 0;
}

.preview-content :deep(.mermaid-error div) {
  background: var(--panel-2, #2d2d2d) !important;
  border: 1px solid var(--border, #3c3c3c) !important;
  border-radius: 6px !important;
  color: #f48771 !important;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
  padding: 16px !important;
}
</style>
