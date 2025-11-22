import { Container } from 'inversify';
import { TYPES } from './types';

// 应用服务
import { ArtifactFileSystemApplicationService } from '../../apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationService';
import { ArtifactFileSystemApplicationServiceImpl } from '../../apps/extension/src/modules/shared/application/ArtifactFileSystemApplicationServiceImpl';
import { VaultApplicationService } from '../../apps/extension/src/modules/shared/application/VaultApplicationService';
import { VaultApplicationServiceImpl } from '../../apps/extension/src/modules/shared/application/VaultApplicationServiceImpl';

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

// 基础设施
import {
  ArtifactFileSystemAdapter,
  VaultFileSystemAdapter,
} from '@architool/infrastructure-storage-file';
import { DuckDbRuntimeIndex } from '@architool/infrastructure-storage-duckdb';
import { YamlMetadataRepository } from '@architool/infrastructure-storage-yaml';

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

  container.bind<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex)
    .toConstantValue(new DuckDbRuntimeIndex(dbPath))
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

  // 应用服务
  container.bind<ArtifactFileSystemApplicationService>(TYPES.ArtifactFileSystemApplicationService)
    .to(ArtifactFileSystemApplicationServiceImpl)
    .inSingletonScope();

  container.bind<VaultApplicationService>(TYPES.VaultApplicationService)
    .to(VaultApplicationServiceImpl)
    .inSingletonScope();

  return container;
}

