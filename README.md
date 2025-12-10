# ArchiTool

**ArchiTool** 是一个 VS Code 扩展，用于架构管理和知识库管理。它提供了完整的架构文档管理、设计图编辑、以及通过 MCP (Model Context Protocol) 为 AI 助手提供知识库访问能力。

## 📋 目录

- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [MCP 集成](#mcp-集成)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [相关文档](#相关文档)

## ✨ 功能特性

### 核心功能

1. **知识库管理**
   - 支持多个 Vault（知识库）
   - 支持本地 Vault 和 Git Vault
   - 文档、设计图、开发文档的统一管理

2. **设计图编辑**
   - **Mermaid 图表**：支持流程图、序列图、类图等
   - **PlantUML 图表**：支持 UML 各种图表类型
   - 可视化编辑和预览

3. **文档管理**
   - Markdown 文档支持
   - 文档分类和标签
   - 文档关联（文档间链接、代码关联）

4. **视点视图**
   - 多维度查看架构文档
   - 按类型、分类、标签组织
   - 代码与文档的关联视图

5. **MCP 集成** ⭐
   - 通过 MCP 协议为 AI 助手提供知识库访问
   - 支持全文搜索、代码关联查询
   - 与 Claude Desktop、Cursor 等 AI 工具集成

### VS Code 视图

扩展在 VS Code 侧边栏提供以下视图：

- **Documents**：文档和设计图管理
- **Tasks**：任务管理
- **Viewpoints**：视点视图（多维度查看）
- **Assistants**：模板和 AI 增强功能

## 🚀 快速开始

### 安装

1. 在 VS Code 中打开扩展市场
2. 搜索 "ArchiTool" 并安装
3. 扩展会在工作区根目录创建 `.architool` 目录

### 基本使用

1. **创建 Vault**
   - 点击侧边栏 "Documents" 视图的 "+" 按钮
   - 选择 "Add Local Vault" 创建本地知识库
   - 或选择 "Add Vault from Git" 从 Git 仓库导入

2. **添加文档**
   - 在 Vault 上右键，选择 "Add File" 创建文档
   - 或选择 "Add Diagram" 创建设计图（Mermaid/PlantUML）

3. **编辑设计图**
   - 双击 `.mmd` 文件打开 Mermaid 编辑器
   - 双击 `.puml` 文件打开 PlantUML 编辑器

4. **关联代码**
   - 在文档元数据中配置 `relatedCodePaths`
   - 支持通配符匹配（如 `src/auth/*`）

## 🔧 MCP 集成



ArchiTool 通过 MCP 提供以下 3 个核心功能：

| 功能 | 使用场景 | 状态 |
|------|---------|------|
| `search_knowledge_base` | 全文搜索（90%） | ✅ 已实现 |
| `get_documents_for_code` | 代码关联查询（8%） | ✅ 已实现 |
| `list_entries` | 列表浏览（2%） | ✅ 已实现 |

#### 1. `search_knowledge_base` ⭐⭐⭐⭐⭐

全文搜索知识库条目，覆盖 90% 的使用场景。

**使用示例**：
- 基本搜索：`search({ query: "用户登录", limit: 10 })`
- 按标签过滤：`search({ query: "", tags: ["requirement"] })`
- 指定 vault：`search({ query: "架构", vaultName: "demo-vault-document" })`

**返回**：完整的 Artifact 数组，包含基本信息、完整内容（`body` 字段）和元数据。

#### 2. `get_documents_for_code` ⭐⭐⭐⭐⭐

根据代码路径查找关联的文档/设计图，覆盖 8% 的使用场景。

**使用示例**：
- 查看文件关联文档：`getDocumentsForCode({ codePath: "src/auth/login.ts" })`
- 查看目录关联文档：`getDocumentsForCode({ codePath: "src/auth" })`

**说明**：支持通配符匹配（如 `src/auth/*` 匹配 `src/auth/login.ts`），自动返回所有匹配的文档和设计图。

#### 3. `list_entries` ⭐⭐

列出知识库条目（按类型和分类过滤），使用频率较低（约 2%）。

**使用示例**：
- 列出所有设计图：`listEntries({ viewType: "design", limit: 20 })`
- 获取 vault 列表：`listEntries({ limit: 1 })`

### 不支持的功能

以下功能已明确移除，不在 MCP 接口中提供：

- `getEntry` - 单个查询（`search` 已覆盖）
- `createEntry` - 写操作（AI 不需要）
- `updateEntry` - 写操作（AI 不需要）
- `deleteEntry` - 写操作（AI 不需要）
- `listLinks` - 使用频率低
- `createLink` - 写操作（AI 不需要）

### 内容返回策略

- **默认行为**：返回完整内容（`body` 字段），AI 可直接使用
- **大文件处理**：超过 1MB 的文件不加载内容，但提供 `contentSize` 字段
- **可选控制**：通过 `includeContent: false` 只返回元数据

### 使用配置

**自动启动**：MCP Server 在扩展激活时自动启动，无需手动配置。

**在扩展代码中使用**：

通过依赖注入获取 `MCPTools` 实例：
```typescript
const mcpTools = container.get<MCPTools>(TYPES.MCPTools);
const results = await mcpTools.search({ query: "用户登录" });
```

**验证运行状态**：检查扩展日志中的 `MCP Server initialized successfully` 消息。

### 使用场景示例

#### 场景 1：AI 助手搜索文档

AI 助手搜索"登录"相关的文档，返回结果包含完整内容，可直接使用。

#### 场景 2：查看代码关联的文档

用户打开 `src/auth/login.ts` 时，AI 自动获取相关文档和设计图，帮助理解代码的业务背景。

#### 场景 3：浏览特定类型的文档

列出所有设计图或特定分类的文档，用于浏览和筛选。

### Cursor 配置

在 Cursor 的 MCP 配置文件中添加 ArchiTool 服务器配置。

**配置文件位置**：
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

**MCP Server 脚本路径**：

扩展激活时会自动将 MCP Server 复制到固定位置，无需查找扩展安装目录。

**固定路径**：
- macOS/Linux: `~/.architool/mcp-server/mcp-server.js`
- Windows: `%USERPROFILE%\.architool\mcp-server\mcp-server.js`

**配置示例**：

**macOS/Linux**：
```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "~/.architool/mcp-server/mcp-server.js"
      ]
    }
  }
}
```

**Windows**：
```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "%USERPROFILE%\\.architool\\mcp-server\\mcp-server.js"
      ]
    }
  }
}
```

**注意**：
- 路径使用 `~` 或 `%USERPROFILE%` 会自动展开为用户主目录
- 扩展激活时会自动复制 MCP Server 到该位置
- 如果扩展更新，MCP Server 会自动更新（通过文件时间戳比较）


## 📁 项目结构

```
VSKnowledgebase/
├── apps/
│   ├── extension/          # VS Code 扩展主程序
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── mcp/    # MCP 相关实现
│   │   │   │   │   ├── MCPTools.ts        # MCP 工具接口和实现
│   │   │   │   │   ├── MCPResources.ts    # MCP 资源接口和实现
│   │   │   │   │   └── MCPServerStarter.ts # MCP Server 启动器
│   │   │   │   ├── editor/ # 编辑器实现
│   │   │   │   ├── shared/ # 共享业务逻辑
│   │   │   │   └── ...
│   │   │   └── main.ts     # 扩展入口
│   │   └── package.json
│   └── webview/            # Webview 前端
├── packages/
│   ├── architool-mcp-server/   # MCP Server
│   └── demo-vaults/            # 示例知识库集合
│       ├── demo-vault-document/    # 文档类型示例
│       ├── demo-vault-assistant/   # AI 助手类型示例
│       └── demo-vault-task/        # 任务类型示例
├── MCP_FEATURES_PLAN.md    # MCP 功能方案文档
└── README.md               # 本文档
```

### 关键目录说明

- **`.architool/`**：工作区根目录下的配置和数据目录
  - 每个 Vault 一个子目录
  - 包含 artifacts、metadata、templates 等

- **`apps/extension/src/modules/mcp/`**：MCP 实现
  - `MCPTools.ts`：核心工具接口（3 个方法）
  - `MCPResources.ts`：资源访问接口（可选）
  - `MCPServerStarter.ts`：服务器启动器

## 🛠️ 开发指南

### 环境要求

- Node.js >= 18.0.0
- VS Code >= 1.80.0
- pnpm（推荐）或 npm

### 快速开始

**在项目根目录执行**：

```bash
# 1. 安装依赖
pnpm install

# 2. 重新编译 better-sqlite3（为 Electron 环境）
cd apps/extension && pnpm run rebuild:electron && cd ../..
```

### 开发工作流

#### 开发模式

**在项目根目录执行**：

```bash
# 监听模式（自动编译）
pnpm run watch
```

在 VS Code 中按 `F5` 启动调试。

#### 构建项目

**在项目根目录执行**：

```bash
# 构建所有模块（编译 TypeScript、构建子包等）
pnpm run build

# 只构建扩展
pnpm run build:extension

# 只构建 webview
pnpm run build:webview
```

**注意**：`build` 命令只构建项目，**不会生成 `.vsix` 文件**。要生成 `.vsix` 文件，请使用 [打包发布](#打包发布) 章节中的 `package` 命令。

#### 运行测试

**在项目根目录执行**：

```bash
# 运行所有测试
pnpm test
```

### 打包发布

将扩展打包为 `.vsix` 文件，用于发布或本地安装。

**重要**：`pnpm run build` 只构建项目，**不会生成 `.vsix` 文件**。要生成 `.vsix` 文件，必须使用下面的 `package` 命令。

#### 打包命令

**在项目根目录执行**：

```bash
# 完整打包（推荐）：构建 + 重新编译 native 模块 + 打包生成 .vsix
pnpm run package

# 快速打包：仅打包（跳过构建和重新编译）
pnpm run package:quick
```

**打包流程**：
1. 构建所有子包（webview）
2. 编译 TypeScript 代码
3. 重新编译 `better-sqlite3`（为 Electron 环境，可能需要 2-5 分钟）
4. 使用 `vsce` 打包生成 `.vsix` 文件

**输出位置**：`apps/extension/architool-{version}.vsix`

#### 安装测试

**方式 1：命令行安装（在项目根目录执行）**
```bash
code --install-extension apps/extension/architool-0.1.0.vsix
```

**方式 2：VS Code GUI**
1. 打开扩展视图（`Ctrl+Shift+X` / `Cmd+Shift+X`）
2. 点击 "..." 菜单 → "Install from VSIX..."
3. 选择 `apps/extension/architool-{version}.vsix`

#### 打包前检查

- ✅ 检查 `apps/extension/package.json` 中的 `version` 字段
- ✅ 确认 `publisher` 字段（当前为 `"architool"`）
- ✅ 确保已执行 `pnpm install`

**注意事项**：
- ⚠️ `better-sqlite3` 需要为 VSCode 的 Electron 环境重新编译，首次打包会自动执行
- ⚠️ 生成的 `.vsix` 文件可能较大（包含所有依赖和构建产物）

### 代码规范

**在项目根目录执行**：

```bash
# 格式化代码
pnpm run format

# 代码检查
pnpm run lint

# 类型检查
pnpm run typecheck
```

## 📚 相关文档

- [MCP 功能方案文档](./MCP_FEATURES_PLAN.md) - 详细的 MCP 功能设计和实施计划
- [Mermaid 编辑器集成方案](./MERMAID_EDITOR_INTEGRATION_PLAN.md) - Mermaid 编辑器集成文档

## 🔮 未来计划

### MCP 功能增强

- [ ] 实现标准 MCP 协议（stdio 传输层）
- [ ] 支持与 Claude Desktop 集成
- [ ] 支持与 Cursor 等 AI 工具集成
- [ ] 自动工具注册和 schema 生成
- [ ] 搜索结果的排序和相关性评分
- [ ] 批量查询支持
- [ ] 缓存机制优化

## 📝 许可证

[待添加]

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📧 联系方式

[待添加]

---

**文档版本**：v1.0  
**最后更新**：2024-12-19  
**维护者**：ArchiTool Team

