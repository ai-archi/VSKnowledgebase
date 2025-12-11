import * as vscode from 'vscode';

/**
 * AI 模块命令
 * 空实现，待后续迁移
 */
export class AICommands {
  constructor() {}

  /**
   * 注册所有命令
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // 分析变更影响
    const analyzeImpactCommand = vscode.commands.registerCommand(
      'archi.ai.analyzeImpact',
      async () => {
        vscode.window.showInformationMessage('archi.ai.analyzeImpact - 待实现');
      }
    );

    // 生成提示
    const generatePromptCommand = vscode.commands.registerCommand(
      'archi.ai.generatePrompt',
      async () => {
        vscode.window.showInformationMessage('archi.ai.generatePrompt - 待实现');
      }
    );

    context.subscriptions.push(analyzeImpactCommand, generatePromptCommand);
  }
}
