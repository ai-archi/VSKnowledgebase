import { DuckDbFactory } from './DuckDbFactory';
import { Knex } from 'knex';
import { ArtifactMetadata, ArtifactLink } from '@architool/domain-shared-artifact';
import { VectorSearchUtils } from './VectorSearchUtils';
import { VectorEmbeddingService } from './VectorEmbeddingService';

/**
 * DuckDB 运行时索引
 * 提供 DuckDB 数据库级别的索引和查询功能
 */
export class DuckDbRuntimeIndex {
  private factory: DuckDbFactory;
  private knex: Knex | null = null;
  private vectorSearch: VectorSearchUtils;
  private embeddingService: VectorEmbeddingService;

  constructor(dbPath: string, embeddingService?: VectorEmbeddingService) {
    this.factory = DuckDbFactory.getInstance(dbPath);
    this.embeddingService = embeddingService || new VectorEmbeddingService();
    this.vectorSearch = new VectorSearchUtils(this.factory, this.embeddingService);
  }

  /**
   * 初始化数据库连接和表结构
   */
  async initialize(): Promise<void> {
    this.knex = await this.factory.createKnex();
    
    // 创建表结构
    await this.createTables();
    
    // 初始化向量搜索
    await this.vectorSearch.initialize();
  }

  /**
   * 创建表结构
   */
  private async createTables(): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    // 创建 artifact_metadata_index 表
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
      
      // 创建索引
      table.index('artifact_id');
      table.index('vault_id');
      table.index('type');
      table.index('category');
    });

    // 创建 artifact_links_index 表
    await this.knex.schema.createTableIfNotExists('artifact_links_index', (table) => {
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
      table.string('link_file_path').notNullable();
      
      // 创建索引
      table.index('source_artifact_id');
      table.index('target_type');
      table.index('target_path');
      table.index('link_type');
      table.index('vault_id');
    });
  }

  /**
   * 从 YAML 文件同步到索引
   */
  async syncFromYaml(
    metadata: ArtifactMetadata,
    metadataFilePath: string,
    title?: string,
    description?: string
  ): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    await this.knex('artifact_metadata_index')
      .insert({
        id: metadata.id,
        artifact_id: metadata.artifactId,
        vault_id: metadata.vaultId,
        vault_name: metadata.vaultName,
        type: metadata.type,
        category: metadata.category,
        tags: JSON.stringify(metadata.tags || []),
        links: JSON.stringify(metadata.links || []),
        related_artifacts: JSON.stringify(metadata.relatedArtifacts || []),
        related_code_paths: JSON.stringify(metadata.relatedCodePaths || []),
        related_components: JSON.stringify(metadata.relatedComponents || []),
        author: metadata.author,
        owner: metadata.owner,
        reviewers: JSON.stringify(metadata.reviewers || []),
        properties: JSON.stringify(metadata.properties || {}),
        created_at: metadata.createdAt,
        updated_at: metadata.updatedAt,
        metadata_file_path: metadataFilePath,
      })
      .onConflict('id')
      .merge();

    // 同步向量索引（使用提供的 title 和 description，或从 metadata 中获取）
    const artifactTitle = title || '';
    const artifactDescription = description || '';
    await this.vectorSearch.upsertVector(metadata.artifactId, artifactTitle, artifactDescription);
  }

  /**
   * 从索引中删除
   */
  async removeFromIndex(artifactId: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    await this.knex('artifact_metadata_index')
      .where('artifact_id', artifactId)
      .delete();

    // 删除向量索引
    await this.vectorSearch.removeVector(artifactId);
  }

  /**
   * 查询索引
   */
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

    let queryBuilder = this.knex('artifact_metadata_index').select('metadata_file_path');

    if (query.vaultId) {
      queryBuilder = queryBuilder.where('vault_id', query.vaultId);
    }

    if (query.vaultName) {
      queryBuilder = queryBuilder.where('vault_name', query.vaultName);
    }

    if (query.type) {
      queryBuilder = queryBuilder.where('type', query.type);
    }

    if (query.category) {
      queryBuilder = queryBuilder.where('category', query.category);
    }

    if (query.tags && query.tags.length > 0) {
      // DuckDB 支持 JSON 查询
      queryBuilder = queryBuilder.whereRaw('tags @> ?', [JSON.stringify(query.tags)]);
    }

    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    const results = await queryBuilder;
    return results.map((r: any) => r.metadata_file_path);
  }

  /**
   * 向量搜索
   */
  async vectorSearch(query: string, limit: number = 10): Promise<string[]> {
    return this.vectorSearch.search(query, limit);
  }

  /**
   * 批量同步
   */
  async batchSyncFromYaml(
    metadataList: Array<{ metadata: ArtifactMetadata; filePath: string }>
  ): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    // 使用事务批量插入
    await this.knex.transaction(async (trx) => {
      // eslint-disable-next-line no-await-in-loop
      for (const { metadata, filePath } of metadataList) {
        // eslint-disable-next-line no-await-in-loop
        await trx('artifact_metadata_index')
          .insert({
            id: metadata.id,
            artifact_id: metadata.artifactId,
            vault_id: metadata.vaultId,
            vault_name: metadata.vaultName,
            type: metadata.type,
            category: metadata.category,
            tags: JSON.stringify(metadata.tags || []),
            links: JSON.stringify(metadata.links || []),
            related_artifacts: JSON.stringify(metadata.relatedArtifacts || []),
            related_code_paths: JSON.stringify(metadata.relatedCodePaths || []),
            related_components: JSON.stringify(metadata.relatedComponents || []),
            author: metadata.author,
            owner: metadata.owner,
            reviewers: JSON.stringify(metadata.reviewers || []),
            properties: JSON.stringify(metadata.properties || {}),
            created_at: metadata.createdAt,
            updated_at: metadata.updatedAt,
            metadata_file_path: filePath,
          })
          .onConflict('id')
          .merge();
      }
    });

    // 批量更新向量索引（注意：这里需要从 Artifact 获取 title 和 description，但 metadata 中没有）
    // 暂时使用空字符串，实际使用时应该传入完整的 Artifact 信息
    await this.vectorSearch.batchUpsertVectors(
      metadataList.map(({ metadata }) => ({
        artifactId: metadata.artifactId,
        title: '', // TODO: 需要从 Artifact 获取
        description: '', // TODO: 需要从 Artifact 获取
      }))
    );
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    await this.factory.closeConnection();
    this.knex = null;
  }
}

