import { ArtifactFileSystemApplicationService, CreateArtifactOpts, UpdateArtifactOpts } from './ArtifactFileSystemApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError, QueryOptions } from '../../../domain/shared/artifact/errors';
import { ArtifactFileSystemAdapter } from '../../../infrastructure/storage/file/ArtifactFileSystemAdapter';
import { DuckDbRuntimeIndex } from '../../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { MetadataRepository } from '../infrastructure/MetadataRepository';
import { Logger } from '../../../core/logger/Logger';
export declare class ArtifactFileSystemApplicationServiceImpl implements ArtifactFileSystemApplicationService {
    private fileAdapter;
    private index;
    private metadataRepo;
    private logger;
    constructor(fileAdapter: ArtifactFileSystemAdapter, index: DuckDbRuntimeIndex, metadataRepo: MetadataRepository, logger: Logger);
    createArtifact(opts: CreateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
    getArtifact(vaultId: string, artifactId: string): Promise<Result<Artifact, ArtifactError>>;
    updateArtifact(artifactId: string, updates: UpdateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
    updateArtifactContent(vaultId: string, artifactId: string, newContent: string): Promise<Result<void, ArtifactError>>;
    deleteArtifact(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>>;
    listArtifacts(vaultId?: string, options?: QueryOptions): Promise<Result<Artifact[], ArtifactError>>;
    updateArtifactMetadata(artifactId: string, updates: Partial<ArtifactMetadata>): Promise<Result<ArtifactMetadata, ArtifactError>>;
}
//# sourceMappingURL=ArtifactFileSystemApplicationServiceImpl.d.ts.map