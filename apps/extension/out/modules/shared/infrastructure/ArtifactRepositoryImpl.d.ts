import { ArtifactRepository } from './ArtifactRepository';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { Result, ArtifactError } from '../../../domain/shared/artifact/errors';
import { ArtifactFileSystemAdapter } from '../../../infrastructure/storage/file/ArtifactFileSystemAdapter';
export declare class ArtifactRepositoryImpl implements ArtifactRepository {
    private fileAdapter;
    constructor(fileAdapter: ArtifactFileSystemAdapter);
    findById(vaultId: string, artifactId: string): Promise<Result<Artifact | null, ArtifactError>>;
    findByPath(vaultId: string, path: string): Promise<Result<Artifact | null, ArtifactError>>;
    findAll(vaultId?: string): Promise<Result<Artifact[], ArtifactError>>;
    save(artifact: Artifact): Promise<Result<void, ArtifactError>>;
    delete(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=ArtifactRepositoryImpl.d.ts.map