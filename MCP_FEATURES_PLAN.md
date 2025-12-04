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

**清理状态**：详见 [9.2 移除功能（不支持的功能清理）](#92-移除功能不支持的功能清理)

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

## 五、MCP 配置和使用指南

### 5.1 当前使用方式（进程内调用）

**自动启动**：
- MCP Server 在 VS Code 扩展激活时自动启动
- 无需手动配置或启动命令
- 所有功能在扩展进程内可用

**在扩展代码中使用**：

1. **通过依赖注入获取 MCPTools**：
```typescript
import { TYPES } from './infrastructure/di/types';
import { MCPTools } from './modules/mcp/MCPTools';
import { Container } from 'inversify';

// 从容器中获取 MCPTools 实例
const mcpTools = container.get<MCPTools>(TYPES.MCPTools);

// 使用搜索功能
const results = await mcpTools.search({
  query: "用户登录",
  limit: 10
});
```

2. **通过 MCPServerStarter 获取**：
```typescript
import { MCPServerStarter } from './modules/mcp/MCPServerStarter';

const mcpStarter = container.get<MCPServerStarter>(TYPES.MCPServerStarter);
await mcpStarter.start();

const tools = mcpStarter.getTools();
if (tools) {
  const results = await tools.search({ query: "架构设计" });
}
```

**在 VS Code 命令中使用**：

```typescript
// 在 main.ts 中注册命令
vscode.commands.registerCommand('archi.mcp.search', async () => {
  const mcpTools = container.get<MCPTools>(TYPES.MCPTools);
  const results = await mcpTools.search({ query: "登录" });
  // 处理结果...
});
```

**配置检查**：
- ✅ MCP Server 在扩展激活时自动启动（见 `main.ts` 第 631-638 行）
- ✅ 无需额外配置文件
- ✅ 无需多进程管理
- ✅ 所有功能在扩展进程内可用

**验证 MCP 是否运行**：
在扩展的开发者工具中检查日志：
```
[ArchiTool] MCP Server initialized successfully
[ArchiTool] MCP Server started with X resources
```

### 5.2 未来配置方式（可选，计划中）

如果需要与外部 MCP Client（如 Claude Desktop）集成，未来可考虑以下配置方式：

**⚠️ 重要：这些配置方式会导致多进程**

#### Claude Desktop 配置示例（未来）

```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "/path/to/architool/apps/extension/dist/mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "/path/to/workspace"
      }
    }
  }
}
```

**进程架构**：
```
Claude Desktop 进程
    └─ 启动独立的 MCP Server 进程（Node.js）
        └─ 通过 stdio 与 Claude Desktop 通信
```
- ⚠️ **会创建新进程**：Claude Desktop 会启动一个独立的 Node.js 进程运行 MCP Server
- ⚠️ **与 VS Code 扩展分离**：如果 VS Code 扩展也在运行，会有两个进程：
  - VS Code 扩展进程（包含进程内 MCP 接口）
  - 独立的 MCP Server 进程（通过 stdio 与 Claude Desktop 通信）
- ⚠️ **状态不共享**：两个进程无法共享扩展的上下文和状态

#### Cursor 配置示例（未来）

```json
{
  "mcpServers": {
    "architool": {
      "command": "code",
      "args": [
        "--extensionDevelopmentPath=/path/to/architool",
        "--executeCommand=architool.mcp.start"
      ]
    }
  }
}
```

**进程架构**：
```
Cursor 进程
    └─ 可能启动新的 VS Code 实例或连接到现有实例
        └─ VS Code 扩展进程（包含 MCP 接口）
```
- ⚠️ **可能创建新进程**：取决于 Cursor 的实现方式
  - 如果连接到现有 VS Code 实例：共享进程
  - 如果启动新 VS Code 实例：会有多个进程
- ⚠️ **复杂度较高**：需要处理 VS Code 实例管理和命令执行

#### 进程架构对比

| 配置方式 | 进程数 | 进程关系 | 状态共享 | 复杂度 |
|---------|--------|---------|---------|--------|
| **当前（进程内）** | 1 | - | ✅ 完全共享 | ⭐ 低 |
| **Claude Desktop** | 2+ | 独立进程 | ❌ 不共享 | ⭐⭐⭐ 高 |
| **Cursor** | 1-2+ | 可能共享 | ⚠️ 可能共享 | ⭐⭐ 中 |

#### 推荐方案：混合架构（支持 Cursor 和其他 AI Agent）

**方案：VS Code 扩展启动 stdio MCP Server 子进程**

这是支持 Cursor 或其他 AI Agent 调用 MCP 的最佳方案。

**架构设计**：
```
VS Code 扩展进程（主进程）
    ├─ VS Code 扩展功能
    ├─ MCP 接口（进程内调用，供扩展内部使用）
    └─ MCP Server 子进程（stdio）
        ├─ 通过 IPC 调用主进程的 MCP 接口
        └─ 通过 stdio 与外部 MCP Client（Cursor/Claude Desktop）通信
```

**实现步骤**：

1. **创建独立的 MCP Server 入口文件**：
   - 创建 `apps/extension/src/mcp-server.ts`（或 `dist/mcp-server.js`）
   - 实现 stdio 传输层（使用 `@modelcontextprotocol/sdk`）
   - 通过 IPC 与主进程通信

2. **IPC 通信机制**：
   - 子进程通过 Node.js IPC（`process.send`/`process.on`）与主进程通信
   - 主进程监听 IPC 消息，调用 `MCPTools` 接口
   - 返回结果通过 IPC 传回子进程

3. **子进程启动方式**：
   - VS Code 扩展在激活时可选启动 MCP Server 子进程
   - 通过配置控制是否启动（默认关闭，按需开启）

4. **Cursor 配置**：
```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "/path/to/architool/apps/extension/dist/mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

**优势**：
- ✅ **状态共享**：子进程通过 IPC 调用主进程接口，可以访问扩展的完整状态
- ✅ **统一数据源**：所有 MCP 调用都通过主进程的 `MCPTools`，数据一致
- ✅ **灵活配置**：可以同时支持进程内调用和外部 MCP Client
- ✅ **标准协议**：使用标准 MCP 协议（stdio），兼容所有 MCP Client

**进程架构**：
- 主进程：VS Code 扩展进程（包含 MCP 接口和业务逻辑）
- 子进程：MCP Server 进程（仅负责协议转换，通过 IPC 调用主进程）

**实现示例**（伪代码）：

```typescript
// apps/extension/src/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// 通过 IPC 与主进程通信
process.on('message', async (msg) => {
  if (msg.type === 'mcp-call') {
    // 调用主进程的 MCP 接口
    const result = await callMainProcessMCP(msg.method, msg.params);
    process.send({ type: 'mcp-result', id: msg.id, result });
  }
});

const server = new Server({
  name: 'architool-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

// 注册工具
server.setRequestHandler('tools/call', async (request) => {
  // 通过 IPC 调用主进程
  return new Promise((resolve) => {
    const id = Date.now();
    process.send({
      type: 'mcp-call',
      id,
      method: request.params.name,
      params: request.params.arguments,
    });
    
    process.once('message', (msg) => {
      if (msg.id === id) {
        resolve(msg.result);
      }
    });
  });
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

```typescript
// apps/extension/src/modules/mcp/MCPServerStarter.ts
// 在主进程中添加 IPC 监听
if (process.send) {
  process.on('message', async (msg) => {
    if (msg.type === 'mcp-call') {
      const tools = this.getTools();
      if (tools) {
        const result = await tools[msg.method](msg.params);
        process.send({
          type: 'mcp-result',
          id: msg.id,
          result,
        });
      }
    }
  });
}
```

#### 其他方案对比

1. **进程内实现（当前）**
   - ✅ 单进程，简单高效
   - ✅ 状态完全共享
   - ❌ **限制**：Cursor 无法直接访问扩展内部的接口（除非 Cursor 支持 VS Code 扩展 API）

2. **完全独立的 MCP Server 进程（不推荐）**
   - ❌ 无法共享扩展的上下文和状态
   - ❌ 需要独立管理数据访问和配置
   - ❌ 数据可能不一致

**注意**：
- 当前版本使用进程内实现，无需外部配置
- 上述配置方式仅在实现标准 MCP 协议（stdio）后可用
- 实现标准协议会增加进程管理复杂度，仅在明确需要外部集成时考虑
- **如果使用外部配置，确实会导致多个进程**

---

## 六、支持 Cursor 和其他 AI Agent 的方案

### 6.1 需求分析

**目标**：让 Cursor 或其他 AI Agent 能够调用 ArchiTool 的 MCP 功能。

**挑战**：
- Cursor 等 AI Agent 无法直接访问 VS Code 扩展内部的接口
- 需要标准 MCP 协议（stdio）支持
- 需要保持与扩展的状态共享和数据一致性

### 6.2 推荐方案：混合架构

**方案概述**：VS Code 扩展启动 stdio MCP Server 子进程，子进程通过 IPC 调用主进程的 MCP 接口。

**架构图**：
```
┌─────────────────────────────────────┐
│  VS Code 扩展进程（主进程）          │
│  ┌───────────────────────────────┐  │
│  │ VS Code 扩展功能              │  │
│  │ MCP 接口（进程内调用）         │  │
│  │   - MCPTools                  │  │
│  │   - MCPResources              │  │
│  └───────────────────────────────┘  │
│           ↕ IPC 通信                 │
│  ┌───────────────────────────────┐  │
│  │ MCP Server 子进程（stdio）     │  │
│  │   - 协议转换层                 │  │
│  │   - stdio 传输                 │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
           ↕ stdio
┌─────────────────────────────────────┐
│  Cursor / Claude Desktop            │
│  （外部 MCP Client）                │
└─────────────────────────────────────┘
```

**实现步骤**：

#### 步骤 1：创建 MCP Server 入口文件

创建 `apps/extension/src/mcp-server.ts`：

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// 通过 IPC 与主进程通信
async function callMainProcess(method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random()}`;
    
    // 发送请求到主进程（如果通过 spawn 启动，使用 IPC）
    if (process.send) {
      process.send({
        type: 'mcp-call',
        id,
        method,
        params,
      });
      
      // 监听响应
      const handler = (msg: any) => {
        if (msg.type === 'mcp-result' && msg.id === id) {
          process.removeListener('message', handler);
          if (msg.error) {
            reject(new Error(msg.error));
          } else {
            resolve(msg.result);
          }
        }
      };
      process.on('message', handler);
    } else {
      // 如果没有 IPC，直接调用（开发模式）
      reject(new Error('IPC not available'));
    }
  });
}

const server = new Server({
  name: 'architool-mcp-server',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {
      listChanged: true,
    },
  },
});

// 注册工具
server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'search_knowledge_base',
        description: '全文搜索知识库条目',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '搜索关键词' },
            vaultName: { type: 'string', description: '可选，指定 vault' },
            tags: { type: 'array', items: { type: 'string' } },
            limit: { type: 'number', default: 50 },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_documents_for_code',
        description: '根据代码路径获取关联的文档/设计图',
        inputSchema: {
          type: 'object',
          properties: {
            codePath: { type: 'string', description: '代码文件路径' },
          },
          required: ['codePath'],
        },
      },
      {
        name: 'list_entries',
        description: '列出知识库条目',
        inputSchema: {
          type: 'object',
          properties: {
            vaultName: { type: 'string' },
            viewType: { type: 'string' },
            category: { type: 'string' },
            limit: { type: 'number', default: 20 },
          },
        },
      },
    ],
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    const result = await callMainProcess(name, args);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ArchiTool MCP Server started');
}

main().catch(console.error);
```

#### 步骤 2：在主进程中添加 IPC 监听

修改 `apps/extension/src/modules/mcp/MCPServerStarter.ts`：

```typescript
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export class MCPServerStarter {
  private mcpServerProcess: ChildProcess | null = null;
  
  async start(): Promise<void> {
    // ... 现有代码 ...
    
    // 可选：启动 stdio MCP Server 子进程（用于外部 MCP Client）
    if (this.shouldStartStdioServer()) {
      await this.startStdioServer();
    }
  }
  
  private async startStdioServer(): Promise<void> {
    const serverPath = path.join(__dirname, '../mcp-server.js');
    
    this.mcpServerProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'], // 启用 IPC
      env: {
        ...process.env,
        WORKSPACE_ROOT: this.workspaceRoot,
      },
    });
    
    // 监听子进程的 IPC 消息
    this.mcpServerProcess.on('message', async (msg: any) => {
      if (msg.type === 'mcp-call') {
        try {
          const tools = this.getTools();
          if (!tools) {
            throw new Error('MCP Tools not available');
          }
          
          // 调用对应的工具方法
          let result: any;
          switch (msg.method) {
            case 'search_knowledge_base':
              result = await tools.search(msg.params);
              break;
            case 'get_documents_for_code':
              result = await tools.getDocumentsForCode(msg.params);
              break;
            case 'list_entries':
              result = await tools.listEntries(msg.params);
              break;
            default:
              throw new Error(`Unknown method: ${msg.method}`);
          }
          
          // 返回结果
          this.mcpServerProcess?.send({
            type: 'mcp-result',
            id: msg.id,
            result,
          });
        } catch (error: any) {
          this.mcpServerProcess?.send({
            type: 'mcp-result',
            id: msg.id,
            error: error.message,
          });
        }
      }
    });
    
    this.mcpServerProcess.on('error', (error) => {
      this.logger.error('MCP Server process error', error);
    });
    
    this.mcpServerProcess.on('exit', (code) => {
      this.logger.info(`MCP Server process exited with code ${code}`);
      this.mcpServerProcess = null;
    });
  }
  
  private shouldStartStdioServer(): boolean {
    // 可以通过配置控制是否启动
    // 例如：读取 VS Code 配置或环境变量
    return process.env.ENABLE_MCP_STDIO_SERVER === 'true';
  }
  
  async stop(): Promise<void> {
    // ... 现有代码 ...
    
    if (this.mcpServerProcess) {
      this.mcpServerProcess.kill();
      this.mcpServerProcess = null;
    }
  }
}
```

#### 步骤 3：Cursor 配置

在 Cursor 的 MCP 配置中添加：

```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "/path/to/architool/apps/extension/dist/mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "${workspaceFolder}"
      }
    }
  }
}
```

**注意**：这种方式下，Cursor 会直接启动 MCP Server 进程，而不是通过 VS Code 扩展。如果需要共享状态，需要额外的机制（如共享数据库或文件系统）。

#### 步骤 4：替代方案 - 通过 VS Code 命令桥接

如果希望完全通过扩展进程，可以使用 VS Code 命令作为桥接：

```typescript
// 在扩展中注册命令
vscode.commands.registerCommand('architool.mcp.search', async (params) => {
  const mcpTools = container.get<MCPTools>(TYPES.MCPTools);
  return await mcpTools.search(params);
});

// MCP Server 子进程通过执行 VS Code 命令调用
// 但这需要额外的进程间通信机制
```

### 6.3 方案对比

| 方案 | 进程数 | 状态共享 | 实现复杂度 | 适用场景 |
|------|--------|---------|-----------|---------|
| **混合架构（推荐）** | 2 | ✅ 通过 IPC | ⭐⭐ 中 | Cursor、Claude Desktop |
| **独立进程** | 2+ | ❌ 不共享 | ⭐⭐ 中 | 简单场景，可接受状态分离 |
| **VS Code 命令桥接** | 2+ | ⚠️ 部分共享 | ⭐⭐⭐ 高 | 需要完全通过扩展 |

### 6.4 实施建议

1. **第一阶段**：实现混合架构
   - 创建 MCP Server 入口文件
   - 实现 IPC 通信机制
   - 在主进程中添加 IPC 监听

2. **第二阶段**：优化和配置
   - 添加配置选项控制是否启动子进程
   - 优化 IPC 通信性能
   - 添加错误处理和重连机制

3. **第三阶段**：文档和测试
   - 编写 Cursor 配置文档
   - 添加集成测试
   - 验证与多个 MCP Client 的兼容性

### 6.5 注意事项

1. **进程管理**：
   - 需要正确管理子进程的生命周期
   - 处理子进程崩溃和重启
   - 清理资源

2. **IPC 通信**：
   - 确保 IPC 消息格式一致
   - 处理异步调用的超时
   - 错误处理和日志记录

3. **性能考虑**：
   - IPC 通信有开销，但通常可接受
   - 考虑批量操作以减少 IPC 调用次数

4. **安全性**：
   - 验证 IPC 消息来源
   - 限制可调用的方法
   - 防止恶意调用

---

## 七、MCP Server 架构设计

### 7.1 当前架构（进程内实现）

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

### 7.2 未来架构（标准 MCP 协议）

**重要考虑：进程架构**

由于 MCP 和 VS Code 扩展在同一个项目中且同时运行，需要仔细考虑进程架构：

**方案 A：进程内实现（当前，推荐保持）**
```
VS Code 扩展进程
    ├─ VS Code 扩展功能
    └─ MCP 接口（进程内调用）
        └─ MCPTools / MCPResources
```
- ✅ **优势**：无需多进程，简单高效
- ✅ **适用场景**：VS Code 内部 AI 助手（如 Cursor 内置 AI）
- ❌ **限制**：无法直接与外部 MCP Client（如 Claude Desktop）集成

**方案 B：混合架构（可选，未来考虑）**
```
VS Code 扩展进程（主进程）
    ├─ VS Code 扩展功能
    ├─ MCP 接口（进程内调用）
    └─ MCP Server 子进程（stdio）
        ├─ 通过 IPC 调用主进程的 MCP 接口
        └─ 通过 stdio 与外部 MCP Client 通信
```
- ✅ **优势**：既支持内部调用，也支持外部 MCP Client
- ⚠️ **复杂度**：需要管理子进程和 IPC 通信
- ⚠️ **适用场景**：需要同时支持内部和外部 MCP Client

**方案 C：外部启动（不适用于 VS Code 扩展）**
```
外部 MCP Client（如 Claude Desktop）
    └─ 启动 MCP Server 子进程（stdio）
        └─ 独立的 MCP Server 进程
```
- ❌ **不适用**：VS Code 扩展无法作为独立进程被外部启动
- ⚠️ **适用场景**：独立的 MCP Server 应用

**结论和建议**：

1. **当前阶段（推荐）**：保持进程内实现
   - ✅ 简单高效，无需多进程管理
   - ✅ 适合 VS Code 扩展内嵌场景
   - ✅ 与 Cursor 等内置 AI 助手集成更方便

2. **未来扩展（可选）**：如果需要与外部 MCP Client 集成
   - 考虑混合架构（方案 B）
   - VS Code 扩展启动 stdio MCP Server 子进程
   - 子进程通过 IPC 调用主进程的 MCP 接口
   - 外部 MCP Client 通过 stdio 与子进程通信

3. **不推荐**：完全独立的 MCP Server 进程
   - VS Code 扩展不适合作为独立进程运行
   - 无法共享扩展的上下文和状态

**传输方式选择**：

**✅ 推荐：只实现 stdio 传输**（如果未来需要外部集成）

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

**需要实现的内容**（如果未来需要外部集成）：
1. **传输层（stdio）**：
   - 监听标准输入（stdin）
   - 输出到标准输出（stdout）
   - 处理 JSON-RPC 2.0 消息格式

2. **协议层**：
   - JSON-RPC 2.0 消息解析和构建
   - 工具注册和调用机制
   - 资源 URI 处理机制
   - 错误处理和日志记录

3. **IPC 通信层**（混合架构需要）：
   - 子进程与主进程的通信机制
   - 调用主进程的 MCP 接口
   - 结果返回和错误处理

4. **工具注册**：
   - 自动注册所有 MCPTools 方法
   - 生成工具描述和参数 schema
   - 支持工具调用和结果返回

**实施建议**：
- **当前阶段**：保持进程内实现，专注于功能完善
- **未来阶段**：只有当明确需要与外部 MCP Client（如 Claude Desktop）集成时，再考虑混合架构
- **推荐使用**：`@modelcontextprotocol/sdk` 标准库简化实现（如果实现 stdio）
- **只实现 stdio，不实现 HTTP**

### 7.3 进程架构总结

**关键问题**：MCP 和 VS Code 扩展在同一个项目中且同时运行，是否需要多进程？

**答案**：
- **当前（推荐）**：**不需要多进程**，保持进程内实现
- **未来（可选）**：仅在需要外部 MCP Client 集成时，考虑混合架构（主进程 + stdio 子进程）

**进程架构对比**：

| 架构方案 | 进程数 | 复杂度 | 适用场景 | 推荐度 |
|---------|--------|--------|---------|--------|
| **进程内实现** | 1 | ⭐ 低 | VS Code 扩展内嵌，Cursor 等内置 AI | ✅✅✅ **强烈推荐** |
| **混合架构** | 2 | ⭐⭐ 中 | 需要同时支持内部和外部 MCP Client | ⚠️ 可选 |
| **独立进程** | 2+ | ⭐⭐⭐ 高 | 独立 MCP Server 应用 | ❌ 不适用 |

**建议**：
1. ✅ **保持进程内实现**：简单高效，满足大部分场景
2. ⚠️ **仅在明确需要时**：考虑混合架构（如需要与 Claude Desktop 集成）
3. ❌ **避免独立进程**：VS Code 扩展不适合作为独立进程运行

### 7.4 传输方式详细对比

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

### 7.5 工具注册机制

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

## 八、当前实现状态分析

### 8.1 MCP Server 架构现状

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

### 8.2 MCPTools 实现状态

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

### 8.3 MCPResources 实现状态

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

### 8.4 底层服务支持情况

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

## 九、实施计划

### 9.1 新增功能

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

### 9.2 移除功能（不支持的功能清理）

**优先级**：⭐⭐⭐⭐（简化接口，降低维护成本）

#### 9.2.1 不支持的功能列表

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

#### 9.2.2 依赖检查清单

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

#### 9.2.3 详细删除步骤

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

#### 9.2.4 删除后的验证

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

#### 9.2.5 回退方案

如果发现这些方法被其他地方使用（虽然当前检查未发现）：
- **选项 1**：保留实现但不暴露给 MCP
  - 将方法标记为 `@deprecated`
  - 添加注释说明仅内部使用
  - 不包含在 MCP 接口中

- **选项 2**：创建内部服务
  - 将写操作方法移到独立的内部服务
  - MCP 只保留只读操作

**当前建议**：直接删除，因为未发现外部引用

### 9.3 MCPResources 处理

**决策**：✅ **保留但不主动注册**

**理由**：
- MCP Resources 是标准 MCP 协议的一部分
- 提供资源 URI 访问方式，是可选功能
- 保留实现，但不强制注册到 MCP Server

**实施**：
- [ ] 保留 `MCPResources` 接口和实现
- [ ] 在 `MCPServerStarter` 中可选注册（通过配置控制）
- [ ] 更新文档说明这是可选功能

### 9.4 代码修改清单

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

### 9.5 测试计划

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

## 十、实施优先级和风险评估

### 10.1 实施优先级

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

### 10.2 风险评估

**低风险**：
- ✅ 添加 `getDocumentsForCode`：底层服务已完整实现，只需包装
- ✅ 优化 `listEntries` limit：简单参数修改，无副作用

**中风险**：
- ⚠️ 移除工具方法：需要检查是否有其他代码依赖这些方法
  - **缓解措施**：使用 IDE 全局搜索，检查所有引用
  - **回退方案**：如果被内部使用，可以保留实现但不暴露给 MCP

**无风险**：
- ✅ MCPResources 保留：不影响现有功能

### 10.3 依赖检查清单

在移除方法前，需要检查以下位置是否有引用：
- [ ] `apps/extension/src/main.ts` - 扩展主入口
- [ ] `apps/extension/src/modules/**/*.ts` - 所有模块
- [ ] 测试文件 `**/*.test.ts`, `**/*.spec.ts`
- [ ] 配置文件和其他可能使用的地方

### 10.4 实施时间估算

| 任务 | 优先级 | 工作量 | 风险 |
|------|--------|--------|------|
| 添加 `getDocumentsForCode` | P0 | 1-2 小时 | 低 |
| 优化 `search` 返回内容 | P0 | 1-2 小时 | 低 |
| 优化 `listEntries` limit | P1 | 5 分钟 | 低 |
| 移除不需要的工具方法 | P2 | 1-2 小时 | 中 |
| 测试和验证 | - | 1-2 小时 | 低 |
| **总计** | - | **4-7 小时** | - |

---

## 十一、总结

本方案聚焦于 AI 助手最需要的核心功能，确保 MCP 服务简洁高效。

### 11.1 保留的功能（3个）

**核心功能（2个）**：
1. ✅ `search_knowledge_base` - 搜索知识库（90% 使用场景）
2. ⚠️ `get_documents_for_code` - 获取代码关联文档（8% 使用场景，需新增）

**可选功能（1个）**：
3. ✅ `list_entries` - 列出知识库条目（2% 使用场景）

**可选资源（1个）**：
4. ✅ `MCPResources` - 资源 URI 访问（可选，保留但不强制注册）

### 11.2 方案优势

- ✅ **聚焦核心**：只保留 AI 真正需要的功能
- ✅ **简洁高效**：3 个核心功能覆盖 100% 使用场景
- ✅ **易于维护**：减少不必要的功能，降低维护成本
- ✅ **性能优化**：避免返回过大列表，提升响应速度
- ✅ **底层支持完善**：核心功能底层服务已完整实现

### 11.3 实施建议

**第一阶段（立即实施）**：
1. 添加 `getDocumentsForCode` 功能（P0）
2. 优化 `listEntries` 默认 limit（P1）

**第二阶段（后续优化）**：
1. 移除不需要的工具方法（P2）
2. 完善测试覆盖
3. 更新文档

### 11.4 未来扩展

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

