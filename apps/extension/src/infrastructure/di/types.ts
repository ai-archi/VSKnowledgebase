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
  DuckDbRuntimeIndex: Symbol.for('DuckDbRuntimeIndex'),
  VectorSearchUtils: Symbol.for('VectorSearchUtils'),
  VectorEmbeddingService: Symbol.for('VectorEmbeddingService'),
  YamlMetadataRepository: Symbol.for('YamlMetadataRepository'),
  GitVaultAdapter: Symbol.for('GitVaultAdapter'),

  // Repositories
  ArtifactRepository: Symbol.for('ArtifactRepository'),
  MetadataRepository: Symbol.for('MetadataRepository'),
  ArtifactLinkRepository: Symbol.for('ArtifactLinkRepository'),
  VaultRepository: Symbol.for('VaultRepository'),
  ChangeRepository: Symbol.for('ChangeRepository'),

  // Application Services
  ArtifactFileSystemApplicationService: Symbol.for('ArtifactFileSystemApplicationService'),
  VaultApplicationService: Symbol.for('VaultApplicationService'),
  LookupApplicationService: Symbol.for('LookupApplicationService'),
  DocumentApplicationService: Symbol.for('DocumentApplicationService'),
  ViewpointApplicationService: Symbol.for('ViewpointApplicationService'),
  TaskApplicationService: Symbol.for('TaskApplicationService'),
  TemplateApplicationService: Symbol.for('TemplateApplicationService'),
  MCPApplicationService: Symbol.for('MCPApplicationService'),

  // VSCode API Adapters
  CommandAdapter: Symbol.for('CommandAdapter'),
  TreeViewAdapter: Symbol.for('TreeViewAdapter'),

  // MCP
  MCPServerStarter: Symbol.for('MCPServerStarter'),
  MCPTools: Symbol.for('MCPTools'),

  // View Providers
  DocumentTreeViewProvider: Symbol.for('DocumentTreeViewProvider'),
  TaskTreeDataProvider: Symbol.for('TaskTreeDataProvider'),
};

