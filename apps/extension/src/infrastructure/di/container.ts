import { Container } from 'inversify';
import { TYPES } from './types';

// Core Services
import { Logger } from '../../core/logger/Logger';
import { ConfigManager } from '../../core/config/ConfigManager';
import { EventBus } from '../../core/eventbus/EventBus';

// Infrastructure Adapters
import { ArtifactFileSystemAdapter } from '../../infrastructure/storage/file/ArtifactFileSystemAdapter';
import { VaultFileSystemAdapter } from '../../infrastructure/storage/file/VaultFileSystemAdapter';
import { DuckDbRuntimeIndex } from '../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { DuckDbFactory } from '../../infrastructure/storage/duckdb/DuckDbFactory';
import { YamlMetadataRepository } from '../../infrastructure/storage/yaml/YamlMetadataRepository';
import { GitVaultAdapter, GitVaultAdapterImpl } from '../../modules/vault/infrastructure/GitVaultAdapter';

// Repositories
import { ArtifactRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactRepositoryImpl';
import { MetadataRepositoryImpl } from '../../modules/shared/infrastructure/MetadataRepositoryImpl';
import { VaultRepositoryImpl } from '../../modules/shared/infrastructure/VaultRepositoryImpl';

// Application Services
import { ArtifactFileSystemApplicationServiceImpl } from '../../modules/shared/application/ArtifactFileSystemApplicationServiceImpl';
import { VaultApplicationServiceImpl } from '../../modules/shared/application/VaultApplicationServiceImpl';
import { LookupApplicationServiceImpl } from '../../modules/lookup/application/LookupApplicationServiceImpl';
import { DocumentApplicationServiceImpl } from '../../modules/document/application/DocumentApplicationServiceImpl';
import { TaskApplicationServiceImpl } from '../../modules/task/application/TaskApplicationServiceImpl';

// MCP
import { MCPServerStarter } from '../../modules/mcp/MCPServerStarter';

export function createContainer(
  architoolRoot: string,
  dbPath: string
): Container {
  const container = new Container();

  // Core Services
  container.bind<Logger>(TYPES.Logger).toConstantValue(new Logger('ArchiTool'));
  container.bind<ConfigManager>(TYPES.ConfigManager).to(ConfigManager).inSingletonScope();
  container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();

  // Infrastructure Adapters
  container.bind<ArtifactFileSystemAdapter>(TYPES.ArtifactFileSystemAdapter)
    .toConstantValue(new ArtifactFileSystemAdapter(architoolRoot));
  container.bind<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter)
    .toConstantValue(new VaultFileSystemAdapter(architoolRoot));
  // DuckDbFactory is a static class, no binding needed
  container.bind<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex)
    .to(DuckDbRuntimeIndex).inSingletonScope();
  container.bind<YamlMetadataRepository>(TYPES.YamlMetadataRepository)
    .to(YamlMetadataRepository).inSingletonScope();
  container.bind<GitVaultAdapter>(TYPES.GitVaultAdapter)
    .to(GitVaultAdapterImpl).inSingletonScope();

  // Repositories
  container.bind(TYPES.ArtifactRepository)
    .to(ArtifactRepositoryImpl).inSingletonScope();
  container.bind(TYPES.MetadataRepository)
    .to(MetadataRepositoryImpl).inSingletonScope();
  container.bind(TYPES.VaultRepository)
    .to(VaultRepositoryImpl).inSingletonScope();

  // Application Services
  container.bind(TYPES.ArtifactFileSystemApplicationService)
    .to(ArtifactFileSystemApplicationServiceImpl).inSingletonScope();
  container.bind(TYPES.VaultApplicationService)
    .to(VaultApplicationServiceImpl).inSingletonScope();
  container.bind(TYPES.LookupApplicationService)
    .to(LookupApplicationServiceImpl).inSingletonScope();
  container.bind(TYPES.DocumentApplicationService)
    .to(DocumentApplicationServiceImpl).inSingletonScope();
  container.bind(TYPES.TaskApplicationService)
    .to(TaskApplicationServiceImpl).inSingletonScope();

  // MCP
  container.bind(TYPES.MCPServerStarter)
    .to(MCPServerStarter).inSingletonScope();

  return container;
}
