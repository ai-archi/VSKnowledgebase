import { MetadataRepository } from './MetadataRepository';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';
import { YamlMetadataRepository } from '../../../infrastructure/storage/yaml/YamlMetadataRepository';

export class MetadataRepositoryImpl implements MetadataRepository {
  private yamlRepo: YamlMetadataRepository;
  private metadataCache: Map<string, ArtifactMetadata> = new Map();

  constructor(yamlRepo: YamlMetadataRepository) {
    this.yamlRepo = yamlRepo;
  }

  async findById(metadataId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>> {
    if (this.metadataCache.has(metadataId)) {
      return { success: true, value: this.metadataCache.get(metadataId)! };
    }

    const result = await this.yamlRepo.readMetadata(metadataId);
    if (result.success && result.value) {
      this.metadataCache.set(metadataId, result.value);
    }
    return result;
  }

  async findByArtifactId(artifactId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>> {
    // TODO: Implement search by artifactId
    return { success: true, value: null };
  }

  async create(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>> {
    const result = await this.yamlRepo.writeMetadata(metadata);
    if (result.success) {
      this.metadataCache.set(metadata.id, metadata);
      return { success: true, value: metadata };
    }
    return { success: false, error: result.error };
  }

  async update(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>> {
    const result = await this.yamlRepo.writeMetadata(metadata);
    if (result.success) {
      this.metadataCache.set(metadata.id, metadata);
      return { success: true, value: metadata };
    }
    return { success: false, error: result.error };
  }

  async delete(metadataId: string): Promise<Result<void, ArtifactError>> {
    const result = await this.yamlRepo.deleteMetadata(metadataId);
    if (result.success) {
      this.metadataCache.delete(metadataId);
    }
    return result;
  }
}


