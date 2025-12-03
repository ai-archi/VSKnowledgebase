# Archimate Editor V2

基于 archimate-js (diagram-js) 的 Archimate 图表编辑器，参考 MermaidEditorAppV2 的架构设计。

## 项目结构

```
archimate-js-v2/
├── app/                    # 应用入口文件
│   ├── index.html          # HTML 模板
│   ├── ArchimateEditorApp.js  # 主应用逻辑
│   └── styles.css          # 样式文件
├── lib/                    # 核心库文件
│   ├── StateManager.js     # 状态管理器
│   ├── vscodeApi.js        # VSCode API 适配器
│   ├── ArchimateRenderer.js # Archimate 渲染器（基于 archimate-js）
│   ├── ArchimateParser.js  # Archimate XML 解析器
│   └── ArchimateCodeGenerator.js # Archimate XML 代码生成器
├── webpack.config.js       # Webpack 配置
└── package.json            # 项目配置
```

## 架构说明

### 基于 bpmn.js (diagram-js) 架构

本方案基于以下技术栈：

1. **archimate-js**: 基于 diagram-js（来自 bpmn.io）的 Archimate 模型编辑器
2. **diagram-js**: bpmn.io 提供的通用图表编辑引擎
3. **moddle**: 用于处理 Archimate 3.1 XML 格式

### 核心组件

- **ArchimateRenderer**: 使用 archimate-js 的 Modeler 进行渲染
- **ArchimateParser**: 解析 Archimate 3.1 XML 为内部数据结构
- **ArchimateCodeGenerator**: 从内部数据结构生成 Archimate 3.1 XML

### 设计模式

参考 MermaidEditorAppV2 的架构：
- 状态管理：使用 StateManager 管理应用状态
- 消息传递：通过 vscodeApi 与 VSCode 扩展通信
- 渲染分离：渲染器独立于应用逻辑

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

1. 将 `public/` 目录复制到扩展的 `dist/archimate-js-v2/` 目录
2. 在 `ArchimateEditorProvider` 中加载 `index.html`

## 主要特性

- ✅ 基于 archimate-js (diagram-js) 的渲染引擎
- ✅ 完整的 Archimate 3.1 XML 支持
- ✅ 实时源代码同步
- ✅ VSCode webview 集成
- ✅ 缩放控制
- ✅ 源代码编辑

## 开发说明

- 代码使用 ES6 模块
- 使用 Webpack 打包
- 支持 source map 用于调试
- 样式使用 CSS（支持 VSCode 主题变量）

## 依赖

- **archimate-js**: 位于 `../../vendors/archimate-js`
- **diagram-js**: archimate-js 的依赖

## 规范参考

- Archimate 3.1 规范：`vendors/archimate.js/specification/`
- 基于 OpenGroup Archimate 3.1 Exchange Format

