# 待处理任务说明

## 当前状态

### ✅ 已完成的改进

1. **类型安全改进** - 完成
2. **类型定义整理** - 完成
3. **清理 Store** - 完成
4. **使用路径别名** - 完成
5. **整理文档** - 完成
6. **更新 features/ 目录内的导入路径** - 完成（已更新为使用 `@/services`）

### ⚠️ 待处理任务

#### 1. 重命名 lib/ 目录为 features/ ✅ 已完成

**当前状态：**
- ✅ `lib/` 目录已重命名为 `features/`
- ✅ 导入路径已更新为使用 `@/features/`
- ✅ 所有相关文件已更新

#### 2. 迁移 JavaScript 文件到 TypeScript（可选）

**当前状态：**
- `lib/mermaid-editor/` 目录下有 10 个 `.js` 文件
- `lib/plantuml-editor/` 目录下有 2 个 `.js` 文件
- 这些文件在 TypeScript 项目中会产生类型错误

**需要迁移的文件：**

**mermaid-editor:**
- `StateManager.js` → `StateManager.ts`
- `MermaidParser.js` → `MermaidParser.ts`
- `MermaidRenderer.js` → `MermaidRenderer.ts`
- `MermaidCodeEditor.js` → `MermaidCodeEditor.ts`
- `MermaidCodeGenerator.js` → `MermaidCodeGenerator.ts`
- `MermaidInteractionLayer.js` → `MermaidInteractionLayer.ts`
- `MermaidLabelEditor.js` → `MermaidLabelEditor.ts`
- `MermaidNodeAdder.js` → `MermaidNodeAdder.ts`
- `MermaidNodeConnector.js` → `MermaidNodeConnector.ts`
- `utils.js` → `utils.ts`
- `types.js` → `types.ts`

**plantuml-editor:**
- `StateManager.js` → `StateManager.ts`
- `utils.js` → `utils.ts`

**注意事项：**
- 这是一个大工程，需要为每个文件添加类型定义
- 可以逐步迁移，先迁移核心文件
- 迁移后需要更新所有导入路径（移除 `.js` 扩展名）

## 建议

1. **立即处理：** 手动重命名 `lib/` 为 `features/`，然后更新两个组件的导入路径
2. **可选处理：** JavaScript 迁移可以逐步进行，不影响当前功能

## 当前导入路径状态

所有导入路径已更新为使用路径别名：
- ✅ `@/types` - 类型定义
- ✅ `@/services` - 服务层
- ✅ `@/components` - 组件
- ✅ `@/pages` - 页面
- ✅ `@/views` - 视图注册
- ✅ `@/lib/` - 编辑器功能（待重命名为 `@/features/`）

