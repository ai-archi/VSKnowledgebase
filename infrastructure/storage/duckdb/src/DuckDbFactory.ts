import { Database } from 'duckdb';
import knex, { Knex } from 'knex';
import * as path from 'path';
import * as fs from 'fs';

/**
 * DuckDB 连接工厂
 * 提供 DuckDB 连接的单例管理和连接池功能
 */
export class DuckDbFactory {
  private static instance: DuckDbFactory;
  private connection: Database | null = null;
  private knexInstance: Knex | null = null;
  private dbPath: string;

  private constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * 获取单例实例
   */
  static getInstance(dbPath: string): DuckDbFactory {
    if (!DuckDbFactory.instance) {
      DuckDbFactory.instance = new DuckDbFactory(dbPath);
    }
    return DuckDbFactory.instance;
  }

  /**
   * 创建 DuckDB 连接
   */
  async createConnection(): Promise<Database> {
    if (this.connection) {
      return this.connection;
    }

    // 确保目录存在
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 创建 DuckDB 连接
    this.connection = new Database(this.dbPath, { access_mode: 'READ_WRITE' });

    return this.connection;
  }

  /**
   * 创建 Knex 查询构建器
   */
  async createKnex(): Promise<Knex> {
    if (this.knexInstance) {
      return this.knexInstance;
    }

    const db = await this.createConnection();
    
    this.knexInstance = knex({
      client: 'duckdb',
      connection: {
        database: this.dbPath,
        // DuckDB 通过原生连接
      },
      useNullAsDefault: true,
    });

    return this.knexInstance;
  }

  /**
   * 关闭连接
   */
  async closeConnection(): Promise<void> {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.knexInstance = null;
    }

    if (this.connection) {
      await new Promise<void>((resolve, reject) => {
        this.connection!.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      this.connection = null;
    }
  }
}

