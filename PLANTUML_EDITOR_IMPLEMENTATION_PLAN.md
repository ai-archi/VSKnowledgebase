# PlantUML 编辑器实现改造计划

## 📋 概述

本文档详细说明如何将 PlantUML 编辑器集成到 VSKnowledgebase 项目中，采用与 `mermaid-editor` 和 `archimate-js` 相同的架构模式。

## 🎯 目标

1. 在 `packages/plantuml-js` 下创建独立的 PlantUML 编辑器包
2. 在 `apps/extension/src/modules/editor/plantuml` 下创建编辑器提供者，打通编辑器和插件
3. 使用 Java PlantUML.jar 在扩展后台渲染 SVG（性能最优方案）
4. 支持实时预览、代码编辑、保存等功能
5. **PlantUML Jar 文件持久化**：jar 文件应提交到 Git 仓库，确保项目完整性

## ⚠️ 重要说明：PlantUML Jar 文件

### 文件位置

- **源文件位置**: `packages/plantuml-js/vendor/plantuml-core.jar`
- **构建输出位置**: `apps/extension/dist/plantuml-js/vendor/plantuml-core.jar`（保留 vendor 目录结构）
- **说明文档**: `packages/plantuml-js/vendor/README.md`

### 持久化要求

**`plantuml-core.jar` 文件必须提交到 Git 仓库**，原因：
1. 确保所有开发者都能直接使用，无需手动下载
2. 保证构建流程的一致性
3. 避免因网络问题导致无法获取依赖

### 文件准备

文件需要提前准备好并提交到 Git 仓库。详见 [阶段 5: 准备 PlantUML Jar 文件](#阶段-5-准备-plantuml-jar-文件) 和 `packages/plantuml-js/vendor/README.md`

## 📁 目录结构

### 新增目录和文件

```
packages/plantuml-js/
├── app/                              # 应用入口文件
│   ├── index.html                    # HTML 模板
│   ├── PlantUMLEditorApp.js          # 主应用逻辑
│   └── styles.css                    # 样式文件
├── lib/                              # JavaScript 核心库文件
│   ├── vscodeApi.js                  # VSCode API 适配器
│   ├── StateManager.js               # 状态管理器
│   └── utils.js                      # 工具函数
├── vendor/                           # 第三方二进制依赖目录
│   ├── plantuml-core.jar             # PlantUML Java 执行文件（必须，需提前准备）
│   └── README.md                     # Jar 文件位置说明
├── webpack.config.js                 # Webpack 配置
├── package.json                      # 包配置
└── README.md                         # 说明文档

apps/extension/src/modules/editor/plantuml/
├── PlantUMLEditorProvider.ts         # 编辑器提供者（核心）
└── index.ts                          # 导出文件
```

## 🔧 实施步骤

### 阶段 1: 创建 PlantUML 编辑器包

#### 步骤 1.1: 创建包目录结构

```bash
mkdir -p packages/plantuml-js/{app,lib,vendor}
```

#### 步骤 1.2: 创建 vendor 目录和说明文件

**文件**: `packages/plantuml-js/vendor/README.md`

创建说明文件，明确 jar 文件的位置：

```markdown
# PlantUML Jar 文件

## 文件位置

- **文件名**: `plantuml-core.jar`
- **完整路径**: `packages/plantuml-js/vendor/plantuml-core.jar`
- **构建输出**: `apps/extension/dist/plantuml-js/vendor/plantuml-core.jar`（保留 vendor 目录结构）

## 文件准备

此文件需要提前准备好并放置在本目录。文件应该已经提交到 Git 仓库。

如果文件缺失，需要：
1. 从 PlantUML 官方下载: https://plantuml.com/download
2. 将下载的 `plantuml.jar` 重命名为 `plantuml-core.jar`
3. 放置到本目录 (`packages/plantuml-js/vendor/`)
4. 提交到 Git 仓库

## 版本要求

- 建议使用最新稳定版本
- 最低版本要求: 1.2023.0+

## 持久化

此文件已提交到 Git 仓库，确保所有开发者都能直接使用。

## 构建流程

构建时，webpack 会自动将此文件从 `vendor/` 目录复制到 `apps/extension/dist/plantuml-js/vendor/plantuml-core.jar`，保留 vendor 目录结构。
```

#### 步骤 1.3: 创建 package.json

**文件**: `packages/plantuml-js/package.json`

```json
{
  "name": "plantuml-js",
  "version": "0.1.0",
  "description": "PlantUML diagram editor for VSCode extension",
  "scripts": {
    "build": "webpack --config webpack.config.js",
    "build:watch": "webpack --config webpack.config.js -w",
    "dev": "run-p build:watch serve",
    "serve": "serve public",
    "lint": "eslint ."
  },
  "devDependencies": {
    "@sentry/webpack-plugin": "^1.15.1",
    "copy-webpack-plugin": "^8.1.1",
    "css-loader": "^5.2.4",
    "eslint": "^7.26.0",
    "file-loader": "^6.2.0",
    "npm-run-all": "^4.1.5",
    "raw-loader": "^4.0.2",
    "serve": "^11.3.2",
    "style-loader": "^2.0.0",
    "webpack": "^5.37.0",
    "webpack-cli": "^4.7.0"
  },
  "dependencies": {
    "codemirror": "^5.65.16"
  }
}
```

#### 步骤 1.4: 创建 Webpack 配置

**文件**: `packages/plantuml-js/webpack.config.js`

参考 `packages/mermaid-editor/webpack.config.v2.js`，主要配置：
- Entry: `app/PlantUMLEditorApp.js`
- Output: 通过 `OUTPUT_PATH` 环境变量指定（默认 `public/`）
- 使用 `CopyWebpackPlugin` 复制 HTML 和 CSS 文件
- **重要**: 在 `CopyWebpackPlugin` 中添加 jar 文件复制规则：
  ```javascript
  new CopyWebpackPlugin({ 
    patterns: [
      { 
        from: '**/*.{html,css,woff,ttf,eot,svg,woff2,js,ico}', 
        context: 'app/',
        globOptions: {
          ignore: ['**/PlantUMLEditorApp.js'] // 不复制源文件，使用打包后的
        }
      },
      // 复制 jar 文件（保留 vendor 目录结构）
      {
        from: 'vendor/plantuml-core.jar',
        context: '.',
        to: 'vendor/plantuml-core.jar',
        noErrorOnMissing: false
      }
    ]
  })
  ```
- 支持 CSS loader 和 file loader

#### 步骤 1.5: 创建 HTML 模板

**文件**: `packages/plantuml-js/app/index.html`

基础结构：
- 左右分栏布局（源代码编辑器 + SVG 预览）
- 工具栏（Render、Save 按钮）
- 状态显示区域
- 错误提示区域

#### 步骤 1.6: 创建主应用逻辑

**文件**: `packages/plantuml-js/app/PlantUMLEditorApp.js`

核心功能：
1. 初始化编辑器（CodeMirror 或 textarea）
2. 初始化 VSCode API 通信
3. 处理消息：
   - `load`: 加载文档内容
   - `render-result`: 显示渲染的 SVG
   - `render-error`: 显示错误信息
4. 发送消息：
   - `load-request`: 请求加载内容
   - `render`: 请求渲染
   - `save`: 请求保存
5. 自动渲染（防抖 1 秒）

#### 步骤 1.7: 创建 VSCode API 适配器

**文件**: `packages/plantuml-js/lib/vscodeApi.js`

参考 `packages/mermaid-editor/lib/vscodeApi.js`，提供：
- `acquireVsCodeApi()` 封装
- `isVSCodeWebview` 检测
- 消息发送和接收封装

#### 步骤 1.8: 创建状态管理器

**文件**: `packages/plantuml-js/lib/StateManager.js`

简单状态管理：
- 当前源代码
- 渲染状态（idle/rendering/error）
- 错误信息

#### 步骤 1.9: 创建样式文件

**文件**: `packages/plantuml-js/app/styles.css`

样式要求：
- 使用 VSCode 主题变量（`var(--vscode-*)`）
- 响应式布局
- 工具栏样式
- 预览区域样式

#### 步骤 1.10: 创建 README.md

**文件**: `packages/plantuml-js/README.md`

参考 `packages/mermaid-editor/README.md`，创建说明文档，必须包含：

1. **项目结构说明**，明确 `vendor/plantuml-core.jar` 的位置
2. **PlantUML Jar 文件说明**，指向 `vendor/README.md`
3. **构建说明**
4. **VSCode 集成说明**

关键内容示例：

```markdown
# PlantUML Editor

PlantUML 图表编辑器，用于 VSCode 扩展集成。

## 项目结构

```
plantuml-js/
├── app/                    # 应用入口文件
├── lib/                    # JavaScript 核心库文件
├── vendor/                 # 第三方二进制依赖目录
│   ├── plantuml-core.jar  # PlantUML Java 执行文件（必须，需提前准备）
│   └── README.md          # Jar 文件位置说明
└── ...
```

## PlantUML Jar 文件

**重要**: 本编辑器依赖 PlantUML Java 执行文件。

- **位置**: `vendor/plantuml-core.jar`
- **说明**: 详见 [vendor/README.md](./vendor/README.md)
- **持久化**: 此文件已提交到 Git，无需手动下载

## 构建

构建时，webpack 会自动将 `vendor/plantuml-core.jar` 复制到输出目录的 `vendor/` 子目录中，保持目录结构一致。
```

### 阶段 2: 创建编辑器提供者

#### 步骤 2.1: 创建编辑器提供者目录

```bash
mkdir -p apps/extension/src/modules/editor/plantuml
```

#### 步骤 2.2: 创建 PlantUMLEditorProvider.ts

**文件**: `apps/extension/src/modules/editor/plantuml/PlantUMLEditorProvider.ts`

核心实现：

1. **类定义**:
   ```typescript
   export class PlantUMLEditorProvider implements vscode.CustomTextEditorProvider {
     public static readonly viewType = 'architool.plantumlEditor';
   }
   ```

2. **注册方法**:
   ```typescript
   public static register(context: vscode.ExtensionContext): vscode.Disposable
   ```

3. **解析编辑器**:
   ```typescript
   async resolveCustomTextEditor(
     document: vscode.TextDocument,
     webviewPanel: vscode.WebviewPanel,
     token: vscode.CancellationToken
   ): Promise<void>
   ```

4. **渲染方法**（核心）:
   ```typescript
   private async renderPlantUML(source: string): Promise<string> {
     // 1. 查找 jar 文件
     // 2. 使用 spawn 执行 java -jar plantuml-core.jar -pipe -tsvg
     // 3. 通过 stdin 输入源码
     // 4. 从 stdout 获取 SVG
     // 5. 返回 SVG 字符串
   }
   ```

5. **WebView 内容生成**:
   ```typescript
   private getWebviewContent(
     webview: vscode.Webview,
     document: vscode.TextDocument,
     extensionUri: vscode.Uri
   ): string
   ```

**关键实现细节**:

- **Jar 文件查找策略**:
  - 优先: `{extensionPath}/dist/plantuml-js/vendor/plantuml-core.jar`（构建输出目录，保留 vendor 结构）
  - 备选: `{extensionPath}/libs/plantuml.jar`（如果手动放置）
  - 如果都不存在，抛出清晰的错误提示，提示用户检查 jar 文件是否已准备好

- **进程执行**:
  ```typescript
  const javaProcess = spawn('java', [
    '-jar',
    actualJarPath,
    '-pipe',    // 关键：使用 pipe 模式
    '-tsvg',    // 输出 SVG 格式
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024, // 10MB
  });
  ```

- **消息处理**:
  - `load-request`: 发送文档内容
  - `render`: 调用 `renderPlantUML` 并返回 SVG
  - `save`: 保存文档内容

#### 步骤 2.3: 创建导出文件

**文件**: `apps/extension/src/modules/editor/plantuml/index.ts`

```typescript
export * from './PlantUMLEditorProvider';
```

### 阶段 3: 集成到扩展

#### 步骤 3.1: 在 main.ts 中注册编辑器

**文件**: `apps/extension/src/main.ts`

在编辑器注册部分添加：

```typescript
import { PlantUMLEditorProvider } from './modules/editor/plantuml/PlantUMLEditorProvider';

// 在 Mermaid 编辑器注册之后
const plantumlEditorDisposable = PlantUMLEditorProvider.register(context);
context.subscriptions.push(plantumlEditorDisposable);
logger.info('PlantUML editor provider registered');
```

#### 步骤 3.2: 配置 package.json

**文件**: `apps/extension/package.json`

在 `contributes.customEditors` 中添加：

```json
{
  "viewType": "architool.plantumlEditor",
  "displayName": "PlantUML Diagram",
  "selector": [
    {
      "filenamePattern": "*.puml"
    }
  ],
  "priority": "default"
}
```

#### 步骤 3.3: 更新文件打开逻辑

**文件**: `apps/extension/src/modules/shared/interface/commands/BaseFileTreeCommands.ts`

在 `openFileByContentLocation` 方法中：

```typescript
case '.puml':
  viewType = 'architool.plantumlEditor';
  break;
```

### 阶段 4: 构建配置

#### 步骤 4.1: 更新根目录 package.json

**文件**: `package.json`

在 `scripts` 中添加：

```json
{
  "build:plantuml-js": "mkdir -p apps/extension/dist/plantuml-js && rm -rf apps/extension/dist/plantuml-js/* && cd packages/plantuml-js && OUTPUT_PATH=../../apps/extension/dist/plantuml-js pnpm run build"
}
```

更新 `build` 脚本：

```json
{
  "build": "pnpm run build:extension && pnpm run build:webview && pnpm run build:archimate-js && pnpm run build:mermaid-editor && pnpm run build:plantuml-js"
}
```

#### 步骤 4.2: 更新 Makefile

**文件**: `Makefile`

添加构建任务：

```makefile
build-plantuml-js:
	echo "Building plantuml-js..."
	mkdir -p apps/extension/dist/plantuml-js
	rm -rf apps/extension/dist/plantuml-js/*
	cd packages/plantuml-js && OUTPUT_PATH=../../apps/extension/dist/plantuml-js pnpm run build
```

更新 `build-all` 任务：

```makefile
build-all: build-archimate-js build-mermaid-editor build-plantuml-js build-webview
```

#### 步骤 4.3: 更新 VS Code Tasks

**文件**: `.vscode/tasks.json`

添加构建任务：

```json
{
  "label": "Build PlantUML JS",
  "type": "shell",
  "command": "pnpm",
  "args": ["run", "build:plantuml-js"],
  "options": {
    "cwd": "${workspaceFolder}"
  },
  "problemMatcher": [],
  "group": "build"
}
```

更新 "Build All" 任务的依赖：

```json
{
  "dependsOn": [
    "Build Archimate JS",
    "Build Mermaid Editor",
    "Build PlantUML JS",
    "Compile Extension",
    "Build Webview",
    "Copy Webview Assets"
  ]
}
```

### 阶段 5: 准备 PlantUML Jar 文件

#### 步骤 5.1: 确定 Jar 文件位置

**推荐方案（通过构建流程管理）**:

将 jar 文件放在 `packages/plantuml-js/vendor/` 目录下，通过 webpack 构建时自动复制到输出目录。

1. 创建目录: `packages/plantuml-js/vendor/`
2. 准备 PlantUML Jar 文件:
   - 文件应该已经准备好并命名为 `plantuml-core.jar`
   - 如果缺失，需要从 PlantUML 官方下载: https://plantuml.com/download
   - 将下载的 `plantuml.jar` 重命名为 `plantuml-core.jar`
3. 放置文件: `packages/plantuml-js/vendor/plantuml-core.jar`

4. 更新 webpack 配置，添加复制规则（在 `webpack.config.js` 的 `CopyWebpackPlugin` 中添加）:
   ```javascript
   {
     from: 'vendor/plantuml-core.jar',
     context: '.',
     to: 'vendor/plantuml-core.jar',  // 保留 vendor 目录结构
     noErrorOnMissing: false
   }
   ```

这样，构建时会自动将 jar 文件复制到 `apps/extension/dist/plantuml-js/vendor/plantuml-core.jar`，保留 vendor 目录结构。

**备选方案（直接使用现有文件）**:

如果 `apps/extension/dist/plantuml-js/vendor/plantuml-core.jar` 已经存在，可以直接使用，无需额外配置。

**不推荐方案**:

- ❌ `apps/extension/libs/plantuml.jar` - 不在构建流程中，需要手动管理
- ❌ 直接放在 `apps/extension/dist/plantuml-js/` - 会被构建脚本清理

**正确方案**:

- ✅ `apps/extension/dist/plantuml-js/vendor/plantuml-core.jar` - 保留 vendor 目录结构，前端不需要直接访问

#### 步骤 5.2: 确保 Jar 文件持久化

**重要**: `plantuml-core.jar` 文件应该提交到 Git 仓库，确保所有开发者都能使用。

1. **检查 .gitignore**:
   - 确保根目录 `.gitignore` 中**没有**排除 `packages/plantuml-js/vendor/*.jar`
   - 如果存在排除规则，需要移除或添加例外：
     ```gitignore
     # 允许 plantuml-core.jar 提交到 git
     !packages/plantuml-js/vendor/plantuml-core.jar
     ```

2. **验证文件已跟踪**:
   ```bash
   git add packages/plantuml-js/vendor/plantuml-core.jar
   git status  # 确认文件显示为新增
   ```

3. **提交文件**:
   ```bash
   git commit -m "Add PlantUML jar file for editor"
   ```

**注意**: 
- Jar 文件虽然较大（通常几MB），但为了确保项目完整性，应该提交到仓库
- 如果使用 Git LFS，可以考虑将 jar 文件添加到 LFS 管理

### 阶段 6: 测试和验证

#### 步骤 6.1: 构建测试

```bash
# 构建 PlantUML 编辑器包
cd packages/plantuml-js
pnpm install
pnpm run build

# 验证输出
ls -la ../../apps/extension/dist/plantuml-js/
```

#### 步骤 6.2: 编译扩展

```bash
cd apps/extension
pnpm run compile
```

#### 步骤 6.3: 功能测试

1. 打开一个 `.puml` 文件
2. 验证编辑器是否正确加载
3. 测试渲染功能
4. 测试保存功能
5. 测试错误处理（Java 未安装、jar 缺失等）

## 📊 架构对比

### 与 Mermaid 编辑器对比

| 特性 | Mermaid Editor | PlantUML Editor (计划) |
|------|---------------|----------------------|
| 包位置 | `packages/mermaid-editor` | `packages/plantuml-js` |
| 提供者位置 | `apps/extension/src/modules/editor/mermaid` | `apps/extension/src/modules/editor/plantuml` |
| 渲染引擎 | mermaid.js (前端) | Java PlantUML.jar (后台) |
| 构建输出 | `apps/extension/dist/mermaid-editor` | `apps/extension/dist/plantuml-js` |
| 复杂度 | 高（完整交互编辑器） | 中（代码编辑 + 预览） |

### 与 ArchiMate 编辑器对比

| 特性 | ArchiMate Editor | PlantUML Editor (计划) |
|------|-----------------|----------------------|
| 包位置 | `packages/archimate-js` | `packages/plantuml-js` |
| 提供者位置 | `apps/extension/src/modules/editor/archimate` | `apps/extension/src/modules/editor/plantuml` |
| HTML 来源 | 外部文件 | 外部文件（通过 webpack） |
| 资源路径 | 需要转换 | 需要转换 |

## 🔄 数据流

### 渲染流程

```
用户输入 PlantUML 源码
    ↓
WebView: PlantUMLEditorApp.js
    ↓
发送消息: { type: 'render', source: '...' }
    ↓
Extension Host: PlantUMLEditorProvider.ts
    ↓
调用 renderPlantUML(source)
    ↓
spawn('java', ['-jar', 'plantuml-core.jar', '-pipe', '-tsvg'])
    ↓
写入 stdin: source
    ↓
读取 stdout: SVG
    ↓
返回 SVG 字符串
    ↓
发送消息: { type: 'render-result', svg: '...' }
    ↓
WebView: 显示 SVG
```

### 保存流程

```
用户点击 Save
    ↓
WebView: 发送 { type: 'save', source: '...' }
    ↓
Extension Host: 更新文档
    ↓
vscode.workspace.applyEdit()
    ↓
document.save()
    ↓
发送消息: { type: 'save-success' }
    ↓
WebView: 显示保存成功提示
```

## ⚠️ 注意事项

### 1. 依赖要求

- **Java Runtime**: 必须安装 Java 并可在 PATH 中执行 `java` 命令
- **PlantUML Jar**: 必须提前准备好并放置到正确位置（`packages/plantuml-js/vendor/plantuml-core.jar`）

### 2. 错误处理

需要处理以下错误情况：
- Java 未安装（`ENOENT` 错误）
- Jar 文件不存在
- 渲染失败（非零退出码）
- 空输出
- 超时（可选）

### 3. 性能优化

- 防抖渲染：输入后延迟 1 秒再渲染
- 错误缓存：缓存 jar 路径，避免重复查找
- 超时控制：设置渲染超时（如 30 秒）

### 4. 跨平台兼容

- 使用 `path.join` 确保路径正确
- 使用 `spawn` 而不是 `exec`，更好的跨平台支持
- 处理不同操作系统的路径分隔符

## 📝 实施检查清单

### 包创建
- [ ] 创建 `packages/plantuml-js` 目录
- [ ] 创建 `packages/plantuml-js/vendor/` 目录
- [ ] 创建 `packages/plantuml-js/vendor/README.md`（Jar 文件位置说明）
- [ ] 创建 `package.json`
- [ ] 创建 `webpack.config.js`
- [ ] 创建 `app/index.html`
- [ ] 创建 `app/PlantUMLEditorApp.js`
- [ ] 创建 `app/styles.css`
- [ ] 创建 `lib/vscodeApi.js`
- [ ] 创建 `lib/StateManager.js`
- [ ] 创建 `lib/utils.js`
- [ ] 创建 `README.md`（包含 jar 文件位置说明）

### 编辑器提供者
- [ ] 创建 `apps/extension/src/modules/editor/plantuml` 目录
- [ ] 创建 `PlantUMLEditorProvider.ts`
- [ ] 实现 `register` 方法
- [ ] 实现 `resolveCustomTextEditor` 方法
- [ ] 实现 `renderPlantUML` 方法
- [ ] 实现 `getWebviewContent` 方法
- [ ] 创建 `index.ts`

### 集成
- [ ] 在 `main.ts` 中导入并注册
- [ ] 在 `package.json` 中添加编辑器配置
- [ ] 更新 `BaseFileTreeCommands.ts` 文件打开逻辑

### 构建配置
- [ ] 更新根目录 `package.json` 构建脚本
- [ ] 更新 `Makefile`
- [ ] 更新 `.vscode/tasks.json`

### 资源准备
- [ ] 确保 `packages/plantuml-js/vendor/` 目录已创建（在"包创建"阶段已完成）
- [ ] 确保 `packages/plantuml-js/vendor/README.md` 说明文件已创建（在"包创建"阶段已完成）
- [ ] 准备 `plantuml-core.jar` 文件（如果缺失，需要下载并重命名）
- [ ] 放置到 `packages/plantuml-js/vendor/plantuml-core.jar`
- [ ] 更新 webpack 配置以复制 jar 文件
- [ ] 检查 `.gitignore` 确保 jar 文件不被排除
- [ ] 提交 jar 文件到 Git 仓库（持久化）

### 测试
- [ ] 构建包测试
- [ ] 编译扩展测试
- [ ] 功能测试
- [ ] 错误处理测试

## 🎯 预期结果

完成实施后，应该能够：

1. ✅ 打开 `.puml` 文件时自动使用 PlantUML 编辑器
2. ✅ 左侧编辑源代码，右侧实时预览 SVG
3. ✅ 自动渲染（输入后延迟 1 秒）
4. ✅ 手动渲染和保存功能
5. ✅ 清晰的错误提示
6. ✅ 与现有编辑器（Mermaid、ArchiMate）一致的体验

## 📚 参考文档

- [Mermaid Editor 实现](../packages/mermaid-editor/README.md)
- [ArchiMate Editor 实现](../apps/extension/src/modules/editor/archimate/ArchimateEditorProvider.ts)
- [PlantUML 官方文档](https://plantuml.com/)
- [VSCode Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)

## 🚀 开始实施

按照本计划逐步实施，建议按阶段进行，每完成一个阶段进行测试验证，确保功能正常后再继续下一阶段。

---

**最后更新**: 2024-12-19
**版本**: 1.0.0

