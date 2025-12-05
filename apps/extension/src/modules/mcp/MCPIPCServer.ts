import * as net from 'net';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Logger } from '../../core/logger/Logger';
import { MCPTools } from './MCPTools';
import { MCPRegistry, MCPInstanceInfo } from './MCPRegistry';

/**
 * IPC 消息类型
 */
export interface IPCMessage {
  type: 'request' | 'response' | 'error';
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

/**
 * MCP IPC 服务器
 * 负责在 VS Code 扩展中创建 IPC 服务器，接收来自 MCP Server 的请求
 */
export class MCPIPCServer {
  private server: net.Server | null = null;
  private socketPath: string;
  private logger: Logger;
  private mcpTools: MCPTools;
  private registry: MCPRegistry;
  private workspaceHash: string;
  private workspacePath: string;
  private isRunning = false;

  constructor(
    workspaceHash: string,
    workspacePath: string,
    architoolRoot: string,
    mcpTools: MCPTools,
    logger: Logger
  ) {
    this.workspaceHash = workspaceHash;
    this.workspacePath = workspacePath;
    this.mcpTools = mcpTools;
    this.logger = logger;
    // 注册表使用用户主目录下的 .architool，以便多个工作区共享
    const homeArchitoolRoot = path.join(os.homedir(), '.architool');
    this.registry = new MCPRegistry(homeArchitoolRoot, logger);
    
    // 创建 IPC 端点路径（跨平台支持）
    this.socketPath = this.getIPCEndpointPath(homeArchitoolRoot, workspaceHash);
  }

  /**
   * 获取 IPC 端点路径（跨平台）
   * Windows: 使用命名管道 (\\.\pipe\)
   * Unix/Linux/macOS: 使用 Unix Socket (文件路径)
   * 
   * 注意：IPC 端点统一使用用户主目录下的 .architool/mcp-server 目录
   * 而不是工作区目录下的 .architool，以便多个工作区共享注册表
   */
  private getIPCEndpointPath(architoolRoot: string, workspaceHash: string): string {
    if (process.platform === 'win32') {
      // Windows: 使用命名管道
      // 命名管道名称不能包含路径分隔符，使用工作区哈希作为管道名
      return `\\\\.\\pipe\\architool-${workspaceHash}`;
    } else {
      // Unix/Linux/macOS: 使用 Unix Socket
      // 使用用户主目录下的 .architool/mcp-server 目录
      const homeArchitoolRoot = path.join(os.homedir(), '.architool');
      const mcpServerDir = path.join(homeArchitoolRoot, 'mcp-server');
      return path.join(mcpServerDir, `${workspaceHash}.sock`);
    }
  }

  /**
   * 启动 IPC 服务器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('MCP IPC Server is already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Windows 使用命名管道，不需要创建目录或删除文件
        // Unix/Linux/macOS 使用 Unix Socket，需要确保目录存在并清理旧文件
        if (process.platform !== 'win32') {
          // 确保目录存在
          const dir = path.dirname(this.socketPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // 如果 socket 文件已存在，删除它
          if (fs.existsSync(this.socketPath)) {
            fs.unlinkSync(this.socketPath);
          }
        }

        this.server = net.createServer((socket) => {
          this.logger.info('MCP Server connected via IPC');
          
          let buffer = '';

          socket.on('data', (data) => {
            buffer += data.toString();
            
            // 按换行符分割消息（每行一个 JSON 对象）
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 保留最后一个不完整的行
            
            for (const line of lines) {
              if (line.trim()) {
                try {
                  const message = JSON.parse(line) as IPCMessage;
                  this.handleMessage(message, socket);
                } catch (error: any) {
                  this.logger.warn('Failed to parse IPC message', error);
                }
              }
            }
          });

          socket.on('error', (error) => {
            this.logger.warn('IPC socket error', error);
          });

          socket.on('close', () => {
            this.logger.info('MCP Server disconnected from IPC');
          });
        });

        this.server.listen(this.socketPath, () => {
          this.isRunning = true;
          
          // 注册到注册表
          // 将绝对路径转换为使用 ~ 占位符的路径，以便跨平台兼容
          let ipcEndpointForRegistry = this.socketPath;
          if (process.platform !== 'win32') {
            // Unix/Linux/macOS: 将用户主目录替换为 ~
            const homeDir = os.homedir();
            if (ipcEndpointForRegistry.startsWith(homeDir)) {
              ipcEndpointForRegistry = ipcEndpointForRegistry.replace(homeDir, '~');
            }
          }
          // Windows: 命名管道路径保持不变
          
          const instanceInfo: MCPInstanceInfo = {
            workspaceHash: this.workspaceHash,
            workspacePath: this.workspacePath,
            ipcEndpoint: ipcEndpointForRegistry,
            lastActive: new Date().toISOString()
          };
          this.registry.registerInstance(instanceInfo);
          
          this.logger.info(`MCP IPC Server started at ${this.socketPath}`);
          resolve();
        });

        this.server.on('error', (error) => {
          this.logger.error('Failed to start MCP IPC Server', error);
          reject(error);
        });
      } catch (error: any) {
        this.logger.error('Failed to start MCP IPC Server', error);
        reject(error);
      }
    });
  }

  /**
   * 停止 IPC 服务器
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    return new Promise((resolve) => {
      // 从注册表注销
      this.registry.unregisterInstance(this.workspaceHash);

      if (this.server) {
        this.server.close(() => {
          // Windows 使用命名管道，不需要删除文件
          // Unix/Linux/macOS 使用 Unix Socket，需要删除 socket 文件
          if (process.platform !== 'win32') {
            if (fs.existsSync(this.socketPath)) {
              try {
                fs.unlinkSync(this.socketPath);
              } catch (error: any) {
                this.logger.warn('Failed to delete socket file', error);
              }
            }
          }
          
          this.isRunning = false;
          this.server = null;
          this.logger.info('MCP IPC Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * 更新激活时间
   */
  updateLastActive(): void {
    this.registry.updateLastActive(this.workspaceHash);
  }

  /**
   * 处理 IPC 消息
   */
  private async handleMessage(message: IPCMessage, socket: net.Socket): Promise<void> {
    try {
      if (message.type === 'request' && message.method) {
        const result = await this.handleRequest(message.method, message.params);
        
        const response: IPCMessage = {
          type: 'response',
          id: message.id,
          result
        };
        
        socket.write(JSON.stringify(response) + '\n');
      }
    } catch (error: any) {
      const errorResponse: IPCMessage = {
        type: 'error',
        id: message.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
          data: error
        }
      };
      
      socket.write(JSON.stringify(errorResponse) + '\n');
    }
  }

  /**
   * 处理请求
   */
  private async handleRequest(method: string, params: any): Promise<any> {
    switch (method) {
      case 'search':
        return await this.mcpTools.search(params);
      
      case 'getDocumentsForCode':
        return await this.mcpTools.getDocumentsForCode(params);
      
      case 'listEntries':
        return await this.mcpTools.listEntries(params);
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  /**
   * 检查服务器是否运行中
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * 获取 socket 路径
   */
  getSocketPath(): string {
    return this.socketPath;
  }
}

