import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderMermaidInContainer } from '../../src/render/mermaid'
import mermaid from 'mermaid'

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}))

describe('renderMermaidInContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mermaid.render.mockResolvedValue({ svg: '<svg>test</svg>' })
  })

  it('空容器应该直接返回', async () => {
    await renderMermaidInContainer(null)
    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it('没有占位符应该直接返回', async () => {
    const container = document.createElement('div')
    await renderMermaidInContainer(container)
    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it('应该渲染单个 Mermaid 占位符', async () => {
    const container = document.createElement('div')
    const placeholder = document.createElement('div')
    placeholder.className = 'mermaid'
    placeholder.setAttribute('data-mermaid-code', encodeURIComponent('graph TD\nA-->B'))
    container.appendChild(placeholder)

    await renderMermaidInContainer(container)

    expect(mermaid.render).toHaveBeenCalledTimes(1)
    expect(placeholder.innerHTML).toContain('<svg>')
    expect(placeholder.getAttribute('data-processed')).toBe('true')
  })

  it('应该渲染多个 Mermaid 占位符', async () => {
    const container = document.createElement('div')
    const p1 = document.createElement('div')
    p1.className = 'mermaid'
    p1.setAttribute('data-mermaid-code', encodeURIComponent('graph TD\nA-->B'))
    const p2 = document.createElement('div')
    p2.className = 'mermaid'
    p2.setAttribute('data-mermaid-code', encodeURIComponent('graph LR\nC-->D'))
    container.appendChild(p1)
    container.appendChild(p2)

    await renderMermaidInContainer(container)

    expect(mermaid.render).toHaveBeenCalledTimes(2)
    expect(p1.getAttribute('data-processed')).toBe('true')
    expect(p2.getAttribute('data-processed')).toBe('true')
  })

  it('应该跳过已处理的占位符', async () => {
    const container = document.createElement('div')
    const p1 = document.createElement('div')
    p1.className = 'mermaid'
    p1.setAttribute('data-mermaid-code', encodeURIComponent('graph TD\nA-->B'))
    p1.setAttribute('data-processed', 'true')
    container.appendChild(p1)

    await renderMermaidInContainer(container)

    expect(mermaid.render).not.toHaveBeenCalled()
  })

  it('isStale 为 true 时应该中止渲染', async () => {
    const container = document.createElement('div')
    const placeholder = document.createElement('div')
    placeholder.className = 'mermaid'
    placeholder.setAttribute('data-mermaid-code', encodeURIComponent('graph TD\nA-->B'))
    container.appendChild(placeholder)

    let renderCalled = false
    mermaid.render.mockImplementation(() => {
      renderCalled = true
      return Promise.resolve({ svg: '<svg>test</svg>' })
    })

    await renderMermaidInContainer(container, {
      isStale: () => true, // 一开始就是 stale
    })

    // isStale 在循环开始就返回 true，所以不应该调用 render
    expect(renderCalled).toBe(false)
  })

  it('应该处理 decodeURIComponent 失败的情况', async () => {
    const container = document.createElement('div')
    const placeholder = document.createElement('div')
    placeholder.className = 'mermaid'
    // 无效的 URI 编码
    placeholder.setAttribute('data-mermaid-code', '%E0%A4%A')
    container.appendChild(placeholder)

    await renderMermaidInContainer(container)

    // 应该仍然尝试渲染（使用原始值）
    expect(mermaid.render).toHaveBeenCalled()
  })

  it('应该处理 HTML 实体转义', async () => {
    const container = document.createElement('div')
    const placeholder = document.createElement('div')
    placeholder.className = 'mermaid'
    const code = 'graph TD\nA["<test>"]'
    placeholder.setAttribute('data-mermaid-code', encodeURIComponent(code))
    container.appendChild(placeholder)

    await renderMermaidInContainer(container)

    expect(mermaid.render).toHaveBeenCalled()
    const callArgs = mermaid.render.mock.calls[0]
    expect(callArgs[1]).toContain('<test>')
  })

  it('mermaid.render 不存在时应该直接返回', async () => {
    const originalRender = mermaid.render
    delete mermaid.render

    const container = document.createElement('div')
    const placeholder = document.createElement('div')
    placeholder.className = 'mermaid'
    placeholder.setAttribute('data-mermaid-code', encodeURIComponent('graph TD\nA-->B'))
    container.appendChild(placeholder)

    await renderMermaidInContainer(container)

    expect(placeholder.innerHTML).toBe('')
    mermaid.render = originalRender
  })

  it('单个 Mermaid 块渲染失败时应该只影响该块，不影响其他块', async () => {
    const container = document.createElement('div')
    
    // 第一个块：正常渲染
    const p1 = document.createElement('div')
    p1.className = 'mermaid'
    p1.setAttribute('data-mermaid-code', encodeURIComponent('graph TD\nA-->B'))
    
    // 第二个块：渲染失败
    const p2 = document.createElement('div')
    p2.className = 'mermaid'
    p2.setAttribute('data-mermaid-code', encodeURIComponent('invalid mermaid code'))
    
    // 第三个块：正常渲染
    const p3 = document.createElement('div')
    p3.className = 'mermaid'
    p3.setAttribute('data-mermaid-code', encodeURIComponent('graph LR\nC-->D'))
    
    container.appendChild(p1)
    container.appendChild(p2)
    container.appendChild(p3)

    // 第一个和第三个块成功，第二个块失败
    mermaid.render
      .mockResolvedValueOnce({ svg: '<svg>block1</svg>' })
      .mockRejectedValueOnce(new Error('Mermaid 语法错误'))
      .mockResolvedValueOnce({ svg: '<svg>block3</svg>' })

    await renderMermaidInContainer(container)

    // 第一个块应该成功渲染
    expect(p1.innerHTML).toContain('<svg>block1</svg>')
    expect(p1.getAttribute('data-processed')).toBe('true')
    expect(p1.getAttribute('data-error')).toBeNull()

    // 第二个块应该显示错误信息
    expect(p2.className).toContain('mermaid-error')
    expect(p2.innerHTML).toContain('Mermaid 渲染错误')
    expect(p2.innerHTML).toContain('Mermaid 语法错误')
    expect(p2.getAttribute('data-processed')).toBe('true')
    expect(p2.getAttribute('data-error')).toBe('true')

    // 第三个块应该成功渲染
    expect(p3.innerHTML).toContain('<svg>block3</svg>')
    expect(p3.getAttribute('data-processed')).toBe('true')
    expect(p3.getAttribute('data-error')).toBeNull()

    // 应该调用 3 次 render（包括失败的）
    expect(mermaid.render).toHaveBeenCalledTimes(3)
  })

  it('Mermaid 渲染错误时应该转义错误信息防止 XSS', async () => {
    const container = document.createElement('div')
    const placeholder = document.createElement('div')
    placeholder.className = 'mermaid'
    placeholder.setAttribute('data-mermaid-code', encodeURIComponent('invalid'))
    container.appendChild(placeholder)

    // 模拟包含 XSS 尝试的错误信息
    const xssError = new Error('<script>alert("xss")</script>')
    mermaid.render.mockRejectedValueOnce(xssError)

    await renderMermaidInContainer(container)

    // 错误信息应该被转义
    expect(placeholder.innerHTML).not.toContain('<script>')
    expect(placeholder.innerHTML).toContain('&lt;script&gt;')
    expect(placeholder.getAttribute('data-error')).toBe('true')
  })
})
