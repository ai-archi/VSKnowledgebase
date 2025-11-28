import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { ArtifactTreeApplicationService } from '../../shared/application/ArtifactTreeApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider, DocumentTreeItem } from './DocumentTreeViewProvider';
import { WebviewAdapter } from '../../../core/vscode-api/WebviewAdapter';
import { BaseFileTreeCommands } from '../../shared/interface/commands/BaseFileTreeCommands';
import { FileTreeDomainService } from '../../shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService } from '../../shared/domain/services/FileOperationDomainService';
import { PathUtils } from '../../shared/infrastructure/utils/PathUtils';
import * as path from 'path';

export class DocumentCommands extends BaseFileTreeCommands<DocumentTreeItem> {
  constructor(
    private documentService: DocumentApplicationService,
    artifactService: ArtifactFileSystemApplicationService,
    treeService: ArtifactTreeApplicationService,
    vaultService: VaultApplicationService,
    fileTreeDomainService: FileTreeDomainService,
    fileOperationDomainService: FileOperationDomainService,
    logger: Logger,
    context: vscode.ExtensionContext,
    treeViewProvider: DocumentTreeViewProvider,
    treeView: vscode.TreeView<vscode.TreeItem>,
    webviewAdapter: WebviewAdapter
  ) {
    super(
      vaultService,
      treeService,
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

  // ==================== 实现抽象方法 ====================

  protected getRefreshCommandName(): string {
    return 'archi.document.refresh';
      }

  protected getExpandAllCommandName(): string {
    return 'archi.document.expandAll';
    }

  protected getCollapseAllCommandName(): string {
    return 'archi.document.collapseAll';
  }

  protected getCreateFileCommandName(): string {
    return 'archi.document.addFile';
  }

  protected getCreateFolderCommandName(): string {
    return 'archi.document.addFolder';
  }

  protected getDeleteCommandName(): string {
    return 'archi.document.delete';
    }

  protected async handleDelete(item: DocumentTreeItem): Promise<void> {
      if (item.vaultName) {
        // 删除 vault
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
      } else if (item.artifact || item.filePath) {
        // 删除文档
        const filePath = item.artifact?.path || item.filePath!;
        const vaultId = item.artifact?.vault.id || item.vaultId!;
        const fileName = item.artifact?.title || path.basename(filePath);
        
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete '${fileName}'? This action cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (confirm !== 'Delete') {
          return;
        }

        const result = await this.documentService.deleteDocument(vaultId, filePath);

        if (result.success) {
          vscode.window.showInformationMessage(`Document '${fileName}' deleted`);
          this.treeViewProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to delete document: ${result.error.message}`);
        }
      } else {
        vscode.window.showErrorMessage('Please select a vault or document to delete');
      }
  }

  // ==================== 注册特定命令 ====================

  protected registerSpecificCommands(commandAdapter: CommandAdapter): void {
    // 注册文档特定命令
    commandAdapter.registerCommands([
      {
        command: 'archi.document.create',
        callback: async () => {
          const vaultsResult = await this.vaultService.listVaults();
          if (!vaultsResult.success || vaultsResult.value.length === 0) {
            vscode.window.showErrorMessage('No vaults available');
      return;
    }

          const vaultItems = vaultsResult.value.map(v => ({
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

          const documentName = await vscode.window.showInputBox({
            prompt: 'Enter document name',
          });

          if (!documentName) {
            return;
      }

          const result = await this.documentService.createDocument(
            selectedVault.id,
            `note/${documentName}.md`,
            documentName,
            `# ${documentName}\n\n`
          );

          if (result.success) {
            vscode.window.showInformationMessage(`Document created: ${documentName}`);
            this.treeViewProvider.refresh();
            const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
            await vscode.window.showTextDocument(doc);
          } else {
            vscode.window.showErrorMessage(`Failed to create document: ${result.error.message}`);
          }
        },
      },
      {
        command: 'archi.document.addDiagram',
        callback: async (item?: DocumentTreeItem) => {
          await this.addDiagram(item);
        },
      },
    ]);
  }

  /**
   * 添加设计图（文档特定命令）
   */
  private async addDiagram(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultInfo = await this.validateAndGetVault(item, 'add diagram');
      if (!vaultInfo) {
      return;
    }
      const { vault, vaultName } = vaultInfo;

      const diagramName = await vscode.window.showInputBox({
        prompt: 'Enter diagram name (without extension)',
        validateInput: (value) => PathUtils.validateFileName(value),
      });

      if (!diagramName) return;

      // 选择图表类型
      const diagramType = await vscode.window.showQuickPick(
        [
          { label: 'Mermaid', value: 'mermaid', description: 'Mermaid diagram (.mmd)' },
          { label: 'PlantUML', value: 'puml', description: 'PlantUML diagram (.puml)' },
          { label: 'Archimate', value: 'archimate', description: 'Archimate diagram (.archimate)' },
        ],
        {
          placeHolder: 'Select diagram type',
        }
      );

      if (!diagramType) return;

      // 确定文件路径和扩展名
      const extension =
        diagramType.value === 'mermaid'
          ? 'mmd'
          : diagramType.value === 'puml'
          ? 'puml'
          : 'archimate';
      let diagramPath: string;
      let targetFolderPath: string | undefined;

      if (item?.folderPath !== undefined || item?.artifact) {
        // 如果在文件夹或文档节点上右键，使用标准路径计算
        const pathInfo = this.fileTreeDomainService.calculateTargetPath(item, diagramName, extension);
        diagramPath = pathInfo.targetPath;
        targetFolderPath = pathInfo.targetFolderPath;
      } else {
        // 如果是在 vault 节点上右键，在 diagrams 文件夹下创建
        diagramPath = `diagrams/${diagramName}.${extension}`;
        targetFolderPath = 'diagrams';
        }
        
      // 创建设计图文件
      const content = this.fileOperationDomainService.generateDefaultContent(
        diagramName,
        diagramType.value
      );
      const result = await this.fileOperationService.createArtifact({
        vault: {
          id: vault.id,
          name: vault.name,
        },
        path: diagramPath,
        title: diagramName,
        content,
        viewType: 'design',
        format: extension,
      });

      if (result.success) {
        await this.handleCreateSuccess(
          `Diagram '${diagramName}'`,
          vaultName,
          result.value.contentLocation,
          targetFolderPath
        );
      } else {
        vscode.window.showErrorMessage(`Failed to create diagram: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add diagram', error);
      vscode.window.showErrorMessage(`Failed to add diagram: ${error.message}`);
  }
}
}
