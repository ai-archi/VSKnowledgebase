// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { CommandAdapter } from './core/vscode-api/CommandAdapter';
import { VaultCommands } from './commands/VaultCommands';
import { DocumentCommands } from './commands/DocumentCommands';
import { ViewpointCommands } from './commands/ViewpointCommands';
import { AssistantsCommands } from './commands/AssistantsCommands';
import { AICommands } from './commands/AICommands';
import { LookupCommands } from './commands/LookupCommands';
import { DocumentTreeViewProvider } from './views/DocumentTreeViewProvider';
import { AssistantsTreeViewProvider } from './views/AssistantsTreeViewProvider';
import { TaskWebviewViewProvider } from './views/TaskWebviewViewProvider';
import { Logger } from './core/logger/Logger';
import { ArchitoolDirectoryManager } from './core/storage/ArchitoolDirectoryManager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('ArchiTool extension is activating...');

	// 创建日志记录器
	const logger = new Logger('ArchiTool');
	// 初始化工作区
	await initializeWorkspace(logger, context);
	// 创建命令适配器
	const commandAdapter = new CommandAdapter(context);
	// 初始化文档视图和命令
	initializeDocumentViewAndCommand(logger, context, commandAdapter);
	// 初始化助手视图和命令
	initializeAssistantsViewAndCommand(logger, context, commandAdapter);
	// 初始化任务视图和命令
	initializeTaskViewAndCommand(logger, context);
	// 初始化其他命令（不依赖视图的命令）
	initializeOtherCommands(logger, context, commandAdapter);
}

/**
 * 初始化工作区
 */
async function initializeWorkspace(logger: Logger, context: vscode.ExtensionContext) { 
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
	} catch (error: any) {
		logger.error('Failed to initialize architool directory:', error);
	}
}

/**
 * 初始化文档视图和命令
 * 将视图和命令一起初始化，确保命令可以访问视图实例
 */
function initializeDocumentViewAndCommand(
	logger: Logger, 
	context: vscode.ExtensionContext,
	commandAdapter: CommandAdapter
) {
	try {
		// TODO: 需要初始化依赖注入容器并获取服务实例
		// 需要以下服务：
		// - VaultApplicationService
		// - ArtifactApplicationService
		// - DocumentApplicationService
		// - FileTreeDomainService
		// - FileOperationDomainService
		// - Logger
		// - WebviewAdapter
		//
		// 示例代码（待完善）：
		// const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		// const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		// const documentService = container.get<DocumentApplicationService>(TYPES.DocumentApplicationService);
		// const fileTreeDomainService = container.get<FileTreeDomainService>(TYPES.FileTreeDomainService);
		// const fileOperationDomainService = container.get<FileOperationDomainService>(TYPES.FileOperationDomainService);
		// const logger = container.get<Logger>(TYPES.Logger);
		// const webviewAdapter = new WebviewAdapter(...); // TODO: 初始化 WebviewAdapter
		
		// 临时占位实现（待替换）
		// 初始化文档树视图
		const documentTreeViewProvider = new DocumentTreeViewProvider(
			{} as any, // vaultService - TODO: 从容器获取
			{} as any, // artifactService - TODO: 从容器获取
			logger
		);
		const documentTreeView = vscode.window.createTreeView('architool.documentView', {
			treeDataProvider: documentTreeViewProvider
		});
		context.subscriptions.push(documentTreeView);
		logger.info('Document tree view registered');

		// 初始化文档命令（需要视图实例）
		const documentCommands = new DocumentCommands(
			{} as any, // documentService - TODO: 从容器获取
			{} as any, // artifactService - TODO: 从容器获取
			{} as any, // vaultService - TODO: 从容器获取
			{} as any, // fileTreeDomainService - TODO: 从容器获取
			{} as any, // fileOperationDomainService - TODO: 从容器获取
			logger,
			context,
			documentTreeViewProvider,
			documentTreeView,
			{} as any  // webviewAdapter - TODO: 初始化
		);
		documentCommands.register(commandAdapter);
		logger.info('Document commands registered');
	} catch (error: any) {
		logger.error('Failed to initialize document view and commands:', error);
		vscode.window.showErrorMessage(`Failed to initialize document view: ${error.message}`);
	}
}

/**
 * 初始化助手视图和命令
 * 将视图和命令一起初始化，确保命令可以访问视图实例
 */
function initializeAssistantsViewAndCommand(
	logger: Logger,
	context: vscode.ExtensionContext,
	commandAdapter: CommandAdapter
) {
	try {
		// TODO: 需要初始化依赖注入容器并获取服务实例
		// 需要以下服务：
		// - VaultApplicationService
		// - ArtifactApplicationService
		// - Logger
		//
		// 示例代码（待完善）：
		// const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		// const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		// const logger = container.get<Logger>(TYPES.Logger);
		
		// 临时占位实现（待替换）
		// 初始化助手树视图
		const assistantsTreeViewProvider = new AssistantsTreeViewProvider(
			{} as any, // vaultService - TODO: 从容器获取
			{} as any, // artifactService - TODO: 从容器获取
			logger
		);
		const assistantsTreeView = vscode.window.createTreeView('architool.assistantsView', {
			treeDataProvider: assistantsTreeViewProvider
		});
		context.subscriptions.push(assistantsTreeView);
		logger.info('Assistants tree view registered');

		// 初始化助手命令
		// 注意：当前 AssistantsCommands 是空实现，将来如果需要继承 BaseFileTreeCommands，
		// 则需要传递 assistantsTreeViewProvider 和 assistantsTreeView
		const assistantsCommands = new AssistantsCommands();
		assistantsCommands.register(commandAdapter);
		logger.info('Assistants commands registered');
	} catch (error: any) {
		logger.error('Failed to initialize assistants view and commands:', error);
		vscode.window.showErrorMessage(`Failed to initialize assistants view: ${error.message}`);
	}
}

/**
 * 初始化任务视图和命令
 */
function initializeTaskViewAndCommand(
	logger: Logger,
	context: vscode.ExtensionContext
) {
	try {
		// 注册任务 Webview 视图（面板）
		// 注意：ViewpointWebviewViewProvider 已经通过 ViewpointCommands 注册为 'architool.viewpointView'
		// 这里保留 TaskWebviewViewProvider 作为备用，或者可以移除
		const taskWebviewViewProvider = new TaskWebviewViewProvider(context);
		const taskWebviewViewDisposable = vscode.window.registerWebviewViewProvider(
			'architool.taskView',
			taskWebviewViewProvider
		);
		context.subscriptions.push(taskWebviewViewDisposable);
		logger.info('Task webview view registered');
	} catch (error: any) {
		logger.error('Failed to initialize task view:', error);
		vscode.window.showErrorMessage(`Failed to initialize task view: ${error.message}`);
	}
}

/**
 * 初始化其他命令（不依赖视图的命令）
 */
function initializeOtherCommands(
	logger: Logger,
	context: vscode.ExtensionContext,
	commandAdapter: CommandAdapter
) {
	try {
		// Vault 命令
		const vaultCommands = new VaultCommands();
		vaultCommands.register(commandAdapter);

		// 视点命令
		// TODO: 需要初始化依赖注入容器并获取服务实例
		// 需要以下服务：
		// - ViewpointApplicationService
		// - VaultApplicationService
		// - ArtifactApplicationService
		// - TaskApplicationService
		// - AIApplicationService
		// - Logger
		//
		// 示例代码（待完善）：
		// const viewpointService = container.get<ViewpointApplicationService>(TYPES.ViewpointApplicationService);
		// const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		// const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		// const taskService = container.get<TaskApplicationService>(TYPES.TaskApplicationService);
		// const aiService = container.get<AIApplicationService>(TYPES.AIApplicationService);
		// const logger = container.get<Logger>(TYPES.Logger);
		// const viewpointCommands = new ViewpointCommands(
		//   viewpointService,
		//   vaultService,
		//   artifactService,
		//   taskService,
		//   aiService,
		//   logger,
		//   context
		// );
		
		// 临时占位实现（待替换）
		const viewpointCommands = new ViewpointCommands(
			{} as any, // viewpointService - TODO: 从容器获取
			{} as any, // vaultService - TODO: 从容器获取
			{} as any, // artifactService - TODO: 从容器获取
			{} as any, // taskService - TODO: 从容器获取
			{} as any, // aiService - TODO: 从容器获取
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
	// This method is called when your extension is deactivated
export function deactivate() {}
