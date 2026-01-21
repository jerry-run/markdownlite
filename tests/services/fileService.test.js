import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fileService from '../../src/services/fileService'
import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

vi.mock('@tauri-apps/plugin-dialog')
vi.mock('@tauri-apps/plugin-fs')

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pickMarkdownFile', () => {
    it('应该调用 dialog.open 并返回路径', async () => {
      open.mockResolvedValue('/test.md')
      const result = await fileService.pickMarkdownFile()
      expect(result).toBe('/test.md')
      expect(open).toHaveBeenCalledWith({
        multiple: false,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
      })
    })

    it('取消选择应该返回 null', async () => {
      open.mockResolvedValue(null)
      const result = await fileService.pickMarkdownFile()
      expect(result).toBeNull()
    })
  })

  describe('pickFolder', () => {
    it('应该调用 dialog.open 并返回文件夹路径', async () => {
      open.mockResolvedValue('/folder')
      const result = await fileService.pickFolder()
      expect(result).toBe('/folder')
      expect(open).toHaveBeenCalledWith({
        directory: true,
        multiple: false,
      })
    })
  })

  describe('pickSaveMarkdownPath', () => {
    it('应该调用 dialog.save 并返回路径', async () => {
      save.mockResolvedValue('/save.md')
      const result = await fileService.pickSaveMarkdownPath()
      expect(result).toBe('/save.md')
      expect(save).toHaveBeenCalledWith({
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      })
    })
  })

  describe('readFileAsText', () => {
    it('应该调用 readTextFile 并返回内容', async () => {
      readTextFile.mockResolvedValue('文件内容')
      const result = await fileService.readFileAsText('/test.md')
      expect(result).toBe('文件内容')
      expect(readTextFile).toHaveBeenCalledWith('/test.md')
    })

    it('空路径应该返回空字符串', async () => {
      const result = await fileService.readFileAsText(null)
      expect(result).toBe('')
      expect(readTextFile).not.toHaveBeenCalled()
    })
  })

  describe('writeFileText', () => {
    it('应该调用 writeTextFile', async () => {
      writeTextFile.mockResolvedValue()
      await fileService.writeFileText('/test.md', '内容')
      expect(writeTextFile).toHaveBeenCalledWith('/test.md', '内容')
    })

    it('空路径应该不调用 writeTextFile', async () => {
      await fileService.writeFileText(null, '内容')
      expect(writeTextFile).not.toHaveBeenCalled()
    })

    it('null content 应该转换为空字符串', async () => {
      writeTextFile.mockResolvedValue()
      await fileService.writeFileText('/test.md', null)
      expect(writeTextFile).toHaveBeenCalledWith('/test.md', '')
    })
  })

  describe('openMarkdownFile', () => {
    it('成功打开应该返回路径和内容', async () => {
      open.mockResolvedValue('/test.md')
      readTextFile.mockResolvedValue('文件内容')
      const result = await fileService.openMarkdownFile()
      expect(result).toEqual({ path: '/test.md', content: '文件内容' })
    })

    it('取消选择应该返回 null', async () => {
      open.mockResolvedValue(null)
      const result = await fileService.openMarkdownFile()
      expect(result).toBeNull()
      expect(readTextFile).not.toHaveBeenCalled()
    })

    it('读取文件失败应该抛出错误', async () => {
      open.mockResolvedValue('/test.md')
      readTextFile.mockRejectedValue(new Error('读取失败'))
      await expect(fileService.openMarkdownFile()).rejects.toThrow('读取失败')
    })
  })

  describe('错误处理', () => {
    it('writeFileText 失败应该抛出错误', async () => {
      writeTextFile.mockRejectedValue(new Error('权限不足'))
      await expect(fileService.writeFileText('/test.md', '内容')).rejects.toThrow('权限不足')
    })

    it('readFileAsText 失败应该抛出错误', async () => {
      readTextFile.mockRejectedValue(new Error('文件不存在'))
      await expect(fileService.readFileAsText('/test.md')).rejects.toThrow('文件不存在')
    })
  })
})
