import { Result } from '../../../core/types/Result';
import { Artifact } from '../../shared/domain/entity/artifact';
import { ArtifactError } from '../../shared/domain/errors';
import { FolderMetadata } from '../../shared/domain/FolderMetadata';

export interface DocumentApplicationService {
  listDocuments(vaultId: string): Promise<Result<Artifact[], ArtifactError>>;
  getDocument(vaultId: string, path: string): Promise<Result<Artifact, ArtifactError>>;
  createDocument(vaultId: string, path: string, title: string, templateId?: string, content?: string): Promise<Result<Artifact, ArtifactError>>;
  createFolder(vaultId: string, folderPath: string, folderName: string, templateId?: string, subFolderPath?: string): Promise<Result<string, ArtifactError>>;
  updateDocument(vaultId: string, path: string, content: string): Promise<Result<Artifact, ArtifactError>>;
  deleteDocument(vaultId: string, path: string): Promise<Result<void, ArtifactError>>;
  renameDocument(vaultId: string, oldPath: string, newPath: string): Promise<Result<Artifact, ArtifactError>>;
  readFolderMetadata(vaultId: string, folderPath: string): Promise<FolderMetadata | null>;
  removeExpectedFile(vaultId: string, filePath: string): Promise<Result<void, ArtifactError>>;
}
