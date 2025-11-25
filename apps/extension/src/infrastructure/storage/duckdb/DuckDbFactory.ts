import knex, { Knex } from 'knex';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../../../core/logger/Logger';
import { DuckDbKnexClient } from './DuckDbKnexClient';

/**
 * DuckDB 连接工厂
 * 使用 Knex 作为查询构建器，避免直接使用 native binding
 */
export class DuckDbFactory {
  private static instances: Map<string, Knex> = new Map();

  /**
   * 创建 DuckDB 连接（使用 Knex）
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

    // 直接使用客户端构造函数
    // 使用类型断言，因为 DuckDbKnexClient 完全兼容 Client 接口
    const knexInstance = knex({
      client: DuckDbKnexClient as any,
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


