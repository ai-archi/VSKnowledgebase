import { Knex } from 'knex';
import { Logger } from '../../../core/logger/Logger';
/**
 * DuckDB 连接工厂
 * 使用 Knex 作为查询构建器，避免直接使用 native binding
 */
export declare class DuckDbFactory {
    private static instances;
    /**
     * 创建 DuckDB 连接（使用 Knex）
     */
    static createConnection(dbPath: string, logger?: Logger): Knex;
    /**
     * 关闭连接
     */
    static closeConnection(dbPath: string): Promise<void>;
    /**
     * 获取连接实例
     */
    static getConnection(dbPath: string): Knex | null;
}
//# sourceMappingURL=DuckDbFactory.d.ts.map