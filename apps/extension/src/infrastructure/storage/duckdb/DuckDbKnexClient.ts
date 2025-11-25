import { Database, Connection } from 'duckdb';
import { Client } from 'knex';
import { Knex } from 'knex';

/**
 * 自定义 Knex DuckDB 客户端
 * 使用 DuckDB 原生 API 实现 Knex 接口
 * 参考 SQLite3 客户端实现
 */
class DuckDbKnexClient extends Client {
  private db: Database | null = null;

  constructor(config: Knex.Config) {
    super(config);

    const logger = this.logger;
    if (config.connection && typeof config.connection === 'object' && (config.connection as any).filename === undefined) {
      if (logger) {
        (logger as any).warn(
          'Could not find `connection.filename` in config. Please specify ' +
            'the database path and name to avoid errors.'
        );
      }
    }

    if (config.useNullAsDefault === undefined) {
      if (logger) {
        (logger as any).warn(
          'DuckDB does not support inserting default values. Set the ' +
            '`useNullAsDefault` flag to hide this warning.'
        );
      }
    }
  }

  _driver() {
    return require('duckdb');
  }

  // 获取原始连接
  acquireRawConnection(): Promise<Connection> {
    return new Promise((resolve, reject) => {
      const connectionConfig = this.connectionSettings as { filename?: string };
      const filename = connectionConfig.filename || ':memory:';

      if (!this.db) {
        const Driver = this.driver.Database;
        this.db = new Driver(filename, {
          access_mode: 'READ_WRITE',
        });
      }

      const connection = this.db!.connect();
      resolve(connection);
    });
  }

  // 销毁原始连接
  async destroyRawConnection(connection: Connection): Promise<void> {
    return new Promise((resolve, reject) => {
      connection.close((err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // 执行查询
  _query(connection: Connection, obj: any): Promise<any> {
    if (!obj.sql) throw new Error('The query is empty');

    const { method } = obj;
    let callMethod: 'all' | 'run';
    switch (method) {
      case 'insert':
      case 'update':
        callMethod = obj.returning ? 'all' : 'run';
        break;
      case 'counter':
      case 'del':
        callMethod = 'run';
        break;
      default:
        callMethod = 'all';
    }

    return new Promise((resolve, reject) => {
      if (!connection || !connection[callMethod]) {
        return reject(
          new Error(`Error calling ${callMethod} on connection.`)
        );
      }

      // DuckDB API: all(sql, callback) or all(sql, params, callback)
      // Knex passes: (sql, bindings, callback)
      const bindings = obj.bindings || [];
      const callback = (err: Error | null, response: any) => {
        if (err) return reject(err);
        obj.response = response;
        obj.context = connection;
        return resolve(obj);
      };

      if (bindings.length > 0) {
        connection[callMethod](obj.sql, bindings, callback);
      } else {
        connection[callMethod](obj.sql, callback);
      }
    });
  }

  // 处理响应
  processResponse(obj: any, runner: any): any {
    const ctx = obj.context;
    const { response, returning } = obj;
    if (obj.output) return obj.output.call(runner, response);
    
    switch (obj.method) {
      case 'select':
        return response || [];
      case 'first':
        return response && response.length > 0 ? response[0] : undefined;
      case 'pluck':
        return response ? response.map((row: any) => row[obj.pluck]) : [];
      case 'insert': {
        if (returning) {
          if (response) {
            return response;
          }
        }
        // DuckDB 使用 lastInsertRowid
        return [ctx.lastInsertRowid || 0];
      }
      case 'update': {
        if (returning) {
          if (response) {
            return response;
          }
        }
        // DuckDB 使用 changes
        return ctx.changes || 0;
      }
      case 'del':
      case 'counter':
        return ctx.changes || 0;
      default: {
        return response;
      }
    }
  }

  // 连接池默认配置（DuckDB 使用单连接）
  poolDefaults() {
    return { min: 1, max: 1, propagateCreateError: false };
  }

  // 包装标识符（DuckDB 使用双引号）
  wrapIdentifierImpl(value: string): string {
    return value !== '*' ? `"${value.replace(/"/g, '""')}"` : '*';
  }

  // 销毁数据库连接
  async destroy(callback?: (err: any) => void): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      super.destroy((err: any) => {
        if (err) {
          callback?.(err);
          reject(err);
          return;
        }
        
        // 关闭 DuckDB 数据库连接
        if (this.db) {
          this.db.close((closeErr: Error | null) => {
            if (closeErr) {
              callback?.(closeErr);
              reject(closeErr);
              return;
            }
            this.db = null;
            callback?.(undefined);
            resolve();
          });
        } else {
          callback?.(undefined);
          resolve();
        }
      });
    });
  }
}

// 设置客户端属性
Object.assign(DuckDbKnexClient.prototype, {
  dialect: 'duckdb',
  driverName: 'duckdb',
});

export { DuckDbKnexClient };

