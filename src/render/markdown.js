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
const renderer = new marked.Renderer()
renderer.code = function (code, language) {
  if (language === 'mermaid') {
    const trimmedCode = code.trim()
    return `<div class="mermaid" data-mermaid-code="${encodeURIComponent(trimmedCode)}"></div>`
  }

  const highlighted = this.options.highlight(code, language || '')
  return `<pre><code class="hljs language-${language || 'text'}">${highlighted}</code></pre>`
}
marked.use({ renderer })

export function renderMarkdownToHtml(markdown) {
  const input = markdown ?? ''
  if (!input.trim()) return ''
  const raw = marked.parse(input)

  // 安全：消毒 HTML，防止 v-html XSS（同时保留 Mermaid 占位符所需的 data-mermaid-code）
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['class', 'id', 'data-mermaid-code', 'data-processed'],
  })
}

