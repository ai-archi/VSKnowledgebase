# Shared 模块重构计划

## 一、当前架构分析

### 1.1 现状问题

#### Shared 模块
- **位置**: `apps/extension/src/modules/shared/`
- **当前职责**: 
  - Application层：提供应用服务（ArtifactTreeApplicationService, ArtifactFileSystemApplicationService, VaultApplicationService）
  - Domain层：领域模型和错误定义
  - Infrastructure层：存储适配器（文件系统、Git、SQLite等）
- **缺失**: 缺少通用视图能力和领域服务

#### Document 模块
- **位置**: `apps/extension/src/modules/document/`
- **当前实现**:
  - `DocumentTreeViewProvider`: 271行，包含完整的树视图逻辑
  - `DocumentCommands`: 788行，包含文件操作、文件夹操作、删除、展开/折叠等逻辑
  - `DocumentApplicationService`: 89行，对ArtifactFileSystemApplicationService的简单封装
- **问题**:
  - 树视图逻辑与Template模块高度重复
  - 命令处理逻辑包含大量通用操作（创建文件、文件夹、删除等）
  - 路径计算、验证等工具逻辑分散在Commands中

#### Template 模块
- **位置**: `apps/extension/src/modules/template/`
- **当前实现**:
  - `TemplateTreeDataProvider`: 192行，树视图逻辑
  - `TemplateCommands`: 129行，主要是模板特定逻辑
  - `TemplateApplicationService`: 615行，模板业务逻辑
- **问题**:
  - 树视图逻辑与Document模块高度重复
  - 缺少通用文件操作命令（创建、删除等）

### 1.2 重复代码统计

| 功能 | Document | Template | 重复度 |
|------|----------|----------|--------|
| 树视图提供者 | 271行 | 192行 | ~70% |
| 文件操作命令 | 788行 | 129行 | ~60% |
| 路径计算逻辑 | 分散 | 分散 | 100% |
| 树视图工具方法 | 分散 | 无 | - |

## 二、目标架构设计（DDD分层）

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Interface Layer                       │
│  (视图适配器 - 只负责视图展示和命令编排)                    │
│  - BaseArtifactTreeViewProvider                          │
│  - BaseFileTreeCommands                                  │
│  - BaseArtifactTreeItem                                  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Application Layer                        │
│  (应用服务 - 用例编排，已存在)                            │
│  - ArtifactTreeApplicationService                        │
│  - ArtifactFileSystemApplicationService                  │
│  - VaultApplicationService                              │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Domain Layer                          │
│  (领域服务 - 业务逻辑)                                    │
│  - FileTreeDomainService                                 │
│  - FileOperationDomainService                            │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Infrastructure Layer                       │
│  (基础设施 - 技术能力)                                    │
│  - utils/PathUtils                                        │
│  - utils/TreeViewUtils                                    │
│  - storage/ (文件系统、Git、SQLite适配器)                  │
└─────────────────────────────────────────────────────────┘
```

### 2.2 目录结构规划

```
shared/
├── application/              # 应用服务层（已存在，保持不变）
│   ├── ArtifactTreeApplicationService.ts
│   ├── ArtifactFileSystemApplicationService.ts
│   └── VaultApplicationService.ts
│
├── domain/                   # 领域层
│   ├── services/            # 新增：领域服务
│   │   ├── FileTreeDomainService.ts
│   │   ├── FileOperationDomainService.ts
│   │   └── index.ts
│   ├── artifact.ts          # 已存在
│   ├── errors.ts            # 已存在
│   └── ...
│
├── infrastructure/           # 基础设施层
│   ├── utils/               # 新增：基础设施工具
│   │   ├── PathUtils.ts
│   │   ├── TreeViewUtils.ts
│   │   └── index.ts
│   └── storage/             # 已存在
│       ├── file/
│       ├── git/
│       └── sqlite/
│
└── interface/               # 新增：接口适配器层
    ├── tree/                # 树视图相关
    │   ├── BaseArtifactTreeItem.ts
    │   ├── BaseArtifactTreeViewProvider.ts
    │   └── index.ts
    ├── commands/            # 命令处理相关
    │   ├── BaseFileTreeCommands.ts
    │   └── index.ts
    └── index.ts
```

## 三、各层职责定义

### 3.1 Infrastructure Layer（基础设施层）

**职责**: 提供底层技术能力，不包含业务逻辑

#### PathUtils
- 路径验证（validateFileName）
- 路径规范化（normalizePath, removeRootDirPrefix）
- 路径操作（join, dirname, basename, getFileExtension）

#### TreeViewUtils
- VSCode TreeView 底层操作
- 节点查找（findTreeItem）
- 节点展开/折叠（expandAll, collapseAll, expandNode）

**特点**: 
- 纯函数或静态方法
- 不依赖业务领域模型
- 可被任何层调用

### 3.2 Domain Layer（领域层）

**职责**: 包含业务逻辑，处理领域规则

#### FileTreeDomainService
- **职责**: 文件树相关的业务逻辑
- **方法**:
  - `calculateTargetPath()`: 根据上下文计算目标路径（业务规则）
  - `validateFileOperation()`: 验证文件操作是否允许（业务规则）
  - `getFileTreeStructure()`: 获取文件树结构（业务逻辑）

#### FileOperationDomainService
- **职责**: 文件操作相关的业务逻辑
- **方法**:
  - `validateVaultForOperation()`: 验证Vault是否可操作（业务规则）
  - `determineFileType()`: 根据路径确定文件类型（业务规则）
  - `generateDefaultContent()`: 生成默认文件内容（业务规则）

**特点**:
- 包含业务规则和领域逻辑
- 可调用Infrastructure层的工具
- 不依赖VSCode API
- 可被Application层和Interface层调用

### 3.3 Application Layer（应用服务层）

**职责**: 用例编排，协调领域服务和基础设施

**现状**: 已存在，保持不变
- `ArtifactTreeApplicationService`: 文件树操作
- `ArtifactFileSystemApplicationService`: Artifact CRUD
- `VaultApplicationService`: Vault管理

**特点**:
- 编排多个领域服务
- 处理事务边界
- 返回Result类型

### 3.4 Interface Layer（接口适配器层）

**职责**: 视图展示和命令编排，不包含业务逻辑

#### BaseArtifactTreeItem
- **职责**: 基础树项类，定义通用属性
- **属性**:
  - `vaultName`, `vaultId`
  - `folderPath`, `filePath`
  - `contextValue`
- **方法**:
  - `isVault()`, `isFolder()`, `isFile()`

#### BaseArtifactTreeViewProvider
- **职责**: 通用树视图提供者，只负责视图展示
- **方法**:
  - `getChildren()`: 调用Application服务获取数据，转换为TreeItem
  - `getTreeItem()`: 返回TreeItem
  - `refresh()`: 刷新视图
  - `findTreeItem()`: 查找节点（调用Infrastructure工具）
- **抽象方法**（子类实现）:
  - `getRootDirectory()`: 返回根目录（'artifacts' 或 'templates'）
  - `createTreeItem()`: 创建特定类型的TreeItem
  - `getItemContextValue()`: 获取上下文值
  - `getItemIcon()`: 获取图标

#### BaseFileTreeCommands
- **职责**: 通用文件操作命令，只负责命令编排
- **方法**:
  - `registerRefreshCommand()`: 注册刷新命令
  - `registerExpandAllCommand()`: 注册展开所有命令
  - `registerCollapseAllCommand()`: 注册折叠所有命令
  - `registerCreateFileCommand()`: 注册创建文件命令
  - `registerCreateFolderCommand()`: 注册创建文件夹命令
  - `registerDeleteCommand()`: 注册删除命令
- **抽象方法**（子类实现）:
  - `getTreeViewProvider()`: 获取树视图提供者
  - `getVaultService()`: 获取Vault服务
  - `getTreeService()`: 获取树服务
  - `getFileOperationService()`: 获取文件操作服务
  - `handleCreateSuccess()`: 处理创建成功后的业务逻辑
  - `handleDelete()`: 处理删除的业务逻辑

**特点**:
- 只负责视图展示和命令编排
- 调用Application服务获取数据
- 调用Domain服务处理业务逻辑
- 调用Infrastructure工具处理技术细节
- 不包含具体业务逻辑

## 四、重构步骤

### 阶段一：创建基础设施层工具（Infrastructure）

**目标**: 提取底层技术能力

1. **创建 PathUtils**
   - 从DocumentCommands中提取路径相关方法
   - 提供纯函数式的路径操作

2. **创建 TreeViewUtils**
   - 从DocumentCommands和DocumentTreeViewProvider中提取树视图操作
   - 提供VSCode TreeView的底层操作能力

**验证**: 工具类可独立使用，不依赖业务逻辑

### 阶段二：创建领域服务（Domain）

**目标**: 提取业务逻辑

1. **创建 FileTreeDomainService**
   - 提取路径计算业务逻辑（calculateTargetPath）
   - 提取文件树结构处理逻辑

2. **创建 FileOperationDomainService**
   - 提取文件操作验证逻辑
   - 提取文件类型判断逻辑
   - 提取默认内容生成逻辑

**验证**: 领域服务包含业务规则，可被测试

### 阶段三：创建接口适配器基类（Interface）

**目标**: 提供通用视图能力

1. **创建 BaseArtifactTreeItem**
   - 定义通用属性
   - 提供通用判断方法

2. **创建 BaseArtifactTreeViewProvider**
   - 实现通用树视图逻辑
   - 定义抽象方法供子类实现

3. **创建 BaseFileTreeCommands**
   - 实现通用命令处理逻辑
   - 定义抽象方法供子类实现

**验证**: 基类可被继承，子类只需实现少量方法

### 阶段四：重构Document模块

**目标**: 使用基类，移除重复代码

1. **重构 DocumentTreeItem**
   - 继承BaseArtifactTreeItem
   - 添加文档特定属性（artifact）

2. **重构 DocumentTreeViewProvider**
   - 继承BaseArtifactTreeViewProvider
   - 实现抽象方法（getRootDirectory: 'artifacts'）
   - 移除重复的树视图逻辑

3. **重构 DocumentCommands**
   - 继承BaseFileTreeCommands
   - 实现抽象方法
   - 移除通用命令处理逻辑
   - 保留文档特定命令（如addDiagram）

**验证**: 
- 代码量减少60%以上
- 功能保持不变
- 测试通过

### 阶段五：重构Template模块

**目标**: 使用基类，添加缺失功能

1. **重构 TemplateTreeItem**
   - 继承BaseArtifactTreeItem
   - 保持模板特定属性

2. **重构 TemplateTreeDataProvider**
   - 继承BaseArtifactTreeViewProvider
   - 实现抽象方法（getRootDirectory: 'templates'）
   - 移除重复的树视图逻辑

3. **扩展 TemplateCommands**
   - 继承BaseFileTreeCommands（可选，如果模板需要文件操作）
   - 保留模板特定命令（createFromTemplate）

**验证**:
- 代码量减少50%以上
- 功能保持不变或增强
- 测试通过

### 阶段六：更新依赖注入和注册

**目标**: 注册新服务，更新main.ts

1. **更新 DI 容器**
   - 注册FileTreeDomainService
   - 注册FileOperationDomainService

2. **更新 main.ts**
   - 注入领域服务
   - 更新Document和Template模块的初始化

**验证**: 应用正常启动，功能正常

### 阶段七：清理和优化

**目标**: 代码清理和文档完善

1. **删除重复代码**
2. **更新注释和文档**
3. **代码审查和优化**

## 五、Document视图适配方案

### 5.1 DocumentTreeItem适配

**当前**:
```typescript
class DocumentTreeItem extends vscode.TreeItem {
  artifact?: Artifact;
  vaultName?: string;
  folderPath?: string;
  filePath?: string;
  vaultId?: string;
}
```

**适配后**:
```typescript
class DocumentTreeItem extends BaseArtifactTreeItem {
  artifact?: Artifact;  // 文档特定属性
  
  // 继承的属性：
  // vaultName, vaultId, folderPath, filePath
  // isVault(), isFolder(), isFile()
}
```

### 5.2 DocumentTreeViewProvider适配

**当前**: 271行，包含完整树视图逻辑

**适配后**:
```typescript
class DocumentTreeViewProvider extends BaseArtifactTreeViewProvider<DocumentTreeItem> {
  // 只需实现抽象方法
  protected getRootDirectory(): string {
    return 'artifacts';
  }
  
  protected createTreeItem(...): DocumentTreeItem {
    // 创建DocumentTreeItem
  }
  
  protected getItemContextValue(item: DocumentTreeItem): string {
    // 返回上下文值
  }
  
  // 可选：覆盖特定逻辑
  protected async enhanceFileItem(item: DocumentTreeItem, node: FileTreeNode): Promise<void> {
    // 文档特定的增强逻辑（如设置artifact）
  }
}
```

**代码减少**: 从271行减少到约50-80行

### 5.3 DocumentCommands适配

**当前**: 788行，包含大量通用逻辑

**适配后**:
```typescript
class DocumentCommands extends BaseFileTreeCommands<DocumentTreeItem> {
  // 实现抽象方法
  protected getTreeViewProvider(): DocumentTreeViewProvider { }
  protected getVaultService(): VaultApplicationService { }
  protected getTreeService(): ArtifactTreeApplicationService { }
  protected getFileOperationService(): ArtifactFileSystemApplicationService { }
  
  // 实现业务特定逻辑
  protected async handleCreateSuccess(...): Promise<void> {
    // 文档特定的成功处理
  }
  
  // 保留文档特定命令
  register(commandAdapter: CommandAdapter): void {
    super.register(commandAdapter);  // 注册通用命令
    
    // 注册文档特定命令
    commandAdapter.registerCommand('archi.document.addDiagram', ...);
  }
}
```

**代码减少**: 从788行减少到约150-200行

## 六、Template视图适配方案

### 6.1 TemplateTreeItem适配

**当前**:
```typescript
class TemplateTreeItem extends vscode.TreeItem {
  vaultName?: string;
  filePath?: string;
}
```

**适配后**:
```typescript
class TemplateTreeItem extends BaseArtifactTreeItem {
  // 继承的属性已足够
  // vaultName, vaultId, folderPath, filePath
}
```

### 6.2 TemplateTreeDataProvider适配

**当前**: 192行，包含完整树视图逻辑

**适配后**:
```typescript
class TemplateTreeDataProvider extends BaseArtifactTreeViewProvider<TemplateTreeItem> {
  // 只需实现抽象方法
  protected getRootDirectory(): string {
    return 'templates';
  }
  
  protected createTreeItem(...): TemplateTreeItem {
    // 创建TemplateTreeItem
  }
  
  protected getItemContextValue(item: TemplateTreeItem): string {
    // 返回上下文值（'template.file', 'template.directory'）
  }
}
```

**代码减少**: 从192行减少到约40-60行

### 6.3 TemplateCommands适配

**当前**: 129行，主要是模板特定逻辑

**适配后**:
```typescript
class TemplateCommands {
  // 保持模板特定逻辑不变
  // 如果需要文件操作功能，可以继承BaseFileTreeCommands
  // 但当前模板模块可能不需要通用文件操作
}
```

**可选增强**: 如果模板需要文件操作（创建、删除模板文件），可以继承BaseFileTreeCommands

## 七、依赖注入调整

### 7.1 新增DI类型

在`infrastructure/di/types.ts`中添加：

```typescript
export const TYPES = {
  // ... 现有类型
  
  // Domain Services
  FileTreeDomainService: Symbol.for('FileTreeDomainService'),
  FileOperationDomainService: Symbol.for('FileOperationDomainService'),
};
```

### 7.2 注册领域服务

在`infrastructure/di/container.ts`中注册：

```typescript
// 注册领域服务
container.bind<FileTreeDomainService>(TYPES.FileTreeDomainService)
  .to(FileTreeDomainServiceImpl)
  .inSingletonScope();

container.bind<FileOperationDomainService>(TYPES.FileOperationDomainService)
  .to(FileOperationDomainServiceImpl)
  .inSingletonScope();
```

### 7.3 更新main.ts

```typescript
// 获取领域服务
const fileTreeDomainService = container.get<FileTreeDomainService>(
  TYPES.FileTreeDomainService
);
const fileOperationDomainService = container.get<FileOperationDomainService>(
  TYPES.FileOperationDomainService
);

// 注入到DocumentCommands
const documentCommands = new DocumentCommands(
  documentService,
  artifactService,
  vaultService,
  fileTreeDomainService,      // 新增
  fileOperationDomainService,  // 新增
  logger,
  context,
  documentTreeViewProvider,
  documentTreeView,
  webviewRPC.getAdapter()
);
```

## 八、迁移路径

### 8.1 向后兼容性

**本项目是新项目，不需要考虑向下兼容**，可以直接重构。

### 8.2 迁移策略

1. **增量迁移**: 按阶段逐步迁移，每个阶段完成后验证功能
2. **保留原文件**: 重构过程中保留原文件作为参考
3. **测试验证**: 每个阶段完成后进行功能测试

### 8.3 风险控制

1. **功能回归**: 每个阶段完成后进行完整功能测试
2. **性能影响**: 监控重构后的性能，确保无退化
3. **代码审查**: 每个阶段完成后进行代码审查

## 九、预期收益

### 9.1 代码量减少

| 模块 | 重构前 | 重构后 | 减少 |
|------|--------|--------|------|
| DocumentTreeViewProvider | 271行 | ~80行 | 70% |
| DocumentCommands | 788行 | ~200行 | 75% |
| TemplateTreeDataProvider | 192行 | ~60行 | 69% |
| **总计** | **1251行** | **~340行** | **73%** |

### 9.2 可维护性提升

1. **单一职责**: 每层职责清晰，易于理解
2. **可复用性**: 通用能力可在其他视图模块复用
3. **可测试性**: 领域服务可独立测试
4. **可扩展性**: 新增视图模块只需继承基类

### 9.3 架构优化

1. **符合DDD**: 清晰的分层架构
2. **依赖方向**: 依赖方向正确（Interface → Application → Domain → Infrastructure）
3. **业务逻辑集中**: 业务逻辑集中在Domain层，便于后续整合元数据、缓存等

## 十、后续扩展

### 10.1 其他视图模块

- Task视图：可复用BaseArtifactTreeViewProvider
- Viewpoint视图：可复用BaseArtifactTreeViewProvider
- 未来新增视图：只需继承基类

### 10.2 功能增强

- **元数据整合**: 在Domain层添加元数据处理逻辑
- **缓存机制**: 在Infrastructure层添加缓存适配器
- **文件监听**: 在Domain层添加文件变更监听逻辑
- **批量操作**: 在Domain层添加批量操作逻辑

### 10.3 性能优化

- **懒加载**: 在BaseArtifactTreeViewProvider中实现懒加载
- **虚拟滚动**: 在Infrastructure层添加虚拟滚动支持
- **增量更新**: 在Domain层添加增量更新逻辑

## 十一、实施时间估算

| 阶段 | 任务 | 预估时间 |
|------|------|----------|
| 阶段一 | 创建Infrastructure工具 | 2小时 |
| 阶段二 | 创建Domain服务 | 3小时 |
| 阶段三 | 创建Interface基类 | 4小时 |
| 阶段四 | 重构Document模块 | 4小时 |
| 阶段五 | 重构Template模块 | 2小时 |
| 阶段六 | 更新DI和注册 | 1小时 |
| 阶段七 | 清理和优化 | 2小时 |
| **总计** | | **18小时** |

## 十二、验收标准

1. **功能完整性**: 所有原有功能正常工作
2. **代码质量**: 代码量减少70%以上，无重复代码
3. **架构合规**: 符合DDD分层架构，依赖方向正确
4. **测试通过**: 所有测试用例通过
5. **文档完善**: 代码注释和文档完善

