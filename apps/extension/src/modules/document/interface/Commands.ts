import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider, DocumentTreeItem } from './DocumentTreeViewProvider';
import { WebviewAdapter } from '../../../core/vscode-api/WebviewAdapter';
import { BaseFileTreeCommands } from '../../shared/interface/commands/BaseFileTreeCommands';
import { FileTreeDomainService } from '../../shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService } from '../../shared/domain/services/FileOperationDomainService';
import { PathUtils } from '../../shared/infrastructure/utils/PathUtils';
import { EventBus } from '../../../core/eventbus/EventBus';
import * as path from 'path';

export class DocumentCommands extends BaseFileTreeCommands<DocumentTreeItem> {
  constructor(
    private documentService: DocumentApplicationService,
    artifactService: ArtifactApplicationService,
    vaultService: VaultApplicationService,
    fileTreeDomainService: FileTreeDomainService,
    fileOperationDomainService: FileOperationDomainService,
    logger: Logger,
    context: vscode.ExtensionContext,
    treeViewProvider: DocumentTreeViewProvider,
    treeView: vscode.TreeView<vscode.TreeItem>,
    webviewAdapter: WebviewAdapter,
    eventBus: EventBus
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

    // 监听文档创建事件，自动刷新视图
    eventBus.on('document:created', async (data: { artifact: any; vaultName: string; folderPath: string }) => {
      this.logger.info('Document created event received, refreshing view', data);
      this.treeViewProvider.refresh();
      if (data.vaultName) {
        // 如果 folderPath 为空字符串，只展开 vault；否则展开到文件夹路径
        const pathToExpand = data.folderPath && data.folderPath.trim() !== '' ? data.folderPath : undefined;
        await this.expandNode(data.vaultName, pathToExpand);
        this.treeViewProvider.refresh();
      }
    });

    // 监听文件夹创建事件，自动刷新视图
    eventBus.on('folder:created', async (data: { vaultName: string; folderPath: string; parentFolderPath: string }) => {
      this.logger.info('Folder created event received, refreshing view', data);
      this.treeViewProvider.refresh();
      if (data.vaultName) {
        // 展开父文件夹，以便能看到新创建的文件夹
        // 如果 parentFolderPath 为空，说明在根目录下创建，只展开 vault
        const pathToExpand = data.parentFolderPath && data.parentFolderPath.trim() !== '' 
          ? data.parentFolderPath 
          : undefined;
        await this.expandNode(data.vaultName, pathToExpand);
        this.treeViewProvider.refresh();
      }
    });
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
      // 先判断是否是文件或文件夹（优先级高于 vault）
      if (item.artifact || item.filePath || item.folderPath !== undefined) {
        // 删除文档或文件夹
        let filePath: string;
        let vaultId: string;
        let fileName: string;
        let isFolder = false;

        if (item.artifact) {
          filePath = item.artifact.path;
          vaultId = item.artifact.vault.id;
          fileName = item.artifact.title;
        } else if (item.filePath) {
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
        
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete ${isFolder ? 'folder' : 'file'} '${fileName}'? This action cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (confirm !== 'Delete') {
          return;
        }

        const result = await this.documentService.deleteDocument(vaultId, filePath);

        if (result.success) {
          vscode.window.showInformationMessage(`${isFolder ? 'Folder' : 'Document'} '${fileName}' deleted`);
          this.treeViewProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to delete ${isFolder ? 'folder' : 'document'}: ${result.error.message}`);
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
        vscode.window.showErrorMessage('Please select a vault, folder, or document to delete');
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
      // Archimate 格式支持已移除
      // {
      //   command: 'archi.document.addArchimateDesign',
      //   callback: async (item?: DocumentTreeItem) => {
      //     await this.showCreateDesignDialog(item, 'archimate');
      //   },
      // },
      {
        command: 'archi.document.addPlantUMLDesign',
        callback: async (item?: DocumentTreeItem) => {
          await this.showCreateDesignDialog(item, 'puml');
        },
      },
      {
        command: 'archi.document.addMermaidDesign',
        callback: async (item?: DocumentTreeItem) => {
          await this.showCreateDesignDialog(item, 'mermaid');
        },
      },
      {
        command: 'archi.document.editRelations',
        callback: async (item?: DocumentTreeItem) => {
          await this.editRelations(item);
        },
      },
    ]);
  }

  /**
   * 编辑关联关系
   */
  private async editRelations(item?: DocumentTreeItem): Promise<void> {
    await this.showEditRelationsDialog(item);
  }

  /**
   * 显示编辑关联关系对话框
   */
  private async showEditRelationsDialog(item?: DocumentTreeItem): Promise<void> {
    try {
      // 获取选中的项
      if (!item) {
        const selection = this.treeView.selection;
        if (selection.length === 0) {
          vscode.window.showErrorMessage('Please select an item to edit relations');
      return;
    }
        item = selection[0] as DocumentTreeItem;
      }

      // 确定目标类型和ID
      let targetType: 'artifact' | 'file' | 'folder' | 'vault';
      let targetId: string;
      let vaultId: string;
      let displayName: string;

      if (item.vaultName && !item.folderPath && !item.filePath && !item.artifact) {
        // Vault节点
        targetType = 'vault';
        const vault = await this.findVaultByName(item.vaultName);
        if (!vault) {
          vscode.window.showErrorMessage(`Vault not found: ${item.vaultName}`);
          return;
        }
        vaultId = vault.id;
        targetId = vault.id;
        displayName = `Vault: ${item.vaultName}`;
      } else if (item.folderPath !== undefined) {
        // 文件夹节点
        targetType = 'folder';
        if (!item.vaultId) {
          const vault = await this.findVaultByName(item.vaultName!);
          if (!vault) {
            vscode.window.showErrorMessage(`Vault not found: ${item.vaultName}`);
            return;
          }
          vaultId = vault.id;
        } else {
          vaultId = item.vaultId;
        }
        targetId = item.folderPath;
        displayName = `Folder: ${item.folderPath}`;
      } else if (item.artifact) {
        // Artifact节点
        targetType = 'artifact';
        vaultId = item.artifact.vault.id;
        targetId = item.artifact.id;
        displayName = `Document: ${item.artifact.title}`;
      } else if (item.filePath) {
        // 文件节点（未索引的文件）
        targetType = 'file';
        if (!item.vaultId) {
          const vault = await this.findVaultByName(item.vaultName!);
          if (!vault) {
            vscode.window.showErrorMessage(`Vault not found: ${item.vaultName}`);
            return;
          }
          vaultId = vault.id;
        } else {
          vaultId = item.vaultId;
        }
        targetId = item.filePath;
        displayName = `File: ${path.basename(item.filePath)}`;
      } else {
        vscode.window.showErrorMessage('Unable to determine item type');
        return;
      }

      // 创建新的 webview panel
      const webviewDistPath = this.getWebviewDistPath();

      const panel = vscode.window.createWebviewPanel(
        'editRelationsDialog',
        `Edit Relations - ${displayName}`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: false,
          localResourceRoots: [vscode.Uri.file(webviewDistPath)],
        }
      );

      // 设置 webview 消息处理器
      panel.webview.onDidReceiveMessage(
        async (message: any) => {
          this.logger.info(`[DocumentCommands] Received message in editRelations dialog: ${message.method}`, { id: message.id, params: message.params });
          if (message.method === 'close') {
            panel.dispose();
            return;
          }
          this.logger.info(`[DocumentCommands] Forwarding message to WebviewAdapter: ${message.method}`);
          await this.webviewAdapter.handleMessage(panel.webview, message);
        },
        null,
        this.context.subscriptions
      );

      // 加载 webview 内容
      const htmlContent = await this.getWebviewContent(
        panel.webview,
        'edit-relations-dialog.html',
        vaultId,
        undefined,
        undefined,
        {
          vaultId,
          targetId,
          targetType,
          displayName,
        }
      );
      panel.webview.html = htmlContent;

      // 监听面板关闭事件
      panel.onDidDispose(() => {
        this.treeViewProvider.refresh();
      });
    } catch (error: any) {
      this.logger.error('Failed to show edit relations dialog', error);
      vscode.window.showErrorMessage(`Failed to show edit relations dialog: ${error.message}`);
  }
}
}
