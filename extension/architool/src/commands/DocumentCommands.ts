import * as vscode from 'vscode';
import { CommandAdapter, CommandDefinition } from '../core/commands/CommandAdapter';

/**
 * 文档相关命令
 * 空实现，待后续迁移
 */
export class DocumentCommands {
  constructor() {}

  /**
   * 注册所有文档相关命令
   */
  register(commandAdapter: CommandAdapter): void {
    const commands: CommandDefinition[] = [
      {
        command: 'archi.document.refresh',
        callback: () => {
          vscode.window.showInformationMessage('archi.document.refresh - 待实现');
        },
      },
      {
        command: 'archi.document.expandAll',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.expandAll - 待实现');
        },
      },
      {
        command: 'archi.document.collapseAll',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.collapseAll - 待实现');
        },
      },
      {
        command: 'archi.document.addFile',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.addFile - 待实现');
        },
      },
      {
        command: 'archi.document.addFolder',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.addFolder - 待实现');
        },
      },
      {
        command: 'archi.document.delete',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.delete - 待实现');
        },
      },
      {
        command: 'archi.document.create',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.create - 待实现');
        },
      },
      {
        command: 'archi.document.addPlantUMLDesign',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.addPlantUMLDesign - 待实现');
        },
      },
      {
        command: 'archi.document.addMermaidDesign',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.addMermaidDesign - 待实现');
        },
      },
      {
        command: 'archi.document.editRelations',
        callback: async () => {
          vscode.window.showInformationMessage('archi.document.editRelations - 待实现');
        },
      },
    ];

    commandAdapter.registerCommands(commands);
  }
}
