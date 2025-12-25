/**
 * ArchiTool 路径常量
 * 
 * 区分工作区根目录和用户主目录的路径：
 * - 工作区根目录：使用 archidocs（可见目录）
 * - 用户主目录：使用 .architool（隐藏目录，用于全局配置）
 */
export const ARCHITOOL_PATHS = {
  /**
   * 工作区根目录下的 archidocs 目录名
   * 用于存储工作区相关的 vault 和配置
   */
  WORKSPACE_ROOT_DIR: 'archidocs',

  /**
   * 用户主目录下的 .architool 目录名
   * 用于存储全局配置和 MCP Server
   */
  USER_HOME_DIR: '.architool',

  /**
   * MCP Server 在用户主目录下的子目录名
   */
  MCP_SERVER_DIR: 'mcp-server',

  /**
   * MCP Server 脚本文件名
   */
  MCP_SERVER_SCRIPT: 'mcp-server.js',
} as const;


