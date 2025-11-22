import { MetadataRepository } from './MetadataRepository';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError } from '../../../domain/shared/artifact/errors';
import { YamlMetadataRepository } from '../../../infrastructure/storage/yaml/YamlMetadataRepository';
export declare class MetadataRepositoryImpl implements MetadataRepository {
    private yamlRepo;
    private metadataCache;
    constructor(yamlRepo: YamlMetadataRepository);
    findById(metadataId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
    findByArtifactId(artifactId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
    create(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>>;
    update(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>>;
    delete(metadataId: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=MetadataRepositoryImpl.d.ts.map