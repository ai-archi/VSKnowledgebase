import { DuckDbFactory } from './DuckDbFactory';
import { Knex } from 'knex';
import { Logger } from '../../../core/logger/Logger';

export class VectorSearchUtils {
  private factory: DuckDbFactory;
  private knex: Knex | null = null;
  private embedder: any = null;
  private initialized: boolean = false;
  private readonly dimension = 384; // all-MiniLM-L6-v2 模型维度
  private dbPath: string;
  private logger?: Logger;

  constructor(factory: DuckDbFactory, dbPath: string, logger?: Logger) {
    this.factory = factory;
    this.dbPath = dbPath;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.knex = DuckDbFactory.createConnection(this.dbPath, this.logger);

    // Install and load VSS extension
    await this.knex.raw('INSTALL vss;');
    await this.knex.raw('LOAD vss;');

    // Create table for vector embeddings
    await this.knex.schema.createTableIfNotExists('artifact_metadata_vectors', (table) => {
      table.string('artifact_id').primary();
      table.string('title');
      table.string('description');
      table.specificType('embedding', 'DOUBLE[]');
      table.timestamp('updated_at');
    });

    try {
      const { pipeline } = await import('@xenova/transformers');
      this.embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch (error: any) {
      this.logger?.warn('Failed to load transformer model, vector search will be disabled', error);
    }

    this.initialized = true;
  }

  async embed(text: string): Promise<number[]> {
    if (!this.embedder) {
      await this.initialize();
    }
    if (!this.embedder) {
      return [];
    }
    const output = await this.embedder(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  async search(query: string, limit: number = 10): Promise<string[]> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.initialize();
    if (!this.embedder) {
      return [];
    }
    const queryVector = await this.embed(query);
    try {
      const results = await this.knex('artifact_metadata_vectors')
        .select('artifact_id')
        .orderByRaw('cosine_similarity(embedding, ?)', [queryVector])
        .limit(limit);
      return results.map((r: any) => r.artifact_id);
    } catch (error: any) {
      this.logger?.warn('Vector search not available, falling back to empty results:', error);
      return [];
    }
  }

  async upsertVector(artifactId: string, title: string, description: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.initialize();
    if (!this.embedder) {
      return;
    }
    const text = `${title} ${description}`.trim();
    const embedding = await this.embed(text);
    await this.knex('artifact_metadata_vectors').insert({
      artifact_id: artifactId,
      title,
      description,
      embedding,
      updated_at: this.knex.fn.now(),
    }).onConflict('artifact_id').merge();
  }

  async removeVector(artifactId: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.knex('artifact_metadata_vectors').where({ artifact_id: artifactId }).delete();
  }
}


