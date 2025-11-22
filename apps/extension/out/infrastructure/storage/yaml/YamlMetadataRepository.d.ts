import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError } from '../../../domain/shared/artifact/errors';
export declare class YamlMetadataRepository {
    private vaultPath;
    constructor(vaultPath: string);
    private getMetadataFilePath;
    writeMetadata(metadata: ArtifactMetadata): Promise<Result<void, ArtifactError>>;
    readMetadata(metadataId: string): Promise<Result<ArtifactMetadata, ArtifactError>>;
    deleteMetadata(metadataId: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=YamlMetadataRepository.d.ts.map