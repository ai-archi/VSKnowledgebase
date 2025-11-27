import * as vscode from 'vscode';
import { AIApplicationService } from '../application/AIApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { ViewpointApplicationService } from '../../viewpoint/application/ViewpointApplicationService';
import { ChangeRepository } from '../../shared/infrastructure/ChangeRepository';
import { Artifact } from '../../shared/domain/artifact';
import { Logger } from '../../../core/logger/Logger';

/**
 * AI 模块命令
 */
export class AICommands {
  constructor(
    private aiService: AIApplicationService,
    private artifactService: ArtifactFileSystemApplicationService,
    private vaultService: VaultApplicationService,
    private viewpointService: ViewpointApplicationService,
    private changeRepository: ChangeRepository,
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
          let artifact: Artifact | null = null;
          
          if (!artifactId) {
            // 从当前活动编辑器获取
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
              vscode.window.showErrorMessage('请先打开一个文档或选择 Artifact');
              return;
            }
            
            // 从文件路径推断 artifactId
            const filePath = editor.document.uri.fsPath;
            const artifactResult = await this.viewpointService.getArtifactByPath(filePath);
            if (!artifactResult.success || !artifactResult.value) {
              vscode.window.showErrorMessage('当前文件不是 Artifact 文件，无法进行分析');
              return;
            }
            
            artifact = artifactResult.value;
            artifactId = artifact.id;
          } else {
            // 如果提供了 artifactId，尝试查找 Artifact 信息
            const vaultsResult = await this.vaultService.listVaults();
            if (vaultsResult.success) {
              for (const vault of vaultsResult.value) {
                const artifactResult = await this.artifactService.getArtifact(vault.id, artifactId);
                if (artifactResult.success && artifactResult.value) {
                  artifact = artifactResult.value;
                  break;
                }
              }
            }
          }

          if (!artifact) {
            vscode.window.showErrorMessage('无法找到 Artifact 信息，无法进行分析');
            return;
          }

          const vaultName = artifact.vault.name;

          // 获取最近的变更
          const recentChangesResult = await this.changeRepository.findByArtifact(artifactId, vaultName);
          if (!recentChangesResult.success) {
            vscode.window.showErrorMessage(`获取变更记录失败: ${recentChangesResult.error.message}`);
            return;
          }

          const recentChanges = recentChangesResult.value;
          if (recentChanges.length === 0) {
            vscode.window.showInformationMessage('该 Artifact 暂无变更记录');
            return;
          }

          // 使用最近的变更进行分析
          const latestChange = recentChanges[0];
          const impactResult = await this.aiService.analyzeImpact(artifactId, latestChange);

          if (impactResult.success) {
            // 在输出面板显示分析结果
            const outputChannel = vscode.window.createOutputChannel('ArchiTool AI');
            outputChannel.appendLine(`影响分析结果 (Artifact: ${artifactId}):`);
            outputChannel.appendLine('');
            outputChannel.appendLine(`影响原因: ${impactResult.value.impactReason}`);
            outputChannel.appendLine(`严重程度: ${impactResult.value.severity}`);
            if (impactResult.value.impactedArtifacts && impactResult.value.impactedArtifacts.length > 0) {
              outputChannel.appendLine('');
              outputChannel.appendLine('受影响的 Artifact:');
              impactResult.value.impactedArtifacts.forEach(id => {
                outputChannel.appendLine(`  - ${id}`);
              });
            }
            if (impactResult.value.suggestions && impactResult.value.suggestions.length > 0) {
              outputChannel.appendLine('');
              outputChannel.appendLine('建议操作:');
              impactResult.value.suggestions.forEach(suggestion => {
                outputChannel.appendLine(`  - ${suggestion}`);
              });
            }
            outputChannel.show();
          } else {
            vscode.window.showErrorMessage(`影响分析失败: ${impactResult.error.message}`);
          }
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

