<template>
  <div class="preview-pane">
    <div class="pane-header">预览</div>
    <div ref="previewRef" class="preview-content" v-html="renderedContent"></div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { marked } from 'marked'
import mermaid from 'mermaid'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.min.css'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const previewRef = ref(null)
const renderedContent = ref('')

// 通过遍历元素查找匹配的 mermaid 元素（比选择器更可靠）
const findMermaidElementByCode = (container, targetCode) => {
  if (!container || !targetCode) return null
  
  const allMermaid = container.querySelectorAll('.mermaid')
  for (const el of allMermaid) {
    const codeAttr = el.getAttribute('data-mermaid-code')
    if (codeAttr === targetCode) {
      return el
    }
  }
  return null
}

// 防止多次 renderContent 并发执行导致“旧节点写入 / rect=0 / 插入错位”等问题
let activeRenderId = 0

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch (err) {
        console.error('语法高亮错误:', err)
      }
    }
    return hljs.highlightAuto(code).value
  }
})

// 配置 mermaid
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  fontSize: 12, // 字体大小设置为 12
  flowchart: {
    useMaxWidth: true,
    htmlLabels: true, // 使用 HTML 标签，允许自动调整大小
    curve: 'basis',
    nodeSpacing: 50,
    rankSpacing: 50,
    padding: 15, // 增加节点内边距，确保文字有足够空间
    wrap: true, // 允许文字换行
    paddingX: 20, // 水平内边距
    paddingY: 15 // 垂直内边距
  },
  themeVariables: {
    fontSize: '12px',
    fontFamily: 'inherit',
    primaryTextColor: '#d4d4d4',
    primaryBorderColor: '#3c3c3c',
    lineColor: '#858585',
    secondaryColor: '#007acc',
    tertiaryColor: '#1e1e1e',
    // 增加节点相关尺寸
    nodeBkg: '#1e1e1e',
    nodeBorder: '#3c3c3c',
    clusterBkg: '#1e1e1e',
    clusterBorder: '#3c3c3c',
    defaultLinkColor: '#858585',
    titleColor: '#d4d4d4',
    edgeLabelBackground: '#1e1e1e',
    actorBorder: '#3c3c3c',
    actorBkg: '#1e1e1e',
    actorTextColor: '#d4d4d4',
    actorLineColor: '#858585',
    signalColor: '#d4d4d4',
    signalTextColor: '#d4d4d4',
    labelBoxBkgColor: '#1e1e1e',
    labelBoxBorderColor: '#3c3c3c',
    labelTextColor: '#d4d4d4',
    loopTextColor: '#d4d4d4',
    noteBorderColor: '#3c3c3c',
    noteBkgColor: '#1e1e1e',
    noteTextColor: '#d4d4d4',
    activationBorderColor: '#3c3c3c',
    activationBkgColor: '#1e1e1e',
    sequenceNumberColor: '#d4d4d4',
    sectionBkgColor: '#1e1e1e',
    altBkgColor: '#1e1e1e',
    altBorderColor: '#3c3c3c'
  }
})

// 自定义渲染器以支持 mermaid
const renderer = new marked.Renderer()

// 重写代码块渲染，支持 mermaid 和语法高亮
renderer.code = function(code, language) {
  if (language === 'mermaid') {
    // Mermaid 代码块，使用纯文本节点避免 HTML 转义
    // 注意：不能使用 HTML 实体，需要直接插入文本
    const trimmedCode = code.trim()
    // 使用特殊标记，稍后在 DOM 中替换为纯文本
    return `<div class="mermaid" data-mermaid-code="${encodeURIComponent(trimmedCode)}"></div>`
  }
  // 其他代码块使用语法高亮
  const highlighted = this.options.highlight(code, language || '')
  return `<pre><code class="hljs language-${language || 'text'}">${highlighted}</code></pre>`
}

marked.use({ renderer })

const renderContent = async () => {
  const myRenderId = ++activeRenderId
  try {
    // 如果内容为空，清空预览
    if (!props.content || props.content.trim() === '') {
      renderedContent.value = ''
      return
    }
    
    // 渲染 markdown
    const contentSnapshot = props.content
    let html = marked.parse(contentSnapshot)
    
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
      console.error('previewRef.value 不存在！')
      return
    }
    
    // 验证 previewRef 的内容
    console.log('previewRef 内容长度:', previewRef.value.innerHTML.length)
    console.log('previewRef 是否包含 mermaid:', previewRef.value.innerHTML.includes('mermaid'))
    
    // 渲染 Mermaid：避免并发/旧节点引用导致的 isConnected=false。
    // 采用“收集占位符 -> 逐个渲染 -> 用 data-mermaid-code 重新定位 -> 写入 SVG”的稳定流程。
    const placeholders = Array.from(previewRef.value.querySelectorAll('.mermaid:not([data-processed])'))
    console.log('找到 Mermaid 元素数量:', placeholders.length)

    for (let i = 0; i < placeholders.length; i++) {
      if (myRenderId !== activeRenderId || props.content !== contentSnapshot) return

      const codeAttrRaw = placeholders[i].getAttribute('data-mermaid-code')
      if (!codeAttrRaw) continue

      let code = codeAttrRaw
      try { code = decodeURIComponent(codeAttrRaw) } catch (_) {}

      code = code
        .trim()
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')

      if (typeof mermaid.render !== 'function') return

      const id = `mermaid-${Date.now()}-${i}-${myRenderId}`
      const renderResult = await mermaid.render(id, code)
      const svgContent = renderResult?.svg || renderResult

      if (myRenderId !== activeRenderId || props.content !== contentSnapshot) return

      const target = findMermaidElementByCode(previewRef.value, codeAttrRaw)
      if (!target) continue

      target.id = id
      target.className = 'mermaid'
      target.innerHTML = svgContent
      target.setAttribute('data-processed', 'true')
    }
  } catch (error) {
    console.error('渲染错误:', error)
    renderedContent.value = `<p style="color: #f48771;">渲染错误: ${error.message}</p>`
  }
}

// 使用防抖避免频繁重新渲染
// 注意：防抖时间应该与 EditorPane 的防抖时间一致（100ms），确保内容同步
let renderTimer = null
let lastRenderedContent = '' // 记录上次渲染的内容，避免重复渲染

watch(() => props.content, (newContent) => {
  // 如果内容没有变化，跳过渲染
  if (newContent === lastRenderedContent) {
    return
  }
  
  // 清除定时器
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  
  // 使用防抖延迟渲染，避免在 v-html 更新过程中操作 DOM
  // 防抖时间与 EditorPane 一致（100ms），确保内容同步
  renderTimer = setTimeout(() => {
    // 再次检查内容是否变化（可能在防抖期间内容又变了）
    if (props.content !== lastRenderedContent) {
      lastRenderedContent = props.content
      renderContent()
    }
  }, 100) // 与 EditorPane 的防抖时间一致
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
