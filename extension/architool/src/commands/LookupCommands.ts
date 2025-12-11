import * as vscode from 'vscode';
import { CommandAdapter, CommandDefinition } from '../core/commands/CommandAdapter';

/**
 * Lookup 和 Artifact 相关命令
 * 空实现，待后续迁移
 */
export class LookupCommands {
  constructor() {}

  /**
   * 注册所有 lookup 和 artifact 相关命令
   */
  register(commandAdapter: CommandAdapter): void {
    const commands: CommandDefinition[] = [
      {
        command: 'archi.lookup',
        callback: async () => {
          vscode.window.showInformationMessage('archi.lookup - 待实现');
        },
      },
      {
        command: 'archi.artifact.list',
        callback: async () => {
          vscode.window.showInformationMessage('archi.artifact.list - 待实现');
        },
      },
    ];

    commandAdapter.registerCommands(commands);
  }
}
