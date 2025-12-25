import { Container } from 'inversify';
import { TYPES } from './types';

// Core Services
import { Logger } from '../../core/logger/Logger';
import { ConfigManager } from '../../core/config/ConfigManager';

// Infrastructure Adapters
import { ArtifactFileSystemAdapter } from '../../modules/shared/infrastructure/storage/file/ArtifactFileSystemAdapter';
import { VaultFileSystemAdapter } from '../../modules/shared/infrastructure/storage/file/VaultFileSystemAdapter';
import { WorkspaceFileSystemAdapter } from '../../modules/shared/infrastructure/storage/file/WorkspaceFileSystemAdapter';
import { WorkspaceFileSystemAdapterImpl } from '../../modules/shared/infrastructure/storage/file/WorkspaceFileSystemAdapterImpl';
import { GitVaultAdapter, GitVaultAdapterImpl } from '../../modules/shared/infrastructure/storage/git/GitVaultAdapter';
import { IDEAdapter } from '../../core/ide-api/ide-adapter';
import { VSCodeAdapter } from '../../core/ide-api/vscode-adapter';
import { createIDEAdapter } from '../../core/ide-api/ide-adapter-factory';

// Repositories
import { ArtifactRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactRepositoryImpl';
import { MetadataRepository } from '../../modules/shared/infrastructure/MetadataRepository';
import { MetadataRepositoryImpl } from '../../modules/shared/infrastructure/MetadataRepositoryImpl';
import { VaultRepository } from '../../modules/shared/infrastructure/VaultRepository';
import { VaultRepositoryImpl } from '../../modules/shared/infrastructure/VaultRepositoryImpl';
import { ArtifactLinkRepository, ArtifactLinkRepositoryImpl } from '../../modules/shared/infrastructure/ArtifactLinkRepository';
import { AICommandRepository } from '../../modules/shared/infrastructure/AICommandRepository';
import { AICommandRepositoryImpl } from '../../modules/shared/infrastructure/AICommandRepositoryImpl';

// Application Services
import { ArtifactApplicationServiceImpl } from '../../modules/shared/application/ArtifactApplicationServiceImpl';
import { ArtifactApplicationService } from '../../modules/shared/application/ArtifactApplicationService';
import { CodeFileSystemApplicationService } from '../../modules/shared/application/CodeFileSystemApplicationService';
import { CodeFileSystemApplicationServiceImpl } from '../../modules/shared/application/CodeFileSystemApplicationServiceImpl';
import { AICommandApplicationService } from '../../modules/shared/application/AICommandApplicationService';
import { AICommandApplicationServiceImpl } from '../../modules/shared/application/AICommandApplicationServiceImpl';
import { VaultApplicationServiceImpl } from '../../modules/shared/application/VaultApplicationServiceImpl';
import { VaultApplicationService } from '../../modules/shared/application/VaultApplicationService';
import { DocumentApplicationService } from '../../modules/document/application/DocumentApplicationService';
import { DocumentApplicationServiceImpl } from '../../modules/document/application/DocumentApplicationServiceImpl';
import { TemplateApplicationService } from '../../modules/template/application/TemplateApplicationService';
import { TemplateApplicationServiceImpl } from '../../modules/template/application/TemplateApplicationServiceImpl';
import { TaskApplicationService } from '../../modules/task/application/TaskApplicationService';
import { TaskApplicationServiceImpl } from '../../modules/task/application/TaskApplicationServiceImpl';

// Domain Services
import { FileTreeDomainService, FileTreeDomainServiceImpl } from '../../modules/shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService, FileOperationDomainServiceImpl } from '../../modules/shared/domain/services/FileOperationDomainService';

// Secret Storage
import { SecretStorageService } from '../../core/secret/SecretStorageService';
import * as vscode from 'vscode';

export function createContainer(
  architoolRoot: string,
  context?: vscode.ExtensionContext,
  logger?: Logger
): Container {
  const container = new Container();

  // Core Services
  // 如果提供了 logger，使用它；否则创建新的（向后兼容）
  const sharedLogger = logger || new Logger('ArchiTool');
  container.bind<Logger>(TYPES.Logger).toConstantValue(sharedLogger);
  const containerLogger = container.get<Logger>(TYPES.Logger);
  container.bind<ConfigManager>(TYPES.ConfigManager)
    .toDynamicValue(() => new ConfigManager(architoolRoot, containerLogger))
    .inSingletonScope();
  
  // Secret Storage Service (if context is provided)
  if (context) {
    container.bind<SecretStorageService>(TYPES.SecretStorageService)
      .toConstantValue(new SecretStorageService(context));
  }

  // Infrastructure Adapters
  container.bind<ArtifactFileSystemAdapter>(TYPES.ArtifactFileSystemAdapter)
    .toConstantValue(new ArtifactFileSystemAdapter(architoolRoot));
  container.bind<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter)
    .toConstantValue(new VaultFileSystemAdapter(architoolRoot));
  container.bind<WorkspaceFileSystemAdapter>(TYPES.WorkspaceFileSystemAdapter)
    .toConstantValue(new WorkspaceFileSystemAdapterImpl());
  // 使用适配器工厂自动创建 IDE 适配器
  container.bind<IDEAdapter>(TYPES.IDEAdapter)
    .toDynamicValue(() => createIDEAdapter(context));
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
  container.bind<ArtifactLinkRepository>(TYPES.ArtifactLinkRepository)
    .toDynamicValue((context) => {
      const vaultAdapter = context.container.get<VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter);
      const metadataRepo = context.container.get<MetadataRepository>(TYPES.MetadataRepository);
      const vaultRepo = context.container.get<VaultRepository>(TYPES.VaultRepository);
      return new ArtifactLinkRepositoryImpl(vaultAdapter, metadataRepo, vaultRepo);
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
  container.bind<AICommandApplicationService>(TYPES.AICommandApplicationService)
    .to(AICommandApplicationServiceImpl).inSingletonScope();
  container.bind<VaultApplicationService>(TYPES.VaultApplicationService)
    .to(VaultApplicationServiceImpl).inSingletonScope();
  container.bind<DocumentApplicationService>(TYPES.DocumentApplicationService)
    .to(DocumentApplicationServiceImpl).inSingletonScope();
  container.bind<TemplateApplicationService>(TYPES.TemplateApplicationService)
    .to(TemplateApplicationServiceImpl).inSingletonScope();
  container.bind<TaskApplicationService>(TYPES.TaskApplicationService)
    .to(TaskApplicationServiceImpl).inSingletonScope();

  // Domain Services
  container.bind<FileTreeDomainService>(TYPES.FileTreeDomainService)
    .to(FileTreeDomainServiceImpl)
    .inSingletonScope();
  container.bind<FileOperationDomainService>(TYPES.FileOperationDomainService)
    .to(FileOperationDomainServiceImpl)
    .inSingletonScope();

  return container;
}
