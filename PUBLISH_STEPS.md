# 快速发布步骤

## 1. 创建 Personal Access Token

1. 访问 https://dev.azure.com/ 并登录
2. 点击右上角头像 → **Personal access tokens**
3. 点击 **"+ New Token"**
4. 设置：
   - Name: `VSCode Extension Publishing`
   - Organization: `All accessible organizations`
   - Scopes: 选择 **Custom defined** → **Show all scopes** → 找到 **Marketplace** → 勾选 **Manage**
5. 点击 **Create** 并复制 Token（只显示一次）

## 2. 创建 Publisher

```bash
vsce create-publisher kejiqing
```

输入刚才复制的 Token。

## 3. 发布扩展

```bash
vsce publish
```

或者直接使用 Token：

```bash
vsce publish -p <你的PAT>
```

## 4. 验证

访问 https://marketplace.visualstudio.com/vscode 搜索你的扩展。

## 更新版本

修改 `package.json` 中的 `version` 字段，然后运行：

```bash
vsce publish
```
