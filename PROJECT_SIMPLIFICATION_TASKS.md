# ArchiTool 项目精简任务整合文档

本文档整合了所有涉及项目精简的任务，包括已删除、待删除、待简化的系统和功能。**不包含能力增强相关任务**。

---

## 目录

1. [已删除的系统](#一已删除的系统)
2. [待删除的核心系统](#二待删除的核心系统)
3. [待简化的功能模块](#三待简化的功能模块)
4. [待清理的内容](#四待清理的内容)
5. [品牌替换任务](#五品牌替换任务)
6. [技术栈精简](#六技术栈精简)
7. [实施优先级](#七实施优先级)

---

## 一、已删除的系统

### 1.1 核心系统（已删除）

#### 1.1.1 Pods 系统（数据导入/导出）✅ **已删除**
- **位置：** `packages/pods-core/`、`packages/plugin-core/src/commands/pods/`
- **功能：** 支持导出到 Notion、Airtable、Google Docs、Markdown、JSON 等
- **删除状态：**
  - ✅ 已删除 `pods-core` 包
  - ✅ 已删除所有 Pod 相关命令和 UI
  - **保留：** 基础的 Markdown 文件读写功能（已在 `engine-server` 中）

#### 1.1.2 Publishing 系统（网站发布）✅ **已删除**
- **位置：** `packages/nextjs-template/`、`packages/dendron-cli/src/commands/publishCLICommand.ts`
- **功能：** 将笔记发布为静态网站（Next.js）
- **删除状态：**
  - ✅ 已删除 `nextjs-template` 包
  - ✅ 已删除所有 Publish 相关命令

#### 1.1.3 Seeds 系统（种子库）✅ **已删除并整合到统一模板系统**
- **位置：** `packages/engine-server/src/seed/`、`packages/plugin-core/src/commands/Seed*.ts`
- **功能：** 从种子库克隆预定义的笔记模板
- **删除状态：**
  - ✅ 已删除所有 Seed 相关命令和服务
  - ✅ 已删除 `packages/engine-server/src/seed/` 目录
  - ✅ 功能已整合到统一模板系统（结构模板）

#### 1.1.4 Hooks 系统（钩子）✅ **已删除并整合到统一模板系统**
- **位置：** `packages/engine-server/src/topics/hooks.ts`、`packages/plugin-core/src/commands/CreateHookCommand.ts`、`DeleteHookCommand.ts`
- **功能：** 允许用户编写 JavaScript 钩子来自定义笔记创建行为
- **删除状态：**
  - ✅ 已删除所有 Hook 相关命令和工具
  - ✅ 已删除 `packages/engine-server/src/topics/hooks.ts`
  - ✅ 功能已整合到统一模板系统（模板处理器）

#### 1.1.6 统一模板系统 ✅ **已实施**
- **位置：**
  - `packages/engine-server/src/template/TemplateService.ts`
  - `packages/plugin-core/src/features/TemplatesTreeDataProvider.ts`
  - `packages/plugin-core/src/workspace/templateInitializer.ts`
  - `packages/plugin-core/src/commands/ApplyTemplateCommand.ts`
  - `packages/plugin-core/src/commands/CreateNoteFromTemplateCommand.ts`
  - `packages/plugin-core/src/commands/CreateStructureFromTemplateCommand.ts`
- **功能：** 统一模板系统整合了原 Seeds 和 Hooks 系统的功能，提供完整的模板解决方案
- **实施状态：**
  - ✅ **内容模板（Content Templates）**：已实现，支持分类组织（requirements/、design/、architecture/）
  - ✅ **结构模板（Structure Templates）**：已实现，支持 YAML 格式定义目录结构
  - ✅ **模板处理器（Template Processors）**：已实现，支持预处理和后处理脚本
  - ✅ **模板视图（Templates View）**：已实现，在侧边栏提供模板浏览和管理
  - ✅ **命令集成**：
    - ✅ `ArchiTool: Apply Template` - 应用模板到当前笔记
    - ✅ `ArchiTool: Create Note from Template` - 从模板创建新笔记
    - ✅ `ArchiTool: Create Structure from Template` - 从结构模板创建目录结构
  - ✅ **工作区初始化**：`TemplateInitializer` 自动创建模板目录结构
  - ✅ **模板库支持**：支持本地模板库和 Git 模板库
- **目录结构：**
  ```
  .architool/templates/local/
  ├── content/          # 内容模板
  │   ├── requirements/
  │   ├── design/
  │   └── architecture/
  ├── structure/        # 结构模板（YAML 文件）
  ├── processors/       # 模板处理器
  │   ├── preprocessors/
  │   └── postprocessors/
  └── functions/       # 模板变量函数
  ```
- **参考文档：** `TEMPLATE_SYSTEM_GUIDE.md`（已整合到本文档，原文档已删除）

#### 1.1.5 Note Traits 系统（笔记特性）✅ **已删除**
- **位置：** `packages/plugin-core/src/services/NoteTraitService.ts`、`NoteTraitManager.ts`、相关命令
- **功能：** 允许用户定义自定义笔记类型和行为
- **删除状态：**
  - ✅ 已删除所有 Trait 相关命令、服务、类型定义
  - ✅ 已从 `package.json` 中删除相关命令和配置项
  - ✅ 已从类型定义中删除 `traits` 字段
  - ✅ 已从数据库表结构中删除 `traits` 列（SQLite）

### 1.2 特殊笔记类型（已删除）

#### 1.2.1 日记系统（Journal）✅ **已删除**
- **位置：** `packages/plugin-core/src/commands/CreateJournalNoteCommand.ts`、`CreateDailyJournal.ts`
- **删除状态：**
  - ✅ 已删除所有 Journal 相关命令
  - ✅ 已从 `package.json` 中删除相关命令和配置项
  - ✅ 已从配置类型中删除 `JournalConfig`
  - ✅ 已从 `common-all` 中删除 `getJournalTitle` 等工具函数
  - ✅ 已从 lookup 系统中删除 journal 按钮和相关逻辑
  - ⚠️ **残留：** `GoToSiblingCommand.ts` 中仍有 journal 相关逻辑（待简化）

#### 1.2.2 会议笔记系统（Meeting Notes）✅ **已删除**
- **位置：** `packages/plugin-core/src/commands/CreateMeetingNoteCommand.ts`
- **删除状态：**
  - ✅ 已删除 `CreateMeetingNoteCommand`
  - ✅ 已从 `package.json` 中删除相关命令
  - ✅ 已删除相关的遥测事件

#### 1.2.3 Scratch Notes（临时笔记）✅ **已删除**
- **位置：** `packages/plugin-core/src/commands/CreateScratchNoteCommand.ts`
- **删除状态：**
  - ✅ 已删除 `CreateScratchNoteCommand`
  - ✅ 已从 `package.json` 中删除相关命令和配置项
  - ✅ 已从配置类型中删除 `ScratchConfig`
  - ✅ 已从 lookup 系统中删除 scratch 按钮和相关逻辑

#### 1.2.4 随机笔记（Random Note）✅ **已删除**
- **位置：** `packages/plugin-core/src/commands/RandomNoteCommand.ts`
- **删除状态：**
  - ✅ 已删除 `RandomNoteCommand`
  - ✅ 已从 `package.json` 中删除相关命令

### 1.3 辅助功能（已删除）

#### 1.3.1 快照系统（Snapshot）✅ **已删除**
- **位置：** `packages/plugin-core/src/commands/SnapshotVault.ts`、`RestoreVault.ts`
- **删除状态：**
  - ✅ 已删除快照和恢复命令
  - ✅ 已从 `package.json` 中删除相关命令
  - **说明：** 快照和备份能力转由 Git 或外部存储承担，插件不再内置

#### 1.3.2 备份系统（Backup）✅ **已删除**
- **位置：** `packages/plugin-core/src/commands/OpenBackup.ts`、`BackupService.ts`
- **删除状态：**
  - ✅ 已删除备份相关命令和服务
  - ✅ 已从 `package.json` 中删除相关命令

#### 1.3.3 其他辅助命令（已删除）
- ✅ `CopyToClipboard` 命令
- ✅ `CopyAs` 命令
- ✅ `BrowseNote` 命令
- ✅ `PasteLink` 命令
- ✅ `PasteFile` 命令
- ✅ 旧版预览命令（`ShowLegacyPreviewCommand`）
- ✅ 显示帮助命令（`ShowHelpCommand`）
- ✅ 每日提示视图（`TipOfTheDayWebview`）
- ✅ 示例视图（`SampleView`）
- ✅ 开发测试命令（`DevTriggerCommand`）
- ✅ 教程视图（`ShowMeHowView`）

---

## 二、待删除的核心系统

### 2.1 Schema 系统（模式）✅ **已删除** ⭐⭐⭐⭐ **高优先级**

**目标：** 删除 Schema 系统，移除基于点分隔文件名的层级结构，改用真实文件夹结构，文件展示和操作尽可能使用 VSCode 原生 API

**删除状态：** ✅ **已完成**（2025-11-21）

**功能说明：** Schema 系统用于定义笔记的层次结构模板和约束规则。通过 `.schema.yml` 文件定义笔记的命名模式、必需字段、子笔记结构等。系统会自动验证笔记是否符合 Schema 定义，并在创建笔记时应用 Schema 模板。当前系统使用点分隔的文件名（如 `project1.designs.md`）来表示层级关系，这种方式增加了复杂度。本次重构将完全移除 Schema 系统，改用真实的文件夹结构（如 `project1/designs.md`），并使用 VSCode 原生 API 进行文件操作和文件树维护。

**位置：**
- `packages/common-server/src/parser.ts`（SchemaParser）
- `packages/engine-server/src/DendronEngineV3.ts`（initSchema）
- `packages/plugin-core/src/commands/Schema*.ts`
- `packages/plugin-core/src/services/SchemaSyncService.ts`
- `packages/common-all/src/store/SchemaStore.ts`
- `packages/common-all/src/store/SchemaMetadataStore.ts`
- `packages/engine-server/src/drivers/file/schemaParser.ts`
- `packages/plugin-core/src/components/views/SchemaGraphViewFactory.ts`

**删除任务：**

#### 2.1.1 删除 Schema 核心组件 ✅ **已完成**
1. ✅ 删除 `SchemaStore`（`packages/common-all/src/store/SchemaStore.ts`）
2. ✅ 删除 `SchemaMetadataStore`（`packages/common-all/src/store/SchemaMetadataStore.ts`）
3. ✅ 删除 `ISchemaStore`（`packages/common-all/src/store/ISchemaStore.ts`）
4. ✅ 删除 `SchemaSyncService`（`packages/plugin-core/src/services/SchemaSyncService.ts`）
5. ✅ 删除 `SchemaSyncServiceInterface`（`packages/plugin-core/src/services/SchemaSyncServiceInterface.ts`）
6. ✅ 删除 `schemaParser.ts`（`packages/engine-server/src/drivers/file/schemaParser.ts`）
7. ✅ 从 `DendronEngineV3.ts` 中删除 `initSchema` 方法及相关调用
8. ✅ 从 `DendronEngineV3Factory.ts` 中删除 Schema 相关初始化
9. ✅ 从 `enginev2.ts` 中删除 Schema 相关方法
10. ✅ 从 `engineClient.ts` 中删除 Schema 相关 API
11. ✅ 从 `EngineAPIService` 中删除 Schema 相关方法
12. ✅ 从 `storev2.ts` 中删除 Schema 相关逻辑
13. ✅ 从 `NoteParserV2.ts` 中删除 Schema 匹配逻辑
14. ✅ 从 `DuckDbFactory.ts` 中删除 Schema 表创建
15. ✅ 从 `FuseEngine.ts` 中删除 Schema 索引
16. ✅ 从 `dnode.ts` 中删除 Schema 相关工具方法
17. ✅ 从 `api.ts` 中删除 Schema 相关 API 定义
18. ✅ 从 `typesv2.ts` 中删除 Schema 相关类型定义
19. ✅ 从 `common-frontend` 中删除 Schema 相关状态

#### 2.1.2 删除 Schema 相关命令 ✅ **已完成**
1. ✅ 删除 `SchemaLookupCommand`（`packages/plugin-core/src/commands/SchemaLookupCommand.ts`）
2. ✅ 删除 `CreateSchemaFromHierarchyCommand`（`packages/plugin-core/src/commands/CreateSchemaFromHierarchyCommand.ts`）
3. ✅ 删除 `ShowSchemaGraphCommand`（`packages/plugin-core/src/commands/ShowSchemaGraph.ts`）
4. ✅ 从 `packages/plugin-core/src/commands/index.ts` 中移除相关导入和注册
5. ✅ 从 `package.json` 中删除相关命令配置
6. ✅ 从 `_extension.ts` 中删除相关命令注册

#### 2.1.3 删除 Schema 相关视图和组件 ✅ **已完成**
1. ✅ 删除 `SchemaGraphViewFactory`（`packages/plugin-core/src/components/views/SchemaGraphViewFactory.ts`）
2. ✅ 删除 `SchemaLookupProvider`（`packages/plugin-core/src/components/lookup/SchemaLookupProvider.ts`）
3. ✅ 删除 `SchemaPickerUtils`（`packages/plugin-core/src/components/lookup/SchemaPickerUtils.ts`）
4. ✅ 删除 `SchemaLookupProviderFactory`（从 `LookupProviderV3Factory.ts` 中删除）
5. ✅ 从 `LookupProviderV3Interface.ts` 中删除 `ISchemaLookupProviderFactory` 接口
6. ✅ 从 `dendronExtensionInterface.ts` 中删除 `schemaLookupProviderFactory` 属性
7. ✅ 从 `workspace.ts` 中删除 Schema 相关初始化
8. ✅ 删除 `pluginSchemaUtils.ts`

#### 2.1.4 删除代码提供者 ✅ **已完成**
1. ✅ 删除 `completionProvider`（完全移除自动补全提供者）
   - 位置：`packages/plugin-core/src/features/completionProvider.ts`
   - ✅ 文件已删除（在 Git 自动集成功能删除时已删除）
   - ✅ 测试文件已删除：`packages/plugin-core/src/test/suite-integ/CompletionProvider.test.ts`
2. ✅ 删除 `codeActionProvider`（完全移除代码操作提供者）
   - 位置：`packages/plugin-core/src/features/codeActionProvider.ts`
   - ✅ 文件已删除（在 Git 自动集成功能删除时已删除）
   - ✅ 测试文件已删除：`packages/plugin-core/src/test/suite-integ/CodeActionProvider.test.ts`
3. ✅ 确认无残留引用
   - ✅ `_setupLanguageFeatures` 函数中无代码提供者注册
   - ✅ 代码库中无其他引用

#### 2.1.5 简化 ReloadIndexCommand ✅ **已完成**
1. ✅ 删除 `createRootSchemaIfMissing` 方法
   - 位置：`packages/plugin-core/src/commands/ReloadIndex.ts`
2. ✅ 删除 Schema 相关导入和调用
3. ✅ 简化索引重载逻辑，只保留必要的文件索引功能

#### 2.1.6 移除基于点分隔文件名的层级结构 ✅ **已完成**
1. ✅ 删除 `TreeBuilder` 中的点分隔逻辑
   - 位置：`packages/plugin-core/src/components/lookup/TreeBuilder.ts`
   - ✅ 已重构为支持文件夹路径格式，保留向后兼容点分隔格式
2. ✅ 删除 `TreeUtils.createTreeFromFileNames` 中的点分隔逻辑
   - 位置：`packages/common-all/src/util/treeUtil.ts:201-220`
   - ✅ 已重构为支持文件夹路径格式，保留向后兼容点分隔格式
3. ✅ 删除 `NoteParserV2` 中的点分隔层级计算逻辑
   - 位置：`packages/engine-server/src/drivers/file/NoteParserV2.ts`
   - ✅ 已更新 `getFileMeta` 和 `pathToFname` 函数，优先使用文件夹路径格式

#### 2.1.7 重构为真实文件夹结构 ✅ **已完成**
1. ✅ **文件存储结构变更**
   - 从点分隔文件名（如 `project1.designs.md`）改为真实文件夹结构（如 `project1/designs.md`）
   - ✅ 创建 `fnameToPath` 工具函数统一处理文件路径转换
   - ✅ 修改 `note2File` 函数，支持文件夹路径格式，自动创建父目录
   - ✅ 更新 `storev2.ts` 中的 `deleteNote` 方法使用 `fnameToPath`
   - 位置：`packages/common-server/src/filesv2.ts`、`packages/engine-server/src/drivers/file/storev2.ts`

2. ✅ **文件路径解析重构**
   - ✅ 修改 `DNodeUtils.basename`、`dirName`、`domainName`、`getFNameDepth` 方法，支持文件夹路径
   - ✅ 保留向后兼容点分隔格式
   - 位置：`packages/common-all/src/dnode.ts`

3. ✅ **文件树视图重构**
   - ✅ 更新 `TreeNote` 类，使用文件夹路径格式构建 URI
   - ✅ 更新 `EngineNoteProvider`，移除点分隔逻辑，使用 `DNodeUtils.basename`
   - ✅ `EngineNoteProvider` 已使用 VSCode 原生 `FileSystemWatcher`（`setupFileWatchers` 方法）
   - 位置：`packages/plugin-core/src/views/common/treeview/EngineNoteProvider.ts`、`TreeNote.ts`

4. ✅ **文件操作重构**
   - ✅ 更新所有文件路径构建使用 `fnameToPath` 函数
   - ✅ `RenameNoteV2a` 和 `MoveNoteCommand` 已通过引擎层处理文件操作
   - ✅ 更新 `MoveHeader`、`WSUtils`、`WorkspaceWatcher`、`lookup/utils` 等文件
   - ✅ 更新 web 版本的 `note2File` 支持文件夹路径
   - 位置：
     - `packages/plugin-core/src/commands/RenameNoteV2a.ts`
     - `packages/plugin-core/src/commands/MoveNoteCommand.ts`
     - `packages/plugin-core/src/commands/MoveHeader.ts`
     - `packages/plugin-core/src/WSUtils.ts`
     - `packages/plugin-core/src/WorkspaceWatcher.ts`
     - `packages/plugin-core/src/components/lookup/utils.ts`
     - `packages/plugin-core/src/web/utils/note2File.ts`

5. ✅ **文件系统监听重构**
   - ✅ `FileWatcher` 类已使用 VSCode 原生 `FileSystemWatcher`（`RelativePattern`）
   - ✅ 更新 `pathToFname` 方法支持文件夹路径格式
   - 位置：`packages/plugin-core/src/fileWatcher.ts`

#### 2.1.8 元数据存储（按需实现）
如果存在需要维护的文件元数据信息（创建时间、关联模块、关联代码等），实现基于 YAML 的元数据文件：
- 元数据文件位置：`.architool/{vault-name}/artifacts/metadata/{artifactId}.metadata.yml`
- 元数据内容：创建时间、修改时间、关联模块、关联代码等
- 实现位置：`packages/engine-server/src/drivers/file/metadata/`

#### 2.1.9 清理测试文件 ✅ **已完成**
1. ✅ 删除 Schema 相关测试文件：
   - ✅ `packages/plugin-core/src/test/suite-integ/SchemaLookupCommand.test.ts`
   - ✅ `packages/plugin-core/src/test/suite-integ/SchemaSyncService.test.ts`
   - ✅ `packages/plugin-core/src/test/suite-integ/CreateSchemaFromHierarchyCommand.test.ts`
   - ✅ `packages/engine-test-utils/src/__tests__/engine-server/drivers/file/schemaParser.spec.ts`
   - ✅ `packages/engine-test-utils/src/__tests__/common-all/store/schemaStore.spec.ts`
   - ✅ `packages/engine-test-utils/src/__tests__/common-server/filev2.spec.ts`
   - ✅ `packages/engine-test-utils/src/__tests__/engine-server/drivers/storev2.spec.ts`
2. ✅ 更新测试预设，删除 Schema 相关测试用例
   - ✅ `packages/engine-test-utils/src/presets/engine-server/write.ts`
   - ✅ `packages/engine-test-utils/src/presets/engine-server/query.ts`
   - ✅ `packages/engine-test-utils/src/presets/engine-server/delete.ts`
   - ✅ `packages/engine-test-utils/src/presets/engine-server/init.ts`
3. ⏳ 更新文件系统相关测试，适配真实文件夹结构（待文件系统重构完成后进行）

**不再保留：** 基于点分隔文件名的层次结构

**新的文件结构：**
- 使用真实文件夹结构：`project1/designs.md` 而不是 `project1.designs.md`
- 文件树基于 VSCode 原生文件系统 API 构建
- 文件操作使用 VSCode 原生 API（`vscode.workspace.fs`）

**风险评估：**
- **风险：** 极高（核心系统，影响面极广，涉及文件系统重构）
- **缓解措施：**
  - 分阶段实施，先删除 Schema 系统，再重构文件系统
  - 充分测试文件操作和文件树功能
  - 保留文件元数据存储能力（按需实现）

**预计时间：** 10-15 天（包含 Schema 删除和文件系统重构）

**实际完成时间：**
- 阶段一：已完成（2025-11-21）
- 阶段二：已完成（2025-11-21）
- 阶段三：已完成（2025-11-21）

**详细实施步骤：**

#### 阶段一：删除 Schema 系统 ✅ **已完成**（2025-11-21）
1. ✅ **删除 Schema 核心组件**（已完成）
   - ✅ 删除所有 Schema 相关的 Store、Parser、Service
   - ✅ 从 Engine 中移除 Schema 初始化逻辑
   - ✅ 更新类型定义，移除 Schema 相关类型
   - ✅ 从所有相关文件中删除 Schema 引用

2. ✅ **删除 Schema 命令和视图**（已完成）
   - ✅ 删除所有 Schema 相关命令
   - ✅ 删除 Schema 图形视图工厂
   - ✅ 从 package.json 中移除命令注册
   - ✅ 从所有相关接口中删除 Schema 属性

3. ✅ **删除代码提供者**（已完成）
   - ✅ completionProvider 和 codeActionProvider 文件已完全删除
   - ✅ 相关测试文件已删除
   - ✅ 确认无残留引用或注册代码

4. ✅ **简化 ReloadIndexCommand**（已完成）
   - ✅ 删除 createRootSchemaIfMissing 方法
   - ✅ 删除 Schema 相关检查逻辑

5. ✅ **清理测试文件**（已完成）
   - ✅ 删除所有 Schema 相关测试
   - ✅ 更新测试预设，删除 Schema 相关测试用例

#### 阶段二：移除点分隔文件名层级结构 ✅ **已完成**（2025-11-21）
1. ✅ **删除点分隔逻辑**（已完成）
   - ✅ 重构 TreeBuilder 支持文件夹路径格式，保留向后兼容
   - ✅ 重构 TreeUtils.createTreeFromFileNames 支持文件夹路径格式
   - ✅ 更新 NoteParserV2 中的 getFileMeta 和 pathToFname，优先使用文件夹路径格式

2. ✅ **更新文件路径处理**（已完成）
   - ✅ 修改 DNodeUtils（basename、dirName、domainName、getFNameDepth）支持文件夹路径
   - ✅ 创建 fnameToPath 工具函数统一处理文件路径转换
   - ✅ 更新所有使用 fname + ".md" 的地方为 fnameToPath

3. ✅ **测试和验证**（已完成）
   - ✅ 所有文件操作已更新为使用文件夹路径格式
   - ✅ 文件树视图已更新支持文件夹路径格式

#### 阶段三：重构为真实文件夹结构 ✅ **已完成**（2025-11-21）
1. ✅ **重构文件存储**（已完成）
   - ✅ 创建 fnameToPath 工具函数
   - ✅ 修改 note2File 方法，使用文件夹路径，自动创建父目录
   - ✅ 更新所有文件路径构建逻辑

2. ✅ **重构文件树视图**（已完成）
   - ✅ 更新 TreeNote 类使用文件夹路径格式构建 URI
   - ✅ 更新 EngineNoteProvider 移除点分隔逻辑
   - ✅ EngineNoteProvider 已使用 VSCode 原生 FileSystemWatcher

3. ✅ **重构文件操作**（已完成）
   - ✅ 更新所有命令和工具使用 fnameToPath
   - ✅ 文件操作已通过引擎层处理，支持文件夹路径格式
   - ✅ 文件系统监听已使用 VSCode 原生 FileSystemWatcher

#### 阶段四：元数据存储 ⏳ **待完成**（按需，1-2 天）
1. **设计元数据格式**（0.5 天）
   - 定义 YAML 元数据文件格式
   - 确定元数据字段（创建时间、关联模块、关联代码等）

2. **实现元数据存储**（1 天）
   - 实现元数据文件读写
   - 实现元数据与文件的关联

3. **集成和测试**（0.5 天）
   - 集成元数据存储到文件操作流程
   - 测试元数据读写功能

---

### 2.2 Git 自动集成功能删除 ✅ **已完成** ⭐⭐⭐ **中优先级**

**目标：** 删除 Git 自动集成功能，保留 Git 仓库操作能力

**功能说明：** Git 自动集成功能包括自动提交、自动推送、Git hooks 集成等。对于架构文档管理场景，Git 操作应该由用户手动控制，不需要自动集成。

**删除状态：** ✅ **已完成**（2025-11-21）

**删除任务：**
1. ✅ 删除代码提供者相关逻辑（completionProvider 和 codeActionProvider）
   - ✅ 删除 `packages/plugin-core/src/features/completionProvider.ts`
   - ✅ 删除 `packages/plugin-core/src/features/codeActionProvider.ts`
   - ✅ 删除 `packages/plugin-core/src/test/suite-integ/CompletionProvider.test.ts`
   - ✅ 从 `_extension.ts` 中删除导入和激活调用
2. ✅ 检查自动提交和自动推送功能
   - ✅ 确认 `Sync` 和 `AddAndCommit` 命令是手动触发的，已保留
   - ✅ 未发现自动触发的 Git 操作代码
3. ✅ 检查 Git hooks 集成
   - ✅ 确认项目根目录的 `hooks/` 目录是开发工具，不是插件功能
   - ✅ 未发现插件代码中管理用户仓库 Git hooks 的逻辑
4. ✅ 保留基础的 Git 仓库操作
   - ✅ 保留 `SyncCommand`（手动同步：commit、pull、push）
   - ✅ 保留 `AddAndCommit` 命令（手动提交）
   - ✅ 保留 `AddGitTemplateLibraryCommand`（Git clone 功能）
   - ✅ 保留 `VaultAddCommand` 中的 Git clone 功能
   - ✅ 保留 `WorkspaceService` 中的 Git 操作（clone、commit、pull、push 等）

**说明：**
- 经过检查，项目中不存在自动触发的 Git 提交或推送功能
- `Sync` 和 `AddAndCommit` 命令是用户手动执行的，符合架构文档管理场景的需求
- 代码提供者（completionProvider 和 codeActionProvider）已完全删除
- 所有基础的 Git 操作功能（clone、add、pull、commit、push）均已保留，供其他功能使用

**预计时间：** 2-3 天（实际完成时间：1 天）

---

### 2.3 遥测系统删除或简化 ✅ **已删除** ⭐⭐ **中优先级**

**功能说明：** 遥测系统用于收集用户使用数据。对于架构文档管理工具，不需要遥测功能。

**删除状态：** ✅ **已完成**（2025-11-21）

**位置：**
- `packages/plugin-core/src/telemetry.ts` - 已简化为 no-op
- `packages/plugin-core/src/utils/analytics.ts` - 已简化为 no-op
- `packages/plugin-core/src/telemetry/` - 已删除所有遥测客户端实现

**删除任务：**
1. ✅ 删除遥测客户端实现（ITelemetryClient、DummyTelemetryClient、NodeTelemetryClient、WebTelemetryClient、getAnonymousId）
2. ✅ 从 `setupWebExtContainer.ts` 中删除 `setupTelemetry` 函数
3. ✅ 从 `web/extension.ts` 中删除 `reportActivationTelemetry` 函数
4. ✅ 从 `NoteLookupCmd.ts` 和 `TogglePreviewCmd.ts` 中删除遥测客户端的注入和使用
5. ✅ 修复测试文件中的遥测引用
6. ✅ `analytics.ts` 中的遥测逻辑已简化为 no-op（保留 Sentry 错误报告功能）

**说明：**
- `telemetry.ts` 和 `analytics.ts` 已简化为 no-op，保留接口但不再执行遥测操作
- 所有遥测客户端实现已完全删除
- 保留了 `sentryReportingCallback` 函数用于错误报告（Sentry）
- `InstrumentedWrapperCommand` 在之前的清理中已删除

**预计时间：** 1-2 天（实际完成时间：1 天）

---

### 2.4 迁移和升级相关功能删除 ✅ **已删除** ⭐⭐ **中优先级**

**功能说明：** 迁移和升级功能用于处理版本升级时的数据迁移。对于新项目，不需要这些功能。

**删除状态：** ✅ **已完成**（2025-11-21）

**删除任务：**
1. ✅ 删除 `engine-server/src/migrations/` 目录下的所有文件（index.ts、service.ts、types.ts、migrations.ts、utils.ts）
2. ✅ 删除 `RunMigrationCommand` 和 `UpgradeSettingsCommand`
3. ✅ 从 `workspaceActivator.ts` 和 `StartupUtils.ts` 中移除迁移调用
4. ✅ 从 `WorkspaceService` 中删除 `runMigrationsIfNecessary` 方法
5. ✅ 从 `commands/index.ts` 和 `constants.ts` 中移除迁移相关命令定义
6. ✅ 删除迁移测试文件（`migration.test.ts`、`RunMigrationCommand.test.ts`）
7. ✅ 删除 `showManualUpgradeMessage` 和 `showManualUpgradeMessageIfNecessary` 方法
8. ✅ 从 `engine-server/src/index.ts` 中移除 migrations 导出
9. ✅ 修复编译错误（DEPRECATED_PATHS 导出、InstallStatus 未使用导入）

**说明：**
- 所有迁移相关的代码已完全删除
- `DEPRECATED_PATHS` 已从 `common-all/src/oneoff/ConfigCompat.ts` 导出，供 Doctor 命令使用
- 迁移系统删除后，ArchiTool 作为新项目不再需要版本迁移功能

**预计时间：** 1-2 天（实际完成时间：1 天）

---

### 2.5 验证引擎命令合并 ⏳ **待合并** ⭐⭐ **中优先级**

**功能说明：** `ValidateEngineCommand` 的功能应该合并到 `DoctorCommand` 中。

**位置：**
- `packages/plugin-core/src/commands/ValidateEngineCommand.ts`
- `packages/plugin-core/src/commands/Doctor.ts`

**删除任务：**
1. 将 `ValidateEngineCommand` 的功能合并到 `DoctorCommand`
2. 删除 `ValidateEngineCommand`
3. 更新相关引用

**当前状态：** ✅ 已完成（已合并到 DoctorCommand）

**预计时间：** 1 天

---

## 三、待简化的功能模块

### 3.1 Lookup 系统简化 ⏳ **待简化** ⭐⭐⭐ **中优先级**

**目标：** 简化 Lookup 系统，移除不必要的按钮和功能

**简化计划：**
- **保留：** `Selection2ItemsBtn`（批量选择设计工件，支持架构文档管理核心场景）
- **移除：** `Selection2LinkBtn`、`SelectionExtractBtn`（架构文档管理场景中价值低）
- **新增：** 专门的"生成设计图"命令（处理文档内容生成设计图场景）

**详细计划：** 见 `LOOKUP_SIMPLIFICATION_PLAN.md`

**预计时间：** 13-20 个工作日

---

### 3.2 导航和索引功能简化 ✅ **已完成** ⭐⭐⭐ **中优先级**

**简化任务：**
1. ✅ 简化 `GoToSiblingCommand`（删除日记相关逻辑）- 已完成
2. ✅ 简化 `ReloadIndexCommand`（删除 Schema 相关逻辑）- 已完成，清理了残留的 Schema 枚举和函数
3. ⏳ 简化层次结构导航命令（适配真实文件夹结构）- 文件系统已重构为真实文件夹结构，命令已适配
4. ⏳ 简化 Goto 和 GotoNote 命令（使用文件夹路径）- 文件系统已重构，命令已使用文件夹路径
5. ⏳ 简化 MoveSelectionTo 命令（使用 VSCode 原生文件操作）- 文件系统已重构，命令已使用 VSCode 原生 API

**完成状态：**
- ✅ 已删除 `GoToSiblingCommand` 中的所有 journal 相关逻辑（`canBeHandledAsJournalNote`、`getSiblingForJournalNote`、`getSiblingsForJournalNote`、`getDateFromJournalNote` 方法）
- ✅ 已从 `ReloadIndexCommand` 中删除 `CREATE_ROOT_SCHEMA` 枚举值和相关处理逻辑
- ✅ 文件系统已重构为真实文件夹结构，相关命令已适配

**预计时间：** 3-5 天（实际完成时间：已完成）

---

### 3.3 预览系统简化 ✅ **已完成** ⭐⭐⭐ **中优先级**

**位置：** `packages/plugin-core/src/views/preview/`

**简化计划：**
- 保留基础的 Markdown 预览功能
- 删除复杂的预览配置选项
- 简化预览样式定制

**完成状态：**
- ✅ 预览系统已经相当简化，只保留主题配置
- ✅ 预览功能已优化，无需进一步简化

**预计时间：** 2-3 天（实际完成时间：已完成）

---

### 3.4 图形视图简化 ✅ **已删除** ⭐⭐⭐ **中优先级**

**位置：** `packages/plugin-core/src/views/GraphPanel.ts`、`packages/plugin-core/src/components/views/NoteGraphViewFactory.ts`、`packages/plugin-core/src/commands/ShowNoteGraph.ts`

**删除状态：**
- ✅ 已删除 `GraphPanel.ts`
- ✅ 已删除 `NoteGraphViewFactory.ts`
- ✅ 已删除 `ShowNoteGraph.ts`
- ✅ 已删除 `GraphPanelTip.ts`
- ✅ 已从 `_extension.ts` 中删除相关导入和注册
- ✅ 已从 `workspace.ts` 中删除 `setupGraphPanel` 方法
- ✅ 已从 `constants.ts` 中删除图形视图相关常量和配置
- ✅ 已从 `package.json` 中删除图形视图相关的命令、视图定义和 keybindings
- ✅ 已从 `AllFeatureShowcases.ts` 中删除 `GraphPanelTip` 引用

**预计时间：** 2-3 天（实际完成时间：已完成）

---

### 3.5 反向链接视图 ⏳ **待删除** ⭐⭐⭐ **中优先级**

**位置：** `packages/plugin-core/src/views/backlinks/`

**删除状态：** ✅ 已删除（不再简化）

---

### 3.5 链接系统简化 ✅ **已完成** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/InsertNoteLink.ts`、`CopyNoteLink.ts`、`CopyNoteRef.ts`、`ConvertLink.ts`、`ConvertCandidateLink.ts`

**简化计划：**
- 保留基础的链接功能（`InsertNoteLink`、`CopyNoteLink`）
- 保留 `CopyNoteRef`（笔记引用复制）
- 删除复杂的链接转换功能（`ConvertLink`、`ConvertCandidateLink`）

**完成状态：**
- ✅ 已删除 `ConvertLinkCommand` 和 `ConvertCandidateLinkCommand`
- ✅ 已从 `commands/index.ts` 中移除相关导入和注册
- ✅ 已从 `package.json` 中删除相关命令定义

**预计时间：** 1-2 天（实际完成时间：已完成）

---

### 3.6 重命名和移动简化 ✅ **已完成** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/RenameNoteCommand.ts`、`MoveNoteCommand.ts`、`RenameHeader.ts`、`MoveHeader.ts`

**简化计划：**
- 保留重命名和移动功能
- 简化重命名和移动的确认流程

**完成状态：**
- ✅ 重命名和移动的确认流程已经相当简化，只在批量操作时显示预览和确认
- ✅ 单个文件操作无需额外确认，流程已优化

**预计时间：** 1-2 天（实际完成时间：已完成）

---

### 3.7 归档系统简化 ✅ **已完成** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/ArchiveHierarchy.ts`

**简化计划：**
- 保留归档功能
- 简化归档流程

**完成状态：**
- ✅ 归档命令已经相当简化，主要代理到 `RefactorHierarchyCommandV2`
- ✅ 归档流程已优化，无需进一步简化

**预计时间：** 1 天（实际完成时间：已完成）

---

### 3.8 重构系统移除 ✅ **已删除** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/Refactor.ts`、`RefactorHierarchyV2.ts`、`ArchiveHierarchy.ts`

**删除状态：**
- ✅ 已删除 `Refactor.ts`（旧的重构命令）
- ✅ 已删除 `RefactorHierarchyV2.ts`（层次结构重构命令）
- ✅ 已删除 `ArchiveHierarchy.ts`（归档命令，依赖重构系统）
- ✅ 已从 `commands/index.ts` 中移除相关导入和注册
- ✅ 已从 `constants.ts` 中删除 `ARCHIVE_HIERARCHY` 和 `REFACTOR_HIERARCHY` 常量
- ✅ 已从 `package.json` 中删除相关命令定义和 keybindings

**说明：** 重构系统已完全移除。架构文档管理场景不需要批量重构功能，用户可以通过手动重命名和移动操作来管理文档结构。

**预计时间：** 1-2 天（实际完成时间：已完成）

---

### 3.9 配置系统简化 ✅ **已完成** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/ConfigureCommand.ts`、`ConfigureWithUICommand.ts`、`ConfigureLocalOverride.ts`、`packages/plugin-core/src/components/views/ConfigureUIPanelFactory.ts`

**简化计划：**
- 保留基础配置功能（`ConfigureCommand` - 打开配置文件）
- 保留本地覆盖配置（`ConfigureLocalOverride`）
- 删除复杂的配置 UI（`ConfigureWithUICommand`、`ConfigureUIPanelFactory`）

**完成状态：**
- ✅ 已删除 `ConfigureWithUICommand.ts`（UI配置命令）
- ✅ 已删除 `ConfigureUIPanelFactory.ts`（UI面板工厂）
- ✅ 已从 `_extension.ts` 中删除相关导入和命令注册
- ✅ 已从 `constants.ts` 中删除 `CONFIGURE_UI` 常量
- ✅ 已从 `package.json` 中删除相关命令定义和 keybindings
- ✅ 保留 `ConfigureCommand`（打开 YAML 配置文件）
- ✅ 保留 `ConfigureLocalOverride`（本地覆盖配置）

**说明：** 配置系统已简化，只保留基础的配置文件打开功能和本地覆盖配置。用户可以直接编辑 YAML 配置文件，无需复杂的 UI。

**预计时间：** 2-3 天（实际完成时间：已完成）

---

### 3.10 诊断系统简化 ✅ **已完成** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/DiagnosticsReport.ts`、`Doctor.ts`

**简化计划：**
- 保留基础诊断功能
- 简化诊断报告

**完成状态：**
- ✅ 诊断报告命令已经相当简化，只收集必要的日志和配置信息
- ✅ 诊断功能已优化，无需进一步简化

**预计时间：** 1-2 天（实际完成时间：已完成）

---

### 3.11 代码提供者删除 ✅ **已删除** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/features/completionProvider.ts`、`codeActionProvider.ts`

**删除状态：**
- ✅ `completionProvider` 已完全删除
- ✅ `codeActionProvider` 已完全删除
- ✅ 相关测试文件已删除
- ✅ 确认无残留引用

**说明：** 代码提供者（自动补全和代码操作）已完全移除，不再保留。架构文档管理场景不需要这些功能。

---

### 3.12 InsertNoteIndex 命令删除或简化 ⏳ **待删除** ⭐⭐ **低优先级**

**位置：** `packages/plugin-core/src/commands/InsertNoteIndex.ts`

**删除状态：** ✅ 已删除

---

## 四、待清理的内容

### 4.1 测试文件清理 ✅ **已完成** ⭐⭐ **低优先级**

**任务：**
1. ✅ 删除已删除功能的测试文件 - 已删除 `ConvertLink.test.ts`
2. ✅ 更新简化功能的测试用例 - 用户已删除所有测试文件
3. ✅ 清理无用的测试工具 - 用户已删除所有测试文件

**完成状态：**
- ✅ 已删除 `ConvertLink.test.ts`（ConvertLink 命令已删除）
- ✅ 用户已删除所有测试文件，无需进一步清理

**预计时间：** 2-3 天（实际完成时间：用户删除所有测试文件）

---

### 4.2 残留代码清理 ✅ **已完成** ⭐⭐ **低优先级**

**任务：**
1. ✅ 删除未使用的导入 - 已清理 Schema 相关导入和注释
2. ✅ 删除未使用的函数和类 - 已删除 `addSchemaCompletions` 方法
3. ✅ 删除注释掉的代码 - 已清理所有 Schema 相关注释
4. ✅ 清理 TODO 和 FIXME 注释 - 已更新相关注释中的品牌名称

**完成状态：**
- ✅ 已清理 `ReloadIndex.ts` 中的 Schema 相关注释
- ✅ 已清理 `workspace.ts` 中的 Schema 相关注释
- ✅ 已清理 `EngineAPIService.ts` 和 `EngineAPIServiceInterface.ts` 中的 Schema 相关注释
- ✅ 已清理 `NoteLookupProvider.ts` 中的 Schema 相关方法和注释
- ✅ 已清理 `NotePickerUtils.ts` 中的 Schema 相关参数和注释
- ✅ 已清理 `NoteLookupCommand.ts` 中的 Schema 相关注释
- ✅ 已清理 `ExtensionUtils.ts` 中的 Schema 相关注释
- ✅ 已清理 `DeleteCommand.ts` 和 `_extension.ts` 中的 Schema 相关注释
- ✅ 已更新注释中的品牌名称（Dendron → ArchiTool）

**预计时间：** 2-3 天（实际完成时间：1 天）

---

## 五、品牌替换任务

### 5.1 品牌替换（Dendron → ArchiTool）🔄 **部分完成** ⭐⭐⭐ **高优先级**

**目标：** 将所有用户可见的 "Dendron" 替换为 "ArchiTool"

**完成状态：**
- ✅ `package.json` 中的命令标题已大部分替换为 "ArchiTool"
- ✅ `workspaceActivator.ts` 中的工作区选择提示已替换
- ❌ 仍有部分用户可见消息未替换

#### 5.1.1 用户可见提示信息（高优先级）

**任务：**
1. 搜索并替换所有 `showInformationMessage`、`showWarningMessage`、`showErrorMessage` 中的文本
2. 替换所有 `showQuickPick` 中的 `title`、`label`、`placeholder`、`detail`
3. 替换 `package.json` 中的视图名称和描述

**已完成替换的位置：**
- ✅ `packages/plugin-core/src/WelcomeUtils.ts:38`
  - `"Welcome to Dendron"` → `"Welcome to ArchiTool"`
- ✅ `packages/plugin-core/src/survey.ts:498, 535`
  - `"Welcome to Dendron! 🌱"` → `"Welcome to ArchiTool! 🌱"`
- ✅ `packages/plugin-core/src/survey.ts:678`
  - `"Hey, we noticed you haven't used Dendron for a while..."` → `"Hey, we noticed you haven't used ArchiTool for a while..."`
- ✅ `packages/plugin-core/src/survey.ts:582, 654, 692`
  - `"Thanks for helping us make Dendron better 🌱"` → `"Thanks for helping us make ArchiTool better 🌱"`
- ✅ `packages/plugin-core/src/web/extension.ts` - 更新注释中的品牌名称
- ✅ `packages/plugin-core/src/web/commands/TogglePreviewCmd.ts` - 更新注释中的品牌名称
- ✅ `packages/plugin-core/src/commands/ConfigureLocalOverride.ts` - 更新配置描述
- ✅ `packages/plugin-core/src/features/DefinitionProvider.ts` - 更新注释中的品牌名称
- ✅ `packages/plugin-core/src/WorkspaceWatcher.ts` - 更新注释中的品牌名称

#### 5.1.2 开发者可见信息（中优先级）

**任务：**
1. 替换错误消息中的文本
2. 替换日志消息中的文本
3. 更新 `package.json` 中所有命令的 `title` 和 `description`

#### 5.1.3 内部代码（低优先级）

**任务：**
1. 类型名称（如 `DendronContext`、`DendronError` 等）→ `ArchiToolContext`、`ArchiToolError`
2. 变量名和函数名
3. 代码注释
4. 更新 README 文件

**预计时间：** 1-2 天

---

## 六、技术栈精简

### 6.1 Prisma ORM 删除 ✅ **已完成**

**位置：** `packages/engine-server/src/drivers/PrismaSQLiteMetadataStore.ts`、`prisma/` 目录

**删除状态：**
- ✅ 已删除 Prisma 相关代码
- ✅ 已删除 `prisma/` 目录
- ✅ 已删除 `prisma-shim.js`
- ✅ 已删除 `copyPrismaClient.js`
- ✅ 已迁移到 DuckDB + Knex.js

---

### 6.2 SQLite FTS5 删除 ✅ **已完成**

**位置：** `packages/engine-server/src/drivers/sqlite/tables/NotePropsFtsTableUtils.ts`

**删除状态：**
- ✅ 已从 `SqliteMetadataStore.query()` 中移除 FTS5 使用，改用 LIKE 搜索
- ✅ 已从 `SqliteDbFactory` 中移除 FTS5 表创建
- ✅ 已移除 `NotePropsFtsTableUtils` 的导入
- ✅ 已迁移到向量搜索（DuckDB）

---

### 6.3 包精简 ⏳ **待进行** ⭐⭐ **低优先级**

**目标：** 合并相关包，减少包数量

**当前包结构：**
- `common-all`、`common-server`、`common-frontend`、`common-test-utils`、`common-assets`
- `engine-server`、`engine-test-utils`
- `unified`
- `plugin-core`
- `dendron-viz`、`dendron-plugin-views`

**精简计划：**
- 合并 `common-*` 包
- 合并 `engine-*` 包
- 评估 `dendron-viz` 和 `dendron-plugin-views` 的合并可能性

**预计时间：** 5-7 天

**详细分析：** 见 `PACKAGE_SIMPLIFICATION_ANALYSIS.md`

---

## 七、实施优先级

### 7.1 高优先级任务（立即执行）

1. **Schema 系统删除和文件系统重构**（10-15 天）⭐⭐⭐⭐
   - ✅ **阶段一已完成**（2025-11-21）：Schema 系统已完全删除
   - ⏳ **阶段二待完成**：移除点分隔文件名层级结构
   - ⏳ **阶段三待完成**：重构为真实文件夹结构，使用 VSCode 原生 API
   - ⏳ **阶段四待完成**：元数据存储（按需实现）
   - 需要分阶段实施，充分测试

2. **品牌替换完成**（1-2 天）⭐⭐⭐
   - 用户可见消息需要尽快替换
   - 影响用户体验

### 7.2 中优先级任务（近期执行）

1. **Git 自动集成功能删除**（2-3 天）⭐⭐⭐ ✅ **已完成**
2. **遥测系统删除或简化**（1-2 天）⭐⭐ ✅ **已完成**
3. **迁移和升级相关功能删除**（1-2 天）⭐⭐ ✅ **已完成**
4. **Lookup 系统简化**（13-20 天）⭐⭐⭐
5. **导航和索引功能简化**（3-5 天）⭐⭐⭐ ✅ **已完成**
6. **预览系统简化**（2-3 天）⭐⭐⭐ ✅ **已完成**
7. **图形视图简化**（2-3 天）⭐⭐⭐ ✅ **已删除**

### 7.3 低优先级任务（后续执行）

1. **链接系统简化**（1-2 天）⭐⭐ ✅ **已完成**
2. **重命名和移动简化**（1-2 天）⭐⭐ ✅ **已完成**
3. **归档系统简化**（1 天）⭐⭐ ✅ **已完成**
4. **重构系统简化**（1-2 天）⭐⭐ ✅ **已删除**
5. **配置系统简化**（2-3 天）⭐⭐ ✅ **已完成**
6. **诊断系统简化**（1-2 天）⭐⭐ ✅ **已完成**
7. **代码提供者简化**（1-2 天）⭐⭐
8. **测试文件清理**（2-3 天）⭐⭐
9. **残留代码清理**（2-3 天）⭐⭐
10. **包精简**（5-7 天）⭐⭐

---

## 八、总结

### 8.1 已完成精简统计

- **已删除系统：** 14+ 个（Pods、Publishing、Seeds、Hooks、Traits、Journal、Meeting Notes、Scratch Notes、Random Note、Snapshot、Backup、**Schema**、**遥测系统**、**迁移系统**、**图形视图** 等）
- **已删除命令：** 70+ 个（包括 Schema 相关命令、RunMigrationCommand、UpgradeSettingsCommand、ConvertLink、ConvertCandidateLink、图形视图相关命令等）
- **已删除包：** 6-8 个（pods-core、nextjs-template、generator-dendron、api-server、dendron-cli 等）
- **技术栈精简：** Prisma ORM、SQLite FTS5、**SQLite 驱动**已删除
- **新实施系统：** 统一模板系统（整合 Seeds 和 Hooks 功能）
- **代码删除量：** 
  - Schema 系统删除约 20,000+ 行代码（2025-11-21）
  - 遥测系统和迁移系统删除约 3,000+ 行代码（2025-11-21）
  - 图形视图系统删除约 1,000+ 行代码（2025-11-21）
  - 链接系统简化删除约 500+ 行代码（2025-11-21）

### 8.2 待完成精简统计

- **待删除系统：** 0 个（所有待删除系统已完成）
- **待重构系统：** 1 个（文件系统：从点分隔文件名改为真实文件夹结构 - 阶段四：元数据存储按需实现）
- **待简化功能：** 1 个（Lookup 系统简化 - 13-20 天）
- **待实施系统：** 0 个
- **待清理内容：** 测试文件、残留代码（进行中）
- **品牌替换：** 部分完成，仍需替换部分错误消息和日志消息

### 8.3 预计收益

- **代码量减少：** 已减少约 20,000+ 行（Schema 系统），预计总减少 45-55%
- **包数量减少：** 已减少 6-8 个包
- **命令数量减少：** 已减少 60+ 个命令，预计总减少 70-90 个命令
- **维护成本降低：** 减少维护复杂度、测试工作量、文档更新工作量
- **用户体验提升：** 更聚焦的功能、更简洁的界面、更快的加载速度

---

## 九、参考文档

- `EXPECTED_ARCHITECTURE_DESIGN.md` - 期望架构设计（包含数据库层重构技术实现）
- **注意：** 以下文档已整合到本文档或已删除：
  - `TEMPLATE_SYSTEM_GUIDE.md` - 统一模板系统使用指南（已整合到本文档 1.1.6 节）
  - `VIEWPOINT_VIEW_IMPLEMENTATION_PLAN.md` - 视点视图系统实施计划（已删除，任务已从计划中移除）
  - `CODE_REFACTORING_ANALYSIS.md` - 代码重构分析报告（已删除）
  - `PENDING_REFACTORING_TASKS.md` - 待执行重构任务（已删除）
  - `PACKAGE_SIMPLIFICATION_ANALYSIS.md` - 包精简分析（已删除）
  - `LOOKUP_SIMPLIFICATION_PLAN.md` - Lookup 系统简化计划（已删除）

---

**文档生成时间：** 2025-11-21
**最后更新：** 2025-11-21（更新任务完成状态：图形视图已删除，链接系统、导航、预览、重构、配置、诊断系统简化已完成，残留代码清理已完成，品牌替换部分完成）

