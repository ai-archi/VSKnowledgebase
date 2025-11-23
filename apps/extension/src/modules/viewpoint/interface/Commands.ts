import * as vscode from 'vscode';
import { ViewpointApplicationService } from '../application/ViewpointApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 视点模块命令
 */
export class ViewpointCommands {
  constructor(
    private viewpointService: ViewpointApplicationService,
    private logger: Logger
  ) {}

  /**
   * 注册所有命令
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // 创建自定义视点
    const createViewpointCommand = vscode.commands.registerCommand(
      'archi.viewpoint.create',
      async () => {
        const name = await vscode.window.showInputBox({
          prompt: '输入视点名称',
          placeHolder: '例如：前端开发视图',
        });

        if (!name) {
          return;
        }

        const description = await vscode.window.showInputBox({
          prompt: '输入视点描述（可选）',
          placeHolder: '例如：聚焦前端开发相关的文档',
        });

        const requiredTagsInput = await vscode.window.showInputBox({
          prompt: '输入必须包含的标签（用逗号分隔，可选）',
          placeHolder: '例如：frontend,react',
        });

        const requiredTags = requiredTagsInput
          ? requiredTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : undefined;

        // 获取当前 Vault（简化处理，使用第一个 Vault）
        // TODO: 允许用户选择 Vault
        const vaultId = 'default'; // 临时值

        const result = await this.viewpointService.createViewpoint(vaultId, {
          type: 'tag', // 自定义视点默认为标签视点
          name,
          description,
          requiredTags,
        });

        if (result.success) {
          vscode.window.showInformationMessage(`视点 '${name}' 创建成功`);
        } else {
          vscode.window.showErrorMessage(`创建视点失败: ${result.error.message}`);
        }
      }
    );

    context.subscriptions.push(createViewpointCommand);
  }
}

