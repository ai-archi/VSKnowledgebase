/**
 * 指令执行上下文
 * 用于在执行AI指令时提供上下文信息
 * 
 * 注意：vaultId、vaultName、fileName 等基础信息应从 artifact 对象获取，
 * 本接口仅包含创建文件时的额外上下文信息（如 folderPath、diagramType、templateFile、selectedFiles）
 * 以及其他自定义上下文变量。
 * 
 * templateFile 和 selectedFiles 是独立的属性：
 * - templateFile: 作为主要参考的模板文件（通常只有一个）
 * - selectedFiles: 作为参考的选中文件数组（可以有多个）
 */
export interface CommandExecutionContext {
  // 创建场景的额外信息（这些信息不在 artifact 中）
  folderPath?: string; // 文件夹路径
  diagramType?: string; // 设计图类型（mermaid/puml/archimate）
  
  // 模板文件（作为主要参考）
  templateFile?: {
    id?: string;
    path: string;
    name: string;
    title?: string;
    vault?: {
      id: string;
      name: string;
    };
  };
  
  // 选中的文件（作为参考）
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
  
  // 其他自定义上下文信息
  [key: string]: any;
}

