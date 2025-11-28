import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { CommandAdapter, CommandDefinition } from '../../../../core/vscode-api/CommandAdapter';
import { WebviewAdapter, WebviewMessage } from '../../../../core/vscode-api/WebviewAdapter';
import { Logger } from '../../../../core/logger/Logger';
import { VaultApplicationService } from '../../application/VaultApplicationService';
import { ArtifactTreeApplicationService } from '../../application/ArtifactTreeApplicationService';
import { ArtifactFileSystemApplicationService } from '../../application/ArtifactFileSystemApplicationService';
import { BaseArtifactTreeItem } from '../tree/BaseArtifactTreeItem';
import { BaseArtifactTreeViewProvider } from '../tree/BaseArtifactTreeViewProvider';
import { FileTreeDomainService } from '../../domain/services/FileTreeDomainService';
import { FileOperationDomainService } from '../../domain/services/FileOperationDomainService';
import { PathUtils } from '../../infrastructure/utils/PathUtils';
import { TreeViewUtils } from '../../infrastructure/utils/TreeViewUtils';

/**
 * 基础文件树命令类
 * 提供通用文件操作命令，子类只需实现少量抽象方法
 */
export abstract class BaseFileTreeCommands<T extends BaseArtifactTreeItem> {
  // 树视图更新延迟配置
  protected static readonly TREE_UPDATE_DELAY_MS = 50;
  protected static readonly VAULT_EXPAND_DELAY_MS = 150;

  protected createFileWebviewPanel: vscode.WebviewPanel | null = null;
  protected createFolderWebviewPanel: vscode.WebviewPanel | null = null;

  constructor(
    protected vaultService: VaultApplicationService,
    protected treeService: ArtifactTreeApplicationService,
    protected fileOperationService: ArtifactFileSystemApplicationService,
    protected fileTreeDomainService: FileTreeDomainService,
    protected fileOperationDomainService: FileOperationDomainService,
    protected logger: Logger,
    protected context: vscode.ExtensionContext,
    protected treeViewProvider: BaseArtifactTreeViewProvider<T>,
    protected treeView: vscode.TreeView<vscode.TreeItem>,
    protected webviewAdapter: WebviewAdapter
  ) {}

  /**
   * 注册所有命令
   */
  register(commandAdapter: CommandAdapter): void {
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
        command: this.getCreateFileCommandName(),
        callback: async (item?: T) => {
          await this.showCreateFileDialog(item);
        },
      },
      {
        command: this.getCreateFolderCommandName(),
        callback: async (item?: T) => {
          await this.showCreateFolderDialog(item);
        },
      },
      {
        command: this.getDeleteCommandName(),
        callback: async (item?: T) => {
          await this.deleteItem(item);
        },
      },
    ];

    // 注册通用命令
    commandAdapter.registerCommands(commands);

    // 允许子类注册特定命令
    this.registerSpecificCommands(commandAdapter);
  }

  // ==================== 通用命令实现 ====================

  /**
   * 展开所有节点
   */
  protected async expandAll(): Promise<void> {
    try {
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        return;
      }

      // 先刷新视图以确保所有节点都已加载
      this.treeViewProvider.refresh();

      // 等待一小段时间让视图更新
      await new Promise(resolve => setTimeout(resolve, 100));

      // 展开所有 vault 节点
      for (const vault of vaultsResult.value) {
        const vaultItem = await this.treeViewProvider.findTreeItem(
          undefined,
          (item) => item.isVault(vault.name)
        );
        if (vaultItem) {
          try {
            await this.treeView.reveal(vaultItem, { expand: true });
          } catch (error) {
            // 忽略单个节点展开失败
          }
        }
      }
    } catch (error: any) {
      this.logger.error('Failed to expand all nodes', error);
    }
  }

  /**
   * 折叠所有节点
   */
  protected async collapseAll(): Promise<void> {
    TreeViewUtils.collapseAll(this.treeViewProvider);
  }

  /**
   * 展开指定的节点
   */
  protected async expandNode(vaultName: string, folderPath?: string): Promise<void> {
    if (!vaultName) {
      return;
    }

    // 等待树视图更新完成
    await new Promise(resolve => setTimeout(resolve, BaseFileTreeCommands.TREE_UPDATE_DELAY_MS));

    try {
      // 从根节点开始查找 vault 节点
      const rootChildren = await this.treeViewProvider.getChildren(undefined);
      const vaultItem = rootChildren.find(item => item.isVault(vaultName)) as T | undefined;

      if (!vaultItem) {
        this.logger.debug(`Vault node not found in root: ${vaultName}`);
        return;
      }

      // 展开 vault 节点
      try {
        await this.treeView.reveal(vaultItem, { expand: true });
        this.logger.debug(`Vault node expanded: ${vaultName}`);
      } catch (error: any) {
        this.logger.warn(`Failed to reveal vault node: ${vaultName}`, error?.message || String(error));
        return;
      }

      // 如果需要展开文件夹
      if (folderPath !== undefined) {
        // 等待 vault 展开完成，让子节点加载
        await new Promise(resolve => setTimeout(resolve, BaseFileTreeCommands.VAULT_EXPAND_DELAY_MS));

        // 从 vault 的子节点中查找文件夹
        const vaultChildren = await this.treeViewProvider.getChildren(vaultItem);
        const folderItem = vaultChildren.find(item => item.isFolder(vaultName, folderPath)) as T | undefined;

        if (folderItem) {
          try {
            await this.treeView.reveal(folderItem, { expand: true });
            this.logger.debug(`Folder node expanded: ${vaultName}/${folderPath}`);
          } catch (error: any) {
            this.logger.warn(`Failed to reveal folder node: ${folderPath}`, error?.message || String(error));
          }
        } else {
          this.logger.debug(`Folder node not found: ${vaultName}/${folderPath}`);
        }
      }
    } catch (error: any) {
      this.logger.warn('Failed to expand node', error?.message || String(error));
    }
  }

  /**
   * 获取选中的 vault 名称
   */
  protected async getSelectedVaultName(item?: T): Promise<string | null> {
    // 如果直接传入了 item，使用它
    if (item && item.vaultName) {
      return item.vaultName;
    }

    // 否则从当前选中的项获取
    const selection = this.treeView.selection;
    if (selection.length > 0) {
      const selectedItem = selection[0] as T;
      if (selectedItem.vaultName) {
        return selectedItem.vaultName;
      }
    }

    return null;
  }

  /**
   * 根据名称查找 Vault
   */
  protected async findVaultByName(vaultName: string): Promise<import('../../domain/entity/vault').Vault | null> {
    const vaultResult = await this.vaultService.listVaults();
    if (!vaultResult.success) {
      return null;
    }
    return vaultResult.value.find(v => v.name === vaultName) || null;
  }

  /**
   * 验证并获取 Vault（检查是否存在且可写）
   */
  protected async validateAndGetVault(
    item?: T,
    operation: string = 'operation'
  ): Promise<{ vault: import('../../domain/entity/vault').Vault; vaultName: string } | null> {
    const vaultName = await this.getSelectedVaultName(item);
    if (!vaultName) {
      vscode.window.showErrorMessage('Please select a vault or item');
      return null;
    }

    const vaultResult = await this.vaultService.listVaults();
    if (!vaultResult.success) {
      vscode.window.showErrorMessage('Failed to get vaults');
      return null;
    }

    const vault = vaultResult.value.find(v => v.name === vaultName);
    if (!vault) {
      vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
      return null;
    }

    const error = this.fileOperationDomainService.validateVaultForOperation(vault, operation as any);
    if (error) {
      vscode.window.showErrorMessage(error);
      return null;
    }

    return { vault, vaultName };
  }

  /**
   * 处理创建成功后的操作
   */
  protected async handleCreateSuccess(
    itemName: string,
    vaultName: string,
    contentLocation: string,
    targetFolderPath: string | undefined,
    openFile: boolean = true
  ): Promise<void> {
    vscode.window.showInformationMessage(`${itemName} created`);

    // 刷新视图
    this.treeViewProvider.refresh();

    // 展开相关节点
    await this.expandNode(vaultName, targetFolderPath);

    // 打开新创建的文件
    if (openFile) {
      const doc = await vscode.workspace.openTextDocument(contentLocation);
      await vscode.window.showTextDocument(doc);
    }
  }

  /**
   * 显示创建文件对话框
   */
  protected async showCreateFileDialog(item?: T): Promise<void> {
    // 如果已经打开，直接显示
    if (this.createFileWebviewPanel) {
      this.createFileWebviewPanel.reveal();
      return;
    }

    // 获取当前选中的 vault 信息
    let initialVaultId: string | undefined;
    let initialFolderPath: string | undefined;

    if (item) {
      if (item.vaultName) {
        const vault = await this.findVaultByName(item.vaultName);
        if (vault) {
          initialVaultId = vault.id;
        }
      }
      if (item.folderPath) {
        initialFolderPath = item.folderPath;
      }
    }

    // 创建新的 webview panel
    const webviewDistPath = this.getWebviewDistPath();

    const panel = vscode.window.createWebviewPanel(
      'createFileDialog',
      '创建文件',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.file(webviewDistPath)],
      }
    );

    // 设置 webview 消息处理器
    panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        if (message.method === 'close') {
          panel.dispose();
          return;
        }
        await this.webviewAdapter.handleMessage(panel.webview, message);
      },
      null,
      this.context.subscriptions
    );

    // 加载 webview 内容
    const htmlContent = await this.getWebviewContent(
      panel.webview,
      'create-file-dialog.html',
      initialVaultId,
      initialFolderPath
    );
    panel.webview.html = htmlContent;

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this.createFileWebviewPanel = null;
    });

    this.createFileWebviewPanel = panel;
  }

  /**
   * 显示创建文件夹对话框
   */
  protected async showCreateFolderDialog(item?: T): Promise<void> {
    // 如果已经打开，直接显示
    if (this.createFolderWebviewPanel) {
      this.createFolderWebviewPanel.reveal();
      return;
    }

    // 获取当前选中的 vault 信息
    let initialVaultId: string | undefined;
    let initialFolderPath: string | undefined;

    if (item) {
      if (item.vaultName) {
        const vault = await this.findVaultByName(item.vaultName);
        if (vault) {
          initialVaultId = vault.id;
        }
      }
      if (item.folderPath !== undefined) {
        initialFolderPath = item.folderPath;
      } else if (item.filePath) {
        const dir = PathUtils.dirname(item.filePath);
        initialFolderPath = dir === '' ? undefined : dir;
      }
    }

    // 创建新的 webview panel
    const webviewDistPath = this.getWebviewDistPath();

    const panel = vscode.window.createWebviewPanel(
      'createFolderDialog',
      '创建文件夹',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.file(webviewDistPath)],
      }
    );

    // 设置 webview 消息处理器
    panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        this.logger.info(`[BaseFileTreeCommands] Received message in createFolder dialog: ${message.method}`, { id: message.id, params: message.params });
        if (message.method === 'close') {
          panel.dispose();
          return;
        }
        if (message.method === 'folderCreated') {
          const { vaultName, folderPath } = message.params || {};
          if (vaultName) {
            this.treeViewProvider.refresh();
            await this.expandNode(vaultName, folderPath);
            this.treeViewProvider.refresh();
          }
          return;
        }
        this.logger.info(`[BaseFileTreeCommands] Forwarding message to WebviewAdapter: ${message.method}`);
        await this.webviewAdapter.handleMessage(panel.webview, message);
      },
      null,
      this.context.subscriptions
    );

    // 加载 webview 内容
    const htmlContent = await this.getWebviewContent(
      panel.webview,
      'create-folder-dialog.html',
      initialVaultId,
      initialFolderPath
    );
    panel.webview.html = htmlContent;

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this.createFolderWebviewPanel = null;
    });

    this.createFolderWebviewPanel = panel;
  }

  /**
   * 删除项
   */
  protected async deleteItem(item?: T): Promise<void> {
    try {
      if (!item) {
        const selection = this.treeView.selection;
        if (selection.length === 0) {
          vscode.window.showErrorMessage('Please select an item to delete');
          return;
        }
        item = selection[0] as T;
      }

      // 调用子类实现的删除逻辑
      await this.handleDelete(item);
    } catch (error: any) {
      this.logger.error('Failed to delete item', error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  }

  /**
   * 获取 Webview 分发路径
   */
  protected getWebviewDistPath(): string {
    const extensionPath = this.context.extensionPath;
    const webviewPathInExtension = path.join(extensionPath, 'dist', 'webview');
    const webviewPathInSource = path.join(extensionPath, '..', 'webview', 'dist');
    return fs.existsSync(webviewPathInExtension)
      ? webviewPathInExtension
      : webviewPathInSource;
  }

  /**
   * 获取 Webview HTML 内容
   */
  protected async getWebviewContent(
    webview: vscode.Webview,
    htmlFileName: string,
    initialVaultId?: string,
    initialFolderPath?: string
  ): Promise<string> {
    const webviewDistPath = this.getWebviewDistPath();

    this.logger.info(`Webview dist path: ${webviewDistPath}`);
    this.logger.info(`Webview dist exists: ${fs.existsSync(webviewDistPath)}`);

    const htmlPath = path.join(webviewDistPath, htmlFileName);

    this.logger.info(`HTML path: ${htmlPath}`);
    this.logger.info(`HTML file exists: ${fs.existsSync(htmlPath)}`);

    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // 替换资源路径为 webview URI
      html = html.replace(/(src|href)=["']([^"']+)["']/g, (match: string, attr: string, resourcePath: string) => {
        if (resourcePath.match(/^(vscode-webview|https?|data|mailto|tel):/i)) {
          return match;
        }

        let normalizedPath = resourcePath;
        if (normalizedPath.startsWith('./')) {
          normalizedPath = normalizedPath.substring(2);
        } else if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }

        const resourceFile = path.join(webviewDistPath, normalizedPath);

        if (fs.existsSync(resourceFile)) {
          const resourceUri = webview.asWebviewUri(vscode.Uri.file(resourceFile));
          return `${attr}="${resourceUri}"`;
        }

        return match;
      });

      // 注入 VSCode API 和初始数据
      const initialData = {
        vaultId: initialVaultId,
        folderPath: initialFolderPath,
      };
      const vscodeScript = `
        <script>
          const vscode = acquireVsCodeApi();
          window.acquireVsCodeApi = () => vscode;
          window.initialData = ${JSON.stringify(initialData)};
        </script>
      `;
      html = html.replace('</head>', `${vscodeScript}</head>`);

      return html;
    }

    // 如果构建文件不存在，返回一个简单的 HTML
    const title = htmlFileName === 'create-folder-dialog.html' ? 'Create Folder' : 'Create File';
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body>
          <div style="padding: 20px; text-align: center;">
            <h2>Webview 未构建</h2>
            <p>请先运行 <code>cd apps/webview && pnpm build</code> 构建 webview</p>
          </div>
        </body>
      </html>
    `;
  }

  // ==================== 抽象方法（子类必须实现） ====================

  /**
   * 获取刷新命令名称
   */
  protected abstract getRefreshCommandName(): string;

  /**
   * 获取展开所有命令名称
   */
  protected abstract getExpandAllCommandName(): string;

  /**
   * 获取折叠所有命令名称
   */
  protected abstract getCollapseAllCommandName(): string;

  /**
   * 获取创建文件命令名称
   */
  protected abstract getCreateFileCommandName(): string;

  /**
   * 获取创建文件夹命令名称
   */
  protected abstract getCreateFolderCommandName(): string;

  /**
   * 获取删除命令名称
   */
  protected abstract getDeleteCommandName(): string;

  /**
   * 处理删除操作
   */
  protected abstract handleDelete(item: T): Promise<void>;

  // ==================== 可选方法（子类可以覆盖） ====================

  /**
   * 注册特定命令（子类可以覆盖以添加特定命令）
   */
  protected registerSpecificCommands(commandAdapter: CommandAdapter): void {
    // 默认实现为空，子类可以覆盖
  }
}

