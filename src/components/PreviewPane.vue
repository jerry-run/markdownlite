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
import 'highlight.js/styles/github.min.css'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const previewRef = ref(null)
const renderedContent = ref('')

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
  theme: 'default',
  securityLevel: 'loose',
})

// 自定义渲染器以支持 mermaid
const renderer = new marked.Renderer()

// 重写代码块渲染，支持 mermaid 和语法高亮
renderer.code = function(code, language) {
  if (language === 'mermaid') {
    // Mermaid 代码块，保留原始代码用于渲染
    return `<div class="mermaid">${code.trim()}</div>`
  }
  // 其他代码块使用语法高亮
  const highlighted = this.options.highlight(code, language || '')
  return `<pre><code class="hljs language-${language || 'text'}">${highlighted}</code></pre>`
}

marked.use({ renderer })

const renderContent = async () => {
  try {
    // 渲染 markdown
    let html = marked.parse(props.content)
    renderedContent.value = html
    
    // 等待 DOM 更新后渲染 mermaid
    await nextTick()
    
    // 查找所有 mermaid 图表并渲染
    const mermaidElements = previewRef.value?.querySelectorAll('.mermaid:not([data-processed])')
    if (mermaidElements && mermaidElements.length > 0) {
      mermaidElements.forEach((element, index) => {
        const id = `mermaid-${Date.now()}-${index}`
        element.id = id
        element.setAttribute('data-processed', 'true')
        mermaid.run({
          nodes: [element],
          suppressErrors: true,
        }).catch(err => {
          console.error('Mermaid 渲染错误:', err)
        })
      })
    }
  } catch (error) {
    console.error('渲染错误:', error)
    renderedContent.value = `<p style="color: red;">渲染错误: ${error.message}</p>`
  }
}

watch(() => props.content, () => {
  // 清除之前的处理标记，以便重新渲染 mermaid
  if (previewRef.value) {
    const processedElements = previewRef.value.querySelectorAll('.mermaid[data-processed]')
    processedElements.forEach(el => {
      el.removeAttribute('data-processed')
      el.innerHTML = el.textContent || el.innerText
    })
  }
  renderContent()
}, { immediate: true })
</script>

<style scoped>
.preview-pane {
  display: flex;
  flex-direction: column;
  width: 50%;
  background: #fff;
  overflow: hidden;
}

.pane-header {
  padding: 8px 16px;
  background: #f9f9f9;
  border-bottom: 1px solid #ddd;
  font-weight: 500;
  font-size: 14px;
  color: #666;
}

.preview-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  line-height: 1.8;
  color: #333;
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
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
}

.preview-content :deep(h2) {
  font-size: 1.5em;
  border-bottom: 1px solid #eaecef;
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
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 16px;
}

.preview-content :deep(code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

.preview-content :deep(pre) {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 16px;
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
  border: 1px solid #dfe2e5;
}

.preview-content :deep(table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

.preview-content :deep(img) {
  max-width: 100%;
  box-sizing: content-box;
  background-color: #fff;
  margin-bottom: 16px;
}

.preview-content :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.preview-content :deep(a:hover) {
  text-decoration: underline;
}

.preview-content :deep(.mermaid) {
  text-align: center;
  margin: 24px 0;
}
</style>
