import { ArtifactLinkInfoType } from './types';

/**
 * ArtifactLinkInfo
 * 存储在 ArtifactMetadata 中的链接信息
 */
export interface ArtifactLinkInfo {
  type: ArtifactLinkInfoType; // 链接类型：wikilink/ref/external
  target: string; // 目标路径或 ID
  alias?: string; // 链接别名，可选
  position?: { // 链接位置，可选
    line: number; // 行号
    column: number; // 列号
  };
}

