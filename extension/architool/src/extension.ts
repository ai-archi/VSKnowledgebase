// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
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

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('ArchiTool extension is activating...');

	// 创建日志记录器
	const logger = new Logger('ArchiTool');

	// 创建命令适配器
	const commandAdapter = new CommandAdapter(context);

	// 声明视图变量（在 try 块外声明，以便后续使用）
	let documentTreeViewProvider: DocumentTreeViewProvider | undefined;
	let documentTreeView: vscode.TreeView<vscode.TreeItem> | undefined;

	// 注册视图
	try {
		// TODO: 需要初始化依赖注入容器并获取服务实例
		// 注册文档树视图（资源管理器）
		// 需要以下服务：
		// - VaultApplicationService
		// - ArtifactApplicationService  
		// - Logger
		// 
		// 示例代码（待完善）：
		// const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		// const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		// const logger = container.get<Logger>(TYPES.Logger);
		// documentTreeViewProvider = new DocumentTreeViewProvider(vaultService, artifactService, logger);
		
		// 临时占位实现（待替换）
		documentTreeViewProvider = new DocumentTreeViewProvider(
			{} as any, // vaultService - TODO: 从容器获取
			{} as any, // artifactService - TODO: 从容器获取
			logger
		);
		documentTreeView = vscode.window.createTreeView('architool.documentView', {
			treeDataProvider: documentTreeViewProvider
		});
		context.subscriptions.push(documentTreeView);
		console.log('Document tree view registered');

		// 注册助手树视图（资源管理器）
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
		// const assistantsTreeViewProvider = new AssistantsTreeViewProvider(vaultService, artifactService, logger);
		
		// 临时占位实现（待替换）
		const assistantsTreeViewProvider = new AssistantsTreeViewProvider(
			{} as any, // vaultService - TODO: 从容器获取
			{} as any, // artifactService - TODO: 从容器获取
			logger
		);
		const assistantsTreeView = vscode.window.createTreeView('architool.assistantsView', {
			treeDataProvider: assistantsTreeViewProvider
		});
		context.subscriptions.push(assistantsTreeView);
		console.log('Assistants tree view registered');

		// 注册任务 Webview 视图（面板）
		// 注意：ViewpointWebviewViewProvider 已经通过 ViewpointCommands 注册为 'architool.viewpointView'
		// 这里保留 TaskWebviewViewProvider 作为备用，或者可以移除
		const taskWebviewViewProvider = new TaskWebviewViewProvider(context);
		const taskWebviewViewDisposable = vscode.window.registerWebviewViewProvider(
			'architool.taskView',
			taskWebviewViewProvider
		);
		context.subscriptions.push(taskWebviewViewDisposable);
		console.log('Task webview view registered');
	} catch (error: any) {
		console.error('Failed to register views:', error);
		vscode.window.showErrorMessage(`Failed to register views: ${error.message}`);
	}

	// 注册所有命令类
	try {
		// Vault 命令
		const vaultCommands = new VaultCommands();
		vaultCommands.register(commandAdapter);

		// 文档命令
		// TODO: 需要初始化依赖注入容器并获取服务实例
		// 需要以下服务：
		// - DocumentApplicationService
		// - ArtifactApplicationService
		// - VaultApplicationService
		// - FileTreeDomainService
		// - FileOperationDomainService
		// - Logger
		// - WebviewAdapter
		//
		// 示例代码（待完善）：
		// const documentService = container.get<DocumentApplicationService>(TYPES.DocumentApplicationService);
		// const artifactService = container.get<ArtifactApplicationService>(TYPES.ArtifactApplicationService);
		// const vaultService = container.get<VaultApplicationService>(TYPES.VaultApplicationService);
		// const fileTreeDomainService = container.get<FileTreeDomainService>(TYPES.FileTreeDomainService);
		// const fileOperationDomainService = container.get<FileOperationDomainService>(TYPES.FileOperationDomainService);
		// const logger = container.get<Logger>(TYPES.Logger);
		// const webviewAdapter = new WebviewAdapter(...); // TODO: 初始化 WebviewAdapter
		// const documentCommands = new DocumentCommands(
		//   documentService,
		//   artifactService,
		//   vaultService,
		//   fileTreeDomainService,
		//   fileOperationDomainService,
		//   logger,
		//   context,
		//   documentTreeViewProvider,
		//   documentTreeView,
		//   webviewAdapter
		// );
		
		// 临时占位实现（待替换）
		// 只有在视图成功注册后才注册文档命令
		if (documentTreeViewProvider && documentTreeView) {
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
		} else {
			console.warn('Document tree view not initialized, skipping DocumentCommands registration');
		}

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

		// 助手/模板命令
		const assistantsCommands = new AssistantsCommands();
		assistantsCommands.register(commandAdapter);

		// AI 命令
		const aiCommands = new AICommands();
		aiCommands.registerCommands(context);

		// Lookup 和 Artifact 命令
		const lookupCommands = new LookupCommands();
		lookupCommands.register(commandAdapter);

		console.log('All commands registered successfully');
	} catch (error: any) {
		console.error('Failed to register some commands:', error);
		vscode.window.showErrorMessage(`Failed to register some commands: ${error.message}`);
	}
}

// This method is called when your extension is deactivated
export function deactivate() {}
