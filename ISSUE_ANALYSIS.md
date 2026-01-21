# 编辑器和预览界面渲染不一致问题分析

## 问题描述

编辑器和预览界面的渲染结果不一致，可能导致用户看到的内容不同步。

## 问题原因分析

### 1. 防抖时间不一致

- **EditorPane**: 使用 100ms 防抖发送内容更新
- **PreviewPane**: 使用 50ms 防抖监听内容变化

这可能导致：
- 编辑器更新后，预览窗格可能已经触发了渲染，但使用的是旧内容
- 或者预览窗格在编辑器更新之前就渲染了

### 2. 初始化时机问题

- EditorPane 在 `onMounted` 时初始化编辑器，使用 `props.content` 作为初始内容
- PreviewPane 在 `watch` 中使用 `immediate: true` 立即渲染
- 如果 EditorPane 初始化较慢，可能导致初始内容不一致

### 3. 内容更新流程

当前流程：
1. 用户在 EditorPane 中编辑
2. CodeMirror 触发 `updateListener`（100ms 防抖）
3. EditorPane 发送 `update:content` 事件
4. App.vue 更新 `content.value`
5. PreviewPane 的 `watch` 触发（50ms 防抖）
6. PreviewPane 渲染内容

问题：
- 两个防抖时间不同，可能导致时序问题
- 如果用户在 100ms 内快速输入，可能丢失中间状态

### 4. 可能的循环更新

- EditorPane 的 `watch` 监听 `props.content` 变化
- 如果 `updateContent` 触发 `docChanged`，又会发送 `update:content`
- 虽然代码中有检查 `currentContent !== newVal`，但在防抖期间可能有问题

## 修复建议

### 方案 1: 统一防抖时间（推荐）

将 EditorPane 和 PreviewPane 的防抖时间统一为相同的值（建议 100ms），确保更新顺序一致。

### 方案 2: 移除 PreviewPane 的防抖

PreviewPane 的防抖主要是为了避免频繁渲染，但 EditorPane 已经有防抖了，可以移除 PreviewPane 的防抖，直接响应内容变化。

### 方案 3: 使用更精确的内容比较

在 EditorPane 的 `watch` 中，使用更精确的比较逻辑，避免不必要的更新。

### 方案 4: 优化初始化顺序

确保 EditorPane 和 PreviewPane 都使用相同的初始内容，并在初始化完成后再开始监听更新。

## 推荐修复方案

采用方案 1 + 方案 2 的组合：
1. 统一防抖时间为 100ms
2. 移除 PreviewPane 的防抖（因为 EditorPane 已经有防抖了）
3. 优化内容比较逻辑，避免循环更新
