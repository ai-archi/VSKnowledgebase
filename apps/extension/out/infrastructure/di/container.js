"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContainer = createContainer;
const inversify_1 = require("inversify");
const types_1 = require("./types");
// Core Services
const Logger_1 = require("../../core/logger/Logger");
const ConfigManager_1 = require("../../core/config/ConfigManager");
const EventBus_1 = require("../../core/eventbus/EventBus");
// Infrastructure Adapters
const ArtifactFileSystemAdapter_1 = require("../../infrastructure/storage/file/ArtifactFileSystemAdapter");
const VaultFileSystemAdapter_1 = require("../../infrastructure/storage/file/VaultFileSystemAdapter");
const DuckDbRuntimeIndex_1 = require("../../infrastructure/storage/duckdb/DuckDbRuntimeIndex");
const YamlMetadataRepository_1 = require("../../infrastructure/storage/yaml/YamlMetadataRepository");
const GitVaultAdapter_1 = require("../../modules/vault/infrastructure/GitVaultAdapter");
// Repositories
const ArtifactRepositoryImpl_1 = require("../../modules/shared/infrastructure/ArtifactRepositoryImpl");
const MetadataRepositoryImpl_1 = require("../../modules/shared/infrastructure/MetadataRepositoryImpl");
const VaultRepositoryImpl_1 = require("../../modules/shared/infrastructure/VaultRepositoryImpl");
// Application Services
const ArtifactFileSystemApplicationServiceImpl_1 = require("../../modules/shared/application/ArtifactFileSystemApplicationServiceImpl");
const VaultApplicationServiceImpl_1 = require("../../modules/shared/application/VaultApplicationServiceImpl");
const LookupApplicationServiceImpl_1 = require("../../modules/lookup/application/LookupApplicationServiceImpl");
const DocumentApplicationServiceImpl_1 = require("../../modules/document/application/DocumentApplicationServiceImpl");
const TaskApplicationServiceImpl_1 = require("../../modules/task/application/TaskApplicationServiceImpl");
// MCP
const MCPServerStarter_1 = require("../../modules/mcp/MCPServerStarter");
function createContainer(architoolRoot, dbPath) {
    const container = new inversify_1.Container();
    // Core Services
    container.bind(types_1.TYPES.Logger).toConstantValue(new Logger_1.Logger('ArchiTool'));
    container.bind(types_1.TYPES.ConfigManager).to(ConfigManager_1.ConfigManager).inSingletonScope();
    container.bind(types_1.TYPES.EventBus).to(EventBus_1.EventBus).inSingletonScope();
    // Infrastructure Adapters
    container.bind(types_1.TYPES.ArtifactFileSystemAdapter)
        .toConstantValue(new ArtifactFileSystemAdapter_1.ArtifactFileSystemAdapter(architoolRoot));
    container.bind(types_1.TYPES.VaultFileSystemAdapter)
        .toConstantValue(new VaultFileSystemAdapter_1.VaultFileSystemAdapter(architoolRoot));
    // DuckDbFactory is a static class, no binding needed
    container.bind(types_1.TYPES.DuckDbRuntimeIndex)
        .to(DuckDbRuntimeIndex_1.DuckDbRuntimeIndex).inSingletonScope();
    container.bind(types_1.TYPES.YamlMetadataRepository)
        .to(YamlMetadataRepository_1.YamlMetadataRepository).inSingletonScope();
    container.bind(types_1.TYPES.GitVaultAdapter)
        .to(GitVaultAdapter_1.GitVaultAdapterImpl).inSingletonScope();
    // Repositories
    container.bind(types_1.TYPES.ArtifactRepository)
        .to(ArtifactRepositoryImpl_1.ArtifactRepositoryImpl).inSingletonScope();
    container.bind(types_1.TYPES.MetadataRepository)
        .to(MetadataRepositoryImpl_1.MetadataRepositoryImpl).inSingletonScope();
    container.bind(types_1.TYPES.VaultRepository)
        .to(VaultRepositoryImpl_1.VaultRepositoryImpl).inSingletonScope();
    // Application Services
    container.bind(types_1.TYPES.ArtifactFileSystemApplicationService)
        .to(ArtifactFileSystemApplicationServiceImpl_1.ArtifactFileSystemApplicationServiceImpl).inSingletonScope();
    container.bind(types_1.TYPES.VaultApplicationService)
        .to(VaultApplicationServiceImpl_1.VaultApplicationServiceImpl).inSingletonScope();
    container.bind(types_1.TYPES.LookupApplicationService)
        .to(LookupApplicationServiceImpl_1.LookupApplicationServiceImpl).inSingletonScope();
    container.bind(types_1.TYPES.DocumentApplicationService)
        .to(DocumentApplicationServiceImpl_1.DocumentApplicationServiceImpl).inSingletonScope();
    container.bind(types_1.TYPES.TaskApplicationService)
        .to(TaskApplicationServiceImpl_1.TaskApplicationServiceImpl).inSingletonScope();
    // MCP
    container.bind(types_1.TYPES.MCPServerStarter)
        .to(MCPServerStarter_1.MCPServerStarter).inSingletonScope();
    return container;
}
//# sourceMappingURL=container.js.map