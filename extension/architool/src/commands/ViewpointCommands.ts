import * as vscode from 'vscode';

/**
 * 视点模块命令
 * 空实现，待后续迁移
 */
export class ViewpointCommands {
  constructor() {}

  /**
   * 注册所有命令和 WebviewView
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // 创建自定义视点
    const createViewpointCommand = vscode.commands.registerCommand(
      'archi.viewpoint.create',
      async () => {
        vscode.window.showInformationMessage('archi.viewpoint.create - 待实现');
      }
    );

    context.subscriptions.push(createViewpointCommand);
  }
}
