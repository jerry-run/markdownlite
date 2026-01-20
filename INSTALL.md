# 安装指南

## 快速开始

如果遇到 `cargo not found` 错误，说明系统未安装 Rust。请按照以下步骤安装：

## macOS 安装步骤

### 1. 安装 Xcode Command Line Tools（如果未安装）

```bash
xcode-select --install
```

### 2. 安装 Rust

```bash
# 下载并安装 rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

安装过程中会提示：
- 按 `1` 选择默认安装（推荐）
- 等待安装完成

### 3. 配置环境变量

安装完成后，需要重新加载 shell 配置：

```bash
# 对于 zsh（macOS 默认）
source ~/.zshrc

# 或者直接加载 cargo 环境
source ~/.cargo/env
```

### 4. 验证安装

```bash
rustc --version
cargo --version
```

如果显示版本号，说明安装成功。

### 5. 安装项目依赖并运行

```bash
# 安装 Node.js 依赖
npm install

# 运行开发服务器
npm run tauri dev
```

## Windows 安装步骤

### 1. 安装 Microsoft Visual Studio C++ Build Tools

下载并安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### 2. 安装 Rust

下载并运行 [rustup-init.exe](https://rustup.rs/)

### 3. 验证安装

打开新的命令提示符或 PowerShell：

```powershell
rustc --version
cargo --version
```

### 4. 安装项目依赖并运行

```bash
npm install
npm run tauri dev
```

## 常见问题

### Q: 安装 rustup 时提示权限错误

A: 确保已安装 Xcode Command Line Tools：
```bash
xcode-select --install
```

### Q: 安装后仍然提示 cargo not found

A: 重新加载 shell 配置：
```bash
source ~/.zshrc  # 或 source ~/.bashrc
```

或者重启终端。

### Q: npm install 失败

A: 确保 Node.js 版本 >= 18：
```bash
node --version
```

如果版本过低，请升级 Node.js。
