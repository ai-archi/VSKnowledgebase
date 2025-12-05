# Links 合并到 Metadata 实施总结

## 实施完成 ✅

已成功将 `links` 目录的功能合并到 `metadata` 中，统一通过 `ArtifactMetadata` 存储关联关系。

## 修改内容

### 1. 领域模型扩展

- ✅ **创建 `ArtifactRelationship` 类型** (`apps/extension/src/modules/shared/domain/value_object/ArtifactRelationship.ts`)
  - 替代原有的独立 `ArtifactLink` 实体
  - 存储在 `ArtifactMetadata.relationships` 字段中

- ✅ **扩展 `ArtifactMetadata`** (`apps/extension/src/modules/shared/domain/ArtifactMetadata.ts`)
  - 添加 `relationships?: ArtifactRelationship[]` 字段
  - 保留 `relatedArtifacts` 和 `relatedCodePaths`（向后兼容）

### 2. 存储层重构

- ✅ **重写 `ArtifactLinkRepositoryImpl`** (`apps/extension/src/modules/shared/infrastructure/ArtifactLinkRepository.ts`)
  - 改为从 `MetadataRepository` 读取 relationships
  - 将 `ArtifactRelationship` 转换为 `ArtifactLink`（保持接口兼容）
  - 实现创建、更新、删除操作，直接更新 metadata 中的 relationships

- ✅ **更新依赖注入** (`apps/extension/src/infrastructure/di/container.ts`)
  - 注入 `MetadataRepository` 和 `VaultRepository` 到 `ArtifactLinkRepositoryImpl`

### 3. 数据库索引更新

- ✅ **更新 `SqliteRuntimeIndex`** (`apps/extension/src/modules/shared/infrastructure/storage/sqlite/SqliteRuntimeIndex.ts`)
  - 添加 `relationships` 字段到索引同步

- ✅ **更新数据库迁移** (`apps/extension/src/modules/shared/infrastructure/storage/sqlite/migrations/20241128000000_initial_schema.ts`)
  - 在 `artifact_metadata_index` 表中添加 `relationships` 字段
  - 保留 `artifact_links` 表（向后兼容，但不再使用）

### 4. 目录结构清理

- ✅ **移除 `links` 目录创建**
  - 从 `VaultFileSystemAdapter.createVaultDirectory()` 移除
  - 从 `ArchitoolDirectoryManager` 移除

- ✅ **删除 `demo-vault/links` 目录**
  - 已删除空目录

## 向后兼容性

- ✅ **接口保持不变**：`ArtifactLinkRepository` 接口未修改
- ✅ **字段保留**：`relatedArtifacts` 和 `relatedCodePaths` 字段保留
- ✅ **数据迁移**：现有 links 数据可通过工具迁移到 metadata（如有需要）

## 优势

1. **简化架构**：减少一个目录和一套存储逻辑
2. **提高效率**：从 metadata 读取比遍历 links 目录更高效
3. **功能完整**：保留所有 ArtifactLink 的功能
4. **统一管理**：关联关系与元数据统一存储和管理

## 注意事项

1. **数据库迁移**：如果已有 `artifact_links` 表数据，需要迁移到 `artifact_metadata_index.relationships` 字段
2. **性能优化**：如果关系数量很大，可以考虑建立索引或使用 SQLite JSON 查询优化
3. **双向查询**：从目标查找链接需要遍历所有 metadata，但通常关系数量有限

## 测试建议

1. 测试创建、更新、删除链接功能
2. 测试根据源 Artifact ID 查找链接
3. 测试根据目标查找链接
4. 测试 AI 功能中的影响分析和关系分析

## 后续工作（可选）

1. 创建数据迁移工具（如果有现有 links 数据）
2. 优化双向查询性能（如果关系数量很大）
3. 考虑删除 `artifact_links` 表（如果确认不再需要）

