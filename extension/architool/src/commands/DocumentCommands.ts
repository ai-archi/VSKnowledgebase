import * as vscode from 'vscode';
import * as path from 'path';
import { DocumentApplicationService } from '../modules/document/application/DocumentApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { Logger } from '../core/logger/Logger';
import { CommandAdapter } from '../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider, DocumentTreeItem } from '../views/DocumentTreeViewProvider';
import { WebviewAdapter } from '../core/vscode-api/WebviewAdapter';
import { BaseFileTreeCommands } from '../modules/shared/interface/commands/BaseFileTreeCommands';
import { FileTreeDomainService } from '../modules/shared/domain/services/FileTreeDomainService';
import { FileOperationDomainService } from '../modules/shared/domain/services/FileOperationDomainService';

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

    // TODO: EventBus 相关功能待后续实现
    // 监听文档创建事件，自动刷新视图
    // eventBus.on('document:created', async (data: { artifact: any; vaultName: string; folderPath: string }) => {
    //   this.logger.info('Document created event received, refreshing view', data);
    //   this.treeViewProvider.refresh();
    //   if (data.vaultName) {
    //     const pathToExpand = data.folderPath && data.folderPath.trim() !== '' ? data.folderPath : undefined;
    //     await this.expandNode(data.vaultName, pathToExpand);
    //     this.treeViewProvider.refresh();
    //   }
    // });

    // 监听文件夹创建事件，自动刷新视图
    // eventBus.on('folder:created', async (data: { vaultName: string; folderPath: string; parentFolderPath: string }) => {
    //   this.logger.info('Folder created event received, refreshing view', data);
    //   this.treeViewProvider.refresh();
    //   if (data.vaultName) {
    //     const pathToExpand = data.parentFolderPath && data.parentFolderPath.trim() !== '' 
    //       ? data.parentFolderPath 
    //       : undefined;
    //     await this.expandNode(data.vaultName, pathToExpand);
    //     this.treeViewProvider.refresh();
    //   }
    // });
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
      // 检查是否是占位文件
      const isPlaceholderFile = item.contextValue === 'placeholder-file';
      
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
        `Are you sure you want to delete ${isPlaceholderFile ? 'placeholder ' : ''}${isFolder ? 'folder' : 'file'} '${fileName}'? This action cannot be undone.`,
        { modal: true },
        'Delete'
      );

      if (confirm !== 'Delete') {
        return;
      }

      // 如果是占位文件，从 expectedFiles 中移除
      if (isPlaceholderFile) {
        const result = await this.documentService.removeExpectedFile(vaultId, filePath);
        if (result.success) {
          vscode.window.showInformationMessage(`Placeholder file '${fileName}' removed`);
          this.treeViewProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to remove placeholder file: ${result.error.message}`);
        }
        return;
      }

      // 普通文件或文件夹的删除
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

      // 直接删除文件和配置，不询问用户
      const result = await this.vaultService.removeVault(vault.id, { deleteFiles: true });
      if (result.success) {
        vscode.window.showInformationMessage(`Vault '${vaultName}' and its files have been deleted`);
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
        command: 'archi.document.createFromPlaceholder',
        callback: async (item?: DocumentTreeItem) => {
          await this.createFromPlaceholder(item);
        },
      },
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
   * 从占位节点创建文件
   */
  private async createFromPlaceholder(item?: DocumentTreeItem): Promise<void> {
    if (!item) {
      const selection = this.treeView.selection;
      if (selection.length === 0) {
        return;
      }
      item = selection[0] as DocumentTreeItem;
    }

    if (!item.filePath || !item.vaultId) {
      return;
    }

    // 1. 获取占位节点信息
    const folderPath = path.dirname(item.filePath);
    const normalizedFolderPath = folderPath === '.' || folderPath === '' ? '' : folderPath;
    const fileName = path.basename(item.filePath, path.extname(item.filePath));
    const extension = path.extname(item.filePath).substring(1); // 去掉点号

    // 2. 读取文件夹元数据，获取文件模板信息
    const folderMetadata = await this.documentService.readFolderMetadata(item.vaultId, normalizedFolderPath);

    // 查找对应的 expectedFile
    const fileNameWithExt = path.basename(item.filePath); // 如 "system-context.md"
    this.logger.info('[DocumentCommands] Finding expectedFile', {
      filePath: item.filePath,
      fileNameWithExt,
      folderPath: normalizedFolderPath,
      expectedFilesCount: folderMetadata?.expectedFiles?.length || 0,
      expectedFiles: folderMetadata?.expectedFiles?.map(f => ({
        path: f.path,
        name: f.name,
        extension: f.extension,
        template: f.template
      }))
    });
    
    const expectedFile = folderMetadata?.expectedFiles?.find(
      f => {
        // f.path 是相对于文件夹的路径，例如 "stakeholders.md"
        // fileNameWithExt 是文件名（含扩展名），例如 "stakeholders.md"
        // 需要匹配：f.path === fileNameWithExt
        // 或者：如果 f.path 没有扩展名，则比较 f.name + f.extension
        const expectedFileName = f.extension ? `${f.name}.${f.extension}` : f.name;
        // 匹配条件：f.path 应该等于 fileNameWithExt，或者 expectedFileName 应该等于 fileNameWithExt
        const matches = f.path === fileNameWithExt || expectedFileName === fileNameWithExt;
        if (matches) {
          this.logger.info('[DocumentCommands] Found expectedFile match', {
            filePath: item.filePath,
            fileNameWithExt,
            expectedFile: {
              path: f.path,
              name: f.name,
              extension: f.extension,
              expectedFileName,
              template: f.template
            }
          });
        }
        return matches;
      }
    );

    if (!expectedFile) {
      this.logger.warn('[DocumentCommands] ExpectedFile not found', {
        filePath: item.filePath,
        fileNameWithExt,
        availableExpectedFiles: folderMetadata?.expectedFiles?.map(f => f.path)
      });
    }

    // 3. 获取模板ID（如果存在）
    // expectedFile.template 存储的就是模板ID，格式为：vault-name/archi-templates/...
    // 这与模板列表中的ID格式完全一致：${vault.name}/${fileNode.path}
    let templateId: string | undefined;
    if (expectedFile?.template) {
      // expectedFile.template 直接就是模板ID，无需解析
      templateId = expectedFile.template;
      this.logger.info('[DocumentCommands] Template ID from expectedFile', {
        templateId,
        fileName: fileName,
        expectedFilePath: expectedFile.path
      });
    } else {
      this.logger.warn('[DocumentCommands] No template found for expectedFile', {
        fileName: fileName,
        expectedFile: expectedFile ? {
          path: expectedFile.path,
          name: expectedFile.name,
          template: expectedFile.template
        } : null
      });
    }

    // 4. 打开创建文件弹窗（预填充信息）
    await this.showCreateFileDialog(item, {
      vaultId: item.vaultId,
      folderPath: normalizedFolderPath,
      fileName: fileName,
      templateId: templateId
    });
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
          vscode.window.showErrorMessage('Please select an item to edit metadata');
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
        `Edit Metadata - ${displayName}`,
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
        'index.html',
        vaultId,
        undefined,
        undefined,
        {
          view: 'edit-relations-dialog',
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
      this.logger.error('Failed to show edit metadata dialog', error);
      vscode.window.showErrorMessage(`Failed to show edit metadata dialog: ${error.message}`);
    }
  }
}
