import { vi } from 'vitest'

// Mock Tauri APIs（保留现有 window，避免覆盖 jsdom 的实现）
globalThis.window = globalThis.window || {}
globalThis.window.__TAURI_INTERNALS__ = globalThis.window.__TAURI_INTERNALS__ || {}

// 确保 localStorage 可用（jsdom 应该提供，但确保兼容性）
if (typeof globalThis.localStorage === 'undefined') {
  const storage = new Map()
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear(),
    get length() {
      return storage.size
    },
    key: (index) => Array.from(storage.keys())[index] || null,
  }
}

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
}))
