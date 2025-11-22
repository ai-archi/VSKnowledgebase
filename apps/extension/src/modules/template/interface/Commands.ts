import * as vscode from 'vscode';
import { TemplateApplicationService } from '../application/TemplateApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 模板模块命令
 */
export class TemplateCommands {
  constructor(
    private templateService: TemplateApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {}

  /**
   * 注册所有命令
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // 从模板创建 Artifact
    const createFromTemplateCommand = vscode.commands.registerCommand(
      'archi.template.createFromTemplate',
      async (template?: any) => {
        try {
          // 获取所有 Vault
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available');
            return;
          }

          // 过滤可写 Vault
          const writableVaults = vaultsResult.value.filter(v => !v.readOnly);
          if (writableVaults.length === 0) {
            vscode.window.showErrorMessage('No writable vaults available');
            return;
          }

          // 选择 Vault
          const vaultItems = writableVaults.map(v => ({
            label: v.name,
            description: v.description,
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: 'Select a vault',
          });

          if (!selectedVault) {
            return;
          }

          // 获取模板库
          const librariesResult = await this.templateService.getTemplateLibraries(selectedVault.id);
          if (!librariesResult.success || librariesResult.value.length === 0) {
            vscode.window.showInformationMessage('No template libraries found');
            return;
          }

          // 选择模板库
          const libraryItems = librariesResult.value.map(lib => ({
            label: lib.name,
            description: lib.description,
            library: lib,
          }));

          const selectedLibrary = await vscode.window.showQuickPick(libraryItems, {
            placeHolder: 'Select a template library',
          });

          if (!selectedLibrary) {
            return;
          }

          // 选择模板
          const templateItems = selectedLibrary.library.templates.map(t => ({
            label: t.name,
            description: t.description || `${t.type} template`,
            template: t,
          }));

          const selectedTemplate = await vscode.window.showQuickPick(templateItems, {
            placeHolder: 'Select a template',
          });

          if (!selectedTemplate) {
            return;
          }

          // 输入标题
          const title = await vscode.window.showInputBox({
            prompt: 'Enter artifact title',
            placeHolder: '例如：用户登录功能设计',
          });

          if (!title) {
            return;
          }

          // 收集模板变量
          const variables: Record<string, string> = {};
          if (selectedTemplate.template.variables && selectedTemplate.template.variables.length > 0) {
            for (const variable of selectedTemplate.template.variables) {
              const value = await vscode.window.showInputBox({
                prompt: `Enter value for variable: ${variable}`,
                placeHolder: `{{${variable}}}`,
              });
              if (value !== undefined) {
                variables[variable] = value;
              }
            }
          }

          // 创建 Artifact
          const result = await this.templateService.createArtifactFromTemplate({
            templateId: selectedTemplate.template.id,
            vaultId: selectedVault.id,
            title,
            variables,
          });

          if (result.success) {
            vscode.window.showInformationMessage(`Artifact '${title}' created from template successfully`);
            // 打开新创建的文档
            if (result.value.contentLocation) {
              const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
              await vscode.window.showTextDocument(doc);
            }
          } else {
            vscode.window.showErrorMessage(`Failed to create artifact: ${result.error.message}`);
          }
        } catch (error: any) {
          this.logger.error('Error creating artifact from template', error);
          vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
      }
    );

    context.subscriptions.push(createFromTemplateCommand);
  }
}

