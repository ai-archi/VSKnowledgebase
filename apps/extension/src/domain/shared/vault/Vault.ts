import { RemoteEndpoint } from './RemoteEndpoint';

/**
 * Vault 实体
 * 架构内容的逻辑容器
 */
export interface Vault {
  id: string; // Vault ID（通常与 name 相同）
  name: string; // Vault 名称
  description?: string; // 描述
  remote?: RemoteEndpoint; // 远程 Git 仓库配置（如果是从 Git 拉取的）
  selfContained?: boolean; // 是否自包含（默认 true）
  readOnly?: boolean; // 是否只读（Git Vault 为只读）
}


