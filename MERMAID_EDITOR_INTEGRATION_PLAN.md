# Mermaid Editor 集成到 Webview 改造方案

## 一、可行性分析

### ✅ 可以集成

**理由：**
1. **技术栈兼容**：mermaid-editor 使用纯 JavaScript ES6 模块，可以轻松在 Vue 3 中使用
2. **通信方式统一**：两者都通过 VSCode API 通信，可以统一使用 `ExtensionService`
3. **依赖管理**：mermaid 和 codemirror 都可以通过 npm 安装到 webview 项目
4. **模块化设计**：mermaid-editor 的 lib 目录已经是模块化设计，便于集成

### 当前架构对比

| 项目 | 构建工具 | 框架 | 通信方式 | 入口 |
|------|---------|------|---------|------|
| mermaid-editor | Webpack | 纯 JS | vscodeApi.js | index-v2.html |
| webview | Vite | Vue 3 | ExtensionService.ts | *.html + *.vue |

## 二、改造方案

### 方案概述

将 mermaid-editor 的核心功能封装为 Vue 3 组件，集成到 webview 项目中，统一使用 Vite 构建和 ExtensionService 通信。

### 改造步骤

#### 步骤 1: 迁移核心库文件

**目标**：将 `packages/mermaid-editor/lib` 中的核心类迁移到 `apps/webview/src/lib/mermaid-editor/`

**操作**：
1. 创建目录结构：
   ```
   apps/webview/src/lib/mermaid-editor/
   ├── StateManager.js
   ├── MermaidRenderer.js
   ├── MermaidParser.js
   ├── MermaidCodeGenerator.js
   ├── MermaidInteractionLayer.js
   ├── MermaidLabelEditor.js
   ├── MermaidNodeAdder.js
   ├── MermaidNodeConnector.js
   ├── MermaidCodeEditor.js
   ├── types.js
   └── utils.js
   ```

2. 复制并适配文件：
   - 直接复制所有 `.js` 文件
   - 修改导入路径，使用 `ExtensionService` 替代 `vscodeApi.js`

#### 步骤 2: 创建通信适配器

**目标**：创建适配层，将 mermaid-editor 的通信方式统一到 ExtensionService

**文件**：`apps/webview/src/lib/mermaid-editor/vscodeApiAdapter.ts`

```typescript
import { extensionService } from '../../services/ExtensionService';

// 适配 fetchDiagram
export async function fetchDiagram() {
  return extensionService.call('fetchDiagram');
}

// 适配 saveDiagram
export async function saveDiagram(diagram: any) {
  return extensionService.call('saveDiagram', { diagram });
}

// 导出 VSCode API 状态
export const isVSCodeWebview = true;
export const vscode = null; // 不再直接使用，通过 ExtensionService
```

#### 步骤 3: 创建 Vue 组件

**目标**：创建 `MermaidEditor.vue` 组件封装编辑器功能

**文件**：`apps/webview/src/components/MermaidEditor.vue`

**组件结构**：
```vue
<template>
  <div class="mermaid-editor">
    <!-- 工作区布局 -->
    <div class="workspace" ref="workspaceRef">
      <!-- 图表面板 -->
      <div class="diagram-panel" ref="diagramPanelRef">
        <div class="diagram-container" ref="diagramContainerRef"></div>
        <!-- 缩放控制 -->
        <div class="zoom-controls">
          <button @click="zoomIn" :disabled="zoomDisabled.in">+</button>
          <button @click="zoomOut" :disabled="zoomDisabled.out">−</button>
          <button @click="zoomReset">⌂</button>
        </div>
      </div>
      <!-- 分隔条 -->
      <div 
        class="workspace-divider" 
        ref="dividerRef"
        @mousedown="startResize"
      ></div>
      <!-- 源代码面板 -->
      <div class="source-panel">
        <div class="panel-header">
          <span class="panel-title">源代码</span>
        </div>
        <textarea 
          ref="sourceEditorRef" 
          class="source-editor"
          spellcheck="false"
        ></textarea>
      </div>
    </div>
    <!-- 错误消息 -->
    <div v-if="error" class="error-message" role="alert">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import { MermaidEditorAppV2 } from '../lib/mermaid-editor/MermaidEditorAppV2';

const workspaceRef = ref<HTMLElement>();
const diagramPanelRef = ref<HTMLElement>();
const diagramContainerRef = ref<HTMLElement>();
const dividerRef = ref<HTMLElement>();
const sourceEditorRef = ref<HTMLTextAreaElement>();

const error = ref<string | null>(null);
const zoomDisabled = reactive({ in: false, out: false });

let editorApp: MermaidEditorAppV2 | null = null;

onMounted(() => {
  if (workspaceRef.value && diagramContainerRef.value && sourceEditorRef.value) {
    editorApp = new MermaidEditorAppV2({
      workspace: workspaceRef.value,
      diagramContainer: diagramContainerRef.value,
      sourceEditor: sourceEditorRef.value,
      diagramPanel: diagramPanelRef.value,
      divider: dividerRef.value,
    });
  }
});

onUnmounted(() => {
  editorApp?.destroy?.();
});

const zoomIn = () => editorApp?.zoomIn();
const zoomOut = () => editorApp?.zoomOut();
const zoomReset = () => editorApp?.zoomReset();

const startResize = (e: MouseEvent) => {
  editorApp?.startResize?.(e);
};
</script>

<style scoped>
@import '../styles/mermaid-editor.css';
</style>
```

#### 步骤 4: 创建编辑器主类（Vue 适配版）

**目标**：创建适配 Vue 的编辑器主类

**文件**：`apps/webview/src/lib/mermaid-editor/MermaidEditorAppV2.ts`

**关键改动**：
- 构造函数接收 DOM 元素引用而非通过 `getElementById` 获取
- 使用 `vscodeApiAdapter` 替代 `vscodeApi.js`
- 添加 `destroy` 方法用于清理资源

```typescript
import { StateManager } from './StateManager';
import { MermaidRenderer } from './MermaidRenderer';
import { MermaidInteractionLayer } from './MermaidInteractionLayer';
import { MermaidLabelEditor } from './MermaidLabelEditor';
import { MermaidNodeAdder } from './MermaidNodeAdder';
import { MermaidNodeConnector } from './MermaidNodeConnector';
import { MermaidCodeEditor } from './MermaidCodeEditor';
import { MermaidParser } from './MermaidParser';
import { MermaidCodeGenerator } from './MermaidCodeGenerator';
import {
  fetchDiagram,
  saveDiagram,
  isVSCodeWebview,
} from './vscodeApiAdapter';

interface EditorElements {
  workspace: HTMLElement;
  diagramPanel: HTMLElement | null;
  diagramContainer: HTMLElement;
  sourceEditor: HTMLTextAreaElement;
  divider: HTMLElement | null;
}

export class MermaidEditorAppV2 {
  private stateManager: StateManager;
  private renderer: MermaidRenderer | null = null;
  private interactionLayer: MermaidInteractionLayer | null = null;
  private labelEditor: MermaidLabelEditor | null = null;
  private nodeAdder: MermaidNodeAdder | null = null;
  private nodeConnector: MermaidNodeConnector | null = null;
  private codeEditor: MermaidCodeEditor | null = null;
  private parser: MermaidParser;
  private codeGenerator: MermaidCodeGenerator;
  
  private elements: EditorElements;
  private saveTimer: NodeJS.Timeout | null = null;
  private isSaving = false;
  private selectedNodeId: string | null = null;
  private selectedEdgeIndex: number | null = null;

  constructor(elements: EditorElements) {
    this.elements = elements;
    this.stateManager = new StateManager();
    this.parser = new MermaidParser();
    this.codeGenerator = new MermaidCodeGenerator();
    this.init();
  }

  async init() {
    // 初始化各个组件...
    // 与原版逻辑相同，但使用 this.elements 获取 DOM 元素
  }

  destroy() {
    // 清理资源
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    // 移除事件监听器等
  }

  zoomIn() {
    this.renderer?.zoomIn();
  }

  zoomOut() {
    this.renderer?.zoomOut();
  }

  zoomReset() {
    this.renderer?.zoomReset();
  }

  startResize(e: MouseEvent) {
    // 处理分隔条拖拽
  }
}
```

#### 步骤 5: 创建 HTML 入口页面

**目标**：创建 mermaid-editor 的 HTML 入口

**文件**：`apps/webview/mermaid-editor.html`

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mermaid Diagram Editor</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/mermaid-editor-main.ts"></script>
</body>
</html>
```

#### 步骤 6: 创建入口脚本

**文件**：`apps/webview/src/mermaid-editor-main.ts`

```typescript
import { createApp } from 'vue';
import MermaidEditorPage from './MermaidEditorPage.vue';
import './styles/vscode-theme.css';

const app = createApp(MermaidEditorPage);
app.mount('#app');
```

#### 步骤 7: 创建页面组件

**文件**：`apps/webview/src/MermaidEditorPage.vue`

```vue
<template>
  <div id="mermaid-editor-page">
    <MermaidEditor />
  </div>
</template>

<script setup lang="ts">
import MermaidEditor from './components/MermaidEditor.vue';
</script>

<style>
#mermaid-editor-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background, #1e1e1e);
  overflow: hidden;
}
</style>
```

#### 步骤 8: 更新 Vite 配置

**文件**：`apps/webview/vite.config.ts`

**改动**：添加 mermaid-editor.html 到构建入口

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        'create-file-dialog': resolve(__dirname, 'create-file-dialog.html'),
        'create-folder-dialog': resolve(__dirname, 'create-folder-dialog.html'),
        'create-design-dialog': resolve(__dirname, 'create-design-dialog.html'),
        'edit-relations-dialog': resolve(__dirname, 'edit-relations-dialog.html'),
        'mermaid-editor': resolve(__dirname, 'mermaid-editor.html'), // 新增
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        format: 'es',
      },
    },
  },
  server: {
    port: 3000,
  },
});
```

#### 步骤 9: 安装依赖

**文件**：`apps/webview/package.json`

**添加依赖**：
```json
{
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.2",
    "element-plus": "^2.11.8",
    "pinia": "^2.1.7",
    "vue": "^3.4.0",
    "mermaid": "^11.0.0",
    "codemirror": "^5.65.16"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vue-tsc": "^1.8.27",
    "@types/codemirror": "^5.60.5"
  }
}
```

#### 步骤 10: 更新 MermaidEditorProvider

**目标**：修改扩展中的 MermaidEditorProvider 使用新的 webview

**文件**：`apps/extension/src/modules/editor/mermaid/MermaidEditorProvider.ts`

**关键改动**：

1. 修改 `getWebviewContent` 方法：
```typescript
private getWebviewContent(
  webview: vscode.Webview,
  document: vscode.TextDocument,
  extensionUri: vscode.Uri
): string {
  // 获取 webview 构建产物路径
  const webviewPath = path.join(this.context.extensionPath, 'dist', 'webview');
  const mermaidEditorHtmlPath = path.join(webviewPath, 'mermaid-editor.html');
  
  if (!fs.existsSync(mermaidEditorHtmlPath)) {
    throw new Error(`Mermaid editor HTML not found: ${mermaidEditorHtmlPath}`);
  }
  
  let htmlContent = fs.readFileSync(mermaidEditorHtmlPath, 'utf-8');
  
  // 转换资源路径为 webview URI
  const webviewUri = (relativePath: string) => {
    const uri = vscode.Uri.joinPath(
      vscode.Uri.file(webviewPath),
      relativePath
    );
    return webview.asWebviewUri(uri).toString();
  };
  
  // 替换所有资源路径
  htmlContent = htmlContent.replace(
    /<script[^>]*src=["']([^"']+)["'][^>]*>/gi,
    (match, src) => {
      if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('vscode-webview://')) {
        return match;
      }
      return match.replace(src, webviewUri(src));
    }
  );
  
  htmlContent = htmlContent.replace(
    /<link[^>]*href=["']([^"']+)["'][^>]*>/gi,
    (match, href) => {
      if (href.startsWith('http') || href.startsWith('data:') || href.startsWith('vscode-webview://')) {
        return match;
      }
      return match.replace(href, webviewUri(href));
    }
  );
  
  return htmlContent;
}
```

2. 更新消息处理逻辑：
```typescript
private setupMessageHandler(
  webviewPanel: vscode.WebviewPanel,
  document: vscode.TextDocument
) {
  webviewPanel.webview.onDidReceiveMessage(async (message) => {
    try {
      // 使用 ExtensionService 的消息格式
      if (message.method === 'fetchDiagram') {
        const source = document.getText();
        const diagram = {
          source,
          uri: document.uri.toString(),
        };
        
        webviewPanel.webview.postMessage({
          id: message.id,
          method: message.method,
          result: diagram,
        });
      } else if (message.method === 'saveDiagram') {
        const { diagram } = message.params || {};
        if (diagram?.source) {
          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            diagram.source
          );
          await vscode.workspace.applyEdit(edit);
          await document.save();
          
          webviewPanel.webview.postMessage({
            id: message.id,
            method: message.method,
            result: { success: true },
          });
        }
      }
    } catch (error) {
      console.error('Message handler error:', error);
      webviewPanel.webview.postMessage({
        id: message.id,
        error: {
          code: -1,
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  });
}
```

#### 步骤 11: 样式迁移

**目标**：将 mermaid-editor 的样式集成到 Vue 组件

**操作**：
1. 复制 `packages/mermaid-editor/app/styles.css` 到 `apps/webview/src/styles/mermaid-editor.css`
2. 适配 VSCode 主题变量：

```css
/* 在 mermaid-editor.css 开头添加 */
:root {
  --mermaid-bg: var(--vscode-editor-background, #ffffff);
  --mermaid-text: var(--vscode-editor-foreground, #000000);
  --mermaid-border: var(--vscode-panel-border, #e9ecef);
  --mermaid-panel-bg: var(--vscode-sideBar-background, #f8f9fa);
}

.app {
  background: var(--mermaid-bg);
  color: var(--mermaid-text);
}

/* 其他样式保持不变，但使用 CSS 变量 */
```

## 三、技术细节

### 3.1 状态管理

**方案**：使用 Vue 3 Composition API + 原有的 StateManager

```typescript
import { ref, reactive, watch } from 'vue';
import { StateManager } from '../lib/mermaid-editor/StateManager';

const stateManager = new StateManager();
const error = ref<string | null>(null);
const loading = ref(false);

stateManager.subscribe((state) => {
  error.value = state.error;
  loading.value = state.loading;
  // 其他状态同步
});
```

### 3.2 CodeMirror 集成

**方案**：在 Vue 组件中动态加载 CodeMirror

```typescript
import { onMounted, ref, onUnmounted } from 'vue';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/default.css';

const sourceEditorRef = ref<HTMLTextAreaElement>();
let codeMirrorInstance: CodeMirror.Editor | null = null;

onMounted(() => {
  if (sourceEditorRef.value) {
    codeMirrorInstance = CodeMirror.fromTextArea(sourceEditorRef.value, {
      mode: 'mermaid',
      theme: 'default',
      lineNumbers: true,
      lineWrapping: true,
      indentUnit: 2,
      tabSize: 2,
    });
    
    codeMirrorInstance.on('change', (cm) => {
      // 处理变化
    });
  }
});

onUnmounted(() => {
  if (codeMirrorInstance) {
    codeMirrorInstance.toTextArea();
    codeMirrorInstance = null;
  }
});
```

### 3.3 Mermaid 初始化

**方案**：在组件挂载时初始化 Mermaid

```typescript
import mermaid from 'mermaid';
import { onMounted } from 'vue';

onMounted(async () => {
  await mermaid.initialize({ 
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
    },
  });
});
```

### 3.4 消息通信适配

**ExtensionService 消息格式**：
```typescript
// 发送
await extensionService.call('fetchDiagram');
await extensionService.call('saveDiagram', { diagram });

// 接收（在 ExtensionService 中已处理）
```

**MermaidEditorProvider 需要适配**：
```typescript
// 接收消息
webviewPanel.webview.onDidReceiveMessage(async (message) => {
  if (message.method === 'fetchDiagram') {
    const source = document.getText();
    webviewPanel.webview.postMessage({
      id: message.id,
      result: { source, uri: document.uri.toString() },
    });
  } else if (message.method === 'saveDiagram') {
    const { diagram } = message.params || {};
    // 保存逻辑...
    webviewPanel.webview.postMessage({
      id: message.id,
      result: { success: true },
    });
  }
});
```

## 四、文件结构

### 改造后的目录结构

```
apps/webview/
├── mermaid-editor.html                    # 新增：HTML 入口
├── src/
│   ├── mermaid-editor-main.ts             # 新增：入口脚本
│   ├── MermaidEditorPage.vue              # 新增：页面组件
│   ├── components/
│   │   └── MermaidEditor.vue             # 新增：编辑器组件
│   ├── lib/
│   │   └── mermaid-editor/               # 新增：核心库
│   │       ├── StateManager.js
│   │       ├── MermaidRenderer.js
│   │       ├── MermaidParser.js
│   │       ├── MermaidCodeGenerator.js
│   │       ├── MermaidInteractionLayer.js
│   │       ├── MermaidLabelEditor.js
│   │       ├── MermaidNodeAdder.js
│   │       ├── MermaidNodeConnector.js
│   │       ├── MermaidCodeEditor.js
│   │       ├── MermaidEditorAppV2.ts     # 新增：Vue 适配版
│   │       ├── vscodeApiAdapter.ts        # 新增：通信适配器
│   │       ├── types.js
│   │       └── utils.js
│   ├── services/
│   │   └── ExtensionService.ts           # 已有：统一通信服务
│   └── styles/
│       └── mermaid-editor.css            # 新增：编辑器样式
└── vite.config.ts                         # 修改：添加构建入口
```

## 五、优势

1. **统一构建**：所有 webview 使用同一个 Vite 构建系统
2. **代码复用**：ExtensionService 统一管理通信
3. **类型安全**：TypeScript 支持更好
4. **维护性**：减少重复代码，统一技术栈
5. **开发体验**：Vue DevTools 支持，热重载
6. **性能优化**：Vite 的快速构建和 HMR

## 六、注意事项

1. **依赖版本**：确保 mermaid 和 codemirror 版本兼容
2. **样式隔离**：使用 scoped 样式或 CSS 模块避免冲突
3. **性能优化**：大文件编辑时注意防抖和虚拟滚动
4. **错误处理**：统一错误处理机制
5. **向后兼容**：确保现有功能不受影响
6. **路径处理**：webview 中的资源路径需要正确转换为 webview URI
7. **消息格式**：确保 ExtensionService 的消息格式与后端一致

## 七、迁移检查清单

- [ ] 复制 lib 目录所有文件到 webview
- [ ] 创建 vscodeApiAdapter.ts 适配 ExtensionService
- [ ] 创建 MermaidEditor.vue 组件
- [ ] 创建 MermaidEditorPage.vue 页面
- [ ] 创建 mermaid-editor.html 入口
- [ ] 创建 mermaid-editor-main.ts 入口脚本
- [ ] 更新 vite.config.ts 添加构建入口
- [ ] 安装 mermaid 和 codemirror 依赖
- [ ] 迁移样式文件并适配 VSCode 主题
- [ ] 更新 MermaidEditorProvider 使用新入口
- [ ] 更新消息处理逻辑适配 ExtensionService
- [ ] 测试所有编辑器功能（渲染、编辑、保存）
- [ ] 测试保存和加载功能
- [ ] 测试 VSCode 主题适配
- [ ] 测试缩放、拖拽等交互功能

## 八、实施顺序建议

1. **第一阶段：基础迁移**
   - 复制核心库文件
   - 创建通信适配器
   - 创建基础 Vue 组件结构

2. **第二阶段：功能集成**
   - 集成 Mermaid 渲染
   - 集成 CodeMirror 编辑器
   - 实现基础交互功能

3. **第三阶段：完整功能**
   - 实现所有编辑功能
   - 样式适配
   - 错误处理

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
7. **插件系统**：支持自定义插件扩展功能

## 十、风险评估

### 低风险
- ✅ 核心库迁移（纯 JS，无框架依赖）
- ✅ 样式迁移（CSS 文件，易于适配）

### 中风险
- ⚠️ CodeMirror 集成（需要确保版本兼容）
- ⚠️ Mermaid 初始化（需要确保配置正确）

### 高风险
- ⚠️ 消息通信适配（需要确保前后端消息格式一致）
- ⚠️ 路径处理（webview URI 转换可能有问题）

### 缓解措施
1. 充分测试消息通信
2. 添加详细的错误日志
3. 保留原有实现作为回退方案
4. 分阶段实施，每阶段充分测试

