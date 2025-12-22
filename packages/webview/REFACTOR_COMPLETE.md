# Webview HTML 统一重构完成报告

## 实施完成 ✅

### 已完成的工作

#### 1. 前端改造 ✅

- ✅ **更新 `src/main.ts`**
  - 支持从 `window.initialData.view` 获取视图名称（优先级最高）
  - 支持从 URL 参数获取：`?view=viewpoint-panel`
  - 支持从文件名提取：`viewpoint-panel.html` → `viewpoint-panel`
  - 支持从 Hash 获取：`#viewpoint-panel`

- ✅ **更新 `vite.config.ts`**
  - 改为单入口构建，只构建 `index.html`
  - 移除了多入口配置和自动生成HTML文件的逻辑
  - 保留了代码分割优化配置

#### 2. 后端改造 ✅

- ✅ **BaseFileTreeCommands.ts**
  - `create-file-dialog` → 使用 `index.html` + `view: 'create-file-dialog'`
  - `create-folder-dialog` → 使用 `index.html` + `view: 'create-folder-dialog'`
  - `create-design-dialog` → 使用 `index.html` + `view: 'create-design-dialog'`
  - 更新错误处理，支持从 `additionalData.view` 获取视图名称

- ✅ **DocumentCommands.ts**
  - `edit-relations-dialog` → 使用 `index.html` + `view: 'edit-relations-dialog'`

- ✅ **ViewpointWebviewViewProvider.ts**
  - `viewpoint-panel` → 使用 `index.html` + 注入 `view: 'viewpoint-panel'`
  - `create-task-dialog` → 使用 `index.html` + `view: 'create-task-dialog'`

- ✅ **PlantUMLEditorProvider.ts**
  - `plantuml-editor` → 使用 `index.html` + 注入 `view: 'plantuml-editor'`

- ✅ **MermaidEditorProvider.ts**
  - `mermaid-editor` → 使用 `index.html` + 注入 `view: 'mermaid-editor'`

### 视图映射表

| 视图名称 | 后端注入方式 | 状态 |
|---------|------------|------|
| `viewpoint-panel` | `window.initialData.view` | ✅ |
| `create-task-dialog` | `window.initialData.view` | ✅ |
| `create-file-dialog` | `additionalData.view` | ✅ |
| `create-folder-dialog` | `additionalData.view` | ✅ |
| `create-design-dialog` | `additionalData.view` | ✅ |
| `edit-relations-dialog` | `additionalData.view` | ✅ |
| `mermaid-editor` | `window.initialData.view` | ✅ |
| `plantuml-editor` | `window.initialData.view` | ✅ |

### 文件变更

#### 新增文件
- `packages/webview/src/views/index.ts` - 视图注册表
- `packages/webview/src/app.ts` - Vue应用配置
- `packages/webview/index.html` - 统一HTML入口

#### 修改文件
- `packages/webview/src/main.ts` - 支持多种视图识别方式
- `packages/webview/vite.config.ts` - 单入口构建配置
- `extension/architool/src/modules/shared/interface/commands/BaseFileTreeCommands.ts`
- `extension/architool/src/views/ViewpointWebviewViewProvider.ts`
- `extension/architool/src/commands/DocumentCommands.ts`
- `extension/architool/src/modules/editor/plantuml/PlantUMLEditorProvider.ts`
- `extension/architool/src/modules/editor/mermaid/MermaidEditorProvider.ts`

#### 可删除文件（可选）
以下HTML文件现在不再需要，但可以保留作为备份：
- `viewpoint-panel.html`
- `create-task-dialog.html`
- `create-file-dialog.html`
- `create-folder-dialog.html`
- `create-design-dialog.html`
- `edit-relations-dialog.html`
- `mermaid-editor.html`
- `plantuml-editor.html`
- `solution-editor.html`

以下main.ts文件也不再需要：
- `src/viewpoint-panel-main.ts`
- `src/create-task-dialog-main.ts`
- `src/create-file-dialog-main.ts`
- `src/create-folder-dialog-main.ts`
- `src/create-design-dialog-main.ts`
- `src/edit-relations-dialog-main.ts`
- `src/mermaid-editor-main.ts`
- `src/plantuml-editor-main.ts`
- `src/solution-editor-main.ts`

### 下一步

1. **构建测试**
   ```bash
   cd packages/webview
   pnpm build
   ```

2. **验证所有视图**
   - [ ] 测试 viewpoint-panel
   - [ ] 测试 create-task-dialog
   - [ ] 测试 create-file-dialog
   - [ ] 测试 create-folder-dialog
   - [ ] 测试 create-design-dialog
   - [ ] 测试 edit-relations-dialog
   - [ ] 测试 mermaid-editor
   - [ ] 测试 plantuml-editor

3. **清理旧文件**（可选）
   - 删除旧的HTML文件
   - 删除旧的main.ts文件

### 优势

✅ **工程化**：统一入口，减少重复代码  
✅ **可维护性**：视图集中管理，易于扩展  
✅ **性能优化**：代码分割，共享公共依赖  
✅ **类型安全**：TypeScript 支持  
✅ **开发体验**：热重载，快速开发  
✅ **简化构建**：只需构建一个HTML文件

### 注意事项

- 所有视图现在都使用 `index.html` 作为入口
- 视图名称通过 `window.initialData.view` 或 `additionalData.view` 传递
- 前端会自动根据视图名称加载对应的组件
- 如果视图不存在，会回退到默认视图（viewpoint-panel）

