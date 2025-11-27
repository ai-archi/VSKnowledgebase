import { ArtifactMetadata } from '../domain/ArtifactMetadata';
import { Result, ArtifactError } from '../domain/errors';

export interface MetadataRepository {
  findById(metadataId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
  findByArtifactId(artifactId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
  findByCodePath(codePath: string): Promise<Result<ArtifactMetadata[], ArtifactError>>;
  create(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>>;
  update(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>>;
  delete(metadataId: string): Promise<Result<void, ArtifactError>>;
}


