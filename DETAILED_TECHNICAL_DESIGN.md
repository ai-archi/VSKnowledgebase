# ArchiTool 详细技术设计文档

本文档提供 ArchiTool 项目的详细技术实现设计，作为 `EXPECTED_ARCHITECTURE_DESIGN.md` 的补充，包含完整的类型定义、API 接口、实现细节等。

---

## 目录

0. [技术栈说明](#零技术栈说明)
1. [类型定义](#一类型定义)
2. [API 接口详细签名](#二api-接口详细签名)
3. [依赖注入设计](#三依赖注入设计)
4. [错误处理实现](#四错误处理实现)
5. [测试策略](#五测试策略)
6. [代码示例](#六代码示例)
7. [数据验证规则](#七数据验证规则)
8. [性能优化细节](#八性能优化细节)

---

## 零、技术栈说明

### 0.1 核心技术栈

**编程语言和运行时**：
- **TypeScript**：主要编程语言，提供类型安全
- **Node.js**：运行时环境，VSCode Extension 运行在 Node.js 中

**平台和框架**：
- **VSCode Extension API**：插件核心能力（Commands、TreeView、Webview）
- **MCP Server**：进程内 MCP Server，提供 AI 工具接口

**前端框架**：
- **Vue 3**：Webview 前端框架（文档视图、视点视图、任务视图、模板视图等）
- **Vite**：前端构建工具和开发服务器
- **Pinia**：全局状态管理（Vue 3 官方推荐）

**数据库和存储**：
- **DuckDB**：运行时数据库，用于向量搜索索引、运行时缓存、性能优化
- **YAML**：持久化存储格式（元数据、配置、链接、任务、视点等）
- **Markdown**：内容文件格式（文档内容）

**依赖注入和工具**：
- **InversifyJS**：DI 容器，提供类型安全的依赖注入
- **Knex.js**：SQL 查询构建器，用于 DuckDB 查询
- **@xenova/transformers**：向量嵌入模型（纯 JavaScript，无需 Python）

**测试框架**：
- **Jest**：单元测试和集成测试框架
- **@testing-library/vscode**：VSCode 扩展测试工具

**包管理**：
- **pnpm**：包管理器，使用 workspace 管理 monorepo

**详细技术栈说明**：详见 `TECH_STACK_SUMMARY.md`。

---

## 一、类型定义

### 1.1 基础类型

```typescript
// 视图类型
export type ArtifactViewType = 'document' | 'design' | 'development' | 'test';

// 状态类型
export type ArtifactStatus = 'draft' | 'review' | 'published' | 'archived';

// 节点类型
export type ArtifactNodeType = 'FILE' | 'DIRECTORY';

// 链接类型
export type LinkType = 
  | 'implements'    // 实现关系
  | 'references'    // 引用关系
  | 'depends_on'    // 依赖关系
  | 'related_to'    // 相关关系
  | 'validates'     // 验证关系
  | 'tests';        // 测试关系

// 链接强度
export type LinkStrength = 'strong' | 'medium' | 'weak';

// 目标类型
export type TargetType = 'artifact' | 'code' | 'file' | 'component' | 'external';

// 变更类型
export type ChangeType = 'CREATE' | 'UPDATE' | 'DELETE' | 'RENAME' | 'MOVE';

// 文档内链接类型
export type ArtifactLinkInfoType = 'wikilink' | 'ref' | 'external';
```

### 1.2 核心实体类型

#### 1.2.1 Artifact

```typescript
/**
 * Artifact 核心实体
 * 架构管理的统一抽象，替代原有的 Note 概念
 */
export interface Artifact {
  // 核心标识
  id: string; // UUID，全局唯一
  vault: VaultReference;
  
  // 文件属性
  nodeType: ArtifactNodeType;
  path: string; // 相对路径，如 "documents/requirements/user-login.md"
  name: string; // 文件名，如 "user-login"
  format: string; // 文件格式，如 "md", "puml", "mermaid"
  contentLocation: string; // 完整文件系统路径
  
  // 分类与视图
  viewType: ArtifactViewType;
  category?: string; // 分类，如 "requirement", "architecture", "standard"
  
  // 内容属性
  title: string;
  description?: string;
  body?: string; // 内容体，可选（大文件不加载到内存）
  contentHash?: string; // 内容哈希，用于变更检测
  
  // 元数据引用
  metadataId?: string; // 关联的元数据 ID
  
  // 时间戳
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
  
  // 版本与状态
  version?: string; // 版本号
  status: ArtifactStatus;
  
  // 扩展属性
  tags?: string[]; // 标签数组
  custom?: Record<string, any>; // 自定义属性
}
```

#### 1.2.2 VaultReference

```typescript
/**
 * Vault 引用
 * 用于在 Artifact 中引用所属的 Vault
 */
export interface VaultReference {
  id: string; // Vault ID
  name: string; // Vault 名称
}
```

#### 1.2.3 ArtifactMetadata

```typescript
/**
 * ArtifactMetadata 值对象
 * 存储 Artifact 的扩展元数据，与 Artifact 分离存储
 */
export interface ArtifactMetadata {
  // 标识信息
  id: string; // 元数据 ID
  artifactId: string; // 关联的 Artifact ID
  vaultId: string; // 所属 Vault ID
  vaultName: string; // 所属 Vault 名称
  
  // 类型与分类
  type?: string; // 类型
  category?: string; // 分类
  
  // 标签
  tags?: string[]; // 标签数组，用于视点视图和搜索
  
  // 文档内链接
  links?: ArtifactLinkInfo[]; // 文档内的链接：wikilinks, refs, external
  
  // 显式关联关系
  relatedArtifacts?: string[]; // 关联的 Artifact ID 列表
  relatedCodePaths?: string[]; // 关联的代码路径
  relatedComponents?: string[]; // 架构组件 ID 列表
  
  // 作者与权限
  author?: string; // 作者
  owner?: string; // 所有者
  reviewers?: string[]; // 评审者列表
  
  // 扩展属性
  properties?: Record<string, any>; // 扩展属性，JSON 格式
  
  // 时间戳
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}
```

#### 1.2.4 ArtifactLinkInfo

```typescript
/**
 * ArtifactLinkInfo
 * 存储在 ArtifactMetadata 中的链接信息
 */
export interface ArtifactLinkInfo {
  type: ArtifactLinkInfoType; // 链接类型：wikilink/ref/external
  target: string; // 目标路径或 ID
  alias?: string; // 链接别名，可选
  position?: { // 链接位置，可选
    line: number; // 行号
    column: number; // 列号
  };
}
```

#### 1.2.5 ArtifactLink

```typescript
/**
 * ArtifactLink 实体
 * 基于 Artifact 的关系特化，用于表达 Artifact 之间的关系
 */
export interface ArtifactLink {
  // 链接标识
  id: string; // 链接 ID，UUID
  sourceArtifactId: string; // 源 Artifact ID
  
  // 目标信息
  targetType: TargetType; // 目标类型：artifact/code/file/component/external
  targetId?: string; // 目标 ID
  targetPath?: string; // 目标路径
  targetUrl?: string; // 目标 URL
  
  // 关系类型
  linkType: LinkType; // 链接类型
  description?: string; // 关系描述
  strength?: LinkStrength; // 关系强度
  
  // 代码位置
  codeLocation?: CodeLocation; // 代码位置信息
  
  // Vault 信息
  vaultId: string; // 所属 Vault ID
  
  // 时间戳
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}
```

#### 1.2.6 CodeLocation

```typescript
/**
 * CodeLocation
 * 代码位置信息
 */
export interface CodeLocation {
  file: string; // 文件路径
  line: number; // 行号
  column: number; // 列号
  range?: { // 代码范围，可选
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}
```

#### 1.2.7 Vault

```typescript
/**
 * Vault 实体
 * 内容组织和隔离的逻辑概念
 */
export interface Vault {
  // 标识信息
  id: string; // Vault ID
  name: string; // Vault 名称
  
  // 描述信息
  description?: string; // Vault 描述
  
  // Git 集成
  remote?: RemoteEndpoint; // Git 远程仓库，可选
  selfContained: boolean; // 是否自包含
  
  // 只读标志
  readOnly: boolean; // Git Vault 为 true，本地 Vault 为 false
}
```

#### 1.2.8 RemoteEndpoint

```typescript
/**
 * RemoteEndpoint
 * 远程仓库配置
 */
export interface RemoteEndpoint {
  url: string; // Git 仓库 URL
  branch: string; // 分支名称，默认：main/master
  sync: 'auto' | 'manual'; // 同步策略
}
```

#### 1.2.9 ArtifactChange

```typescript
/**
 * ArtifactChange 实体
 * 变更记录
 */
export interface ArtifactChange {
  changeId: string; // 变更 ID
  artifactId: string; // Artifact ID
  changeType: ChangeType; // 变更类型
  description?: string; // 变更描述
  diffSummary?: string; // 变更摘要
  author?: string; // 作者
  timestamp: string; // 时间戳，ISO 8601 格式
  impactedArtifacts?: string[]; // 受影响的 Artifact ID 列表
  gitCommitHash?: string; // 关联的 Git commit
}
```

### 1.3 工具类型

```typescript
/**
 * Result 类型
 * 函数式错误处理
 */
export type Result<T, E extends ArchiToolError> = 
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * 可选类型
 */
export type Optional<T> = T | undefined;

/**
 * 部分更新类型
 */
export type PartialUpdate<T> = Partial<Pick<T, Exclude<keyof T, 'id' | 'createdAt'>>>;

/**
 * 查询选项
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

## 二、API 接口详细签名

### 2.1 ArtifactFileSystemApplicationService

```typescript
/**
 * Artifact 文件系统应用服务
 * 提供 Artifact 的创建、删除、更新、移动、查询等核心功能
 */
export interface ArtifactFileSystemApplicationService {
  /**
   * 创建 Artifact
   * @param opts 创建选项
   * @returns 创建的 Artifact
   * @throws ArtifactError 如果 Vault 为只读、路径已存在、输入无效等
   */
  createArtifact(opts: {
    vault: VaultReference;
    viewType: ArtifactViewType;
    category?: string;
    path: string;
    title: string;
    content?: string;
    format?: string;
    tags?: string[];
    templateId?: string; // 可选：从模板创建
  }): Promise<Result<Artifact, ArtifactError>>;

  /**
   * 删除 Artifact
   * @param artifactId Artifact ID
   * @returns void
   * @throws ArtifactError 如果 Artifact 不存在、Vault 为只读等
   */
  deleteArtifact(artifactId: string): Promise<Result<void, ArtifactError>>;

  /**
   * 更新 Artifact 内容
   * @param artifactId Artifact ID
   * @param updates 更新内容
   * @returns 更新后的 Artifact
   * @throws ArtifactError 如果 Artifact 不存在、Vault 为只读等
   */
  updateArtifact(
    artifactId: string,
    updates: PartialUpdate<Artifact>
  ): Promise<Result<Artifact, ArtifactError>>;

  /**
   * 移动/重命名 Artifact
   * @param artifactId Artifact ID
   * @param newPath 新路径
   * @returns 更新后的 Artifact
   * @throws ArtifactError 如果源不存在、目标已存在、Vault 为只读等
   */
  moveArtifact(
    artifactId: string,
    newPath: string
  ): Promise<Result<Artifact, ArtifactError>>;

  /**
   * 获取 Artifact 列表
   * @param opts 查询选项
   * @returns Artifact 列表
   */
  listArtifacts(opts?: {
    vaultId?: string;
    viewType?: ArtifactViewType;
    category?: string;
    tags?: string[];
    status?: ArtifactStatus;
    query?: QueryOptions;
  }): Promise<Result<Artifact[], ArtifactError>>;

  /**
   * 获取 Artifact 详情
   * @param artifactId Artifact ID
   * @returns Artifact 详情
   * @throws ArtifactError 如果 Artifact 不存在
   */
  getArtifact(artifactId: string): Promise<Result<Artifact, ArtifactError>>;

  /**
   * 获取 Artifact 元数据
   * @param artifactId Artifact ID
   * @returns Artifact 元数据
   * @throws ArtifactError 如果 Artifact 不存在
   */
  getMetadata(artifactId: string): Promise<Result<ArtifactMetadata, ArtifactError>>;

  /**
   * 更新 Artifact 元数据
   * @param artifactId Artifact ID
   * @param updates 更新内容
   * @returns 更新后的元数据
   * @throws ArtifactError 如果 Artifact 不存在、Vault 为只读等
   */
  updateMetadata(
    artifactId: string,
    updates: PartialUpdate<ArtifactMetadata>
  ): Promise<Result<ArtifactMetadata, ArtifactError>>;

  /**
   * 搜索 Artifact（全文搜索 + 向量搜索）
   * @param query 搜索查询
   * @returns 匹配的 Artifact 列表
   */
  searchArtifacts(opts: {
    query: string;
    vaultId?: string;
    viewType?: ArtifactViewType;
    limit?: number;
    useVectorSearch?: boolean; // 是否使用向量搜索
  }): Promise<Result<Artifact[], ArtifactError>>;
}
```

### 2.2 VaultApplicationService

```typescript
/**
 * Vault 应用服务
 * 提供 Vault 的管理功能
 */
export interface VaultApplicationService {
  /**
   * 添加本地 Vault
   * @param opts 创建选项
   * @returns 创建的 Vault
   * @throws VaultError 如果 Vault 名称已存在、路径无效等
   */
  addLocalVault(opts: {
    name: string;
    description?: string;
    selfContained?: boolean;
  }): Promise<Result<Vault, VaultError>>;

  /**
   * 从 Git 仓库添加 Vault（只读模式）
   * @param opts 创建选项
   * @returns 创建的 Vault
   * @throws VaultError 如果 Git 仓库不存在、克隆失败等
   */
  addVaultFromGit(opts: {
    name: string;
    remote: RemoteEndpoint;
    description?: string;
  }): Promise<Result<Vault, VaultError>>;

  /**
   * 复制 Git Vault 为本地 Vault（用于修改）
   * @param sourceVaultId 源 Vault ID
   * @param newVaultName 新 Vault 名称
   * @returns 创建的本地 Vault
   * @throws VaultError 如果源 Vault 不存在、不是 Git Vault 等
   */
  forkVault(
    sourceVaultId: string,
    newVaultName: string
  ): Promise<Result<Vault, VaultError>>;

  /**
   * 移除 Vault
   * @param vaultId Vault ID
   * @param opts 选项
   * @returns void
   * @throws VaultError 如果 Vault 不存在
   */
  removeVault(
    vaultId: string,
    opts?: {
      deleteFiles?: boolean; // 是否删除本地文件
    }
  ): Promise<Result<void, VaultError>>;

  /**
   * 同步 Vault（从 Git 拉取更新，仅适用于 Git Vault）
   * @param vaultId Vault ID
   * @returns void
   * @throws VaultError 如果 Vault 不是 Git Vault、同步失败等
   */
  syncVault(vaultId: string): Promise<Result<void, VaultError>>;

  /**
   * 获取所有 Vault
   * @returns Vault 列表
   */
  listVaults(): Promise<Result<Vault[], VaultError>>;

  /**
   * 获取指定 Vault
   * @param vaultId Vault ID
   * @returns Vault 详情
   * @throws VaultError 如果 Vault 不存在
   */
  getVault(vaultId: string): Promise<Result<Vault, VaultError>>;
}
```

### 2.3 ViewpointApplicationService（包含代码关联功能）

```typescript
/**
 * Viewpoint 应用服务
 * 提供视点管理和代码关联展示功能
 * 注意：开发视图（Development View）已合并到视点视图中，作为"当前代码关联文档"视点
 */
export interface ViewpointApplicationService {
  /**
   * 获取所有视点
   * @returns 视点列表（包括预定义视点、自定义视点、代码关联视点）
   */
  listViewpoints(): Promise<Result<Viewpoint[], ArtifactError>>;

  /**
   * 获取指定视点的文档
   * @param viewpointId 视点 ID
   * @returns 匹配视点的 Artifact 列表
   */
  getViewpointArtifacts(viewpointId: string): Promise<Result<Artifact[], ArtifactError>>;

  /**
   * 创建自定义视点
   * @param viewpoint 视点配置
   * @returns 创建的视点
   */
  createViewpoint(viewpoint: Omit<Viewpoint, 'id'>): Promise<Result<Viewpoint, ArtifactError>>;

  /**
   * 更新视点
   * @param viewpointId 视点 ID
   * @param updates 更新内容
   * @returns 更新后的视点
   */
  updateViewpoint(
    viewpointId: string,
    updates: Partial<Viewpoint>
  ): Promise<Result<Viewpoint, ArtifactError>>;

  /**
   * 删除视点
   * @param viewpointId 视点 ID
   * @returns void
   */
  deleteViewpoint(viewpointId: string): Promise<Result<void, ArtifactError>>;

  // ========== 代码关联功能（原 DevelopmentApplicationService） ==========

  /**
   * 获取文档关联的代码路径
   * @param artifactId Artifact ID
   * @returns 代码路径列表（按目录层级组织）
   */
  getRelatedCodePaths(artifactId: string): Promise<Result<string[], ArtifactError>>;

  /**
   * 获取代码文件关联的文档（用于"当前代码关联文档"视点）
   * @param codePath 代码文件路径（相对于工作区根目录）
   * @returns 关联的 Artifact 列表
   */
  getRelatedArtifacts(codePath: string): Promise<Result<Artifact[], ArtifactError>>;

  /**
   * 判断文件是否为 Artifact
   * @param filePath 文件路径
   * @returns 是否为 Artifact
   */
  isArtifactFile(filePath: string): Promise<Result<boolean, ArtifactError>>;

  /**
   * 判断文件是否为代码文件
   * @param filePath 文件路径
   * @returns 是否为代码文件
   */
  isCodeFile(filePath: string): boolean;

  /**
   * 根据文件路径获取 Artifact
   * @param filePath 文件路径
   * @returns Artifact 或 null
   */
  getArtifactByPath(filePath: string): Promise<Result<Artifact | null, ArtifactError>>;

  /**
   * 组织代码路径为树形结构
   * @param codePaths 代码路径列表
   * @returns 树形结构数据
   */
  organizeCodePathsAsTree(codePaths: string[]): CodePathTree;

  /**
   * 组织 Artifact 为树形结构（按 viewType 分类）
   * @param artifacts Artifact 列表
   * @returns 树形结构数据
   */
  organizeArtifactsAsTree(artifacts: Artifact[]): ArtifactTree;
}

/**
 * 视点类型
 */
export type ViewpointType = 'tag' | 'code-related';

/**
 * 视点配置
 */
export interface Viewpoint {
  id: string; // 视点 ID
  name: string; // 视点名称
  type: ViewpointType; // 视点类型：tag（标签视点）或 code-related（代码关联视点）
  description?: string; // 视点描述
  
  // 标签视点配置（type === 'tag' 时使用）
  tagRules?: {
    required?: string[]; // 必须包含的标签（AND 关系）
    optional?: string[]; // 可选包含的标签（OR 关系）
    excluded?: string[]; // 排除的标签（NOT 关系）
  };
  
  // 代码关联视点配置（type === 'code-related' 时使用）
  codeRelatedConfig?: {
    mode: 'forward' | 'reverse'; // forward: 文档→代码，reverse: 代码→文档
    currentFilePath?: string; // 当前打开的文件路径（响应式更新）
  };
  
  // 布局配置
  layout?: {
    type: 'tree' | 'list' | 'grouped';
    groupBy?: 'viewType' | 'category' | 'vault';
  };
  
  // 元数据
  isDefault?: boolean; // 是否为默认视点（"当前代码关联文档"视点）
  isPredefined?: boolean; // 是否为预定义视点（不可删除）
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}

/**
 * 代码路径树节点
 */
export interface CodePathTreeNode {
  name: string; // 节点名称（文件名或目录名）
  path: string; // 完整路径
  type: 'file' | 'directory';
  children?: CodePathTreeNode[]; // 子节点（仅目录有）
}

/**
 * 代码路径树
 */
export interface CodePathTree {
  root: CodePathTreeNode;
}

/**
 * Artifact 树节点
 */
export interface ArtifactTreeNode {
  viewType: ArtifactViewType; // 视图类型（document/design/development/test）
  artifacts: Artifact[]; // 该视图类型下的 Artifact 列表
  children?: ArtifactTreeNode[]; // 子节点（按 category 进一步分类）
}

/**
 * Artifact 树
 */
export interface ArtifactTree {
  root: ArtifactTreeNode;
}
```

### 2.4 ArtifactLinkRepository

```typescript
/**
 * ArtifactLink 存储库
 * 提供 ArtifactLink 的存储和查询功能
 */
export interface ArtifactLinkRepository {
  /**
   * 创建链接
   * @param link ArtifactLink
   * @returns 创建的链接
   */
  create(link: Omit<ArtifactLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<ArtifactLink, ArtifactError>>;

  /**
   * 查询链接
   * @param query 查询条件
   * @returns 匹配的链接列表
   */
  query(query: LinkQuery): Promise<Result<ArtifactLink[], ArtifactError>>;

  /**
   * 删除链接
   * @param linkId 链接 ID
   * @returns void
   */
  delete(linkId: string): Promise<Result<void, ArtifactError>>;

  /**
   * 根据 Artifact ID 查询所有相关链接
   * @param artifactId Artifact ID
   * @returns 链接列表
   */
  findByArtifact(artifactId: string): Promise<Result<ArtifactLink[], ArtifactError>>;

  /**
   * 根据代码路径查询相关链接
   * @param codePath 代码路径
   * @returns 链接列表
   */
  findByCodePath(codePath: string): Promise<Result<ArtifactLink[], ArtifactError>>;
}

/**
 * LinkQuery
 * 链接查询条件
 */
export interface LinkQuery {
  sourceArtifactId?: string;
  targetType?: TargetType;
  targetId?: string;
  targetPath?: string;
  linkType?: LinkType;
  vaultId?: string;
  query?: QueryOptions;
}
```

---

## 三、依赖注入设计

### 3.1 DI 容器选择

**选择：InversifyJS**

**理由**：
- TypeScript 原生支持，类型安全
- 装饰器语法，代码简洁
- 支持接口绑定和命名绑定
- 支持生命周期管理（Singleton、Transient、RequestScope）
- 社区活跃，文档完善

### 3.2 容器配置

```typescript
// infrastructure/di/container.ts
import { Container } from 'inversify';
import { TYPES } from './types';

// 创建容器
export const container = new Container();

// 绑定服务
container.bind<ArtifactFileSystemApplicationService>(TYPES.ArtifactFileSystemApplicationService)
  .to(ArtifactFileSystemApplicationServiceImpl)
  .inSingletonScope();

container.bind<VaultApplicationService>(TYPES.VaultApplicationService)
  .to(VaultApplicationServiceImpl)
  .inSingletonScope();

container.bind<ArtifactRepository>(TYPES.ArtifactRepository)
  .to(ArtifactRepositoryImpl)
  .inSingletonScope();

container.bind<MetadataRepository>(TYPES.MetadataRepository)
  .to(MetadataRepositoryImpl)
  .inSingletonScope();

container.bind<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex)
  .to(DuckDbRuntimeIndexImpl)
  .inSingletonScope();

// ... 其他绑定
```

### 3.3 类型标识

```typescript
// infrastructure/di/types.ts
export const TYPES = {
  // 应用服务
  ArtifactFileSystemApplicationService: Symbol.for('ArtifactFileSystemApplicationService'),
  VaultApplicationService: Symbol.for('VaultApplicationService'),
  DocumentApplicationService: Symbol.for('DocumentApplicationService'),
  ViewpointApplicationService: Symbol.for('ViewpointApplicationService'),
  TaskApplicationService: Symbol.for('TaskApplicationService'),
  TemplateApplicationService: Symbol.for('TemplateApplicationService'),
  MCPApplicationService: Symbol.for('MCPApplicationService'),
  
  // 存储库
  ArtifactRepository: Symbol.for('ArtifactRepository'),
  MetadataRepository: Symbol.for('MetadataRepository'),
  ArtifactLinkRepository: Symbol.for('ArtifactLinkRepository'),
  VaultRepository: Symbol.for('VaultRepository'),
  ChangeRepository: Symbol.for('ChangeRepository'),
  
  // 基础设施
  ArtifactFileSystemAdapter: Symbol.for('ArtifactFileSystemAdapter'),
  VaultFileSystemAdapter: Symbol.for('VaultFileSystemAdapter'),
  GitVaultAdapter: Symbol.for('GitVaultAdapter'),
  DuckDbRuntimeIndex: Symbol.for('DuckDbRuntimeIndex'),
  VectorSearchUtils: Symbol.for('VectorSearchUtils'),
  VectorEmbeddingService: Symbol.for('VectorEmbeddingService'),
  
  // 核心服务
  EventBus: Symbol.for('EventBus'),
  Logger: Symbol.for('Logger'),
  ConfigManager: Symbol.for('ConfigManager'),
};
```

### 3.4 服务实现示例

```typescript
// apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationServiceImpl.ts
import { inject, injectable } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { ArtifactFileSystemApplicationService } from '../../../../domain/shared/artifact/ArtifactFileSystemApplicationService';
import { ArtifactRepository } from '../../../../infrastructure/storage/repositories/ArtifactRepository';
import { MetadataRepository } from '../../../../infrastructure/storage/repositories/MetadataRepository';

@injectable()
export class ArtifactFileSystemApplicationServiceImpl 
  implements ArtifactFileSystemApplicationService {
  
  constructor(
    @inject(TYPES.ArtifactRepository) 
    private artifactRepo: ArtifactRepository,
    @inject(TYPES.MetadataRepository) 
    private metadataRepo: MetadataRepository,
    @inject(TYPES.Logger) 
    private logger: Logger
  ) {}

  async createArtifact(opts: CreateArtifactOptions): Promise<Result<Artifact, ArtifactError>> {
    // 实现逻辑
  }
  
  // ... 其他方法
}
```

---

## 四、错误处理实现

### 4.1 错误类型定义

详见 `EXPECTED_ARCHITECTURE_DESIGN.md` 10.3 节。

### 4.2 错误恢复策略

```typescript
/**
 * 错误恢复器
 * 提供自动重试和错误恢复功能
 */
export class ErrorRecovery {
  /**
   * 可重试错误码
   */
  private static readonly RETRYABLE_ERROR_CODES = [
    SystemErrorCode.NETWORK_ERROR,
    SystemErrorCode.DATABASE_ERROR,
  ];

  /**
   * 带重试的执行
   * @param fn 执行函数
   * @param maxRetries 最大重试次数
   * @param backoffMs 退避时间（毫秒）
   */
  static async withRetry<T, E extends ArchiToolError>(
    fn: () => Promise<Result<T, E>>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<Result<T, E>> {
    let lastError: E | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await fn();
      
      if (result.success) {
        return result;
      }
      
      lastError = result.error;
      
      // 检查是否可重试
      if (!this.isRetryable(lastError) || attempt === maxRetries) {
        break;
      }
      
      // 指数退避
      const delay = backoffMs * Math.pow(2, attempt);
      await this.sleep(delay);
    }
    
    return { success: false, error: lastError! };
  }

  /**
   * 检查错误是否可重试
   */
  private static isRetryable(error: ArchiToolError): boolean {
    return this.RETRYABLE_ERROR_CODES.includes(error.code as SystemErrorCode);
  }

  /**
   * 睡眠
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.3 错误日志格式

```typescript
/**
 * 错误日志格式
 */
export interface ErrorLogEntry {
  timestamp: string; // ISO 8601
  level: 'ERROR' | 'WARN';
  error: {
    code: string;
    message: string;
    name: string;
    stack?: string;
    context?: Record<string, any>;
    cause?: {
      message: string;
      stack?: string;
    };
  };
  operation: {
    type: string; // 操作类型，如 'createArtifact'
    resourceId?: string; // 资源 ID
    vaultId?: string; // Vault ID
  };
  user?: {
    id?: string;
    email?: string;
  };
}
```

### 4.4 错误处理中间件

```typescript
/**
 * 错误处理中间件
 * 在应用层统一捕获和处理异常
 */
export class ErrorHandlingMiddleware {
  /**
   * 包装异步函数，统一错误处理
   */
  static wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    operationType: string
  ): T {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        // 记录错误日志
        this.logError(error, operationType, args);
        
        // 转换为 Result 类型
        if (error instanceof ArchiToolError) {
          return { success: false, error } as any;
        }
        
        // 未知错误
        const systemError = new SystemError(
          SystemErrorCode.UNKNOWN_ERROR,
          'An unexpected error occurred',
          { originalError: error.message },
          error
        );
        return { success: false, error: systemError } as any;
      }
    }) as T;
  }

  /**
   * 记录错误日志
   */
  private static logError(
    error: any,
    operationType: string,
    args: any[]
  ): void {
    // 实现日志记录逻辑
  }
}
```

---

## 五、测试策略

### 5.1 测试分层

**单元测试**（Unit Tests）：
- **领域层**：测试领域模型、值对象、领域服务
- **应用层**：测试应用服务逻辑（Mock 依赖）
- **基础设施层**：测试适配器、存储库实现

**集成测试**（Integration Tests）：
- **存储集成**：测试文件系统、DuckDB 集成
- **服务集成**：测试应用服务与存储库的集成

**E2E 测试**（End-to-End Tests）：
- **命令测试**：测试 VSCode 命令的完整流程
- **视图测试**：测试 TreeView 的完整交互

### 5.2 测试工具选择

- **Jest**：单元测试和集成测试框架
- **@testing-library/vscode**：VSCode 扩展测试工具
- **supertest**：API 测试（如果需要）

### 5.3 测试示例

```typescript
// domain/shared/artifact/__tests__/Artifact.test.ts
import { Artifact } from '../Artifact';
import { ArtifactValidator } from '../ArtifactValidator';

describe('Artifact', () => {
  describe('创建 Artifact', () => {
    it('应该成功创建有效的 Artifact', () => {
      const artifact: Artifact = {
        id: 'artifact-001',
        vault: { id: 'vault-001', name: 'Test Vault' },
        nodeType: 'FILE',
        path: 'documents/test.md',
        name: 'test',
        format: 'md',
        contentLocation: '/path/to/test.md',
        viewType: 'document',
        title: 'Test Document',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        status: 'draft',
      };

      const result = ArtifactValidator.validate(artifact);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效的 Artifact（缺少必需字段）', () => {
      const invalidArtifact = {
        id: 'artifact-001',
        // 缺少必需字段
      } as any;

      const result = ArtifactValidator.validate(invalidArtifact);
      expect(result.success).toBe(false);
    });
  });
});

// apps/extension/src/modules/shared/application/__tests__/ArtifactFileSystemApplicationService.test.ts
import { ArtifactFileSystemApplicationServiceImpl } from '../ArtifactFileSystemApplicationServiceImpl';
import { ArtifactRepository } from '../../../../infrastructure/storage/repositories/ArtifactRepository';
import { MetadataRepository } from '../../../../infrastructure/storage/repositories/MetadataRepository';

describe('ArtifactFileSystemApplicationService', () => {
  let service: ArtifactFileSystemApplicationServiceImpl;
  let artifactRepo: jest.Mocked<ArtifactRepository>;
  let metadataRepo: jest.Mocked<MetadataRepository>;

  beforeEach(() => {
    artifactRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      // ... 其他方法
    } as any;

    metadataRepo = {
      create: jest.fn(),
      // ... 其他方法
    } as any;

    service = new ArtifactFileSystemApplicationServiceImpl(
      artifactRepo,
      metadataRepo,
      mockLogger
    );
  });

  describe('createArtifact', () => {
    it('应该成功创建 Artifact', async () => {
      const opts = {
        vault: { id: 'vault-001', name: 'Test Vault' },
        viewType: 'document' as const,
        path: 'documents/test.md',
        title: 'Test Document',
      };

      artifactRepo.create.mockResolvedValue({
        success: true,
        value: mockArtifact,
      });

      const result = await service.createArtifact(opts);
      
      expect(result.success).toBe(true);
      expect(artifactRepo.create).toHaveBeenCalled();
    });

    it('应该拒绝在只读 Vault 中创建 Artifact', async () => {
      const opts = {
        vault: { id: 'vault-001', name: 'ReadOnly Vault' },
        viewType: 'document' as const,
        path: 'documents/test.md',
        title: 'Test Document',
      };

      // Mock 只读 Vault
      vaultRepo.findById.mockResolvedValue({
        success: true,
        value: { ...mockVault, readOnly: true },
      });

      const result = await service.createArtifact(opts);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ArtifactErrorCode.VAULT_READ_ONLY);
    });
  });
});
```

---

## 六、代码示例

### 6.1 创建 Artifact 完整流程

```typescript
// apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationServiceImpl.ts
@injectable()
export class ArtifactFileSystemApplicationServiceImpl 
  implements ArtifactFileSystemApplicationService {
  
  constructor(
    @inject(TYPES.ArtifactRepository) 
    private artifactRepo: ArtifactRepository,
    @inject(TYPES.MetadataRepository) 
    private metadataRepo: MetadataRepository,
    @inject(TYPES.VaultRepository) 
    private vaultRepo: VaultRepository,
    @inject(TYPES.ArtifactFileSystemAdapter) 
    private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.Logger) 
    private logger: Logger
  ) {}

  async createArtifact(opts: CreateArtifactOptions): Promise<Result<Artifact, ArtifactError>> {
    // 1. 验证输入
    const validationResult = this.validateCreateOptions(opts);
    if (!validationResult.success) {
      return validationResult;
    }

    // 2. 检查 Vault 是否存在且可写
    const vaultResult = await this.vaultRepo.findById(opts.vault.id);
    if (!vaultResult.success) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.VAULT_NOT_FOUND,
          `Vault not found: ${opts.vault.id}`,
          { vaultId: opts.vault.id }
        ),
      };
    }

    const vault = vaultResult.value;
    if (vault.readOnly) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.VAULT_READ_ONLY,
          `Cannot create artifact in read-only vault: ${vault.name}`,
          { vaultId: vault.id, vaultName: vault.name }
        ),
      };
    }

    // 3. 检查路径是否已存在
    const existingResult = await this.artifactRepo.findByPath(
      opts.vault.id,
      opts.path
    );
    if (existingResult.success && existingResult.value) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.ALREADY_EXISTS,
          `Artifact already exists at path: ${opts.path}`,
          { path: opts.path, vaultId: opts.vault.id }
        ),
      };
    }

    // 4. 生成 Artifact ID
    const artifactId = this.generateArtifactId();

    // 5. 创建 Artifact 实体
    const artifact: Artifact = {
      id: artifactId,
      vault: opts.vault,
      nodeType: 'FILE',
      path: opts.path,
      name: this.extractNameFromPath(opts.path),
      format: opts.format || 'md',
      contentLocation: this.fileAdapter.getArtifactPath(opts.vault.name, opts.path),
      viewType: opts.viewType,
      category: opts.category,
      title: opts.title,
      description: opts.content?.substring(0, 200), // 描述取内容前200字符
      body: opts.content,
      contentHash: this.calculateHash(opts.content || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      tags: opts.tags || [],
    };

    // 6. 创建元数据
    const metadataId = this.generateMetadataId();
    const metadata: ArtifactMetadata = {
      id: metadataId,
      artifactId: artifactId,
      vaultId: opts.vault.id,
      vaultName: opts.vault.name,
      type: opts.viewType,
      category: opts.category,
      tags: opts.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 7. 写入文件系统（原子操作）
    const writeResult = await this.fileAdapter.writeArtifact(artifact, opts.content || '');
    if (!writeResult.success) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to write artifact file: ${writeResult.error.message}`,
          { path: opts.path },
          writeResult.error
        ),
      };
    }

    // 8. 写入元数据
    const metadataResult = await this.fileAdapter.writeMetadata(metadata);
    if (!metadataResult.success) {
      // 回滚：删除已创建的文件
      await this.fileAdapter.deleteArtifact(artifact.contentLocation);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to write metadata: ${metadataResult.error.message}`,
          { artifactId },
          metadataResult.error
        ),
      };
    }

    // 9. 更新 Artifact 的 metadataId
    artifact.metadataId = metadataId;

    // 10. 保存到存储库
    const saveResult = await this.artifactRepo.create(artifact);
    if (!saveResult.success) {
      // 回滚：删除文件和元数据
      await this.fileAdapter.deleteArtifact(artifact.contentLocation);
      await this.fileAdapter.deleteMetadata(metadataId);
      return saveResult;
    }

    // 11. 同步到 DuckDB 索引
    await this.syncToIndex(artifact, metadata);

    // 12. 记录变更
    await this.recordChange({
      artifactId,
      changeType: 'CREATE',
      description: `Created artifact: ${opts.title}`,
    });

    this.logger.info('Artifact created', { artifactId, path: opts.path });

    return { success: true, value: artifact };
  }

  private validateCreateOptions(opts: CreateArtifactOptions): Result<void, ArtifactError> {
    if (!opts.vault || !opts.vault.id) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Vault is required'
        ),
      };
    }

    if (!opts.path || !opts.path.trim()) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_PATH,
          'Path is required'
        ),
      };
    }

    if (!opts.title || !opts.title.trim()) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Title is required'
        ),
      };
    }

    return { success: true, value: undefined };
  }

  // ... 其他辅助方法
}
```

---

## 七、数据验证规则

### 7.1 Artifact 验证规则

```typescript
/**
 * Artifact 验证器
 */
export class ArtifactValidator {
  /**
   * 验证 Artifact
   */
  static validate(artifact: Partial<Artifact>): Result<void, ArtifactError> {
    // 必需字段检查
    if (!artifact.id) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Artifact ID is required'
        ),
      };
    }

    if (!artifact.vault || !artifact.vault.id) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Vault is required'
        ),
      };
    }

    if (!artifact.path) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_PATH,
          'Path is required'
        ),
      };
    }

    // 路径格式验证
    if (!this.isValidPath(artifact.path)) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_PATH,
          `Invalid path format: ${artifact.path}`
        ),
      };
    }

    // 标题验证
    if (!artifact.title || artifact.title.trim().length === 0) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Title is required and cannot be empty'
        ),
      };
    }

    if (artifact.title.length > 200) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Title must be less than 200 characters'
        ),
      };
    }

    // 时间戳验证
    if (artifact.createdAt && !this.isValidISO8601(artifact.createdAt)) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'CreatedAt must be a valid ISO 8601 timestamp'
        ),
      };
    }

    return { success: true, value: undefined };
  }

  /**
   * 验证路径格式
   */
  private static isValidPath(path: string): boolean {
    // 路径不能为空
    if (!path || path.trim().length === 0) {
      return false;
    }

    // 路径不能以 / 开头或结尾
    if (path.startsWith('/') || path.endsWith('/')) {
      return false;
    }

    // 路径不能包含非法字符
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    if (invalidChars.test(path)) {
      return false;
    }

    // 路径不能包含 .. 或 .
    if (path.includes('..') || path === '.') {
      return false;
    }

    return true;
  }

  /**
   * 验证 ISO 8601 时间戳
   */
  private static isValidISO8601(timestamp: string): boolean {
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return iso8601Regex.test(timestamp) && !isNaN(Date.parse(timestamp));
  }
}
```

---

## 八、性能优化细节

### 8.1 缓存策略

```typescript
/**
 * LRU 缓存
 * 用于缓存常用的 Artifact 和元数据
 */
export class ArtifactCache {
  private cache: Map<string, { value: any; timestamp: number }>;
  private maxSize: number;
  private ttl: number; // 生存时间（毫秒）

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }
}
```

### 8.2 批量操作优化

```typescript
/**
 * 批量操作优化
 * 使用事务和批量插入提升性能
 */
export class BatchOperationOptimizer {
  /**
   * 批量创建 Artifact
   */
  async batchCreateArtifacts(
    artifacts: Array<{ artifact: Artifact; content: string; metadata: ArtifactMetadata }>
  ): Promise<Result<Artifact[], ArtifactError>> {
    // 1. 批量验证
    for (const item of artifacts) {
      const validationResult = ArtifactValidator.validate(item.artifact);
      if (!validationResult.success) {
        return validationResult;
      }
    }

    // 2. 批量写入文件（并行）
    const writePromises = artifacts.map(item =>
      this.fileAdapter.writeArtifact(item.artifact, item.content)
    );
    const writeResults = await Promise.all(writePromises);
    
    // 检查是否有失败
    const failedIndex = writeResults.findIndex(r => !r.success);
    if (failedIndex !== -1) {
      // 回滚已写入的文件
      await this.rollbackBatchWrite(artifacts.slice(0, failedIndex));
      return writeResults[failedIndex];
    }

    // 3. 批量写入元数据（并行）
    const metadataPromises = artifacts.map(item =>
      this.fileAdapter.writeMetadata(item.metadata)
    );
    const metadataResults = await Promise.all(metadataPromises);
    
    // 检查是否有失败
    const failedMetadataIndex = metadataResults.findIndex(r => !r.success);
    if (failedMetadataIndex !== -1) {
      // 回滚
      await this.rollbackBatchWrite(artifacts);
      await this.rollbackBatchMetadata(artifacts.slice(0, failedMetadataIndex));
      return metadataResults[failedMetadataIndex];
    }

    // 4. 批量同步到 DuckDB（使用事务）
    await this.batchSyncToIndex(artifacts);

    return {
      success: true,
      value: artifacts.map(item => item.artifact),
    };
  }
}
```

---

## 附录

### 附录 A：完整类型定义

所有类型定义的完整代码见 `domain/shared/types/index.ts`。

### 附录 B：API 参考

所有应用服务接口的完整定义见各模块的 `application/` 目录。

### 附录 C：代码示例

更多代码示例见各模块的 `__examples__/` 目录。

---

**文档版本**：1.0.0  
**最后更新**：2024-01-XX  
**维护者**：ArchiTool 开发团队

