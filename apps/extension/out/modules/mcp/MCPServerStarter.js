"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServerStarter = void 0;
const inversify_1 = require("inversify");
const types_1 = require("../../infrastructure/di/types");
const Logger_1 = require("../../core/logger/Logger");
/**
 * MCP Server 启动器
 * 负责启动和管理进程内 MCP Server
 *
 * 注意：这是一个简化的进程内实现，主要用于暴露 MCP 接口给 AI 工具
 * 实际的 MCP Server 可能需要通过 stdio 或 HTTP 与客户端通信
 */
let MCPServerStarter = class MCPServerStarter {
    constructor(logger, mcpTools, mcpResources) {
        this.logger = logger;
        this.mcpTools = mcpTools;
        this.mcpResources = mcpResources;
        this.tools = null;
        this.resources = null;
        this.isRunning = false;
        this.tools = mcpTools;
        this.resources = mcpResources;
    }
    /**
     * 启动 MCP Server
     * 注册资源和工具
     */
    async start() {
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
        }
        catch (error) {
            this.logger.error('Failed to start MCP Server', error);
            throw error;
        }
    }
    /**
     * 停止 MCP Server
     */
    async stop() {
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
    getTools() {
        return this.tools;
    }
    /**
     * 获取 MCP Resources 实例
     */
    getResources() {
        return this.resources;
    }
    /**
     * 检查 MCP Server 是否运行中
     */
    isServerRunning() {
        return this.isRunning;
    }
};
exports.MCPServerStarter = MCPServerStarter;
exports.MCPServerStarter = MCPServerStarter = __decorate([
    (0, inversify_1.injectable)(),
    __param(0, (0, inversify_1.inject)(types_1.TYPES.Logger)),
    __param(1, (0, inversify_1.inject)(types_1.TYPES.MCPTools)),
    __param(2, (0, inversify_1.inject)(types_1.TYPES.MCPResources)),
    __metadata("design:paramtypes", [Logger_1.Logger, Object, Object])
], MCPServerStarter);
//# sourceMappingURL=MCPServerStarter.js.map