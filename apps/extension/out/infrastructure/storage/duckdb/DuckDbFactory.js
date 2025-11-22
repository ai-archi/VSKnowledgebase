"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuckDbFactory = void 0;
const knex_1 = __importDefault(require("knex"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * DuckDB 连接工厂
 * 使用 Knex 作为查询构建器，避免直接使用 native binding
 */
class DuckDbFactory {
    /**
     * 创建 DuckDB 连接（使用 Knex）
     */
    static createConnection(dbPath, logger) {
        const key = dbPath;
        if (this.instances.has(key)) {
            return this.instances.get(key);
        }
        // 确保目录存在
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const knexInstance = (0, knex_1.default)({
            client: 'duckdb',
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
    static async closeConnection(dbPath) {
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
    static getConnection(dbPath) {
        return this.instances.get(dbPath) || null;
    }
}
exports.DuckDbFactory = DuckDbFactory;
DuckDbFactory.instances = new Map();
//# sourceMappingURL=DuckDbFactory.js.map