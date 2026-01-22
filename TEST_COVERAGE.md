# 测试覆盖报告

本文档记录 MarkdownLite 项目的自动化测试覆盖情况，用于确保后续迭代的质量。

**最后更新**: 2026-01-21  
**测试框架**: Vitest + @vue/test-utils + jsdom  
**总测试数**: 85 个测试用例

---

## 测试覆盖概览

### ✅ 已覆盖模块

#### 1. `src/stores/useDocument.js` (34 个测试)
- ✅ **初始化** (2 个)
  - 使用初始内容初始化
  - 空内容处理
- ✅ **setContent** (3 个)
  - 更新内容并标记 dirty
  - 类型转换（数字、null、undefined）
- ✅ **isDirty 状态** (3 个)
  - 编辑后变为 dirty
  - 保存后清除 dirty
  - 打开文件后清除 dirty
- ✅ **openFile** (3 个)
  - 成功打开文件
  - 取消选择
  - 空内容处理
- ✅ **openPath** (3 个)
  - 成功打开路径
  - 空路径处理
  - 读取文件失败错误处理
- ✅ **save** (3 个)
  - 有路径时直接保存
  - 无路径时调用 pickSaveMarkdownPath
  - 取消保存
  - 写入失败错误处理
- ✅ **saveAs** (2 个)
  - 弹出保存对话框并保存
  - 取消保存
  - 写入失败错误处理
- ✅ **debouncedContent** (1 个)
  - 延迟更新机制
- ✅ **hasFile** (2 个)
  - 无文件时返回 false
  - 有文件时返回 true
- ✅ **recentFiles** (8 个)
  - 路径加入列表并去重
  - 限制数量
  - 从 localStorage 加载
  - localStorage 数据损坏处理
  - localStorage 数据格式错误处理
  - 过滤非字符串/空字符串
  - 清空列表
  - 空路径不加入列表
- ✅ **防抖边界情况** (2 个)
  - 快速连续更新只触发最后一次
  - 防抖期间内容恢复原值
- ✅ **错误处理** (2 个)
  - save 写入失败
  - saveAs 写入失败

#### 2. `src/services/fileService.js` (14 个测试)
- ✅ **pickMarkdownFile** (2 个)
  - 调用 dialog.open 并返回路径
  - 取消选择返回 null
- ✅ **pickFolder** (1 个)
  - 调用 dialog.open 并返回文件夹路径
- ✅ **pickSaveMarkdownPath** (1 个)
  - 调用 dialog.save 并返回路径
- ✅ **readFileAsText** (2 个)
  - 调用 readTextFile 并返回内容
  - 空路径返回空字符串
  - 读取失败错误处理
- ✅ **writeFileText** (3 个)
  - 调用 writeTextFile
  - 空路径不调用 writeTextFile
  - null content 转换为空字符串
  - 写入失败错误处理
- ✅ **openMarkdownFile** (2 个)
  - 成功打开返回路径和内容
  - 取消选择返回 null
  - 读取文件失败错误处理
- ✅ **错误处理** (2 个)
  - writeFileText 失败抛出错误
  - readFileAsText 失败抛出错误

#### 3. `src/render/markdown.js` (22 个测试)
- ✅ **基本渲染** (1 个)
  - 渲染基本 Markdown（标题、段落）
- ✅ **空内容处理** (2 个)
  - 空字符串返回空字符串
  - null/undefined 返回空字符串
- ✅ **Mermaid 占位符** (1 个)
  - 保留 Mermaid 占位符和 data-mermaid-code
- ✅ **代码块语法高亮** (1 个)
  - 普通代码块进行语法高亮
- ✅ **多个代码块** (1 个)
  - 处理多个代码块（Mermaid + 普通）
- ✅ **安全处理** (1 个)
  - DOMPurify 移除危险标签（如 `<script>`）
- ✅ **Markdown 特性** (3 个)
  - 链接和图片
  - 表格
  - 列表（有序/无序）
- ✅ **行号标记（data-line）** (12 个)
  - 为标题添加 data-line 属性
  - 为段落添加 data-line 属性
  - 为列表添加 data-line 属性
  - 为代码块添加 data-line 属性
  - 为 Mermaid 代码块添加 data-line 属性
  - 为表格添加 data-line 属性
  - 为引用块添加 data-line 属性
  - 为分隔线添加 data-line 属性
  - 行号连续递增验证
  - 多行代码块行号计算
  - 每次调用重置行号计数器
  - data-line 属性通过 DOMPurify 保留

#### 4. `src/render/mermaid.js` (11 个测试)
- ✅ **边界情况** (2 个)
  - 空容器直接返回
  - 没有占位符直接返回
- ✅ **单个占位符** (1 个)
  - 渲染单个 Mermaid 占位符
- ✅ **多个占位符** (1 个)
  - 渲染多个 Mermaid 占位符
- ✅ **已处理占位符** (1 个)
  - 跳过已处理的占位符
- ✅ **并发控制** (1 个)
  - isStale 为 true 时中止渲染
- ✅ **错误处理** (5 个)
  - decodeURIComponent 失败处理
  - HTML 实体转义处理
  - mermaid.render 不存在时直接返回
  - **单个 Mermaid 块错误不影响其他块**（新增）
  - **Mermaid 错误信息 XSS 防护**（新增）

---

## 测试覆盖统计

| 模块 | 测试数 | 覆盖重点 |
|------|--------|----------|
| `useDocument` | 34 | 状态管理、文件操作、dirty 追踪、最近文件、防抖、错误处理 |
| `fileService` | 14 | 文件选择、读写操作、错误处理 |
| `render/markdown` | 22 | Markdown 渲染、Mermaid 占位符、安全消毒、各种语法、**行号标记** |
| `render/mermaid` | 11 | Mermaid 渲染、并发控制、错误处理、**单个块错误隔离** |
| `render/markdown-line-numbers` | 4 | 行号标记完整性、行号递增、边界情况 |
| **总计** | **85** | **核心业务逻辑全覆盖，包含 v1.1.0 新功能** |

---

## 关键防护点

### 1. 状态一致性
- ✅ dirty 状态正确追踪（编辑、保存、打开文件）
- ✅ 防抖机制正确工作（快速输入、恢复原值）
- ✅ 最近文件列表正确维护（去重、限制、持久化）

### 2. 错误处理
- ✅ 文件操作失败（读取、写入、权限错误）
- ✅ 用户取消操作（选择文件、保存）
- ✅ 数据损坏（localStorage 异常数据）

### 3. 边界情况
- ✅ 空值处理（null、undefined、空字符串）
- ✅ 类型转换（非字符串输入）
- ✅ 并发控制（Mermaid 渲染过期检测）

### 4. 安全防护
- ✅ XSS 防护（DOMPurify 消毒）
- ✅ 数据验证（localStorage 数据格式）
- ✅ **Mermaid 错误信息转义**（防止错误信息中的 XSS）

### 5. v1.1.0 新功能测试
- ✅ **行号标记系统**（data-line 属性）
  - 所有主要 Markdown 元素都有行号标记
  - 行号正确递增
  - 行号计数器正确重置
- ✅ **Mermaid 错误隔离**
  - 单个块错误不影响其他块
  - 错误信息正确转义

---

## 待补充测试（可选）

以下功能目前主要依赖手工回归，后续可考虑补充自动化测试：

- [ ] **组件集成测试**（EditorPane、PreviewPane、MenuBar）
  - 编辑器初始化
  - 预览渲染流程
  - 菜单交互
  - **滚动同步功能**（v1.1.0 新增）
- [ ] **端到端测试**（E2E）
  - 完整用户流程（打开 → 编辑 → 预览 → 保存）
  - 快捷键功能
  - 窗口标题更新
  - **编辑器与预览窗格滚动同步**
- [ ] **性能测试**
  - 大文件编辑性能
  - 防抖效果验证
  - Mermaid 渲染性能
  - **滚动同步性能**（requestAnimationFrame、缓存机制）

---

## 运行测试

```bash
# 运行所有测试
npm run test:run

# 监听模式（开发时使用）
npm run test

# UI 模式（可视化测试结果）
npm run test:ui
```

---

## 测试维护建议

1. **每次迭代后**：运行 `npm run test:run` 确保所有测试通过
2. **新增功能时**：优先为 service/store 层添加测试
3. **修复 bug 时**：添加回归测试防止再次出现
4. **重构前**：确保现有测试通过，重构后再次验证

---

## 更新日志

- 2026-01-21: 初始测试覆盖报告，67 个测试用例全部通过
- 2026-01-21: 补充 v1.1.0 新功能测试，新增 18 个测试用例（行号标记、Mermaid 错误隔离），总计 85 个测试用例全部通过
