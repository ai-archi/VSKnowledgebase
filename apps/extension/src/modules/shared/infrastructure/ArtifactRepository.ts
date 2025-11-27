import { Artifact } from '../domain/artifact';
import { Result, ArtifactError } from '../domain/errors';

export interface ArtifactRepository {
  findById(vaultId: string, artifactId: string): Promise<Result<Artifact | null, ArtifactError>>;
  findByPath(vaultId: string, path: string): Promise<Result<Artifact | null, ArtifactError>>;
  findAll(vaultId?: string): Promise<Result<Artifact[], ArtifactError>>;
  save(artifact: Artifact): Promise<Result<void, ArtifactError>>;
  delete(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>>;
}


