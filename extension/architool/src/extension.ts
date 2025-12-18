// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// IMPORTANT: reflect-metadata must be imported BEFORE inversify for decorators to work
import 'reflect-metadata';
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Container } from 'inversify';
import { CommandAdapter } from './core/vscode-api/CommandAdapter';
import { VaultCommands } from './commands/VaultCommands';
import { DocumentCommands } from './commands/DocumentCommands';
import { ViewpointCommands } from './commands/ViewpointCommands';
import { AICommands } from './commands/AICommands';
import { LookupCommands } from './commands/LookupCommands';
import { DocumentTreeViewProvider } from './views/DocumentTreeViewProvider';
import { Logger } from './core/logger/Logger';
import { ArchitoolDirectoryManager } from './core/storage/ArchitoolDirectoryManager';
import { createContainer } from './infrastructure/di/container';
import { TYPES } from './infrastructure/di/types';
import { VaultApplicationService } from './modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from './modules/shared/application/ArtifactApplicationService';
import { DocumentApplicationService } from './modules/document/application/DocumentApplicationService';
import { FileTreeDomainService } from './modules/shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService } from './modules/shared/domain/services/FileOperationDomainService';
import { SqliteRuntimeIndex } from './modules/shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { WebviewAdapter } from './core/vscode-api/WebviewAdapter';
import { WebviewRPC } from './core/vscode-api/WebviewRPC';
import { TemplateApplicationService } from './modules/template/application/TemplateApplicationService';
import { CodeFileSystemApplicationService } from './modules/shared/application/CodeFileSystemApplicationService';
import { AICommandApplicationService } from './modules/shared/application/AICommandApplicationService';
import { MermaidEditorProvider } from './modules/editor/mermaid/MermaidEditorProvider';
import { PlantUMLEditorProvider } from './modules/editor/plantuml/PlantUMLEditorProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('ArchiTool extension is activating...');

	// 创建日志记录器
	const logger = new Logger('ArchiTool');
	
	// 初始化工作区
	const { workspaceRoot, architoolRoot } = await initializeWorkspace(logger, context);
	
	// 初始化依赖注入容器
	const dbPath = path.join(architoolRoot, 'cache', 'runtime.sqlite');
	const container = createContainer(architoolRoot, dbPath, context, logger);
	
	// 初始化 SQLite
	try {
		const index = container.get<SqliteRuntimeIndex>(TYPES.SqliteRuntimeIndex);
		await index.initialize();
		logger.info('SQLite runtime index initialized');
	} catch (error: any) {
		const errorMessage = error?.message || String(error);
		if (errorMessage.includes('bindings') || errorMessage.includes('better_sqlite3.node') || errorMessage.includes('NODE_MODULE_VERSION')) {
			logger.warn('SQLite initialization failed due to native bindings version mismatch. Some features may not be available.');
		} else {
			logger.error('Failed to initialize SQLite', error);
		}
	}
	
	// 创建命令适配器
	const commandAdapter = new CommandAdapter(context);
	
	// 初始化文档视图和命令
	const documentTreeViewProvider = await initializeDocumentViewAndCommand(logger, context, commandAdapter, container);
	// 初始化其他命令（不依赖视图的命令）
	initializeOtherCommands(logger, context, commandAdapter, container, documentTreeViewProvider);
	
	// 注册自定义编辑器
	initializeCustomEditors(logger, context);
}

/**
 * 初始化工作区
 */
async function initializeWorkspace(logger: Logger, context: vscode.ExtensionContext): Promise<{ workspaceRoot: string; architoolRoot: string }> { 
	// 初始化工作区路径和 .architool 目录
	try {
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

		// 初始化 .architool 目录
		const architoolManager = new ArchitoolDirectoryManager(architoolRoot, logger);
		await architoolManager.initialize();

		// 初始化 Demo Vaults
		const demoVaultsSourcePath = path.join(context.extensionPath, 'dist', 'demo-vaults');
		logger.info(`Extension path: ${context.extensionPath}`);
		logger.info(`Demo vaults source path: ${demoVaultsSourcePath}`);
		logger.info(`Demo vaults source exists: ${fs.existsSync(demoVaultsSourcePath)}`);

		try {
			await architoolManager.initializeDemoVaultsIfEmpty(demoVaultsSourcePath);
			logger.info('Demo vaults initialization completed');
		} catch (error: any) {
			logger.error('Failed to initialize demo-vaults:', error);
		}
		
		return { workspaceRoot, architoolRoot };
	} catch (error: any) {
		logger.error('Failed to initialize architool directory:', error);
		throw error;
	}
}

/**
 * 初始化文档视图和命令
 * 将视图和命令一起初始化，确保命令可以访问视图实例
 */
async function initializeDocumentViewAndCommand(
	logger: Logger, 
	context: vscode.ExtensionContext,
	commandAdapter: CommandAdapter,
	container: Container
): Promise<DocumentTreeViewProvider> {
	try {
		// 从容器获取服务实例
		const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		const fileTreeDomainService = container.get<FileTreeDomainService>(TYPES.FileTreeDomainService);
		const fileOperationDomainService = container.get<FileOperationDomainService>(TYPES.FileOperationDomainService);
		
		// 初始化文档树视图
		const documentTreeViewProvider = new DocumentTreeViewProvider(
			vaultService,
			artifactService,
			logger
		);
		const documentTreeView = vscode.window.createTreeView('architool.documentView', {
			treeDataProvider: documentTreeViewProvider
		});
		context.subscriptions.push(documentTreeView);
		logger.info('Document tree view registered');

		// 从容器获取 DocumentApplicationService 和其他服务
		const documentService = container.get<DocumentApplicationService>(TYPES.DocumentApplicationService);
		const templateService = container.get<TemplateApplicationService>(TYPES.TemplateApplicationService);
		const codeFileService = container.get<CodeFileSystemApplicationService>(TYPES.CodeFileSystemApplicationService);
		const aiCommandService = container.get<AICommandApplicationService>(TYPES.AICommandApplicationService);

		// 创建 WebviewRPC（统一管理所有 RPC 方法，包括 template.list）
		const webviewRPC = new WebviewRPC(
			logger,
			vaultService,
			documentService,
			templateService,
			artifactService,
			codeFileService,
			aiCommandService
		);

		// 初始化文档命令（需要视图实例）
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
			webviewRPC.getAdapter()
		);
		documentCommands.register(commandAdapter);
		logger.info('Document commands registered');
		
		return documentTreeViewProvider;
	} catch (error: any) {
		logger.error('Failed to initialize document view and commands:', error);
		vscode.window.showErrorMessage(`Failed to initialize document view: ${error.message}`);
		throw error;
	}
}

// 助手视图已移除，所有 vault 现在在文档视图中显示

/**
 * 初始化其他命令（不依赖视图的命令）
 */
function initializeOtherCommands(
	logger: Logger,
	context: vscode.ExtensionContext,
	commandAdapter: CommandAdapter,
	container: Container,
	documentTreeViewProvider?: DocumentTreeViewProvider
) {
	try {
		// 从容器获取服务实例（统一在函数开头获取，避免重复声明）
		const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		
		// Vault 命令
		const vaultCommands = new VaultCommands(
			vaultService,
			container,
			logger,
			documentTreeViewProvider
		);
		vaultCommands.register(commandAdapter);

		// 视点命令
		// 注意：ViewpointApplicationService, TaskApplicationService, AIApplicationService 可能不存在
		// 创建一个简单的适配器，使用 artifactService 来实现 getRelatedArtifacts
		let viewpointService: any;
		let taskService: any;
		let aiService: any;
		try {
			viewpointService = container.get(TYPES.ViewpointApplicationService);
		} catch (error) {
			logger.warn('ViewpointApplicationService not found in container, creating adapter');
			// 创建一个简单的适配器，使用 artifactService.findArtifactsByCodePath
			viewpointService = {
				getRelatedArtifacts: async (codePath: string) => {
					const result = await artifactService.findArtifactsByCodePath(codePath);
					return {
						success: result.success,
						value: result.success ? result.value : undefined,
						error: result.success ? undefined : result.error,
					};
				},
			};
		}
		try {
			taskService = container.get(TYPES.TaskApplicationService);
		} catch (error) {
			logger.warn('TaskApplicationService not found in container');
		}
		try {
			aiService = container.get(TYPES.AIApplicationService);
		} catch (error) {
			logger.warn('AIApplicationService not found in container');
		}
		
		// 获取 FileOperationDomainService（用于提示词生成，必需）
		const fileOperationService = container.get<FileOperationDomainService>(TYPES.FileOperationDomainService);
		
		const viewpointCommands = new ViewpointCommands(
			viewpointService,
			vaultService,
			artifactService,
			taskService,
			aiService,
			fileOperationService,
			logger,
			context
		);
		viewpointCommands.registerCommands(context);

		// AI 命令
		const aiCommands = new AICommands();
		aiCommands.registerCommands(context);

		// Lookup 和 Artifact 命令
		const lookupCommands = new LookupCommands();
		lookupCommands.register(commandAdapter);

		logger.info('All other commands registered successfully');
	} catch (error: any) {
		logger.error('Failed to register some commands:', error);
		vscode.window.showErrorMessage(`Failed to register some commands: ${error.message}`);
	}
}

/**
 * 初始化自定义编辑器
 */
function initializeCustomEditors(
	logger: Logger,
	context: vscode.ExtensionContext
) {
	try {
		// 注册 Mermaid 编辑器
		const mermaidEditorDisposable = MermaidEditorProvider.register(context);
		context.subscriptions.push(mermaidEditorDisposable);
		logger.info('Mermaid editor registered');

		// 注册 PlantUML 编辑器
		const plantumlEditorDisposable = PlantUMLEditorProvider.register(context);
		context.subscriptions.push(plantumlEditorDisposable);
		logger.info('PlantUML editor registered');
	} catch (error: any) {
		logger.error('Failed to register custom editors:', error);
		vscode.window.showErrorMessage(`Failed to register custom editors: ${error.message}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
