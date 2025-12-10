import * as vscode from 'vscode';
import 'reflect-metadata';
import { createContainer } from './infrastructure/di/container';
import { TYPES } from './infrastructure/di/types';
import { Logger } from './core/logger/Logger';
import { VaultApplicationService } from './modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from './modules/shared/application/ArtifactApplicationService';
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
import { AssistantsTreeDataProvider } from './modules/assistants/interface/AssistantsTreeDataProvider';
import { AssistantsCommands } from './modules/assistants/interface/Commands';
import { AIApplicationService } from './modules/ai/application/AIApplicationService';
import { AICommands } from './modules/ai/interface/Commands';
import { SqliteRuntimeIndex } from './modules/shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { MCPServerStarter } from './modules/mcp/MCPServerStarter';
import { CommandAdapter } from './core/vscode-api/CommandAdapter';
import { WebviewRPC } from './core/vscode-api/WebviewRPC';
import { ArchitoolDirectoryManager } from './core/storage/ArchitoolDirectoryManager';
import { RemoteEndpoint } from './modules/shared/domain/value_object/RemoteEndpoint';
import { GitVaultAdapter } from './modules/shared/infrastructure/storage/git/GitVaultAdapter';
import { MermaidEditorProvider } from './modules/editor/mermaid/MermaidEditorProvider';
import { PlantUMLEditorProvider } from './modules/editor/plantuml/PlantUMLEditorProvider';
import { MCPIPCServer } from './modules/mcp/MCPIPCServer';
import { MCPWindowActivationMonitor } from './modules/mcp/MCPWindowActivationMonitor';
import { calculateWorkspaceHash } from './modules/mcp/utils';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

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

  // 2.1. 如果 .architool 目录没有 vault，则初始化 demo-vaults
  // 获取扩展根目录
  // 注意：
  // - 在开发环境中，context.extensionPath 指向 apps/extension，demo-vaults 在项目根目录
  // - 在打包后的扩展中，context.extensionPath 指向扩展安装目录，demo-vaults 在 dist/demo-vaults 或 demo-vaults 目录下
  const extensionPath = context.extensionPath;
  
  // 优先从 dist/demo-vaults 查找（打包后的扩展，新位置）
  let demoVaultsSourcePath = path.join(extensionPath, 'dist', 'demo-vaults');
  
  // 如果 dist/demo-vaults 不存在，尝试从 demo-vaults 查找（向后兼容）
  if (!require('fs').existsSync(demoVaultsSourcePath)) {
    demoVaultsSourcePath = path.join(extensionPath, 'demo-vaults');
  }
  
  // 如果扩展目录下都不存在，尝试从项目根目录查找（开发环境）
  if (!require('fs').existsSync(demoVaultsSourcePath)) {
    const projectRoot = path.resolve(extensionPath, '..', '..');
    demoVaultsSourcePath = path.join(projectRoot, 'demo-vaults');
  }
  
  logger.info(`Workspace root: ${workspaceRoot}`);
  logger.info(`Architool root: ${architoolRoot}`);
  logger.info(`Extension path: ${extensionPath}`);
  logger.info(`Demo vaults source path: ${demoVaultsSourcePath}`);
  logger.info(`Demo vaults source exists: ${require('fs').existsSync(demoVaultsSourcePath)}`);
  
  try {
    await architoolManager.initializeDemoVaultsIfEmpty(demoVaultsSourcePath);
    logger.info('Demo vaults initialization completed');
  } catch (error: any) {
    // 如果复制失败，记录错误但不阻止激活
    logger.error('Failed to initialize demo-vaults:', error);
  }

  // 2.2. 复制 MCP Server 到固定位置
  // 只在打包后的扩展中复制（开发环境不需要）
  // 获取 MCP Server 源路径（从扩展安装目录）
  const mcpServerSourcePath = path.join(extensionPath, 'dist', 'mcp-server', 'mcp-server.js');
  
  // 只在源文件存在时复制（打包后的扩展）
  if (require('fs').existsSync(mcpServerSourcePath)) {
  try {
    await architoolManager.copyMCPServer(mcpServerSourcePath);
    logger.info('MCP Server copied to fixed location');
  } catch (error: any) {
    // 如果复制失败，记录错误但不阻止激活
    logger.warn('Failed to copy MCP Server:', error);
    }
  } else {
    logger.debug('MCP Server source not found (development mode, skipping copy)');
  }

  // 3. 初始化 SQLite
  const dbPath = path.join(architoolRoot, 'cache', 'runtime.sqlite');
  const container = createContainer(architoolRoot, dbPath, context);
  const index = container.get<SqliteRuntimeIndex>(TYPES.SqliteRuntimeIndex);
  
  try {
    await index.initialize();
    logger.info('SQLite runtime index initialized');
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes('bindings') || errorMessage.includes('better_sqlite3.node') || errorMessage.includes('NODE_MODULE_VERSION')) {
      const nodeVersion = process.versions.node;
      const electronVersion = (process.versions as any).electron || 'unknown';
      const moduleVersion = process.versions.modules;
      logger.error(
        `Failed to initialize SQLite: Native bindings version mismatch. ` +
        `Extension runtime: Node.js ${nodeVersion} (NODE_MODULE_VERSION ${moduleVersion}), Electron ${electronVersion}. ` +
        `The better-sqlite3 module was compiled for a different Node.js version. ` +
        `Some features requiring full-text search may not be available. ` +
        `To fix this, run: cd apps/extension && pnpm run rebuild:electron`,
        error
      );
    } else {
      logger.error('Failed to initialize SQLite', error);
    }
  }

  // 4. 获取服务
  const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
  const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
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
  const documentTreeService = artifactService;
  const fileTreeDomainService = container.get<import('./modules/shared/domain/services/FileTreeDomainService').FileTreeDomainService>(TYPES.FileTreeDomainService);
  const fileOperationDomainService = container.get<import('./modules/shared/domain/services/FileOperationDomainService').FileOperationDomainService>(TYPES.FileOperationDomainService);
  const documentTreeViewProvider = new DocumentTreeViewProvider(vaultService, documentTreeService, logger);
  const documentTreeView = vscode.window.createTreeView('architool.documentView', { treeDataProvider: documentTreeViewProvider });
  const codeFileService = container.get<import('./modules/shared/application/CodeFileSystemApplicationService').CodeFileSystemApplicationService>(TYPES.CodeFileSystemApplicationService);
  const aiCommandService = container.get<import('./modules/shared/application/AICommandApplicationService').AICommandApplicationService>(TYPES.AICommandApplicationService);
  const webviewRPC = new WebviewRPC(
    logger,
    vaultService,
    documentService,
    templateService,
    artifactService,
    codeFileService,
    aiCommandService
  );
  const eventBus = container.get<import('./core/eventbus/EventBus').EventBus>(TYPES.EventBus);
  const documentCommands = new DocumentCommands(
    documentService,
    artifactService,
    vaultService,
    fileTreeDomainService,
    fileOperationDomainService,
    logger,
    context,
    documentTreeViewProvider,
    documentTreeView,
    webviewRPC.getAdapter(),
    eventBus
  );
  documentCommands.register(commandAdapter);

  // 8. 初始化视点视图（使用 WebviewView，直接在 panel 中显示）
  const viewpointCommands = new ViewpointCommands(
    viewpointService,
    vaultService,
    artifactService,
    taskService,
    aiService,
    logger,
    context,
    webviewRPC.getAdapter()
  );
  viewpointCommands.registerCommands(context);

  // 10. 初始化助手视图（包含templates和ai-enhancements）
  const assistantsTreeDataProvider = new AssistantsTreeDataProvider(vaultService, artifactService, logger);
  const assistantsTreeView = vscode.window.createTreeView('architool.assistantsView', { treeDataProvider: assistantsTreeDataProvider });
  const assistantsCommands = new AssistantsCommands(
    templateService,
    artifactService,
    vaultService,
    fileTreeDomainService,
    fileOperationDomainService,
    logger,
    context,
    assistantsTreeDataProvider,
    assistantsTreeView,
    webviewRPC.getAdapter()
  );
  assistantsCommands.register(commandAdapter);

  // 11. 初始化 AI 服务命令
  const changeRepository = container.get<import('./modules/shared/infrastructure/ChangeRepository').ChangeRepository>(TYPES.ChangeRepository);
  const aiCommands = new AICommands(aiService, artifactService, vaultService, viewpointService, changeRepository, logger);
  aiCommands.registerCommands(context);

  // 12. 注册自定义编辑器
  const mermaidEditorDisposable = MermaidEditorProvider.register(context);
  context.subscriptions.push(mermaidEditorDisposable);
  logger.info('Mermaid editor provider registered');

  const plantumlEditorDisposable = PlantUMLEditorProvider.register(context);
  context.subscriptions.push(plantumlEditorDisposable);
  logger.info('PlantUML editor provider registered');

  // 13. Webview RPC 服务已在步骤 7 中初始化
  logger.info('Webview RPC service initialized');

  // 14. 注册所有命令
  try {
    logger.info('Registering commands...');
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
              // 新结构：所有 vault 在本地都是可写的
              const writableVaults = vaultsResult.value;
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
          assistantsTreeDataProvider.refresh();
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

        // 从 Git URL 中提取仓库名称（移除认证信息）
        const extractRepoName = (url: string): string => {
          // 移除认证信息（如果存在）
          let cleanUrl = url;
          if (cleanUrl.includes('@') && (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://'))) {
            try {
              const urlObj = new URL(cleanUrl);
              cleanUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
            } catch {
              // 如果解析失败，使用原始 URL
            }
          }
          
          // 移除 .git 后缀
          let repoName = cleanUrl.replace(/\.git$/, '');
          
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

        // 询问是否需要认证（仅对 HTTPS/HTTP URL）
        let username: string | undefined;
        let password: string | undefined;
        let accessToken: string | undefined;
        
        const isHttpsUrl = remoteUrl.trim().startsWith('http://') || remoteUrl.trim().startsWith('https://');
        if (isHttpsUrl) {
          let authComplete = false;
          
          while (!authComplete) {
            const authChoice = await vscode.window.showQuickPick(
              [
                { label: 'No authentication', description: 'Public repository' },
                { label: 'Access Token', description: 'Use personal access token' },
                { label: 'Username & Password', description: 'Use username and password' },
              ],
              {
                placeHolder: 'Select authentication method (optional)',
                ignoreFocusOut: false,
              }
            );

            if (!authChoice) {
              // 用户取消了选择，退出整个流程
              return;
            }

            if (authChoice.label === 'No authentication') {
              // 不需要认证，直接完成
              authComplete = true;
            } else if (authChoice.label === 'Access Token') {
              const token = await vscode.window.showInputBox({
                prompt: 'Enter access token',
                password: true,
                validateInput: (value) => {
                  if (!value || value.trim().length === 0) {
                    return 'Access token cannot be empty';
                  }
                  return null;
                },
              });
              if (token) {
                accessToken = token.trim();
                authComplete = true;
              }
              // 如果用户取消了 token 输入，继续循环让用户重新选择
            } else if (authChoice.label === 'Username & Password') {
              const user = await vscode.window.showInputBox({
                prompt: 'Enter username',
                validateInput: (value) => {
                  if (!value || value.trim().length === 0) {
                    return 'Username cannot be empty';
                  }
                  return null;
                },
              });
              if (user) {
                const pass = await vscode.window.showInputBox({
                  prompt: 'Enter password',
                  password: true,
                  validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                      return 'Password cannot be empty';
                    }
                    return null;
                  },
                });
                if (pass) {
                  username = user.trim();
                  password = pass.trim();
                  authComplete = true;
                }
                // 如果用户取消了密码输入，继续循环让用户重新选择
              }
              // 如果用户取消了用户名输入，继续循环让用户重新选择
            }
          }
        }

        // 构建 RemoteEndpoint 对象（用于获取分支列表）
        const remoteForBranchList: RemoteEndpoint = {
          url: remoteUrl.trim(),
          branch: 'main',
          sync: 'manual',
          ...(accessToken && { accessToken }),
          ...(username && { username }),
          ...(password && { password }),
        };

        // 获取远程分支列表
        const gitAdapter = container.get<GitVaultAdapter>(TYPES.GitVaultAdapter);
        const branchesResult = await gitAdapter.listRemoteBranches(remoteUrl.trim(), remoteForBranchList);
        
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
          ...(accessToken && { accessToken }),
          ...(username && { username }),
          ...(password && { password }),
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
          assistantsTreeDataProvider.refresh();
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
          const vaultList = result.value.map(v => `- ${v.name} (${v.remote ? 'Git vault' : 'Local vault'})`).join('\n');
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

        // Filter to only Git vaults
        const gitVaults = vaultsResult.value.filter(v => v.remote);
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
        const gitVaults = vaultsResult.value.filter(v => v.remote);
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
          description: v.description || (v.remote ? 'Git vault' : 'Local vault'),
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
    logger.info('Commands registered successfully');
  } catch (error: any) {
    logger.error('Failed to register commands', error);
    // 即使命令注册失败，也继续激活扩展
  }

  // 15. 启动 MCP Server（可选）
  try {
    const mcpStarter = container.get<MCPServerStarter>(TYPES.MCPServerStarter);
    await mcpStarter.start();
    logger.info('MCP Server started');
  } catch (error: any) {
    logger.warn('Failed to start MCP Server', error);
  }

  // 16. 初始化 MCP IPC Server（用于外部 MCP Client 连接）
  let mcpIPCServer: MCPIPCServer | null = null;
  let mcpWindowMonitor: MCPWindowActivationMonitor | null = null;
  
  try {
    const mcpTools = container.get<import('./modules/mcp/MCPTools').MCPTools>(TYPES.MCPTools);
    const workspaceHash = calculateWorkspaceHash(workspaceRoot);
    
    // 创建并启动 IPC Server
    mcpIPCServer = new MCPIPCServer(
      workspaceHash,
      workspaceRoot,
      architoolRoot,
      mcpTools,
      logger
    );
    
    logger.info(`[MCP] Starting MCP IPC Server for workspace: ${workspaceRoot} (hash: ${workspaceHash})`);
    const socketPath = mcpIPCServer.getSocketPath();
    logger.info(`[MCP] Expected socket path: ${socketPath}`);
    
    try {
      await mcpIPCServer.start();
      logger.info(`[MCP] MCP IPC Server start() completed`);
      
      // 验证 socket 文件是否已创建（仅 Unix/Linux/macOS）
      if (process.platform !== 'win32') {
        // 多次检查，因为文件创建可能是异步的
        const checkSocketFile = (attempt: number, maxAttempts: number = 5) => {
          setTimeout(() => {
            const exists = fs.existsSync(socketPath);
            if (exists) {
              try {
                const stat = fs.statSync(socketPath);
                logger.info(`[MCP] Socket file verification #${attempt}: EXISTS - ${socketPath} (mode=${stat.mode.toString(8)}, size=${stat.size}, isSocket=${stat.isSocket()})`);
              } catch (error: any) {
                logger.warn(`[MCP] Socket file verification #${attempt}: EXISTS but stat failed - ${socketPath}`, error);
              }
            } else {
              if (attempt < maxAttempts) {
                logger.warn(`[MCP] Socket file verification #${attempt}: NOT FOUND - ${socketPath}, will retry...`);
                checkSocketFile(attempt + 1, maxAttempts);
              } else {
                logger.error(`[MCP] Socket file verification #${attempt}: NOT FOUND after ${maxAttempts} attempts - ${socketPath}`);
                logger.error(`[MCP] Please check directory permissions and ensure the directory exists: ${path.dirname(socketPath)}`);
              }
            }
          }, attempt * 200); // 递增延迟：200ms, 400ms, 600ms, 800ms, 1000ms
        };
        
        checkSocketFile(1);
      } else {
        logger.info(`[MCP] MCP IPC Server started for workspace: ${workspaceRoot} (Windows named pipe)`);
      }
    } catch (error: any) {
      logger.error(`[MCP] MCP IPC Server start() failed`, {
        error: error.message,
        stack: error.stack,
        socketPath,
        workspaceRoot,
        workspaceHash
      });
      throw error;
    }
    
    // 创建并启动窗口激活监控
    mcpWindowMonitor = new MCPWindowActivationMonitor(mcpIPCServer, logger);
    mcpWindowMonitor.start();
    logger.info('MCP Window Activation Monitor started');
    
    // 在扩展停用时清理资源
    context.subscriptions.push({
      dispose: async () => {
        if (mcpWindowMonitor) {
          mcpWindowMonitor.stop();
        }
        if (mcpIPCServer) {
          await mcpIPCServer.stop();
        }
      }
    });
  } catch (error: any) {
    logger.error('Failed to start MCP IPC Server', {
      error: error.message,
      stack: error.stack,
      workspaceRoot
    });
  }

  logger.info('ArchiTool extension initialized');
}

export function deactivate() {
  // Cleanup if needed
}

