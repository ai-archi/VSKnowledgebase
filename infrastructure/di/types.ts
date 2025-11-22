/**
 * DI 容器类型标识
 */
export const TYPES = {
  // 应用服务
  ArtifactFileSystemApplicationService: Symbol.for('ArtifactFileSystemApplicationService'),
  VaultApplicationService: Symbol.for('VaultApplicationService'),
  DocumentApplicationService: Symbol.for('DocumentApplicationService'),
  ViewpointApplicationService: Symbol.for('ViewpointApplicationService'),
  TaskApplicationService: Symbol.for('TaskApplicationService'),
  TemplateApplicationService: Symbol.for('TemplateApplicationService'),
  AIApplicationService: Symbol.for('AIApplicationService'),
  MCPApplicationService: Symbol.for('MCPApplicationService'),
  
  // 存储库
  ArtifactRepository: Symbol.for('ArtifactRepository'),
  MetadataRepository: Symbol.for('MetadataRepository'),
  ArtifactLinkRepository: Symbol.for('ArtifactLinkRepository'),
  VaultRepository: Symbol.for('VaultRepository'),
  ChangeRepository: Symbol.for('ChangeRepository'),
  ChangeDetector: Symbol.for('ChangeDetector'),
  
  // 基础设施
  ArtifactFileSystemAdapter: Symbol.for('ArtifactFileSystemAdapter'),
  VaultFileSystemAdapter: Symbol.for('VaultFileSystemAdapter'),
  GitVaultAdapter: Symbol.for('GitVaultAdapter'),
  DuckDbRuntimeIndex: Symbol.for('DuckDbRuntimeIndex'),
  VectorSearchUtils: Symbol.for('VectorSearchUtils'),
  VectorEmbeddingService: Symbol.for('VectorEmbeddingService'),
  
  // 核心服务
  EventBus: Symbol.for('EventBus'),
  Logger: Symbol.for('Logger'),
  ConfigManager: Symbol.for('ConfigManager'),
  
  // MCP
  MCPServerStarter: Symbol.for('MCPServerStarter'),
  MCPTools: Symbol.for('MCPTools'),
  MCPResources: Symbol.for('MCPResources'),
};

