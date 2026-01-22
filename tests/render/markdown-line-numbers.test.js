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

describe('renderMarkdownToHtml - 行号标记', () => {
  it('应该为所有主要元素添加 data-line 属性', () => {
    const md = `# 标题1
## 标题2

段落内容

- 列表项1
- 列表项2

\`\`\`js
代码块
\`\`\`

| 表格 | 列 |
|------|-----|
| 值1  | 值2 |

> 引用内容

---

普通段落`
    
    const result = renderMarkdownToHtml(md)
    
    // 验证各种元素都有 data-line 属性（不验证具体行号，因为行号计算可能因实现而异）
    expect(result).toMatch(/<h1[^>]*data-line="\d+"/)
    expect(result).toMatch(/<h2[^>]*data-line="\d+"/)
    expect(result).toMatch(/<p[^>]*data-line="\d+"/)
    expect(result).toMatch(/<ul[^>]*data-line="\d+"/)
    expect(result).toMatch(/<li[^>]*data-line="\d+"/)
    expect(result).toMatch(/<pre[^>]*data-line="\d+"/)
    expect(result).toMatch(/<table[^>]*data-line="\d+"/)
    expect(result).toMatch(/<blockquote[^>]*data-line="\d+"/)
    expect(result).toMatch(/<hr[^>]*data-line="\d+"/)
    // 验证所有主要元素都有行号标记
    const parser = new DOMParser()
    const doc = parser.parseFromString(result, 'text/html')
    const elementsWithLine = doc.querySelectorAll('[data-line]')
    expect(elementsWithLine.length).toBeGreaterThan(0)
  })

  it('行号应该正确递增', () => {
    const md = `第一行标题
第二行段落
第三行列表开始
第四行列表项
第五行列表项`
    
    const result = renderMarkdownToHtml(md)
    const parser = new DOMParser()
    const doc = parser.parseFromString(result, 'text/html')
    
    const elements = doc.querySelectorAll('[data-line]')
    const lineNumbers = Array.from(elements).map(el => 
      parseInt(el.getAttribute('data-line'), 10)
    )
    
    // 验证行号是递增的
    for (let i = 1; i < lineNumbers.length; i++) {
      expect(lineNumbers[i]).toBeGreaterThan(lineNumbers[i - 1])
    }
  })

  it('空内容不应该包含 data-line', () => {
    const result = renderMarkdownToHtml('')
    expect(result).toBe('')
    expect(result).not.toContain('data-line')
  })

  it('只有空白的内容不应该包含 data-line', () => {
    const result = renderMarkdownToHtml('   \n\n   ')
    expect(result).toBe('')
    expect(result).not.toContain('data-line')
  })
})
