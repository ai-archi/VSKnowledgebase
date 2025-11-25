# Mermaid Editor (Pure JavaScript)

纯 JavaScript 版本的 Mermaid 图表编辑器，用于 VSCode 扩展集成。

## 项目结构

```
mermaid-editor/
├── app/                    # 应用入口文件
│   ├── index.html         # HTML 模板
│   ├── app.js             # 主应用逻辑
│   └── styles.css         # 样式文件
├── lib/                    # 核心库文件
│   ├── types.js           # 类型定义和常量
│   ├── utils.js           # 工具函数
│   ├── vscodeApi.js       # VSCode API 适配器
│   ├── StateManager.js    # 状态管理器（替代 React Hooks）
│   └── DiagramCanvas.js   # 图表画布（核心渲染和交互）
├── webpack.config.js       # Webpack 配置
└── package.json           # 项目配置
```

## 构建

```bash
# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm run build:watch

# 生产构建
pnpm run build

# 开发服务器（用于测试）
pnpm run serve
```

## VSCode 集成

构建后的文件会输出到 `public/` 目录。在 VSCode 扩展中，需要：

1. 将 `public/` 目录复制到扩展的 `mermaid-editor/` 目录
2. 在 `MermaidEditorProvider` 中加载 `index.html`

## 主要特性

- ✅ 纯 JavaScript 实现，无 React 依赖
- ✅ 完整的拖拽交互（节点、边、子图）
- ✅ 样式编辑（颜色、线条、箭头）
- ✅ 实时源代码同步
- ✅ 图片上传支持
- ✅ 键盘快捷键
- ✅ VSCode webview 集成

## 与原 React 版本的差异

1. **状态管理**：使用 `StateManager` 类替代 React Hooks
2. **DOM 操作**：直接操作 DOM，不使用虚拟 DOM
3. **事件处理**：使用原生事件监听器
4. **API 调用**：通过 VSCode 消息传递替代 HTTP fetch

## 开发说明

- 代码使用 ES6 模块
- 使用 Webpack 打包
- 支持 source map 用于调试
- 样式使用 CSS（不使用 CSS-in-JS）

