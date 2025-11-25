import knex, { Knex } from 'knex';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../../core/logger/Logger';

/**
 * SQLite 连接工厂
 * 使用 Knex 作为查询构建器，使用 better-sqlite3 驱动
 */
export class SqliteFactory {
  private static instances: Map<string, Knex> = new Map();

  /**
   * 创建 SQLite 连接（使用 Knex）
   */
  static createConnection(dbPath: string, logger?: Logger): Knex {
    const key = dbPath;

    if (this.instances.has(key)) {
      return this.instances.get(key)!;
    }

    // 确保目录存在
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 使用 Knex 的 better-sqlite3 客户端
    const knexInstance = knex({
      client: 'better-sqlite3',
      connection: {
        filename: dbPath,
      },
      useNullAsDefault: true,
      log: {
        warn: (message) => logger?.warn(message),
        error: (message) => logger?.error(message),
        deprecate: (message) => logger?.warn(message),
        debug: (message) => logger?.debug(message),
      },
    });

    this.instances.set(key, knexInstance);
    return knexInstance;
  }

  /**
   * 关闭连接
   */
  static async closeConnection(dbPath: string): Promise<void> {
    const key = dbPath;
    const instance = this.instances.get(key);
    if (instance) {
      await instance.destroy();
      this.instances.delete(key);
    }
  }

  /**
   * 获取连接实例
   */
  static getConnection(dbPath: string): Knex | null {
    return this.instances.get(dbPath) || null;
  }
}

