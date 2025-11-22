import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError } from '../../../domain/shared/artifact/errors';
export interface MetadataRepository {
    findById(metadataId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
    findByArtifactId(artifactId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
    create(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>>;
    update(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>>;
    delete(metadataId: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=MetadataRepository.d.ts.map