# Markdown Preview Extension

一个VSCode扩展，允许您在浏览器中预览Markdown文件，支持完整的Markdown语法、代码高亮、Mermaid图表和表格。

## 功能特性

- ✅ **完整的Markdown支持** - 支持所有标准Markdown语法
- ✅ **代码高亮** - 自动为代码块提供语法高亮
- ✅ **Mermaid图表** - 支持Mermaid流程图、时序图、甘特图等
- ✅ **表格支持** - 完美渲染Markdown表格
- ✅ **右键菜单** - 在文件资源管理器和编辑器中右键点击.md文件即可预览
- ✅ **外部浏览器** - 在系统默认浏览器中打开预览
- ✅ **多预览隔离** - 每个预览都有独立的URL，互不干扰

## 安装到 Cursor

推荐用命令行安装（需先在本目录执行 `npm install && npm run vsix` 生成 `.vsix`）：

```powershell
& "C:\Users\$env:USERNAME\AppData\Local\Programs\cursor\Cursor.exe" --install-extension "D:\刀枫\auto\markdown-preview-extension-temp\markdown-preview-ext-0.1.0.vsix"
```

安装后 Reload 窗口，右键任意 `.md` → **Preview Markdown in Browser**，在浏览器中确认：**链接可点击（新标签打开）、图片可点击（灯箱或跳转）**。  
详细步骤与验证说明见 [安装说明.md](./安装说明.md)。

## 快速开始

### 预览Markdown文件

**方法1：右键菜单（推荐）**
1. 在VSCode中打开一个`.md`文件
2. 右键点击文件（在资源管理器或编辑器中）
3. 选择 **"Preview Markdown in Browser"**
4. 浏览器会自动打开并显示渲染后的HTML

**方法2：命令面板**
1. 打开一个`.md`文件
2. 按 `Ctrl+Shift+P` (Windows/Linux) 或 `Cmd+Shift+P` (Mac) 打开命令面板
3. 输入 "Preview Markdown in Browser"
4. 选择该命令

## 支持的Markdown特性

### 基础语法
- 标题（H1-H6）
- 段落和换行
- 粗体和斜体
- 链接和图片
- 列表（有序和无序）
- 引用块
- 水平线

### 代码块
支持多种编程语言的语法高亮，例如：
- JavaScript/TypeScript
- Python
- Java
- C/C++
- Go
- Rust
- 等等...

### Mermaid图表

支持以下Mermaid图表类型：

```mermaid
graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行操作1]
    B -->|否| D[执行操作2]
    C --> E[结束]
    D --> E
```

### 表格

| 功能 | 支持 | 说明 |
|------|------|------|
| 基础表格 | ✅ | 标准Markdown表格 |
| 对齐 | ✅ | 左对齐、居中、右对齐 |
| 复杂表格 | ✅ | 多行多列表格 |

## 配置选项

扩展提供了配置选项，可以在 VSCode 设置中调整。打开设置（`Cmd+,` / `Ctrl+,`），搜索 "markdownPreview"：

### 服务器端口
- **设置项**: `markdownPreview.serverPort`
- **默认值**: 3000
- **说明**: HTTP服务器端口，如果被占用会自动查找可用端口
- **范围**: 1024-65535

### 最大会话数
- **设置项**: `markdownPreview.maxSessions`
- **默认值**: 50
- **说明**: 最多同时保存的预览会话数量，超出时会自动清理最旧的
- **范围**: 10-200

### 会话超时时间
- **设置项**: `markdownPreview.sessionTimeout`
- **默认值**: 30（分钟）
- **说明**: 预览会话的超时时间，超过此时间未访问的会话会被自动清理
- **范围**: 5-120（分钟）

### 自动启动服务器
- **设置项**: `markdownPreview.autoStartServer`
- **默认值**: true
- **说明**: 是否在预览时自动启动服务器。如果设为 false，需要手动启动服务器

## 服务器管理

如果需要手动管理服务器，可以通过命令面板（`Cmd+Shift+P` / `Ctrl+Shift+P`）使用以下命令：

- **Start Preview Server** - 手动启动服务器
- **Stop Preview Server** - 停止服务器
- **Restart Preview Server** - 重启服务器
- **Show Server Status** - 显示服务器状态（运行状态、端口、当前会话数）

## 常见问题

### 预览没有打开浏览器？
- 确保已打开一个 `.md` 文件
- 检查服务器是否正常运行（使用 "Show Server Status" 命令）
- 如果服务器未启动，使用 "Start Preview Server" 命令手动启动

### 端口被占用？
- 扩展会自动查找可用端口（从3000开始递增）
- 可以在设置中修改 `markdownPreview.serverPort` 指定其他端口

### 预览内容没有更新？
- 每次预览都会生成新的会话，修改文件后需要重新预览
- 浏览器中刷新页面不会更新内容，需要重新执行预览命令

### 如何停止服务器？
- 使用命令面板中的 "Stop Preview Server" 命令
- 或者关闭VSCode，服务器会自动停止

## 反馈与支持

如果遇到问题或有功能建议，欢迎在 [GitHub Issues](https://github.com/passionke/markdown-preview-extension/issues) 中反馈。

## 开发者

如果您想参与开发或了解技术细节，请查看 [开发文档](./DEVELOP.md)。

## 许可证

MIT License

## 作者

kejiqing
