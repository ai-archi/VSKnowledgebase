import { ArtifactLinkInfoType } from './types';
/**
 * 文档内链接信息
 * 用于存储文档内的链接（wikilinks, refs, external）
 */
export interface ArtifactLinkInfo {
    type: ArtifactLinkInfoType;
    text: string;
    target?: string;
    anchor?: string;
    line?: number;
    column?: number;
}
//# sourceMappingURL=ArtifactLinkInfo.d.ts.map