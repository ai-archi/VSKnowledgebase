import * as vscode from 'vscode';
import * as path from 'path';
import { TemplateApplicationService } from '../application/TemplateApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter, CommandDefinition } from '../../../core/vscode-api/CommandAdapter';
import { TemplateTreeDataProvider, TemplateTreeItem } from './TemplateTreeDataProvider';
import { WebviewAdapter } from '../../../core/vscode-api/WebviewAdapter';
import { BaseFileTreeCommands } from '../../shared/interface/commands/BaseFileTreeCommands';
import { FileTreeDomainService } from '../../shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService } from '../../shared/domain/services/FileOperationDomainService';
import { PathUtils } from '../../shared/infrastructure/utils/PathUtils';

export class TemplateCommands extends BaseFileTreeCommands<TemplateTreeItem> {
  constructor(
    private templateService: TemplateApplicationService,
    artifactService: ArtifactApplicationService,
    vaultService: VaultApplicationService,
    fileTreeDomainService: FileTreeDomainService,
    fileOperationDomainService: FileOperationDomainService,
    logger: Logger,
    context: vscode.ExtensionContext,
    treeViewProvider: TemplateTreeDataProvider,
    treeView: vscode.TreeView<vscode.TreeItem>,
    webviewAdapter: WebviewAdapter
  ) {
    super(
      vaultService,
      artifactService,
      fileTreeDomainService,
      fileOperationDomainService,
      logger,
      context,
      treeViewProvider,
      treeView,
      webviewAdapter
    );
  }

  /**
   * 注册所有命令
   */
  register(commandAdapter: CommandAdapter): void {
    // 注册基础命令（刷新、展开、折叠、删除）
    const commands: CommandDefinition[] = [
      {
        command: this.getRefreshCommandName(),
        callback: () => {
          this.treeViewProvider.refresh();
        },
      },
      {
        command: this.getExpandAllCommandName(),
        callback: async () => {
          await this.expandAll();
        },
      },
      {
        command: this.getCollapseAllCommandName(),
        callback: async () => {
          await this.collapseAll();
        },
      },
      {
        command: this.getDeleteCommandName(),
        callback: async (item?: TemplateTreeItem) => {
          await this.deleteItem(item);
        },
      },
    ];
    commandAdapter.registerCommands(commands);

    // 注册特定命令
    this.registerSpecificCommands(commandAdapter);
  }

  // ==================== 实现抽象方法 ====================

  protected getRefreshCommandName(): string {
    return 'archi.template.refresh';
  }

  protected getExpandAllCommandName(): string {
    return 'archi.template.expandAll';
  }

  protected getCollapseAllCommandName(): string {
    return 'archi.template.collapseAll';
  }

  protected getCreateFileCommandName(): string {
    return 'archi.template.addFile';
  }

  protected getCreateFolderCommandName(): string {
    return 'archi.template.addFolder';
  }

  protected getDeleteCommandName(): string {
    return 'archi.template.delete';
  }

  protected async handleDelete(item: TemplateTreeItem): Promise<void> {
    // 先判断是否是文件或文件夹（优先级高于 vault）
    if (item.filePath || item.folderPath !== undefined) {
      // 删除文件或文件夹
      let filePath: string;
      let vaultId: string;
      let fileName: string;
      let isFolder = false;

      if (item.filePath) {
        filePath = item.filePath;
        vaultId = item.vaultId!;
        fileName = path.basename(filePath);
      } else if (item.folderPath !== undefined) {
        filePath = item.folderPath;
        vaultId = item.vaultId!;
        fileName = path.basename(item.folderPath) || item.folderPath;
        isFolder = true;
      } else {
        vscode.window.showErrorMessage('Unable to determine item to delete');
        return;
      }

      const vault = await this.findVaultByName(item.vaultName!);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${item.vaultName}`);
        return;
      }

      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete ${isFolder ? 'folder' : 'file'} '${fileName}'? This action cannot be undone.`,
        { modal: true },
        'Delete'
      );

      if (confirm !== 'Delete') {
        return;
      }

      const result = await this.artifactService.delete(
        { id: vaultId, name: item.vaultName! },
        filePath,
        isFolder
      );

      if (result.success) {
        vscode.window.showInformationMessage(`${isFolder ? 'Folder' : 'File'} '${fileName}' deleted`);
        this.treeViewProvider.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to delete ${isFolder ? 'folder' : 'file'}: ${result.error.message}`);
      }
    } else if (item.vaultName && item.folderPath === undefined && item.filePath === undefined) {
      // 删除 vault（只有在没有 folderPath 和 filePath 的情况下才是 vault 节点）
      const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to delete vault '${item.vaultName}'? This action cannot be undone.`,
        { modal: true },
        'Delete'
      );

      if (confirm !== 'Delete') {
        return;
      }

      const vaultName = item.vaultName;
      if (!vaultName) {
        vscode.window.showErrorMessage('Vault name not found');
        return;
      }

      const vault = await this.findVaultByName(vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      const result = await this.vaultService.removeVault(vault.id);
      if (result.success) {
        vscode.window.showInformationMessage(`Vault '${vaultName}' deleted`);
        this.treeViewProvider.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to delete vault: ${result.error.message}`);
      }
    } else {
      vscode.window.showErrorMessage('Please select a vault, folder, or file to delete');
    }
  }

  // ==================== 注册特定命令 ====================

  protected registerSpecificCommands(commandAdapter: CommandAdapter): void {
    // 注册模板视图特定的命令
    commandAdapter.registerCommands([
      {
        command: this.getCreateFileCommandName(),
        callback: async (item?: TemplateTreeItem) => {
          await this.showCreateTemplateFileDialog(item);
        },
      },
      {
        command: this.getCreateFolderCommandName(),
        callback: async (item?: TemplateTreeItem) => {
          await this.showCreateTemplateFolderDialog(item);
        },
      },
      {
        command: 'archi.template.addArchimateDesign',
        callback: async (item?: TemplateTreeItem) => {
          await this.showCreateTemplateDesignDialog(item, 'archimate');
        },
      },
      {
        command: 'archi.template.addPlantUMLDesign',
        callback: async (item?: TemplateTreeItem) => {
          await this.showCreateTemplateDesignDialog(item, 'puml');
        },
      },
      {
        command: 'archi.template.addMermaidDesign',
        callback: async (item?: TemplateTreeItem) => {
          await this.showCreateTemplateDesignDialog(item, 'mermaid');
        },
      },
      {
        command: 'archi.template.createFromTemplate',
        callback: async (template?: any) => {
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

          // 获取模板
          const templatesResult = await this.templateService.getTemplates(selectedVault.id);
          if (!templatesResult.success || templatesResult.value.length === 0) {
            vscode.window.showInformationMessage('No templates found');
            return;
          }

          // 选择模板
          const templateItems = templatesResult.value.map(t => ({
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
        },
      },
    ]);
  }

  /**
   * 显示创建模板文件对话框
   */
  private async showCreateTemplateFileDialog(item?: TemplateTreeItem): Promise<void> {
    try {
      const vault = await this.validateAndGetVault(item, 'create');
      if (!vault) {
        return;
      }

      // 输入文件名
      const fileName = await vscode.window.showInputBox({
        prompt: 'Enter template file name',
        placeHolder: '例如：my-template',
      });

      if (!fileName) {
        return;
      }

      // 计算目标路径（在 templates 目录下）
      const { targetPath, targetFolderPath } = this.fileTreeDomainService.calculateTargetPath(
        item,
        fileName,
        'md'
      );

      // 确保路径在 templates 目录下
      const templatePath = targetPath.startsWith('templates/') 
        ? targetPath 
        : `templates/${targetPath}`;

      // 创建文件
      const vaultRef = { id: vault.vault.id, name: vault.vaultName };
      const defaultContent = `# ${fileName}\n\n`;
      const writeResult = await this.artifactService.writeFile(vaultRef, templatePath, defaultContent);

      if (writeResult.success) {
        await this.handleCreateSuccess(fileName, vault.vaultName, this.artifactService.getFullPath(vaultRef, templatePath), targetFolderPath);
      } else {
        vscode.window.showErrorMessage(`Failed to create template file: ${writeResult.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to create template file', error);
      vscode.window.showErrorMessage(`Failed to create template file: ${error.message}`);
    }
  }

  /**
   * 显示创建模板文件夹对话框
   */
  private async showCreateTemplateFolderDialog(item?: TemplateTreeItem): Promise<void> {
    try {
      const vault = await this.validateAndGetVault(item, 'create');
      if (!vault) {
        return;
      }

      // 输入文件夹名
      const folderName = await vscode.window.showInputBox({
        prompt: 'Enter template folder name',
        placeHolder: '例如：my-templates',
      });

      if (!folderName) {
        return;
      }

      // 计算目标路径（在 templates 目录下）
      const { targetPath, targetFolderPath } = this.fileTreeDomainService.calculateTargetPath(
        item,
        folderName,
        ''
      );

      // 确保路径在 templates 目录下
      const templatePath = targetPath.startsWith('templates/') 
        ? targetPath 
        : `templates/${targetPath}`;

      // 创建文件夹
      const vaultRef = { id: vault.vault.id, name: vault.vaultName };
      const createDirResult = await this.artifactService.createDirectory(vaultRef, templatePath);

      if (createDirResult.success) {
        await this.handleCreateSuccess(folderName, vault.vaultName, '', targetFolderPath, false);
      } else {
        vscode.window.showErrorMessage(`Failed to create template folder: ${createDirResult.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to create template folder', error);
      vscode.window.showErrorMessage(`Failed to create template folder: ${error.message}`);
    }
  }

  /**
   * 显示创建模板设计图对话框
   */
  private async showCreateTemplateDesignDialog(item?: TemplateTreeItem, designType?: string): Promise<void> {
    try {
      const vault = await this.validateAndGetVault(item, 'create');
      if (!vault) {
        return;
      }

      // 输入设计图名称
      const designName = await vscode.window.showInputBox({
        prompt: `Enter ${designType} design template name`,
        placeHolder: '例如：my-design',
      });

      if (!designName) {
        return;
      }

      // 确定文件扩展名
      const extension = designType === 'archimate' ? 'archimate' : designType === 'puml' ? 'puml' : 'mmd';
      const fileExtension = designType === 'archimate' ? '.archimate' : designType === 'puml' ? '.puml' : '.mmd';

      // 计算目标路径（在 templates/content 目录下）
      const { targetPath, targetFolderPath } = this.fileTreeDomainService.calculateTargetPath(
        item,
        designName,
        extension
      );

      // 确保路径在 templates/content 目录下
      let templatePath: string;
      if (targetPath.startsWith('templates/content/')) {
        templatePath = targetPath;
      } else if (targetPath.startsWith('templates/')) {
        templatePath = `templates/content/${targetPath.substring('templates/'.length)}`;
      } else {
        templatePath = `templates/content/${targetPath}`;
      }

      // 生成默认内容
      const defaultContent = this.fileOperationDomainService.generateDefaultContent(designName, designType);

      // 创建文件
      const vaultRef = { id: vault.vault.id, name: vault.vaultName };
      const writeResult = await this.artifactService.writeFile(vaultRef, templatePath, defaultContent);

      if (writeResult.success) {
        await this.handleCreateSuccess(designName, vault.vaultName, this.artifactService.getFullPath(vaultRef, templatePath), targetFolderPath);
      } else {
        vscode.window.showErrorMessage(`Failed to create design template: ${writeResult.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to create design template', error);
      vscode.window.showErrorMessage(`Failed to create design template: ${error.message}`);
    }
  }

}

