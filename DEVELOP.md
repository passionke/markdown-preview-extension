# 开发文档

本文档面向开发者，介绍如何参与开发和贡献代码。

## 项目结构

```
markdown-preview-ext/
├── package.json              # 扩展配置和依赖
├── tsconfig.json            # TypeScript配置
├── .vscodeignore           # 发布时忽略的文件
├── src/
│   ├── extension.ts        # 扩展主入口
│   ├── markdownRenderer.ts # Markdown渲染逻辑
│   └── server.ts           # HTTP服务器
├── media/
│   └── preview.html        # HTML模板
└── README.md               # 扩展文档
```

## 开发环境设置

### 前置要求

- Node.js (推荐 v18+)
- npm 或 yarn
- VSCode 1.60+

### 安装依赖

```bash
npm install
```

### 编译

```bash
# 编译TypeScript
npm run compile

# 监听模式编译（开发时使用）
npm run watch
```

### 调试

1. 在VSCode中打开此项目
2. 按 `F5` 启动扩展开发宿主窗口
3. 在新窗口中测试扩展功能
4. 修改代码后，在开发窗口按 `Cmd+R` (Mac) 或 `Ctrl+R` (Windows) 重新加载扩展

## 技术架构

### 单例HTTP服务器

- 整个扩展生命周期内只有一个HTTP服务器实例
- 默认监听端口3000，如果被占用则自动查找可用端口
- 所有预览请求共享同一个服务器实例
- 按需启动，只在首次预览时启动

### 预览会话隔离

- 每个预览生成唯一的预览ID（基于文件路径hash + 时间戳）
- URL格式：`http://localhost:{port}/preview/{previewId}`
- HTML内容存储在服务器内存中，不创建临时文件
- 每个预览都有独立的URL，互不干扰

### 自动清理机制

- 定期清理超过30分钟未访问的预览会话（可配置）
- 限制最大会话数为50个（可配置），超出时清理最旧的会话
- 扩展停用时清理所有会话

## 资源消耗分析

### 内存消耗

**基础内存占用**：
- HTTP服务器实例：约 2-5 MB
- Node.js HTTP模块：约 1-2 MB
- 扩展运行时：约 5-10 MB

**动态内存（预览会话）**：
- 每个预览会话：约 50-500 KB（取决于Markdown文件大小）
- 最大会话数：默认50个，最多占用约 25 MB
- 自动清理：超过30分钟未访问的会话会自动清理

**总内存占用**：约 10-40 MB（取决于活跃会话数）

### CPU消耗

**正常情况**：
- 空闲时：接近 0%（服务器处于监听状态）
- 处理请求时：< 1%（简单的内存查找和HTML返回）

**渲染Markdown时**：
- 首次预览：约 5-50 ms CPU时间（取决于文件大小）
- 后续访问：< 1 ms（直接从内存返回）

### 网络资源

**本地网络**：
- 仅监听 `127.0.0.1`（localhost），不占用外部网络
- 带宽消耗：几乎为0（本地回环）
- 端口占用：默认3000（可配置）

### 磁盘IO

**无磁盘操作**：
- HTML内容存储在内存中，不创建临时文件
- 仅在读取Markdown文件时有一次磁盘读取
- 无日志文件写入（除非调试模式）

## 优化特性

1. **单例模式**：整个扩展生命周期只有一个服务器实例
2. **按需启动**：只在首次预览时启动服务器
3. **自动清理**：定期清理过期会话，防止内存泄漏
4. **会话限制**：最多50个会话，超出时自动清理最旧的
5. **轻量级**：使用Node.js原生HTTP模块，无额外依赖

## 依赖说明

### 运行时依赖

- `markdown-it` - Markdown解析器
- `highlight.js` - 代码高亮

### 开发依赖

- `@types/markdown-it` - Markdown-it类型定义
- `@types/node` - Node.js类型定义
- `@types/vscode` - VSCode API类型定义
- `typescript` - TypeScript编译器

## 打包发布

### 本地打包

```bash
npm run vsix
```

（内部会执行 compile + vsce package，且带依赖。勿手敲 `vsce package --no-dependencies`。）

### 发布到市场

参考 [PUBLISH_STEPS.md](./PUBLISH_STEPS.md)

## 代码规范

- 使用 TypeScript 编写
- 遵循 VSCode 扩展开发最佳实践
- 代码注释使用中文（作者：kejiqing）
- 使用 UTF-8 编码

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 测试

目前主要依靠手动测试。建议测试以下场景：

- [ ] 基础Markdown语法渲染
- [ ] 代码块语法高亮
- [ ] Mermaid图表渲染
- [ ] 表格渲染
- [ ] 右键菜单功能
- [ ] 命令面板功能
- [ ] 服务器启动/停止/重启
- [ ] 配置项修改生效
- [ ] 多文件同时预览
- [ ] 会话自动清理

## 已知问题

- 暂无

## 待实现功能

- [ ] 支持实时预览（文件修改后自动刷新）
- [ ] 支持自定义CSS主题
- [ ] 支持更多Mermaid图表类型
- [ ] 添加单元测试

## 许可证

MIT License

## 作者

kejiqing
