import { DuckDbFactory } from './DuckDbFactory';
import { Database } from 'duckdb';
import { VectorEmbeddingService } from './VectorEmbeddingService';

/**
 * 向量搜索工具类
 * 提供向量搜索的初始化和搜索功能
 */
export class VectorSearchUtils {
  private factory: DuckDbFactory;
  private db: Database | null = null;
  private embeddingService: VectorEmbeddingService;
  private initialized: boolean = false;
  private readonly dimension = 384; // all-MiniLM-L6-v2 模型维度

  constructor(factory: DuckDbFactory, embeddingService?: VectorEmbeddingService) {
    this.factory = factory;
    this.embeddingService = embeddingService || new VectorEmbeddingService();
  }

  /**
   * 初始化向量搜索
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.db = await this.factory.createConnection();

    // 安装并加载 VSS 扩展
    await this.runQuery("INSTALL vss");
    await this.runQuery("LOAD vss");

    // 创建向量表
    await this.runQuery(`
      CREATE TABLE IF NOT EXISTS artifact_metadata_vectors (
        artifact_id VARCHAR PRIMARY KEY,
        title VARCHAR,
        description VARCHAR,
        embedding DOUBLE[],
        updated_at TIMESTAMP
      )
    `);

    // 创建 HNSW 索引（如果支持）
    // 注意：DuckDB VSS 扩展可能需要特定的索引语法
    try {
      await this.runQuery(`
        CREATE INDEX IF NOT EXISTS idx_embedding 
        ON artifact_metadata_vectors 
        USING hnsw (embedding)
      `);
    } catch (error) {
      // 如果 HNSW 索引创建失败，使用普通索引
      // eslint-disable-next-line no-console
      console.warn('Failed to create HNSW index, using default index:', error);
    }

    // 初始化嵌入服务（懒加载）
    this.initialized = true;
  }

  /**
   * 向量相似度搜索
   */
  async search(query: string, limit: number = 10): Promise<string[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.initialize();

    // 将查询文本转换为向量
    const queryVector = await this.embeddingService.embed(query);

    // 执行向量搜索
    // 注意：DuckDB VSS 扩展的语法可能需要根据实际版本调整
    const queryStr = `
      SELECT artifact_id
      FROM artifact_metadata_vectors
      ORDER BY cosine_similarity(embedding, ?)
      LIMIT ?
    `;

    const results = await new Promise<any[]>((resolve, reject) => {
      this.db!.all(queryStr, [JSON.stringify(queryVector), limit], (err: Error | null, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });

    return results.map((r: any) => r.artifact_id);
  }

  /**
   * 插入或更新向量
   */
  async upsertVector(artifactId: string, title: string, description: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.initialize();

    // 生成文本嵌入
    const text = `${title} ${description || ''}`.trim();
    if (!text) {
      throw new Error('Cannot embed empty text');
    }
    const embedding = await this.embeddingService.embed(text);

    // 插入或更新向量
    await this.runQuery(`
      INSERT INTO artifact_metadata_vectors (artifact_id, title, description, embedding, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (artifact_id) DO UPDATE SET
        title = ?,
        description = ?,
        embedding = ?,
        updated_at = CURRENT_TIMESTAMP
    `, [
      artifactId,
      title,
      description,
      JSON.stringify(embedding),
      title,
      description,
      JSON.stringify(embedding),
    ]);
  }

  /**
   * 批量更新向量
   */
  async batchUpsertVectors(
    items: Array<{ artifactId: string; title: string; description: string }>
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.initialize();

    // 批量生成嵌入
    const texts = items.map(item => `${item.title} ${item.description || ''}`.trim()).filter(t => t.length > 0);
    if (texts.length === 0) {
      return;
    }
    const embeddings = await this.embeddingService.embedBatch(texts);

    // 批量插入（使用事务）
    await this.runQuery('BEGIN TRANSACTION');

    try {
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const embedding = embeddings[i];

        // eslint-disable-next-line no-await-in-loop
        await this.runQuery(`
          INSERT INTO artifact_metadata_vectors (artifact_id, title, description, embedding, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT (artifact_id) DO UPDATE SET
            title = ?,
            description = ?,
            embedding = ?,
            updated_at = CURRENT_TIMESTAMP
        `, [
          item.artifactId,
          item.title,
          item.description,
          JSON.stringify(embedding),
          item.title,
          item.description,
          JSON.stringify(embedding),
        ]);
      }

      await this.runQuery('COMMIT');
    } catch (error) {
      await this.runQuery('ROLLBACK');
      throw error;
    }
  }

  /**
   * 删除向量
   */
  async removeVector(artifactId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    await this.runQuery('DELETE FROM artifact_metadata_vectors WHERE artifact_id = ?', [artifactId]);
  }

  /**
   * 执行 SQL 查询
   */
  private async runQuery(sql: string, params: any[] = []): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * 获取向量维度
   */
  getDimension(): number {
    return this.dimension;
  }
}

