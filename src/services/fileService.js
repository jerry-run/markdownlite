import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

const MARKDOWN_FILTERS = [
  {
    name: 'Markdown',
    extensions: ['md', 'markdown'],
  },
]

export async function pickMarkdownFile() {
  return await open({
    multiple: false,
    filters: MARKDOWN_FILTERS,
  })
}

export async function pickFolder() {
  return await open({
    directory: true,
    multiple: false,
  })
}

export async function pickSaveMarkdownPath() {
  return await save({
    filters: [
      {
        name: 'Markdown',
        extensions: ['md'],
      },
    ],
  })
}

export async function readFileAsText(path) {
  if (!path) return ''
  return await readTextFile(path)
}

export async function writeFileText(path, content) {
  if (!path) return
  await writeTextFile(path, content ?? '')
}

export async function openMarkdownFile() {
  const path = await pickMarkdownFile()
  if (!path) return null
  const content = await readFileAsText(path)
  return { path, content }
}

