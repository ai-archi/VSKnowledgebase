import { SqliteFactory } from './SqliteFactory';
import { Knex } from 'knex';
import { Logger } from '../../../../../core/logger/Logger';

/**
 * FTS5 全文搜索工具类
 * 提供基于 SQLite FTS5 的全文搜索功能
 */
export class Fts5SearchUtils {
  private factory: typeof SqliteFactory;
  private knex: Knex | null = null;
  private initialized: boolean = false;
  private dbPath: string;
  private logger?: Logger;

  constructor(factory: typeof SqliteFactory, dbPath: string, logger?: Logger) {
    this.factory = factory;
    this.dbPath = dbPath;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.knex = SqliteFactory.createConnection(this.dbPath, this.logger);

    // 创建 FTS5 虚拟表
    await this.knex.raw(`
      CREATE VIRTUAL TABLE IF NOT EXISTS artifact_fts USING fts5(
        artifact_id UNINDEXED,
        title,
        description,
        content='artifact_metadata_index',
        content_rowid='rowid',
        tokenize='unicode61'
      )
    `);

    // 创建触发器保持 FTS5 表与主表同步
    await this.knex.raw(`
      CREATE TRIGGER IF NOT EXISTS artifact_fts_insert AFTER INSERT ON artifact_metadata_index BEGIN
        INSERT INTO artifact_fts(rowid, artifact_id, title, description) 
        VALUES (new.rowid, new.artifact_id, new.title, new.description);
      END
    `);

    await this.knex.raw(`
      CREATE TRIGGER IF NOT EXISTS artifact_fts_delete AFTER DELETE ON artifact_metadata_index BEGIN
        DELETE FROM artifact_fts WHERE rowid = old.rowid;
      END
    `);

    await this.knex.raw(`
      CREATE TRIGGER IF NOT EXISTS artifact_fts_update AFTER UPDATE ON artifact_metadata_index BEGIN
        DELETE FROM artifact_fts WHERE rowid = old.rowid;
        INSERT INTO artifact_fts(rowid, artifact_id, title, description) 
        VALUES (new.rowid, new.artifact_id, new.title, new.description);
      END
    `);

    this.initialized = true;
    this.logger?.info('FTS5 search initialized successfully.');
  }

  /**
   * 全文搜索
   * @param query 搜索关键词
   * @param limit 结果数量限制
   * @returns Artifact ID 列表
   */
  async search(query: string, limit: number = 20): Promise<string[]> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.initialize();

    try {
      // FTS5 搜索语法：MATCH 查询
      // 使用 Knex 查询构建器，但需要 raw 来处理 FTS5 的特殊语法
      const results = await this.knex.raw(`
        SELECT artifact_id 
        FROM artifact_fts 
        WHERE artifact_fts MATCH ? 
        ORDER BY rank 
        LIMIT ?
      `, [query, limit]);

      // Knex raw 查询返回格式：{ rows: [...], ... }
      // better-sqlite3 的 Knex 适配器可能返回不同的格式
      const rows = results as any;
      if (Array.isArray(rows)) {
        return rows.map((r: any) => r.artifact_id);
      } else if (rows && rows.rows && Array.isArray(rows.rows)) {
        return rows.rows.map((r: any) => r.artifact_id);
      } else if (rows && Array.isArray(rows)) {
        return rows.map((r: any) => r.artifact_id);
      } else {
        // 尝试直接访问结果数组
        return [];
      }
    } catch (error: any) {
      this.logger?.warn('FTS5 search failed:', error);
      return [];
    }
  }

  /**
   * 同步 FTS5 索引（用于初始化或重建）
   * 从 artifact_metadata_index 表同步数据到 FTS5 表
   */
  async syncIndex(): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.initialize();

    // 重建 FTS5 索引
    await this.knex.raw(`
      INSERT INTO artifact_fts(rowid, artifact_id, title, description)
      SELECT rowid, artifact_id, title, description
      FROM artifact_metadata_index
    `);

    this.logger?.info('FTS5 index synced successfully.');
  }
}
