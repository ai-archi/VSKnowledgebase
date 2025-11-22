import { RemoteEndpoint } from './RemoteEndpoint';

/**
 * Vault 实体
 * 内容组织和隔离的逻辑概念
 */
export interface Vault {
  // 标识信息
  id: string; // Vault ID
  name: string; // Vault 名称
  
  // 描述信息
  description?: string; // Vault 描述
  
  // Git 集成
  remote?: RemoteEndpoint; // Git 远程仓库，可选
  selfContained: boolean; // 是否自包含
  
  // 只读标志
  readOnly: boolean; // Git Vault 为 true，本地 Vault 为 false
}

