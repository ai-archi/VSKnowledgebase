import * as vscode from 'vscode';
import { CommandAdapter, CommandDefinition } from '../core/commands/CommandAdapter';

/**
 * Vault 相关命令
 * 空实现，待后续迁移
 */
export class VaultCommands {
  constructor() {}

  /**
   * 注册所有 vault 相关命令
   */
  register(commandAdapter: CommandAdapter): void {
    const commands: CommandDefinition[] = [
      {
        command: 'archi.vault.add',
        callback: async () => {
          vscode.window.showInformationMessage('archi.vault.add - 待实现');
        },
      },
      {
        command: 'archi.vault.addFromGit',
        callback: async () => {
          vscode.window.showInformationMessage('archi.vault.addFromGit - 待实现');
        },
      },
      {
        command: 'archi.vault.list',
        callback: async () => {
          vscode.window.showInformationMessage('archi.vault.list - 待实现');
        },
      },
      {
        command: 'archi.vault.fork',
        callback: async () => {
          vscode.window.showInformationMessage('archi.vault.fork - 待实现');
        },
      },
      {
        command: 'archi.vault.sync',
        callback: async () => {
          vscode.window.showInformationMessage('archi.vault.sync - 待实现');
        },
      },
      {
        command: 'archi.vault.remove',
        callback: async () => {
          vscode.window.showInformationMessage('archi.vault.remove - 待实现');
        },
      },
    ];

    commandAdapter.registerCommands(commands);
  }
}
