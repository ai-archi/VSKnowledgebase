# 外部 MCP Client 配置方案

## 概述

本文档说明如何在外部 MCP Client（如 Cursor）中配置 ArchiTool MCP Server，使 AI 助手能够访问知识库。

**当前状态**：✅ **已实现**

当前版本已实现标准 MCP 协议的 stdio 传输层，可以在外部 MCP Client 中配置使用。本文档说明配置方式和实现细节。

## 实现方案

### 方案架构

**关键理解**：
- VS Code 扩展跟随 VS Code 进程启动，在 VS Code 主进程中运行
- MCP Server 子进程由**外部 MCP Client**（如 Cursor）启动，不是 VS Code 扩展的子进程
- 这两个进程是**独立的**，需要通过进程间通信机制连接
- **MCP Server 只起桥接作用**：转发外部请求到 VS Code 扩展，不直接访问 `.architool` 目录
- **功能逻辑在插件中实现**：所有业务逻辑和数据访问都在 VS Code 扩展中完成

**架构图**：

```
┌─────────────────────────────────────┐
│   外部 MCP Client                   │
│   - Cursor                          │
│   - 其他支持 MCP 的 AI 工具        │
└──────────────┬──────────────────────┘
               │ 启动子进程
               │ stdio (stdin/stdout)
               │
┌──────────────▼──────────────────────┐
│   MCP Server (桥接进程)              │
│   - 由外部 MCP Client 启动           │
│   - stdio 传输层                    │
│   - MCP 协议处理                    │
│   - 仅负责协议转换和转发            │
│   - 不直接访问文件系统              │
└──────────────┬──────────────────────┘
               │ 进程间通信
               │ (命名管道/Unix Socket/HTTP等)
               │
┌──────────────▼──────────────────────┐
│   VS Code Extension                 │
│   - 在 VS Code 主进程中运行          │
│   - MCPTools/MCPResources (接口)    │
│   - 实现所有业务逻辑                │
│   - 访问 .architool 目录            │
│   - 可能未运行或存在多个窗口实例    │
└──────────────┬──────────────────────┘
               │ 文件系统访问
               │
┌──────────────▼──────────────────────┐
│   .architool 目录                    │
│   - 工作区根目录/.architool          │
│   - 知识库数据（artifacts/metadata） │
└─────────────────────────────────────┘
```

### 实现要点

1. **进程启动关系**
   - **外部 MCP Client** 启动 MCP Server 进程（MCP Client 的子进程）
   - **VS Code 扩展**在 VS Code 主进程中运行（VS Code 的子进程）
   - 这两个进程是**独立的**，没有父子关系
   - MCP Server 需要能够发现并连接到 VS Code 扩展实例

2. **传输层实现**
   - MCP Server 实现标准 MCP 协议的 stdio 传输层
   - 处理 JSON-RPC 消息格式
   - 支持初始化、工具调用、资源访问等协议流程
   - 通过 stdio（stdin/stdout）与外部 MCP Client 通信

3. **进程间通信（必需）**
   - MCP Server **只起桥接作用**，不直接访问 `.architool` 目录
   - MCP Server 需要能够发现并连接到 VS Code 扩展实例
   - 通信方式：命名管道、Unix Socket、HTTP 本地服务器等
   - VS Code 扩展的 `MCPTools` 和 `MCPResources` 接口保持不变
   - MCP Server 作为代理，转发外部请求到 VS Code 扩展
   - **所有业务逻辑在 VS Code 扩展中实现**，MCP Server 仅负责协议转换

4. **生命周期管理**
   - **MCP Server**：由外部 MCP Client 启动和停止
   - **VS Code 扩展**：跟随 VS Code 进程启动和停止
   - 两个进程的生命周期**独立**，需要处理连接断开和重连
   - VS Code 扩展可能未运行，MCP Server 需要处理这种情况并返回适当的错误

## 配置方式

### Cursor 配置

在 Cursor 的 MCP 配置文件中添加 ArchiTool 服务器配置。

**配置文件位置**：
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

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

**配置说明**：
- MCP Server 脚本路径：扩展激活时会自动将 MCP Server 复制到固定位置 `~/.architool/mcp-server/mcp-server.js`
- 工作区路径由主进程（VS Code 扩展）自动确定，MCP Server 通过注册表发现并连接到活动的扩展实例
- 如果扩展更新，MCP Server 会自动更新（通过文件时间戳比较）

### 其他 MCP Client 配置

其他支持 MCP 协议的 AI 工具，配置方式类似：
1. 找到对应的 MCP 配置文件位置
2. 添加 ArchiTool 服务器配置
3. 指定 MCP Server 启动命令和参数
4. 重启客户端以加载配置

## 实现步骤

### 阶段 1：基础架构

1. **实现进程间通信机制**
   - VS Code 扩展启动时，创建 IPC 服务器（命名管道/Unix Socket/HTTP）
   - 每个扩展实例暴露独立的 IPC 端点（标识不同的工作区）
   - MCP Server 启动时，扫描并发现活动的 VS Code 扩展实例
   - 连接到选定的扩展实例，建立 IPC 通信通道
   - 处理连接断开和重连逻辑
   - 处理 VS Code 扩展未运行的情况（返回适当的错误）

2. **实现协议转换层**
   - MCP Server 接收外部 MCP Client 的请求（通过 stdio）
   - 将 MCP 协议请求转换为 IPC 消息
   - 转发到 VS Code 扩展的 `MCPTools` 接口
   - 将扩展的响应转换回 MCP 协议格式
   - 返回给外部 MCP Client

2. **实现 stdio 传输层**
   - 实现 MCP 协议的 stdio 传输
   - 处理 JSON-RPC 消息格式
   - 实现协议初始化流程

### 阶段 2：协议实现

1. **实现 MCP 协议消息处理**
   - 处理 `initialize` 请求
   - 处理 `tools/list` 请求
   - 处理 `tools/call` 请求
   - 处理 `resources/list` 请求（可选）

2. **实现工具调用转发**
   - MCP Server 接收外部 MCP Client 的工具调用请求
   - 通过 IPC 转发到 VS Code 扩展的 `MCPTools` 接口
   - VS Code 扩展执行实际的业务逻辑（访问 `.architool` 目录、查询数据等）
   - 扩展返回结果，MCP Server 转换并返回给外部客户端

### 阶段 3：完善和优化

1. **错误处理和日志**
   - 处理子进程异常
   - 实现错误恢复机制
   - 添加详细的日志记录

2. **性能优化**
   - 优化 IPC 通信性能
   - 实现请求缓存（如需要）
   - 处理并发请求

3. **配置管理**
   - 支持通过扩展配置自定义 MCP Server 参数
   - 工作区路径由主进程自动管理，无需外部配置
   - 提供配置验证

## 注意事项

### 多进程问题

**⚠️ 重要提示**：
- **外部 MCP Client** 启动独立的 MCP Server 进程（MCP Client 的子进程）
- **VS Code 扩展**在 VS Code 主进程中运行（VS Code 的子进程）
- 这两个进程是**完全独立的**，没有父子关系
- 多个进程之间无法直接共享扩展的上下文和状态
- 需要通过 IPC（命名管道/Unix Socket/HTTP）进行进程间通信
- VS Code 扩展可能未运行，MCP Server 需要处理这种情况

### 多窗口冲突

**⚠️ 潜在问题**：
- 如果同时打开多个 VS Code 窗口，每个窗口都有自己的扩展实例和工作区
- 外部 MCP Client 只能配置一个 MCP Server 启动命令
- MCP Server 需要能够发现并连接到正确的 VS Code 扩展实例

**架构限制**：

由于 MCP Server 由外部 MCP Client 启动，而 VS Code 扩展在 VS Code 进程中运行，存在以下限制：

1. **进程独立性**
   - MCP Server 是外部 MCP Client 的子进程，与 VS Code 扩展进程完全独立
   - 每个 VS Code 窗口的扩展实例是独立的，它们之间没有直接的通信机制
   - MCP Server 不知道有哪些活动的 VS Code 窗口，也不知道如何连接到它们

2. **连接发现机制**
   - MCP Server 需要能够发现活动的 VS Code 扩展实例
   - 每个扩展实例需要暴露 IPC 端点（命名管道/Unix Socket/HTTP）
   - 需要处理多个扩展实例同时存在的情况

**多窗口支持机制**：

**1. 扩展实例发现机制**

- **IPC 端点命名**：每个扩展实例创建独立的 IPC 端点
  - **Unix/Linux/macOS**：使用 Unix Socket，路径为 `~/.architool/mcp-server/{workspace-hash}.sock`
  - **Windows**：使用命名管道，名称为 `\\.\pipe\architool-{workspace-hash}`
- **注册表机制**：所有活动的扩展实例在注册表中记录
  - 注册表位置：`~/.architool/mcp-server/registry.json`
  - 记录每个实例的工作区路径、IPC 端点、最后激活时间
- **MCP Server 发现流程**：
  1. 读取注册表 `~/.architool/mcp-server/registry.json`（Windows: `%USERPROFILE%\.architool\mcp-server\registry.json`）
  2. 验证 IPC 端点是否仍然活动
     - **Unix/Linux/macOS**：检查 socket 文件是否存在
     - **Windows**：尝试连接命名管道（无法通过文件系统检查）
  3. 选择最近激活的扩展实例进行连接
  4. 建立一对一 IPC 连接

**2. 一对一映射关系**

- **映射规则**：一个 MCP Server 连接一个扩展实例
- **选择逻辑**：MCP Server 启动时，从注册表中选择最近激活的扩展实例
- **连接管理**：
  - 每个 MCP Server 独立选择要连接的扩展实例
  - 扩展实例的 IPC 服务器支持客户端连接
  - 处理连接断开和重连

**实现机制**：

1. **扩展实例 IPC 端点管理**：
   **Unix/Linux/macOS**：
   ```
   ~/.architool/
   ├── mcp-server/
   │   ├── mcp-server.js             # MCP Server 脚本
   │   ├── {workspace-hash-1}.sock   # 窗口 1 的 Unix Socket
   │   ├── {workspace-hash-2}.sock   # 窗口 2 的 Unix Socket
   │   └── registry.json              # 注册表，记录所有活动的扩展实例
   ```
   
   **Windows**：
   ```
   %USERPROFILE%\.architool\
   ├── mcp-server\
   │   ├── mcp-server.js              # MCP Server 脚本
   │   └── registry.json               # 注册表，记录所有活动的扩展实例
   ```
   命名管道：`\\.\pipe\architool-{workspace-hash}`（不在文件系统中，由系统管理）

2. **注册表格式**（`registry.json`）：
   ```json
   {
     "instances": [
       {
         "workspaceHash": "abc123",
         "workspacePath": "/path/to/workspace1",
         "ipcEndpoint": "~/.architool/mcp-server/abc123.sock",
         "lastActive": "2024-01-01T12:00:00Z"
       },
       {
         "workspaceHash": "def456",
         "workspacePath": "/path/to/workspace2",
         "ipcEndpoint": "~/.architool/mcp-server/def456.sock",
         "lastActive": "2024-01-01T12:05:00Z"
       }
     ]
   }
   ```

3. **MCP Server 启动流程**：
   - 读取注册表 `~/.architool/mcp-server/registry.json`
   - 验证 IPC 端点是否仍然活动（检查文件是否存在）
   - 选择最近激活的扩展实例（通过 `lastActive` 时间戳）
   - 建立一对一 IPC 连接
   - 如果连接失败，尝试下一个实例

**当前窗口信息获取**：

- **MCP Server 无法直接获取当前窗口信息**：MCP Server 是由外部 MCP Client（如 Cline、Cursor）启动的独立进程，不知道是哪个 VS Code 窗口触发了它
- **通过注册表获取**：MCP Server 通过读取注册表中的 `lastActive` 时间戳，选择最近激活的扩展实例
- **扩展实例维护激活时间**：VS Code 扩展在窗口激活时更新注册表的 `lastActive` 字段
- **实时同步机制**：扩展实例可以通过 IPC 向 MCP Server 提供当前窗口信息（工作区路径、窗口 ID 等），但需要扩展主动推送或 MCP Server 主动查询

4. **扩展实例生命周期**：
   - 启动时：创建 IPC 端点，更新注册表
   - 激活时：更新注册表的 `lastActive` 时间戳（通过 VS Code API 监听窗口激活事件）
   - 关闭时：删除 IPC 端点，从注册表移除

**窗口激活检测机制**：

- **VS Code 扩展监听窗口事件**：使用 `vscode.window.onDidChangeActiveTextEditor` 或 `vscode.window.onDidChangeWindowState` 监听窗口激活
- **实时更新注册表**：窗口激活时，扩展实例立即更新注册表中的 `lastActive` 时间戳
- **MCP Server 选择逻辑**：MCP Server 启动时，选择 `lastActive` 最新的扩展实例，即当前活动的窗口
- **局限性**：如果用户在 MCP Server 启动后切换窗口，MCP Server 仍连接之前的窗口，直到重新启动

### 工作区路径

**工作区路径由 VS Code 扩展确定**：

- 工作区路径由 VS Code 扩展自动确定（基于当前打开的 VS Code 工作区）
- MCP Server **不直接访问文件系统**，通过 IPC 从连接的 VS Code 扩展实例获取工作区信息
- 无需在外部 MCP Client 配置中指定工作区路径
- 如果连接了多个 VS Code 窗口，MCP Server 需要知道使用哪个窗口的工作区

**工作区发现机制**：

- MCP Server 启动时，通过注册表发现活动的 VS Code 扩展实例
- 选择最近激活的扩展实例建立一对一连接
- 通过 IPC 获取该实例的工作区路径
- 每个 VS Code 窗口的扩展实例暴露独立的 IPC 端点，支持多窗口场景

### 权限和安全

- 确保 MCP Server 只能访问授权的知识库
- 避免暴露敏感信息
- 实现适当的访问控制

### 兼容性

- 确保 MCP Server 与不同版本的 MCP Client 兼容
- 处理协议版本差异
- 提供向后兼容性

## 参考资源

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Cursor MCP 集成文档](https://cursor.sh/docs/mcp)

## 总结

实现外部 MCP Client 配置需要：

1. ✅ **架构设计**：混合架构，子进程 + IPC 通信
2. ✅ **协议实现**：标准 MCP 协议的 stdio 传输层
3. ✅ **配置方式**：在外部 MCP Client 配置文件中添加服务器配置
4. ✅ **生命周期管理**：处理子进程启动、停止、重启
5. ✅ **错误处理**：完善的异常处理和恢复机制

**建议**：优先考虑实际需求，如果主要使用场景是在 VS Code/Cursor 中，进程内实现可能更合适。只有在明确需要与外部 MCP Client 集成时，才考虑实现标准 MCP 协议。

