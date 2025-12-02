/**
 * InversifyJS 类型标识
 */
export const TYPES = {
  // Core Services
  Logger: Symbol.for('Logger'),
  ConfigManager: Symbol.for('ConfigManager'),
  EventBus: Symbol.for('EventBus'),

  // Infrastructure Adapters
  ArtifactFileSystemAdapter: Symbol.for('ArtifactFileSystemAdapter'),
  VaultFileSystemAdapter: Symbol.for('VaultFileSystemAdapter'),
  WorkspaceFileSystemAdapter: Symbol.for('WorkspaceFileSystemAdapter'),
  SqliteRuntimeIndex: Symbol.for('SqliteRuntimeIndex'),
  YamlMetadataRepository: Symbol.for('YamlMetadataRepository'),
  GitVaultAdapter: Symbol.for('GitVaultAdapter'),

  // Repositories
  ArtifactRepository: Symbol.for('ArtifactRepository'),
  MetadataRepository: Symbol.for('MetadataRepository'),
  ArtifactLinkRepository: Symbol.for('ArtifactLinkRepository'),
  VaultRepository: Symbol.for('VaultRepository'),
  ChangeRepository: Symbol.for('ChangeRepository'),
  ChangeDetector: Symbol.for('ChangeDetector'),
  AICommandRepository: Symbol.for('AICommandRepository'),

  // Application Services
  ArtifactApplicationService: Symbol.for('ArtifactApplicationService'),
  CodeFileSystemApplicationService: Symbol.for('CodeFileSystemApplicationService'),
  VaultApplicationService: Symbol.for('VaultApplicationService'),
  LookupApplicationService: Symbol.for('LookupApplicationService'),
  DocumentApplicationService: Symbol.for('DocumentApplicationService'),
  ViewpointApplicationService: Symbol.for('ViewpointApplicationService'),
  TaskApplicationService: Symbol.for('TaskApplicationService'),
  TemplateApplicationService: Symbol.for('TemplateApplicationService'),
  AIApplicationService: Symbol.for('AIApplicationService'),
  AICommandApplicationService: Symbol.for('AICommandApplicationService'),
  MCPApplicationService: Symbol.for('MCPApplicationService'),

  // VSCode API Adapters
  CommandAdapter: Symbol.for('CommandAdapter'),
  TreeViewAdapter: Symbol.for('TreeViewAdapter'),

  // MCP
  MCPServerStarter: Symbol.for('MCPServerStarter'),
  MCPTools: Symbol.for('MCPTools'),
  MCPResources: Symbol.for('MCPResources'),

  // View Providers
  DocumentTreeViewProvider: Symbol.for('DocumentTreeViewProvider'),
  TaskTreeDataProvider: Symbol.for('TaskTreeDataProvider'),
  ViewpointTreeDataProvider: Symbol.for('ViewpointTreeDataProvider'),
  AssistantsTreeDataProvider: Symbol.for('AssistantsTreeDataProvider'),

  // Domain Services
  FileTreeDomainService: Symbol.for('FileTreeDomainService'),
  FileOperationDomainService: Symbol.for('FileOperationDomainService'),
  CommandTemplateDomainService: Symbol.for('CommandTemplateDomainService'),
};

