import { Result } from '../../../core/types/Result';
import { Artifact } from '../../shared/domain/entity/artifact';
import { ArtifactError } from '../../shared/domain/errors';

export interface DocumentApplicationService {
  listDocuments(vaultId: string): Promise<Result<Artifact[], ArtifactError>>;
  getDocument(vaultId: string, path: string): Promise<Result<Artifact, ArtifactError>>;
  createDocument(vaultId: string, path: string, title: string, content: string): Promise<Result<Artifact, ArtifactError>>;
  createFolder(vaultId: string, folderPath: string, folderName: string, templateId?: string): Promise<Result<string, ArtifactError>>;
  updateDocument(vaultId: string, path: string, content: string): Promise<Result<Artifact, ArtifactError>>;
  deleteDocument(vaultId: string, path: string): Promise<Result<void, ArtifactError>>;
}

