import * as vscode from 'vscode';
import { AIApplicationService } from '../application/AIApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * AI 模块命令
 */
export class AICommands {
  constructor(
    private aiService: AIApplicationService,
    private artifactService: ArtifactFileSystemApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {}

  /**
   * 注册所有命令
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // 分析变更影响
    const analyzeImpactCommand = vscode.commands.registerCommand(
      'archi.ai.analyzeImpact',
      async (artifactId?: string) => {
        try {
          if (!artifactId) {
            // 从当前活动编辑器获取
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              vscode.window.showErrorMessage('请先打开一个文档或选择 Artifact');
              return;
            }
            // TODO: 从文件路径推断 artifactId
            vscode.window.showInformationMessage('分析影响功能需要 Artifact ID');
            return;
          }

          // 获取最近的变更
          // TODO: 从 ChangeRepository 获取最近的变更
          vscode.window.showInformationMessage('影响分析功能需要变更记录');
        } catch (error: any) {
          this.logger.error('Error analyzing impact', error);
          vscode.window.showErrorMessage(`分析失败: ${error.message}`);
        }
      }
    );

    // 生成提示
    const generatePromptCommand = vscode.commands.registerCommand(
      'archi.ai.generatePrompt',
      async () => {
        try {
          const purpose = await vscode.window.showQuickPick(
            [
              { label: '创建文档', value: 'create' },
              { label: '更新文档', value: 'update' },
              { label: '评审文档', value: 'review' },
              { label: '分析文档', value: 'analyze' },
            ],
            { placeHolder: '选择提示目的' }
          );

          if (!purpose) {
            return;
          }

          const promptResult = await this.aiService.generatePrompt({
            context: {},
            purpose: purpose.value as any,
          });

          if (promptResult.success) {
            // 在输出面板显示提示
            const outputChannel = vscode.window.createOutputChannel('ArchiTool AI');
            outputChannel.appendLine('生成的提示：');
            outputChannel.appendLine(promptResult.value);
            outputChannel.show();
          } else {
            vscode.window.showErrorMessage(`生成提示失败: ${promptResult.error.message}`);
          }
        } catch (error: any) {
          this.logger.error('Error generating prompt', error);
          vscode.window.showErrorMessage(`生成失败: ${error.message}`);
        }
      }
    );

    context.subscriptions.push(analyzeImpactCommand, generatePromptCommand);
  }
}

