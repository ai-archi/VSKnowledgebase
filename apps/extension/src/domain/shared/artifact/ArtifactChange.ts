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
  impactedArtifacts?: string[]; // 受影响的 Artifact ID 列表
  gitCommitHash?: string; // Git 提交哈希（如果适用）
}

// 导出 ChangeType 以便其他模块使用
export type { ChangeType };


