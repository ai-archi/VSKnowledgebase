# PlantUML Editor 集成到 Webview 改造方案

## 一、可行性分析

### ✅ 可以集成

**理由：**
1. **技术栈兼容**：plantuml-js 使用纯 JavaScript ES6 模块，可以轻松在 Vue 3 中使用
2. **通信方式统一**：两者都通过 VSCode API 通信，可以统一使用 `ExtensionService`
3. **依赖管理**：codemirror 已经通过 npm 安装到 webview 项目
4. **模块化设计**：plantuml-js 的 lib 目录已经是模块化设计，便于集成
5. **渲染方式**：PlantUML 通过后端 Java 进程渲染，前端只需处理 SVG 显示

### 当前架构对比

| 项目 | 构建工具 | 框架 | 通信方式 | 入口 | 渲染方式 |
|------|---------|------|---------|------|---------|
| plantuml-js | Webpack | 纯 JS | vscodeApi.js | index.html | 后端 Java 进程 |
| webview | Vite | Vue 3 | ExtensionService.ts | *.html + *.vue | 前端/后端混合 |

### 特殊考虑

1. **JAR 文件位置**：需要将 `packages/plantuml-js/vendor/plantuml-1.2025.10.jar` 移动到 `vendor/plantuml/plantuml-1.2025.10.jar`
2. **渲染服务**：PlantUML 渲染在扩展后端通过 Java 进程完成，前端只负责显示
3. **消息格式**：当前使用 `type` 字段的消息格式，需要适配到 `ExtensionService` 的 `method` 格式

## 二、改造方案

### 方案概述

将 plantuml-js 的核心功能封装为 Vue 3 组件，集成到 webview 项目中，统一使用 Vite 构建和 ExtensionService 通信。PlantUML JAR 文件移动到统一的 vendor 目录。

### 改造步骤

#### 步骤 1: 迁移 JAR 文件

**目标**：将 PlantUML JAR 文件移动到统一的 vendor 目录

**操作**：
1. 创建目标目录：`vendor/plantuml/`
2. 移动文件：
   ```
   packages/plantuml-js/vendor/plantuml-1.2025.10.jar 
   → vendor/plantuml/plantuml-1.2025.10.jar
   ```
3. 更新 `PlantUMLEditorProvider.ts` 中的 JAR 文件查找路径

#### 步骤 2: 迁移核心库文件

**目标**：将 `packages/plantuml-js/lib` 和 `app/PlantUMLEditorApp.js` 迁移到 `apps/webview/src/lib/plantuml-editor/`

**操作**：
1. 创建目录结构：
   ```
   apps/webview/src/lib/plantuml-editor/
   ├── StateManager.js
   ├── utils.js
   ├── PlantUMLEditorApp.js
   └── vscodeApiAdapter.ts
   ```

2. 复制并适配文件：
   - 直接复制 `StateManager.js` 和 `utils.js`
   - 复制并修改 `PlantUMLEditorApp.js`，适配 Vue 组件使用
   - 创建 `vscodeApiAdapter.ts` 替代 `vscodeApi.js`

#### 步骤 3: 创建通信适配器

**目标**：创建适配层，将 plantuml-js 的通信方式统一到 ExtensionService

**文件**：`apps/webview/src/lib/plantuml-editor/vscodeApiAdapter.ts`

**设计要点**：
- 创建 `postMessage` 函数，将原有的 `type` 消息格式转换为 ExtensionService 的 `method` 格式
- 实现 `setupMessageHandlers` 函数，通过 ExtensionService 的 `on()` 方法监听后端推送的事件
- 消息类型映射：
  - `load-request` → `loadPlantUML`
  - `render` → `renderPlantUML`
  - `save` → `savePlantUML`
- 事件监听映射：
  - `load` 事件 → `onSourceLoad` 回调
  - `render-result` 事件 → `onRenderResult` 回调
  - `render-error` 事件 → `onRenderError` 回调
  - `save-success` 事件 → `onSaveSuccess` 回调
- 所有消息调用都是异步的，但不等待响应，后端通过事件推送返回结果

#### 步骤 4: 创建 Vue 组件

**目标**：创建 `PlantUMLEditor.vue` 组件封装编辑器功能

**文件**：`apps/webview/src/components/PlantUMLEditor.vue`

**组件设计**：
- 使用 Vue 3 Composition API
- 布局结构：
  - 工作区（workspace）：包含图表面板和源代码面板
  - 图表面板（diagram-panel）：显示渲染的 SVG，包含缩放控制按钮
  - 分隔条（workspace-divider）：可拖拽调整面板大小
  - 源代码面板（source-panel）：包含源代码编辑器
- 响应式状态：
  - `error`：错误消息
  - `zoomDisabled`：缩放按钮禁用状态
- 生命周期：
  - `onMounted`：初始化 `PlantUMLEditorApp` 实例，设置回调函数
  - `onUnmounted`：清理资源，调用 `destroy` 方法
- 交互功能：
  - 缩放控制：放大、缩小、重置
  - 面板调整：通过分隔条拖拽调整大小

#### 步骤 5: 创建编辑器主类（Vue 适配版）

**目标**：创建适配 Vue 的编辑器主类

**文件**：`apps/webview/src/lib/plantuml-editor/PlantUMLEditorApp.ts`

**关键改动**：
- 构造函数接收 DOM 元素引用而非通过 `getElementById` 获取
- 使用 `vscodeApiAdapter` 替代 `vscodeApi.js`
- 添加 `destroy` 方法用于清理资源
- 添加回调函数支持 Vue 响应式更新

**核心功能设计**：
- **初始化**：动态导入 CodeMirror，如果失败则回退到原生 textarea；设置消息回调；初始化工作区调整功能
- **状态管理**：使用 StateManager 管理编辑器状态（源代码、渲染状态、错误信息等）
- **渲染流程**：通过防抖机制（1秒延迟）触发渲染请求；后端通过事件推送返回 SVG 结果
- **缩放功能**：支持鼠标滚轮缩放（Ctrl/Cmd + 滚轮）、缩放按钮、缩放范围限制（0.1x - 5.0x）
- **平移功能**：支持鼠标拖拽平移图表
- **工作区调整**：支持拖拽分隔条调整图表面板和源代码面板大小，支持键盘调整
- **资源清理**：在 `destroy` 方法中清理所有事件监听器和 CodeMirror 实例

#### 步骤 6: 创建 HTML 入口页面

**目标**：创建 plantuml-editor 的 HTML 入口

**文件**：`apps/webview/plantuml-editor.html`

**设计要点**：
- 标准的 HTML5 结构
- 包含一个 `#app` 容器用于挂载 Vue 应用
- 引入入口脚本 `plantuml-editor-main.ts`

#### 步骤 7: 创建入口脚本

**文件**：`apps/webview/src/plantuml-editor-main.ts`

**设计要点**：
- 使用 Vue 3 的 `createApp` 创建应用实例
- 导入 `PlantUMLEditorPage` 组件
- 导入 VSCode 主题样式
- 挂载到 `#app` 元素

#### 步骤 8: 创建页面组件

**文件**：`apps/webview/src/PlantUMLEditorPage.vue`

**设计要点**：
- 简单的容器组件，包含 `PlantUMLEditor` 组件
- 使用 VSCode 主题变量设置背景色
- 全屏布局（100vh）

#### 步骤 9: 更新 Vite 配置

**文件**：`apps/webview/vite.config.ts`

**改动**：在 `rollupOptions.input` 中添加 `plantuml-editor.html` 作为新的构建入口

#### 步骤 10: 安装依赖

**文件**：`apps/webview/package.json`

**依赖已存在**：codemirror 已经在依赖列表中，无需额外安装

#### 步骤 11: 更新 PlantUMLEditorProvider

**目标**：修改扩展中的 PlantUMLEditorProvider 使用新的 webview

**文件**：`apps/extension/src/modules/editor/plantuml/PlantUMLEditorProvider.ts`

**关键改动**：

1. **更新 JAR 文件查找路径**：
   - 查找新位置：`vendor/plantuml/plantuml-1.2025.10.jar`
   - **注意**：本项目为早期版本，移除旧的 `dist/plantuml-js` 路径支持，简化实现

2. **修改 `getWebviewContent` 方法**：
   - 从 `dist/webview/plantuml-editor.html` 读取 HTML 文件
   - 将所有相对路径的资源（script、link）转换为 webview URI
   - 跳过已经是绝对路径的资源（http、data、vscode-webview://）
   - **重要**：在 `</head>` 标签前注入 VSCode API 脚本，确保 `acquireVsCodeApi()` 可用

3. **更新消息处理逻辑**：
   - 接收 ExtensionService 格式的消息（`method` + `params` + `id`）
   - 处理三种方法：
     - `loadPlantUML`：返回文档内容，通过事件推送（格式：`{ method: 'load', params: { source } }`）
     - `renderPlantUML`：调用 Java 进程渲染，通过事件推送结果（格式：`{ method: 'render-result', params: { svg } }` 或 `{ method: 'render-error', params: { error } }`）
     - `savePlantUML`：保存文档内容，通过事件推送成功（格式：`{ method: 'save-success' }`）
   - **关键**：后端推送事件必须使用 `method` 字段，而不是 `type` 字段（ExtensionService 通过 `message.method` 匹配事件）
   - 监听文档变更，主动推送更新到 webview（使用 `method: 'load'` 格式）
   - 初始内容加载：在 webview 可见时发送初始内容，使用多个延迟确保 Vue 应用已初始化（参考 MermaidEditorProvider 的实现）

#### 步骤 12: 样式迁移

**目标**：将 plantuml-js 的样式集成到 Vue 组件

**操作**：
1. 复制 `packages/plantuml-js/app/styles.css` 到 `apps/webview/src/styles/plantuml-editor.css`
2. 适配 VSCode 主题变量：
   - 定义 CSS 变量映射到 VSCode 主题变量
   - 背景色：`--vscode-editor-background`
   - 文字色：`--vscode-editor-foreground`
   - 边框色：`--vscode-panel-border`
   - 面板背景：`--vscode-sideBar-background`
   - 错误背景：`--vscode-inputValidation-errorBackground`
   - 错误文字：`--vscode-inputValidation-errorForeground`
   - 所有硬编码颜色替换为 CSS 变量，提供默认值作为回退

## 三、技术细节

### 3.1 状态管理

**方案**：使用 Vue 3 Composition API + 原有的 StateManager

**设计要点**：
- 保留原有的 `StateManager` 类管理编辑器内部状态
- Vue 组件通过 `ref` 和 `reactive` 管理 UI 状态（错误消息、按钮状态等）
- 通过 `StateManager.subscribe()` 订阅状态变化，同步到 Vue 响应式状态
- 状态包括：源代码、渲染状态、错误信息、SVG 内容等

### 3.2 CodeMirror 集成

**方案**：在 PlantUMLEditorApp 类中动态导入 CodeMirror（已通过 npm 安装）

**设计要点**：
- 使用动态 `import()` 导入 CodeMirror，避免阻塞初始化
- 同时导入 CodeMirror CSS 样式
- 配置选项：纯文本模式、行号、自动换行、缩进设置
- 如果导入失败，自动回退到原生 textarea
- 监听编辑器变化事件，更新状态并触发渲染

### 3.3 PlantUML 渲染

**方案**：渲染在扩展后端通过 Java 进程完成，前端只负责显示 SVG

**流程**：
1. 前端通过 ExtensionService 发送渲染请求（包含源代码）
2. 后端通过 Java 进程执行 PlantUML JAR 文件
3. 后端将渲染结果（SVG 字符串）通过事件推送返回前端
4. 前端接收 SVG 并显示在图表容器中

### 3.4 消息通信适配

#### 消息格式映射表

| 前端调用 | 后端接收 | 后端响应（事件推送） | 前端监听 |
|---------|---------|-------------------|---------|
| `postMessage('load-request')` | `method: 'loadPlantUML'` | `{ method: 'load', params: { source } }` | `on('load')` |
| `postMessage('render', { source })` | `method: 'renderPlantUML', params: { source }` | `{ method: 'render-result', params: { svg } }` 或 `{ method: 'render-error', params: { error } }` | `on('render-result')` / `on('render-error')` |
| `postMessage('save', { source })` | `method: 'savePlantUML', params: { source }` | `{ method: 'save-success' }` | `on('save-success')` |

**重要说明**：
- 后端推送事件必须使用 `method` 字段（ExtensionService 通过 `message.method` 匹配事件处理器）
- 事件数据必须放在 `params` 对象中
- 格式示例：`{ method: 'load', params: { source } }`（正确），而不是 `{ type: 'load', source }`（错误）

#### 消息格式说明

**本项目使用 ExtensionService 格式（统一格式）**：
```javascript
// 发送（前端 → 后端）
{ method: 'loadPlantUML', id: 1 }
{ method: 'renderPlantUML', params: { source: '...' }, id: 2 }
{ method: 'savePlantUML', params: { source: '...' }, id: 3 }

// 接收（后端 → 前端，事件推送）
{ method: 'load', params: { source: '...' } }
{ method: 'render-result', params: { svg: '...' } }
{ method: 'render-error', params: { error: '...' } }
{ method: 'save-success' }
```

**格式要点**：
- 使用 `method` 字段标识方法名或事件名
- 数据放在 `params` 对象中
- ExtensionService 通过 `message.method` 匹配事件处理器
- **注意**：本项目为早期版本（0.1.0），直接使用新格式，无需兼容旧格式

#### ExtensionService 消息格式

**请求格式**（前端 → 后端）：
```typescript
{
  method: string;      // 方法名，如 'loadPlantUML'
  params?: any;        // 参数对象
  id: number;          // 请求 ID（自动生成）
}
```

**响应格式**（后端 → 前端，用于请求-响应）：
```typescript
{
  id: number;          // 对应请求的 ID
  result?: any;         // 成功时的结果
  error?: {             // 失败时的错误
    code: number;
    message: string;
  };
}
```

**事件推送格式**（后端 → 前端，用于主动推送）：
```typescript
{
  method: string;       // 事件名，如 'load', 'render-result'
  params?: any;         // 事件数据
}
```

#### 前端实现要点

- 使用 `extensionService.call()` 发送请求，但不等待响应
- 通过 `extensionService.on()` 监听后端推送的事件
- 事件名对应后端的 `method` 字段

#### 后端实现要点

- 接收 ExtensionService 格式的消息（`method` + `params` + `id`）
- 处理完成后通过 `postMessage` 推送事件（格式：`{ method, params }`）
- **重要**：必须使用 `method` 字段推送事件，不能使用 `type` 字段（ExtensionService 通过 `message.method` 匹配事件处理器）
- 不使用 `result` 字段，因为这是事件推送而非请求响应
- 事件数据放在 `params` 对象中，例如：`{ method: 'load', params: { source: '...' } }`

## 四、文件结构

### 改造后的目录结构

```
apps/webview/
├── plantuml-editor.html                    # 新增：HTML 入口
├── src/
│   ├── plantuml-editor-main.ts             # 新增：入口脚本
│   ├── PlantUMLEditorPage.vue              # 新增：页面组件
│   ├── components/
│   │   └── PlantUMLEditor.vue              # 新增：编辑器组件
│   ├── lib/
│   │   └── plantuml-editor/               # 新增：核心库
│   │       ├── StateManager.js
│   │       ├── utils.js
│   │       ├── PlantUMLEditorApp.ts       # 新增：Vue 适配版
│   │       └── vscodeApiAdapter.ts         # 新增：通信适配器
│   ├── services/
│   │   └── ExtensionService.ts             # 已有：统一通信服务
│   └── styles/
│       └── plantuml-editor.css             # 新增：编辑器样式
└── vite.config.ts                           # 修改：添加构建入口

vendor/
└── plantuml/
    └── plantuml-1.2025.10.jar              # 移动：JAR 文件新位置
```

## 五、优势

1. **统一构建**：所有 webview 使用同一个 Vite 构建系统
2. **代码复用**：ExtensionService 统一管理通信
3. **类型安全**：TypeScript 支持更好
4. **维护性**：减少重复代码，统一技术栈
5. **开发体验**：Vue DevTools 支持，热重载
6. **性能优化**：Vite 的快速构建和 HMR
7. **资源管理**：JAR 文件统一管理在 vendor 目录

## 六、注意事项

1. **JAR 文件位置**：确保 JAR 文件移动到 `vendor/plantuml/` 目录
2. **Java 运行时**：确保系统已安装 Java 并可在 PATH 中访问
3. **样式隔离**：使用 scoped 样式或 CSS 模块避免冲突
4. **性能优化**：大文件编辑时注意防抖和虚拟滚动
5. **错误处理**：统一错误处理机制，特别是 Java 进程错误
6. **消息格式**：本项目为早期版本（0.1.0），可以接受破坏性变更，直接使用新的 `method` 格式，无需保留旧的 `type` 格式兼容
7. **路径处理**：webview 中的资源路径需要正确转换为 webview URI
8. **消息格式**：确保 ExtensionService 的消息格式与后端一致，后端推送事件必须使用 `method` 字段
9. **CodeMirror 模式**：PlantUML 没有专门的 CodeMirror 模式，使用纯文本模式
10. **VSCode API 注入**：必须在 HTML 中注入 VSCode API 脚本，确保 `acquireVsCodeApi()` 可用
11. **初始内容加载**：考虑使用 `onDidChangeViewState` 监听 webview 可见性，确保在 webview 可见时发送初始内容

## 七、迁移检查清单

- [ ] 移动 JAR 文件到 `vendor/plantuml/plantuml-1.2025.10.jar`
- [ ] 复制 lib 目录文件到 webview
- [ ] 创建 vscodeApiAdapter.ts 适配 ExtensionService
- [ ] 创建 PlantUMLEditor.vue 组件
- [ ] 创建 PlantUMLEditorPage.vue 页面
- [ ] 创建 plantuml-editor.html 入口
- [ ] 创建 plantuml-editor-main.ts 入口脚本
- [ ] 更新 vite.config.ts 添加构建入口
- [ ] 迁移样式文件并适配 VSCode 主题
- [ ] 更新 PlantUMLEditorProvider 使用新入口
- [ ] 更新 JAR 文件查找路径
- [ ] 更新消息处理逻辑适配 ExtensionService（使用 `method` 字段推送事件）
- [ ] 在 `getWebviewContent` 中注入 VSCode API 脚本
- [ ] 实现初始内容加载策略（监听 webview 可见性）
- [ ] 测试所有编辑器功能（渲染、编辑、保存）
- [ ] 测试保存和加载功能
- [ ] 测试 VSCode 主题适配
- [ ] 测试缩放、拖拽等交互功能
- [ ] 测试 Java 进程渲染功能

## 八、实施顺序建议

1. **第一阶段：基础迁移**
   - 移动 JAR 文件
   - 复制核心库文件
   - 创建通信适配器
   - 创建基础 Vue 组件结构

2. **第二阶段：功能集成**
   - 集成 CodeMirror 编辑器
   - 实现基础交互功能
   - 实现消息通信

3. **第三阶段：完整功能**
   - 实现所有编辑功能
   - 样式适配
   - 错误处理
   - 更新后端 Provider

4. **第四阶段：测试优化**
   - 功能测试
   - 性能优化
   - 用户体验优化

## 九、后续优化

1. **TypeScript 化**：将 .js 文件逐步迁移为 .ts
2. **Composition API**：使用 Vue 3 Composition API 重构状态管理
3. **单元测试**：为组件添加单元测试
4. **性能监控**：添加性能监控和优化
5. **可访问性**：改善键盘导航和屏幕阅读器支持
6. **国际化**：支持多语言
7. **PlantUML 语法高亮**：为 CodeMirror 添加 PlantUML 语法高亮模式

## 十、风险评估

### 低风险
- ✅ 核心库迁移（纯 JS，无框架依赖）
- ✅ 样式迁移（CSS 文件，易于适配）
- ✅ JAR 文件移动（简单文件操作）

### 中风险
- ⚠️ CodeMirror 集成（需要确保版本兼容）
- ⚠️ 消息格式转换（需要确保前后端消息格式一致）

### 高风险
- ⚠️ Java 进程渲染（需要确保 JAR 文件路径正确）
- ⚠️ 路径处理（webview URI 转换可能有问题）
- ⚠️ 消息通信适配（需要确保前后端消息格式一致）

### 缓解措施
1. 充分测试消息通信
2. 添加详细的错误日志
3. 保留原有实现作为回退方案
4. 分阶段实施，每阶段充分测试
5. 确保 Java 运行时可用性检查
6. 添加 JAR 文件存在性检查
