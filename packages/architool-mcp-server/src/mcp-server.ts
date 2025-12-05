#!/usr/bin/env node

/**
 * ArchiTool MCP Server (Bridge Process)
 * 
 * 这是一个桥接进程，负责：
 * 1. 通过 stdio 与外部 MCP Client（如 Cursor）通信
 * 2. 通过 IPC（Unix Socket/命名管道）与 VS Code 扩展通信
 * 3. 转发 MCP 协议请求到扩展，并将响应返回给客户端
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as readline from 'readline';

/**
 * IPC 消息类型
 */
interface IPCMessage {
  type: 'request' | 'response' | 'error';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

/**
 * MCP 协议消息类型
 */
interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number | null;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

/**
 * 注册表数据结构
 */
interface MCPRegistryData {
  instances: Array<{
    workspaceHash: string;
    workspacePath: string;
    ipcEndpoint: string;
    lastActive: string;
  }>;
}

/**
 * 获取注册表路径
 */
function getRegistryPath(): string {
  const homeDir = os.homedir();
  if (process.platform === 'win32') {
    return path.join(homeDir, '.architool', 'mcp-servers', 'registry.json');
  } else {
    return path.join(homeDir, '.architool', 'mcp-servers', 'registry.json');
  }
}

/**
 * 读取注册表
 */
function readRegistry(): MCPRegistryData {
  const registryPath = getRegistryPath();
  
  if (!fs.existsSync(registryPath)) {
    return { instances: [] };
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content) as MCPRegistryData;
  } catch (error) {
    console.error('Failed to read registry:', error);
    return { instances: [] };
  }
}

/**
 * 获取最近激活的扩展实例（带重试机制）
 */
function getMostRecentActiveInstance(maxRetries: number = 10, retryDelay: number = 1000): Promise<{ ipcEndpoint: string; workspacePath: string } | null> {
  return new Promise((resolve) => {
    let attempts = 0;
    
    const tryGetInstance = (): void => {
      attempts++;
      const registry = readRegistry();
      
      if (registry.instances.length === 0) {
        if (attempts < maxRetries) {
          // 等待后重试
          setTimeout(() => {
            tryGetInstance();
          }, retryDelay);
        } else {
          resolve(null);
        }
        return;
      }

      // 过滤活动的实例
      const activeInstances = registry.instances.filter(inst => {
        if (process.platform === 'win32') {
          // Windows 命名管道无法通过文件系统检查
          // 命名管道以 \\.\pipe\ 开头，直接返回 true，连接时会验证
          return inst.ipcEndpoint.startsWith('\\\\.\\pipe\\');
        } else {
          // Unix/Linux/macOS 检查 socket 文件是否存在
          const endpointPath = inst.ipcEndpoint.replace('~', os.homedir());
          return fs.existsSync(endpointPath);
        }
      });

      if (activeInstances.length === 0) {
        if (attempts < maxRetries) {
          // 等待后重试
          setTimeout(() => {
            tryGetInstance();
          }, retryDelay);
        } else {
          resolve(null);
        }
        return;
      }

      // 按 lastActive 排序，返回最新的
      activeInstances.sort((a, b) => {
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      });

      const instance = activeInstances[0];
      
      // 处理 IPC 端点路径
      let ipcEndpoint = instance.ipcEndpoint;
      if (process.platform !== 'win32') {
        // Unix/Linux/macOS: 替换 ~ 为用户主目录
        ipcEndpoint = ipcEndpoint.replace('~', os.homedir());
      }
      // Windows: 命名管道路径保持不变（\\.\pipe\...）
      
      resolve({
        ipcEndpoint,
        workspacePath: instance.workspacePath
      });
    };
    
    tryGetInstance();
  });
}

/**
 * 连接到扩展实例（带重试机制）
 */
function connectToExtension(ipcEndpoint: string, maxRetries: number = 10, retryDelay: number = 1000): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryConnect = (): void => {
      attempts++;
      const socket = net.createConnection(ipcEndpoint, () => {
        resolve(socket);
      });

      socket.on('error', (error: Error) => {
        if (attempts < maxRetries) {
          // 等待后重试
          setTimeout(() => {
            tryConnect();
          }, retryDelay);
        } else {
          reject(new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`));
        }
      });
    };
    
    tryConnect();
  });
}

/**
 * 通过 IPC 发送请求到扩展
 */
function sendIPCRequest(socket: net.Socket, method: string, params: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const requestId = Date.now();
    const message: IPCMessage = {
      type: 'request',
      id: requestId,
      method,
      params
    };

    let responseBuffer = '';

    const dataHandler = (data: Buffer) => {
      responseBuffer += data.toString();
      const lines = responseBuffer.split('\n');
      responseBuffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line) as IPCMessage;
            if (response.id === requestId) {
              socket.removeListener('data', dataHandler);
              if (response.type === 'error') {
                reject(new Error(response.error?.message || 'IPC error'));
              } else {
                resolve(response.result);
              }
            }
          } catch (error) {
            // 继续等待完整响应
          }
        }
      }
    };

    socket.on('data', dataHandler);

    socket.write(JSON.stringify(message) + '\n');

    // 超时处理
    setTimeout(() => {
      socket.removeListener('data', dataHandler);
      reject(new Error('IPC request timeout'));
    }, 30000);
  });
}

/**
 * 将 MCP 工具调用转换为 IPC 请求
 */
function mapMCPMethodToIPC(mcpMethod: string): string | null {
  const methodMap: Record<string, string> = {
    'tools/call': 'call', // 需要特殊处理
  };

  return methodMap[mcpMethod] || null;
}

/**
 * 处理 MCP 工具调用
 */
async function handleMCPToolCall(socket: net.Socket, method: string, params: any): Promise<any> {
  // MCP tools/call 的 params 包含 name 和 arguments
  if (method === 'tools/call' && params.name) {
    const toolName = params.name;
    const toolParams = params.arguments || {};

    // 映射 MCP 工具名到 IPC 方法
    const ipcMethod = toolName === 'search_knowledge_base' ? 'search' :
                     toolName === 'get_documents_for_code' ? 'getDocumentsForCode' :
                     toolName === 'list_entries' ? 'listEntries' : null;

    if (!ipcMethod) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await sendIPCRequest(socket, ipcMethod, toolParams);
  }

  throw new Error(`Unsupported MCP method: ${method}`);
}

/**
 * 主函数
 */
async function main() {
  // 查找并连接到扩展实例（带重试机制）
  console.error('Waiting for ArchiTool extension to start...');
  const instance = await getMostRecentActiveInstance(10, 1000); // 最多重试10次，每次间隔1秒
  
  if (!instance) {
    console.error('No active ArchiTool extension instance found after retries');
    process.exit(1);
  }

  let extensionSocket: net.Socket | null = null;

  try {
    console.error(`Found extension instance, connecting to ${instance.workspacePath}...`);
    extensionSocket = await connectToExtension(instance.ipcEndpoint, 10, 1000); // 最多重试10次，每次间隔1秒
    console.error(`Connected to ArchiTool extension at ${instance.workspacePath}`);
  } catch (error: any) {
    console.error('Failed to connect to extension after retries:', error.message);
    process.exit(1);
  }

  // 创建 readline 接口处理 stdio
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  // 处理 MCP 协议消息
  rl.on('line', async (line: string) => {
    if (!line.trim()) {
      return;
    }

    try {
      const mcpMessage = JSON.parse(line) as MCPMessage;

      // 处理 initialize
      if (mcpMessage.method === 'initialize') {
        const response: MCPMessage = {
          jsonrpc: '2.0',
          id: mcpMessage.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'architool',
              version: '0.1.0'
            }
          }
        };
        console.log(JSON.stringify(response));
        return;
      }

      // 处理 tools/list
      if (mcpMessage.method === 'tools/list') {
        const response: MCPMessage = {
          jsonrpc: '2.0',
          id: mcpMessage.id,
          result: {
            tools: [
              {
                name: 'search_knowledge_base',
                description: 'Search the knowledge base',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    vaultName: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    limit: { type: 'number' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'get_documents_for_code',
                description: 'Get documents associated with code path',
                inputSchema: {
                  type: 'object',
                  properties: {
                    codePath: { type: 'string' }
                  },
                  required: ['codePath']
                }
              },
              {
                name: 'list_entries',
                description: 'List knowledge base entries',
                inputSchema: {
                  type: 'object',
                  properties: {
                    vaultName: { type: 'string' },
                    viewType: { type: 'string' },
                    category: { type: 'string' },
                    limit: { type: 'number' }
                  }
                }
              }
            ]
          }
        };
        console.log(JSON.stringify(response));
        return;
      }

      // 处理 tools/call
      if (mcpMessage.method === 'tools/call' && extensionSocket) {
        try {
          const result = await handleMCPToolCall(extensionSocket, mcpMessage.method, mcpMessage.params);
          const response: MCPMessage = {
            jsonrpc: '2.0',
            id: mcpMessage.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
          console.log(JSON.stringify(response));
        } catch (error: any) {
          const errorResponse: MCPMessage = {
            jsonrpc: '2.0',
            id: mcpMessage.id,
            error: {
              code: -32603,
              message: error.message || 'Internal error'
            }
          };
          console.log(JSON.stringify(errorResponse));
        }
        return;
      }

      // 未知方法
      const errorResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: mcpMessage.id,
        error: {
          code: -32601,
          message: `Method not found: ${mcpMessage.method}`
        }
      };
      console.log(JSON.stringify(errorResponse));

    } catch (error: any) {
      const errorResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  });

  // 处理连接断开
  // 注意：连接断开时，MCP Client 通常会重启 MCP Server 进程
  // 因此这里记录错误信息即可，不需要复杂的重连逻辑
  extensionSocket.on('close', () => {
    console.error('Extension connection closed');
    // 给一点时间让错误信息输出，然后退出
    // MCP Client 会检测到进程退出并重启
    setTimeout(() => {
      process.exit(1);
    }, 100);
  });

  extensionSocket.on('error', (error: Error) => {
    console.error('Extension connection error:', error);
    // 给一点时间让错误信息输出，然后退出
    setTimeout(() => {
      process.exit(1);
    }, 100);
  });
}

/**
 * 创建消息处理函数（用于重连时复用）
 */
function createMessageHandler(extensionSocket: net.Socket) {
  return async (line: string) => {
    if (!line.trim()) {
      return;
    }

    try {
      const mcpMessage = JSON.parse(line) as MCPMessage;

      // 处理 initialize
      if (mcpMessage.method === 'initialize') {
        const response: MCPMessage = {
          jsonrpc: '2.0',
          id: mcpMessage.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {}
            },
            serverInfo: {
              name: 'architool',
              version: '0.1.0'
            }
          }
        };
        console.log(JSON.stringify(response));
        return;
      }

      // 处理 tools/list
      if (mcpMessage.method === 'tools/list') {
        const response: MCPMessage = {
          jsonrpc: '2.0',
          id: mcpMessage.id,
          result: {
            tools: [
              {
                name: 'search_knowledge_base',
                description: 'Search the knowledge base',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    vaultName: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    limit: { type: 'number' }
                  },
                  required: ['query']
                }
              },
              {
                name: 'get_documents_for_code',
                description: 'Get documents associated with code path',
                inputSchema: {
                  type: 'object',
                  properties: {
                    codePath: { type: 'string' }
                  },
                  required: ['codePath']
                }
              },
              {
                name: 'list_entries',
                description: 'List knowledge base entries',
                inputSchema: {
                  type: 'object',
                  properties: {
                    vaultName: { type: 'string' },
                    viewType: { type: 'string' },
                    category: { type: 'string' },
                    limit: { type: 'number' }
                  }
                }
              }
            ]
          }
        };
        console.log(JSON.stringify(response));
        return;
      }

      // 处理 tools/call
      if (mcpMessage.method === 'tools/call' && extensionSocket) {
        try {
          const result = await handleMCPToolCall(extensionSocket, mcpMessage.method, mcpMessage.params);
          const response: MCPMessage = {
            jsonrpc: '2.0',
            id: mcpMessage.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2)
                }
              ]
            }
          };
          console.log(JSON.stringify(response));
        } catch (error: any) {
          const errorResponse: MCPMessage = {
            jsonrpc: '2.0',
            id: mcpMessage.id,
            error: {
              code: -32603,
              message: error.message || 'Internal error'
            }
          };
          console.log(JSON.stringify(errorResponse));
        }
        return;
      }

      // 未知方法
      const errorResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: mcpMessage.id,
        error: {
          code: -32601,
          message: `Method not found: ${mcpMessage.method}`
        }
      };
      console.log(JSON.stringify(errorResponse));

    } catch (error: any) {
      const errorResponse: MCPMessage = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        }
      };
      console.log(JSON.stringify(errorResponse));
    }
  };
}

// 启动
main().catch((error: any) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

