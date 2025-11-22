import { DuckDbFactory } from './DuckDbFactory';
import { VectorSearchUtils } from './VectorSearchUtils';
import { Knex } from 'knex';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Logger } from '../../../core/logger/Logger';

export class DuckDbRuntimeIndex {
  private knex: Knex | null = null;
  private vectorSearchUtils: VectorSearchUtils;
  private logger?: Logger;
  private dbPath: string;

  constructor(dbPath: string, logger?: Logger) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.vectorSearchUtils = new VectorSearchUtils(DuckDbFactory, dbPath, logger);
  }

  async initialize(): Promise<void> {
    this.knex = DuckDbFactory.createConnection(this.dbPath, this.logger);
    await this.createTables();
    await this.vectorSearchUtils.initialize();
    this.logger?.info('DuckDBRuntimeIndex initialized successfully.');
  }

  private async createTables(): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    this.logger?.info('Creating DuckDB tables...');
    await this.knex.raw('INSTALL json;');
    await this.knex.raw('LOAD json;');
    await this.knex.raw('INSTALL http;');
    await this.knex.raw('LOAD http;');
    await this.knex.raw('INSTALL icu;');
    await this.knex.raw('LOAD icu;');
    await this.knex.raw('INSTALL vss;');
    await this.knex.raw('LOAD vss;');

    await this.knex.schema.createTableIfNotExists('artifact_metadata_index', (table) => {
      table.string('id').primary();
      table.string('artifact_id').notNullable();
      table.string('vault_id').notNullable();
      table.string('vault_name').notNullable();
      table.string('type');
      table.string('category');
      table.json('tags');
      table.json('links');
      table.json('related_artifacts');
      table.json('related_code_paths');
      table.json('related_components');
      table.string('author');
      table.string('owner');
      table.json('reviewers');
      table.json('properties');
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
      table.string('metadata_file_path').notNullable();
    });

    await this.knex.schema.createTableIfNotExists('artifact_links', (table) => {
      table.string('id').primary();
      table.string('source_artifact_id').notNullable();
      table.string('target_type').notNullable();
      table.string('target_id');
      table.string('target_path');
      table.string('target_url');
      table.string('link_type').notNullable();
      table.string('description');
      table.string('strength');
      table.json('code_location');
      table.string('vault_id').notNullable();
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
    });
    this.logger?.info('DuckDB tables created.');
  }

  async syncFromYaml(metadata: ArtifactMetadata, metadataFilePath: string, title?: string, description?: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    await this.knex('artifact_metadata_index').insert({
      id: metadata.id,
      artifact_id: metadata.artifactId,
      vault_id: metadata.vaultId,
      vault_name: metadata.vaultName,
      type: metadata.type || null,
      category: metadata.category || null,
      tags: JSON.stringify(metadata.tags || []),
      links: JSON.stringify(metadata.links || []),
      related_artifacts: JSON.stringify(metadata.relatedArtifacts || []),
      related_code_paths: JSON.stringify(metadata.relatedCodePaths || []),
      related_components: JSON.stringify(metadata.relatedComponents || []),
      author: metadata.author || null,
      owner: metadata.owner || null,
      reviewers: JSON.stringify(metadata.reviewers || []),
      properties: JSON.stringify(metadata.properties || {}),
      created_at: metadata.createdAt,
      updated_at: metadata.updatedAt,
      metadata_file_path: metadataFilePath,
    }).onConflict('id').merge();

    if (title !== undefined && description !== undefined) {
      await this.vectorSearchUtils.upsertVector(metadata.artifactId, title || '', description || '');
    }
  }

  async removeFromIndex(artifactId: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.knex('artifact_metadata_index').where({ artifact_id: artifactId }).delete();
    await this.vectorSearchUtils.removeVector(artifactId);
  }

  async queryIndex(query: {
    vaultId?: string;
    vaultName?: string;
    type?: string;
    category?: string;
    tags?: string[];
    limit?: number;
  }): Promise<string[]> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    let q = this.knex('artifact_metadata_index').select('metadata_file_path');

    if (query.vaultId) {
      q = q.where('vault_id', query.vaultId);
    }
    if (query.vaultName) {
      q = q.where('vault_name', query.vaultName);
    }
    if (query.type) {
      q = q.where('type', query.type);
    }
    if (query.category) {
      q = q.where('category', query.category);
    }
    if (query.tags && query.tags.length > 0) {
      q = q.whereRaw('tags @> ?', [JSON.stringify(query.tags)]);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }

    const results = await q;
    return results.map((r: any) => r.metadata_file_path);
  }

  async vectorSearch(query: string, options?: { limit?: number }): Promise<string[]> {
    try {
      return await this.vectorSearchUtils.search(query, options?.limit || 20);
    } catch (error: any) {
      this.logger?.warn('Vector search failed', error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.knex) {
      await this.knex.destroy();
      this.knex = null;
    }
  }
}


