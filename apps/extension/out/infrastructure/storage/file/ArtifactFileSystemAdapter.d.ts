import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { Result, ArtifactError } from '../../../domain/shared/artifact/errors';
export declare class ArtifactFileSystemAdapter {
    private architoolRoot;
    constructor(architoolRoot: string);
    getArtifactPath(vaultName: string, artifactPath: string): string;
    getMetadataPath(vaultName: string, metadataId: string): string;
    readArtifact(vaultName: string, artifactPath: string): Promise<Result<string, ArtifactError>>;
    writeArtifact(artifact: Artifact, content: string): Promise<Result<void, ArtifactError>>;
    deleteArtifact(vaultName: string, artifactPath: string): Promise<Result<void, ArtifactError>>;
}
//# sourceMappingURL=ArtifactFileSystemAdapter.d.ts.map