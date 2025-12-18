import { RemoteEndpoint } from '../value_object/RemoteEndpoint';

/**
 * Vault 类型
 */
export type VaultType = 'document' | 'ai-enhancement' | 'template' | 'task';

/**
 * Vault 实体
 * 内容组织和隔离的逻辑概念
 */
export interface Vault {
  // 标识信息
  id: string; // Vault ID（从目录名自动生成）
  name: string; // Vault 名称
  
  // 类型与描述
  type: VaultType; // Vault 类型：文档/AI增强/模板/任务
  description?: string; // Vault 描述
  
  // Git 集成
  remote?: RemoteEndpoint; // Git 远程仓库，可选
  
  // 权限控制
  readonly?: boolean; // 是否只读，从 git clone 的 vault 默认为 true，本地创建的默认为 false
  
  // 时间戳
  createdAt?: string; // ISO 8601 格式
  updatedAt?: string; // ISO 8601 格式
}

