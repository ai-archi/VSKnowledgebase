# 外部 MCP Client 配置方案

## 概述

本文档说明如何在外部 MCP Client（如 Claude Desktop、Cursor）中配置 ArchiTool MCP Server，使 AI 助手能够访问知识库。

**当前状态**：❌ **未实现**

当前版本尚未实现标准 MCP 协议的 stdio 传输层，因此无法在外部 MCP Client 中配置使用。本文档提供实现方案和配置方式。

## 实现方案

### 方案架构

**混合架构**：扩展启动 stdio MCP Server 子进程

```
┌─────────────────────────────────────┐
│   VS Code Extension (主进程)        │
│   - 扩展功能                        │
│   - MCPTools/MCPResources (接口)   │
└──────────────┬──────────────────────┘
               │ IPC 通信
               │
┌──────────────▼──────────────────────┐
│   MCP Server (子进程)                │
│   - stdio 传输层                    │
│   - MCP 协议处理                    │
│   - 调用主进程的 MCP 接口           │
└──────────────┬──────────────────────┘
               │ stdio (stdin/stdout)
               │
┌──────────────▼──────────────────────┐
│   外部 MCP Client                   │
│   - Claude Desktop                  │
│   - Cursor                          │
│   - 其他支持 MCP 的 AI 工具        │
└─────────────────────────────────────┘
```

### 实现要点

1. **子进程启动**
   - 扩展激活时，启动独立的 MCP Server 子进程
   - 子进程通过 stdio（stdin/stdout）与外部 MCP Client 通信
   - 子进程通过 IPC（进程间通信）调用主进程的 MCP 接口

2. **传输层实现**
   - 实现标准 MCP 协议的 stdio 传输层
   - 处理 JSON-RPC 消息格式
   - 支持初始化、工具调用、资源访问等协议流程

3. **进程间通信**
   - 子进程通过 IPC 通道（如 Node.js `child_process` IPC）与主进程通信
   - 主进程的 `MCPTools` 和 `MCPResources` 接口保持不变
   - 子进程作为代理，转发外部请求到主进程
   - 工作区路径由主进程确定，子进程通过 IPC 获取，无需外部配置

4. **生命周期管理**
   - 扩展激活时启动子进程
   - 扩展停用时停止子进程
   - 处理子进程异常退出和重启

## 配置方式

### Claude Desktop 配置

在 Claude Desktop 的 MCP 配置文件中添加 ArchiTool 服务器配置。

**配置文件位置**：
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**配置示例**：

```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "/path/to/architool-mcp-server.js"
      ]
    }
  }
}
```

**配置说明**：
- `command`: 启动 MCP Server 的命令（通常是 `node`）
- `args`: 命令参数，仅需包含 MCP Server 脚本路径
- **工作区路径**：由主进程（VS Code 扩展）自动确定，无需在配置中指定

### Cursor 配置

在 Cursor 的 MCP 配置文件中添加 ArchiTool 服务器配置。

**配置文件位置**：
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- Windows: `%APPDATA%\Cursor\User\globalStorage\mcp.json`
- Linux: `~/.config/Cursor/User/globalStorage/mcp.json`

**配置示例**：

```json
{
  "mcpServers": {
    "architool": {
      "command": "node",
      "args": [
        "/path/to/architool-mcp-server.js"
      ]
    }
  }
}
```

**配置说明**：
- 工作区路径由主进程（VS Code 扩展）自动确定，子进程通过 IPC 获取

### 其他 MCP Client 配置

其他支持 MCP 协议的 AI 工具，配置方式类似：
1. 找到对应的 MCP 配置文件位置
2. 添加 ArchiTool 服务器配置
3. 指定 MCP Server 启动命令和参数
4. 重启客户端以加载配置

## 实现步骤

### 阶段 1：基础架构

1. **创建 MCP Server 子进程启动器**
   - 在扩展中实现子进程启动逻辑
   - 处理子进程生命周期（启动、停止、重启）
   - 建立 IPC 通信通道

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
   - 子进程接收工具调用请求
   - 通过 IPC 转发到主进程的 `MCPTools` 接口
   - 将结果返回给外部客户端

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
- 外部 MCP Client 会启动独立的 MCP Server 进程
- 如果 VS Code 扩展也在运行，会有多个进程（扩展进程 + MCP Server 进程）
- 多个进程之间无法直接共享扩展的上下文和状态
- 需要通过 IPC 进行进程间通信

### 工作区路径

- 工作区路径由主进程（VS Code 扩展）自动确定
- 子进程通过 IPC 从主进程获取工作区路径
- 无需在外部 MCP Client 配置中指定工作区路径
- 主进程会根据当前打开的 VS Code 工作区自动选择对应的知识库

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
- [Claude Desktop MCP 配置文档](https://claude.ai/docs/mcp)
- [Cursor MCP 集成文档](https://cursor.sh/docs/mcp)

## 总结

实现外部 MCP Client 配置需要：

1. ✅ **架构设计**：混合架构，子进程 + IPC 通信
2. ✅ **协议实现**：标准 MCP 协议的 stdio 传输层
3. ✅ **配置方式**：在外部 MCP Client 配置文件中添加服务器配置
4. ✅ **生命周期管理**：处理子进程启动、停止、重启
5. ✅ **错误处理**：完善的异常处理和恢复机制

**建议**：优先考虑实际需求，如果主要使用场景是在 VS Code/Cursor 中，进程内实现可能更合适。只有在明确需要与 Claude Desktop 等外部工具集成时，才考虑实现标准 MCP 协议。

