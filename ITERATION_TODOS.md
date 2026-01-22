# 迭代任务清单

本文档用于跟踪 MarkdownLite 项目的迭代进度，便于管理和规划后续开发。

## 迭代 1：抽离文件 I/O ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 将文件 I/O 操作从 UI 组件中抽离，实现"薄 UI + 厚 service"架构

**完成内容**:
- ✅ 创建 `src/services/fileService.js`，统一管理文件操作
- ✅ `MenuBar.vue` 改为只发出用户意图事件，不再直接调用 Tauri API
- ✅ `App.vue` 通过 `fileService` 统一处理打开/保存逻辑
- ✅ 保持原有行为：未打开文件时保存会触发"另存为"

**验证**: `npm run build` 通过

---

## 迭代 2：抽离渲染管线 ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 将渲染逻辑从 `PreviewPane.vue` 中抽离，让组件更薄

**完成内容**:
- ✅ 创建 `src/render/markdown.js`，负责 Markdown → HTML 转换
- ✅ 创建 `src/render/mermaid.js`，负责 Mermaid 占位符 → SVG 渲染
- ✅ `PreviewPane.vue` 只负责展示 HTML 和触发 Mermaid 渲染
- ✅ 保留并发/过期渲染保护机制

**验证**: `npm run build` 通过

---

## 迭代 3：统一防抖策略 ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 将预览更新的防抖统一上移到 `App.vue`，避免双重防抖导致的不同步

**完成内容**:
- ✅ 在 `App.vue` 中创建 `debouncedContent`，统一预览防抖（100ms）
- ✅ 移除 `PreviewPane.vue` 内部的防抖逻辑
- ✅ 移除 `EditorPane.vue` 的输入防抖，改为立即 emit

**验证**: `npm run build` 通过

---

## 迭代 4：渲染安全加固 ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 解决 `v-html` + `marked` 的 XSS 风险

**完成内容**:
- ✅ 引入 `dompurify` 依赖
- ✅ 在 `render/markdown.js` 中对 `marked.parse()` 输出进行 HTML 消毒
- ✅ 保留 Mermaid 占位符所需的 `data-mermaid-code` 属性
- ✅ 修复错误渲染时的 XSS 风险（错误信息转义）

**验证**: `npm run build` 通过

---

## 迭代 5.1：引入应用状态层 ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 将文档状态和操作逻辑下沉到状态层，让组件更薄

**完成内容**:
- ✅ 创建 `src/stores/useDocument.js` composable
- ✅ 管理 `content`、`debouncedContent`、`currentPath` 状态
- ✅ 提供 `openFile()`、`save()`、`openFolder()` 方法
- ✅ `App.vue` 改为使用 `useDocument()`，只负责 UI 组装
- ✅ 修复 ref 传递问题（使用 computed 确保传递字符串值）

**验证**: `npm run build` 通过，功能正常

---

## 迭代 5.2：完善 dirty 状态与 UI 反馈 ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 实现文档修改状态追踪，并在 UI 上提供清晰的反馈

**完成内容**:
- ✅ 在 `useDocument` 中新增 `lastSavedContent`、`isDirty`、`hasFile` 状态
- ✅ 打开文件后自动设置 `lastSavedContent`，dirty = false
- ✅ 保存成功后调用 `markSaved()`，dirty = false
- ✅ 显式区分 `save()` 和 `saveAs()` 方法
- ✅ `MenuBar` 显示 dirty 状态：保存按钮高亮 + "● 未保存" 提示
- ✅ 修复 ref 传递 bug（传递 `.value` 而不是 ref 对象）

**验证**: `npm run build` 通过，功能正常

---

## 迭代 5.3：最小测试覆盖 ✅

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 为状态层和服务层添加最小测试，建立回归护栏

**完成内容**:
- ✅ 安装测试框架（Vitest + @vue/test-utils + jsdom）
- ✅ 创建 `vitest.config.js` 和 `tests/setup.js`（Mock Tauri APIs）
- ✅ 为 `useDocument` 添加测试（19 个测试用例）：
  - ✅ 初始化、`setContent`、类型转换
  - ✅ `isDirty` 状态变化（编辑后、保存后、打开文件后）
  - ✅ `openFile()` 成功/取消/空内容分支
  - ✅ `save()` / `saveAs()` 成功/取消分支
  - ✅ `debouncedContent` 防抖机制
  - ✅ `hasFile` 状态
- ✅ 为 `fileService` 添加测试（11 个测试用例）：
  - ✅ `pickMarkdownFile`、`pickFolder`、`pickSaveMarkdownPath`
  - ✅ `readFileAsText`、`writeFileText`、`openMarkdownFile`
  - ✅ 错误处理（取消选择、空路径等）
- ✅ 更新 `CHECK_REPORT.md` 回归清单（文件操作、编辑预览、UI 反馈、错误处理）
- ✅ 添加测试脚本：`npm run test`、`npm run test:ui`、`npm run test:run`

**验证**: 
- ✅ 所有 30 个测试通过
- ✅ `npm run build` 通过
- ✅ 回归清单完整

---

## 迭代 5.4：用户体验补全 ⏳

**状态**: 已完成  
**完成时间**: 2026-01-21

**目标**: 完善桌面编辑器体验，增加常用功能

**完成内容**:
- ✅ 退出/关闭前未保存提示（`beforeunload`，dirty 时触发系统确认）
- ✅ 保存快捷键（Cmd/Ctrl+S）：有文件路径直接保存，无路径触发另存为
- ✅ 窗口标题显示当前文件名 + dirty 标记（如 `*test.md`）
- ✅ 可选：最近打开文件列表（存储在 localStorage）：
  - ✅ 菜单栏新增“最近”入口，弹出列表并支持一键打开
  - ✅ 支持清空列表、去重、限制数量

**验收标准**: 
- 功能正常
- 用户体验流畅
- ✅ `npm run build` 通过
- ✅ `npm run test:run` 通过

---

## 迭代 6：渲染可插拔管线 ⏳

**状态**: 待完成

**目标**: 将渲染体系演进为可插拔管线，支持后续扩展（KaTeX、目录、导出等）

**计划内容**:
- [ ] 重构渲染架构为 pipeline：`markdown → sanitize → postProcessors[]`
- [ ] Mermaid 作为第一个 postProcessor（按需执行）
- [ ] 定义 postProcessor 接口规范
- [ ] 为后续扩展预留接口（KaTeX、目录生成、导出等）

**验收标准**: 
- 现有 Markdown/Mermaid 渲染行为完全一致
- `npm run build` 通过
- 架构清晰，易于扩展

---

## 迭代 7：性能优化（按需加载与拆包） ⏳

**状态**: 待完成

**目标**: 降低启动体积，提升响应速度

**计划内容**:
- [ ] Mermaid 改为按需加载（检测到占位符后再动态 `import()`）
- [ ] 评估 CodeMirror 扩展拆分点
- [ ] 配置 Vite 手动分包策略（manualChunks）
- [ ] 性能测试：首屏加载时间、包体积对比

**验收标准**: 
- 功能完全一致
- 构建产物体积有可观测改善
- 首屏加载时间有改善

---

## 迭代 8：安全进一步收紧 ⏳

**状态**: 待完成

**目标**: 在不破坏功能的前提下逐步降低安全风险

**计划内容**:
- [ ] 评估 Mermaid `securityLevel: 'loose'` 的必要性
- [ ] 提供"安全模式"设置选项（收紧 securityLevel）
- [ ] 对 Mermaid 输入做额外验证/限制
- [ ] 更新消毒策略白名单（确保兼容所有 Markdown 特性）

**验收标准**: 
- 功能完全一致
- 恶意样例不执行
- `npm run build` 通过

---

## 后续方向（待规划）

- [ ] 文件树/侧边栏（打开文件夹后显示文件列表）
- [ ] 设置面板（主题、预览延迟、安全模式等）
- [ ] 导出功能（PDF、HTML、纯文本）
- [ ] 搜索功能（全文搜索、替换）
- [ ] 多标签页支持
- [ ] 自动保存（定时保存到临时文件）

---

## 更新日志

- 2026-01-21: 创建迭代任务清单，标记迭代 1-5.2 为已完成
- 2026-01-21: 完成迭代 5.3（最小测试覆盖），30 个测试用例全部通过
- 2026-01-21: 完成迭代 5.4（体验补全：未保存退出提示、保存快捷键、窗口标题）
- 2026-01-21: 补全测试覆盖（新增 37 个测试用例），总计 67 个测试全部通过，创建 `TEST_COVERAGE.md`
- 2026-01-21: 发布 v1.1.0
  - 新增编辑器与预览窗格同步滚动功能
  - 修复 Mermaid 语法错误导致预览整体不显示的问题
  - 修复多次滚动后编辑器内容丢失的问题
  - 优化滚动同步性能，使用 requestAnimationFrame 和缓存机制
