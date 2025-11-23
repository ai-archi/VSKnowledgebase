import * as vscode from 'vscode';
import { ViewpointApplicationService } from '../application/ViewpointApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 视点模块命令
 */
export class ViewpointCommands {
  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
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

        // 获取 Vault 列表并让用户选择
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          vscode.window.showErrorMessage('没有可用的 Vault。请先创建一个 Vault。');
          return;
        }

        let vaultId: string;
        if (vaultsResult.value.length === 1) {
          // 如果只有一个 Vault，直接使用
          vaultId = vaultsResult.value[0].id;
        } else {
          // 多个 Vault，让用户选择
          const vaultItems = vaultsResult.value.map(v => ({
            label: v.name,
            description: v.description || (v.readOnly ? 'Git vault' : 'Local vault'),
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: '选择要创建视点的 Vault',
          });

          if (!selectedVault) {
            return; // 用户取消
          }

          vaultId = selectedVault.id;
        }

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

