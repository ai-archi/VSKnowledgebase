import { SqliteFactory } from './SqliteFactory';
import { Fts5SearchUtils } from './Fts5SearchUtils';
import { Knex } from 'knex';
import { ArtifactMetadata } from '../../../domain/ArtifactMetadata';
import { Logger } from '../../../../../core/logger/Logger';

/**
 * SQLite 运行时索引
 * 提供 SQLite 数据库级别的索引和查询功能
 */
export class SqliteRuntimeIndex {
  private knex: Knex | null = null;
  private fts5SearchUtils: Fts5SearchUtils;
  private logger?: Logger;
  private dbPath: string;

  constructor(dbPath: string, logger?: Logger) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.fts5SearchUtils = new Fts5SearchUtils(SqliteFactory, dbPath, logger);
  }

  async initialize(): Promise<void> {
    this.knex = SqliteFactory.createConnection(this.dbPath, this.logger);
    await this.createTables();
    await this.fts5SearchUtils.initialize();
    this.logger?.info('SqliteRuntimeIndex initialized successfully.');
  }

  private async createTables(): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    this.logger?.info('Creating SQLite tables...');

    // 创建元数据索引表
    await this.knex.schema.createTableIfNotExists('artifact_metadata_index', (table) => {
      table.string('id').primary();
      table.string('artifact_id').notNullable();
      table.string('vault_id').notNullable();
      table.string('vault_name').notNullable();
      table.string('type');
      table.string('category');
      table.text('tags'); // SQLite 使用 TEXT 存储 JSON
      table.text('links');
      table.text('related_artifacts');
      table.text('related_code_paths');
      table.text('related_components');
      table.string('author');
      table.string('owner');
      table.text('reviewers');
      table.text('properties');
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
      table.string('metadata_file_path').notNullable();
      table.string('title'); // 新增：用于 FTS5 搜索
      table.text('description'); // 新增：用于 FTS5 搜索
    });

    // 创建索引（如果不存在）
    await this.createIndexIfNotExists('artifact_metadata_index', 'artifact_id');
    await this.createIndexIfNotExists('artifact_metadata_index', 'vault_id');
    await this.createIndexIfNotExists('artifact_metadata_index', 'type');
    await this.createIndexIfNotExists('artifact_metadata_index', 'category');

    // 创建链接索引表
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
      table.text('code_location'); // SQLite 使用 TEXT 存储 JSON
      table.string('vault_id').notNullable();
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
    });

    // 创建索引（如果不存在）
    await this.createIndexIfNotExists('artifact_links', 'source_artifact_id');
    await this.createIndexIfNotExists('artifact_links', 'target_path');
    await this.createIndexIfNotExists('artifact_links', 'link_type');
    await this.createIndexIfNotExists('artifact_links', 'vault_id');

    this.logger?.info('SQLite tables created.');
  }

  /**
   * 创建索引（如果不存在）
   * 使用 SQL 的 CREATE INDEX IF NOT EXISTS 语法，保证等幂性
   */
  private async createIndexIfNotExists(tableName: string, columnName: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    const indexName = `${tableName}_${columnName}_index`;

    // 使用 SQL 原生语法 CREATE INDEX IF NOT EXISTS，保证等幂性
    await this.knex.raw(
      `CREATE INDEX IF NOT EXISTS ?? ON ?? (??)`,
      [indexName, tableName, columnName]
    );
    this.logger?.debug(`Index ${indexName} ensured (created if not exists).`);
  }

  async syncFromYaml(
    metadata: ArtifactMetadata,
    metadataFilePath: string,
    title?: string,
    description?: string
  ): Promise<void> {
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
      title: title || null, // 新增字段
      description: description || null, // 新增字段
    }).onConflict('id').merge();

    // FTS5 索引通过触发器自动同步，无需手动更新
  }

  async removeFromIndex(artifactId: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.knex('artifact_metadata_index').where({ artifact_id: artifactId }).delete();
    // FTS5 索引通过触发器自动删除
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
      // SQLite JSON 查询：使用 json_extract 或 LIKE 查询
      const tagsJson = JSON.stringify(query.tags);
      q = q.whereRaw('tags LIKE ?', [`%${tagsJson}%`]);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }

    const results = await q;
    return results.map((r: any) => r.metadata_file_path);
  }

  /**
   * 全文搜索
   * @param query 搜索关键词
   * @param options 搜索选项
   * @returns Artifact ID 列表
   */
  async textSearch(query: string, options?: { limit?: number }): Promise<string[]> {
    try {
      const artifactIds = await this.fts5SearchUtils.search(query, options?.limit || 20);
      return artifactIds;
    } catch (error: any) {
      this.logger?.warn('Text search failed', error);
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
