import { Result } from '../../../core/types/Result';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactError } from '../../../domain/shared/artifact/errors';

export interface DocumentApplicationService {
  listDocuments(vaultId: string): Promise<Result<Artifact[], ArtifactError>>;
  getDocument(vaultId: string, path: string): Promise<Result<Artifact, ArtifactError>>;
  createDocument(vaultId: string, path: string, title: string, content: string): Promise<Result<Artifact, ArtifactError>>;
  updateDocument(vaultId: string, path: string, content: string): Promise<Result<Artifact, ArtifactError>>;
  deleteDocument(vaultId: string, path: string): Promise<Result<void, ArtifactError>>;
}

