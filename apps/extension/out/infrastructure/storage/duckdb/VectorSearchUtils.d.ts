import { DuckDbFactory } from './DuckDbFactory';
import { Logger } from '../../../core/logger/Logger';
export declare class VectorSearchUtils {
    private factory;
    private knex;
    private embedder;
    private initialized;
    private readonly dimension;
    private dbPath;
    private logger?;
    constructor(factory: DuckDbFactory, dbPath: string, logger?: Logger);
    initialize(): Promise<void>;
    embed(text: string): Promise<number[]>;
    search(query: string, limit?: number): Promise<string[]>;
    upsertVector(artifactId: string, title: string, description: string): Promise<void>;
    removeVector(artifactId: string): Promise<void>;
}
//# sourceMappingURL=VectorSearchUtils.d.ts.map