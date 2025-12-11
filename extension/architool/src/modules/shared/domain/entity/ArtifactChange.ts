import { ChangeType } from '../types';

/**
 * ArtifactChange 实体
 * 变更记录
 */
export interface ArtifactChange {
  changeId: string; // 变更 ID
  artifactId: string; // Artifact ID
  changeType: ChangeType; // 变更类型
  description?: string; // 变更描述
  diffSummary?: string; // 变更摘要
  author?: string; // 作者
  timestamp: string; // 时间戳，ISO 8601 格式
  impactedArtifacts?: string[]; // 受影响的 Artifact ID 列表
  gitCommitHash?: string; // 关联的 Git commit
}

