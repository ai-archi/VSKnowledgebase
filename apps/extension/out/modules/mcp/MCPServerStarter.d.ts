import { Logger } from '../../core/logger/Logger';
import { MCPTools } from './MCPTools';
import { MCPResources } from './MCPResources';
/**
 * MCP Server 启动器
 * 负责启动和管理进程内 MCP Server
 *
 * 注意：这是一个简化的进程内实现，主要用于暴露 MCP 接口给 AI 工具
 * 实际的 MCP Server 可能需要通过 stdio 或 HTTP 与客户端通信
 */
export declare class MCPServerStarter {
    private logger;
    private mcpTools;
    private mcpResources;
    private tools;
    private resources;
    private isRunning;
    constructor(logger: Logger, mcpTools: MCPTools, mcpResources: MCPResources);
    /**
     * 启动 MCP Server
     * 注册资源和工具
     */
    start(): Promise<void>;
    /**
     * 停止 MCP Server
     */
    stop(): Promise<void>;
    /**
     * 获取 MCP Tools 实例
     */
    getTools(): MCPTools | null;
    /**
     * 获取 MCP Resources 实例
     */
    getResources(): MCPResources | null;
    /**
     * 检查 MCP Server 是否运行中
     */
    isServerRunning(): boolean;
}
//# sourceMappingURL=MCPServerStarter.d.ts.map