import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Logger } from '../../../core/logger/Logger';
export declare class DuckDbRuntimeIndex {
    private knex;
    private vectorSearchUtils;
    private logger?;
    private dbPath;
    constructor(dbPath: string, logger?: Logger);
    initialize(): Promise<void>;
    private createTables;
    syncFromYaml(metadata: ArtifactMetadata, metadataFilePath: string, title?: string, description?: string): Promise<void>;
    removeFromIndex(artifactId: string): Promise<void>;
    queryIndex(query: {
        vaultId?: string;
        vaultName?: string;
        type?: string;
        category?: string;
        tags?: string[];
        limit?: number;
    }): Promise<string[]>;
    vectorSearch(query: string, options?: {
        limit?: number;
    }): Promise<string[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=DuckDbRuntimeIndex.d.ts.map