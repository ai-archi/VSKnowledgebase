import { ChangeType } from './types';
/**
 * ArtifactChange 实体
 * 用于记录 Artifact 的变更历史
 */
export interface ArtifactChange {
    changeId: string;
    artifactId: string;
    changeType: ChangeType;
    description: string;
    timestamp: string;
    diffSummary?: string;
    author?: string;
    impactedArtifacts?: string[];
    gitCommitHash?: string;
}
export type { ChangeType };
//# sourceMappingURL=ArtifactChange.d.ts.map