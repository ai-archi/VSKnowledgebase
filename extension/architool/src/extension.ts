// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { CommandAdapter } from './core/commands/CommandAdapter';
import { VaultCommands } from './commands/VaultCommands';
import { DocumentCommands } from './commands/DocumentCommands';
import { ViewpointCommands } from './commands/ViewpointCommands';
import { AssistantsCommands } from './commands/AssistantsCommands';
import { AICommands } from './commands/AICommands';
import { LookupCommands } from './commands/LookupCommands';
import { DocumentTreeViewProvider } from './views/DocumentTreeViewProvider';
import { AssistantsTreeViewProvider } from './views/AssistantsTreeViewProvider';
import { TaskWebviewViewProvider } from './views/TaskWebviewViewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('ArchiTool extension is activating...');

	// 创建命令适配器
	const commandAdapter = new CommandAdapter(context);

	// 注册视图
	try {
		// 注册文档树视图（资源管理器）
		const documentTreeViewProvider = new DocumentTreeViewProvider();
		const documentTreeView = vscode.window.createTreeView('architool.documentView', {
			treeDataProvider: documentTreeViewProvider
		});
		context.subscriptions.push(documentTreeView);
		console.log('Document tree view registered');

		// 注册助手树视图（资源管理器）
		const assistantsTreeViewProvider = new AssistantsTreeViewProvider();
		const assistantsTreeView = vscode.window.createTreeView('architool.assistantsView', {
			treeDataProvider: assistantsTreeViewProvider
		});
		context.subscriptions.push(assistantsTreeView);
		console.log('Assistants tree view registered');

		// 注册任务 Webview 视图（面板）
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
		const documentCommands = new DocumentCommands();
		documentCommands.register(commandAdapter);

		// 视点命令
		const viewpointCommands = new ViewpointCommands();
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
