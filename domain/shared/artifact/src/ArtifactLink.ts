import { LinkType, TargetType, LinkStrength } from './types';
import { CodeLocation } from './CodeLocation';

/**
 * ArtifactLink 实体
 * 基于 Artifact 的关系特化，用于表达 Artifact 之间的关系
 */
export interface ArtifactLink {
  // 链接标识
  id: string; // 链接 ID，UUID
  sourceArtifactId: string; // 源 Artifact ID
  
  // 目标信息
  targetType: TargetType; // 目标类型：artifact/code/file/component/external
  targetId?: string; // 目标 ID
  targetPath?: string; // 目标路径
  targetUrl?: string; // 目标 URL
  
  // 关系类型
  linkType: LinkType; // 链接类型
  description?: string; // 关系描述
  strength?: LinkStrength; // 关系强度
  
  // 代码位置
  codeLocation?: CodeLocation; // 代码位置信息
  
  // Vault 信息
  vaultId: string; // 所属 Vault ID
  
  // 时间戳
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}

