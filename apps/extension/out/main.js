"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
require("reflect-metadata");
const container_1 = require("./infrastructure/di/container");
const types_1 = require("./infrastructure/di/types");
const Logger_1 = require("./core/logger/Logger");
const NoteLookupProvider_1 = require("./modules/lookup/interface/NoteLookupProvider");
const Commands_1 = require("./modules/document/interface/Commands");
const DocumentTreeViewProvider_1 = require("./modules/document/interface/DocumentTreeViewProvider");
const Commands_2 = require("./modules/task/interface/Commands");
const TaskTreeDataProvider_1 = require("./modules/task/interface/TaskTreeDataProvider");
const ViewpointTreeDataProvider_1 = require("./modules/viewpoint/interface/ViewpointTreeDataProvider");
const Commands_3 = require("./modules/viewpoint/interface/Commands");
const TemplateTreeDataProvider_1 = require("./modules/template/interface/TemplateTreeDataProvider");
const Commands_4 = require("./modules/template/interface/Commands");
const Commands_5 = require("./modules/ai/interface/Commands");
const CommandAdapter_1 = require("./core/vscode-api/CommandAdapter");
const ArchitoolDirectoryManager_1 = require("./core/storage/ArchitoolDirectoryManager");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
async function activate(context) {
    // 1. 初始化 .architool 目录
    const architoolRoot = path.join(os.homedir(), '.architool');
    const architoolManager = new ArchitoolDirectoryManager_1.ArchitoolDirectoryManager(architoolRoot);
    await architoolManager.initialize();
    // 2. 初始化日志
    const logger = new Logger_1.Logger('ArchiTool');
    logger.info('ArchiTool extension activating...');
    // 3. 初始化 DuckDB
    const dbPath = path.join(architoolRoot, 'cache', 'runtime.db');
    const container = (0, container_1.createContainer)(architoolRoot, dbPath);
    const index = container.get(types_1.TYPES.DuckDbRuntimeIndex);
    try {
        await index.initialize();
        logger.info('DuckDB runtime index initialized');
    }
    catch (error) {
        logger.error('Failed to initialize DuckDB', error);
    }
    // 4. 获取服务
    const vaultService = container.get(types_1.TYPES.VaultApplicationService);
    const artifactService = container.get(types_1.TYPES.ArtifactFileSystemApplicationService);
    const lookupService = container.get(types_1.TYPES.LookupApplicationService);
    const documentService = container.get(types_1.TYPES.DocumentApplicationService);
    const taskService = container.get(types_1.TYPES.TaskApplicationService);
    const viewpointService = container.get(types_1.TYPES.ViewpointApplicationService);
    const templateService = container.get(types_1.TYPES.TemplateApplicationService);
    const aiService = container.get(types_1.TYPES.AIApplicationService);
    // 5. 创建命令适配器
    const commandAdapter = new CommandAdapter_1.CommandAdapter(context);
    // 6. 创建 Lookup Provider
    const lookupProvider = new NoteLookupProvider_1.NoteLookupProvider(lookupService, vaultService, logger);
    // 7. 初始化文档视图
    const documentTreeViewProvider = new DocumentTreeViewProvider_1.DocumentTreeViewProvider(documentService, vaultService, logger);
    vscode.window.createTreeView('architool.documentView', { treeDataProvider: documentTreeViewProvider });
    const documentCommands = new Commands_1.DocumentCommands(documentService, artifactService, vaultService, logger, context, documentTreeViewProvider);
    documentCommands.register(commandAdapter);
    // 8. 初始化任务视图
    const taskTreeDataProvider = new TaskTreeDataProvider_1.TaskTreeDataProvider(taskService, logger);
    vscode.window.createTreeView('architool.taskView', { treeDataProvider: taskTreeDataProvider });
    const taskCommands = new Commands_2.TaskCommands(taskService, logger, context, taskTreeDataProvider, vaultService);
    taskCommands.register(commandAdapter);
    // 9. 初始化视点视图
    const viewpointTreeDataProvider = new ViewpointTreeDataProvider_1.ViewpointTreeDataProvider(viewpointService, vaultService, logger);
    vscode.window.createTreeView('architool.viewpointView', { treeDataProvider: viewpointTreeDataProvider });
    const viewpointCommands = new Commands_3.ViewpointCommands(viewpointService, logger);
    viewpointCommands.registerCommands(context);
    // 10. 初始化模板视图
    const templateTreeDataProvider = new TemplateTreeDataProvider_1.TemplateTreeDataProvider(templateService, vaultService, logger);
    vscode.window.createTreeView('architool.templateView', { treeDataProvider: templateTreeDataProvider });
    const templateCommands = new Commands_4.TemplateCommands(templateService, vaultService, logger);
    templateCommands.registerCommands(context);
    // 11. 初始化 AI 服务命令
    const aiCommands = new Commands_5.AICommands(aiService, artifactService, vaultService, logger);
    aiCommands.registerCommands(context);
    // 12. 注册所有命令
    commandAdapter.registerCommands([
        // Lookup 命令
        {
            command: 'archi.lookup',
            callback: async () => {
                const result = await lookupProvider.show();
                if (result && result.create) {
                    // 创建新文档
                    const state = lookupProvider.stateManager.getState();
                    const documentName = state.documentName;
                    const documentType = state.documentType;
                    const selectedRefs = state.selectedDocuments.map(d => ({
                        id: d.id,
                        title: d.title,
                        path: d.path,
                        vaultName: d.vaultName
                    }));
                    if (documentName) {
                        const vaultsResult = await vaultService.listVaults();
                        if (vaultsResult.success && vaultsResult.value.length > 0) {
                            const writableVaults = vaultsResult.value.filter(v => !v.readOnly);
                            if (writableVaults.length > 0) {
                                const newArtifactResult = await lookupService.quickCreate({
                                    vaultId: writableVaults[0].id,
                                    viewType: documentType,
                                    title: documentName,
                                    content: `# ${documentName}\n\n` +
                                        (selectedRefs.length > 0 ? `## References\n\n` +
                                            selectedRefs.map(ref => `- [[${ref.title}|${ref.vaultName}/${ref.path}]]`).join('\n') : '')
                                });
                                if (newArtifactResult.success) {
                                    vscode.window.showInformationMessage(`Document created: ${documentName}`);
                                    const doc = await vscode.workspace.openTextDocument(newArtifactResult.value.contentLocation);
                                    await vscode.window.showTextDocument(doc);
                                }
                                else {
                                    vscode.window.showErrorMessage(`Failed to create document: ${newArtifactResult.error.message}`);
                                }
                            }
                            else {
                                vscode.window.showErrorMessage('No writable vaults available to create a document.');
                            }
                        }
                        else {
                            vscode.window.showErrorMessage('No vaults available. Please create a vault first.');
                        }
                    }
                    else {
                        vscode.window.showErrorMessage('Document name cannot be empty.');
                    }
                }
                else if (result && result.artifact) {
                    // 打开选中的 Artifact
                    const artifact = result.artifact;
                    const doc = await vscode.workspace.openTextDocument(artifact.contentLocation);
                    await vscode.window.showTextDocument(doc);
                }
            },
        },
        // Vault 命令
        {
            command: 'archi.vault.add',
            callback: async () => {
                const vaultName = await vscode.window.showInputBox({ prompt: 'Enter vault name' });
                if (!vaultName)
                    return;
                const vaultPath = await vscode.window.showInputBox({ prompt: 'Enter vault path (absolute path)' });
                if (!vaultPath)
                    return;
                const result = await vaultService.addLocalVault({
                    name: vaultName,
                    fsPath: vaultPath,
                    description: '',
                });
                if (result.success) {
                    vscode.window.showInformationMessage(`Vault '${vaultName}' added.`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to add vault: ${result.error.message}`);
                }
            },
        },
        {
            command: 'archi.vault.addFromGit',
            callback: async () => {
                const remoteUrl = await vscode.window.showInputBox({ prompt: 'Enter Git repository URL' });
                if (!remoteUrl)
                    return;
                const vaultName = await vscode.window.showInputBox({ prompt: 'Enter vault name' });
                if (!vaultName)
                    return;
                const remote = {
                    url: remoteUrl,
                    branch: 'main',
                };
                const result = await vaultService.addVaultFromGit({
                    name: vaultName,
                    remote,
                    description: '',
                });
                if (result.success) {
                    vscode.window.showInformationMessage(`Vault '${vaultName}' added from Git.`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to add vault from Git: ${result.error.message}`);
                }
            },
        },
        {
            command: 'archi.vault.list',
            callback: async () => {
                const result = await vaultService.listVaults();
                if (result.success) {
                    const vaultList = result.value.map(v => `- ${v.name} (${v.readOnly ? 'read-only' : 'writable'})`).join('\n');
                    vscode.window.showInformationMessage(`Vaults:\n${vaultList}`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to list vaults: ${result.error.message}`);
                }
            },
        },
        {
            command: 'archi.vault.fork',
            callback: async () => {
                const vaultsResult = await vaultService.listVaults();
                if (!vaultsResult.success || vaultsResult.value.length === 0) {
                    vscode.window.showErrorMessage('No vaults available.');
                    return;
                }
                // Filter to only Git vaults (read-only)
                const gitVaults = vaultsResult.value.filter(v => v.readOnly && v.remote);
                if (gitVaults.length === 0) {
                    vscode.window.showErrorMessage('No Git vaults available to fork.');
                    return;
                }
                const vaultItems = gitVaults.map(v => ({
                    label: v.name,
                    description: v.description || `Git vault: ${v.remote?.url}`,
                    id: v.id,
                }));
                const selectedVault = await vscode.window.showQuickPick(vaultItems, {
                    placeHolder: 'Select a Git vault to fork',
                });
                if (!selectedVault)
                    return;
                const newVaultName = await vscode.window.showInputBox({
                    prompt: 'Enter name for the new local vault',
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return 'Vault name cannot be empty';
                        }
                        // Check if vault name already exists
                        const existing = vaultsResult.value.find(v => v.name === value.trim());
                        if (existing) {
                            return 'Vault name already exists';
                        }
                        return null;
                    },
                });
                if (!newVaultName)
                    return;
                const result = await vaultService.forkGitVault(selectedVault.id, newVaultName.trim());
                if (result.success) {
                    vscode.window.showInformationMessage(`Vault '${newVaultName}' forked from '${selectedVault.label}'.`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to fork vault: ${result.error.message}`);
                }
            },
        },
        {
            command: 'archi.vault.sync',
            callback: async () => {
                const vaultsResult = await vaultService.listVaults();
                if (!vaultsResult.success || vaultsResult.value.length === 0) {
                    vscode.window.showErrorMessage('No vaults available.');
                    return;
                }
                // Filter to only Git vaults
                const gitVaults = vaultsResult.value.filter(v => v.readOnly && v.remote);
                if (gitVaults.length === 0) {
                    vscode.window.showErrorMessage('No Git vaults available to sync.');
                    return;
                }
                const vaultItems = gitVaults.map(v => ({
                    label: v.name,
                    description: v.description || `Git vault: ${v.remote?.url}`,
                    id: v.id,
                }));
                const selectedVault = await vscode.window.showQuickPick(vaultItems, {
                    placeHolder: 'Select a Git vault to sync',
                });
                if (!selectedVault)
                    return;
                vscode.window.showInformationMessage(`Syncing vault '${selectedVault.label}'...`);
                const result = await vaultService.syncVault(selectedVault.id);
                if (result.success) {
                    vscode.window.showInformationMessage(`Vault '${selectedVault.label}' synced successfully.`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to sync vault: ${result.error.message}`);
                }
            },
        },
        {
            command: 'archi.vault.remove',
            callback: async () => {
                const vaultsResult = await vaultService.listVaults();
                if (!vaultsResult.success || vaultsResult.value.length === 0) {
                    vscode.window.showErrorMessage('No vaults available.');
                    return;
                }
                const vaultItems = vaultsResult.value.map(v => ({
                    label: v.name,
                    description: v.description || (v.readOnly ? 'Git vault' : 'Local vault'),
                    id: v.id,
                }));
                const selectedVault = await vscode.window.showQuickPick(vaultItems, {
                    placeHolder: 'Select a vault to remove',
                });
                if (!selectedVault)
                    return;
                const confirm = await vscode.window.showWarningMessage(`Are you sure you want to remove vault '${selectedVault.label}'?`, { modal: true }, 'Yes', 'No');
                if (confirm !== 'Yes')
                    return;
                const deleteFiles = await vscode.window.showQuickPick(['Yes', 'No'], {
                    placeHolder: 'Delete vault files from disk?',
                });
                const result = await vaultService.removeVault(selectedVault.id);
                if (result.success) {
                    if (deleteFiles === 'Yes') {
                        // TODO: Implement file deletion
                        vscode.window.showInformationMessage(`Vault '${selectedVault.label}' removed. Files deletion not yet implemented.`);
                    }
                    else {
                        vscode.window.showInformationMessage(`Vault '${selectedVault.label}' removed from configuration.`);
                    }
                }
                else {
                    vscode.window.showErrorMessage(`Failed to remove vault: ${result.error.message}`);
                }
            },
        },
        {
            command: 'archi.artifact.list',
            callback: async () => {
                const vaultsResult = await vaultService.listVaults();
                if (!vaultsResult.success || vaultsResult.value.length === 0) {
                    vscode.window.showErrorMessage('No vaults available.');
                    return;
                }
                const vaultItems = vaultsResult.value.map(v => ({
                    label: v.name,
                    description: v.description,
                    id: v.id,
                }));
                const selectedVault = await vscode.window.showQuickPick(vaultItems, {
                    placeHolder: 'Select a vault',
                });
                if (!selectedVault)
                    return;
                const result = await artifactService.listArtifacts(selectedVault.id);
                if (result.success) {
                    const artifactList = result.value.map(a => `- ${a.title} (${a.path})`).join('\n');
                    vscode.window.showInformationMessage(`Artifacts in '${selectedVault.label}':\n${artifactList}`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to list artifacts: ${result.error.message}`);
                }
            },
        },
    ]);
    // 10. 启动 MCP Server（可选）
    try {
        const mcpStarter = container.get(types_1.TYPES.MCPServerStarter);
        await mcpStarter.start();
        logger.info('MCP Server started');
    }
    catch (error) {
        logger.warn('Failed to start MCP Server', error);
    }
    logger.info('ArchiTool extension initialized');
}
function deactivate() {
    // Cleanup if needed
}
//# sourceMappingURL=main.js.map