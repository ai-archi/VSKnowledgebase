/**
 * 指令执行上下文
 * 用于在执行AI指令时提供上下文信息
 */
export interface CommandExecutionContext {
  // 基础信息
  vaultId: string;
  vaultName: string;
  
  // 创建场景信息
  fileName?: string; // 文件名/文件夹名/设计图名
  folderPath?: string; // 文件夹路径
  diagramType?: string; // 设计图类型（mermaid/puml/archimate）
  
  // 选中的文件
  selectedFiles?: Array<{
    id?: string;
    path: string;
    name: string;
    title?: string;
    vault?: {
      id: string;
      name: string;
    };
  }>;
  
  // 其他上下文信息
  [key: string]: any;
}

