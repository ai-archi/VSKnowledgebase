import { ArtifactLinkInfoType } from './types';

/**
 * 文档内链接信息
 * 用于存储文档内的链接（wikilinks, refs, external）
 */
export interface ArtifactLinkInfo {
  type: ArtifactLinkInfoType; // 链接类型
  text: string; // 链接文本
  target?: string; // 目标（路径、URL 等）
  anchor?: string; // 锚点
  line?: number; // 行号
  column?: number; // 列号
}


