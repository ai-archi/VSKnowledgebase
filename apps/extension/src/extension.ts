import * as vscode from 'vscode';
import 'reflect-metadata';
// 导入所有命令模块（side-effect import）
// 这确保所有命令类在打包后也能被正确加载
import './commands';
import { ExtensionInitializer } from './core/ExtensionInitializer';

export async function activate(context: vscode.ExtensionContext) {
  const initializer = new ExtensionInitializer();
  await initializer.initialize(context);
}

export function deactivate() {
  // 大部分资源清理通过 context.subscriptions 自动处理
  // 全局错误处理器已在 context.subscriptions 中注册清理逻辑
}

