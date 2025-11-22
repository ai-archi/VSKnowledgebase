# 包精简实施计划

## 目标
合并相关包，减少包数量，简化项目结构。

## 当前包结构

### Common 层
- `common-all` - 核心类型和工具（无依赖）
- `common-server` - 服务器端功能（依赖 common-all）
- `common-frontend` - 前端功能（依赖 common-all，主要用于已删除的图形视图）
- `common-test-utils` - 测试工具（依赖 common-all, common-server）
- `common-assets` - 资源文件（CSS、JS、字体等）

### Engine 层
- `engine-server` - 引擎核心（依赖 common-all, common-server, unified）
- `engine-test-utils` - 引擎测试工具（依赖所有 common 包和 engine-server）

### 其他
- `unified` - Markdown 解析器
- `plugin-core` - VSCode 插件核心
- `dendron-viz` - 可视化（可能已删除）
- `dendron-plugin-views` - 插件视图（已删除）

## 合并策略

### 阶段一：合并 common-all 和 common-server → common

**步骤：**
1. 将 `common-server/src` 下的所有文件移动到 `common-all/src/server/`
2. 更新 `common-all/src/index.ts`，导出 server 模块
3. 更新 `common-all/package.json`：
   - 合并依赖项
   - 更新包名（可选，或保持 common-all 名称）
4. 更新所有引用：
   - `@dendronhq/common-server` → `@dendronhq/common-all`
   - 更新导入路径（如 `from "@dendronhq/common-all/server"`）
5. 删除 `common-server` 包
6. 更新根 `package.json` 的 workspaces

**影响范围：**
- 222+ 个文件引用 `@dendronhq/common-all`
- 大量文件引用 `@dendronhq/common-server`
- 需要更新所有包的 package.json

### 阶段二：评估 common-frontend

**检查：**
- `common-frontend` 主要用于已删除的 `dendron-plugin-views`
- 如果 `engine-test-utils` 不再需要，可以删除 `common-frontend`

**决策：**
- 如果不再使用，删除 `common-frontend` 包
- 如果 `engine-test-utils` 需要，保留但标记为可选

### 阶段三：保留测试工具包

**保留：**
- `common-test-utils` - 测试工具，不应合并到生产代码
- `engine-test-utils` - 引擎测试工具，不应合并到生产代码

### 阶段四：保留资源包

**保留：**
- `common-assets` - 资源文件，应独立管理

## 实施步骤

### 步骤 1：准备阶段
- [ ] 备份当前代码
- [ ] 创建新的 `common` 包结构（或使用 common-all）
- [ ] 分析所有依赖关系

### 步骤 2：合并 common-all 和 common-server
- [ ] 移动 common-server 代码到 common-all
- [ ] 更新 common-all 的导出
- [ ] 更新所有引用
- [ ] 测试编译
- [ ] 删除 common-server

### 步骤 3：清理 common-frontend
- [ ] 检查使用情况
- [ ] 如果不再使用，删除

### 步骤 4：更新文档
- [ ] 更新 README
- [ ] 更新 PROJECT_SIMPLIFICATION_TASKS.md

## 风险评估

**高风险：**
- 大量文件需要更新引用
- 可能破坏构建流程
- 需要仔细测试

**建议：**
- 分阶段执行
- 每个阶段完成后进行测试
- 保留备份以便回滚

## 预计收益

- **包数量减少：** 从 5 个 common 包减少到 2-3 个
- **维护成本降低：** 减少包管理复杂度
- **构建速度提升：** 减少包之间的依赖关系

## 预计时间

- **阶段一：** 3-4 天（合并 common-all 和 common-server）
- **阶段二：** 1 天（评估和删除 common-frontend）
- **阶段三：** 0 天（保留测试工具）
- **阶段四：** 0 天（保留资源包）
- **总计：** 4-5 天

