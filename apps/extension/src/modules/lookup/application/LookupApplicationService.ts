import { Result } from '../../../core/types/Result';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactError } from '../../../domain/shared/artifact/errors';

export interface QuickCreateOptions {
  vaultId: string;
  viewType: string;
  title: string;
  content: string;
}

export interface LookupApplicationService {
  quickCreate(options: QuickCreateOptions): Promise<Result<Artifact, ArtifactError>>;
  search(query: string, vaultId?: string): Promise<Result<Artifact[], ArtifactError>>;
}

