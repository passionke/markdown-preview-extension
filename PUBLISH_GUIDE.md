# VSCode 扩展市场发布指南

## 步骤 1: 创建 Azure DevOps 账号

1. 访问 [Azure DevOps](https://dev.azure.com/)
2. 如果没有账号，点击 "Start free" 注册
3. 登录后，创建一个新的组织（Organization）

## 步骤 2: 创建 Personal Access Token (PAT)

1. 登录 Azure DevOps 后，点击右上角的用户头像
2. 选择 **"Personal access tokens"**
3. 点击 **"+ New Token"**
4. 配置 Token：
   - **Name**: 输入一个名称，如 "VSCode Extension Publishing"
   - **Organization**: 选择 "All accessible organizations"
   - **Expiration**: 设置过期时间（建议 1 年）
   - **Scopes**: 
     - 选择 **"Custom defined"**
     - 点击 **"Show all scopes"**
     - 找到 **"Marketplace"** 部分
     - 勾选 **"Manage"** 权限
5. 点击 **"Create"**
6. **重要**: 复制生成的 Token（只显示一次，请妥善保存）

## 步骤 3: 创建 Publisher

在项目目录下运行：

```bash
vsce create-publisher kejiqing
```

会提示输入：
- Personal Access Token（刚才创建的 PAT）
- Publisher display name（显示名称，如 "kejiqing"）

## 步骤 4: 发布扩展

```bash
vsce publish
```

或者直接使用 Token：

```bash
vsce publish -p <你的PAT>
```

## 步骤 5: 验证发布

1. 访问 [VSCode Marketplace](https://marketplace.visualstudio.com/vscode)
2. 搜索你的扩展名称
3. 确认扩展已成功发布

## 后续更新

更新版本号后，直接运行：

```bash
vsce publish
```

## 注意事项

- 确保 `package.json` 中的 `version` 字段已更新
- 确保 `publisher` 字段与创建的 publisher 名称一致
- 首次发布后，扩展会在几分钟内出现在市场中
- 更新扩展时，版本号必须递增

## 常见问题

**Q: 如果忘记保存 Token 怎么办？**
A: 需要删除旧 Token 并创建新的

**Q: 如何更新已发布的扩展？**
A: 更新 `package.json` 中的版本号，然后运行 `vsce publish`

**Q: 可以撤销发布吗？**
A: 不能完全撤销，但可以发布新版本修复问题
