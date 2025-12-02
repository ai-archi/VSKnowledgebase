/**
 * AI指令适用场景
 */
export type AICommandContext = 'file' | 'folder' | 'design' | 'all';

/**
 * 变量定义
 */
export interface VariableDefinition {
  name: string; // 变量名（如 fileName）
  description: string; // 变量说明
  defaultValue?: string; // 默认值
  required: boolean; // 是否必需
}

/**
 * AI指令实体
 */
export interface AICommand {
  // 核心标识
  id: string; // 唯一标识符（文件名去掉扩展名）
  vaultId: string; // 所属Vault ID
  vaultName: string; // 所属Vault名称
  
  // 基本信息
  name: string; // 显示名称
  description?: string; // 指令描述
  icon?: string; // 图标名称（VSCode ThemeIcon）
  
  // 适用场景
  contexts: AICommandContext[]; // 适用场景：file, folder, design, all
  
  // 状态
  enabled: boolean; // 是否启用
  order: number; // 显示顺序
  
  // 模板相关
  template: string; // 提示词模板内容（支持变量）
  variables?: VariableDefinition[]; // 可用变量定义
  
  // 文件路径
  filePath: string; // 指令文件路径（相对于vault根目录）
  
  // 时间戳
  createdAt?: string; // ISO 8601 格式
  updatedAt?: string; // ISO 8601 格式
}

