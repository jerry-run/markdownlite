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
    expect(result).toContain('标题')
    expect(result).toContain('段落内容')
    expect(result).toMatch(/<h1[^>]*>标题<\/h1>/)
    expect(result).toMatch(/<p[^>]*>段落内容<\/p>/)
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
    expect(result).toMatch(/<pre[^>]*>/)
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

  describe('行号标记（data-line）', () => {
    it('应该为标题添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('# 标题1\n## 标题2')
      expect(result).toContain('data-line="1"')
      expect(result).toContain('data-line="2"')
    })

    it('应该为段落添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('段落1\n\n段落2')
      expect(result).toContain('<p data-line="1"')
      expect(result).toContain('<p data-line="2"')
    })

    it('应该为列表添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('- 项目1\n- 项目2')
      // 列表项先递增行号，然后列表容器再递增
      expect(result).toMatch(/<ul[^>]*data-line="\d+"/)
      expect(result).toMatch(/<li[^>]*data-line="\d+"/)
      // 验证行号存在
      expect(result).toContain('data-line')
    })

    it('应该为代码块添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('```js\nconst x = 1;\n```')
      expect(result).toContain('<pre data-line="1"')
    })

    it('应该为 Mermaid 代码块添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('```mermaid\ngraph TD\nA-->B\n```')
      expect(result).toContain('data-mermaid-code')
      expect(result).toContain('data-line="1"')
    })

    it('应该为表格添加 data-line 属性', () => {
      const md = '| 列1 | 列2 |\n|-----|-----|\n| 值1 | 值2 |'
      const result = renderMarkdownToHtml(md)
      // 表格行先递增行号，然后表格容器再递增
      expect(result).toMatch(/<table[^>]*data-line="\d+"/)
      expect(result).toMatch(/<tr[^>]*data-line="\d+"/)
      // 验证行号存在
      expect(result).toContain('data-line')
    })

    it('应该为引用块添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('> 引用内容')
      // 引用内容先渲染为段落（行号1），然后引用容器再递增（行号2）
      expect(result).toMatch(/<blockquote[^>]*data-line="\d+"/)
      expect(result).toMatch(/<p[^>]*data-line="\d+"/)
      // 验证行号存在
      expect(result).toContain('data-line')
    })

    it('应该为分隔线添加 data-line 属性', () => {
      const result = renderMarkdownToHtml('---')
      expect(result).toContain('<hr data-line="1"')
    })

    it('行号应该连续递增', () => {
      const md = '# 标题\n\n段落\n\n- 列表项'
      const result = renderMarkdownToHtml(md)
      // 标题行号 1
      expect(result).toMatch(/<h1[^>]*data-line="1"/)
      // 段落行号 2
      expect(result).toMatch(/<p[^>]*data-line="2"/)
      // 列表项先递增（行号3），然后列表容器再递增（行号4）
      expect(result).toMatch(/<li[^>]*data-line="3"/)
      expect(result).toMatch(/<ul[^>]*data-line="4"/)
    })

    it('多行代码块应该正确计算行号', () => {
      const md = '```js\nline1\nline2\nline3\n```'
      const result = renderMarkdownToHtml(md)
      // 代码块起始行号应该是 1
      expect(result).toMatch(/<pre[^>]*data-line="1"/)
      // 下一个元素的行号应该是 1 + 3 = 4（代码块占 3 行）
      // 但由于代码块后面没有其他元素，这里主要验证代码块本身的行号
    })

    it('每次调用应该重置行号计数器', () => {
      const result1 = renderMarkdownToHtml('# 标题1')
      const result2 = renderMarkdownToHtml('# 标题2')
      // 两次调用都应该从行号 1 开始
      expect(result1).toMatch(/<h1[^>]*data-line="1"/)
      expect(result2).toMatch(/<h1[^>]*data-line="1"/)
    })

    it('data-line 属性应该通过 DOMPurify 保留', () => {
      const result = renderMarkdownToHtml('# 标题')
      // DOMPurify 应该保留 data-line 属性
      expect(result).toContain('data-line')
      expect(result).toContain('data-line="1"')
    })
  })
})
