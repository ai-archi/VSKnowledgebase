# 视点视图移至 Panel 区实施方案（Webview 实现）

## 一、方案概述

### 1.1 目标
将视点视图（Viewpoints）和任务视图（Tasks）合并，从资源管理器侧边栏（explorer）移至底部面板区域（panel），使用 Webview 技术实现，提供现代化的 UI 和丰富的交互体验。

**视点视图主要解决两个核心问题：**
1. **当前代码关联的文件/设计图等**：展示与当前代码文件相关的文档、设计图等 Artifact
2. **当前任务及流程化任务执行**：管理任务并支持结合 AI 的流程化任务执行，包括：
   - **起草提案**：明确需求，AI 询问关键问题
   - **审查对齐**：人和 AI 共同审查，反复迭代
   - **实现任务**：AI 按批准的规范写代码
   - **归档更新**：变更归档，规范文档自动更新

### 1.2 技术选型
- **前端框架**：Vue 3 + Element Plus + Pinia
- **布局方式**：关联文件区 + 左右分栏（任务列表 + 流程可视化）
- **流程图库**：JointJS+（参考 [Chatbot Demo](https://www.jointjs.com/demos/chatbot)）
- **通信方式**：VS Code Webview RPC
- **主题适配**：VS Code 主题变量
- **AI 集成**：集成 AI 服务支持流程化任务执行

### 1.3 当前状态
- **位置**：资源管理器侧边栏（explorer）
- **实现方式**：VS Code TreeView API
- **视图ID**：
  - `architool.viewpointView`（视点视图）
  - `architool.taskView`（任务视图，将合并到视点视图）
- **数据提供者**：
  - `ViewpointTreeDataProvider`
  - `TaskTreeDataProvider`（将合并）

### 1.4 架构设计

```
Extension (TypeScript)
    ↓ RPC通信 (ExtensionService)
Webview (Vue 3 + Element Plus + JointJS+)
    ├── ViewpointPanelPage (主页面)
    ├── RelatedFiles (关联文件列表)
    ├── TaskList (任务列表，左侧)
    └── TaskWorkflowDiagram (任务流程可视化，JointJS，右侧)
        └── TaskStepDetail (步骤详情弹窗)
```

## 二、文件结构

### 2.1 新增文件

```
apps/webview/
├── viewpoint-panel.html                    # HTML 入口文件
└── src/
    ├── viewpoint-panel-main.ts              # 入口文件
    ├── ViewpointPanelPage.vue               # 主页面组件
    ├── types.ts                             # 类型定义
    └── components/
        ├── RelatedFiles.vue                 # 关联文件列表组件
        ├── TaskList.vue                     # 任务列表组件（左侧）
        ├── TaskWorkflowDiagram.vue          # 任务流程可视化组件（JointJS，右侧）
        └── TaskStepDetail.vue               # 任务步骤详情弹窗
```

### 2.2 修改文件

```
apps/extension/
├── package.json                             # 移除 taskView，更新视图配置
└── src/
    ├── main.ts                              # 移除 TaskTreeView，注册合并后的 Webview 视图
    └── modules/viewpoint/interface/
        └── Commands.ts                      # 添加 Webview 支持，集成任务和 AI 功能
```

## 三、布局设计

### 3.1 整体布局（合并视图）

采用统一的布局设计，将代码关联、任务列表和任务流程整合在一个视图中：

```
┌─────────────────────────────────────────────────────────┐
│  关联文件 (Related Files)                                │
│  文件1.md 文件2.puml 文件3.puml ...                      │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌────────────────────────────┐ │
│  │ 当前任务 (Tasks) │  │  任务流程详情 (Workflow)    │ │
│  │                  │  │                            │ │
│  │ [当前任务]        │  │  ┌──────────────────────┐  │ │
│  │ 任务2             │  │  │  起草提案            │  │ │
│  │ 任务3             │  │  │      ↓               │  │ │
│  │ ...               │  │  │  审查对齐            │  │ │
│  │                   │  │  │      ↓               │  │ │
│  │                   │  │  │  实现任务            │  │ │
│  │                   │  │  │      ↓               │  │ │
│  │                   │  │  │  归档更新            │  │ │
│  │                   │  │  └──────────────────────┘  │ │
│  │                   │  │  (JointJS 流程图)          │ │
│  └──────────────────┘  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**布局说明**：
- **关联文件区**：显示与当前代码相关的文档/设计图（水平滚动列表）
- **左侧任务列表**：显示当前任务列表，支持选择任务
- **右侧任务流程**：使用 JointJS 实现的可视化流程图，展示选中任务的流程步骤和状态

### 3.2 JointJS 集成

参考 [JointJS Chatbot Demo](https://www.jointjs.com/demos/chatbot)，使用 JointJS+ 实现任务流程可视化：

**使用的 JointJS 插件**：
- **PaperScroller**：管理滚动、平移、居中
- **Stencil**：拖放元素到流程图
- **CommandManager**：撤销/重做功能
- **Tooltip**：显示步骤信息
- **Keyboard**：键盘快捷键

**流程节点类型**：
- 起草提案节点
- 审查对齐节点
- 实现任务节点
- 归档更新节点
- 连接线（表示流程顺序）

### 3.2 主页面组件实现

#### 3.2.1 ViewpointPanelPage.vue

主页面组件，采用统一布局：

**布局结构**：
- **关联文件区**：水平滚动显示相关文件列表（文件卡片）
- **左右分栏**：
  - **左侧**：任务列表（TaskList）
  - **右侧**：任务流程可视化（TaskWorkflowDiagram，使用 JointJS）

**关键功能**：
- 动态加载视点数据（懒加载）
- 响应式更新（监听文件变更）
- 任务选择和创建
- 任务流程可视化交互（JointJS）

### 3.3 组件实现

#### 3.3.1 RelatedFiles.vue
- **功能**：水平滚动显示关联文件列表
- **Props**：`files`（文件列表，包含文档和设计图）、`loading`（加载状态）
- **Events**：`open`（打开文件）
- **显示方式**：文件卡片，显示文件名、类型图标、预览图（可选）

#### 3.3.2 TaskList.vue（左侧）
- **功能**：显示任务列表，支持选择、创建、状态更新
- **Props**：`tasks`（任务列表）、`loading`（加载状态）、`selectedTaskId`（当前选中任务）
- **Events**：`select`（选择任务）、`create`（创建任务）
- **布局**：垂直列表，每个任务显示标题、状态、优先级

#### 3.3.3 TaskWorkflowDiagram.vue（右侧，JointJS）
- **功能**：使用 JointJS 可视化任务流程
- **Props**：`task`（当前选中的任务对象）、`workflowData`（流程数据）
- **Events**：`step-click`（点击流程节点）、`step-update`（更新步骤状态）
- **实现**：
  - 使用 JointJS+ 创建流程图
  - 四个流程节点：起草提案 → 审查对齐 → 实现任务 → 归档更新
  - 节点状态可视化（待处理/进行中/已完成）
  - 支持节点点击查看详情
  - 使用 PaperScroller 管理滚动和平移
  - 使用 Tooltip 显示节点信息
  - 参考 [JointJS Chatbot Demo](https://www.jointjs.com/demos/chatbot) 的实现方式

#### 3.3.4 TaskStepDetail.vue
- **功能**：显示任务步骤详情（弹窗或侧边面板）
- **Props**：`step`（步骤对象）、`stepType`（步骤类型）
- **Events**：`close`（关闭）、`save`（保存步骤数据）
- **步骤类型**：
  - **起草提案**：AI 生成问题 → 用户回答 → 生成提案
  - **审查对齐**：展示提案 → 收集反馈 → 迭代修改
  - **实现任务**：根据规范生成代码
  - **归档更新**：更新相关文档和规范

## 四、后端实现

### 4.1 修改 ViewpointCommands.ts

**关键方法**：

1. **openViewpointPanel()**：创建并打开 Webview 面板
2. **handleWebviewMessage()**：处理来自 Webview 的 RPC 消息

**RPC 方法列表**：
- `getViewpoints`：获取所有视点
- `getArtifactsByViewpoint`：根据视点获取文档
- `getCodePathsByViewpoint`：根据视点获取代码路径
- `getTasks`：获取任务列表
- `createTask` / `updateTask` / `deleteTask`：任务 CRUD
- `generateDraftQuestions`：生成起草提案的问题
- `generateProposal`：生成提案
- `reviewProposal`：审查提案
- `implementTask`：实现任务
- `archiveUpdate`：归档更新
- `openArtifact` / `openFile`：打开文档/文件

**依赖注入**：
- `ViewpointApplicationService`：视点服务
- `TaskApplicationService`：任务服务
- `AIApplicationService`：AI 服务
- `VaultApplicationService`、`ArtifactApplicationService`：其他服务

### 4.2 修改 main.ts

在 `main.ts` 中初始化 ViewpointCommands，注入所需服务（包括 TaskService 和 AIService），注册命令。不再创建 TreeView，改为通过命令打开 Webview。

## 五、前端入口文件

### 5.1 viewpoint-panel.html
标准的 HTML 入口文件，包含 `<div id="app">` 和 Vue 入口脚本引用。

### 5.2 viewpoint-panel-main.ts
Vue 应用入口，初始化 Vue 3、Pinia、Element Plus，注册图标，挂载 ViewpointPanelPage 组件。

### 5.3 types.ts（类型定义）

```typescript
export interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  type: 'tag' | 'code-related' | 'task';
  requiredTags?: string[];
  optionalTags?: string[];
  excludedTags?: string[];
  codeRelatedConfig?: {
    mode: 'forward' | 'reverse';
    currentFilePath?: string;
  };
  isPredefined: boolean;
  isDefault?: boolean;
}

export interface Artifact {
  id: string;
  title: string;
  path: string;
  contentLocation: string;
  vault: {
    id: string;
    name: string;
  };
  tags?: string[];
  viewType?: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | string;
  artifactId: string;
  artifactPath: string;
  vaultId: string;
  workflowStep?: string;
  workflowData?: any;
  createdAt?: Date | string;
}

export interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  type: 'tag' | 'code-related' | 'task';
  requiredTags?: string[];
  optionalTags?: string[];
  excludedTags?: string[];
  codeRelatedConfig?: {
    mode: 'forward' | 'reverse';
    currentFilePath?: string;
  };
  isPredefined: boolean;
  isDefault?: boolean;
}
```

## 六、package.json 配置

### 6.1 修改 views 配置

```json
{
  "contributes": {
    "views": {
      "explorer": [
        {
          "id": "architool.documentView",
          "name": "Documents",
          "when": "true"
        },
        {
          "id": "architool.assistantsView",
          "name": "Assistants",
          "when": "true"
        }
      ],
      "panel": [
        {
          "id": "architool.viewpointView",
          "name": "Viewpoints",
          "when": "true"
        }
      ]
    },
    "commands": [
      {
        "command": "archi.viewpoint.openPanel",
        "title": "Open Viewpoints Panel",
        "icon": "$(list-unordered)"
      }
    ]
  }
}
```

## 七、实施步骤

### 7.1 创建前端文件

1. 创建 `apps/webview/viewpoint-panel.html`
2. 创建 `apps/webview/src/viewpoint-panel-main.ts`
3. 创建 `apps/webview/src/ViewpointPanelPage.vue`
4. 创建 `apps/webview/src/components/RelatedFiles.vue`
5. 创建 `apps/webview/src/components/TaskList.vue`
6. 创建 `apps/webview/src/components/TaskWorkflowDiagram.vue`（集成 JointJS+）
7. 创建 `apps/webview/src/components/TaskStepDetail.vue`
8. 创建 `apps/webview/src/types.ts`
9. 安装 JointJS+ 依赖：`pnpm add @clientio/rappid`

### 7.2 修改后端代码

1. 修改 `apps/extension/src/modules/viewpoint/interface/Commands.ts`
   - 添加 `openViewpointPanel` 方法
   - 添加 RPC 方法处理
   - 添加 `getWebviewContent` 方法

2. 修改 `apps/extension/src/main.ts`
   - 更新视点命令的初始化

3. 修改 `apps/extension/package.json`
   - 将视图移至 `panel`
   - 添加打开面板的命令

### 7.3 构建和测试

1. 构建 Webview：
   ```bash
   cd apps/webview
   pnpm build
   ```

2. 编译 Extension：
   ```bash
   cd apps/extension
   pnpm compile
   ```

3. 测试验证：
   - 重新加载 VS Code 窗口
   - 验证视点视图出现在底部面板
   - 测试所有功能（选择视点、打开文档、代码路径等）
   - 测试文件变更自动刷新

## 八、注意事项

### 8.1 Panel 区域特性
- Panel 区域默认是折叠的，用户需要手动展开
- Panel 区域通常高度有限，标签页式布局更适合
- Panel 区域可以调整大小，但最小高度有限制

### 8.2 性能优化
- 使用懒加载，只在选择任务时加载流程数据
- JointJS 使用虚拟渲染（PaperScroller）
- 缓存已加载的视点数据和任务流程
- 关联文件列表使用虚拟滚动（如果文件数量很大）

### 8.3 用户体验
- 提供加载状态提示
- 处理错误情况（网络错误、文件不存在等）
- 支持键盘快捷键（如 Ctrl+R 刷新）

### 8.4 兼容性
- 确保所有现有功能在新实现中正常工作
- 测试文件监听和自动刷新功能
- 验证主题适配（深色/浅色模式）

## 九、后续优化建议

1. **搜索功能**：在关联文件区或任务列表添加搜索框，支持快速筛选
2. **排序功能**：支持按名称、日期、类型等排序
3. **批量操作**：支持批量打开、导出等操作
4. **状态持久化**：记住用户的展开/折叠状态和选中的视点
5. **性能监控**：添加性能监控，优化大数据量场景
