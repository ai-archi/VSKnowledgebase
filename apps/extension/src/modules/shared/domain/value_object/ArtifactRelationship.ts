import { LinkType, TargetType, LinkStrength } from '../types';
import { CodeLocation } from './CodeLocation';

/**
 * ArtifactRelationship 值对象
 * 存储在 ArtifactMetadata 中的关联关系
 * 替代原有的独立 ArtifactLink 实体
 */
export interface ArtifactRelationship {
  // 关系标识（可选，用于更新/删除特定关系）
  id?: string; // 关系 ID，UUID（可选，如果没有则自动生成）
  
  // 目标信息
  targetType: TargetType; // 目标类型：artifact/code/file/component/external
  targetId?: string; // 目标 ID
  targetPath?: string; // 目标路径
  targetUrl?: string; // 目标 URL
  
  // 关系类型
  linkType: LinkType; // 链接类型：implements/references/depends_on/related_to/validates/tests
  description?: string; // 关系描述
  strength?: LinkStrength; // 关系强度：strong/medium/weak
  
  // 代码位置
  codeLocation?: CodeLocation; // 代码位置信息
  
  // 时间戳（可选，用于追踪关系创建和更新时间）
  createdAt?: string; // ISO 8601 格式
  updatedAt?: string; // ISO 8601 格式
}

