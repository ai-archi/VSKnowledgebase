import type { Knex } from 'knex';
import * as path from 'path';

/**
 * Knex 配置文件
 * 用于数据库迁移管理
 */
const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_PATH || path.join(process.cwd(), '.architool', 'cache', 'runtime.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  },

  production: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_PATH || path.join(process.cwd(), '.architool', 'cache', 'runtime.sqlite'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  },
};

/**
 * 获取 Knex 配置
 * @param dbPath 数据库文件路径
 * @returns Knex 配置对象
 */
export function getKnexConfig(dbPath: string): Knex.Config {
  // 在运行时，迁移文件应该指向编译后的 JavaScript 文件
  // __dirname 在编译后会指向 dist/extension/.../sqlite
  const migrationsDir = path.join(__dirname, 'migrations');
  
  return {
    client: 'better-sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
    migrations: {
      directory: migrationsDir,
      extension: 'js', // 运行时使用编译后的 .js 文件
      tableName: 'knex_migrations',
      loadExtensions: ['.js'], // 只加载 .js 文件，忽略 .d.ts
    },
  };
}

export default config;

