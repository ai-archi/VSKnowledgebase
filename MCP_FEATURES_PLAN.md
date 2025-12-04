# MCP 功能方案文档

## 一、项目概述

**ArchiTool** 是一个 VS Code 扩展，用于架构管理和知识库管理。本文档定义了通过 MCP (Model Context Protocol) 对外提供的核心功能。

## 二、功能概览

### 2.1 支持的功能（3个核心功能）

1. ✅ `search_knowledge_base` - 全文搜索知识库（90% 使用场景）
2. ✅ `get_documents_for_code` - 获取代码关联文档（8% 使用场景）
3. ✅ `list_entries` - 列出知识库条目（2% 使用场景）

### 2.2 不支持的功能（已明确移除）

以下功能**明确不支持**，需要从 MCP 接口中移除：

| 功能 | 原因 | 状态 |
|------|------|------|
| `getEntry` | 单个查询，`search` 已覆盖 | ❌ 待删除 |
| `createEntry` | 写操作，AI 不需要 | ❌ 待删除 |
| `updateEntry` | 写操作，AI 不需要 | ❌ 待删除 |
| `deleteEntry` | 写操作，AI 不需要 | ❌ 待删除 |
| `listLinks` | 使用频率低，非核心功能 | ❌ 待删除 |
| `createLink` | 写操作，AI 不需要 | ❌ 待删除 |

**设计原则**：
- ✅ **只读操作**：MCP 只提供查询和搜索功能，不提供写操作
- ✅ **批量优先**：优先支持批量查询，单个查询通过 `search` 实现
- ✅ **聚焦核心**：只保留 AI 真正需要的功能

**清理状态**：详见 [7.2 移除功能（不支持的功能清理）](#72-移除功能不支持的功能清理)

---

## 三、保留的 MCP 功能（核心功能）

### 3.1 `search_knowledge_base` ⭐⭐⭐⭐⭐（核心功能）
**功能描述**：全文搜索知识库条目。这是 AI 助手最核心的功能，覆盖 90% 的使用场景。

**参数**：
```typescript
{
  query: string;           // 搜索关键词（必需）
  vaultName?: string;      // 可选，指定 vault。如果不提供，搜索所有 vault
  tags?: string[];         // 可选，标签过滤（AND 关系，必须包含所有指定标签）
  limit?: number;          // 可选，结果数量限制（默认 50）
  includeContent?: boolean; // 可选，是否返回完整内容（默认 true）
  maxContentSize?: number;   // 可选，最大内容大小（字节），超过则不返回内容（默认 1MB）
}
```

**返回**：完整的 Artifact 数组，每个 Artifact 包含：
- `id`: 条目 ID
- `vault`: Vault 信息 `{ id, name }`
- `title`: 标题
- `description`: 描述
- `path`: 文件路径
- `body`: 完整内容（Markdown/文本），**默认包含**
  - 如果 `includeContent: false`，则不包含 body
  - 如果文件超过 `maxContentSize`，则不包含 body（但会包含 `contentSize` 字段）
- `contentSize?: number`: 内容大小（字节），当内容未加载时提供
- `viewType`: 类型（document/design/development/test）
- `category`: 分类
- `tags`: 标签数组
- 其他元数据

**实现状态**：⚠️ 需要优化（当前可能不返回 body 内容）

**技术实现**：
- 使用 SQLite FTS5 全文搜索索引
- 支持跨 vault 搜索
- 支持标签过滤
- 如果全文搜索无结果，回退到基本搜索（标题和描述匹配）
- **需要优化**：确保返回的 Artifact 包含 `body` 字段（完整内容）
- **性能考虑**：大文件（超过 maxContentSize）不加载内容，但提供文件大小信息

**使用场景**：
1. **查找具体文档**：
   ```
   用户："登录模块的文档在哪里？"
   AI：search({ query: "登录" })
   ```

2. **按标签过滤**：
   ```
   用户："给我看所有需求相关的文档"
   AI：search({ query: "", tags: ["requirement"] })
   ```

3. **在特定 vault 中搜索**：
   ```
   用户："在 demo-vault 中搜索架构设计"
   AI：search({ query: "架构", vaultName: "demo-vault" })
   ```

**优势**：
- ✅ **返回完整内容**：默认包含 `body` 字段，AI 可直接使用，无需额外查询
- ✅ 支持全文搜索，查找更准确
- ✅ 支持多条件过滤（vault、标签）
- ✅ 性能优化（FTS5 索引）
- ✅ 智能内容加载：大文件不加载内容，避免内存问题

**内容返回策略**：
1. **默认行为**：返回完整内容（`body` 字段）
2. **大文件处理**：超过 `maxContentSize`（默认 1MB）的文件不加载内容
   - 返回 `contentSize` 字段，告知 AI 文件大小
   - AI 可以根据需要决定是否通过其他方式获取内容
3. **可选控制**：通过 `includeContent: false` 可以只返回元数据，不加载内容
   - 适用于只需要搜索结果列表，不需要内容的场景

---

### 3.2 `get_documents_for_code` ⭐⭐⭐⭐⭐（核心功能）
**功能描述**：根据代码路径查找关联的文档/设计图。这是高价值场景，覆盖 8% 的使用场景，让 AI 能够理解代码与文档的关系。

**参数**：
```typescript
{
  codePath: string;        // 代码文件路径（相对于工作区根目录，必需）
                          // 例如："src/auth/login.ts" 或 "packages/api/src/index.ts"
  includeContent?: boolean; // 可选，是否返回完整内容（默认 true）
  maxContentSize?: number;   // 可选，最大内容大小（字节），超过则不返回内容（默认 1MB）
}
```

**返回**：关联的 Artifact 数组，包含：
- 与代码文件关联的所有文档和设计图
- 每个 Artifact 包含完整信息（与 `search` 返回格式相同）
- **默认包含 `body` 字段**（完整内容），便于 AI 直接使用

**实现状态**：⚠️ 需要新增（底层 `ArtifactApplicationService.findArtifactsByCodePath` 已存在）

**技术实现**：
- 通过 `ArtifactMetadata.relatedCodePaths` 查找关联
- 支持通配符匹配（如 `src/auth/*` 匹配 `src/auth/login.ts`）
- 返回所有匹配的文档和设计图

**使用场景**：
1. **查看代码时获取文档**：
   ```
   用户打开文件：src/auth/login.ts
   AI：getDocumentsForCode({ codePath: "src/auth/login.ts" })
   AI：返回相关的需求文档、架构设计图等
   ```

2. **理解代码的业务背景**：
   ```
   AI 分析代码时，自动获取相关文档
   帮助理解代码的业务逻辑和设计意图
   ```

3. **查看架构设计图**：
   ```
   用户："这个模块的架构设计是什么？"
   AI：getDocumentsForCode({ codePath: "src/auth" })
   AI：返回相关的架构设计图
   ```

**优势**：
- ✅ 自动关联代码和文档
- ✅ 支持通配符匹配
- ✅ 返回完整文档信息
- ✅ 高价值使用场景

---

### 3.3 `list_entries` ⭐⭐（可选功能）
**功能描述**：列出知识库条目（按类型和分类过滤）。这是可选功能，使用频率较低（约 2%），主要用于浏览和了解知识库结构。

**参数**：
```typescript
{
  vaultName?: string;      // 可选，指定 vault。如果不提供，返回所有 vault 的条目
  viewType?: string;       // 可选，类型过滤（document/design/development/test）
  category?: string;       // 可选，分类过滤
  limit?: number;          // 可选，结果数量限制（默认 20，建议不超过 50）
}
```

**返回**：Artifact 数组（每个 Artifact 包含完整信息，包括 `vault: { id, name }`）

**实现状态**：✅ 已实现（需要优化：默认 limit 改为 20）

**与 `search` 的区别**：
- `list_entries`：按类型/分类过滤，不搜索内容
- `search`：全文搜索，基于内容匹配

**如何获取 vault 列表**：
从返回结果中提取唯一的 vault 列表：
```typescript
const entries = await list_entries({ limit: 1 });
const vaults = [...new Set(entries.map(e => e.vault.name))];
// vaults: ["demo-vault", "project-vault", ...]
```

**使用场景**：
1. **浏览特定类型**：
   ```
   用户："给我看看所有的设计图"
   AI：list_entries({ viewType: "design", limit: 20 })
   ```

2. **了解知识库结构**：
   ```
   AI 分析知识库的文档类型分布
   统计各类型文档的数量
   ```

**注意**：
- ⚠️ 使用频率低（约 2%），大多数场景应该使用 `search`
- ⚠️ 建议 limit ≤ 20，避免返回过大列表
- ✅ 已实现，维护成本低

---

## 四、使用示例

### 4.1 搜索知识库
```typescript
// 基本搜索
const results = await mcpTools.search({
  query: "用户登录",
  limit: 10
});

// 按标签过滤
const requirementDocs = await mcpTools.search({
  query: "",
  tags: ["requirement"],
  limit: 20
});

// 在特定 vault 中搜索
const vaultResults = await mcpTools.search({
  query: "架构",
  vaultName: "demo-vault"
});
```

### 4.2 获取代码关联文档
```typescript
// 查看代码文件关联的文档
const docs = await mcpTools.getDocumentsForCode({
  codePath: "src/auth/login.ts"
});
// 返回：与 login.ts 关联的所有文档和设计图

// 查看目录关联的文档
const moduleDocs = await mcpTools.getDocumentsForCode({
  codePath: "src/auth"
});
```

### 4.3 列出条目（可选功能）
```typescript
// 列出所有设计图
const designs = await mcpTools.listEntries({
  viewType: "design",
  limit: 20
});

// 列出特定 vault 的文档
const vaultDocs = await mcpTools.listEntries({
  vaultName: "demo-vault",
  viewType: "document",
  limit: 20
});

// 获取 vault 列表
const entries = await mcpTools.listEntries({ limit: 1 });
const vaults = [...new Set(entries.map(e => e.vault.name))];
```

---

## 五、MCP Server 架构设计

### 5.1 当前架构（进程内实现）

**架构特点**：
- 简化的进程内实现，作为 VS Code 扩展的一部分运行
- 不依赖外部 MCP Client，直接通过接口调用
- 适合当前阶段的功能验证和开发

**组件关系**：
```
MCPServerStarter (启动器)
    ├─ MCPTools (工具接口)
    │   └─ MCPToolsImpl (实现)
    │       ├─ search()
    │       ├─ listEntries()
    │       └─ getDocumentsForCode() [待实现]
    │
    └─ MCPResources (资源接口) [可选]
        └─ MCPResourcesImpl (实现)
            ├─ listResources()
            └─ getResource(uri)
```

**依赖注入**：
- 通过 Inversify 容器管理依赖
- 所有服务都是单例模式
- 在 `container.ts` 中统一配置

### 5.2 未来架构（标准 MCP 协议）

**架构特点**：
- 实现标准 MCP 协议（Model Context Protocol）
- **只实现 stdio 传输**（推荐，满足所有需求）
- 可以与外部 MCP Client 集成（如 Claude Desktop、其他 AI 工具）

**协议层设计**：
```
MCP Client (外部，如 Claude Desktop)
    ↓
MCP Transport Layer (stdio)
    ↓
MCP Protocol Handler (JSON-RPC 2.0)
    ↓
MCPServerStarter (协议适配)
    ↓
MCPTools / MCPResources (业务接口)
    ↓
Application Services (业务逻辑)
```

**传输方式选择**：

**✅ 推荐：只实现 stdio 传输**

**理由**：
1. **MCP 标准推荐**：stdio 是 MCP 协议的标准和推荐传输方式
2. **主流工具支持**：Claude Desktop、Cursor 等主流 MCP Client 都通过 stdio 启动 MCP Server
3. **简单高效**：stdio 实现简单，无需处理网络、端口、认证等复杂问题
4. **本地场景**：VS Code 扩展内嵌的 MCP 是本地服务，stdio 完全满足需求
5. **生态兼容**：与 MCP 生态系统完全兼容

**❌ 不推荐：HTTP 传输**

**理由**：
1. **使用场景少**：HTTP 主要用于远程 MCP Server，VS Code 扩展是本地服务
2. **实现复杂**：需要处理 HTTP 服务器、端口管理、CORS、认证等
3. **维护成本高**：增加不必要的复杂性
4. **生态支持弱**：主流 MCP Client 更偏向 stdio 方式

**结论**：**只实现 stdio 传输即可，无需实现 HTTP 传输**

**需要实现的内容**：
1. **传输层（stdio）**：
   - 监听标准输入（stdin）
   - 输出到标准输出（stdout）
   - 处理 JSON-RPC 2.0 消息格式

2. **协议层**：
   - JSON-RPC 2.0 消息解析和构建
   - 工具注册和调用机制
   - 资源 URI 处理机制
   - 错误处理和日志记录

3. **工具注册**：
   - 自动注册所有 MCPTools 方法
   - 生成工具描述和参数 schema
   - 支持工具调用和结果返回

**实施建议**：
- 当前阶段：保持进程内实现，专注于功能完善
- 未来阶段：当需要与外部 MCP Client 集成时，实现 stdio 传输层
- 推荐使用 `@modelcontextprotocol/sdk` 标准库简化实现
- **只实现 stdio，不实现 HTTP**

### 5.3 传输方式详细对比

**VS Code 扩展内嵌 MCP 的场景分析**：

| 特性 | stdio 传输 | HTTP 传输 |
|------|-----------|----------|
| **实现复杂度** | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| **MCP 标准支持** | ✅ 标准推荐 | ⚠️ 较少使用 |
| **主流工具兼容** | ✅ Claude Desktop、Cursor | ❌ 支持有限 |
| **本地场景适用** | ✅ 完全适用 | ⚠️ 主要用于远程 |
| **网络需求** | ❌ 无需网络 | ✅ 需要网络 |
| **端口管理** | ❌ 无需端口 | ✅ 需要端口管理 |
| **安全性** | ✅ 进程隔离 | ⚠️ 需要认证机制 |
| **维护成本** | ⭐ 低 | ⭐⭐⭐ 高 |
| **推荐度** | ✅✅✅ **强烈推荐** | ❌ 不推荐 |

**使用场景对比**：

**stdio 传输适用场景**：
- ✅ VS Code 扩展内嵌 MCP（当前场景）
- ✅ 本地运行的 MCP Server
- ✅ 与 Claude Desktop 集成
- ✅ 与 Cursor 等本地 AI 工具集成
- ✅ 进程间通信

**HTTP 传输适用场景**：
- ⚠️ 远程 MCP Server（网络部署）
- ⚠️ 需要跨网络访问的场景
- ⚠️ 需要 RESTful API 接口的场景
- ❌ **不适用于 VS Code 扩展内嵌场景**

**技术实现对比**：

**stdio 实现示例**：
```typescript
// 使用 @modelcontextprotocol/sdk
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'architool-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
    resources: {},
  },
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**HTTP 实现示例**（不推荐）：
```typescript
// 需要实现 HTTP 服务器、端口管理、CORS 等
import express from 'express';
const app = express();
app.post('/mcp', async (req, res) => {
  // 处理 MCP 请求
});
app.listen(3000); // 需要管理端口
```

**结论**：
- **对于 VS Code 扩展内嵌 MCP，只实现 stdio 传输即可**
- **无需实现 HTTP 传输，避免不必要的复杂性**
- **stdio 方式简单、高效、兼容性好，完全满足需求**

### 5.4 工具注册机制

**当前实现**：
- 工具通过接口定义，手动管理
- 没有自动注册机制

**未来改进**：
- 自动扫描 `MCPTools` 接口的所有方法
- 自动生成工具描述和参数 schema
- 支持工具版本管理和兼容性检查

**工具描述示例**：
```typescript
{
  name: "search_knowledge_base",
  description: "全文搜索知识库条目",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "搜索关键词" },
      vaultName: { type: "string", description: "可选，指定 vault" },
      tags: { type: "array", items: { type: "string" } },
      limit: { type: "number", default: 50 }
    },
    required: ["query"]
  }
}
```

---

## 六、当前实现状态分析

### 6.1 MCP Server 架构现状

**当前实现**：
- `MCPServerStarter` 是一个简化的进程内实现，仅作为包装器
- 没有实现标准的 MCP 协议（stdio/HTTP 传输层）
- 代码注释中提到："实际的 MCP Server 可能需要通过 stdio 或 HTTP 与客户端通信"

**架构层次**：
```
当前架构（进程内）：
  MCPServerStarter (包装器)
    ↓
  MCPTools / MCPResources (接口层)
    ↓
  Application Services (业务逻辑层)
    ↓
  Repositories / Infrastructure (数据访问层)

未来架构（标准 MCP 协议）：
  MCP Client (AI)
    ↓
  MCP Server (stdio/HTTP 传输层) ← 需要实现
    ↓
  MCPServerStarter (协议处理)
    ↓
  MCPTools / MCPResources (接口层)
    ↓
  Application Services (业务逻辑层)
```

**建议**：
- 当前阶段：保持进程内实现，专注于功能完善
- 未来阶段：当需要与外部 MCP Client 集成时，再实现标准 MCP 协议层

### 6.2 MCPTools 实现状态

| 功能 | 接口定义 | 实现状态 | 方案状态 | 备注 |
|------|---------|---------|---------|------|
| `search` | ✅ | ✅ 已实现 | ✅ 保留 | 使用 FTS5 全文搜索，支持回退 |
| `listEntries` | ✅ | ✅ 已实现 | ✅ 保留 | 默认 limit=100，需改为 20 |
| `getDocumentsForCode` | ❌ | ❌ 未实现 | ⚠️ 需新增 | 底层服务已支持 |
| `getEntry` | ✅ | ✅ 已实现 | ❌ 移除 | 单个查询，使用频率低 |
| `createEntry` | ✅ | ✅ 已实现 | ❌ 移除 | 写操作，AI 不需要 |
| `updateEntry` | ✅ | ✅ 已实现 | ❌ 移除 | 写操作，AI 不需要 |
| `deleteEntry` | ✅ | ✅ 已实现 | ❌ 移除 | 写操作，AI 不需要 |
| `listLinks` | ✅ | ✅ 已实现 | ❌ 移除 | 使用频率低 |
| `createLink` | ✅ | ✅ 已实现 | ❌ 移除 | 写操作，AI 不需要 |

**关键发现**：
1. `search` 实现完整，支持 FTS5 全文搜索和标签过滤
   - ⚠️ **需要优化**：当前可能不返回 `body` 内容，需要添加内容加载逻辑
2. `listEntries` 已实现，但默认 limit 需要优化
3. `getDocumentsForCode` 底层服务 `ArtifactApplicationService.findArtifactsByCodePath` 已完整实现，只需在 MCPTools 层包装

### 6.3 MCPResources 实现状态

**当前实现**：
- ✅ 已实现 `listResources()` 和 `getResource(uri)`
- ✅ 支持两种资源 URI：
  - `archi://artifact/{id}` - 获取 Artifact 详情
  - `archi://vault/{name}` - 获取 Vault 详情
- ✅ 返回 JSON 格式的资源内容

**方案评估**：
- **保留理由**：MCP Resources 是标准 MCP 协议的一部分，提供资源 URI 访问方式
- **使用场景**：AI 可以通过 URI 直接访问特定资源，无需先搜索
- **建议**：✅ **保留**，但不在 MCP Server 中主动注册（可选功能）

**示例**：
```typescript
// AI 可以通过资源 URI 直接访问
const resource = await mcpResources.getResource('archi://artifact/abc123');
// 返回完整的 Artifact JSON
```

### 6.4 底层服务支持情况

**已支持的底层服务**：

1. **`ArtifactApplicationService.findArtifactsByCodePath`** ✅
   - 完整实现，支持通配符匹配
   - 通过 `MetadataRepository.findByCodePath` 查询
   - 支持路径规范化（相对于工作区根目录）
   - 返回完整的 Artifact 数组

2. **`SqliteRuntimeIndex.textSearch`** ✅
   - FTS5 全文搜索索引
   - 支持高性能全文搜索

3. **`ArtifactApplicationService.listArtifacts`** ✅
   - 支持按 vault、viewType、category 过滤
   - 支持 limit 限制

---

## 七、实施计划

### 7.1 新增功能

#### 1. 添加 `get_documents_for_code` 功能
**优先级**：⭐⭐⭐⭐⭐（核心功能）

**实现步骤**：
- [ ] 在 `MCPTools` 接口中添加方法定义：
  ```typescript
  getDocumentsForCode(params: {
    codePath: string;
  }): Promise<Artifact[]>;
  ```
- [ ] 在 `MCPToolsImpl` 中实现方法：
  ```typescript
  async getDocumentsForCode(params: {
    codePath: string;
  }): Promise<Artifact[]> {
    const result = await this.artifactService.findArtifactsByCodePath(params.codePath);
    if (result.success) {
      return result.value;
    } else {
      this.logger.error('Failed to find documents for code', result.error);
      return [];
    }
  }
  ```
- [ ] 添加错误处理和日志记录
- [ ] 添加单元测试

**依赖**：
- ✅ `ArtifactApplicationService.findArtifactsByCodePath` 已实现
- ✅ 无需额外依赖

#### 2. 优化 `search` 方法返回内容
**优先级**：⭐⭐⭐⭐⭐（核心功能优化）

**问题**：当前 `search` 方法返回的 Artifact 可能不包含 `body` 字段，AI 无法直接使用内容。

**实现步骤**：
- [ ] 在 `search` 方法中添加内容加载逻辑
- [ ] 添加 `includeContent` 和 `maxContentSize` 参数支持
- [ ] 对于每个匹配的 Artifact，读取文件内容并填充 `body` 字段
- [ ] 对于超过 `maxContentSize` 的文件，不加载内容但提供 `contentSize` 信息
- [ ] 添加错误处理（文件读取失败时不影响其他结果）
- [ ] 更新方法签名和注释

**实现示例**：
```typescript
async search(params: {
  query: string;
  vaultName?: string;
  tags?: string[];
  limit?: number;
  includeContent?: boolean;
  maxContentSize?: number;
}): Promise<Artifact[]> {
  // ... 现有搜索逻辑 ...
  
  // 加载内容（如果需要）
  const includeContent = params.includeContent !== false; // 默认 true
  const maxSize = params.maxContentSize || 1024 * 1024; // 默认 1MB
  
  for (const artifact of artifacts) {
    if (includeContent && artifact.contentLocation) {
      try {
        const stats = fs.statSync(artifact.contentLocation);
        if (stats.size <= maxSize) {
          const content = fs.readFileSync(artifact.contentLocation, 'utf-8');
          artifact.body = content;
        } else {
          artifact.contentSize = stats.size;
          // body 字段不设置，表示内容未加载
        }
      } catch (error) {
        this.logger.warn('Failed to load content', { artifactId: artifact.id, error });
        // 继续处理其他结果
      }
    }
  }
  
  return artifacts;
}
```

**依赖**：
- ✅ `fs` 模块（Node.js 内置）
- ✅ `Artifact.contentLocation` 字段已存在

#### 3. 优化 `list_entries` 默认参数
**优先级**：⭐⭐⭐（性能优化）

**实现步骤**：
- [ ] 修改 `MCPToolsImpl.listEntries` 方法
- [ ] 将默认 `limit` 从 100 改为 20
- [ ] 更新方法注释说明默认值

**代码位置**：
```typescript:131:131:apps/extension/src/modules/mcp/MCPTools.ts
limit: params.limit || 100,  // 改为 20
```

### 7.2 移除功能（不支持的功能清理）

**优先级**：⭐⭐⭐⭐（简化接口，降低维护成本）

#### 7.2.1 不支持的功能列表

根据方案设计，以下功能**明确不支持**，需要从 MCP 接口中移除：

| 功能 | 原因 | 状态 |
|------|------|------|
| `getEntry` | 单个查询，使用频率低，`search` 已覆盖 | ❌ 需删除 |
| `createEntry` | 写操作，AI 不需要创建条目 | ❌ 需删除 |
| `updateEntry` | 写操作，AI 不需要更新条目 | ❌ 需删除 |
| `deleteEntry` | 写操作，AI 不需要删除条目 | ❌ 需删除 |
| `listLinks` | 使用频率低，不是核心功能 | ❌ 需删除 |
| `createLink` | 写操作，AI 不需要创建链接 | ❌ 需删除 |

**设计原则**：
- ✅ **只读操作**：MCP 只提供查询和搜索功能
- ✅ **批量操作优先**：`search` 和 `listEntries` 已覆盖单个查询需求
- ✅ **聚焦核心**：只保留 AI 真正需要的功能

#### 7.2.2 依赖检查清单

在删除前，需要检查以下位置是否有引用：

- [ ] **代码引用检查**：
  - [ ] `apps/extension/src/main.ts` - 扩展主入口
  - [ ] `apps/extension/src/modules/**/*.ts` - 所有模块文件
  - [ ] `apps/extension/src/**/*.test.ts` - 测试文件
  - [ ] `apps/extension/src/**/*.spec.ts` - 测试文件
  - [ ] 使用全局搜索：`mcpTools\.(getEntry|createEntry|updateEntry|deleteEntry|listLinks|createLink)`
  - [ ] 使用全局搜索：`MCPTools.*(getEntry|createEntry|updateEntry|deleteEntry|listLinks|createLink)`

- [ ] **类型引用检查**：
  - [ ] 检查是否有类型定义引用这些方法
  - [ ] 检查是否有接口继承或扩展

- [ ] **文档检查**：
  - [ ] README 文件
  - [ ] API 文档
  - [ ] 注释和 JSDoc

**检查结果**（基于当前代码分析）：
- ✅ 未发现外部引用：这些方法只在 `MCPTools.ts` 中定义和实现
- ✅ 可以安全删除

#### 7.2.3 详细删除步骤

**步骤 1：删除接口定义**
- [ ] 打开 `apps/extension/src/modules/mcp/MCPTools.ts`
- [ ] 删除 `MCPTools` 接口中的以下方法定义：
  - `getEntry` (第 26-31 行)
  - `createEntry` (第 43-53 行)
  - `updateEntry` (第 55-63 行)
  - `deleteEntry` (第 65-70 行)
  - `listLinks` (第 72-77 行)
  - `createLink` (第 79-92 行)

**步骤 2：删除方法实现**
- [ ] 删除 `MCPToolsImpl` 类中的以下方法实现：
  - `getEntry` (约第 147-167 行)
  - `createEntry` (约第 277-323 行)
  - `updateEntry` (约第 325-373 行)
  - `deleteEntry` (约第 375-404 行)
  - `listLinks` (约第 406-428 行)
  - `createLink` (约第 430-475 行)

**步骤 3：清理辅助方法**
- [ ] 检查 `findArtifactById` 方法（约第 480-499 行）
  - [ ] 确认是否只被删除的方法使用
  - [ ] 如果只被删除的方法使用，则删除该方法
  - [ ] 如果被其他方法使用，则保留

**步骤 4：清理导入和依赖**
- [ ] 检查 `ArtifactLinkRepository` 导入（第 5 行）
  - [ ] 如果不再使用，删除导入
- [ ] 检查 `ArtifactLink` 类型导入（第 8 行）
  - [ ] 如果不再使用，删除导入
- [ ] 检查构造函数中的依赖注入
  - [ ] 如果 `ArtifactLinkRepository` 不再使用，从构造函数中删除

**步骤 5：更新注释和文档**
- [ ] 更新 `MCPTools` 接口的注释，说明只提供只读操作
- [ ] 更新类注释，说明已移除写操作方法
- [ ] 更新方案文档，标记功能已删除

**步骤 6：验证删除**
- [ ] 运行 TypeScript 编译，确保没有类型错误
- [ ] 运行测试，确保没有测试失败
- [ ] 检查 IDE 中是否有错误提示

#### 7.2.4 删除后的验证

**编译验证**：
```bash
cd apps/extension
npm run compile
# 应该没有类型错误
```

**测试验证**：
```bash
npm test
# 应该没有测试失败
```

**代码检查**：
- [ ] 确认 `MCPTools` 接口只包含 3 个方法：`listEntries`, `search`, `getDocumentsForCode`
- [ ] 确认没有未使用的导入
- [ ] 确认没有未使用的依赖注入

#### 7.2.5 回退方案

如果发现这些方法被其他地方使用（虽然当前检查未发现）：
- **选项 1**：保留实现但不暴露给 MCP
  - 将方法标记为 `@deprecated`
  - 添加注释说明仅内部使用
  - 不包含在 MCP 接口中

- **选项 2**：创建内部服务
  - 将写操作方法移到独立的内部服务
  - MCP 只保留只读操作

**当前建议**：直接删除，因为未发现外部引用

### 7.3 MCPResources 处理

**决策**：✅ **保留但不主动注册**

**理由**：
- MCP Resources 是标准 MCP 协议的一部分
- 提供资源 URI 访问方式，是可选功能
- 保留实现，但不强制注册到 MCP Server

**实施**：
- [ ] 保留 `MCPResources` 接口和实现
- [ ] 在 `MCPServerStarter` 中可选注册（通过配置控制）
- [ ] 更新文档说明这是可选功能

### 7.4 代码修改清单

#### 需要修改的文件：

1. **`apps/extension/src/modules/mcp/MCPTools.ts`**
   - ✅ 添加 `getDocumentsForCode` 方法定义和实现
   - ❌ 移除 `getEntry`, `createEntry`, `updateEntry`, `deleteEntry`, `listLinks`, `createLink`
   - ⚠️ 优化 `listEntries` 默认 limit 为 20
   - ⚠️ 检查并清理不再使用的辅助方法

2. **`apps/extension/src/modules/mcp/MCPResources.ts`**
   - ✅ 保留实现（可选功能）
   - ⚠️ 更新注释说明这是可选功能

3. **`apps/extension/src/modules/mcp/MCPServerStarter.ts`**
   - ⚠️ 更新工具注册逻辑（移除已删除的工具）
   - ⚠️ 更新文档和注释
   - ⚠️ 添加 MCPResources 可选注册逻辑

4. **`apps/extension/src/infrastructure/di/container.ts`**
   - ⚠️ 检查是否有需要更新的依赖注入配置

### 7.5 测试计划

**单元测试**：
- [ ] `getDocumentsForCode` 方法测试
  - 测试正常路径匹配
  - 测试通配符匹配
  - 测试无匹配结果
  - 测试错误处理

- [ ] `listEntries` 默认 limit 测试
  - 验证默认值为 20
  - 验证自定义 limit 生效

**集成测试**：
- [ ] MCP Tools 接口完整性测试
- [ ] 验证移除的方法不再可用
- [ ] 验证保留的方法正常工作

---

---

## 八、实施优先级和风险评估

### 8.1 实施优先级

**P0 - 必须实现（核心功能）**：
1. ⭐⭐⭐⭐⭐ 添加 `get_documents_for_code` 功能
   - 影响：高价值场景，覆盖 8% 使用场景
   - 难度：低（底层服务已支持）
   - 工作量：1-2 小时

2. ⭐⭐⭐⭐⭐ 优化 `search` 方法返回内容
   - 影响：核心功能优化，AI 可直接使用搜索结果内容
   - 难度：低（需要读取文件内容）
   - 工作量：1-2 小时

**P1 - 应该实现（性能优化）**：
3. ⭐⭐⭐ 优化 `list_entries` 默认 limit
   - 影响：性能优化，避免返回过大列表
   - 难度：极低
   - 工作量：5 分钟

**P2 - 建议实现（简化接口）**：
4. ⭐⭐ 移除不需要的工具方法
   - 影响：简化接口，降低维护成本
   - 难度：低（需要检查依赖）
   - 工作量：1-2 小时

### 8.2 风险评估

**低风险**：
- ✅ 添加 `getDocumentsForCode`：底层服务已完整实现，只需包装
- ✅ 优化 `listEntries` limit：简单参数修改，无副作用

**中风险**：
- ⚠️ 移除工具方法：需要检查是否有其他代码依赖这些方法
  - **缓解措施**：使用 IDE 全局搜索，检查所有引用
  - **回退方案**：如果被内部使用，可以保留实现但不暴露给 MCP

**无风险**：
- ✅ MCPResources 保留：不影响现有功能

### 8.3 依赖检查清单

在移除方法前，需要检查以下位置是否有引用：
- [ ] `apps/extension/src/main.ts` - 扩展主入口
- [ ] `apps/extension/src/modules/**/*.ts` - 所有模块
- [ ] 测试文件 `**/*.test.ts`, `**/*.spec.ts`
- [ ] 配置文件和其他可能使用的地方

### 8.4 实施时间估算

| 任务 | 优先级 | 工作量 | 风险 |
|------|--------|--------|------|
| 添加 `getDocumentsForCode` | P0 | 1-2 小时 | 低 |
| 优化 `search` 返回内容 | P0 | 1-2 小时 | 低 |
| 优化 `listEntries` limit | P1 | 5 分钟 | 低 |
| 移除不需要的工具方法 | P2 | 1-2 小时 | 中 |
| 测试和验证 | - | 1-2 小时 | 低 |
| **总计** | - | **4-7 小时** | - |

---

## 九、总结

本方案聚焦于 AI 助手最需要的核心功能，确保 MCP 服务简洁高效。

### 9.1 保留的功能（3个）

**核心功能（2个）**：
1. ✅ `search_knowledge_base` - 搜索知识库（90% 使用场景）
2. ⚠️ `get_documents_for_code` - 获取代码关联文档（8% 使用场景，需新增）

**可选功能（1个）**：
3. ✅ `list_entries` - 列出知识库条目（2% 使用场景）

**可选资源（1个）**：
4. ✅ `MCPResources` - 资源 URI 访问（可选，保留但不强制注册）

### 9.2 方案优势

- ✅ **聚焦核心**：只保留 AI 真正需要的功能
- ✅ **简洁高效**：3 个核心功能覆盖 100% 使用场景
- ✅ **易于维护**：减少不必要的功能，降低维护成本
- ✅ **性能优化**：避免返回过大列表，提升响应速度
- ✅ **底层支持完善**：核心功能底层服务已完整实现

### 9.3 实施建议

**第一阶段（立即实施）**：
1. 添加 `getDocumentsForCode` 功能（P0）
2. 优化 `listEntries` 默认 limit（P1）

**第二阶段（后续优化）**：
1. 移除不需要的工具方法（P2）
2. 完善测试覆盖
3. 更新文档

### 9.4 未来扩展

**标准 MCP 协议支持**：
- 当前是进程内实现，未来可以添加标准 MCP 协议层
- **只实现 stdio 传输**（推荐，满足所有需求）
- **不实现 HTTP 传输**（不适用于 VS Code 扩展内嵌场景）
- 当需要与外部 MCP Client（如 Claude Desktop）集成时再实现
- 推荐使用 `@modelcontextprotocol/sdk` 标准库简化实现

**可能的增强功能**：
- 搜索结果的排序和相关性评分
- 批量查询支持
- 缓存机制优化
- 工具自动注册和 schema 生成

---

**文档版本**：v1.1  
**最后更新**：2024-12-19  
**维护者**：ArchiTool Team  
**状态**：方案完善，待实施

