<template>
  <div class="editor-pane">
    <div class="pane-header">编辑器</div>
    <div v-if="error" class="error-message">
      <p>编辑器加载失败: {{ error }}</p>
      <p>使用基础文本编辑器</p>
    </div>
    <div v-else ref="editorContainer" class="editor-container"></div>
    <textarea
      v-if="error"
      v-model="localContent"
      class="fallback-editor"
      @input="handleInput"
      spellcheck="false"
    ></textarea>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:content', 'scroll'])

const editorContainer = ref(null)
const error = ref(null)
const localContent = ref(props.content)
let editorView = null
let CodeMirrorModules = null

// 动态加载 CodeMirror 模块
const loadCodeMirror = async () => {
  try {
    const [
      viewModule,
      stateModule,
      markdownModule,
      languageModule,
      commandsModule,
      highlightModule
    ] = await Promise.all([
      import('@codemirror/view'),
      import('@codemirror/state'),
      import('@codemirror/lang-markdown'),
      import('@codemirror/language'),
      import('@codemirror/commands'),
      import('@lezer/highlight')
    ])
    
    // 安全地提取模块
    const EditorView = viewModule.EditorView
    const lineNumbers = viewModule.lineNumbers
    // keymap 可能不存在，需要检查
    let keymap = null
    try {
      if (viewModule.keymap) {
        if (typeof viewModule.keymap.of === 'function') {
          keymap = viewModule.keymap
        } else {
          keymap = viewModule.keymap
        }
      }
    } catch (e) {
      console.warn('keymap 不可用，将跳过快捷键支持:', e)
    }
    
    const EditorState = stateModule.EditorState
    const markdown = markdownModule.markdown
    
    const bracketMatching = languageModule.bracketMatching
    const foldGutter = languageModule.foldGutter
    const foldKeymap = languageModule.foldKeymap
    const indentOnInput = languageModule.indentOnInput
    const syntaxHighlighting = languageModule.syntaxHighlighting
    const defaultHighlightStyle = languageModule.defaultHighlightStyle
    const HighlightStyle = languageModule.HighlightStyle
    
    const defaultKeymap = commandsModule.defaultKeymap
    const history = commandsModule.history
    const historyKeymap = commandsModule.historyKeymap
    
    const tags = highlightModule.tags
    
    CodeMirrorModules = {
      EditorView,
      EditorState,
      keymap,
      lineNumbers,
      markdown,
      bracketMatching,
      foldGutter,
      foldKeymap,
      indentOnInput,
      syntaxHighlighting,
      defaultHighlightStyle,
      HighlightStyle,
      defaultKeymap,
      history,
      historyKeymap,
      tags
    }
    
    return true
  } catch (err) {
    console.error('加载 CodeMirror 模块失败:', err)
    error.value = err.message || '无法加载编辑器模块'
    return false
  }
}

// 创建编辑器扩展配置
const createExtensions = () => {
  const {
    EditorView,
    EditorState,
    keymap,
    lineNumbers,
    markdown,
    bracketMatching,
    foldGutter,
    foldKeymap,
    indentOnInput,
    syntaxHighlighting,
    defaultHighlightStyle,
    HighlightStyle,
    defaultKeymap,
    history,
    historyKeymap,
    tags
  } = CodeMirrorModules

  // 自定义 Markdown 语法高亮主题
  let markdownHighlightStyle
  try {
    // 检查 tags 对象是否可用
    if (!tags || typeof tags !== 'object') {
      throw new Error('tags 对象不可用')
    }
    
    // 构建高亮样式数组，只使用存在的 tag
    const styleDefs = []
    
    // 尝试添加各种 tag 的样式，安全地检查每个 tag 是否存在
    const tagMappings = [
      { tagKey: 'heading1', style: { fontWeight: '700', color: '#4fc1ff' } },
      { tagKey: 'heading2', style: { fontWeight: '700', color: '#4fc1ff' } },
      { tagKey: 'heading3', style: { fontWeight: '700', color: '#4fc1ff' } },
      { tagKey: 'heading4', style: { fontWeight: '700', color: '#4fc1ff' } },
      { tagKey: 'heading5', style: { fontWeight: '700', color: '#4fc1ff' } },
      { tagKey: 'heading6', style: { fontWeight: '700', color: '#4fc1ff' } },
      { tagKey: 'strong', style: { fontWeight: '700' } },
      { tagKey: 'emphasis', style: { fontStyle: 'italic' } },
      { tagKey: 'link', style: { color: '#3794ff', textDecoration: 'underline' } },
      { tagKey: 'strikethrough', style: { textDecoration: 'line-through' } },
      { tagKey: 'code', style: { color: '#ce9178', backgroundColor: '#2d2d2d', fontFamily: 'monospace' } },
      { tagKey: 'monospace', style: { color: '#ce9178', backgroundColor: '#2d2d2d', fontFamily: 'monospace' } },
      { tagKey: 'list', style: { color: '#d4d4d4' } },
      { tagKey: 'quote', style: { color: '#9da2a6', fontStyle: 'italic' } },
      { tagKey: 'meta', style: { color: '#9da2a6' } },
      { tagKey: 'comment', style: { color: '#6a9955', fontStyle: 'italic' } }
    ]
    
    // 只添加存在的 tag
    tagMappings.forEach(({ tagKey, style }) => {
      const tag = tags[tagKey]
      if (tag && tag.id !== undefined) {
        styleDefs.push({ tag, ...style })
      }
    })
    
    if (styleDefs.length > 0) {
      markdownHighlightStyle = HighlightStyle.define(styleDefs)
    } else {
      throw new Error('没有可用的 tag 定义')
    }
  } catch (err) {
    console.warn('无法创建自定义高亮主题，使用默认主题:', err)
    markdownHighlightStyle = defaultHighlightStyle
  }

  return [
    // Markdown 语言支持
    markdown(),
    
    // 语法高亮
    syntaxHighlighting(markdownHighlightStyle),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    
    // 行号
    lineNumbers(),
    
    // 代码折叠
    foldGutter({
      openText: '▾',
      closedText: '▸'
    }),
    
    // 括号匹配
    bracketMatching(),
    
    // 自动缩进
    indentOnInput(),
    
    // 历史记录（撤销/重做）
    history(),
    
    // 自动缩进
    EditorState.tabSize.of(2),
    
    // 内容更新监听（使用防抖优化性能）
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const content = update.state.doc.toString()
        emit('update:content', content)
      }
    }),
    
    // 键盘快捷键 - 如果 keymap 不存在，跳过此扩展
    ...(keymap && typeof keymap.of === 'function' 
      ? [keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap
        ])] 
      : []),
    
    // 编辑器主题和样式
    EditorView.theme({
      '&': {
        fontSize: '14px',
        fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
        height: '100%',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4'
      },
      '.cm-content': {
        padding: '16px',
        minHeight: '100%',
        lineHeight: '1.6',
        caretColor: '#aeafad'
      },
      '.cm-focused': {
        outline: 'none'
      },
      '.cm-gutters': {
        backgroundColor: '#252526',
        borderRight: '1px solid #3c3c3c',
        color: '#858585'
      },
      '.cm-activeLineGutter': {
        backgroundColor: '#2a2d2e'
      },
      '.cm-activeLine': {
        backgroundColor: '#2a2d2e'
      },
      '.cm-lineNumbers': {
        minWidth: '3ch'
      },
      '.cm-foldGutter': {
        width: '1.2em',
        cursor: 'pointer'
      },
      '.cm-foldPlaceholder': {
        backgroundColor: '#2d2d2d',
        border: '1px solid #3c3c3c',
        borderRadius: '2px',
        padding: '0 4px',
        margin: '0 2px'
      },
      '.cm-matchingBracket': {
        backgroundColor: '#264f78',
        outline: '1px solid #3794ff'
      },
      '.cm-nonmatchingBracket': {
        backgroundColor: '#5a1d1d',
        outline: '1px solid #f48771'
      }
    }),
    
    // 性能优化
    EditorView.contentAttributes.of({
      'data-enable-grammarly': 'false'
    })
  ]
}

// 初始化编辑器
const initEditor = async () => {
  if (!editorContainer.value) return
  
  // 先加载 CodeMirror 模块
  const loaded = await loadCodeMirror()
  if (!loaded) {
    return // 如果加载失败，使用回退的 textarea
  }
  
  await nextTick()
  
  try {
    const { EditorView, EditorState } = CodeMirrorModules
    // 确保 content 是字符串，防止 ref 对象传入
    const contentStr = String(props.content ?? '')
    const state = EditorState.create({
      doc: contentStr,
      extensions: createExtensions()
    })
    
    editorView = new EditorView({
      state,
      parent: editorContainer.value
    })
  } catch (err) {
    console.error('编辑器初始化失败:', err)
    error.value = err.message || '未知错误'
  }
}

// 更新编辑器内容
const updateContent = (newContent) => {
  if (!editorView || editorView.state.doc.toString() === newContent) {
    return
  }
  
  const transaction = editorView.state.update({
    changes: {
      from: 0,
      to: editorView.state.doc.length,
      insert: newContent
    }
  })
  
  editorView.dispatch(transaction)
}

// 基础编辑器输入处理
const handleInput = (e) => {
  localContent.value = e.target.value
  emit('update:content', localContent.value)
}

// 监听外部内容变化
// 使用防抖避免循环更新
let watchTimer = null
watch(() => props.content, (newVal) => {
  if (error.value) {
    localContent.value = newVal
  } else if (editorView) {
    const currentContent = editorView.state.doc.toString()
    // 只有在内容真正不同时才更新，避免循环更新
    if (currentContent !== newVal) {
      // 清除之前的定时器
      if (watchTimer) {
        clearTimeout(watchTimer)
      }
      // 使用小延迟确保 EditorView 的更新已完成
      watchTimer = setTimeout(() => {
        const stillCurrentContent = editorView.state.doc.toString()
        if (stillCurrentContent !== newVal) {
          updateContent(newVal)
        }
      }, 10)
    }
  }
})

// 滚动同步：计算当前视口对应的行号并通知预览窗格
// 使用 requestAnimationFrame 实现流畅的滚动同步
let scrollSyncRafId = null
let lastScrollInfo = null
let lastScrollTime = 0
const SCROLL_THROTTLE_MS = 16 // 限制滚动计算频率，约 60fps

const handleScroll = () => {
  if (!editorView || !CodeMirrorModules) return
  
  // 节流：限制滚动计算频率
  const now = Date.now()
  if (now - lastScrollTime < SCROLL_THROTTLE_MS) {
    return
  }
  lastScrollTime = now
  
  // 取消之前的 RAF
  if (scrollSyncRafId !== null) {
    cancelAnimationFrame(scrollSyncRafId)
  }
  
  // 使用 requestAnimationFrame 实现流畅同步
  scrollSyncRafId = requestAnimationFrame(() => {
    try {
      // 检查编辑器是否仍然有效
      if (!editorView || !CodeMirrorModules) {
        scrollSyncRafId = null
        return
      }
      
      const { EditorView } = CodeMirrorModules
      if (!EditorView || !editorView || !editorView.scrollDOM) {
        scrollSyncRafId = null
        return
      }
      
      const scrollDOM = editorView.scrollDOM
      if (!scrollDOM) {
        scrollSyncRafId = null
        return
      }
      
      const scrollTop = scrollDOM.scrollTop
      const scrollHeight = scrollDOM.scrollHeight
      const clientHeight = scrollDOM.clientHeight
      
      // 防止除零错误
      if (scrollHeight <= clientHeight) {
        scrollSyncRafId = null
        return
      }
      
      const scrollRatio = scrollTop / (scrollHeight - clientHeight)
      
      // 快速计算：优先使用滚动比例，减少复杂计算
      // 只在必要时使用精确的行号计算
      let lineNumber = null
      
      // 尝试快速获取行号（使用缓存或简化计算）
      // 使用 try-catch 包裹，确保即使出错也不影响编辑器
      try {
        // 检查编辑器状态是否有效
        if (!editorView.state || !editorView.state.doc) {
          throw new Error('编辑器状态无效')
        }
        
        const contentDOM = editorView.contentDOM
        if (contentDOM && typeof editorView.posAtCoords === 'function') {
          // 使用简化的坐标计算，减少 getBoundingClientRect 调用
          const scrollRect = scrollDOM.getBoundingClientRect()
          const contentRect = contentDOM.getBoundingClientRect()
          
          // 检查坐标是否有效
          if (!scrollRect || !contentRect) {
            throw new Error('无法获取元素位置')
          }
          
          // 计算视口顶部在文档中的坐标（简化版）
          const viewportTopX = contentRect.left - scrollRect.left + scrollRect.width / 2
          const viewportTopY = scrollRect.top + scrollTop + 16 // padding
          
          // 使用 CodeMirror API 获取该坐标对应的文档位置
          // 添加额外的错误检查
          const pos = editorView.posAtCoords({ x: viewportTopX, y: viewportTopY })
          
          if (pos !== null && typeof pos === 'number' && pos >= 0) {
            try {
              const line = editorView.state.doc.lineAt(pos)
              if (line && typeof line.number === 'number') {
                lineNumber = line.number
              }
            } catch (lineError) {
              // 行号计算失败，使用滚动比例
            }
          }
        }
      } catch (e) {
        // 如果精确计算失败，使用滚动比例估算
        // 静默处理，不输出错误
      }
      
      // 如果无法获取精确行号，使用滚动比例估算
      if (lineNumber === null) {
        try {
          const totalLines = editorView.state.doc.lines
          if (totalLines > 0) {
            lineNumber = Math.max(1, Math.min(Math.floor(scrollRatio * totalLines), totalLines))
          } else {
            lineNumber = 1
          }
        } catch (e) {
          lineNumber = 1
        }
      }
      
      // 创建滚动信息对象
      const scrollInfo = {
        lineNumber,
        scrollTop,
        scrollRatio: scrollRatio
      }
      
      // 只在信息变化时发出事件，避免重复触发
      if (!lastScrollInfo || 
          lastScrollInfo.lineNumber !== scrollInfo.lineNumber ||
          Math.abs(lastScrollInfo.scrollTop - scrollInfo.scrollTop) > 5) {
        lastScrollInfo = scrollInfo
        emit('scroll', scrollInfo)
      }
    } catch (error) {
      // 静默处理错误，避免影响编辑体验
      // 不输出到控制台，避免错误日志污染
    } finally {
      scrollSyncRafId = null
    }
  })
}

onMounted(() => {
  initEditor().then(() => {
    // 编辑器初始化完成后，添加滚动监听
    // 使用延迟确保编辑器完全初始化
    setTimeout(() => {
      try {
        if (editorView && editorView.scrollDOM) {
          editorView.scrollDOM.addEventListener('scroll', handleScroll, { passive: true })
        }
      } catch (error) {
        // 滚动监听添加失败不影响编辑器使用
        console.debug('添加滚动监听失败:', error)
      }
    }, 100)
  }).catch((error) => {
    console.error('编辑器初始化失败:', error)
  })
})

onBeforeUnmount(() => {
  // 清理滚动监听
  if (editorView && editorView.scrollDOM) {
    editorView.scrollDOM.removeEventListener('scroll', handleScroll)
  }
  if (scrollSyncRafId !== null) {
    cancelAnimationFrame(scrollSyncRafId)
    scrollSyncRafId = null
  }
  
  if (editorView) {
    editorView.destroy()
    editorView = null
  }
})
</script>

<style scoped>
.editor-pane {
  display: flex;
  flex-direction: column;
  width: 50%;
  border-right: 1px solid var(--border);
  background: var(--bg);
  overflow: hidden;
}

.pane-header {
  padding: 8px 16px;
  background: var(--panel);
  border-bottom: 1px solid var(--border);
  font-weight: 500;
  font-size: 14px;
  color: var(--muted);
  flex-shrink: 0;
}

.editor-container {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* CodeMirror 样式覆盖 */
:deep(.cm-editor) {
  height: 100%;
  overflow: auto;
}

:deep(.cm-scroller) {
  overflow: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
}

:deep(.cm-content) {
  caret-color: #333;
}

:deep(.cm-cursor) {
  border-left: 2px solid #333;
}

:deep(.cm-selectionBackground) {
  background: #b3d4fc;
}

:deep(.cm-focused .cm-selectionBackground) {
  background: #a8d8ff;
}

.error-message {
  padding: 20px;
  color: #d32f2f;
  background: #ffebee;
  border: 1px solid #ffcdd2;
  margin: 10px;
  border-radius: 4px;
}

.fallback-editor {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  overflow-y: auto;
}
</style>
