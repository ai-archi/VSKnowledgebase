import { Result, ArtifactError, QueryOptions } from '../../../domain/shared/artifact/errors';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { ArtifactViewType } from '../../../domain/shared/artifact/types';
import { VaultReference } from '../../../domain/shared/vault/VaultReference';
export interface CreateArtifactOpts {
    vault: VaultReference;
    path: string;
    title: string;
    content: string;
    viewType: ArtifactViewType;
    format?: string;
    category?: string;
    tags?: string[];
}
export interface UpdateArtifactOpts {
    title?: string;
    description?: string;
    content?: string;
    tags?: string[];
    category?: string;
}
export interface ArtifactFileSystemApplicationService {
    createArtifact(opts: CreateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
    getArtifact(vaultId: string, artifactId: string): Promise<Result<Artifact, ArtifactError>>;
    updateArtifact(artifactId: string, updates: UpdateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
    updateArtifactContent(vaultId: string, artifactId: string, newContent: string): Promise<Result<void, ArtifactError>>;
    deleteArtifact(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>>;
    listArtifacts(vaultId?: string, options?: QueryOptions): Promise<Result<Artifact[], ArtifactError>>;
    updateArtifactMetadata(artifactId: string, updates: Partial<ArtifactMetadata>): Promise<Result<ArtifactMetadata, ArtifactError>>;
}
//# sourceMappingURL=ArtifactFileSystemApplicationService.d.ts.map