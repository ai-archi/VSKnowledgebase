import { LinkType, LinkStrength, TargetType } from './types';
import { CodeLocation } from './CodeLocation';
/**
 * ArtifactLink 实体
 * 用于表达 Artifact 之间的关系
 */
export interface ArtifactLink {
    id: string;
    sourceArtifactId: string;
    targetType: TargetType;
    targetId?: string;
    targetPath?: string;
    targetUrl?: string;
    linkType: LinkType;
    description?: string;
    strength?: LinkStrength;
    codeLocation?: CodeLocation;
    vaultId: string;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=ArtifactLink.d.ts.map