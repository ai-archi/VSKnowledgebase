import { ChangeType } from './types';

/**
 * ArtifactChange 实体
 * 用于记录 Artifact 的变更历史
 */
export interface ArtifactChange {
  changeId: string; // 变更 ID
  artifactId: string; // Artifact ID
  changeType: ChangeType; // 变更类型
  description: string; // 变更描述
  timestamp: string; // ISO 8601 格式
  diffSummary?: string; // 差异摘要
  author?: string; // 作者
}


