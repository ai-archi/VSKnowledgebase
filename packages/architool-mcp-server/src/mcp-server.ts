#!/usr/bin/env node

/**
 * ArchiTool MCP Server (Bridge Process)
 * 
 * 这是一个桥接进程，负责：
 * 1. 通过 stdio 与外部 MCP Client（如 Cursor）通信
 * 2. 通过 IPC（Unix Socket/命名管道）与 VS Code 扩展通信
 * 3. 转发 MCP 协议请求到扩展，并将响应返回给客户端
 * 
 * MCP Server 用途：
 * 在代码生成时提供代码相关的设计文档、设计图、规范、最佳实践、要求等知识库内容。
 * 知识库包含：
 * - 治理日志（GovernanceLog）：架构决策和合规性检查记录
 * - 微服务架构（MicroServiceArchitecture）：基于 C4 模型和微服务设计要素的架构文档
 * - 参考库（ReferenceLibrary）：行业模型、可复用资产、最佳实践、示例代码等
 * - 标准信息库（StandardsInformationBase）：企业技术标准和规范（具有强制性）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * 日志工具函数
 * 
 * 重要：所有日志输出必须使用 stderr（console.error），stdout 专门用于 JSON-RPC 协议
 * 这是 MCP 官方设计的最佳实践，确保协议消息流不被干扰
 */
function log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  const logEntry: any = {
    timestamp,
    level,
    message,
  };
  
  if (data !== undefined) {
    logEntry.data = data;
  }
  
  // 输出到 stderr（所有日志、调试信息都使用 stderr）
  console.error(JSON.stringify(logEntry));
}

const logger = {
  debug: (message: string, data?: any) => log('DEBUG', message, data),
  info: (message: string, data?: any) => log('INFO', message, data),
  warn: (message: string, data?: any) => log('WARN', message, data),
  error: (message: string, data?: any) => log('ERROR', message, data),
};

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
 * 获取注册表路径
 */
function getRegistryPath(): string {
  const homeDir = os.homedir();
  // 统一使用 mcp-server 目录
  return path.join(homeDir, '.architool', 'mcp-server', 'registry.json');
}

/**
 * 读取扩展实例注册表
 */
function readExtensionRegistry(): { instances: Array<{ ipcEndpoint: string; workspacePath: string; lastActive: string }> } {
  const registryPath = getRegistryPath();

  if (!fs.existsSync(registryPath)) {
    return { instances: [] };
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // 静默失败，返回空注册表
    return { instances: [] };
  }
}

/**
 * 获取最近活动的扩展实例
 */
function getMostRecentActiveInstance(maxRetries = 5, delayMs = 500): Promise<{ ipcEndpoint: string; workspacePath: string } | null> {
  return new Promise((resolve) => {
    let attempts = 0;

    const tryGetInstance = () => {
      attempts++;
      const registry = readExtensionRegistry();

      if (registry.instances.length === 0) {
        if (attempts < maxRetries) {
          setTimeout(tryGetInstance, delayMs);
        } else {
          resolve(null);
        }
        return;
      }

      // 过滤活动的实例
      const now = Date.now();
      const MAX_INSTANCE_AGE_MS = 5 * 60 * 1000; // 5分钟

      const activeInstances = registry.instances.filter((instance) => {
        const lastActive = new Date(instance.lastActive).getTime();
        const age = now - lastActive;

        if (age > MAX_INSTANCE_AGE_MS) {
          return false; // 实例过期，跳过
        }
        
        if (process.platform === 'win32') {
          // Windows: 检查命名管道是否存在
          // 命名管道路径格式：\\.\pipe\architool-extension-{workspace-hash}
          // 在 Windows 上，我们无法直接检查命名管道是否存在，所以假设它存在
          return true;
        } else {
          // Unix/Linux/macOS: 检查 socket 文件是否存在
          const endpointPath = instance.ipcEndpoint;
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

      if (activeInstances.length > 0) {
        // 按 lastActive 排序，返回最新的
        activeInstances.sort((a, b) => {
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
        });

        const instance = activeInstances[0];
        let ipcEndpoint = instance.ipcEndpoint;

        if (process.platform !== 'win32') {
          // Unix/Linux/macOS: 替换 ~ 为用户主目录
          ipcEndpoint = ipcEndpoint.replace('~', os.homedir());
        }
        // Windows: 命名管道路径保持不变（\\.\pipe\...）
        
        resolve({
          ipcEndpoint,
          workspacePath: instance.workspacePath,
        });
      } else {
        if (attempts < maxRetries) {
          setTimeout(tryGetInstance, delayMs);
        } else {
          resolve(null);
        }
      }
    };

    tryGetInstance();
  });
}

/**
 * 连接到扩展实例
 */
function connectToExtension(ipcEndpoint: string, maxRetries = 5, delayMs = 500): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      attempts++;

      // 在 Unix/Linux/macOS 上，验证 socket 文件是否存在
      if (process.platform !== 'win32') {
        try {
          if (!fs.existsSync(ipcEndpoint)) {
            if (attempts < maxRetries) {
              logger.debug('Socket file does not exist, retrying', {
                attempt: attempts,
                ipcEndpoint,
                maxRetries,
              });
              setTimeout(tryConnect, delayMs);
              return;
            } else {
              logger.error('Socket file does not exist after retries', {
                attempts,
                ipcEndpoint,
              });
              reject(new Error(`Socket file does not exist: ${ipcEndpoint}`));
              return;
            }
          }
          
          const stats = fs.statSync(ipcEndpoint);
          if (!stats.isSocket()) {
            if (attempts < maxRetries) {
              logger.debug('Path exists but is not a socket file, retrying', {
                attempt: attempts,
                ipcEndpoint,
              });
              setTimeout(tryConnect, delayMs);
              return;
            } else {
              logger.error('Path exists but is not a socket file', {
                attempts,
                ipcEndpoint,
              });
              reject(new Error(`Path exists but is not a socket file: ${ipcEndpoint}`));
              return;
            }
          }
        } catch (error: any) {
          logger.debug('Failed to verify socket file, will retry', {
            attempt: attempts,
            ipcEndpoint,
            errorMessage: error.message,
          });
          if (attempts < maxRetries) {
            setTimeout(tryConnect, delayMs);
            return;
          } else {
            logger.error('Failed to verify socket file after retries', {
              attempts,
              ipcEndpoint,
              errorMessage: error.message,
            });
            reject(new Error(`Failed to verify socket file: ${error.message}`));
          }
          return;
        }
      }
      
      const socket = net.createConnection(ipcEndpoint, () => {
        logger.info('Connected to extension', {
          ipcEndpoint,
          attempt: attempts,
        });
        resolve(socket);
      });

      socket.on('error', (error: Error) => {
        if (attempts < maxRetries) {
          logger.debug('Connection error, retrying', {
            attempt: attempts,
            ipcEndpoint,
            errorMessage: error.message,
          });
          
          // 在 Unix/Linux/macOS 上，如果 socket 文件不存在，尝试删除它
          if (process.platform !== 'win32' && fs.existsSync(ipcEndpoint)) {
            try {
              const stats = fs.statSync(ipcEndpoint);
              if (!stats.isSocket()) {
                // 如果不是 socket 文件，尝试删除它
                try {
                  fs.unlinkSync(ipcEndpoint);
                  logger.debug('Removed invalid socket file', { ipcEndpoint });
                } catch (unlinkError) {
                  // 忽略删除错误
                }
              }
            } catch (statError) {
              // 忽略统计错误
            }
          }
          
          if (attempts < maxRetries) {
            setTimeout(tryConnect, delayMs);
          } else {
            logger.error('Connection failed after retries', {
              attempts,
              ipcEndpoint,
              errorMessage: error.message,
            });
            reject(new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`));
          }
        } else {
          logger.error('Connection failed', {
            attempts,
            ipcEndpoint,
            errorMessage: error.message,
          });
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

    logger.debug('Sending IPC request', {
      requestId,
      method,
      hasParams: !!params,
      socketDestroyed: socket.destroyed,
      socketReady: socket.readyState,
    });

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
              logger.debug('Received IPC response', {
                requestId,
                responseType: response.type,
                hasResult: !!response.result,
                hasError: !!response.error,
              });
              
              if (response.type === 'error') {
                logger.warn('IPC request returned error', {
                  requestId,
                  method,
                  errorCode: response.error?.code,
                  errorMessage: response.error?.message,
                });
                reject(new Error(response.error?.message || 'IPC error'));
              } else {
                logger.debug('IPC request succeeded', {
                  requestId,
                  method,
                  resultType: typeof response.result,
                  resultIsArray: Array.isArray(response.result),
                });
                resolve(response.result);
              }
            }
          } catch (error) {
            // 继续等待完整响应
            logger.debug('Failed to parse IPC response line, waiting for more data', {
              requestId,
              lineLength: line.length,
            });
          }
        }
      }
    };

    socket.on('data', dataHandler);

    socket.write(JSON.stringify(message) + '\n');

    // 超时处理
    setTimeout(() => {
      socket.removeListener('data', dataHandler);
      logger.error('IPC request timeout', {
        requestId,
        method,
        timeout: 30000,
      });
      reject(new Error('IPC request timeout'));
    }, 30000);
  });
}

/**
 * 处理 MCP 工具调用
 */
async function handleMCPToolCall(socket: net.Socket, toolName: string, toolParams: any): Promise<any> {
  // 映射 MCP 工具名到 IPC 方法
  const ipcMethod = toolName === 'search_knowledge_base' ? 'search' :
                   toolName === 'get_documents_for_code' ? 'getDocumentsForCode' : null;

  if (!ipcMethod) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await sendIPCRequest(socket, ipcMethod, toolParams);
}

/**
 * 获取或创建扩展连接（懒加载）
 */
let extensionSocket: net.Socket | null = null;
let extensionInstance: { ipcEndpoint: string; workspacePath: string } | null = null;

async function getOrCreateExtensionConnection(): Promise<net.Socket> {
  // 如果已有连接且有效，直接返回
  if (extensionSocket && !extensionSocket.destroyed) {
    logger.debug('Reusing existing extension connection', {
      socketDestroyed: extensionSocket.destroyed,
      socketReady: extensionSocket.readyState,
    });
    return extensionSocket;
  }

  logger.info('Creating new extension connection');

  // 尝试获取扩展实例
  if (!extensionInstance) {
    logger.debug('Looking for extension instance');
    extensionInstance = await getMostRecentActiveInstance(5, 500); // 减少重试次数和延迟，避免阻塞太久
    
    if (!extensionInstance) {
      logger.error('No active ArchiTool extension instance found');
      throw new Error('No active ArchiTool extension instance found. Please ensure the ArchiTool extension is running in VS Code.');
    }
    
    logger.info('Found extension instance', {
      ipcEndpoint: extensionInstance.ipcEndpoint,
      workspacePath: extensionInstance.workspacePath,
    });
  }

  // 连接到扩展实例
  try {
    logger.debug('Connecting to extension', { ipcEndpoint: extensionInstance.ipcEndpoint });
    extensionSocket = await connectToExtension(extensionInstance.ipcEndpoint, 5, 500);
    logger.info('Successfully connected to extension', {
      socketDestroyed: extensionSocket.destroyed,
      socketReady: extensionSocket.readyState,
    });
    
    // 设置连接断开和错误处理
    extensionSocket.on('close', () => {
      logger.warn('Extension connection closed');
      extensionSocket = null;
      extensionInstance = null; // 重置实例，下次重新查找
    });

    extensionSocket.on('error', (error: Error) => {
      logger.error('Extension connection error', {
        errorMessage: error.message,
        errorName: error.name,
      });
      extensionSocket = null;
      extensionInstance = null; // 重置实例，下次重新查找
    });

    return extensionSocket;
  } catch (error: any) {
    logger.error('Failed to connect to extension', {
      errorMessage: error.message,
      errorStack: error.stack?.substring(0, 500),
      ipcEndpoint: extensionInstance?.ipcEndpoint,
    });
    extensionInstance = null; // 重置实例，下次重新查找
    throw new Error(`Failed to connect to extension: ${error.message}`);
  }
}

/**
 * 格式化工具调用结果为 MCP 内容格式
 */
function formatToolResult(result: any): Array<{ type: 'text'; text: string }> {
  const content: Array<{ type: 'text'; text: string }> = [];
  
  // 如果结果是数组（文档列表），格式化为更易读的格式
  if (Array.isArray(result) && result.length > 0) {
    // 检查是否是 Artifact 数组
    const isArtifactArray = result.every((item: any) => 
      item && typeof item === 'object' && ('id' in item || 'title' in item || 'name' in item)
    );
    
    if (isArtifactArray) {
      // 格式化为结构化的 JSON 格式
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
  
  return content;
}

/**
 * 主函数
 */
async function main() {
  // 创建 MCP Server 实例
  const server = new Server(
    {
      name: 'architool',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 注册 tools/list 处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    logger.info('Handling tools/list request');
    
    return {
      tools: [
        {
          name: 'search_knowledge_base',
          description: 'Search the architecture knowledge base for design documents, design diagrams, standards, best practices, requirements, and other architecture-related content. Use this tool during code generation when you need to find relevant architecture guidance, including: governance logs (architecture decisions and compliance checks), microservice architecture documents (C4 model views and design elements), reference library (industry models, reusable assets, best practices, example code), and standards information base (mandatory technical standards and specifications). This is the primary tool for most knowledge base queries (covers ~90% of use cases). Supports full-text search across titles, descriptions, and content.',
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
          description: 'Get architecture documents, design diagrams, standards, best practices, and requirements associated with a specific code file or directory path. Use this tool during code generation when you need to find related architecture guidance for the code you are working on, including: design documents, C4 architecture diagrams, API specifications, domain models, technical standards, deployment configurations, integration patterns, testing guidelines, monitoring requirements, and other architecture artifacts. Supports wildcard matching (e.g., "src/auth/*" matches "src/auth/login.ts"). This tool is essential when generating code to ensure compliance with architecture standards and design patterns.',
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
        }
      ]
    };
  });

  // 注册 tools/call 处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    logger.info('Processing tools/call request', {
      toolName: name,
      hasArguments: !!args,
    });
    
    try {
      // 获取或创建扩展连接
      logger.debug('Getting or creating extension connection');
      const socket = await getOrCreateExtensionConnection();
      logger.debug('Extension connection established', { 
        socketDestroyed: socket.destroyed,
        socketReady: socket.readyState 
      });
      
      logger.debug('Calling handleMCPToolCall', { 
        toolName: name 
      });
      const result = await handleMCPToolCall(socket, name, args);
      logger.debug('handleMCPToolCall completed', { 
        resultType: Array.isArray(result) ? 'array' : typeof result,
        resultLength: Array.isArray(result) ? result.length : undefined 
      });
      
      // 格式化响应内容
      const content = formatToolResult(result);
      
      logger.info('Sending tools/call success response', {
        contentLength: content.length,
        contentTypes: content.map((c) => c.type),
      });
      
      return {
        content: content
      };
    } catch (error: any) {
      logger.error('Error processing tools/call', {
        toolName: name,
        errorMessage: error.message,
        errorStack: error.stack?.substring(0, 500),
        errorName: error.name,
      });
      
      throw error;
    }
  });

  // 创建 stdio transport 并连接
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  logger.info('MCP Server started and connected to stdio transport');
}

// 全局错误处理：捕获未处理的 Promise rejection
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || String(reason),
    reasonStack: reason?.stack?.substring(0, 500),
    reasonName: reason?.name,
  });
  // 不退出进程，让 MCP Server 继续运行
  // 但记录错误以便调试
});

// 全局错误处理：捕获未捕获的异常
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    errorMessage: error.message,
    errorStack: error.stack?.substring(0, 500),
    errorName: error.name,
  });
  // 对于未捕获的异常，退出进程是安全的
  // 因为进程状态可能已经不一致
  process.exit(1);
});

// 启动
logger.info('MCP Server starting');
main().catch((error: any) => {
  logger.error('MCP Server fatal error', {
    errorMessage: error.message,
    errorStack: error.stack,
    errorName: error.name,
  });
  process.exit(1);
});
