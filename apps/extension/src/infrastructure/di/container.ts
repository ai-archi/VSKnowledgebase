import { Container } from 'inversify';
import { TYPES } from './types';

// Core Services
import { Logger } from '../../core/logger/Logger';
import { ConfigManager } from '../../core/config/ConfigManager';
import { EventBus } from '../../core/eventbus/EventBus';

// Infrastructure Adapters
import { ArtifactFileSystemAdapter } from '../../modules/shared/infrastructure/storage/file/ArtifactFileSystemAdapter';
import { VaultFileSystemAdapter } from '../../modules/shared/infrastructure/storage/file/VaultFileSystemAdapter';
import { WorkspaceFileSystemAdapter } from '../../modules/shared/infrastructure/storage/file/WorkspaceFileSystemAdapter';
import { WorkspaceFileSystemAdapterImpl } from '../../modules/shared/infrastructure/storage/file/WorkspaceFileSystemAdapterImpl';
import { SqliteRuntimeIndex } from '../../modules/shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { YamlMetadataRepository } from '../../modules/shared/infrastructure/storage/yaml/YamlMetadataRepository';
import { GitVaultAdapter, GitVaultAdapterImpl } from '../../modules/shared/infrastructure/storage/git/GitVaultAdapter';

// Repositories
import { ArtifactRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactRepositoryImpl';
import { MetadataRepositoryImpl } from '../../modules/shared/infrastructure/MetadataRepositoryImpl';
import { VaultRepositoryImpl } from '../../modules/shared/infrastructure/VaultRepositoryImpl';
import { ChangeRepository, ChangeRepositoryImpl } from '../../modules/shared/infrastructure/ChangeRepository';
import { ChangeDetector, ChangeDetectorImpl } from '../../modules/shared/infrastructure/ChangeDetector';
import { ArtifactLinkRepository, ArtifactLinkRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactLinkRepository';
import { AICommandRepository } from '../../modules/shared/infrastructure/AICommandRepository';
import { AICommandRepositoryImpl } from '../../modules/shared/infrastructure/AICommandRepositoryImpl';

// Application Services
import { ArtifactApplicationServiceImpl } from '../../modules/shared/application/ArtifactApplicationServiceImpl';
import { ArtifactApplicationService } from '../../modules/shared/application/ArtifactApplicationService';
import { CodeFileSystemApplicationService } from '../../modules/shared/application/CodeFileSystemApplicationService';
import { CodeFileSystemApplicationServiceImpl } from '../../modules/shared/application/CodeFileSystemApplicationServiceImpl';
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
import { AICommandApplicationService } from '../../modules/shared/application/AICommandApplicationService';
import { AICommandApplicationServiceImpl } from '../../modules/shared/application/AICommandApplicationServiceImpl';

// MCP
import { MCPServerStarter } from '../../modules/mcp/MCPServerStarter';
import { MCPTools, MCPToolsImpl } from '../../modules/mcp/MCPTools';
import { MCPResources, MCPResourcesImpl } from '../../modules/mcp/MCPResources';

// Domain Services
import { FileTreeDomainService, FileTreeDomainServiceImpl } from '../../modules/shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService, FileOperationDomainServiceImpl } from '../../modules/shared/domain/services/FileOperationDomainService';
import { CommandTemplateDomainService, CommandTemplateDomainServiceImpl } from '../../modules/shared/domain/services/CommandTemplateDomainService';

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
  container.bind<WorkspaceFileSystemAdapter>(TYPES.WorkspaceFileSystemAdapter)
    .toConstantValue(new WorkspaceFileSystemAdapterImpl());
  container.bind<SqliteRuntimeIndex>(TYPES.SqliteRuntimeIndex)
    .toConstantValue(new SqliteRuntimeIndex(dbPath, logger));
  // YamlMetadataRepository 现在由 MetadataRepositoryImpl 内部管理（每个 vault 一个实例）
  // 不再需要在 DI 容器中绑定
  container.bind<GitVaultAdapter>(TYPES.GitVaultAdapter)
    .to(GitVaultAdapterImpl).inSingletonScope();

  // Repositories
  container.bind(TYPES.ArtifactRepository)
    .to(ArtifactRepositoryImpl)
    .inSingletonScope();
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
  container.bind<AICommandRepository>(TYPES.AICommandRepository)
    .to(AICommandRepositoryImpl)
    .inSingletonScope();

  // Application Services
  container.bind<ArtifactApplicationService>(TYPES.ArtifactApplicationService)
    .to(ArtifactApplicationServiceImpl).inSingletonScope();
  container.bind<CodeFileSystemApplicationService>(TYPES.CodeFileSystemApplicationService)
    .to(CodeFileSystemApplicationServiceImpl).inSingletonScope();
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
  container.bind<AICommandApplicationService>(TYPES.AICommandApplicationService)
    .to(AICommandApplicationServiceImpl).inSingletonScope();

  // MCP
  container.bind<MCPTools>(TYPES.MCPTools)
    .to(MCPToolsImpl)
    .inSingletonScope();
  container.bind<MCPResources>(TYPES.MCPResources)
    .to(MCPResourcesImpl)
    .inSingletonScope();
  container.bind(TYPES.MCPServerStarter)
    .to(MCPServerStarter).inSingletonScope();

  // Domain Services
  container.bind<FileTreeDomainService>(TYPES.FileTreeDomainService)
    .to(FileTreeDomainServiceImpl)
    .inSingletonScope();
  container.bind<FileOperationDomainService>(TYPES.FileOperationDomainService)
    .to(FileOperationDomainServiceImpl)
    .inSingletonScope();
  container.bind<CommandTemplateDomainService>(TYPES.CommandTemplateDomainService)
    .to(CommandTemplateDomainServiceImpl)
    .inSingletonScope();

  return container;
}
