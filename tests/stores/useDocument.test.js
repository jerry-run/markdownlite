import { describe, it, expect, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { useDocument } from '../../src/stores/useDocument'
import * as fileService from '../../src/services/fileService'

// Mock fileService
vi.mock('../../src/services/fileService', () => ({
  openMarkdownFile: vi.fn(),
  pickFolder: vi.fn(),
  pickSaveMarkdownPath: vi.fn(),
  writeFileText: vi.fn(),
  readFileAsText: vi.fn(),
  pickMarkdownFile: vi.fn(),
}))

describe('useDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化', () => {
    it('应该使用初始内容初始化', () => {
      const doc = useDocument({ initialContent: '初始内容' })
      expect(doc.content.value).toBe('初始内容')
      expect(doc.lastSavedContent.value).toBe('初始内容')
      expect(doc.isDirty.value).toBe(false)
    })

    it('空内容应该初始化为空字符串', () => {
      const doc = useDocument({ initialContent: '' })
      expect(doc.content.value).toBe('')
      expect(doc.isDirty.value).toBe(false)
    })
  })

  describe('setContent', () => {
    it('应该更新内容并标记为 dirty', () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('新内容')
      expect(doc.content.value).toBe('新内容')
      expect(doc.isDirty.value).toBe(true)
    })

    it('应该将非字符串转换为字符串', () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent(123)
      expect(doc.content.value).toBe('123')
    })

    it('null/undefined 应该转换为空字符串', () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent(null)
      expect(doc.content.value).toBe('')
      doc.setContent(undefined)
      expect(doc.content.value).toBe('')
    })
  })

  describe('isDirty 状态', () => {
    it('编辑后应该变为 dirty', () => {
      const doc = useDocument({ initialContent: '初始' })
      expect(doc.isDirty.value).toBe(false)
      doc.setContent('修改后')
      expect(doc.isDirty.value).toBe(true)
    })

    it('保存后应该清除 dirty', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('修改后')
      expect(doc.isDirty.value).toBe(true)
      
      // 通过 save 来触发 markSaved
      doc.currentPath.value = '/test.md'
      fileService.writeFileText.mockResolvedValue()
      await doc.save('/test.md')
      expect(doc.isDirty.value).toBe(false)
    })

    it('打开文件后应该清除 dirty', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('修改后')
      expect(doc.isDirty.value).toBe(true)

      fileService.openMarkdownFile.mockResolvedValue({
        path: '/test.md',
        content: '新文件内容',
      })

      await doc.openFile()
      expect(doc.isDirty.value).toBe(false)
    })
  })

  describe('openFile', () => {
    it('成功打开文件应该更新状态', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.openMarkdownFile.mockResolvedValue({
        path: '/test.md',
        content: '文件内容',
      })

      const path = await doc.openFile()
      expect(path).toBe('/test.md')
      expect(doc.content.value).toBe('文件内容')
      expect(doc.currentPath.value).toBe('/test.md')
      expect(doc.hasFile.value).toBe(true)
      expect(doc.isDirty.value).toBe(false)
      expect(doc.recentFiles.value[0]).toBe('/test.md')
    })

    it('取消选择应该返回 null', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.openMarkdownFile.mockResolvedValue(null)

      const path = await doc.openFile()
      expect(path).toBeNull()
      expect(doc.content.value).toBe('初始')
      expect(doc.currentPath.value).toBeNull()
    })

    it('空内容应该处理为空字符串', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.openMarkdownFile.mockResolvedValue({
        path: '/test.md',
        content: null,
      })

      await doc.openFile()
      expect(doc.content.value).toBe('')
    })
  })

  describe('save', () => {
    it('有路径时应该直接保存', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.currentPath.value = '/existing.md'
      doc.setContent('修改后')
      fileService.writeFileText.mockResolvedValue()

      const path = await doc.save('/existing.md')
      expect(path).toBe('/existing.md')
      expect(fileService.writeFileText).toHaveBeenCalledWith('/existing.md', '修改后')
      expect(doc.isDirty.value).toBe(false)
    })

    it('无路径时应该调用 pickSaveMarkdownPath', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('新内容')
      fileService.pickSaveMarkdownPath.mockResolvedValue('/new.md')
      fileService.writeFileText.mockResolvedValue()

      const path = await doc.save()
      expect(path).toBe('/new.md')
      expect(fileService.pickSaveMarkdownPath).toHaveBeenCalled()
      expect(fileService.writeFileText).toHaveBeenCalledWith('/new.md', '新内容')
      expect(doc.isDirty.value).toBe(false)
    })

    it('取消保存应该返回 null', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('修改后') // 先设置为 dirty
      fileService.pickSaveMarkdownPath.mockResolvedValue(null)

      const path = await doc.save()
      expect(path).toBeNull()
      expect(doc.isDirty.value).toBe(true) // 仍然 dirty，因为没有保存成功
    })
  })

  describe('saveAs', () => {
    it('应该弹出保存对话框并保存', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('新内容')
      fileService.pickSaveMarkdownPath.mockResolvedValue('/save-as.md')
      fileService.writeFileText.mockResolvedValue()

      const path = await doc.saveAs()
      expect(path).toBe('/save-as.md')
      expect(fileService.pickSaveMarkdownPath).toHaveBeenCalled()
      expect(fileService.writeFileText).toHaveBeenCalledWith('/save-as.md', '新内容')
      expect(doc.currentPath.value).toBe('/save-as.md')
      expect(doc.isDirty.value).toBe(false)
      expect(doc.recentFiles.value[0]).toBe('/save-as.md')
    })

    it('取消应该返回 null', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.pickSaveMarkdownPath.mockResolvedValue(null)

      const path = await doc.saveAs()
      expect(path).toBeNull()
    })
  })

  describe('debouncedContent', () => {
    it('应该延迟更新 debouncedContent', async () => {
      const doc = useDocument({ initialContent: '初始', debounceMs: 50 })
      doc.setContent('新内容')
      
      // 立即检查，应该还是旧值
      expect(doc.debouncedContent.value).toBe('初始')
      
      // 等待防抖时间
      await new Promise(resolve => setTimeout(resolve, 60))
      expect(doc.debouncedContent.value).toBe('新内容')
    })
  })

  describe('hasFile', () => {
    it('无文件时应该返回 false', () => {
      const doc = useDocument({ initialContent: '初始' })
      expect(doc.hasFile.value).toBe(false)
    })

    it('有文件时应该返回 true', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.openMarkdownFile.mockResolvedValue({
        path: '/test.md',
        content: '内容',
      })

      await doc.openFile()
      expect(doc.hasFile.value).toBe(true)
    })
  })

  describe('recentFiles', () => {
    beforeEach(() => {
      // 清理 localStorage（如果可用）
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem('markdownlite.recentFiles')
        } catch {
          // ignore
        }
      }
    })

    it('openPath 应该把路径加入最近列表并去重', async () => {
      const doc = useDocument({ initialContent: '初始', recentLimit: 10 })
      fileService.readFileAsText.mockResolvedValue('内容')

      await doc.openPath('/a.md')
      await doc.openPath('/b.md')
      await doc.openPath('/a.md')

      expect(doc.recentFiles.value[0]).toBe('/a.md')
      expect(doc.recentFiles.value[1]).toBe('/b.md')
    })

    it('应该限制最近文件数量', async () => {
      const doc = useDocument({ initialContent: '初始', recentLimit: 3 })
      fileService.readFileAsText.mockResolvedValue('内容')

      await doc.openPath('/a.md')
      await doc.openPath('/b.md')
      await doc.openPath('/c.md')
      await doc.openPath('/d.md')

      expect(doc.recentFiles.value.length).toBe(3)
      expect(doc.recentFiles.value[0]).toBe('/d.md')
      expect(doc.recentFiles.value).not.toContain('/a.md')
    })

    it('应该从 localStorage 加载最近文件', () => {
      if (typeof localStorage === 'undefined' || !localStorage.setItem) {
        // 跳过如果 localStorage 不可用
        return
      }
      localStorage.setItem('markdownlite.recentFiles', JSON.stringify(['/old1.md', '/old2.md']))
      const doc = useDocument({ initialContent: '初始' })
      expect(doc.recentFiles.value).toEqual(['/old1.md', '/old2.md'])
    })

    it('localStorage 数据损坏时应该使用空数组', () => {
      if (typeof localStorage === 'undefined' || !localStorage.setItem) return
      localStorage.setItem('markdownlite.recentFiles', 'invalid json')
      const doc = useDocument({ initialContent: '初始' })
      expect(doc.recentFiles.value).toEqual([])
    })

    it('localStorage 数据不是数组时应该使用空数组', () => {
      if (typeof localStorage === 'undefined' || !localStorage.setItem) return
      localStorage.setItem('markdownlite.recentFiles', JSON.stringify({ a: 1 }))
      const doc = useDocument({ initialContent: '初始' })
      expect(doc.recentFiles.value).toEqual([])
    })

    it('应该过滤掉非字符串或空字符串', () => {
      if (typeof localStorage === 'undefined' || !localStorage.setItem) return
      localStorage.setItem(
        'markdownlite.recentFiles',
        JSON.stringify(['/valid.md', '', null, 123, '/another.md'])
      )
      const doc = useDocument({ initialContent: '初始' })
      expect(doc.recentFiles.value).toEqual(['/valid.md', '/another.md'])
    })

    it('clearRecentFiles 应该清空最近列表', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.readFileAsText.mockResolvedValue('内容')
      await doc.openPath('/a.md')
      expect(doc.recentFiles.value.length).toBe(1)
      doc.clearRecentFiles()
      expect(doc.recentFiles.value.length).toBe(0)
    })

    it('空路径不应该加入最近列表', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.addRecentFile('')
      doc.addRecentFile(null)
      expect(doc.recentFiles.value.length).toBe(0)
    })
  })

  describe('openPath', () => {
    it('成功打开路径应该更新状态', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.readFileAsText.mockResolvedValue('文件内容')

      const path = await doc.openPath('/test.md')
      expect(path).toBe('/test.md')
      expect(doc.content.value).toBe('文件内容')
      expect(doc.currentPath.value).toBe('/test.md')
      expect(doc.hasFile.value).toBe(true)
      expect(doc.isDirty.value).toBe(false)
    })

    it('空路径应该返回 null', async () => {
      const doc = useDocument({ initialContent: '初始' })
      const path = await doc.openPath(null)
      expect(path).toBeNull()
      expect(doc.content.value).toBe('初始')
    })

    it('读取文件失败应该抛出错误', async () => {
      const doc = useDocument({ initialContent: '初始' })
      fileService.readFileAsText.mockRejectedValue(new Error('读取失败'))

      await expect(doc.openPath('/test.md')).rejects.toThrow('读取失败')
      expect(doc.content.value).toBe('初始')
    })
  })

  describe('防抖边界情况', () => {
    it('快速连续更新应该只触发最后一次', async () => {
      const doc = useDocument({ initialContent: '初始', debounceMs: 50 })
      doc.setContent('1')
      doc.setContent('2')
      doc.setContent('3')

      expect(doc.debouncedContent.value).toBe('初始')

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(doc.debouncedContent.value).toBe('3')
    })

    it('防抖期间内容恢复原值应该取消更新', async () => {
      const doc = useDocument({ initialContent: '初始', debounceMs: 50 })
      doc.setContent('修改')
      doc.setContent('初始') // 恢复原值

      await new Promise((resolve) => setTimeout(resolve, 60))
      expect(doc.debouncedContent.value).toBe('初始')
    })
  })

  describe('错误处理', () => {
    it('save 写入失败应该抛出错误', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.currentPath.value = '/test.md'
      doc.setContent('修改后') // 先设置为 dirty
      fileService.writeFileText.mockRejectedValue(new Error('写入失败'))

      await expect(doc.save('/test.md')).rejects.toThrow('写入失败')
      expect(doc.isDirty.value).toBe(true) // 仍然 dirty，因为保存失败
    })

    it('saveAs 写入失败应该抛出错误', async () => {
      const doc = useDocument({ initialContent: '初始' })
      doc.setContent('修改后') // 先设置为 dirty
      fileService.pickSaveMarkdownPath.mockResolvedValue('/new.md')
      fileService.writeFileText.mockRejectedValue(new Error('写入失败'))

      await expect(doc.saveAs()).rejects.toThrow('写入失败')
      expect(doc.isDirty.value).toBe(true) // 仍然 dirty，因为保存失败
    })
  })
})
