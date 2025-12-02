# PlantUML Editor

PlantUML 图表编辑器，用于 VSCode 扩展集成。

## 项目结构

```
plantuml-js/
├── app/                    # 应用入口文件
│   ├── index.html          # HTML 模板
│   ├── PlantUMLEditorApp.js  # 主应用逻辑
│   └── styles.css          # 样式文件
├── lib/                    # JavaScript 核心库文件
│   ├── vscodeApi.js        # VSCode API 适配器
│   ├── StateManager.js     # 状态管理器
│   └── utils.js            # 工具函数
├── vendor/                 # 第三方二进制依赖目录
│   ├── plantuml-1.2025.10.jar   # PlantUML Java 执行文件（必须，需提前准备）
│   └── README.md           # Jar 文件位置说明
├── webpack.config.js       # Webpack 配置
└── package.json            # 项目配置
```

## PlantUML Jar 文件

**重要**: 本编辑器依赖 PlantUML Java 执行文件。

- **位置**: `vendor/plantuml-1.2025.10.jar`
- **说明**: 详见 [vendor/README.md](./vendor/README.md)
- **持久化**: 此文件已提交到 Git，无需手动下载

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

构建时，webpack 会自动将 `vendor/plantuml-1.2025.10.jar` 复制到输出目录的 `vendor/` 子目录中，保持目录结构一致。

## VSCode 集成

构建后的文件会输出到 `apps/extension/dist/plantuml-js/` 目录。在 VSCode 扩展中，通过 `PlantUMLEditorProvider` 加载 `index.html`。

## 主要特性

- ✅ 基于 Java PlantUML.jar 的渲染引擎（后台渲染）
- ✅ 代码编辑（CodeMirror）
- ✅ 实时预览（SVG）
- ✅ 自动渲染（输入后延迟 1 秒）
- ✅ 手动渲染和保存功能
- ✅ VSCode webview 集成

## 开发说明

- 代码使用 ES6 模块
- 使用 Webpack 打包
- 支持 source map 用于调试
- 样式使用 CSS（使用 VSCode 主题变量）

