import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/types';
import { Logger } from '../../core/logger/Logger';
import { MCPTools, MCPToolsImpl } from './MCPTools';
import { MCPResources, MCPResourcesImpl } from './MCPResources';

/**
 * MCP Server 启动器
 * 负责启动和管理进程内 MCP Server
 * 
 * 注意：这是一个简化的进程内实现，主要用于暴露 MCP 接口给 AI 工具
 * 实际的 MCP Server 可能需要通过 stdio 或 HTTP 与客户端通信
 */
@injectable()
export class MCPServerStarter {
  private tools: MCPTools | null = null;
  private resources: MCPResources | null = null;
  private isRunning = false;

  constructor(
    @inject(TYPES.Logger)
    private logger: Logger,
    @inject(TYPES.MCPTools)
    private mcpTools: MCPTools,
    @inject(TYPES.MCPResources)
    private mcpResources: MCPResources
  ) {
    this.tools = mcpTools;
    this.resources = mcpResources;
  }

  /**
   * 启动 MCP Server
   * 注册资源和工具
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('MCP Server is already running');
      return;
    }

    try {
      // Initialize resources and tools
      this.tools = this.mcpTools;
      this.resources = this.mcpResources;

      // List available resources
      const resourceList = await this.resources.listResources();
      this.logger.info(`MCP Server started with ${resourceList.length} resources`);

      this.isRunning = true;
      this.logger.info('MCP Server initialized successfully');
    } catch (error: any) {
      this.logger.error('Failed to start MCP Server', error);
      throw error;
    }
  }

  /**
   * 停止 MCP Server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.tools = null;
    this.resources = null;
    this.logger.info('MCP Server stopped');
  }

  /**
   * 获取 MCP Tools 实例
   */
  getTools(): MCPTools | null {
    return this.tools;
  }

  /**
   * 获取 MCP Resources 实例
   */
  getResources(): MCPResources | null {
    return this.resources;
  }

  /**
   * 检查 MCP Server 是否运行中
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }
}

