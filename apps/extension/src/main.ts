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
import { ViewpointApplicationService } from './modules/viewpoint/application/ViewpointApplicationService';
import { ViewpointTreeDataProvider } from './modules/viewpoint/interface/ViewpointTreeDataProvider';
import { ViewpointCommands } from './modules/viewpoint/interface/Commands';
import { TemplateApplicationService } from './modules/template/application/TemplateApplicationService';
import { TemplateTreeDataProvider } from './modules/template/interface/TemplateTreeDataProvider';
import { TemplateCommands } from './modules/template/interface/Commands';
import { AIApplicationService } from './modules/ai/application/AIApplicationService';
import { AICommands } from './modules/ai/interface/Commands';
import { SqliteRuntimeIndex } from './modules/shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { MCPServerStarter } from './modules/mcp/MCPServerStarter';
import { CommandAdapter } from './core/vscode-api/CommandAdapter';
import { WebviewRPC } from './core/vscode-api/WebviewRPC';
import { ArchitoolDirectoryManager } from './core/storage/ArchitoolDirectoryManager';
import { RemoteEndpoint } from './modules/shared/domain/RemoteEndpoint';
import { GitVaultAdapter } from './modules/shared/infrastructure/storage/git/GitVaultAdapter';
import { ArchimateEditorProvider } from './modules/editor/archimate/ArchimateEditorProvider';
import { MermaidEditorProvider } from './modules/editor/mermaid/MermaidEditorProvider';
import * as path from 'path';
import * as os from 'os';

export async function activate(context: vscode.ExtensionContext) {
  // 1. 初始化日志（需要在创建 ArchitoolDirectoryManager 之前）
  const logger = new Logger('ArchiTool');
  logger.info('ArchiTool extension activating...');

  // 2. 初始化 .architool 目录（在工作区根目录下）
  // 获取当前工作区路径
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  let workspaceRoot: string;
  let architoolRoot: string;
  
  if (!workspaceFolder) {
    // 如果没有打开工作区，使用用户主目录作为后备
    workspaceRoot = os.homedir();
    architoolRoot = path.join(workspaceRoot, '.architool');
    logger.warn('No workspace folder found, using home directory as fallback');
  } else {
    workspaceRoot = workspaceFolder.uri.fsPath;
    architoolRoot = path.join(workspaceRoot, '.architool');
  }
  
  const architoolManager = new ArchitoolDirectoryManager(architoolRoot, logger);
  await architoolManager.initialize();

  // 2.1. 如果 .architool 目录没有 vault，则初始化 demo-vault
  // 获取扩展根目录（通常是项目根目录，demo-vault 在项目根目录下）
  // 注意：在开发环境中，context.extensionPath 指向 apps/extension
  // 我们需要找到项目根目录（包含 demo-vault 的目录）
  const extensionPath = context.extensionPath;
  // 从 apps/extension 向上两级到项目根目录
  const projectRoot = path.resolve(extensionPath, '..', '..');
  const demoVaultSourcePath = path.join(projectRoot, 'demo-vault');
  
  logger.info(`Workspace root: ${workspaceRoot}`);
  logger.info(`Architool root: ${architoolRoot}`);
  logger.info(`Extension path: ${extensionPath}`);
  logger.info(`Project root: ${projectRoot}`);
  logger.info(`Demo vault source path: ${demoVaultSourcePath}`);
  logger.info(`Demo vault source exists: ${require('fs').existsSync(demoVaultSourcePath)}`);
  
  try {
    await architoolManager.initializeDemoVaultIfEmpty(demoVaultSourcePath);
    logger.info('Demo vault initialization completed');
  } catch (error: any) {
    // 如果复制失败，记录错误但不阻止激活
    logger.error('Failed to initialize demo-vault:', error);
  }

  // 3. 初始化 SQLite
  const dbPath = path.join(architoolRoot, 'cache', 'runtime.sqlite');
  const container = createContainer(architoolRoot, dbPath);
  const index = container.get<SqliteRuntimeIndex>(TYPES.SqliteRuntimeIndex);
  
  try {
    await index.initialize();
    logger.info('SQLite runtime index initialized');
  } catch (error: any) {
    logger.error('Failed to initialize SQLite', error);
  }

  // 4. 获取服务
  const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
  const artifactService = container.get<ArtifactFileSystemApplicationService>(TYPES.ArtifactFileSystemApplicationService);
  const lookupService = container.get<LookupApplicationService>(TYPES.LookupApplicationService);
  const documentService = container.get<DocumentApplicationService>(TYPES.DocumentApplicationService);
  const taskService = container.get<TaskApplicationService>(TYPES.TaskApplicationService);
  const viewpointService = container.get<ViewpointApplicationService>(TYPES.ViewpointApplicationService);
  const templateService = container.get<TemplateApplicationService>(TYPES.TemplateApplicationService);
  const aiService = container.get<AIApplicationService>(TYPES.AIApplicationService);
  const configManager = container.get<import('./core/config/ConfigManager').ConfigManager>(TYPES.ConfigManager);

  // 5. 创建命令适配器
  const commandAdapter = new CommandAdapter(context);

  // 6. 创建 Lookup Provider
  const lookupProvider = new NoteLookupProvider(lookupService, vaultService, logger);

  // 7. 初始化文档视图
  const documentTreeService = container.get<import('./modules/shared/application/ArtifactTreeApplicationService').ArtifactTreeApplicationService>(TYPES.ArtifactTreeApplicationService);
  const documentTreeViewProvider = new DocumentTreeViewProvider(documentService, vaultService, documentTreeService, logger);
  const documentTreeView = vscode.window.createTreeView('architool.documentView', { treeDataProvider: documentTreeViewProvider });
  const webviewRPC = new WebviewRPC(
    logger,
    vaultService,
    documentService,
    templateService,
    artifactService
  );
  const documentCommands = new DocumentCommands(documentService, artifactService, vaultService, logger, context, documentTreeViewProvider, documentTreeView, webviewRPC.getAdapter());
  documentCommands.register(commandAdapter);

  // 8. 初始化任务视图
  const taskTreeDataProvider = new TaskTreeDataProvider(taskService, vaultService, logger);
  vscode.window.createTreeView('architool.taskView', { treeDataProvider: taskTreeDataProvider });
  const taskCommands = new TaskCommands(taskService, logger, context, taskTreeDataProvider, vaultService);
  taskCommands.register(commandAdapter);

  // 9. 初始化视点视图
  const viewpointTreeDataProvider = new ViewpointTreeDataProvider(
    viewpointService,
    vaultService,
    configManager,
    logger
  );
  vscode.window.createTreeView('architool.viewpointView', { treeDataProvider: viewpointTreeDataProvider });
  const viewpointCommands = new ViewpointCommands(viewpointService, vaultService, logger);
  viewpointCommands.registerCommands(context);

  // 10. 初始化模板视图
  const vaultAdapter = container.get<import('./modules/shared/infrastructure/storage/file/VaultFileSystemAdapter').VaultFileSystemAdapter>(TYPES.VaultFileSystemAdapter);
  const treeService = container.get<import('./modules/shared/application/ArtifactTreeApplicationService').ArtifactTreeApplicationService>(TYPES.ArtifactTreeApplicationService);
  const templateTreeDataProvider = new TemplateTreeDataProvider(vaultService, treeService, vaultAdapter, logger);
  vscode.window.createTreeView('architool.templateView', { treeDataProvider: templateTreeDataProvider });
  const templateCommands = new TemplateCommands(templateService, vaultService, logger);
  templateCommands.registerCommands(context);

  // 11. 初始化 AI 服务命令
  const changeRepository = container.get<import('./modules/shared/infrastructure/ChangeRepository').ChangeRepository>(TYPES.ChangeRepository);
  const aiCommands = new AICommands(aiService, artifactService, vaultService, viewpointService, changeRepository, logger);
  aiCommands.registerCommands(context);

  // 12. 注册自定义编辑器
  const archimateEditorDisposable = ArchimateEditorProvider.register(context);
  context.subscriptions.push(archimateEditorDisposable);
  logger.info('ArchiMate editor provider registered');

  const mermaidEditorDisposable = MermaidEditorProvider.register(context);
  context.subscriptions.push(mermaidEditorDisposable);
  logger.info('Mermaid editor provider registered');

  // 13. Webview RPC 服务已在步骤 7 中初始化
  logger.info('Webview RPC service initialized');

  // 14. 注册所有命令
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
        // 获取当前工作区路径
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('Please open a workspace first.');
          return;
        }

        const vaultName = await vscode.window.showInputBox({ 
          prompt: 'Enter vault name',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Vault name cannot be empty';
            }
            // 检查名称是否包含非法字符
            if (/[<>:"/\\|?*]/.test(value)) {
              return 'Vault name contains invalid characters';
            }
            return null;
          }
        });
        if (!vaultName) return;

        // 自动使用 <workspace>/.architool/{vaultName} 作为路径
        const workspaceRoot = workspaceFolder.uri.fsPath;
        const vaultPath = path.join(workspaceRoot, '.architool', vaultName);

        const result = await vaultService.addLocalVault({
          name: vaultName,
          fsPath: vaultPath,
          description: '',
        });

        if (result.success) {
          vscode.window.showInformationMessage(`Vault '${vaultName}' added at ${vaultPath}`);
          // 刷新所有视图
          documentTreeViewProvider.refresh();
          taskTreeDataProvider.refresh();
          viewpointTreeDataProvider.refresh();
          templateTreeDataProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to add vault: ${result.error.message}`);
        }
      },
    },
    {
      command: 'archi.vault.addFromGit',
      callback: async () => {
        // 获取当前工作区路径
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage('Please open a workspace first.');
          return;
        }

        const remoteUrl = await vscode.window.showInputBox({ 
          prompt: 'Enter Git repository URL',
          validateInput: (value) => {
            if (!value || value.trim().length === 0) {
              return 'Git repository URL cannot be empty';
            }
            // 简单的 URL 验证
            if (!/^https?:\/\/.+/.test(value) && !/^git@.+/.test(value)) {
              return 'Please enter a valid Git repository URL';
            }
            return null;
          }
        });
        if (!remoteUrl) return;

        // 从 Git URL 中提取仓库名称
        const extractRepoName = (url: string): string => {
          // 移除 .git 后缀
          let repoName = url.replace(/\.git$/, '');
          
          // 处理 HTTPS/HTTP URL: https://github.com/user/repo
          if (repoName.includes('://')) {
            const parts = repoName.split('/');
            repoName = parts[parts.length - 1];
          }
          // 处理 SSH URL: git@github.com:user/repo
          else if (repoName.includes('@') && repoName.includes(':')) {
            const parts = repoName.split(':');
            const lastPart = parts[parts.length - 1];
            const nameParts = lastPart.split('/');
            repoName = nameParts[nameParts.length - 1];
          }
          
          return repoName;
        };

        const vaultName = extractRepoName(remoteUrl.trim());
        
        if (!vaultName || vaultName.length === 0) {
          vscode.window.showErrorMessage('Failed to extract repository name from URL');
          return;
        }

        // 获取远程分支列表
        const gitAdapter = container.get<GitVaultAdapter>(TYPES.GitVaultAdapter);
        const branchesResult = await gitAdapter.listRemoteBranches(remoteUrl.trim());
        
        let branchOptions: vscode.QuickPickItem[] = [];
        if (branchesResult.success && branchesResult.value.length > 0) {
          branchOptions = branchesResult.value.map((branchName: string) => ({
            label: branchName,
            description: branchName === 'main' || branchName === 'master' ? 'Default branch' : undefined,
          }));
        } else {
          // 如果获取失败，提供默认选项
          branchOptions = [
            { label: 'main', description: 'Default branch' },
            { label: 'master', description: 'Default branch' },
            { label: 'develop', description: 'Development branch' },
          ];
        }

        // 使用下拉框选择分支，支持搜索
        const selectedBranch = await vscode.window.showQuickPick(branchOptions, {
          placeHolder: 'Select a branch',
          canPickMany: false,
          ignoreFocusOut: false,
        });
        
        if (!selectedBranch) return; // 用户取消了选择
        
        const branch = selectedBranch.label;

        const remote: RemoteEndpoint = {
          url: remoteUrl.trim(),
          branch: branch || 'main',
          sync: 'manual',
        };

        // 显示进度提示
        vscode.window.showInformationMessage(`Cloning vault '${vaultName}' from Git...`);

        const result = await vaultService.addVaultFromGit({
          name: vaultName,
          remote,
          description: '',
        });

        if (result.success) {
          const workspaceRoot = workspaceFolder.uri.fsPath;
          const vaultPath = path.join(workspaceRoot, '.architool', vaultName);
          vscode.window.showInformationMessage(`Vault '${vaultName}' cloned from Git to ${vaultPath}`);
          // 刷新所有视图
          documentTreeViewProvider.refresh();
          taskTreeDataProvider.refresh();
          viewpointTreeDataProvider.refresh();
          templateTreeDataProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to clone vault from Git: ${result.error.message}`);
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

        if (!selectedVault) return;

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

        if (!newVaultName) return;

        const result = await vaultService.forkGitVault(selectedVault.id, newVaultName.trim());
        if (result.success) {
          vscode.window.showInformationMessage(`Vault '${newVaultName}' forked from '${selectedVault.label}'.`);
        } else {
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

        if (!selectedVault) return;

        vscode.window.showInformationMessage(`Syncing vault '${selectedVault.label}'...`);
        const result = await vaultService.syncVault(selectedVault.id);
        if (result.success) {
          vscode.window.showInformationMessage(`Vault '${selectedVault.label}' synced successfully.`);
        } else {
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

        if (!selectedVault) return;

        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to remove vault '${selectedVault.label}'?`,
          { modal: true },
          'Yes',
          'No'
        );

        if (confirm !== 'Yes') return;

        const deleteFiles = await vscode.window.showQuickPick(
          ['Yes', 'No'],
          {
            placeHolder: 'Delete vault files from disk?',
          }
        );

        const result = await vaultService.removeVault(selectedVault.id, {
          deleteFiles: deleteFiles === 'Yes',
        });
        if (result.success) {
          if (deleteFiles === 'Yes') {
            vscode.window.showInformationMessage(`Vault '${selectedVault.label}' and its files have been removed.`);
          } else {
            vscode.window.showInformationMessage(`Vault '${selectedVault.label}' removed from configuration.`);
          }
        } else {
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

