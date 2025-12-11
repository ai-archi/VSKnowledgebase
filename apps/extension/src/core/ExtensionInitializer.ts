import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Container } from 'inversify';
import { Logger } from './logger/Logger';
import { ArchitoolDirectoryManager } from './storage/ArchitoolDirectoryManager';
import { createContainer } from '../infrastructure/di/container';
import { TYPES } from '../infrastructure/di/types';
import { SqliteRuntimeIndex } from '../modules/shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { LookupApplicationService } from '../modules/lookup/application/LookupApplicationService';
import { DocumentApplicationService } from '../modules/document/application/DocumentApplicationService';
import { TaskApplicationService } from '../modules/task/application/TaskApplicationService';
import { ViewpointApplicationService } from '../modules/viewpoint/application/ViewpointApplicationService';
import { TemplateApplicationService } from '../modules/template/application/TemplateApplicationService';
import { AIApplicationService } from '../modules/ai/application/AIApplicationService';
import { CommandAdapter } from './vscode-api/CommandAdapter';
import { WebviewRPC } from './vscode-api/WebviewRPC';
import { NoteLookupProvider } from '../modules/lookup/interface/NoteLookupProvider';
import { DocumentTreeViewProvider } from '../modules/document/interface/DocumentTreeViewProvider';
import { DocumentCommands } from '../modules/document/interface/Commands';
import { ViewpointCommands } from '../modules/viewpoint/interface/Commands';
import { AssistantsTreeDataProvider } from '../modules/assistants/interface/AssistantsTreeDataProvider';
import { AssistantsCommands } from '../modules/assistants/interface/Commands';
import { AICommands } from '../modules/ai/interface/Commands';
import { MermaidEditorProvider } from '../modules/editor/mermaid/MermaidEditorProvider';
import { PlantUMLEditorProvider } from '../modules/editor/plantuml/PlantUMLEditorProvider';
import { MCPServerStarter } from '../modules/mcp/MCPServerStarter';
import { MCPIPCServer } from '../modules/mcp/MCPIPCServer';
import { MCPWindowActivationMonitor } from '../modules/mcp/MCPWindowActivationMonitor';
import { calculateWorkspaceHash } from '../modules/mcp/utils';
import { VaultCommands } from '../modules/shared/interface/commands/VaultCommands';

export interface ExtensionServices {
  logger: Logger;
  container: Container;
  vaultService: VaultApplicationService;
  artifactService: ArtifactApplicationService;
  lookupService: LookupApplicationService;
  documentService: DocumentApplicationService;
  taskService: TaskApplicationService;
  viewpointService: ViewpointApplicationService;
  templateService: TemplateApplicationService;
  aiService: AIApplicationService;
  commandAdapter: CommandAdapter;
  lookupProvider: NoteLookupProvider;
  documentTreeViewProvider: DocumentTreeViewProvider;
  assistantsTreeDataProvider: AssistantsTreeDataProvider;
  workspaceRoot: string;
  architoolRoot: string;
}

/**
 * 扩展初始化器
 * 负责管理扩展的初始化逻辑
 */
export class ExtensionInitializer {
  private logger!: Logger;
  private container!: Container;
  private services!: ExtensionServices;

  /**
   * 初始化扩展
   */
  async initialize(context: vscode.ExtensionContext): Promise<ExtensionServices> {
    // 1. 初始化日志
    this.logger = new Logger('ArchiTool1');
    context.subscriptions.push({
      dispose: () => this.logger.dispose()
    });
    this.logger.show();
    this.logger.info('ArchiTool extension activating...');

    // 2. 初始化工作区路径
    const { workspaceRoot, architoolRoot } = this.initializeWorkspacePaths(this.logger);

    // 3. 初始化 Architool 目录
    await this.initializeArchitoolDirectory(architoolRoot, this.logger);

    // 4. 初始化 Demo Vaults 和 MCP Server
    await this.initializeResources(context.extensionPath, architoolRoot, this.logger);

    // 5. 初始化 SQLite
    const dbPath = path.join(architoolRoot, 'cache', 'runtime.sqlite');
    this.container = createContainer(architoolRoot, dbPath, context, this.logger);
    await this.initializeSQLite(this.container, this.logger);

    // 6. 获取服务
    const services = this.getServices(this.container, this.logger, workspaceRoot, architoolRoot, context);

    // 7. 初始化视图和命令
    await this.initializeViewsAndCommands(context, services);

    // 8. 启动 MCP Server
    await this.startMCPServer(this.container, this.logger);

    // 9. 启动 MCP IPC Server
    await this.startMCPIPCServer(
      context,
      this.container,
      workspaceRoot,
      architoolRoot,
      this.logger
    );

    // 10. 注册全局错误处理
    this.registerErrorHandlers(context, this.logger);

    this.logger.info('ArchiTool extension initialized');
    this.services = services;
    return services;
  }

  /**
   * 初始化工作区路径
   */
  private initializeWorkspacePaths(logger: Logger): { workspaceRoot: string; architoolRoot: string } {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let workspaceRoot: string;
    let architoolRoot: string;

    if (!workspaceFolder) {
      workspaceRoot = os.homedir();
      architoolRoot = path.join(workspaceRoot, '.architool');
      logger.warn('No workspace folder found, using home directory as fallback');
    } else {
      workspaceRoot = workspaceFolder.uri.fsPath;
      architoolRoot = path.join(workspaceRoot, '.architool');
    }

    logger.info(`Workspace root: ${workspaceRoot}`);
    logger.info(`Architool root: ${architoolRoot}`);

    return { workspaceRoot, architoolRoot };
  }

  /**
   * 初始化 Architool 目录
   */
  private async initializeArchitoolDirectory(architoolRoot: string, logger: Logger): Promise<void> {
    const architoolManager = new ArchitoolDirectoryManager(architoolRoot, logger);
    await architoolManager.initialize();
  }

  /**
   * 初始化资源（Demo Vaults 和 MCP Server）
   */
  private async initializeResources(
    extensionPath: string,
    architoolRoot: string,
    logger: Logger
  ): Promise<void> {
    const demoVaultsSourcePath = path.join(extensionPath, 'dist', 'demo-vaults');
    logger.info(`Extension path: ${extensionPath}`);
    logger.info(`Demo vaults source path: ${demoVaultsSourcePath}`);
    logger.info(`Demo vaults source exists: ${fs.existsSync(demoVaultsSourcePath)}`);

    const architoolManager = new ArchitoolDirectoryManager(architoolRoot, logger);

    // 初始化 Demo Vaults
    try {
      await architoolManager.initializeDemoVaultsIfEmpty(demoVaultsSourcePath);
      logger.info('Demo vaults initialization completed');
    } catch (error: any) {
      logger.error('Failed to initialize demo-vaults:', error);
    }

    // 复制 MCP Server
    const mcpServerSourcePath = path.join(extensionPath, 'dist', 'mcp-server', 'mcp-server.js');
    if (fs.existsSync(mcpServerSourcePath)) {
      try {
        await architoolManager.copyMCPServer(mcpServerSourcePath);
        logger.info('MCP Server copied to fixed location');
      } catch (error: any) {
        logger.warn('Failed to copy MCP Server:', error);
      }
    } else {
      logger.debug('MCP Server source not found (development mode, skipping copy)');
    }
  }

  /**
   * 初始化 SQLite
   */
  private async initializeSQLite(container: Container, logger: Logger): Promise<void> {
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
  }

  /**
   * 获取服务
   */
  private getServices(
    container: Container,
    logger: Logger,
    workspaceRoot: string,
    architoolRoot: string,
    context: vscode.ExtensionContext
  ): ExtensionServices {
    const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
    const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
    const lookupService = container.get<LookupApplicationService>(TYPES.LookupApplicationService);
    const documentService = container.get<DocumentApplicationService>(TYPES.DocumentApplicationService);
    const taskService = container.get<TaskApplicationService>(TYPES.TaskApplicationService);
    const viewpointService = container.get<ViewpointApplicationService>(TYPES.ViewpointApplicationService);
    const templateService = container.get<TemplateApplicationService>(TYPES.TemplateApplicationService);
    const aiService = container.get<AIApplicationService>(TYPES.AIApplicationService);

    const commandAdapter = new CommandAdapter(context);
    const lookupProvider = new NoteLookupProvider(lookupService, vaultService, logger);

    return {
      logger,
      container,
      vaultService,
      artifactService,
      lookupService,
      documentService,
      taskService,
      viewpointService,
      templateService,
      aiService,
      commandAdapter,
      lookupProvider,
      documentTreeViewProvider: null as any,
      assistantsTreeDataProvider: null as any,
      workspaceRoot,
      architoolRoot,
    };
  }

  /**
   * 初始化视图和命令
   * 确保所有依赖完全初始化后再注册命令，避免打包后命令注册失败
   */
  private async initializeViewsAndCommands(
    context: vscode.ExtensionContext,
    services: ExtensionServices
  ): Promise<void> {
    const { container, logger, vaultService, artifactService, documentService, templateService, lookupProvider } = services;

    try {
      logger.info('Starting command registration...');

      // 更新 commandAdapter 的 context
      services.commandAdapter = new CommandAdapter(context);

      // 初始化文档视图
      const fileTreeDomainService = container.get<import('../modules/shared/domain/services/FileTreeDomainService').FileTreeDomainService>(TYPES.FileTreeDomainService);
      const fileOperationDomainService = container.get<import('../modules/shared/domain/services/FileOperationDomainService').FileOperationDomainService>(TYPES.FileOperationDomainService);
      const codeFileService = container.get<import('../modules/shared/application/CodeFileSystemApplicationService').CodeFileSystemApplicationService>(TYPES.CodeFileSystemApplicationService);
      const aiCommandService = container.get<import('../modules/shared/application/AICommandApplicationService').AICommandApplicationService>(TYPES.AICommandApplicationService);
      const eventBus = container.get<import('./eventbus/EventBus').EventBus>(TYPES.EventBus);

      services.documentTreeViewProvider = new DocumentTreeViewProvider(vaultService, artifactService, logger);
      const documentTreeView = vscode.window.createTreeView('architool.documentView', {
        treeDataProvider: services.documentTreeViewProvider
      });
      context.subscriptions.push(documentTreeView);

      const webviewRPC = new WebviewRPC(
        logger,
        vaultService,
        documentService,
        templateService,
        artifactService,
        codeFileService,
        aiCommandService
      );

      // 注册文档命令
      try {
        const documentCommands = new DocumentCommands(
          documentService,
          artifactService,
          vaultService,
          fileTreeDomainService,
          fileOperationDomainService,
          logger,
          context,
          services.documentTreeViewProvider,
          documentTreeView,
          webviewRPC.getAdapter(),
          eventBus
        );
        documentCommands.register(services.commandAdapter);
        logger.info('Document commands registered successfully');
      } catch (error: any) {
        logger.error('Failed to register document commands', error);
        throw error;
      }

      // 初始化视点视图和命令
      try {
        const viewpointCommands = new ViewpointCommands(
          services.viewpointService,
          vaultService,
          artifactService,
          services.taskService,
          services.aiService,
          logger,
          context,
          webviewRPC.getAdapter()
        );
        viewpointCommands.registerCommands(context);
        logger.info('Viewpoint commands registered successfully');
      } catch (error: any) {
        logger.error('Failed to register viewpoint commands', error);
        throw error;
      }

      // 初始化助手视图
      services.assistantsTreeDataProvider = new AssistantsTreeDataProvider(vaultService, artifactService, logger);
      const assistantsTreeView = vscode.window.createTreeView('architool.assistantsView', {
        treeDataProvider: services.assistantsTreeDataProvider
      });
      context.subscriptions.push(assistantsTreeView);

      // 注册助手命令
      try {
        const assistantsCommands = new AssistantsCommands(
          services.templateService,
          artifactService,
          vaultService,
          fileTreeDomainService,
          fileOperationDomainService,
          logger,
          context,
          services.assistantsTreeDataProvider,
          assistantsTreeView,
          webviewRPC.getAdapter()
        );
        assistantsCommands.register(services.commandAdapter);
        logger.info('Assistants commands registered successfully');
      } catch (error: any) {
        logger.error('Failed to register assistants commands', error);
        throw error;
      }

      // 初始化 AI 服务命令
      try {
        const changeRepository = container.get<import('../modules/shared/infrastructure/ChangeRepository').ChangeRepository>(TYPES.ChangeRepository);
        const aiCommands = new AICommands(
          services.aiService,
          artifactService,
          vaultService,
          services.viewpointService,
          changeRepository,
          logger
        );
        aiCommands.registerCommands(context);
        logger.info('AI commands registered successfully');
      } catch (error: any) {
        logger.error('Failed to register AI commands', error);
        throw error;
      }

      // 注册自定义编辑器
      try {
        const mermaidEditorDisposable = MermaidEditorProvider.register(context);
        context.subscriptions.push(mermaidEditorDisposable);
        logger.info('Mermaid editor provider registered');

        const plantumlEditorDisposable = PlantUMLEditorProvider.register(context);
        context.subscriptions.push(plantumlEditorDisposable);
        logger.info('PlantUML editor provider registered');
      } catch (error: any) {
        logger.error('Failed to register custom editors', error);
        throw error;
      }

      // 注册 Vault 命令
      try {
        const vaultCommands = new VaultCommands(
          vaultService,
          container,
          logger,
          services.documentTreeViewProvider,
          services.assistantsTreeDataProvider
        );
        vaultCommands.register(services.commandAdapter);
        logger.info('Vault commands registered successfully');
      } catch (error: any) {
        logger.error('Failed to register vault commands', error);
        throw error;
      }

      // 注册 Lookup 和 Artifact 命令
      await this.registerAdditionalCommands(context, services, logger);

      logger.info('All commands registered successfully');
    } catch (error: any) {
      logger.error('Critical error during command registration', error);
      vscode.window.showErrorMessage(`Failed to register some commands: ${error.message}`);
      // 不抛出错误，允许扩展继续运行，即使部分命令注册失败
    }
  }

  /**
   * 注册额外的命令（Lookup 和 Artifact）
   * 确保所有 disposable 都正确添加到 context.subscriptions
   */
  private async registerAdditionalCommands(
    context: vscode.ExtensionContext,
    services: ExtensionServices,
    logger: Logger
  ): Promise<void> {
    const { commandAdapter, lookupProvider, vaultService, artifactService, lookupService } = services;

    try {
      logger.info('Registering additional commands (lookup, artifact)...');
      
      commandAdapter.registerCommands([
        {
          command: 'archi.lookup',
          callback: async () => {
            try {
              const result = await lookupProvider.show();
              if (result && (result as any).create) {
                const state = lookupProvider.stateManager.getState();
                const documentName = state.documentName;
                const documentType = state.documentType;
                const selectedRefs = state.selectedDocuments.map((d: any) => ({
                  id: d.id,
                  title: d.title,
                  path: d.path,
                  vaultName: d.vaultName
                }));

                if (documentName) {
                  const vaultsResult = await vaultService.listVaults();
                  if (vaultsResult.success && vaultsResult.value.length > 0) {
                    const writableVaults = vaultsResult.value;
                    if (writableVaults.length > 0) {
                      const newArtifactResult = await lookupService.quickCreate({
                        vaultId: writableVaults[0].id,
                        viewType: documentType,
                        title: documentName,
                        content: `# ${documentName}\n\n` +
                          (selectedRefs.length > 0 ? `## References\n\n` +
                            selectedRefs.map((ref: any) => `- [[${ref.title}|${ref.vaultName}/${ref.path}]]`).join('\n') : '')
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
                const artifact = (result as any).artifact;
                const doc = await vscode.workspace.openTextDocument(artifact.contentLocation);
                await vscode.window.showTextDocument(doc);
              }
            } catch (error: any) {
              logger.error('Error executing archi.lookup command', error);
              vscode.window.showErrorMessage(`Lookup command failed: ${error.message}`);
            }
          },
        },
        {
          command: 'archi.artifact.list',
          callback: async () => {
            try {
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
            } catch (error: any) {
              logger.error('Error executing archi.artifact.list command', error);
              vscode.window.showErrorMessage(`List artifacts command failed: ${error.message}`);
            }
          },
        },
      ]);
      
      logger.info('Additional commands (lookup, artifact) registered successfully');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      logger.error(`Failed to register additional commands: ${errorMessage}`, error);
      vscode.window.showErrorMessage(`Failed to register some commands: ${errorMessage}`);
      // 不抛出错误，允许扩展继续运行
    }
  }

  /**
   * 启动 MCP Server
   */
  private async startMCPServer(container: Container, logger: Logger): Promise<void> {
    try {
      const mcpStarter = container.get<MCPServerStarter>(TYPES.MCPServerStarter);
      await mcpStarter.start();
      logger.info('MCP Server started');
    } catch (error: any) {
      logger.warn('Failed to start MCP Server', error);
    }
  }

  /**
   * 启动 MCP IPC Server
   */
  private async startMCPIPCServer(
    context: vscode.ExtensionContext,
    container: Container,
    workspaceRoot: string,
    architoolRoot: string,
    logger: Logger
  ): Promise<void> {
    try {
      const mcpTools = container.get<import('../modules/mcp/MCPTools').MCPTools>(TYPES.MCPTools);
      const workspaceHash = calculateWorkspaceHash(workspaceRoot);

      const mcpIPCServer = new MCPIPCServer(
        workspaceHash,
        workspaceRoot,
        architoolRoot,
        mcpTools,
        logger
      );

      logger.info(`[MCP] Starting MCP IPC Server for workspace: ${workspaceRoot} (hash: ${workspaceHash})`);
      const socketPath = mcpIPCServer.getSocketPath();
      logger.info(`[MCP] Expected socket path: ${socketPath}`);

      await mcpIPCServer.start();
      logger.info(`[MCP] MCP IPC Server start() completed`);

      if (process.platform !== 'win32') {
        const checkSocketFile = (attempt: number, maxAttempts = 5) => {
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
          }, attempt * 200);
        };
        checkSocketFile(1);
      } else {
        logger.info(`[MCP] MCP IPC Server started for workspace: ${workspaceRoot} (Windows named pipe)`);
      }

      const mcpWindowMonitor = new MCPWindowActivationMonitor(mcpIPCServer, logger);
      mcpWindowMonitor.start();
      logger.info('MCP Window Activation Monitor started');

      context.subscriptions.push({
        dispose: async () => {
          mcpWindowMonitor.stop();
          await mcpIPCServer.stop();
        }
      });
    } catch (error: any) {
      logger.error('Failed to start MCP IPC Server', {
        error: error.message,
        stack: error.stack,
        workspaceRoot
      });
    }
  }

  /**
   * 注册全局错误处理
   */
  private registerErrorHandlers(context: vscode.ExtensionContext, logger: Logger): void {
    const uncaughtExceptionHandler = (error: Error) => {
      logger.error('Uncaught exception in ArchiTool extension', error);
    };

    const unhandledRejectionHandler = (reason: any) => {
      logger.error('Unhandled promise rejection in ArchiTool extension', reason);
    };

    process.on('uncaughtException', uncaughtExceptionHandler);
    process.on('unhandledRejection', unhandledRejectionHandler);

    context.subscriptions.push({
      dispose: () => {
        process.removeListener('uncaughtException', uncaughtExceptionHandler);
        process.removeListener('unhandledRejection', unhandledRejectionHandler);
      }
    });
  }
}
