import * as vscode from 'vscode';
import { CommandAdapter, CommandDefinition } from '../core/vscode-api/CommandAdapter';

/**
 * 助手/模板相关命令
 * 空实现，待后续迁移
 */
export class AssistantsCommands {
  constructor() {}

  /**
   * 注册所有助手相关命令
   */
  register(commandAdapter: CommandAdapter): void {
    const commands: CommandDefinition[] = [
      {
        command: 'archi.template.refresh',
        callback: () => {
          vscode.window.showInformationMessage('archi.template.refresh - 待实现');
        },
      },
      {
        command: 'archi.template.expandAll',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.expandAll - 待实现');
        },
      },
      {
        command: 'archi.template.collapseAll',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.collapseAll - 待实现');
        },
      },
      {
        command: 'archi.template.addFile',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.addFile - 待实现');
        },
      },
      {
        command: 'archi.template.addFolder',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.addFolder - 待实现');
        },
      },
      {
        command: 'archi.template.delete',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.delete - 待实现');
        },
      },
      {
        command: 'archi.template.addPlantUMLDesign',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.addPlantUMLDesign - 待实现');
        },
      },
      {
        command: 'archi.template.addMermaidDesign',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.addMermaidDesign - 待实现');
        },
      },
      {
        command: 'archi.template.createFromTemplate',
        callback: async () => {
          vscode.window.showInformationMessage('archi.template.createFromTemplate - 待实现');
        },
      },
    ];

    commandAdapter.registerCommands(commands);
  }
}
