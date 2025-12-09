#!/usr/bin/env node

/**
 * ArchiTool MCP Server
 * 
 * 这是一个 MCP Server，负责：
 * 1. 通过 stdio 与外部 MCP Client（如 Cursor）通信
 * 2. 提供知识库查询工具（暂时为空实现）
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
 * 处理 MCP 工具调用（空实现）
 */
async function handleMCPToolCall(toolName: string, toolParams: any): Promise<any> {
  logger.info('Handling tool call (empty implementation)', {
    toolName,
    toolParams,
  });
  
  // 返回空结果
  return [];
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
      // 调用工具处理函数（空实现）
      const result = await handleMCPToolCall(name, args);
      
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
