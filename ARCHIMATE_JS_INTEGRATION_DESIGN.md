# ArchiMate-JS 集成设计方案

## 1. 概述

本方案旨在将 `archimate-js` 集成到当前插件中，支持创建、打开和编辑 ArchiMate 架构图工件。架构图文件使用 XML 格式存储，文件后缀为 `.xml.archimate`。

## 2. 架构设计

### 2.1 核心组件

```
┌─────────────────────────────────────────────────────────┐
│                    VS Code Extension                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │  File Type       │      │  Custom Editor       │    │
│  │  Registration    │─────▶│  Provider            │    │
│  │  (.xml.archimate)│      │  (ArchimateEditor)   │    │
│  └──────────────────┘      └──────────────────────┘    │
│                                    │                     │
│                                    ▼                     │
│                          ┌──────────────────────┐      │
│                          │  WebviewPanel        │      │
│                          │  (ArchimateViewer)   │      │
│                          └──────────────────────┘      │
│                                    │                     │
│                                    ▼                     │
│                          ┌──────────────────────┐      │
│                          │  archimate-js        │      │
│                          │  (Modeler/Renderer)  │      │
│                          └──────────────────────┘      │
│                                                           │
│  ┌──────────────────┐      ┌──────────────────────┐    │
│  │  Create Command  │      │  File I/O Service    │    │
│  │  (New Diagram)   │─────▶│  (XML Serialization) │    │
│  └──────────────────┘      └──────────────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 数据流

1. **文件创建流程**
   - 用户执行 `Create ArchiMate Diagram` 命令
   - 生成空的 ArchiMate XML 模板
   - 创建 `.xml.archimate` 文件
   - 打开自定义编辑器

2. **文件打开流程**
   - 用户打开 `.xml.archimate` 文件
   - VS Code 识别文件类型
   - 调用自定义编辑器提供者
   - 加载 XML 内容并传递给 archimate-js
   - 在 WebviewPanel 中渲染

3. **文件保存流程**
   - 用户在编辑器中修改架构图
   - archimate-js 生成模型变更
   - 通过消息传递将变更发送到扩展
   - 扩展将模型序列化为 XML
   - 保存到文件系统

## 3. 实现细节

### 3.1 文件类型注册

**位置**: `packages/plugin-core/package.json`

在 `contributes.languages` 中添加：

```json
{
  "id": "archimate",
  "extensions": [".xml.archimate"],
  "aliases": ["ArchiMate", "archimate"],
  "configuration": "./language-configuration-archimate.json"
}
```

在 `contributes.customEditors` 中添加：

```json
{
  "viewType": "architool.archimateEditor",
  "displayName": "ArchiMate Diagram",
  "selector": [
    {
      "filenamePattern": "*.xml.archimate"
    }
  ],
  "priority": "default"
}
```

### 3.2 自定义编辑器提供者

**文件**: `packages/plugin-core/src/editors/ArchimateEditorProvider.ts`

```typescript
export class ArchimateEditorProvider implements vscode.CustomTextEditorProvider {
  private static readonly viewType = 'architool.archimateEditor';
  
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new ArchimateEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      ArchimateEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return providerRegistration;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // 设置 webview 初始内容
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules'),
      ],
    };

    // 设置初始 HTML
    webviewPanel.webview.html = this.getHtmlForWebview(
      webviewPanel.webview,
      document
    );

    // 处理来自 webview 的消息
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'load':
          // 加载 XML 内容到 archimate-js
          break;
        case 'save':
          // 保存模型变更到文件
          await this.updateDocument(document, message.model);
          break;
        case 'error':
          vscode.window.showErrorMessage(message.error);
          break;
      }
    });

    // 监听文档变更
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          // 通知 webview 文档已更新
          webviewPanel.webview.postMessage({
            type: 'documentChanged',
            content: e.document.getText(),
          });
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    // 加载初始内容
    webviewPanel.webview.postMessage({
      type: 'load',
      content: document.getText(),
    });
  }

  private async updateDocument(
    document: vscode.TextDocument,
    model: any
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const xmlContent = this.serializeModelToXml(model);
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      xmlContent
    );
    await vscode.workspace.applyEdit(edit);
  }

  private serializeModelToXml(model: any): string {
    // 使用 archimate-js 的导出功能将模型序列化为 XML
    // 或使用自定义的 XML 序列化逻辑
    // TODO: 实现 XML 序列化
    return '';
  }

  private getHtmlForWebview(
    webview: vscode.Webview,
    document: vscode.TextDocument
  ): string {
    // 获取 archimate-js 的资源路径
    const archimateJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        'archimate-js',
        'dist',
        'archimate-js.js'
      )
    );

    const archimateCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        'node_modules',
        'archimate-js',
        'dist',
        'archimate-js.css'
      )
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ArchiMate Diagram Editor</title>
  <link rel="stylesheet" href="${archimateCssUri}">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #archimate-container {
      width: 100%;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="archimate-container"></div>
  <script src="${archimateJsUri}"></script>
  <script>
    const vscode = acquireVsCodeApi();
    let archimateModeler;

    // 初始化 archimate-js
    window.addEventListener('DOMContentLoaded', () => {
      const container = document.getElementById('archimate-container');
      // TODO: 根据 archimate-js API 初始化模型器
      // archimateModeler = new ArchimateModeler({ container });
    });

    // 监听来自扩展的消息
    window.addEventListener('message', (event) => {
      const message = event.data;
      switch (message.type) {
        case 'load':
          // 加载 XML 内容
          // archimateModeler.importXML(message.content);
          break;
        case 'documentChanged':
          // 处理外部文档变更
          break;
      }
    });

    // 监听模型变更并发送到扩展
    // archimateModeler.on('changed', (model) => {
    //   vscode.postMessage({
    //     type: 'save',
    //     model: model,
    //   });
    // });
  </script>
</body>
</html>`;
  }
}
```

### 3.3 创建架构图命令

**文件**: `packages/plugin-core/src/commands/CreateArchimateDiagram.ts`

```typescript
import { BasicCommand } from '../commands/base';
import { DENDRON_COMMANDS } from '../constants';
import * as vscode from 'vscode';
import { ExtensionProvider } from '../ExtensionProvider';
import { NoteUtils } from '@dendronhq/common-all';
import { VaultUtils } from '@dendronhq/common-all';

type CommandOpts = {
  fname?: string;
  vault?: DVault;
};

type CommandOutput = {
  uri: vscode.Uri;
};

export class CreateArchimateDiagramCommand extends BasicCommand<
  CommandOpts,
  CommandOutput
> {
  key = DENDRON_COMMANDS.CREATE_ARCHIMATE_DIAGRAM.key;

  async gatherInputs(): Promise<CommandOpts | undefined> {
    const ws = ExtensionProvider.getDWorkspace();
    const vaults = await ws.vaults;
    
    // 提示用户输入文件名
    const fname = await vscode.window.showInputBox({
      prompt: 'Enter diagram name',
      placeHolder: 'my-diagram',
      validateInput: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Diagram name cannot be empty';
        }
        // 验证文件名格式
        if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
          return 'Diagram name can only contain letters, numbers, underscores, and hyphens';
        }
        return null;
      },
    });

    if (!fname) {
      return;
    }

    // 选择 vault（如果有多个）
    let vault: DVault;
    if (vaults.length === 1) {
      vault = vaults[0];
    } else {
      const vaultPick = await vscode.window.showQuickPick(
        vaults.map((v) => ({
          label: VaultUtils.getName(v),
          vault: v,
        })),
        {
          placeHolder: 'Select vault',
        }
      );
      if (!vaultPick) {
        return;
      }
      vault = vaultPick.vault;
    }

    return { fname, vault };
  }

  async execute(opts: CommandOpts): Promise<CommandOutput> {
    const { fname, vault } = opts;
    const ws = ExtensionProvider.getDWorkspace();
    const wsRoot = ws.wsRoot;

    // 生成文件路径
    const vaultPath = VaultUtils.getRelPath(vault);
    const filePath = vscode.Uri.joinPath(
      wsRoot,
      vaultPath,
      `${fname}.xml.archimate`
    );

    // 创建空的 ArchiMate XML 模板
    const emptyXml = this.generateEmptyArchimateXml(fname);

    // 写入文件
    await vscode.workspace.fs.writeFile(
      filePath,
      Buffer.from(emptyXml, 'utf-8')
    );

    // 打开文件
    const doc = await vscode.workspace.openTextDocument(filePath);
    await vscode.window.showTextDocument(doc);

    return { uri: filePath };
  }

  private generateEmptyArchimateXml(name: string): string {
    // 生成符合 ArchiMate XML 规范的空白模板
    return `<?xml version="1.0" encoding="UTF-8"?>
<archimate:model xmlns:archimate="http://www.archimatetool.com/archimate"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xsi:schemaLocation="http://www.archimatetool.com/archimate http://www.archimatetool.com/archimate"
                 name="${name}"
                 id="${this.generateId()}"
                 version="3.1">
  <elements/>
  <relationships/>
  <organizations/>
  <propertyDefinitions/>
  <views/>
</archimate:model>`;
  }

  private generateId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 3.4 命令注册

**文件**: `packages/plugin-core/src/constants.ts`

在 `DENDRON_COMMANDS` 中添加：

```typescript
CREATE_ARCHIMATE_DIAGRAM: {
  key: "architool.createArchimateDiagram",
  title: `${CMD_PREFIX} Create ArchiMate Diagram`,
  when: `${DendronContext.PLUGIN_ACTIVE} && shellExecutionSupported`,
  icon: "$(graph)",
},
```

**文件**: `packages/plugin-core/src/commands/index.ts`

添加命令导入和注册：

```typescript
import { CreateArchimateDiagramCommand } from "./CreateArchimateDiagram";

const ALL_COMMANDS = [
  // ... existing commands
  CreateArchimateDiagramCommand,
] as CodeCommandConstructor[];
```

### 3.5 TreeView 创建菜单集成

为了在 TreeView 右键菜单的创建 note 弹窗中支持架构图类型，需要修改以下文件：

#### 3.5.1 添加常量

**文件**: `packages/plugin-core/src/components/lookup/constants.ts`

```typescript
export const CREATE_NEW_ARCHIMATE_DIAGRAM_LABEL = "Create New ArchiMate Diagram";
export const CREATE_NEW_ARCHIMATE_DIAGRAM_DETAIL = "ArchiMate diagram does not exist. Create?";
```

#### 3.5.2 添加创建架构图选项的工具方法

**文件**: `packages/plugin-core/src/components/lookup/NotePickerUtils.ts`

```typescript
static createNewArchimateDiagramItem({
  fname,
}: {
  fname: string;
}): NoteQuickInputV2 {
  const props = DNodeUtils.create({
    id: CREATE_NEW_ARCHIMATE_DIAGRAM_LABEL,
    fname,
    type: "note",
    // @ts-ignore
    vault: {},
  });
  return {
    ...props,
    label: CREATE_NEW_ARCHIMATE_DIAGRAM_LABEL,
    detail: CREATE_NEW_ARCHIMATE_DIAGRAM_DETAIL,
    alwaysShow: true,
    // 添加标识符，用于在 acceptNewItem 中识别
    custom: {
      isArchimateDiagram: true,
    },
  };
}
```

#### 3.5.3 在 NoteLookupProvider 中添加架构图选项

**文件**: `packages/plugin-core/src/components/lookup/NoteLookupProvider.ts`

在 `onUpdatePickerItems` 方法中，添加架构图选项：

```typescript
// 在添加 "Create New" 选项之后
if (shouldAddCreateNew) {
  const entryCreateNew = NotePickerUtils.createNoActiveItem({
    fname: queryOrig,
    detail: CREATE_NEW_NOTE_DETAIL,
  });
  const newItems = [entryCreateNew];

  // 添加 "Create New ArchiMate Diagram" 选项
  const entryCreateArchimateDiagram = NotePickerUtils.createNewArchimateDiagramItem({
    fname: queryOrig,
  });
  newItems.push(entryCreateArchimateDiagram);

  // should not add `Create New with Template` if the quickpick
  // 1. has an onCreate defined (i.e. task note), or
  const onCreateDefined = picker.onCreate !== undefined;

  const shouldAddCreateNewWithTemplate =
    this.opts.allowNewNoteWithTemplate && !onCreateDefined;
  if (shouldAddCreateNewWithTemplate) {
    const entryCreateNewWithTemplate =
      NotePickerUtils.createNewWithTemplateItem({
        fname: queryOrig,
      });
    newItems.push(entryCreateNewWithTemplate);
  }

  // ... 其余逻辑保持不变
}
```

#### 3.5.4 在 NoteLookupCommand 中处理架构图创建

**文件**: `packages/plugin-core/src/commands/NoteLookupCommand.ts`

修改 `acceptNewItem` 方法，检测是否为架构图选项：

```typescript
async acceptNewItem(
  item: NoteQuickInputV2
): Promise<OnDidAcceptReturn | undefined> {
  const ctx = "acceptNewItem";
  const picker = this.controller.quickPick;
  const fname = this.getFNameForNewItem(item);

  // 检查是否为架构图选项
  if (item.custom?.isArchimateDiagram) {
    // 调用创建架构图命令
    const createArchimateCmd = new CreateArchimateDiagramCommand();
    const result = await createArchimateCmd.execute({
      fname: fname.replace(/\.xml\.archimate$/, ''), // 移除扩展名（如果用户已输入）
      vault: await this.getVaultForNewNote({ fname, picker }),
    });
    
    if (result?.uri) {
      // 打开创建的架构图文件
      const doc = await vscode.workspace.openTextDocument(result.uri);
      await vscode.window.showTextDocument(doc);
    }
    return;
  }

  // 原有的创建普通 note 的逻辑
  const engine = ExtensionProvider.getEngine();
  let nodeNew: NoteProps;
  // ... 其余逻辑保持不变
}
```

#### 3.5.5 更新工具函数

**文件**: `packages/plugin-core/src/components/lookup/utils.ts`

添加检测架构图选项的工具函数：

```typescript
static isCreateNewArchimateDiagramPicked(
  node: NoteQuickInputV2
): boolean {
  return (
    node.label === CREATE_NEW_ARCHIMATE_DIAGRAM_LABEL ||
    node.custom?.isArchimateDiagram === true
  );
}
```

在 `PickerUtilsV2.getCreateNewItem` 中也需要考虑架构图选项。

### 3.6 扩展激活

**文件**: `packages/plugin-core/src/_extension.ts`

在 `activate` 函数中注册编辑器提供者：

```typescript
import { ArchimateEditorProvider } from './editors/ArchimateEditorProvider';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing activation code
  
  // 注册 ArchiMate 编辑器
  context.subscriptions.push(
    ArchimateEditorProvider.register(context)
  );
}
```

## 4. 依赖管理

### 4.1 安装 archimate-js

**文件**: `packages/plugin-core/package.json`

```json
{
  "dependencies": {
    "archimate-js": "^0.0.4"
  }
}
```

### 4.2 资源打包

需要确保 archimate-js 的资源文件（JS、CSS）在构建时被正确打包到扩展中。

**文件**: `packages/plugin-core/tsconfig.json` 或构建配置

确保 node_modules 中的 archimate-js 资源被复制到输出目录。

## 5. 文件结构

```
packages/plugin-core/
├── src/
│   ├── editors/
│   │   └── ArchimateEditorProvider.ts    # 自定义编辑器提供者
│   ├── commands/
│   │   └── CreateArchimateDiagram.ts     # 创建架构图命令
│   └── _extension.ts                     # 扩展激活（注册编辑器）
├── media/
│   └── archimate/                        # ArchiMate 相关资源（如需要）
└── package.json                          # 添加依赖和贡献点
```

## 6. 功能特性

### 6.1 核心功能

1. **创建架构图**
   - 通过命令创建新的 `.xml.archimate` 文件
   - 通过 TreeView 右键菜单的创建弹窗中选择 "Create New ArchiMate Diagram" 选项
   - 生成符合 ArchiMate 规范的空白 XML 模板

2. **打开和查看**
   - 双击 `.xml.archimate` 文件自动打开自定义编辑器
   - 使用 archimate-js 渲染架构图

3. **编辑架构图**
   - 在 WebviewPanel 中使用 archimate-js 的模型器功能
   - 支持拖拽、连接、属性编辑等操作

4. **持久化**
   - 自动保存模型变更到 XML 文件
   - 支持文件系统级别的版本控制

5. **TreeView 集成**
   - 在 TreeView 右键菜单的创建 note 弹窗中显示架构图选项
   - 用户可以直接从 TreeView 创建架构图，无需单独执行命令

### 6.2 扩展功能（可选）

1. **导入/导出**
   - 支持导入标准 ArchiMate XML 文件
   - 导出为图片（PNG/SVG）

2. **模板支持**
   - 提供常用架构图模板
   - 支持自定义模板

3. **集成到笔记系统**
   - 在 Markdown 笔记中引用架构图
   - 支持预览架构图

## 7. 技术考虑

### 7.1 archimate-js API 使用

需要根据 archimate-js 的实际 API 调整实现：

- 模型初始化方式
- XML 导入/导出方法
- 事件监听机制
- 模型变更检测

### 7.2 性能优化

- 大型架构图的加载性能
- Webview 内存管理
- 增量更新机制

### 7.3 错误处理

- XML 解析错误处理
- 模型验证
- 文件保存失败处理

### 7.4 用户体验

- 加载状态指示
- 错误提示
- 键盘快捷键支持
- 工具栏集成

## 8. 测试策略

1. **单元测试**
   - XML 序列化/反序列化
   - 命令执行逻辑
   - 编辑器提供者

2. **集成测试**
   - 文件创建和打开流程
   - Webview 消息传递
   - 文件保存流程

3. **端到端测试**
   - 完整的用户工作流
   - 多文件编辑场景

## 9. 实施步骤

1. **阶段 1: 基础集成**
   - 添加文件类型注册
   - 实现基本的自定义编辑器
   - 集成 archimate-js（仅查看模式）

2. **阶段 2: 创建功能**
   - 实现创建命令
   - 生成 XML 模板
   - 文件系统集成
   - **集成到 TreeView 创建菜单**（新增）
     - 添加架构图选项常量
     - 在 NoteLookupProvider 中添加架构图选项
     - 在 NoteLookupCommand 中处理架构图创建逻辑

3. **阶段 3: 编辑功能**
   - 启用 archimate-js 编辑功能
   - 实现模型变更检测
   - 实现保存机制

4. **阶段 4: 优化和扩展**
   - 性能优化
   - 错误处理完善
   - 用户体验改进
   - 可选功能实现

## 10. 参考资料

- [archimate-js GitHub](https://github.com/archimodel/archimate-js)
- [archimate-js-demo](https://github.com/archimodel/archimate-js-demo)
- [VS Code Custom Editors API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [ArchiMate Specification](https://www.opengroup.org/archimate)

