# Vue 文件结构分析报告

## 当前结构问题

### 1. Page 组件冗余

**问题：** 很多 Page 组件只是简单的包装器，代码重复度高

**示例：**
- `CreateFileDialogPage.vue` - 只包装 `CreateFileForm.vue`
- `CreateFolderDialogPage.vue` - 只包装 `CreateFolderForm.vue`
- `CreateTaskDialogPage.vue` - 只包装 `CreateTaskForm.vue`
- `CreateDesignDialogPage.vue` - 只包装 `CreateDesignForm.vue`

这些 Page 组件都包含：
- 相同的样式（100vh, flex, background）
- 相同的 close 处理逻辑
- 只是导入不同的 Form 组件

### 2. 目录结构不清晰

**当前结构：**
```
src/
├── CreateFileDialogPage.vue      # Page 组件在根目录
├── CreateFolderDialogPage.vue
├── CreateTaskDialogPage.vue
├── ViewpointPanelPage.vue
├── MermaidEditorPage.vue
├── components/                    # 组件在 components 目录
│   ├── CreateFileForm.vue
│   ├── CreateFolderForm.vue
│   └── ...
└── views/
    └── index.ts
```

**问题：**
- Page 组件和组件混在一起
- 没有明确的页面/组件分层

## 重构建议

### 方案 1：创建通用 DialogPage 组件（推荐）

**优点：**
- 消除代码重复
- 统一对话框样式和行为
- 易于维护

**实现：**
```vue
<!-- pages/DialogPage.vue -->
<template>
  <div class="dialog-page">
    <component :is="formComponent" @created="handleCreated" @close="handleClose" />
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps<{
  formComponent: any;
}>();

const handleCreated = () => {
  // 统一处理
};

const handleClose = () => {
  if (window.acquireVsCodeApi) {
    const vscode = window.acquireVsCodeApi();
    vscode.postMessage({ method: 'close' });
  }
};
</script>
```

### 方案 2：移动 Page 组件到 pages/ 目录

**优点：**
- 目录结构更清晰
- 符合 Vue 项目最佳实践

**新结构：**
```
src/
├── pages/                         # 页面组件
│   ├── ViewpointPanelPage.vue
│   ├── CreateFileDialogPage.vue
│   ├── CreateFolderDialogPage.vue
│   ├── CreateTaskDialogPage.vue
│   ├── CreateDesignDialogPage.vue
│   ├── EditRelationsDialogPage.vue
│   ├── MermaidEditorPage.vue
│   ├── PlantUMLEditorPage.vue
│   └── SolutionEditorPage.vue
├── components/                    # 可复用组件
│   ├── CreateFileForm.vue
│   ├── CreateFolderForm.vue
│   └── ...
└── views/
    └── index.ts
```

### 方案 3：直接使用 Form 组件（简化版）

**优点：**
- 最简化，减少一层包装
- 直接在 views/index.ts 中注册 Form 组件

**缺点：**
- 如果 Form 组件需要不同的页面样式，需要修改 Form 组件本身

## 推荐方案：方案 1 + 方案 2

1. **创建通用 DialogPage 组件**
2. **将 Page 组件移动到 pages/ 目录**
3. **简化 Dialog Page 组件，使用通用组件**

## 实施步骤

1. 创建 `src/pages/` 目录
2. 创建 `src/pages/DialogPage.vue` 通用组件
3. 移动所有 Page 组件到 `pages/` 目录
4. 简化 Dialog Page 组件，使用通用 DialogPage
5. 更新 `views/index.ts` 中的导入路径

