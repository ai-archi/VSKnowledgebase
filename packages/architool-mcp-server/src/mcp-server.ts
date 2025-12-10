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

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod/v4';

const mcpServer = new McpServer({
  name: 'architool',
  version: '0.1.0'
});

// 注册 search_knowledge_base 工具
mcpServer.registerTool(
  'search_knowledge_base',
  {
    description: 'Search the architecture knowledge base for design documents, design diagrams, standards, best practices, requirements, and other architecture-related content. Use this tool during code generation when you need to find relevant architecture guidance, including: governance logs (architecture decisions and compliance checks), microservice architecture documents (C4 model views and design elements), reference library (industry models, reusable assets, best practices, example code), and standards information base (mandatory technical standards and specifications). This is the primary tool for most knowledge base queries (covers ~90% of use cases). Supports full-text search across titles, descriptions, and content.',
    inputSchema: {
      query: z.string().describe('Search query string. Search across titles, descriptions, and content.'),
      vaultName: z.string().optional().describe('Optional: Filter results to a specific vault by name.'),
      tags: z.array(z.string()).optional().describe('Optional: Filter by tags (AND relationship, must include all specified tags).'),
      limit: z.number().optional().describe('Optional: Maximum number of results to return (default: 50).')
              }
  },
  async () => {
    // 空实现：返回空结果
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results: [] }, null, 2)
        }
      ]
    };
  }
);

// 注册 get_documents_for_code 工具
mcpServer.registerTool(
  'get_documents_for_code',
  {
    description: 'Get architecture documents, design diagrams, standards, best practices, and requirements associated with a specific code file or directory path. Use this tool during code generation when you need to find related architecture guidance for the code you are working on, including: design documents, C4 architecture diagrams, API specifications, domain models, technical standards, deployment configurations, integration patterns, testing guidelines, monitoring requirements, and other architecture artifacts. Supports wildcard matching (e.g., "src/auth/*" matches "src/auth/login.ts"). This tool is essential when generating code to ensure compliance with architecture standards and design patterns.',
    inputSchema: {
      codePath: z.string().describe('Code file or directory path (relative to workspace root). Supports wildcards like "src/auth/*" to match all files in a directory.')
    }
  },
  async () => {
    // 空实现：返回空结果
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ results: [] }, null, 2)
        }
      ]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((error: any) => {
  console.error('MCP Server fatal error:', error);
  process.exit(1);
});
