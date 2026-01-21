import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderMarkdownToHtml } from '../../src/render/markdown'
import DOMPurify from 'dompurify'

// Mock DOMPurify - 使用真实的 sanitize 行为
vi.mock('dompurify', async () => {
  const actual = await vi.importActual('dompurify')
  return {
    default: actual.default,
  }
})

describe('renderMarkdownToHtml', () => {
  it('应该渲染基本 Markdown', () => {
    const result = renderMarkdownToHtml('# 标题\n\n段落内容')
    expect(result).toContain('<h1>标题</h1>')
    expect(result).toContain('<p>段落内容</p>')
  })

  it('空内容应该返回空字符串', () => {
    expect(renderMarkdownToHtml('')).toBe('')
    expect(renderMarkdownToHtml('   ')).toBe('')
    expect(renderMarkdownToHtml('\n\n')).toBe('')
  })

  it('null/undefined 应该返回空字符串', () => {
    expect(renderMarkdownToHtml(null)).toBe('')
    expect(renderMarkdownToHtml(undefined)).toBe('')
  })

  it('应该保留 Mermaid 占位符', () => {
    const result = renderMarkdownToHtml('```mermaid\ngraph TD\nA-->B\n```')
    expect(result).toContain('class="mermaid"')
    expect(result).toContain('data-mermaid-code')
  })

  it('应该对普通代码块进行语法高亮', () => {
    const result = renderMarkdownToHtml('```javascript\nconst x = 1;\n```')
    expect(result).toContain('<pre>')
    expect(result).toContain('<code')
    expect(result).toContain('hljs')
  })

  it('应该处理多个代码块', () => {
    const md = '```mermaid\ngraph TD\nA-->B\n```\n\n```js\nconsole.log(1)\n```'
    const result = renderMarkdownToHtml(md)
    expect(result).toContain('mermaid')
    expect(result).toContain('hljs')
  })

  it('应该处理特殊字符（DOMPurify 消毒）', () => {
    const result = renderMarkdownToHtml('内容包含 <script>alert(1)</script>')
    // DOMPurify 应该移除 script 标签
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert(1)')
  })

  it('应该处理链接和图片', () => {
    const result = renderMarkdownToHtml('[链接](https://example.com) ![图片](img.png)')
    expect(result).toContain('<a')
    expect(result).toContain('<img')
  })

  it('应该处理表格', () => {
    const md = '| 列1 | 列2 |\n|-----|-----|\n| 值1 | 值2 |'
    const result = renderMarkdownToHtml(md)
    expect(result).toContain('<table')
    expect(result).toContain('<tr')
  })

  it('应该处理列表', () => {
    const md = '- 项目1\n- 项目2\n\n1. 有序1\n2. 有序2'
    const result = renderMarkdownToHtml(md)
    expect(result).toContain('<ul')
    expect(result).toContain('<ol')
  })
})
