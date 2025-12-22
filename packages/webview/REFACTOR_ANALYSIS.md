# Webview HTML 文件整合分析报告

## 当前状态

### HTML 文件使用情况

后端代码中使用了以下 HTML 文件：

1. **BaseFileTreeCommands** (共享基类)
   - `create-file-dialog.html` - 创建文件对话框
   - `create-folder-dialog.html` - 创建文件夹对话框
   - `create-design-dialog.html` - 创建设计图对话框
   - `edit-relations-dialog.html` - 编辑关联关系对话框

2. **ViewpointWebviewViewProvider**
   - `viewpoint-panel.html` - 主视图面板
   - `create-task-dialog.html` - 创建任务对话框

3. **PlantUMLEditorProvider**
   - `plantuml-editor.html` - PlantUML 编辑器

4. **MermaidEditorProvider**
   - `mermaid-editor.html` - Mermaid 编辑器

5. **SolutionEditor** (推测)
   - `solution-editor.html` - 方案编辑器

**总计：9 个 HTML 文件**

## 整合方案

### 方案 1：统一使用 `index.html`（推荐）

**优点：**
- ✅ 只需要维护一个 HTML 文件
- ✅ 所有视图共享相同的入口和配置
- ✅ 代码更简洁，易于维护
- ✅ 前端已经支持通过 URL 参数或 `window.initialData` 区分视图

**实现步骤：**

1. **修改后端代码**，统一使用 `index.html`：
   ```typescript
   // BaseFileTreeCommands.ts
   await this.getWebviewContent(
     panel.webview,
     'index.html',  // 统一使用 index.html
     initialVaultId,
     initialFolderPath,
     designType,
     { view: 'create-file-dialog' }  // 通过 additionalData 传递视图名称
   );
   ```

2. **修改 ViewpointWebviewViewProvider**：
   ```typescript
   // 主视图
   const html = this.getWebviewContent(webviewView.webview);
   // 需要修改 getWebviewContent 方法，添加 view 参数注入
   
   // 创建任务对话框
   // 在 openCreateTaskDialog 中传递 view 参数
   ```

3. **修改 Editor Providers**：
   ```typescript
   // PlantUMLEditorProvider 和 MermaidEditorProvider
   // 在 getWebviewContent 中注入 view 参数
   ```

4. **前端 main.ts 已支持**：
   - 从 URL 参数获取：`?view=viewpoint-panel`
   - 从 `window.initialData` 获取：`window.initialData.view`
   - 从文件名提取：`viewpoint-panel.html` → `viewpoint-panel`

### 方案 2：保留多个 HTML 文件但统一入口

**优点：**
- ✅ 向后兼容，不需要修改后端代码
- ✅ 每个视图有独立的 HTML 文件（便于调试）

**缺点：**
- ❌ 仍然需要维护多个 HTML 文件
- ❌ 代码重复（虽然都指向同一个 main.ts）

## 推荐方案：方案 1

### 需要修改的文件

#### 后端文件

1. **BaseFileTreeCommands.ts**
   - 修改 `getWebviewContent` 调用，统一使用 `index.html`
   - 通过 `additionalData` 传递 `view` 参数

2. **ViewpointWebviewViewProvider.ts**
   - 修改 `getWebviewContent` 方法，支持注入 `view` 参数
   - 修改 `openCreateTaskDialog` 方法，使用 `index.html` 并传递 `view` 参数

3. **PlantUMLEditorProvider.ts**
   - 修改 `getWebviewContent` 方法，使用 `index.html` 并注入 `view: 'plantuml-editor'`

4. **MermaidEditorProvider.ts**
   - 修改 `getWebviewContent` 方法，使用 `index.html` 并注入 `view: 'mermaid-editor'`

5. **SolutionEditor** (如果存在)
   - 类似修改

#### 前端文件

1. **main.ts** (已完成)
   - 已支持从 `window.initialData.view` 获取视图名称
   - 已支持从 URL 参数获取视图名称
   - 已支持从文件名提取视图名称

2. **vite.config.ts** (需要调整)
   - 只构建一个 `index.html` 入口
   - 移除多入口配置

### 实施计划

1. ✅ 前端已准备好（main.ts 支持多种方式获取视图）
2. ⏳ 修改后端代码，统一使用 `index.html`
3. ⏳ 更新 vite.config.ts，只构建一个 HTML 文件
4. ⏳ 删除旧的 HTML 文件（或保留作为备份）
5. ⏳ 测试所有视图是否正常工作

## 结论

**可以移除多余的 HTML 文件，只保留一个 `index.html`。**

前端代码已经支持通过多种方式识别视图，只需要：
1. 修改后端代码统一使用 `index.html`
2. 通过 `window.initialData.view` 或 URL 参数传递视图名称
3. 更新构建配置

这样可以大大简化项目结构，提高可维护性。

