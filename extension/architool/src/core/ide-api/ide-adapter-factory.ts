/**
 * IDE 适配器工厂
 * 根据运行环境自动创建相应的 IDE 适配器实例
 */

import { IDEAdapter } from './ide-adapter';
import { VSCodeAdapter } from './vscode-adapter';
import { IntelliJAdapter } from './idea-adapter';
import * as vscode from 'vscode';

/**
 * IDE 类型
 */
export type IDEType = 'vscode' | 'intellij' | 'unknown';

/**
 * 检测当前运行环境
 * @returns IDE 类型
 */
export function detectIDE(): IDEType {
  // 检测 VS Code 环境
  if (typeof vscode !== 'undefined' && vscode.workspace) {
    return 'vscode';
  }

  // 检测 IntelliJ 环境
  // 在 IntelliJ 插件中，可以通过检查全局对象或环境变量来判断
  if (typeof (global as any).idea !== 'undefined' || process.env.IDEA_PLUGIN) {
    return 'intellij';
  }

  return 'unknown';
}

/**
 * 创建 IDE 适配器实例
 * 根据运行环境自动创建相应的适配器
 * 
 * @param context VS Code ExtensionContext（仅在 VS Code 环境中需要）
 * @param extensionPath 扩展路径（用于 IntelliJ 环境）
 * @param extensionUri 扩展 URI（用于 IntelliJ 环境）
 * @returns IDE 适配器实例
 */
export function createIDEAdapter(
  context?: vscode.ExtensionContext,
  extensionPath?: string,
  extensionUri?: any
): IDEAdapter {
  const ideType = detectIDE();

  switch (ideType) {
    case 'vscode':
      if (!context) {
        throw new Error('VS Code context is required for VSCodeAdapter');
      }
      return new VSCodeAdapter(context);

    case 'intellij':
      if (!extensionPath || !extensionUri) {
        throw new Error('Extension path and URI are required for IntelliJAdapter');
      }
      return new IntelliJAdapter(extensionPath, extensionUri);

    default:
      // 默认使用 VS Code 适配器（向后兼容）
      if (context) {
        return new VSCodeAdapter(context);
      }
      throw new Error('Unable to create IDE adapter: unknown environment');
  }
}

