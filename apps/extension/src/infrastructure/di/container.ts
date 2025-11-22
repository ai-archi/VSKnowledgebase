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
// VectorEmbeddingService is not used in apps/extension version of DuckDbRuntimeIndex
import { YamlMetadataRepository } from '../../infrastructure/storage/yaml/YamlMetadataRepository';
import { GitVaultAdapter, GitVaultAdapterImpl } from '../../modules/vault/infrastructure/GitVaultAdapter';

// Repositories
import { ArtifactRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactRepositoryImpl';
import { MetadataRepositoryImpl } from '../../modules/shared/infrastructure/MetadataRepositoryImpl';
import { VaultRepositoryImpl } from '../../modules/shared/infrastructure/VaultRepositoryImpl';
import { ChangeRepository, ChangeRepositoryImpl } from '../../modules/shared/infrastructure/ChangeRepository';
import { ChangeDetector, ChangeDetectorImpl } from '../../modules/shared/infrastructure/ChangeDetector';
import { ArtifactLinkRepository, ArtifactLinkRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactLinkRepository';

// Application Services
import { ArtifactFileSystemApplicationServiceImpl } from '../../modules/shared/application/ArtifactFileSystemApplicationServiceImpl';
import { VaultApplicationServiceImpl } from '../../modules/shared/application/VaultApplicationServiceImpl';
import { LookupApplicationServiceImpl } from '../../modules/lookup/application/LookupApplicationServiceImpl';
import { DocumentApplicationServiceImpl } from '../../modules/document/application/DocumentApplicationServiceImpl';
import { TaskApplicationServiceImpl } from '../../modules/task/application/TaskApplicationServiceImpl';
import { ViewpointApplicationService } from '../../modules/viewpoint/application/ViewpointApplicationService';
import { ViewpointApplicationServiceImpl } from '../../modules/viewpoint/application/ViewpointApplicationServiceImpl';
import { TemplateApplicationService } from '../../modules/template/application/TemplateApplicationService';
import { TemplateApplicationServiceImpl } from '../../modules/template/application/TemplateApplicationServiceImpl';
import { AIApplicationService } from '../../modules/ai/application/AIApplicationService';
import { AIApplicationServiceImpl } from '../../modules/ai/application/AIApplicationServiceImpl';

// MCP
import { MCPServerStarter } from '../../modules/mcp/MCPServerStarter';
import { MCPTools, MCPToolsImpl } from '../../modules/mcp/MCPTools';
import { MCPResources, MCPResourcesImpl } from '../../modules/mcp/MCPResources';

export function createContainer(
  architoolRoot: string,
  dbPath: string
): Container {
  const container = new Container();

  // Core Services
  container.bind<Logger>(TYPES.Logger).toConstantValue(new Logger('ArchiTool'));
  const logger = container.get<Logger>(TYPES.Logger);
  container.bind<ConfigManager>(TYPES.ConfigManager)
    .toDynamicValue(() => new ConfigManager(architoolRoot, logger))
    .inSingletonScope();
  container.bind<EventBus>(TYPES.EventBus).to(EventBus).inSingletonScope();

  // Infrastructure Adapters
  container.bind<ArtifactFileSystemAdapter>(TYPES.ArtifactFileSystemAdapter)
    .toConstantValue(new ArtifactFileSystemAdapter(architoolRoot));
  container.bind<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter)
    .toConstantValue(new VaultFileSystemAdapter(architoolRoot));
  // DuckDbFactory is a static class, no binding needed
  container.bind<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex)
    .toConstantValue(new DuckDbRuntimeIndex(dbPath, logger));
  // YamlMetadataRepository 需要 vaultPath，但它是每个 vault 特定的
  // 目前先绑定一个占位符，实际使用时需要根据 vault 创建实例
  // TODO: 重构 YamlMetadataRepository 以支持多 vault
  container.bind<YamlMetadataRepository>(TYPES.YamlMetadataRepository)
    .toDynamicValue(() => {
      // 临时使用 architoolRoot，实际应该根据 vault 动态创建
      // 这是一个临时解决方案，需要重构
      return new YamlMetadataRepository(architoolRoot);
    })
    .inSingletonScope();
  container.bind<GitVaultAdapter>(TYPES.GitVaultAdapter)
    .to(GitVaultAdapterImpl).inSingletonScope();

  // Repositories
  container.bind(TYPES.ArtifactRepository)
    .to(ArtifactRepositoryImpl).inSingletonScope();
  container.bind(TYPES.MetadataRepository)
    .to(MetadataRepositoryImpl).inSingletonScope();
  container.bind(TYPES.VaultRepository)
    .to(VaultRepositoryImpl).inSingletonScope();
  container.bind<ChangeRepository>(TYPES.ChangeRepository)
    .toDynamicValue((context) => {
      const vaultAdapter = context.container.get<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter);
      return new ChangeRepositoryImpl(vaultAdapter);
    })
    .inSingletonScope();
  container.bind<ChangeDetector>(TYPES.ChangeDetector)
    .to(ChangeDetectorImpl)
    .inSingletonScope();
  container.bind<ArtifactLinkRepository>(TYPES.ArtifactLinkRepository)
    .toDynamicValue((context) => {
      const vaultAdapter = context.container.get<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter);
      return new ArtifactLinkRepositoryImpl(vaultAdapter);
    })
    .inSingletonScope();

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
  container.bind<ViewpointApplicationService>(TYPES.ViewpointApplicationService)
    .to(ViewpointApplicationServiceImpl).inSingletonScope();
  container.bind<TemplateApplicationService>(TYPES.TemplateApplicationService)
    .to(TemplateApplicationServiceImpl).inSingletonScope();
  container.bind<AIApplicationService>(TYPES.AIApplicationService)
    .to(AIApplicationServiceImpl).inSingletonScope();

  // MCP
  container.bind<MCPTools>(TYPES.MCPTools)
    .to(MCPToolsImpl)
    .inSingletonScope();
  container.bind<MCPResources>(TYPES.MCPResources)
    .to(MCPResourcesImpl)
    .inSingletonScope();
  container.bind(TYPES.MCPServerStarter)
    .to(MCPServerStarter).inSingletonScope();

  return container;
}
