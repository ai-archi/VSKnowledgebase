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
  // 统一使用 mcp-server 目录
  return path.join(homeDir, '.architool', 'mcp-server', 'registry.json');
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
    // 静默失败，返回空注册表
    return { instances: [] };
  }
}

/**
 * 获取最近激活的扩展实例（带重试机制）
 */
function getMostRecentActiveInstance(maxRetries = 10, retryDelay = 1000): Promise<{ ipcEndpoint: string; workspacePath: string } | null> {
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
      // 不仅要检查 socket 文件是否存在，还要检查 lastActive 时间戳是否在合理范围内
      const now = Date.now();
      const MAX_INSTANCE_AGE_MS = 5 * 60 * 1000; // 5分钟，超过此时间的实例视为过期
      
      const activeInstances = registry.instances.filter(inst => {
        // 检查 lastActive 时间戳，过滤掉过期的实例
        const lastActiveTime = new Date(inst.lastActive).getTime();
        const age = now - lastActiveTime;
        if (age > MAX_INSTANCE_AGE_MS) {
          return false; // 实例过期，跳过
        }
        
        if (process.platform === 'win32') {
          // Windows 命名管道无法通过文件系统检查
          // 命名管道以 \\.\pipe\ 开头，直接返回 true，连接时会验证
          return inst.ipcEndpoint.startsWith('\\\\.\\pipe\\');
        } else {
          // Unix/Linux/macOS 检查 socket 文件是否存在
          const endpointPath = inst.ipcEndpoint.replace('~', os.homedir());
          if (!fs.existsSync(endpointPath)) {
            return false; // Socket 文件不存在
          }
          
          // 验证 socket 文件是否真的是 socket 文件（而不是普通文件）
          try {
            const stats = fs.statSync(endpointPath);
            if (!stats.isSocket()) {
              // 如果不是 socket 文件，可能是僵尸文件，跳过
              return false;
            }
          } catch (error) {
            // 如果无法获取文件信息，跳过
            return false;
          }
          
          return true;
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
function connectToExtension(ipcEndpoint: string, maxRetries = 10, retryDelay = 1000): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryConnect = (): void => {
      attempts++;
      
      // 在连接前，对于 Unix Socket，验证文件是否真的是 socket 文件
      if (process.platform !== 'win32' && !ipcEndpoint.startsWith('\\\\.\\pipe\\')) {
        try {
          if (!fs.existsSync(ipcEndpoint)) {
            if (attempts < maxRetries) {
              setTimeout(() => {
                tryConnect();
              }, retryDelay);
            } else {
              reject(new Error(`Socket file does not exist: ${ipcEndpoint}`));
            }
            return;
          }
          
          const stats = fs.statSync(ipcEndpoint);
          if (!stats.isSocket()) {
            // 如果不是 socket 文件，可能是僵尸文件，直接失败
            reject(new Error(`Path exists but is not a socket file: ${ipcEndpoint}`));
            return;
          }
        } catch (error: any) {
          if (attempts < maxRetries) {
            setTimeout(() => {
              tryConnect();
            }, retryDelay);
          } else {
            reject(new Error(`Failed to verify socket file: ${error.message}`));
          }
          return;
        }
      }
      
      const socket = net.createConnection(ipcEndpoint, () => {
        resolve(socket);
      });

      socket.on('error', (error: Error) => {
        // 如果连接失败，可能是 socket 文件是僵尸文件
        // 对于 Unix Socket，尝试删除僵尸文件
        if (process.platform !== 'win32' && !ipcEndpoint.startsWith('\\\\.\\pipe\\')) {
          try {
            if (fs.existsSync(ipcEndpoint)) {
              const stats = fs.statSync(ipcEndpoint);
              if (stats.isSocket()) {
                // 尝试删除僵尸 socket 文件
                try {
                  fs.unlinkSync(ipcEndpoint);
                } catch (unlinkError) {
                  // 忽略删除错误
                }
              }
            }
          } catch (statError) {
            // 忽略统计错误
          }
        }
        
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
 * 获取或创建扩展连接（懒加载）
 */
let extensionSocket: net.Socket | null = null;
let extensionInstance: { ipcEndpoint: string; workspacePath: string } | null = null;

async function getOrCreateExtensionConnection(): Promise<net.Socket> {
  // 如果已有连接且有效，直接返回
  if (extensionSocket && !extensionSocket.destroyed) {
    return extensionSocket;
  }

  // 尝试获取扩展实例
  if (!extensionInstance) {
    extensionInstance = await getMostRecentActiveInstance(5, 500); // 减少重试次数和延迟，避免阻塞太久
    
    if (!extensionInstance) {
      throw new Error('No active ArchiTool extension instance found. Please ensure the ArchiTool extension is running in VS Code.');
    }
  }

  // 连接到扩展实例
  try {
    extensionSocket = await connectToExtension(extensionInstance.ipcEndpoint, 5, 500);
    
    // 设置连接断开和错误处理
    extensionSocket.on('close', () => {
      extensionSocket = null;
      extensionInstance = null; // 重置实例，下次重新查找
    });

    extensionSocket.on('error', (error: Error) => {
      extensionSocket = null;
      extensionInstance = null; // 重置实例，下次重新查找
    });

    return extensionSocket;
  } catch (error: any) {
    extensionInstance = null; // 重置实例，下次重新查找
    throw new Error(`Failed to connect to extension: ${error.message}`);
  }
  }

/**
 * 主函数
 */
async function main() {
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
      
      // 尝试从原始输入中提取 id（以防解析时丢失）
      let requestId: string | number | null | undefined = mcpMessage.id;
      if (requestId === undefined || requestId === null) {
        try {
          const parsed = JSON.parse(line);
          if (parsed && typeof parsed === 'object' && 'id' in parsed) {
            requestId = parsed.id;
          }
        } catch {
          // 如果无法解析，使用 mcpMessage.id
        }
      }

      // 处理 initialize
      if (mcpMessage.method === 'initialize') {
        // 根据 MCP 协议，initialize 请求必须有 id，响应也必须包含相同的 id
        if (requestId === undefined || requestId === null) {
          // 如果 initialize 请求没有 id，这是一个协议错误
          // 但根据 JSON-RPC 2.0，对于通知（没有 id 的请求），我们不应该发送响应
          // 然而，MCP Client 可能期望所有响应都有 id，所以这里我们静默忽略
          return;
        }
        
        const response: any = {
          jsonrpc: '2.0',
          id: requestId, // initialize 请求必须有 id，所以响应也必须有 id
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {} // 空对象表示支持工具功能
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

      // 处理 initialized (MCP 协议要求)
      if (mcpMessage.method === 'initialized') {
        // 不需要响应
        return;
      }

      // 处理 tools/list
      if (mcpMessage.method === 'tools/list') {
        const response: any = {
          jsonrpc: '2.0',
          result: {
            tools: [
              {
                name: 'search_knowledge_base',
                description: 'Search the knowledge base for documents, designs, and artifacts. Use this tool when you need to find information, documentation, design diagrams, or any content stored in the knowledge base. This is the primary tool for most knowledge base queries (covers ~90% of use cases). Supports full-text search across titles, descriptions, and content. You can filter by tags, vault name, and limit results.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    query: { 
                      type: 'string',
                      description: 'Search query string. Search across titles, descriptions, and content.'
                    },
                    vaultName: { 
                      type: 'string',
                      description: 'Optional: Filter results to a specific vault by name.'
                    },
                    tags: { 
                      type: 'array', 
                      items: { type: 'string' },
                      description: 'Optional: Filter by tags (AND relationship, must include all specified tags).'
                    },
                    limit: { 
                      type: 'number',
                      description: 'Optional: Maximum number of results to return (default: 50).'
                    }
                  },
                  required: ['query']
                }
              },
              {
                name: 'get_documents_for_code',
                description: 'Get documents and design diagrams associated with a specific code file or directory path. Use this tool when analyzing code and need to find related documentation, design diagrams, or specifications. Supports wildcard matching (e.g., "src/auth/*" matches "src/auth/login.ts"). This tool is essential when you need to understand the design context or documentation for specific code paths.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    codePath: { 
                      type: 'string',
                      description: 'Code file or directory path (relative to workspace root). Supports wildcards like "src/auth/*" to match all files in a directory.'
                    }
                  },
                  required: ['codePath']
                }
              },
              {
                name: 'list_entries',
                description: 'List knowledge base entries by type and category. Use this tool when you need to browse entries by type (document/design/development/test) or category, or when you need to get a list of all entries in a vault. Less frequently used (~2% of use cases).',
                inputSchema: {
                  type: 'object',
                  properties: {
                    vaultName: { 
                      type: 'string',
                      description: 'Optional: Filter entries to a specific vault by name.'
                    },
                    viewType: { 
                      type: 'string',
                      description: 'Optional: Filter by view type (document/design/development/test).'
                    },
                    category: { 
                      type: 'string',
                      description: 'Optional: Filter by category.'
                    },
                    limit: { 
                      type: 'number',
                      description: 'Optional: Maximum number of results to return (default: 20).'
                    }
                  }
                }
              }
            ]
          }
        };
        
        // 只有当请求有 id 时，才在响应中包含 id
        if (requestId !== undefined && requestId !== null) {
          response.id = requestId;
        }
        
        console.log(JSON.stringify(response));
        return;
      }

      // 处理 tools/call - 懒加载连接
      if (mcpMessage.method === 'tools/call') {
        try {
          // 获取或创建扩展连接
          const socket = await getOrCreateExtensionConnection();
          
          const result = await handleMCPToolCall(socket, mcpMessage.method, mcpMessage.params);
          
          // 格式化响应内容，使其更易于 MCP Client 识别
          const content: any[] = [];
          
          // 如果结果是数组（文档列表），格式化为更易读的格式
          if (Array.isArray(result) && result.length > 0) {
            // 检查是否是 Artifact 数组
            const isArtifactArray = result.every((item: any) => 
              item && typeof item === 'object' && ('id' in item || 'title' in item || 'name' in item)
            );
            
            if (isArtifactArray) {
              // 格式化为结构化的 JSON 格式（参考建议的响应格式）
              const structuredResults = result.map((artifact: any) => {
                // 构建文件 URI（使用 file:// 协议）
                let uri = '';
                if (artifact.contentLocation) {
                  uri = `file://${artifact.contentLocation}`;
                } else if (artifact.path && artifact.vault?.name) {
                  // 如果没有完整路径，尝试构建
                  uri = `archi://artifact/${artifact.id}`;
                } else if (artifact.id) {
                  // 如果都没有，至少使用 artifact ID 构建一个 URI
                  uri = `archi://artifact/${artifact.id}`;
                } else {
                  // 如果连 ID 都没有，使用一个默认 URI（避免 undefined）
                  uri = `archi://artifact/unknown-${Date.now()}`;
                }
                
                // 构建完整路径
                const fullPath = artifact.contentLocation || artifact.path || '';
                
                // 构建摘要（使用 description 或 body 的前几行）
                let summary = artifact.description || '';
                if (!summary && artifact.body) {
                  // 从 body 中提取前几行作为摘要
                  const lines = artifact.body.split('\n').filter((line: string) => line.trim());
                  summary = lines.slice(0, 3).join(' ').substring(0, 200); // 最多200字符
                }
                if (!summary) {
                  summary = 'Document from knowledge base';
                }
                
                return {
                  uri: uri,
                  path: fullPath,
                  title: artifact.title || artifact.name || artifact.id || 'Untitled',
                  summary: summary,
                  score: 1.0, // 默认评分，可以根据相关性调整
                  // 只保留 MCP Client 需要的字段，移除内部概念（vault、viewType、codePaths、tags 等）
                  id: artifact.id
                };
              });
              
              // 格式化为易读的文本格式
              const textContent = JSON.stringify({ results: structuredResults }, null, 2);
              
              // 只添加文本内容（MCP Client 工具调用响应只支持 text 类型）
              content.push({
                type: 'text',
                text: textContent
              });
            } else {
              // 其他类型的数组，使用 JSON 格式
              content.push({
                type: 'text',
                text: JSON.stringify(result, null, 2)
              });
            }
          } else if (result && typeof result === 'object') {
            // 单个对象，使用 JSON 格式
            content.push({
              type: 'text',
              text: JSON.stringify(result, null, 2)
            });
          } else {
            // 其他类型，转换为字符串
            content.push({
              type: 'text',
              text: String(result)
            });
          }
          
          const response: any = {
            jsonrpc: '2.0',
            result: {
              content: content
            }
          };
          
          // 只有当请求有 id 时，才在响应中包含 id
          if (requestId !== undefined && requestId !== null) {
            response.id = requestId;
          }
          
          console.log(JSON.stringify(response));
        } catch (error: any) {
          const errorResponse: any = {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: error.message || 'Internal error'
            }
          };
          
          // 只有当请求有 id 时，才在错误响应中包含 id
          if (requestId !== undefined && requestId !== null) {
            errorResponse.id = requestId;
          }
          
          console.log(JSON.stringify(errorResponse));
        }
        return;
      }

      // 未知方法
      // 如果请求有 id，错误响应必须包含相同的 id
      // 如果请求没有 id（通知），错误响应不应该包含 id 字段
      const errorResponse: any = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: `Method not found: ${mcpMessage.method}`
        }
      };
      
      // 只有当请求有 id 时，才在响应中包含 id
      if (requestId !== undefined && requestId !== null) {
        errorResponse.id = requestId;
      }
      
      console.log(JSON.stringify(errorResponse));

    } catch (error: any) {
      // 尝试从原始输入中提取 id（如果可能）
      let requestId: string | number | null | undefined = undefined;
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === 'object' && 'id' in parsed) {
          requestId = parsed.id;
        }
      } catch {
        // 如果无法解析，requestId 保持为 undefined
      }
      
      // 根据 JSON-RPC 2.0 规范：
      // - 如果请求有 id，错误响应必须包含相同的 id
      // - 如果请求没有 id（通知），错误响应不应该包含 id 字段
      // MCP Client 的验证器不接受 null 作为 id 值，所以如果请求没有 id，我们就不包含 id 字段
      const errorResponse: any = {
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
          data: error.message
        }
      };
      
      // 只有当请求有 id 时，才在响应中包含 id
      if (requestId !== undefined && requestId !== null) {
        errorResponse.id = requestId;
      }
      
      console.log(JSON.stringify(errorResponse));
    }
  });
}

// 启动
main().catch((error: any) => {
  // 静默退出，避免向 stderr 输出任何内容（MCP Client 会检测到进程退出）
  // MCP 协议要求所有通信都通过 JSON-RPC 格式，stderr 输出会被误解析
  process.exit(1);
});

