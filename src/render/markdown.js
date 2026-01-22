import { marked } from 'marked'
import hljs from 'highlight.js'
import DOMPurify from 'dompurify'

// marked 全局配置：保持与原实现一致
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value
      } catch {
        // fall through to auto
      }
    }
    return hljs.highlightAuto(code).value
  },
})

// 自定义渲染器：把 mermaid 代码块转成占位符，后续由 mermaid 渲染器替换
// 同时为元素添加行号标记，用于同步滚动
const renderer = new marked.Renderer()

// 存储当前渲染的行号信息
let currentLineNumber = 1

renderer.heading = function (text, level) {
  const line = currentLineNumber
  currentLineNumber++
  return `<h${level} data-line="${line}">${text}</h${level}>`
}

renderer.paragraph = function (text) {
  const line = currentLineNumber
  currentLineNumber++
  return `<p data-line="${line}">${text}</p>`
}

renderer.list = function (body, ordered) {
  const line = currentLineNumber
  currentLineNumber++
  const tag = ordered ? 'ol' : 'ul'
  return `<${tag} data-line="${line}">${body}</${tag}>`
}

renderer.listitem = function (text) {
  const line = currentLineNumber
  currentLineNumber++
  return `<li data-line="${line}">${text}</li>`
}

renderer.blockquote = function (quote) {
  const line = currentLineNumber
  currentLineNumber++
  return `<blockquote data-line="${line}">${quote}</blockquote>`
}

renderer.code = function (code, language) {
  const line = currentLineNumber
  // 代码块可能跨越多行，计算行数
  const codeLines = code.split('\n').length
  currentLineNumber += codeLines
  
  if (language === 'mermaid') {
    const trimmedCode = code.trim()
    return `<div class="mermaid" data-mermaid-code="${encodeURIComponent(trimmedCode)}" data-line="${line}"></div>`
  }

  const highlighted = this.options.highlight(code, language || '')
  return `<pre data-line="${line}"><code class="hljs language-${language || 'text'}">${highlighted}</code></pre>`
}

renderer.table = function (header, body) {
  const line = currentLineNumber
  currentLineNumber++
  return `<table data-line="${line}"><thead>${header}</thead><tbody>${body}</tbody></table>`
}

renderer.tablerow = function (content) {
  const line = currentLineNumber
  currentLineNumber++
  return `<tr data-line="${line}">${content}</tr>`
}

renderer.hr = function () {
  const line = currentLineNumber
  currentLineNumber++
  return `<hr data-line="${line}">`
}

marked.use({ renderer })

export function renderMarkdownToHtml(markdown) {
  const input = markdown ?? ''
  if (!input.trim()) return ''
  
  // 重置行号计数器
  currentLineNumber = 1
  
  const raw = marked.parse(input)

  // 安全：消毒 HTML，防止 v-html XSS（同时保留 Mermaid 占位符所需的 data-mermaid-code 和行号标记 data-line）
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['class', 'id', 'data-mermaid-code', 'data-processed', 'data-line'],
  })
}

