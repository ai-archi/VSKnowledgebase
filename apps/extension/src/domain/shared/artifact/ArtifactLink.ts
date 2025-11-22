import { LinkType, LinkStrength, TargetType } from './types';
import { CodeLocation } from './CodeLocation';

/**
 * ArtifactLink 实体
 * 用于表达 Artifact 之间的关系
 */
export interface ArtifactLink {
  id: string; // 链接 ID
  sourceArtifactId: string; // 源 Artifact ID
  targetType: TargetType; // 目标类型
  targetId?: string; // 目标 ID（如果是 artifact）
  targetPath?: string; // 目标路径（如果是 file）
  targetUrl?: string; // 目标 URL（如果是 external）
  linkType: LinkType; // 链接类型
  description?: string; // 描述
  strength?: LinkStrength; // 链接强度
  codeLocation?: CodeLocation; // 代码位置（如果链接来自代码）
  vaultId: string; // 所属 Vault ID
  createdAt: string; // ISO 8601 格式
  updatedAt: string; // ISO 8601 格式
}


