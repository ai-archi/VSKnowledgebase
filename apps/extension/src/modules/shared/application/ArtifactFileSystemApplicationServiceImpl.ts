import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { ArtifactFileSystemApplicationService, CreateArtifactOpts, UpdateArtifactOpts } from './ArtifactFileSystemApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode, QueryOptions } from '../../../domain/shared/artifact/errors';
import { ArtifactValidator } from '../../../domain/shared/artifact/ArtifactValidator';
import { ArtifactFileSystemAdapter } from '../../../infrastructure/storage/file/ArtifactFileSystemAdapter';
import { DuckDbRuntimeIndex } from '../../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { MetadataRepository } from '../infrastructure/MetadataRepository';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@injectable()
export class ArtifactFileSystemApplicationServiceImpl implements ArtifactFileSystemApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemAdapter) private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.DuckDbRuntimeIndex) private index: DuckDbRuntimeIndex,
    @inject(TYPES.MetadataRepository) private metadataRepo: MetadataRepository,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createArtifact(opts: CreateArtifactOpts): Promise<Result<Artifact, ArtifactError>> {
    const artifactId = uuidv4();
    const metadataId = uuidv4();
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id: artifactId,
      vault: opts.vault,
      nodeType: 'FILE',
      path: opts.path,
      name: path.basename(opts.path, path.extname(opts.path)),
      format: opts.format || 'md',
      contentLocation: this.fileAdapter.getArtifactPath(opts.vault.name, opts.path),
      viewType: opts.viewType,
      category: opts.category,
      title: opts.title,
      description: '',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      metadataId,
      tags: opts.tags,
    };

    const validationResult = ArtifactValidator.validate(artifact);
    if (!validationResult.success) {
      return validationResult;
    }

    const writeResult = await this.fileAdapter.writeArtifact(artifact, opts.content);
    if (!writeResult.success) {
      return writeResult;
    }

    const metadata: ArtifactMetadata = {
      id: metadataId,
      artifactId,
      vaultId: opts.vault.id,
      vaultName: opts.vault.name,
      type: opts.viewType,
      category: opts.category,
      tags: opts.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    const metadataResult = await this.metadataRepo.create(metadata);
    if (!metadataResult.success) {
      return metadataResult;
    }

    try {
      const metadataPath = this.fileAdapter.getMetadataPath(opts.vault.name, metadataId);
      await this.index.syncFromYaml(metadata, metadataPath, artifact.title, artifact.description);
    } catch (error: any) {
      this.logger.warn('Failed to sync to index', error);
    }

    return { success: true, value: artifact };
  }

  async getArtifact(vaultId: string, artifactId: string): Promise<Result<Artifact, ArtifactError>> {
    // TODO: Implement artifact retrieval
    return {
      success: false,
      error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Artifact not found: ${artifactId}`),
    };
  }

  async updateArtifact(artifactId: string, updates: UpdateArtifactOpts): Promise<Result<Artifact, ArtifactError>> {
    // TODO: Implement artifact update
    return {
      success: false,
      error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
    };
  }

  async updateArtifactContent(vaultId: string, artifactId: string, newContent: string): Promise<Result<void, ArtifactError>> {
    // TODO: Implement content update
    return {
      success: false,
      error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
    };
  }

  async deleteArtifact(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>> {
    // TODO: Implement artifact deletion
    return {
      success: false,
      error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
    };
  }

  async listArtifacts(vaultId?: string, options?: QueryOptions): Promise<Result<Artifact[], ArtifactError>> {
    // TODO: Implement artifact listing
    return { success: true, value: [] };
  }

  async updateArtifactMetadata(artifactId: string, updates: Partial<ArtifactMetadata>): Promise<Result<ArtifactMetadata, ArtifactError>> {
    // TODO: Implement metadata update
    return {
      success: false,
      error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, 'Not implemented'),
    };
  }
}


