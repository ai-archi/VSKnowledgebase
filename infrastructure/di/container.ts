import { Container } from 'inversify';
import { TYPES } from './types';

// 应用服务
import { ArtifactFileSystemApplicationService } from '../../apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationService';
import { ArtifactFileSystemApplicationServiceImpl } from '../../apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationServiceImpl';
import { VaultApplicationService } from '../../apps/extension/src/modules/shared/application/VaultApplicationService';
import { VaultApplicationServiceImpl } from '../../apps/extension/src/modules/shared/application/VaultApplicationServiceImpl';
import { ViewpointApplicationService, ViewpointApplicationServiceImpl } from '../../apps/extension/src/modules/viewpoint/application/ViewpointApplicationService';
import { TemplateApplicationService, TemplateApplicationServiceImpl } from '../../apps/extension/src/modules/template/application/TemplateApplicationService';
import { AIApplicationService, AIApplicationServiceImpl } from '../../apps/extension/src/modules/ai/application/AIApplicationService';

// 存储库
import {
  ArtifactRepository,
  ArtifactRepositoryImpl,
} from '../../apps/extension/src/modules/shared/infrastructure/ArtifactRepository';
import {
  MetadataRepository,
  MetadataRepositoryImpl,
} from '../../apps/extension/src/modules/shared/infrastructure/MetadataRepository';
import {
  VaultRepository,
  VaultRepositoryImpl,
} from '../../apps/extension/src/modules/shared/infrastructure/VaultRepository';
import {
  ChangeRepository,
  ChangeRepositoryImpl,
} from '../../apps/extension/src/modules/shared/infrastructure/ChangeRepository';
import {
  ChangeDetector,
  ChangeDetectorImpl,
} from '../../apps/extension/src/modules/shared/infrastructure/ChangeDetector';
import {
  ArtifactLinkRepository,
  ArtifactLinkRepositoryImpl,
} from '../../apps/extension/src/modules/shared/infrastructure/ArtifactLinkRepository';

// 基础设施
import {
  ArtifactFileSystemAdapter,
  VaultFileSystemAdapter,
} from '@architool/infrastructure-storage-file';
import { DuckDbRuntimeIndex, VectorEmbeddingService } from '@architool/infrastructure-storage-duckdb';
import { YamlMetadataRepository } from '@architool/infrastructure-storage-yaml';
import { GitVaultAdapter, GitVaultAdapterImpl } from '../../apps/extension/src/modules/vault/infrastructure/GitVaultAdapter';

// MCP 模块
import { MCPServerStarter } from '../../apps/extension/src/modules/mcp/MCPServerStarter';
import { MCPTools, MCPToolsImpl } from '../../apps/extension/src/modules/mcp/MCPTools';
import { MCPResources, MCPResourcesImpl } from '../../apps/extension/src/modules/mcp/MCPResources';

// 核心服务
import { Logger } from '../../apps/extension/src/core/logger/Logger';
import { ConfigManager } from '../../apps/extension/src/core/config/ConfigManager';
import { EventBus } from '../../apps/extension/src/core/eventbus/EventBus';

/**
 * 创建并配置 DI 容器
 */
export function createContainer(
  architoolRoot: string,
  dbPath: string
): Container {
  const container = new Container();

  // 核心服务
  container.bind<Logger>(TYPES.Logger)
    .toConstantValue(new Logger('ArchiTool'))
    .inSingletonScope();

  container.bind<ConfigManager>(TYPES.ConfigManager)
    .toConstantValue(new ConfigManager(architoolRoot))
    .inSingletonScope();

  container.bind<EventBus>(TYPES.EventBus)
    .to(EventBus)
    .inSingletonScope();

  // 基础设施适配器
  container.bind<ArtifactFileSystemAdapter>(TYPES.ArtifactFileSystemAdapter)
    .toConstantValue(new ArtifactFileSystemAdapter(architoolRoot))
    .inSingletonScope();

  container.bind<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter)
    .toConstantValue(new VaultFileSystemAdapter(architoolRoot))
    .inSingletonScope();

  container.bind<GitVaultAdapter>(TYPES.GitVaultAdapter)
    .to(GitVaultAdapterImpl)
    .inSingletonScope();

  // 向量嵌入服务
  const embeddingService = new VectorEmbeddingService();
  container.bind<VectorEmbeddingService>(TYPES.VectorEmbeddingService)
    .toConstantValue(embeddingService)
    .inSingletonScope();

  container.bind<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex)
    .toConstantValue(new DuckDbRuntimeIndex(dbPath, embeddingService))
    .inSingletonScope();

  // YAML 存储库工厂（需要为每个 Vault 创建实例）
  // 注意：这里不直接绑定，而是在需要时通过工厂创建

  // 存储库
  container.bind<ArtifactRepository>(TYPES.ArtifactRepository)
    .toDynamicValue((context) => {
      const fileAdapter = context.container.get<ArtifactFileSystemAdapter>(TYPES.ArtifactFileSystemAdapter);
      return new ArtifactRepositoryImpl(fileAdapter);
    })
    .inSingletonScope();

  container.bind<MetadataRepository>(TYPES.MetadataRepository)
    .toDynamicValue((context) => {
      const vaultPath = architoolRoot; // 临时使用根路径，后续需要根据 Vault 动态创建
      const yamlRepo = new YamlMetadataRepository(vaultPath);
      return new MetadataRepositoryImpl(yamlRepo);
    })
    .inSingletonScope();

  container.bind<VaultRepository>(TYPES.VaultRepository)
    .toDynamicValue((context) => {
      const configManager = context.container.get<ConfigManager>(TYPES.ConfigManager);
      return new VaultRepositoryImpl(configManager);
    })
    .inSingletonScope();

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

  // 应用服务
  container.bind<ArtifactFileSystemApplicationService>(TYPES.ArtifactFileSystemApplicationService)
    .to(ArtifactFileSystemApplicationServiceImpl)
    .inSingletonScope();

  container.bind<VaultApplicationService>(TYPES.VaultApplicationService)
    .to(VaultApplicationServiceImpl)
    .inSingletonScope();

  container.bind<ViewpointApplicationService>(TYPES.ViewpointApplicationService)
    .to(ViewpointApplicationServiceImpl)
    .inSingletonScope();

  container.bind<TemplateApplicationService>(TYPES.TemplateApplicationService)
    .to(TemplateApplicationServiceImpl)
    .inSingletonScope();

  container.bind<AIApplicationService>(TYPES.AIApplicationService)
    .to(AIApplicationServiceImpl)
    .inSingletonScope();

  // MCP 模块
  container.bind<MCPTools>(TYPES.MCPTools)
    .to(MCPToolsImpl)
    .inSingletonScope();

  container.bind<MCPResources>(TYPES.MCPResources)
    .to(MCPResourcesImpl)
    .inSingletonScope();

  container.bind<MCPServerStarter>(TYPES.MCPServerStarter)
    .to(MCPServerStarter)
    .inSingletonScope();

  return container;
}

