import { ArtifactLinkInfo } from './ArtifactLinkInfo';
/**
 * ArtifactMetadata 值对象
 * 存储 Artifact 的扩展元数据，与 Artifact 分离存储
 */
export interface ArtifactMetadata {
    id: string;
    artifactId: string;
    vaultId: string;
    vaultName: string;
    type?: string;
    category?: string;
    tags?: string[];
    links?: ArtifactLinkInfo[];
    relatedArtifacts?: string[];
    relatedCodePaths?: string[];
    relatedComponents?: string[];
    author?: string;
    owner?: string;
    reviewers?: string[];
    properties?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
//# sourceMappingURL=ArtifactMetadata.d.ts.map