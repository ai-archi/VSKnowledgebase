# ArchiTool 架构迁移实施计划

本文档基于 `EXPECTED_ARCHITECTURE_DESIGN.md` 和 `DETAILED_TECHNICAL_DESIGN.md` 的目标架构，分析当前项目代码，制定详细的迁移实施计划。

---

## 一、当前项目分析

### 1.1 当前项目结构

**Monorepo 结构（Lerna + Yarn Workspaces）**：
```
packages/
├── common-all/          # 核心类型和工具（NoteProps, DVault, DNodeUtils 等）
├── common-frontend/     # 前端通用组件和工具
├── common-assets/        # 静态资源（CSS、字体等）
├── engine-server/       # 引擎服务（文件系统驱动、SQLite/DuckDB）
├── plugin-core/         # VSCode 插件核心（Commands, TreeView, Services）
├── dendron-plugin-views/# Webview 视图（React 组件）
├── dendron-viz/         # 可视化组件
└── unified/             # Markdown 处理（unified.js）
```

### 1.2 核心代码映射

| 当前代码位置 | 核心内容 | 目标架构位置 | 迁移策略 |
|------------|---------|------------|---------|
| `common-all/src/types/foundation.ts` | `NoteProps`, `DVault` | `domain/shared/artifact/`, `domain/shared/vault/` | **重构**：NoteProps → Artifact，保留 DVault 概念 |
| `common-all/src/dnode.ts` | `DNodeUtils`, Note 操作工具 | `domain/shared/artifact/` | **提取**：保留路径处理、ID 生成等工具函数 |
| `common-all/src/FuseEngine.ts` | 全文搜索 | `infrastructure/storage/duckdb/` | **替换**：使用 DuckDB 向量搜索替代 |
| `engine-server/src/drivers/` | 文件系统驱动、SQLite | `infrastructure/storage/file/`, `infrastructure/storage/duckdb/` | **重构**：SQLite → DuckDB，文件系统适配器 |
| `plugin-core/src/services/` | EngineAPIService | `apps/extension/src/modules/shared/application/` | **重构**：应用服务层 |
| `plugin-core/src/commands/` | VSCode Commands | `apps/extension/src/modules/*/interface/` | **重构**：按模块组织 |
| `plugin-core/src/views/` | TreeView Providers | `apps/extension/src/modules/*/interface/` | **重构**：按视图模块组织 |
| `dendron-plugin-views/src/` | React Webview | `apps/webview/src/modules/` | **迁移**：Vue 3 重构或保留 React |

### 1.3 需要移除的代码

**不再需要的功能**：
- ❌ **Schema 系统**：`common-all/src/schema.ts`（已标记为 removed）
- ❌ **Workspace 概念**：`DWorkspace` 相关代码
- ❌ **SQLite 存储**：`engine-server/src/drivers/sqlite/`（已迁移到 DuckDB）
- ❌ **Note 层次结构**：`parent`, `children` 属性
- ❌ **Stub 概念**：存根笔记相关代码
- ❌ **Anchors 系统**：锚点系统（通过路径片段支持）
- ❌ **旧缓存系统**：JSON 缓存文件（统一使用 DuckDB）

**保留但需重构的代码**：
- ✅ **Vault 概念**：保留但增强 Git 支持
- ✅ **文件系统操作**：提取核心文件操作逻辑
- ✅ **Markdown 处理**：`unified/` 包保留
- ✅ **工具函数**：UUID、路径处理、时间处理等

---

## 二、目标架构对比

### 2.1 架构差异

| 维度 | 当前架构 | 目标架构 | 影响 |
|------|---------|---------|------|
| **项目结构** | Monorepo (多包) | 单体架构 (目录组织) | 需要合并包 |
| **核心模型** | NoteProps | Artifact | 数据模型重构 |
| **存储** | SQLite + JSON | DuckDB + YAML | 存储层重构 |
| **组织方式** | Workspace + Vaults | Vaults 集合 | 简化概念 |
| **视图系统** | 单一 TreeView | 多视图（文档/视点/任务/模板） | 视图模块化 |
| **前端技术** | React | Vue 3 (Webview) | 前端重构 |

### 2.2 关键设计决策

1. **不兼容迁移**：不保留 `notes/` 目录，不迁移旧数据
2. **渐进式迁移**：保留现有能力，逐步引入新架构
3. **代码提取而非复制**：从旧代码中提取有用部分，避免复制无用代码

---

## 三、实施阶段规划

### 阶段 0：骨架 & PoC（2-4 周）

**目标**：建立基础架构，验证核心概念

#### 3.0.1 创建项目结构

**任务清单**：
- [ ] 创建单体项目目录结构
  - [ ] `apps/extension/` - VSCode 插件后端
  - [ ] `apps/webview/` - Webview 前端
  - [ ] `domain/` - 领域核心
  - [ ] `infrastructure/` - 基础设施层
  - [ ] `packages/` - 独立可复用包（保留部分）
- [ ] 配置 pnpm workspace（替换 Lerna）
- [ ] 配置 TypeScript 项目引用
- [ ] 配置构建工具（Vite for webview, tsc for extension）

**代码来源**：
- 从 `package.json` 提取依赖配置
- 从 `tsconfig.json` 提取 TypeScript 配置
- **不复制**：Lerna 配置、旧构建脚本

#### 3.0.2 创建领域核心（domain/shared/）

**任务清单**：
- [ ] 定义 Artifact 领域模型
  - [ ] `domain/shared/artifact/Artifact.ts` - Artifact 实体
  - [ ] `domain/shared/artifact/ArtifactMetadata.ts` - 元数据值对象
  - [ ] `domain/shared/artifact/ArtifactLink.ts` - 链接实体
  - [ ] `domain/shared/artifact/types.ts` - 类型定义
- [ ] 定义 Vault 领域模型
  - [ ] `domain/shared/vault/Vault.ts` - Vault 实体
  - [ ] `domain/shared/vault/RemoteEndpoint.ts` - 远程端点
- [ ] 定义领域服务接口
  - [ ] `domain/shared/artifact/ArtifactService.ts` - 领域服务接口

**代码提取来源**：
- **从 `common-all/src/types/foundation.ts` 提取**：
  - `DVault` → `Vault`（增强 Git 支持）
  - `NoteProps` 的部分属性 → `Artifact`（移除 parent/children/stub/schema）
- **从 `common-all/src/dnode.ts` 提取**：
  - 路径处理函数 → `ArtifactUtils.ts`
  - ID 生成函数 → `ArtifactUtils.ts`
- **不复制**：
  - Schema 相关代码
  - Note 层次结构代码
  - Stub 相关代码

**参考实现**：
- `EXPECTED_ARCHITECTURE_DESIGN.md` 3.1.1 节
- `DETAILED_TECHNICAL_DESIGN.md` 1.2 节

#### 3.0.3 创建基础设施层（infrastructure/）

**任务清单**：
- [ ] DuckDB 运行时索引
  - [ ] `infrastructure/storage/duckdb/DuckDbFactory.ts` - 连接工厂
  - [ ] `infrastructure/storage/duckdb/DuckDbRuntimeIndex.ts` - 运行时索引
  - [ ] `infrastructure/storage/duckdb/VectorSearchUtils.ts` - 向量搜索
  - [ ] `infrastructure/storage/duckdb/VectorEmbeddingService.ts` - 向量嵌入
- [ ] 文件系统适配器
  - [ ] `infrastructure/storage/file/ArtifactFileSystemAdapter.ts` - Artifact 文件系统适配器
  - [ ] `infrastructure/storage/file/VaultFileSystemAdapter.ts` - Vault 文件系统适配器
- [ ] YAML 存储库
  - [ ] `infrastructure/storage/yaml/YamlMetadataRepository.ts` - YAML 元数据存储库
  - [ ] `infrastructure/storage/yaml/YamlArtifactLinkRepository.ts` - YAML 链接存储库

**代码提取来源**：
- **从 `engine-server/src/drivers/` 提取**：
  - 文件系统操作逻辑 → `ArtifactFileSystemAdapter`
  - DuckDB 相关代码（如果已存在）→ `DuckDbRuntimeIndex`
- **从 `common-all/src/` 提取**：
  - YAML 处理工具 → `YamlMetadataRepository`
- **不复制**：
  - SQLite 相关代码
  - 旧缓存系统代码

**参考实现**：
- `EXPECTED_ARCHITECTURE_DESIGN.md` 10.1.2 节
- `DETAILED_TECHNICAL_DESIGN.md` 附录

#### 3.0.4 创建 Extension 核心模块（apps/extension/src/core/）

**任务清单**：
- [ ] 核心能力模块
  - [ ] `apps/extension/src/core/eventbus/` - 事件总线
  - [ ] `apps/extension/src/core/vscode-api/` - VSCode API 适配器
  - [ ] `apps/extension/src/core/storage/` - 存储适配器
  - [ ] `apps/extension/src/core/logger/` - 日志
  - [ ] `apps/extension/src/core/config/` - 配置管理
- [ ] DI 容器配置
  - [ ] `infrastructure/di/container.ts` - InversifyJS 容器
  - [ ] `infrastructure/di/types.ts` - 类型标识

**代码提取来源**：
- **从 `plugin-core/src/` 提取**：
  - 日志系统 → `core/logger/`
  - 配置管理 → `core/config/`
- **从 `common-all/src/` 提取**：
  - 事件系统（如果存在）→ `core/eventbus/`
- **不复制**：
  - 旧的命令注册方式
  - 旧的视图注册方式

#### 3.0.5 创建 Shared 模块（apps/extension/src/modules/shared/）

**任务清单**：
- [ ] 应用层
  - [ ] `apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationService.ts`
  - [ ] `apps/extension/src/modules/shared/application/VaultApplicationService.ts`
- [ ] 基础设施层
  - [ ] `apps/extension/src/modules/shared/infrastructure/ArtifactRepository.ts`
  - [ ] `apps/extension/src/modules/shared/infrastructure/MetadataRepository.ts`
  - [ ] `apps/extension/src/modules/shared/infrastructure/VaultRepository.ts`

**代码提取来源**：
- **从 `plugin-core/src/services/EngineAPIServiceInterface.ts` 提取**：
  - 接口设计思路 → `ArtifactFileSystemApplicationService`
  - **不复制**：Note 相关方法，改为 Artifact 方法
- **从 `engine-server/src/` 提取**：
  - 存储库实现思路 → `ArtifactRepository`
  - **不复制**：SQLite 实现，改为 DuckDB

**参考实现**：
- `DETAILED_TECHNICAL_DESIGN.md` 2.1, 2.2 节
- `DETAILED_TECHNICAL_DESIGN.md` 6.1 节（代码示例）

#### 3.0.6 创建 Vault 模块（apps/extension/src/modules/vault/）

**任务清单**：
- [ ] 应用层
  - [ ] `apps/extension/src/modules/vault/application/VaultApplicationService.ts`
- [ ] 基础设施层
  - [ ] `apps/extension/src/modules/vault/infrastructure/GitVaultAdapter.ts`
  - [ ] `apps/extension/src/modules/vault/infrastructure/VaultFileSystemAdapter.ts`

**代码提取来源**：
- **从 `common-all/src/vault.ts` 提取**：
  - Vault 工具函数 → `VaultFileSystemAdapter`
- **从 `plugin-core/src/` 提取**（如果存在）：
  - Git 集成代码 → `GitVaultAdapter`
- **不复制**：
  - Workspace 相关代码

#### 3.0.7 创建统一的 .architool 目录结构

**任务清单**：
- [ ] 实现 `.architool` 根目录管理
- [ ] 实现 Vault 初始化（`.architool/{vault-name}/`）
- [ ] 实现分目录结构：
  - [ ] `artifacts/` - Artifact 存储
  - [ ] `metadata/` - 元数据索引（扁平化）
  - [ ] `links/` - ArtifactLink 存储
  - [ ] `templates/` - Template 存储
  - [ ] `tasks/` - Task 存储
  - [ ] `viewpoints/` - Viewpoint 存储
  - [ ] `changes/` - 变更记录
- [ ] 实现全局 `cache/` 目录（DuckDB）

**代码提取来源**：
- **从 `engine-server/src/drivers/file/` 提取**：
  - 文件系统操作逻辑
- **不复制**：
  - 旧的 `notes/` 目录结构
  - 旧的缓存目录结构

#### 3.0.8 VSCode 命令（最小集）

**任务清单**：
- [ ] 在 `apps/extension/src/core/vscode-api/` 中实现命令适配器
- [ ] 实现最小命令集：
  - [ ] `archi.vault.add` - 添加本地 Vault
  - [ ] `archi.vault.addFromGit` - 从 Git 添加 Vault
  - [ ] `archi.vault.fork` - 复制 Git Vault
  - [ ] `archi.vault.sync` - 同步 Vault
  - [ ] `archi.vault.list` - 列出所有 Vault
  - [ ] `archi.document.create` - 创建文档
  - [ ] `archi.artifact.list` - 列出工件

**代码提取来源**：
- **从 `plugin-core/src/commands/` 提取**：
  - 命令注册方式 → `CommandAdapter`
  - **不复制**：具体命令实现，重新实现
- **参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 7.3 节

#### 3.0.9 MCP Server（最小实现）

**任务清单**：
- [ ] 在 `apps/extension/src/modules/mcp/` 中实现
- [ ] 启动进程内 MCP Server
- [ ] 实现标准知识库 map API：
  - [ ] `mcp_knowledge_base_list_entries`
  - [ ] `mcp_knowledge_base_get_entry`

**代码提取来源**：
- **新建**：MCP Server 实现（当前项目可能没有）
- **参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 3.4 节

---

### 阶段 1：基本功能（4-8 周）

**目标**：实现核心功能，支持基本使用

#### 3.1.1 完善领域核心和模块

**任务清单**：
- [ ] 完善 `domain/shared/` 中的领域模型
- [ ] 完善 shared 模块的 ArtifactRepository
- [ ] 完善 DuckDB 运行时索引
- [ ] 完善 vault 模块的 Git Vault 只读管理和 fork 功能
- [ ] 实现变更检测（ChangeDetector）

**代码提取来源**：
- **从 `common-all/src/FuseEngine.ts` 提取**：
  - 搜索逻辑思路 → DuckDB 向量搜索
  - **不复制**：Fuse.js 实现，改为 DuckDB
- **从 `engine-server/src/` 提取**：
  - 变更检测逻辑（如果存在）→ `ChangeDetector`

#### 3.1.2 Lookup 系统

**任务清单**：
- [ ] 在 `apps/extension/src/modules/lookup/` 中实现
  - [ ] `application/LookupApplicationService.ts`
  - [ ] `interface/LookupStateManager.ts`
  - [ ] `interface/NoteLookupProvider.ts`
  - [ ] `interface/SpecialItemFactory.ts`
  - [ ] `interface/PromptTemplates.ts`

**代码提取来源**：
- **从 `plugin-core/src/commands/LookupCommand.ts` 提取**：
  - Lookup UI 逻辑 → `NoteLookupProvider`
  - **不复制**：旧的按钮系统，改为三区域设计
- **参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 7.1 节

#### 3.1.3 文档视图（Document View）

**任务清单**：
- [ ] 在 `apps/extension/src/modules/document/` 中实现
  - [ ] `application/DocumentApplicationService.ts`
  - [ ] `interface/DocumentTreeViewProvider.ts`
  - [ ] `interface/Commands.ts`

**代码提取来源**：
- **从 `plugin-core/src/views/` 提取**：
  - TreeView 注册方式 → `DocumentTreeViewProvider`
  - **不复制**：旧的树结构，改为按 viewType/category 组织
- **参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 3.2.1 节

#### 3.1.4 任务视图（Task View）

**任务清单**：
- [ ] 在 `apps/extension/src/modules/task/` 中实现
  - [ ] `application/TaskApplicationService.ts`
  - [ ] `interface/TaskTreeDataProvider.ts`
  - [ ] `interface/Commands.ts`

**代码提取来源**：
- **从 `plugin-core/src/views/TaskView.ts` 提取**（如果存在）：
  - 任务视图逻辑
- **参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 3.2.3 节

#### 3.1.5 变更追踪

**任务清单**：
- [ ] ChangeDetector 实现
- [ ] 变更记录存储

**代码提取来源**：
- **从 `engine-server/src/` 提取**（如果存在）：
  - 变更检测逻辑

---

### 阶段 2：智能能力（4-6 周）

**目标**：引入 AI 能力，增强自动化

#### 3.2.1 AI 服务

**任务清单**：
- [ ] AIApplicationService
- [ ] 影响分析（Impact Analysis）
- [ ] 提示生成（Prompt Generation）

**代码提取来源**：
- **新建**：AI 服务（当前项目可能没有）

#### 3.2.2 MCP 完整实现

**任务清单**：
- [ ] 实现标准知识库 map API（完整集）
- [ ] 自动配置发现（Cursor / 通义灵码）
- [ ] 安全备份流程

**参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 3.4 节

#### 3.2.3 Development 视图

**任务清单**：
- [ ] 代码-设计关联
- [ ] 代码审查功能
- [ ] 规范检测（ESLint 集成）

---

### 阶段 3：企业化（持续）

**目标**：完善功能，优化性能

#### 3.3.1 视点视图（Viewpoint View）

**任务清单**：
- [ ] 在 `apps/extension/src/modules/viewpoint/` 中实现
  - [ ] `application/ViewpointApplicationService.ts`
  - [ ] `interface/ViewpointTreeDataProvider.ts`

**参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 3.2.2 节

#### 3.3.2 模板视图（Template View）

**任务清单**：
- [ ] 在 `apps/extension/src/modules/template/` 中实现
  - [ ] `application/TemplateApplicationService.ts`
  - [ ] `interface/TemplateTreeDataProvider.ts`

**代码提取来源**：
- **从 `plugin-core/src/templates/` 提取**（如果存在）：
  - 模板处理逻辑

#### 3.3.3 自定义编辑器（Webview）

**任务清单**：
- [ ] 在 `apps/extension/src/modules/editor/` 中实现编辑器提供者
- [ ] 在 `apps/webview/src/modules/editor/` 中实现前端编辑器组件
  - [ ] ArchiMate 编辑器
  - [ ] PlantUML 编辑器（可选）
  - [ ] Mermaid 编辑器（可选）

**代码提取来源**：
- **从 `dendron-plugin-views/src/` 提取**：
  - Webview 通信逻辑 → `apps/webview/src/services/`
  - **不复制**：React 组件，改为 Vue 3
- **参考**：`EXPECTED_ARCHITECTURE_DESIGN.md` 7.2 节

---

## 四、代码提取策略

### 4.1 提取原则

1. **只提取有用代码**：提取核心逻辑，不复制无用功能
2. **重构而非复制**：提取后需要适配新架构
3. **参考旧代码**：理解实现思路，重新实现
4. **逐步迁移**：先建立新架构，再逐步迁移功能

### 4.2 具体提取清单

#### 4.2.1 从 `common-all/` 提取

| 文件/功能 | 提取内容 | 目标位置 | 重构说明 |
|---------|---------|---------|---------|
| `src/types/foundation.ts` | `DVault` 类型 | `domain/shared/vault/Vault.ts` | 增强 Git 支持 |
| `src/types/foundation.ts` | `NoteProps` 部分属性 | `domain/shared/artifact/Artifact.ts` | 移除 parent/children/stub/schema |
| `src/dnode.ts` | 路径处理函数 | `domain/shared/artifact/ArtifactUtils.ts` | 适配 Artifact 路径 |
| `src/dnode.ts` | ID 生成函数 | `domain/shared/artifact/ArtifactUtils.ts` | 保留 UUID 生成 |
| `src/vault.ts` | Vault 工具函数 | `infrastructure/storage/file/VaultFileSystemAdapter.ts` | 适配新存储结构 |
| `src/yaml.ts` | YAML 处理工具 | `infrastructure/storage/yaml/YamlMetadataRepository.ts` | 保留 YAML 解析 |
| `src/uuid.ts` | UUID 生成 | `domain/shared/artifact/ArtifactUtils.ts` | 保留 |
| `src/time.ts` | 时间处理 | `domain/shared/artifact/ArtifactUtils.ts` | 保留 |
| `src/FuseEngine.ts` | 搜索逻辑思路 | `infrastructure/storage/duckdb/VectorSearchUtils.ts` | **不复制**：改为 DuckDB 向量搜索 |

**不提取**：
- ❌ `src/schema.ts` - Schema 系统已移除
- ❌ `src/BacklinkUtils.ts` - 使用 ArtifactLink 替代
- ❌ `src/DLinkUtils.ts` - 使用 ArtifactLink 替代

#### 4.2.2 从 `engine-server/` 提取

| 文件/功能 | 提取内容 | 目标位置 | 重构说明 |
|---------|---------|---------|---------|
| `src/drivers/file/` | 文件系统操作 | `infrastructure/storage/file/ArtifactFileSystemAdapter.ts` | 适配 `.architool` 结构 |
| `src/drivers/duckdb/` | DuckDB 连接和查询 | `infrastructure/storage/duckdb/DuckDbRuntimeIndex.ts` | 保留并完善 |
| `src/drivers/index.ts` | 驱动接口思路 | `infrastructure/storage/` | 适配新存储接口 |

**不提取**：
- ❌ `src/drivers/sqlite/` - SQLite 已移除
- ❌ 旧的缓存系统

#### 4.2.3 从 `plugin-core/` 提取

| 文件/功能 | 提取内容 | 目标位置 | 重构说明 |
|---------|---------|---------|---------|
| `src/services/EngineAPIServiceInterface.ts` | 接口设计思路 | `apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationService.ts` | Note → Artifact |
| `src/commands/` | 命令注册方式 | `apps/extension/src/core/vscode-api/CommandAdapter.ts` | 保留注册方式 |
| `src/views/` | TreeView 注册方式 | `apps/extension/src/modules/*/interface/TreeViewProvider.ts` | 按模块组织 |
| `src/logger.ts` | 日志系统 | `apps/extension/src/core/logger/Logger.ts` | 保留 |
| `src/config.ts` | 配置管理 | `apps/extension/src/core/config/ConfigManager.ts` | 适配新配置结构 |

**不提取**：
- ❌ 具体命令实现（需要重新实现）
- ❌ 旧的视图实现（需要重新实现）

#### 4.2.4 从 `dendron-plugin-views/` 提取

| 文件/功能 | 提取内容 | 目标位置 | 重构说明 |
|---------|---------|---------|---------|
| Webview 通信逻辑 | postMessage 通信 | `apps/webview/src/services/ExtensionService.ts` | 保留通信协议 |
| React 组件思路 | UI 组件设计 | `apps/webview/src/modules/` | **不复制**：改为 Vue 3 |

**不提取**：
- ❌ React 组件代码（改为 Vue 3）
- ❌ React 相关依赖

#### 4.2.5 从 `unified/` 提取

| 文件/功能 | 提取内容 | 目标位置 | 重构说明 |
|---------|---------|---------|---------|
| Markdown 处理 | unified.js 处理 | `packages/unified/` | **保留包**：继续使用 |

**策略**：`unified/` 包可以保留，作为独立包使用。

---

## 五、依赖管理

### 5.1 新依赖

**需要添加的依赖**：
- `inversify` - DI 容器
- `knex` - SQL 查询构建器（DuckDB）
- `duckdb` - DuckDB 数据库
- `@xenova/transformers` - 向量嵌入模型
- `vue@3` - Vue 3 框架（Webview）
- `vite` - 前端构建工具
- `pinia` - 状态管理

### 5.2 保留依赖

**保留的依赖**：
- `typescript` - TypeScript
- `vscode` - VSCode Extension API
- `unified` 相关包 - Markdown 处理
- `js-yaml` - YAML 处理

### 5.3 移除依赖

**移除的依赖**：
- `fuse.js` - 使用 DuckDB 向量搜索替代
- `sqlite3` - 使用 DuckDB 替代
- `react` 相关 - 改为 Vue 3（Webview）
- `lerna` - 使用 pnpm workspace 替代

---

## 六、当前实施状态分析（2024年更新）

### 6.0 已完成的核心任务 ✅

#### 阶段 0 核心架构（约 95% 完成）✅

- [x] **项目结构创建**：单体架构目录结构（apps/, domain/, infrastructure/）
- [x] **领域核心模型**：Artifact、Vault、ArtifactMetadata、ArtifactLink 等完整定义
- [x] **基础设施层**：DuckDB 运行时索引、文件系统适配器、YAML 存储库
- [x] **Extension 核心模块**：Logger、ConfigManager、EventBus、CommandAdapter
- [x] **应用服务实现**：ArtifactFileSystemApplicationServiceImpl、VaultApplicationServiceImpl
- [x] **存储库实现**：ArtifactRepositoryImpl、MetadataRepositoryImpl、VaultRepositoryImpl
- [x] **DI 容器配置**：InversifyJS 容器完整配置和绑定
- [x] **部分模块实现**：document、lookup、task 模块已实现
- [x] **VSCode 命令**：
  - [x] `archi.vault.add` - 添加本地 Vault
  - [x] `archi.vault.addFromGit` - 从 Git 添加 Vault ✅ **已完成**
  - [x] `archi.vault.fork` - 复制 Git Vault ✅ **已完成**
  - [x] `archi.vault.sync` - 同步 Vault ✅ **已完成**
  - [x] `archi.vault.remove` - 移除 Vault ✅ **已完成**
  - [x] `archi.vault.list` - 列出所有 Vault
  - [x] `archi.lookup` - Lookup 系统
  - [x] `archi.document.create` - 创建文档
  - [x] `archi.artifact.list` - 列出工件
- [x] **Git Vault 支持** ✅ **已完成**：GitVaultAdapter 完整实现（simple-git）
- [x] **MCP Server** ✅ **已完成**：MCPTools、MCPResources、MCPServerStarter 完整实现
- [x] **向量搜索集成** ✅ **已完成**：VectorEmbeddingService 独立服务实现
- [x] **Webview 前端** ✅ **已完成**：Vue 3 + Vite 项目结构创建

#### 阶段 1 基本功能（约 80% 完成）✅

- [x] **Lookup 系统**：三区域设计、状态管理、Prompt 模板
- [x] **文档视图**：DocumentTreeViewProvider、按 viewType/category 组织
- [x] **任务视图**：TaskTreeViewProvider、任务创建和管理
- [x] **变更追踪** ✅ **已完成**：ChangeDetector、ChangeRepository 实现

### 6.1 待完成的关键任务

#### 阶段 0 剩余任务（优先级：低）

1. **Git Vault 支持** ✅ **已完成**
   - [x] 实现 GitVaultAdapter 的完整功能（simple-git）
   - [x] 实现 Git 克隆逻辑（cloneRepository）
   - [x] 实现 Git 同步逻辑（pullRepository）
   - [x] 实现 Git 状态检测（getRemoteUrl, getCurrentBranch）
   - [x] 实现 Vault fork 功能（复制 Git Vault 为本地 Vault）
   - [x] 实现 Vault sync 功能（从 Git 拉取更新）
   - [x] 实现 Vault remove 功能

2. **MCP Server 完整实现** ✅ **已完成**
   - [x] 实现进程内 MCP Server 启动逻辑
   - [x] 实现资源注册（Resources）：`archi://artifact/{id}`, `archi://vault/{vault-name}`
   - [x] 实现完整的工具集（Tools）：
     - [x] `mcp_knowledge_base_list_entries`
     - [x] `mcp_knowledge_base_get_entry`
     - [x] `mcp_knowledge_base_search`
     - [x] `mcp_knowledge_base_create_entry`
     - [x] `mcp_knowledge_base_update_entry`
     - [x] `mcp_knowledge_base_delete_entry`
     - [x] `mcp_knowledge_base_list_links`（框架已实现，需要 ArtifactLinkRepository）
     - [x] `mcp_knowledge_base_create_link`（框架已实现，需要 ArtifactLinkRepository）

3. **向量搜索集成** ✅ **已完成**
   - [x] 实现 VectorEmbeddingService（向量嵌入服务）
   - [x] 完善向量搜索功能（语义搜索）
   - [ ] 测试 DuckDB VSS 扩展兼容性（需要运行时测试）
   - [ ] 优化搜索性能（批量处理、缓存）

4. **Webview 前端** ✅ **已完成**
   - [x] 创建 `apps/webview/` 项目结构
   - [x] 配置 Vue 3 + Vite 项目
   - [x] 实现前端与后端通信（ExtensionService）
   - [ ] 实现前端视图模块（document-view, task-view 等）

#### 阶段 1 剩余任务（优先级：中）

5. **变更追踪** ✅ **已完成**
   - [x] 实现 ChangeDetector（变更检测器）
   - [x] 实现变更记录存储（ArtifactChange）
   - [x] 实现变更历史查询（ChangeRepository）

6. **测试覆盖**
   - [ ] 单元测试（领域模型、应用服务、存储库）
   - [ ] 集成测试（文件系统、DuckDB、Git 操作）
   - [ ] E2E 测试（VSCode 命令、视图交互）

#### 阶段 2 任务（优先级：中低）

7. **AI 服务**
   - [ ] AIApplicationService 实现
   - [ ] 影响分析（Impact Analysis）
   - [ ] 提示生成（Prompt Generation）

8. **Development 视图**
   - [ ] 代码-设计关联
   - [ ] 代码审查功能
   - [ ] 规范检测（ESLint 集成）

#### 阶段 3 任务（优先级：低）

9. **视点视图（Viewpoint View）**
   - [ ] 创建 `apps/extension/src/modules/viewpoint/` 模块
   - [ ] 实现 ViewpointApplicationService（基于标签筛选）
   - [ ] 实现 ViewpointTreeDataProvider
   - [ ] 实现预定义视点（生命周期、架构层次、需求管理、设计管理）
   - [ ] 实现自定义视点配置
   - [ ] 实现前端视图（`apps/webview/src/modules/viewpoint-view/`）

10. **模板视图（Template View）**
    - [ ] 创建 `apps/extension/src/modules/template/` 模块
    - [ ] 实现 TemplateApplicationService
    - [ ] 实现 TemplateTreeDataProvider
    - [ ] 实现模板处理逻辑（结构模板、内容模板）
    - [ ] 实现前端视图（`apps/webview/src/modules/template-view/`）

11. **自定义编辑器**
    - [ ] 创建 `apps/extension/src/modules/editor/` 模块
    - [ ] 实现 EditorManager（编辑器管理器）
    - [ ] 实现 ArchiMate 编辑器（archimate-js 集成）
    - [ ] 实现 PlantUML 编辑器（可选）
    - [ ] 实现 Mermaid 编辑器（可选）
    - [ ] 实现前端编辑器组件（`apps/webview/src/modules/editor/`）

12. **性能优化**
    - [ ] DuckDB 索引优化
    - [ ] 索引分片策略
    - [ ] 缓存策略（LRU 缓存）
    - [ ] 并发写入处理

### 6.2 迁移检查清单（更新）

#### 6.2.1 阶段 0 检查清单

- [x] 项目结构创建完成
- [x] 领域核心模型定义完成
- [x] 基础设施层适配器实现完成
- [x] Extension 核心模块创建完成
- [x] Shared 模块应用服务实现完成
- [x] Vault 模块实现完成（Git 操作已完善）✅
- [x] `.architool` 目录结构实现完成
- [x] 最小命令集实现完成 ✅
- [x] MCP Server 最小实现完成 ✅
- [ ] 单元测试覆盖核心功能

#### 6.2.2 阶段 1 检查清单

- [x] Lookup 系统实现完成
- [x] 文档视图实现完成
- [x] 任务视图实现完成
- [x] 变更追踪实现完成 ✅
- [ ] 集成测试通过

#### 6.2.3 阶段 2 检查清单

- [ ] AI 服务实现完成
- [ ] MCP Server 完整实现完成
- [ ] Development 视图实现完成

#### 6.2.4 阶段 3 检查清单

- [ ] 视点视图实现完成
- [ ] 模板视图实现完成
- [ ] 自定义编辑器实现完成
- [ ] 性能优化完成

---

## 七、风险与缓解

### 7.1 代码提取风险

**风险**：提取代码时可能遗漏关键逻辑或引入错误

**缓解措施**：
- 建立代码提取清单，逐项检查
- 提取后进行单元测试验证
- 保留旧代码作为参考，但不复制

### 7.2 架构迁移风险

**风险**：新架构与旧架构差异大，迁移复杂度高

**缓解措施**：
- 采用渐进式迁移策略
- 先建立新架构骨架，再逐步迁移功能
- 保持新旧系统并行运行一段时间（如果需要）

### 7.3 数据迁移风险

**风险**：不兼容迁移，旧数据无法直接使用

**缓解措施**：
- 明确说明不兼容迁移策略
- 提供数据导出工具（如果需要）
- 清晰的文档说明新系统与旧系统的差异

---

## 八、下一步行动（更新）

### 8.1 立即开始（优先级：高）

1. **完善 Git Vault 支持**：
   - 实现 GitVaultAdapter 的完整功能（使用 simple-git 库）
   - 实现 Git 克隆、同步、状态检测
   - 实现 Vault fork 和 sync 命令

2. **完善 MCP Server**：
   - 实现进程内 MCP Server 启动逻辑
   - 实现资源注册和工具集（标准知识库 map API）

3. **完善向量搜索**：
   - 测试 DuckDB VSS 扩展兼容性
   - 实现 VectorEmbeddingService
   - 完善向量搜索功能

### 8.2 短期目标（1-2 周）

1. **完成阶段 0 剩余任务**：
   - Git Vault 完整实现
   - MCP Server 最小集实现
   - 向量搜索集成

2. **创建 Webview 前端**：
   - 创建 `apps/webview/` 项目结构
   - 配置 Vue 3 + Vite
   - 实现基础通信框架

3. **实现变更追踪**：
   - ChangeDetector 实现
   - 变更记录存储

### 8.3 中期目标（1-2 月）

1. **完善阶段 1 功能**：
   - 变更追踪完整实现
   - 测试覆盖（单元测试、集成测试）

2. **开始阶段 2 功能**：
   - AI 服务实现
   - MCP Server 完整实现
   - Development 视图（可选）

### 8.4 长期目标（3-6 月）

1. **完成所有视图模块**：
   - 视点视图（Viewpoint View）
   - 模板视图（Template View）

2. **实现自定义编辑器**：
   - ArchiMate 编辑器
   - PlantUML 编辑器（可选）
   - Mermaid 编辑器（可选）

3. **性能优化**：
   - DuckDB 索引优化
   - 缓存策略
   - 并发写入处理

---

## 九、参考文档

- `EXPECTED_ARCHITECTURE_DESIGN.md` - 期望架构设计
- `DETAILED_TECHNICAL_DESIGN.md` - 详细技术设计
- `PROJECT_SIMPLIFICATION_TASKS.md` - 项目精简任务
- `ARCHITECTURE_DOCUMENT_ANALYSIS.md` - 架构文档分析

---

**文档版本**：1.0.0  
**创建日期**：2024-01-XX  
**维护者**：ArchiTool 开发团队
