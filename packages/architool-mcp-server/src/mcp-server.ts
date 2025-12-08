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
function connectToExtension(ipcEndpoint: string, maxRetries = 10, retryDelay = 1000): Promise<net.Socket> {
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

      // 处理 initialize
      if (mcpMessage.method === 'initialize') {
        // initialize 请求必须有 id，所以响应也必须有 id
        const response: any = {
          jsonrpc: '2.0',
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
        
        // 只有当请求有 id 时，才在响应中包含 id
        if (mcpMessage.id !== undefined && mcpMessage.id !== null) {
          response.id = mcpMessage.id;
        }
        
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
        
        // 只有当请求有 id 时，才在响应中包含 id
        if (mcpMessage.id !== undefined && mcpMessage.id !== null) {
          response.id = mcpMessage.id;
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
              // 为每个文档创建资源引用和文本内容
              const summaryLines: string[] = [];
              summaryLines.push(`Found ${result.length} document(s) in knowledge base:\n`);
              
              result.forEach((artifact: any, index: number) => {
                const title = artifact.title || artifact.name || artifact.id || 'Untitled';
                const artifactId = artifact.id || `artifact-${index}`;
                
                // 添加资源引用（如果 artifact 有 id）
                if (artifact.id) {
                  content.push({
                    type: 'resource',
                    resource: {
                      uri: `archi://artifact/${artifact.id}`,
                      name: title,
                      description: artifact.description || `Document from ${artifact.vault?.name || 'unknown vault'}`,
                      mimeType: artifact.format === 'md' ? 'text/markdown' : 
                               artifact.format === 'yml' || artifact.format === 'yaml' ? 'text/yaml' :
                               'text/plain'
                    }
                  });
                }
                
                // 添加文档摘要信息
                const docInfo: string[] = [];
                docInfo.push(`### ${index + 1}. ${title}`);
                if (artifact.id) docInfo.push(`- **ID**: ${artifact.id}`);
                if (artifact.vault?.name) docInfo.push(`- **Vault**: ${artifact.vault.name}`);
                if (artifact.path) docInfo.push(`- **Path**: ${artifact.path}`);
                if (artifact.viewType) docInfo.push(`- **Type**: ${artifact.viewType}`);
                if (artifact.description) docInfo.push(`- **Description**: ${artifact.description}`);
                if (artifact.tags && artifact.tags.length > 0) {
                  docInfo.push(`- **Tags**: ${artifact.tags.join(', ')}`);
                }
                summaryLines.push(docInfo.join('\n'));
                
                // 如果有关联的代码路径，也显示
                if (artifact.codePaths && artifact.codePaths.length > 0) {
                  summaryLines.push(`- **Related Code**: ${artifact.codePaths.join(', ')}`);
                }
              });
              
              // 添加汇总文本内容
              content.push({
                type: 'text',
                text: summaryLines.join('\n\n') + '\n\n---\n\n' + 
                      `**Full Data**:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
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
          if (mcpMessage.id !== undefined && mcpMessage.id !== null) {
            response.id = mcpMessage.id;
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
          if (mcpMessage.id !== undefined && mcpMessage.id !== null) {
            errorResponse.id = mcpMessage.id;
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
      if (mcpMessage.id !== undefined && mcpMessage.id !== null) {
        errorResponse.id = mcpMessage.id;
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

