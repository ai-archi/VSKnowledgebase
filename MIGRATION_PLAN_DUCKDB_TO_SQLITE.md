# DuckDB + 向量搜索 → SQLite + FTS5 改造方案

## 一、改造概述

### 1.1 改造目标
- 将数据库从 DuckDB 迁移到 SQLite3
- 移除向量搜索功能，使用 FTS5 全文搜索替代
- 简化系统架构，减少资源占用
- 提升启动速度，优化 VSCode 插件体验

### 1.2 改造范围
- **移除组件**：
  - `DuckDbFactory` → 替换为 `SqliteFactory`
  - `DuckDbKnexClient` → 移除（SQLite 使用 Knex 原生支持）
  - `VectorSearchUtils` → 替换为 `Fts5SearchUtils`
  - `DuckDbRuntimeIndex` → 替换为 `SqliteRuntimeIndex`

- **保留组件**：
  - 所有应用服务接口
  - 领域模型
  - 存储布局（YAML 文件）

### 1.3 改造影响
- **依赖变更**：
  - 移除：`duckdb`、`@xenova/transformers`
  - 新增：`better-sqlite3`

- **接口变更**：
  - `vectorSearch()` 方法改为 `textSearch()`，使用 FTS5
  - 移除所有向量相关方法

---

## 二、详细改造步骤

### 阶段1：创建新的 SQLite 组件

#### 2.1 创建 SqliteFactory.ts

**位置**：`apps/extension/src/infrastructure/storage/sqlite/SqliteFactory.ts`

```typescript
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

    // 使用 Knex 的 sqlite3 客户端（原生支持）
    const knexInstance = knex({
      client: 'better-sqlite3', // 或 'sqlite3'
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
```

#### 2.2 创建 Fts5SearchUtils.ts

**位置**：`apps/extension/src/infrastructure/storage/sqlite/Fts5SearchUtils.ts`

```typescript
import { SqliteFactory } from './SqliteFactory';
import { Knex } from 'knex';
import { Logger } from '../../../core/logger/Logger';

/**
 * FTS5 全文搜索工具类
 * 提供基于 SQLite FTS5 的全文搜索功能
 */
export class Fts5SearchUtils {
  private factory: SqliteFactory;
  private knex: Knex | null = null;
  private initialized: boolean = false;
  private dbPath: string;
  private logger?: Logger;

  constructor(factory: SqliteFactory, dbPath: string, logger?: Logger) {
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
        tokenize='unicode61'  -- 支持中文分词
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
      const results = await this.knex.raw(`
        SELECT artifact_id 
        FROM artifact_fts 
        WHERE artifact_fts MATCH ? 
        ORDER BY rank 
        LIMIT ?
      `, [query, limit]);

      return results.map((r: any) => r.artifact_id);
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
```

#### 2.3 创建 SqliteRuntimeIndex.ts

**位置**：`apps/extension/src/infrastructure/storage/sqlite/SqliteRuntimeIndex.ts`

```typescript
import { SqliteFactory } from './SqliteFactory';
import { Fts5SearchUtils } from './Fts5SearchUtils';
import { Knex } from 'knex';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Logger } from '../../../core/logger/Logger';

/**
 * SQLite 运行时索引
 * 提供 SQLite 数据库级别的索引和查询功能
 */
export class SqliteRuntimeIndex {
  private knex: Knex | null = null;
  private fts5SearchUtils: Fts5SearchUtils;
  private logger?: Logger;
  private dbPath: string;

  constructor(dbPath: string, logger?: Logger) {
    this.dbPath = dbPath;
    this.logger = logger;
    this.fts5SearchUtils = new Fts5SearchUtils(SqliteFactory, dbPath, logger);
  }

  async initialize(): Promise<void> {
    this.knex = SqliteFactory.createConnection(this.dbPath, this.logger);
    await this.createTables();
    await this.fts5SearchUtils.initialize();
    this.logger?.info('SqliteRuntimeIndex initialized successfully.');
  }

  private async createTables(): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    this.logger?.info('Creating SQLite tables...');

    // 创建元数据索引表
    await this.knex.schema.createTableIfNotExists('artifact_metadata_index', (table) => {
      table.string('id').primary();
      table.string('artifact_id').notNullable();
      table.string('vault_id').notNullable();
      table.string('vault_name').notNullable();
      table.string('type');
      table.string('category');
      table.text('tags'); // SQLite 使用 TEXT 存储 JSON
      table.text('links');
      table.text('related_artifacts');
      table.text('related_code_paths');
      table.text('related_components');
      table.string('author');
      table.string('owner');
      table.text('reviewers');
      table.text('properties');
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();
      table.string('metadata_file_path').notNullable();
      table.string('title'); // 新增：用于 FTS5 搜索
      table.text('description'); // 新增：用于 FTS5 搜索

      // 创建索引
      table.index('artifact_id');
      table.index('vault_id');
      table.index('type');
      table.index('category');
    });

    // 创建链接索引表
    await this.knex.schema.createTableIfNotExists('artifact_links', (table) => {
      table.string('id').primary();
      table.string('source_artifact_id').notNullable();
      table.string('target_type').notNullable();
      table.string('target_id');
      table.string('target_path');
      table.string('target_url');
      table.string('link_type').notNullable();
      table.string('description');
      table.string('strength');
      table.text('code_location'); // SQLite 使用 TEXT 存储 JSON
      table.string('vault_id').notNullable();
      table.timestamp('created_at').notNullable();
      table.timestamp('updated_at').notNullable();

      // 创建索引
      table.index('source_artifact_id');
      table.index('target_path');
      table.index('link_type');
      table.index('vault_id');
    });

    this.logger?.info('SQLite tables created.');
  }

  async syncFromYaml(
    metadata: ArtifactMetadata,
    metadataFilePath: string,
    title?: string,
    description?: string
  ): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }

    await this.knex('artifact_metadata_index').insert({
      id: metadata.id,
      artifact_id: metadata.artifactId,
      vault_id: metadata.vaultId,
      vault_name: metadata.vaultName,
      type: metadata.type || null,
      category: metadata.category || null,
      tags: JSON.stringify(metadata.tags || []),
      links: JSON.stringify(metadata.links || []),
      related_artifacts: JSON.stringify(metadata.relatedArtifacts || []),
      related_code_paths: JSON.stringify(metadata.relatedCodePaths || []),
      related_components: JSON.stringify(metadata.relatedComponents || []),
      author: metadata.author || null,
      owner: metadata.owner || null,
      reviewers: JSON.stringify(metadata.reviewers || []),
      properties: JSON.stringify(metadata.properties || {}),
      created_at: metadata.createdAt,
      updated_at: metadata.updatedAt,
      metadata_file_path: metadataFilePath,
      title: title || null, // 新增字段
      description: description || null, // 新增字段
    }).onConflict('id').merge();

    // FTS5 索引通过触发器自动同步，无需手动更新
  }

  async removeFromIndex(artifactId: string): Promise<void> {
    if (!this.knex) {
      throw new Error('Database not initialized');
    }
    await this.knex('artifact_metadata_index').where({ artifact_id: artifactId }).delete();
    // FTS5 索引通过触发器自动删除
  }

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

    let q = this.knex('artifact_metadata_index').select('metadata_file_path');

    if (query.vaultId) {
      q = q.where('vault_id', query.vaultId);
    }
    if (query.vaultName) {
      q = q.where('vault_name', query.vaultName);
    }
    if (query.type) {
      q = q.where('type', query.type);
    }
    if (query.category) {
      q = q.where('category', query.category);
    }
    if (query.tags && query.tags.length > 0) {
      // SQLite JSON 查询：使用 json_extract 或 LIKE 查询
      const tagsJson = JSON.stringify(query.tags);
      q = q.whereRaw('tags LIKE ?', [`%${tagsJson}%`]);
    }
    if (query.limit) {
      q = q.limit(query.limit);
    }

    const results = await q;
    return results.map((r: any) => r.metadata_file_path);
  }

  /**
   * 全文搜索
   * @param query 搜索关键词
   * @param options 搜索选项
   * @returns 文件路径列表
   */
  async textSearch(query: string, options?: { limit?: number }): Promise<string[]> {
    try {
      const artifactIds = await this.fts5SearchUtils.search(query, options?.limit || 20);
      
      if (artifactIds.length === 0) {
        return [];
      }

      // 根据 artifact_id 查询文件路径
      const results = await this.knex!('artifact_metadata_index')
        .whereIn('artifact_id', artifactIds)
        .select('metadata_file_path');

      return results.map((r: any) => r.metadata_file_path);
    } catch (error: any) {
      this.logger?.warn('Text search failed', error);
      return [];
    }
  }

  async close(): Promise<void> {
    if (this.knex) {
      await this.knex.destroy();
      this.knex = null;
    }
  }
}
```

---

### 阶段2：更新依赖和配置

#### 2.4 更新 package.json

**位置**：`apps/extension/package.json`

```json
{
  "dependencies": {
    // 移除
    // "@xenova/transformers": "^2.0.0",
    // "duckdb": "^1.4.2",
    
    // 新增
    "better-sqlite3": "^9.0.0",
    "@types/better-sqlite3": "^7.6.0",
    
    // 保留
    "knex": "^3.1.0",
    // ... 其他依赖
  }
}
```

#### 2.5 创建导出文件

**位置**：`apps/extension/src/infrastructure/storage/sqlite/index.ts`

```typescript
export * from './SqliteFactory';
export * from './SqliteRuntimeIndex';
export * from './Fts5SearchUtils';
```

---

### 阶段3：更新依赖注入和引用

#### 2.6 更新 DI 容器

**位置**：`apps/extension/src/infrastructure/di/container.ts`

```typescript
// 修改导入
// import { DuckDbRuntimeIndex } from '../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
// import { DuckDbFactory } from '../../infrastructure/storage/duckdb/DuckDbFactory';
import { SqliteRuntimeIndex } from '../../infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { SqliteFactory } from '../../infrastructure/storage/sqlite/SqliteFactory';

export function createContainer(
  architoolRoot: string,
  dbPath: string
): Container {
  const container = new Container();
  
  // ... 其他绑定 ...

  // 修改绑定
  // container.bind<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex)
  //   .toConstantValue(new DuckDbRuntimeIndex(dbPath, logger));
  container.bind<SqliteRuntimeIndex>(TYPES.SqliteRuntimeIndex)
    .toConstantValue(new SqliteRuntimeIndex(dbPath, logger));

  // ... 其他绑定 ...
}
```

#### 2.7 更新类型定义

**位置**：`apps/extension/src/infrastructure/di/types.ts`

```typescript
export const TYPES = {
  // ... 其他类型 ...
  
  // 替换
  SqliteRuntimeIndex: Symbol.for('SqliteRuntimeIndex'),
  // 移除：DuckDbRuntimeIndex, VectorSearchUtils, VectorEmbeddingService
};
```

#### 2.8 更新应用服务引用

**位置**：`apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationServiceImpl.ts`

```typescript
// 修改导入
// import { DuckDbRuntimeIndex } from '../../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { SqliteRuntimeIndex } from '../../../infrastructure/storage/sqlite/SqliteRuntimeIndex';

@injectable()
export class ArtifactFileSystemApplicationServiceImpl implements ArtifactFileSystemApplicationService {
  constructor(
    // 修改注入类型
    // @inject(TYPES.DuckDbRuntimeIndex) private index: DuckDbRuntimeIndex,
    @inject(TYPES.SqliteRuntimeIndex) private index: SqliteRuntimeIndex,
    // ... 其他依赖
  ) {}
}
```

#### 2.9 更新 MCP Tools

**位置**：`apps/extension/src/modules/mcp/MCPTools.ts`

```typescript
// 修改导入
// import { DuckDbRuntimeIndex } from '../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { SqliteRuntimeIndex } from '../../infrastructure/storage/sqlite/SqliteRuntimeIndex';

@injectable()
export class MCPToolsImpl implements MCPTools {
  constructor(
    // ... 其他依赖
    // @inject(TYPES.DuckDbRuntimeIndex)
    // private duckDbIndex: DuckDbRuntimeIndex,
    @inject(TYPES.SqliteRuntimeIndex)
    private sqliteIndex: SqliteRuntimeIndex,
  ) {}

  async search(params: {
    query: string;
    vaultName?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Artifact[]> {
    // ... 其他逻辑 ...

    // 使用全文搜索
    let artifactIds: string[] = [];
    try {
      artifactIds = await this.sqliteIndex.textSearch(params.query, {
        limit: params.limit ? params.limit * 2 : 100,
      });
      this.logger.debug(`Text search found ${artifactIds.length} artifacts`);
    } catch (error: any) {
      this.logger.warn('Text search failed, falling back to basic search', error);
    }

    // ... 其他逻辑 ...
  }
}
```

#### 2.10 更新主入口

**位置**：`apps/extension/src/main.ts`

```typescript
// 修改导入
// import { DuckDbRuntimeIndex } from './infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { SqliteRuntimeIndex } from './infrastructure/storage/sqlite/SqliteRuntimeIndex';

export async function activate(context: vscode.ExtensionContext) {
  // ... 其他代码 ...

  // 修改获取实例
  // const index = container.get<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex);
  const index = container.get<SqliteRuntimeIndex>(TYPES.SqliteRuntimeIndex);

  // ... 其他代码 ...
}
```

---

---

### 阶段4：清理旧代码

#### 2.11 删除旧文件

删除以下文件和目录：
- `apps/extension/src/infrastructure/storage/duckdb/` 整个目录
  - `DuckDbFactory.ts`
  - `DuckDbKnexClient.ts`
  - `DuckDbRuntimeIndex.ts`
  - `VectorSearchUtils.ts`
  - `index.ts`

#### 2.12 更新数据库文件路径

**位置**：`apps/extension/src/main.ts`

```typescript
// 修改数据库文件路径
// const dbPath = path.join(architoolRoot, 'cache', 'runtime.duckdb');
const dbPath = path.join(architoolRoot, 'cache', 'runtime.sqlite');
```

---

## 三、测试验证

### 3.1 单元测试

创建测试文件：
- `apps/extension/src/infrastructure/storage/sqlite/SqliteFactory.test.ts`
- `apps/extension/src/infrastructure/storage/sqlite/Fts5SearchUtils.test.ts`
- `apps/extension/src/infrastructure/storage/sqlite/SqliteRuntimeIndex.test.ts`

### 3.2 集成测试

验证以下功能：
1. ✅ 数据库初始化
2. ✅ 表创建和索引
3. ✅ FTS5 虚拟表创建
4. ✅ 触发器同步
5. ✅ 数据插入和查询
6. ✅ 全文搜索功能
7. ✅ 结构化查询
8. ✅ 数据删除

### 3.3 性能测试

对比测试：
- 启动时间
- 查询性能
- 内存占用
- 数据库文件大小

---

## 四、注意事项

### 4.1 SQL 语法差异

**JSON 查询**：
- DuckDB: `tags @> ?` (JSON 包含查询)
- SQLite: `tags LIKE ?` 或使用 `json_extract()` 函数

**时间戳**：
- 两者都支持 TIMESTAMP，但格式可能略有差异

### 4.2 FTS5 配置

- 使用 `unicode61` tokenizer 支持中文
- 可以配置其他 tokenizer（如 `porter` 用于英文词干提取）

---

## 五、实施时间表

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| 阶段1 | 创建新的 SQLite 组件 | 1-2 天 |
| 阶段2 | 更新依赖和配置 | 0.5 天 |
| 阶段3 | 更新依赖注入和引用 | 1 天 |
| 阶段4 | 清理旧代码 | 0.5 天 |
| 测试 | 单元测试和集成测试 | 1-2 天 |
| **总计** | | **3-5 天** |

---

## 六、总结

本改造方案将项目从 DuckDB + 向量搜索迁移到 SQLite + FTS5，主要优势：
- ✅ 减少资源占用（移除模型和向量索引，节省 300-400 MB 内存）
- ✅ 提升启动速度（无需加载模型，启动时间减少 2-5 秒）
- ✅ 简化系统架构（移除向量搜索组件，降低维护成本）
- ✅ 更适合 VSCode 插件场景（轻量级，快速响应）

改造完成后，系统将更加轻量级，更适合架构文档管理和 MCP AI 辅助编程场景。

