import * as vscode from 'vscode';
import 'reflect-metadata';
import { createContainer } from './infrastructure/di/container';
import { TYPES } from './infrastructure/di/types';
import { Logger } from './core/logger/Logger';
import { VaultApplicationService } from './modules/shared/application/VaultApplicationService';
import { ArtifactFileSystemApplicationService } from './modules/shared/application/ArtifactFileSystemApplicationService';
import { LookupApplicationService } from './modules/lookup/application/LookupApplicationService';
import { DocumentApplicationService } from './modules/document/application/DocumentApplicationService';
import { TaskApplicationService } from './modules/task/application/TaskApplicationService';
import { NoteLookupProvider } from './modules/lookup/interface/NoteLookupProvider';
import { DocumentCommands } from './modules/document/interface/Commands';
import { DocumentTreeViewProvider } from './modules/document/interface/DocumentTreeViewProvider';
import { TaskCommands } from './modules/task/interface/Commands';
import { TaskTreeDataProvider } from './modules/task/interface/TaskTreeDataProvider';
import { DuckDbRuntimeIndex } from './infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { MCPServerStarter } from './modules/mcp/MCPServerStarter';
import { CommandAdapter } from './core/vscode-api/CommandAdapter';
import { ArchitoolDirectoryManager } from './core/storage/ArchitoolDirectoryManager';
import { RemoteEndpoint } from './domain/shared/vault/RemoteEndpoint';
import * as path from 'path';
import * as os from 'os';

export async function activate(context: vscode.ExtensionContext) {
  // 1. 初始化 .architool 目录
  const architoolRoot = path.join(os.homedir(), '.architool');
  const architoolManager = new ArchitoolDirectoryManager(architoolRoot);
  await architoolManager.initialize();

  // 2. 初始化日志
  const logger = new Logger('ArchiTool');
  logger.info('ArchiTool extension activating...');

  // 3. 初始化 DuckDB
  const dbPath = path.join(architoolRoot, 'cache', 'runtime.db');
  const container = createContainer(architoolRoot, dbPath);
  const index = container.get<DuckDbRuntimeIndex>(TYPES.DuckDbRuntimeIndex);
  
  try {
    await index.initialize();
    logger.info('DuckDB runtime index initialized');
  } catch (error: any) {
    logger.error('Failed to initialize DuckDB', error);
  }

  // 4. 获取服务
  const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
  const artifactService = container.get<ArtifactFileSystemApplicationService>(TYPES.ArtifactFileSystemApplicationService);
  const lookupService = container.get<LookupApplicationService>(TYPES.LookupApplicationService);
  const documentService = container.get<DocumentApplicationService>(TYPES.DocumentApplicationService);
  const taskService = container.get<TaskApplicationService>(TYPES.TaskApplicationService);

  // 5. 创建命令适配器
  const commandAdapter = new CommandAdapter(context);

  // 6. 创建 Lookup Provider
  const lookupProvider = new NoteLookupProvider(lookupService, vaultService, logger);

  // 7. 初始化文档视图
  const documentTreeViewProvider = new DocumentTreeViewProvider(documentService, vaultService, logger);
  vscode.window.createTreeView('architool.documentView', { treeDataProvider: documentTreeViewProvider });
  const documentCommands = new DocumentCommands(documentService, artifactService, vaultService, logger, context, documentTreeViewProvider);
  documentCommands.register(commandAdapter);

  // 8. 初始化任务视图
  const taskTreeDataProvider = new TaskTreeDataProvider(taskService, logger);
  vscode.window.createTreeView('architool.taskView', { treeDataProvider: taskTreeDataProvider });
  const taskCommands = new TaskCommands(taskService, logger, context, taskTreeDataProvider, vaultService);
  taskCommands.register(commandAdapter);

  // 9. 注册所有命令
  commandAdapter.registerCommands([
    // Lookup 命令
    {
      command: 'archi.lookup',
      callback: async () => {
        const result = await lookupProvider.show();
        if (result && (result as any).create) {
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
                } else {
                  vscode.window.showErrorMessage(`Failed to create document: ${newArtifactResult.error.message}`);
                }
              } else {
                vscode.window.showErrorMessage('No writable vaults available to create a document.');
              }
            } else {
              vscode.window.showErrorMessage('No vaults available. Please create a vault first.');
            }
          } else {
            vscode.window.showErrorMessage('Document name cannot be empty.');
          }
        } else if (result && (result as any).artifact) {
          // 打开选中的 Artifact
          const artifact = (result as any).artifact;
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
        if (!vaultName) return;

        const vaultPath = await vscode.window.showInputBox({ prompt: 'Enter vault path (absolute path)' });
        if (!vaultPath) return;

        const result = await vaultService.addLocalVault({
          name: vaultName,
          fsPath: vaultPath,
          description: '',
        });

        if (result.success) {
          vscode.window.showInformationMessage(`Vault '${vaultName}' added.`);
        } else {
          vscode.window.showErrorMessage(`Failed to add vault: ${result.error.message}`);
        }
      },
    },
    {
      command: 'archi.vault.addFromGit',
      callback: async () => {
        const remoteUrl = await vscode.window.showInputBox({ prompt: 'Enter Git repository URL' });
        if (!remoteUrl) return;

        const vaultName = await vscode.window.showInputBox({ prompt: 'Enter vault name' });
        if (!vaultName) return;

        const remote: RemoteEndpoint = {
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
        } else {
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
        } else {
          vscode.window.showErrorMessage(`Failed to list vaults: ${result.error.message}`);
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

        if (!selectedVault) return;

        const result = await artifactService.listArtifacts(selectedVault.id);
        if (result.success) {
          const artifactList = result.value.map(a => `- ${a.title} (${a.path})`).join('\n');
          vscode.window.showInformationMessage(`Artifacts in '${selectedVault.label}':\n${artifactList}`);
        } else {
          vscode.window.showErrorMessage(`Failed to list artifacts: ${result.error.message}`);
        }
      },
    },
  ]);

  // 10. 启动 MCP Server（可选）
  try {
    const mcpStarter = container.get<MCPServerStarter>(TYPES.MCPServerStarter);
    await mcpStarter.start();
    logger.info('MCP Server started');
  } catch (error: any) {
    logger.warn('Failed to start MCP Server', error);
  }

  logger.info('ArchiTool extension initialized');
}

export function deactivate() {
  // Cleanup if needed
}

