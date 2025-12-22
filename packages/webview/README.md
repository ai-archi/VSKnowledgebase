# Webview Package

VS Code 扩展的 Webview 视图包，使用 Vue 3 + TypeScript + Vite 构建。

## 项目结构

```
packages/webview/
├── src/
│   ├── main.ts              # 统一入口文件（根据URL参数加载不同视图）
│   ├── app.ts               # Vue应用配置（共享）
│   ├── views/
│   │   └── index.ts         # 视图注册表（统一管理所有视图）
│   ├── components/          # Vue组件
│   ├── services/            # 服务层
│   ├── store/               # Pinia状态管理
│   └── styles/             # 样式文件
├── *.html                   # 视图HTML文件（自动生成，每个视图一个）
├── index.html               # 开发模式入口
├── vite.config.ts           # Vite配置（多入口构建，共享代码）
└── package.json
```

## 架构设计

### 统一入口系统

所有视图使用统一的入口文件 `src/main.ts`，通过以下方式区分视图：

1. **URL参数**：`?view=viewpoint-panel`
2. **文件名**：`viewpoint-panel.html`（自动从文件名提取）
3. **Hash**：`#viewpoint-panel`

### 视图注册系统

所有视图在 `src/views/index.ts` 中统一注册：

```typescript
export const views: Record<string, ViewConfig> = {
  'viewpoint-panel': {
    name: 'viewpoint-panel',
    component: ViewpointPanelPage,
    title: 'Viewpoints',
  },
  // ... 其他视图
};
```

### 共享配置

- **Vue应用配置**：`src/app.ts` 统一管理 Element Plus、Pinia 等插件
- **代码分割**：Vite 自动将公共依赖打包到 vendor chunks，减少重复

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 类型检查
pnpm typecheck
```

## 添加新视图

1. 在 `src/views/index.ts` 中注册新视图
2. 在 `vite.config.ts` 的 `views` 数组中添加视图名称
3. 运行构建，HTML文件会自动生成

## 优势

- ✅ **工程化**：统一入口，减少重复代码
- ✅ **可维护性**：视图集中管理，易于扩展
- ✅ **性能优化**：代码分割，共享公共依赖
- ✅ **类型安全**：TypeScript 支持
- ✅ **开发体验**：热重载，快速开发

