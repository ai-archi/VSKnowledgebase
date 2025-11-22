import { VaultReference } from '../vault/VaultReference';
import { ArtifactViewType, ArtifactStatus, ArtifactNodeType } from './types';
/**
 * Artifact 核心实体
 * 架构管理的统一抽象，替代原有的 Note 概念
 */
export interface Artifact {
    id: string;
    vault: VaultReference;
    nodeType: ArtifactNodeType;
    path: string;
    name: string;
    format: string;
    contentLocation: string;
    viewType: ArtifactViewType;
    category?: string;
    title: string;
    description?: string;
    body?: string;
    contentHash?: string;
    metadataId?: string;
    createdAt: string;
    updatedAt: string;
    version?: string;
    status: ArtifactStatus;
    tags?: string[];
    custom?: Record<string, any>;
}
//# sourceMappingURL=Artifact.d.ts.map