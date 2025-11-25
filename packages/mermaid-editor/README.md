# Mermaid Editor (Pure JavaScript)

纯 JavaScript 版本的 Mermaid 图表编辑器，用于 VSCode 扩展集成。

## 项目结构

```
mermaid-editor/
├── app/                    # 应用入口文件
│   ├── index-v2.html      # HTML 模板 (V2)
│   ├── MermaidEditorAppV2.js  # 主应用逻辑 (V2)
│   └── styles.css         # 样式文件
├── lib/                    # 核心库文件
│   ├── types.js           # 类型定义和常量
│   ├── utils.js           # 工具函数
│   ├── vscodeApi.js       # VSCode API 适配器
│   ├── StateManager.js    # 状态管理器
│   ├── MermaidRenderer.js # Mermaid.js 渲染器
│   ├── MermaidParser.js   # Mermaid 解析器
│   ├── MermaidCodeGenerator.js # 代码生成器
│   └── ...                # 其他 V2 组件
├── webpack.config.v2.js    # Webpack 配置 (V2)
└── package.json           # 项目配置
```

## 构建

```bash
# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm run build:watch:v2

# 生产构建
pnpm run build:v2

# 开发服务器（用于测试）
pnpm run serve
```

## VSCode 集成

构建后的文件会输出到 `public/` 目录。在 VSCode 扩展中，需要：

1. 将 `public/` 目录复制到扩展的 `mermaid-editor/` 目录
2. 在 `MermaidEditorProvider` 中加载 `index-v2.html`

## 主要特性

- ✅ 基于 mermaid.js 的渲染引擎
- ✅ 完整的拖拽交互（节点、边）
- ✅ 样式编辑（颜色、线条、箭头）
- ✅ 实时源代码同步
- ✅ 节点添加和连接
- ✅ 标签编辑
- ✅ VSCode webview 集成

## V2 版本说明

V2 版本使用 mermaid.js 作为渲染引擎，提供更好的兼容性和功能支持。

## 开发说明

- 代码使用 ES6 模块
- 使用 Webpack 打包
- 支持 source map 用于调试
- 样式使用 CSS（不使用 CSS-in-JS）

