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
  try {
    // 渲染 markdown
    let html = marked.parse(props.content)
    console.log('渲染后的 HTML 长度:', html.length)
    console.log('渲染后的 HTML 是否包含 mermaid:', html.includes('mermaid'))
    console.log('渲染后的 HTML 预览:', html.substring(0, 500))
    
    // 先设置 HTML，触发 v-html 更新
    renderedContent.value = html
    
    // 等待 DOM 更新后渲染 mermaid
    // 需要等待 v-html 完全渲染完成
    await nextTick()
    await nextTick() // 双重 nextTick 确保 DOM 完全更新
    
    // 额外等待，确保 v-html 完全渲染
    await new Promise(resolve => setTimeout(resolve, 150))
    
    // 再次确认 previewRef 已经更新
    if (!previewRef.value) {
      console.error('previewRef.value 不存在！')
      return
    }
    
    // 验证 previewRef 的内容
    console.log('previewRef 内容长度:', previewRef.value.innerHTML.length)
    console.log('previewRef 是否包含 mermaid:', previewRef.value.innerHTML.includes('mermaid'))
    
    // 查找所有 mermaid 图表并渲染
    const mermaidElements = previewRef.value?.querySelectorAll('.mermaid:not([data-processed])')
    console.log('找到 Mermaid 元素数量:', mermaidElements?.length || 0)
    
    // 验证元素是否真的存在于 DOM 中
    if (mermaidElements && mermaidElements.length > 0) {
      const firstEl = mermaidElements[0]
      const parent = firstEl?.parentElement
      const inPreviewRef = previewRef.value?.contains(firstEl)
      
      console.log('Mermaid 元素验证:', {
        count: mermaidElements.length,
        element: firstEl,
        parent: parent,
        parentTag: parent?.tagName,
        parentClass: parent?.className,
        inDocument: document.contains(firstEl),
        inPreviewRef: inPreviewRef,
        previewRefHTML: previewRef.value?.innerHTML.substring(0, 500),
        elementRect: firstEl.getBoundingClientRect()
      })
      
      // 如果元素不在 previewRef 中，说明有问题
      if (!inPreviewRef) {
        console.error('Mermaid 元素不在 previewRef 中！')
        console.error('尝试将元素移动到 previewRef')
        if (parent && previewRef.value) {
          // 如果元素在其他地方，移动到 previewRef
          previewRef.value.appendChild(firstEl)
          console.log('元素已移动到 previewRef')
        }
      }
    } else {
      console.warn('未找到 Mermaid 元素！')
      console.warn('previewRef.value 内容:', previewRef.value?.innerHTML.substring(0, 1000))
    }
    
    if (mermaidElements && mermaidElements.length > 0) {
      // 使用 Promise.all 并行渲染所有 Mermaid 图表
      const renderPromises = Array.from(mermaidElements).map(async (element, index) => {
        try {
          const id = `mermaid-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
          
          // 获取 Mermaid 代码 - 优先从 data-mermaid-code 属性获取（避免 HTML 转义）
          let mermaidCode = element.getAttribute('data-mermaid-code')
          console.log('原始 data-mermaid-code:', mermaidCode?.substring(0, 50))
          
          if (mermaidCode) {
            try {
              // 从 URI 编码解码
              mermaidCode = decodeURIComponent(mermaidCode)
              console.log('解码后的代码:', mermaidCode.substring(0, 50))
            } catch (decodeErr) {
              console.warn('URI 解码失败，使用原始值:', decodeErr)
            }
          } else {
            // 降级：从 data-code 或文本内容获取
            mermaidCode = element.getAttribute('data-code') || ''
            console.log('从 data-code 获取:', mermaidCode.substring(0, 50))
            
            if (!mermaidCode) {
              // 最后尝试从文本内容获取（可能已被 HTML 转义）
              mermaidCode = element.textContent || element.innerText || ''
              console.log('从 textContent 获取（可能已转义）:', mermaidCode.substring(0, 50))
            }
          }
          
          if (!mermaidCode.trim()) {
            console.warn('Mermaid 代码为空')
            return
          }
          
          // 清理代码（移除可能的空白字符和 HTML 实体）
          mermaidCode = mermaidCode.trim()
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
          
          console.log('清理后的代码:', mermaidCode.substring(0, 50))
          
          // 确保元素有正确的设置
          element.id = id
          element.className = 'mermaid'
          element.setAttribute('data-processed', 'true')
          
          // 注意：不要清空 innerHTML，因为我们需要保留 data-mermaid-code 属性
          // 如果元素已经有 SVG，先检查是否需要重新渲染
          const existingSvg = element.querySelector('svg')
          if (existingSvg) {
            // 如果 SVG 已存在且代码相同，跳过重新渲染
            const existingCode = element.getAttribute('data-mermaid-code')
            if (existingCode === encodeURIComponent(mermaidCode)) {
              console.log('SVG 已存在且代码相同，跳过重新渲染')
              return
            }
          }
          
          // 清除可能存在的旧内容，但保留 data-mermaid-code 属性
          element.innerHTML = ''
          // 不需要设置 textContent，因为我们会直接设置 innerHTML 为 SVG
          
          // 验证设置后的内容
          console.log('设置 textContent 后的元素内容:', element.textContent.substring(0, 50))
          
          console.log('开始渲染 Mermaid:', { 
            id, 
            codeLength: mermaidCode.length,
            codePreview: mermaidCode.substring(0, 50),
            elementExists: !!element,
            elementClass: element.className
          })
          
          // 检查 Mermaid API 可用性
          console.log('Mermaid API 检查:', {
            hasRun: typeof mermaid.run === 'function',
            hasRender: typeof mermaid.render === 'function',
            hasInit: typeof mermaid.init === 'function',
            hasContentLoaded: typeof mermaid.contentLoaded === 'function'
          })
          
          // 优先使用 mermaid.render() 方法（更可靠）
          if (typeof mermaid.render === 'function') {
            console.log('使用 mermaid.render() 渲染，ID:', id, '代码长度:', mermaidCode.length)
            try {
              const renderResult = await mermaid.render(id, mermaidCode)
              console.log('render() 返回结果类型:', typeof renderResult, 'keys:', Object.keys(renderResult || {}))
              
              // Mermaid 10.x 可能返回 { svg, bindFunctions } 或直接是 svg 字符串
              if (renderResult) {
                const svgContent = renderResult.svg || renderResult
                
                // 检查元素是否还在 DOM 中
                if (!element.parentElement && previewRef.value) {
                  console.warn('元素不在 DOM 中，尝试重新插入')
                  // 找到应该插入的位置（在 h2 之后）
                  const h2 = previewRef.value.querySelector('h2')
                  if (h2) {
                    h2.insertAdjacentElement('afterend', element)
                    console.log('元素已重新插入到 h2 之后')
                  } else {
                    previewRef.value.appendChild(element)
                    console.log('元素已追加到 previewRef')
                  }
                }
                
                element.innerHTML = svgContent
                console.log('SVG 内容已设置，长度:', svgContent.length)
              } else {
                throw new Error('render() 返回空结果')
              }
            } catch (renderErr) {
              console.error('mermaid.render() 失败:', renderErr)
              console.error('错误详情:', renderErr.message, renderErr.stack)
              // 降级到 run() 方法
              if (typeof mermaid.run === 'function') {
                console.log('尝试使用 run() 作为降级方案')
                try {
                  await mermaid.run({
                    nodes: [element],
                    suppressErrors: true,
                  })
                  // 等待渲染完成
                  await new Promise(resolve => setTimeout(resolve, 200))
                } catch (runErr) {
                  console.error('run() 降级方案也失败:', runErr)
                  throw renderErr
                }
              } else {
                throw renderErr
              }
            }
          } else if (typeof mermaid.run === 'function') {
            // 降级方案：使用 run API
            console.log('使用 mermaid.run() 降级方案')
            try {
              await mermaid.run({
                nodes: [element],
                suppressErrors: true,
              })
              // 等待渲染完成
              await new Promise(resolve => setTimeout(resolve, 200))
              console.log('Mermaid run() 成功')
            } catch (runErr) {
              console.error('mermaid.run() 失败:', runErr)
              throw runErr
            }
          } else {
            // 最后的降级方案：尝试使用 init
            console.log('尝试使用 mermaid.init()')
            if (typeof mermaid.init === 'function') {
              await mermaid.init(undefined, element)
            } else {
              console.error('Mermaid API 不可用，可用方法:', Object.keys(mermaid).filter(k => typeof mermaid[k] === 'function'))
              throw new Error('Mermaid API 不可用')
            }
          }
          
          // 等待一下确保 DOM 更新
          await nextTick()
          await new Promise(resolve => setTimeout(resolve, 100))
          
          // 检查是否成功渲染了 SVG
          const svg = element.querySelector('svg')
          if (svg) {
            // 让图自适应预览区域：不强制放大，只限制最大宽度
            svg.style.display = 'block'
            svg.style.margin = '0 auto'
            svg.style.maxWidth = '100%'
            svg.style.height = 'auto'
            // 关键：不要写死 width/height px，也不要设置 width:100%，避免被放大
            svg.style.width = 'auto'
            svg.style.minWidth = '0'
            svg.style.minHeight = '0'
            svg.style.visibility = 'visible'
            svg.style.opacity = '1'

            element.style.display = 'block'
            element.style.overflowX = 'auto'
            element.style.overflowY = 'hidden'
            
            console.log('Mermaid SVG 渲染成功，SVG 大小:', svg.outerHTML.length)
            console.log('SVG 尺寸:', svg.getAttribute('width'), 'x', svg.getAttribute('height'))
            console.log('SVG 样式:', {
              display: svg.style.display,
              visibility: svg.style.visibility,
              opacity: svg.style.opacity,
              maxWidth: svg.style.maxWidth
            })
            
            // 检查元素的实际位置和大小
            const rect = element.getBoundingClientRect()
            const svgRect = svg.getBoundingClientRect()
            console.log('元素位置和大小:', {
              element: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
              svg: { width: svgRect.width, height: svgRect.height, top: svgRect.top, left: svgRect.left }
            })
            
            // 检查计算后的样式
            const computedStyle = window.getComputedStyle(element)
            const svgComputedStyle = window.getComputedStyle(svg)
            console.log('元素计算样式:', {
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              opacity: computedStyle.opacity,
              height: computedStyle.height,
              width: computedStyle.width
            })
            console.log('SVG 计算样式:', {
              display: svgComputedStyle.display,
              visibility: svgComputedStyle.visibility,
              opacity: svgComputedStyle.opacity,
              height: svgComputedStyle.height,
              width: svgComputedStyle.width
            })
            
            // 如果 Mermaid 输出了 width="100%" 这种属性，会影响布局；这里不再强行改成像素，
            // 只在缺少 height 时尝试从 viewBox 补齐 height/width（属性层面），不设置 px 样式。
            if (!svg.getAttribute('height')) {
              const viewBox = svg.getAttribute('viewBox')
              if (viewBox) {
                const [, , vbWidth, vbHeight] = viewBox.split(' ')
                if (!svg.getAttribute('width')) svg.setAttribute('width', vbWidth)
                svg.setAttribute('height', vbHeight)
              }
            }
            
            // 强制重新计算布局
            element.offsetHeight // 触发重排
            
            // 再次检查位置和大小
            const finalRect = element.getBoundingClientRect()
            const finalSvgRect = svg.getBoundingClientRect()
            console.log('最终元素位置和大小:', {
              element: { 
                width: finalRect.width, 
                height: finalRect.height, 
                top: finalRect.top, 
                left: finalRect.left,
                visible: finalRect.width > 0 && finalRect.height > 0
              },
              svg: { 
                width: finalSvgRect.width, 
                height: finalSvgRect.height, 
                top: finalSvgRect.top, 
                left: finalSvgRect.left,
                visible: finalSvgRect.width > 0 && finalSvgRect.height > 0
              }
            })
            
            // 检查父元素
            const parent = element.parentElement
            if (parent) {
              const parentRect = parent.getBoundingClientRect()
              const parentStyle = window.getComputedStyle(parent)
              console.log('父元素信息:', {
                tag: parent.tagName,
                class: parent.className,
                position: { width: parentRect.width, height: parentRect.height },
                overflow: parentStyle.overflow,
                display: parentStyle.display
              })
            }
            
            // 使用 requestAnimationFrame 等待浏览器完成渲染
            await new Promise(resolve => requestAnimationFrame(resolve))
            await new Promise(resolve => setTimeout(resolve, 50))
            
            // 之前为排查“不可见”加了很多强制尺寸逻辑；现在已经可见了，保留最小自适应即可。
          } else {
            console.warn('Mermaid 渲染后未找到 SVG 元素')
            console.warn('元素 innerHTML 长度:', element.innerHTML.length)
            console.warn('元素 innerHTML 内容:', element.innerHTML.substring(0, 200))
            console.warn('元素 textContent:', element.textContent.substring(0, 100))
            console.warn('元素类名:', element.className)
            console.warn('元素 ID:', element.id)
            
            // 检查是否有错误信息
            const errorDiv = element.querySelector('div[style*="color"]')
            if (errorDiv) {
              console.warn('发现错误信息元素:', errorDiv.textContent)
            }
          }
        } catch (err) {
          console.error('Mermaid 渲染错误:', err, element)
          // 显示错误信息，但保留原始代码
          const originalCode = element.getAttribute('data-code') || element.textContent || ''
          element.innerHTML = `
            <div style="color: #f48771; padding: 10px; border: 1px solid #f48771; border-radius: 4px; margin: 10px 0;">
              <strong>Mermaid 渲染错误:</strong><br>
              <code style="font-size: 12px; display: block; margin-top: 5px; color: #ccc;">${err.message || '未知错误'}</code>
              <details style="margin-top: 5px;">
                <summary style="cursor: pointer; color: #999;">查看原始代码</summary>
                <pre style="margin-top: 5px; padding: 5px; background: rgba(255,255,255,0.05); border-radius: 3px; font-size: 12px; overflow-x: auto;">${originalCode}</pre>
              </details>
            </div>
          `
        }
      })
      
      await Promise.all(renderPromises)
    }
  } catch (error) {
    console.error('渲染错误:', error)
    renderedContent.value = `<p style="color: #f48771;">渲染错误: ${error.message}</p>`
  }
}

// 使用防抖避免频繁重新渲染
let renderTimer = null
watch(() => props.content, () => {
  // 清除定时器
  if (renderTimer) {
    clearTimeout(renderTimer)
  }
  
  // 使用防抖延迟渲染，避免在 v-html 更新过程中操作 DOM
  renderTimer = setTimeout(() => {
    renderContent()
  }, 50)
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
