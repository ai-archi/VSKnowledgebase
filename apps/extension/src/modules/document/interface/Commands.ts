import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { CommandAdapter } from '../../../core/vscode-api/CommandAdapter';
import { DocumentTreeViewProvider, DocumentTreeItem } from './DocumentTreeViewProvider';
import { RemoteEndpoint } from '../../../domain/shared/vault/RemoteEndpoint';
import { WebviewAdapter } from '../../../core/vscode-api/WebviewAdapter';

export class DocumentCommands {
  // 树视图更新延迟配置
  private static readonly TREE_UPDATE_DELAY_MS = 50;
  private static readonly VAULT_EXPAND_DELAY_MS = 150;
  private createFileWebviewPanel: vscode.WebviewPanel | null = null;

  constructor(
    private documentService: DocumentApplicationService,
    private artifactService: ArtifactFileSystemApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private treeViewProvider: DocumentTreeViewProvider,
    private treeView: vscode.TreeView<vscode.TreeItem>,
    private webviewAdapter: WebviewAdapter
  ) {}

  register(commandAdapter: CommandAdapter): void {
    commandAdapter.registerCommands([
      {
        command: 'archi.document.refresh',
        callback: () => {
          this.treeViewProvider.refresh();
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
        command: 'archi.document.expandAll',
        callback: async () => {
          await this.expandAll();
        },
      },
      {
        command: 'archi.document.collapseAll',
        callback: async () => {
          await this.collapseAll();
        },
      },
      {
        command: 'archi.document.addFile',
        callback: async (item?: DocumentTreeItem) => {
          await this.showCreateFileDialog(item);
        },
      },
      {
        command: 'archi.document.addFolder',
        callback: async (item?: DocumentTreeItem) => {
          await this.addFolder(item);
        },
      },
      {
        command: 'archi.document.addDiagram',
        callback: async (item?: DocumentTreeItem) => {
          await this.addDiagram(item);
        },
      },
      {
        command: 'archi.document.delete',
        callback: async (item?: DocumentTreeItem) => {
          await this.deleteItem(item);
        },
      },
    ]);
  }

  /**
   * 展开所有节点
   */
  private async expandAll(): Promise<void> {
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
  private async collapseAll(): Promise<void> {
    try {
      // VSCode TreeView 没有直接的 collapseAll API
      // 最简单的方法是通过刷新视图来折叠所有节点
      // 刷新后所有节点默认是折叠状态
      this.treeViewProvider.refresh();
    } catch (error: any) {
      this.logger.error('Failed to collapse all nodes', error);
    }
  }

  /**
   * 展开指定的节点（vault 和/或文件夹）
   */
  private async expandNode(vaultName: string, folderPath?: string): Promise<void> {
    if (!vaultName) {
      return;
    }

    // 等待树视图更新完成
    await new Promise(resolve => setTimeout(resolve, DocumentCommands.TREE_UPDATE_DELAY_MS));

    try {
      // 从根节点开始查找 vault 节点
      const rootChildren = await this.treeViewProvider.getChildren(undefined);
      const vaultItem = rootChildren.find(item => item.isVault(vaultName));

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
        await new Promise(resolve => setTimeout(resolve, DocumentCommands.VAULT_EXPAND_DELAY_MS));
        
        // 从 vault 的子节点中查找文件夹
        const vaultChildren = await this.treeViewProvider.getChildren(vaultItem);
        const folderItem = vaultChildren.find(item => item.isFolder(vaultName, folderPath));
        
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
  private async getSelectedVaultName(item?: DocumentTreeItem): Promise<string | null> {
    // 如果直接传入了 item，使用它
    if (item) {
      if (item.vaultName) {
        return item.vaultName;
      }
      if (item.artifact) {
        return item.artifact.vault.name;
      }
    }

    // 否则从当前选中的项获取
    const selection = this.treeView.selection;
    if (selection.length > 0) {
      const selectedItem = selection[0] as DocumentTreeItem;
      if (selectedItem.vaultName) {
        return selectedItem.vaultName;
      }
      if (selectedItem.artifact) {
        return selectedItem.artifact.vault.name;
      }
    }

    return null;
  }

  /**
   * 添加文件
   */
  private async addFile(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultName = await this.getSelectedVaultName(item);
      if (!vaultName) {
        vscode.window.showErrorMessage('Please select a vault or document');
        return;
      }

      const vaultResult = await this.vaultService.listVaults();
      if (!vaultResult.success) {
        vscode.window.showErrorMessage('Failed to get vaults');
        return;
      }

      const vault = vaultResult.value.find(v => v.name === vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      if (vault.readOnly) {
        vscode.window.showErrorMessage(`Cannot add file to read-only vault: ${vaultName}`);
        return;
      }

      const fileName = await vscode.window.showInputBox({
        prompt: 'Enter file name (without extension)',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'File name cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'File name contains invalid characters';
          }
          return null;
        }
      });

      if (!fileName) return;

      // 确定文件路径
      let filePath: string;
      let targetFolderPath: string | undefined; // 用于展开文件夹
      if (item?.folderPath !== undefined) {
        // 如果是在文件夹节点上右键，在该文件夹下创建
        filePath = item.folderPath === '' ? `${fileName}.md` : `${item.folderPath}/${fileName}.md`;
        targetFolderPath = item.folderPath === '' ? undefined : item.folderPath;
      } else if (item?.artifact) {
        // 如果是在文档节点上右键，在同一个目录下创建
        const artifactPath = item.artifact.path;
        const dir = path.dirname(artifactPath);
        filePath = dir === '.' || dir === '' ? `${fileName}.md` : `${dir}/${fileName}.md`;
        targetFolderPath = dir === '.' || dir === '' ? undefined : dir;
      } else {
        // 如果是在 vault 节点上右键，在根目录下创建
        filePath = `${fileName}.md`;
        targetFolderPath = undefined;
      }

      const result = await this.documentService.createDocument(
        vault.id,
        filePath,
        fileName,
        `# ${fileName}\n\n`
      );

      if (result.success) {
        vscode.window.showInformationMessage(`File created: ${fileName}`);
        
        // 刷新视图
        this.treeViewProvider.refresh();
        
        // 展开相关节点
        await this.expandNode(vaultName, targetFolderPath);
        
        // 打开新创建的文件
        const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showErrorMessage(`Failed to create file: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add file', error);
      vscode.window.showErrorMessage(`Failed to add file: ${error.message}`);
    }
  }

  /**
   * 添加文件夹
   */
  private async addFolder(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultName = await this.getSelectedVaultName(item);
      if (!vaultName) {
        vscode.window.showErrorMessage('Please select a vault or document');
        return;
      }

      const vaultResult = await this.vaultService.listVaults();
      if (!vaultResult.success) {
        vscode.window.showErrorMessage('Failed to get vaults');
        return;
      }

      const vault = vaultResult.value.find(v => v.name === vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      if (vault.readOnly) {
        vscode.window.showErrorMessage(`Cannot add folder to read-only vault: ${vaultName}`);
        return;
      }

      const folderName = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Folder name cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'Folder name contains invalid characters';
          }
          return null;
        }
      });

      if (!folderName) return;

      // 确定文件夹路径
      let folderPath: string;
      let parentFolderPath: string | undefined; // 用于展开父文件夹
      if (item?.folderPath !== undefined) {
        // 如果是在文件夹节点上右键，在该文件夹下创建
        folderPath = item.folderPath === '' ? folderName : `${item.folderPath}/${folderName}`;
        parentFolderPath = item.folderPath === '' ? undefined : item.folderPath;
      } else if (item?.artifact) {
        // 如果是在文档节点上右键，在同一个目录下创建
        const artifactPath = item.artifact.path;
        const dir = path.dirname(artifactPath);
        folderPath = dir === '.' || dir === '' ? folderName : `${dir}/${folderName}`;
        parentFolderPath = dir === '.' || dir === '' ? undefined : dir;
      } else {
        // 如果是在 vault 节点上右键，在根目录下创建
        folderPath = folderName;
        parentFolderPath = undefined;
      }

      // 创建文件夹（通过创建一个占位文件）
      // 确保文件夹路径以 / 结尾（如果不在根目录）
      const placeholderPath = folderPath.endsWith('/') || folderPath === '' 
        ? path.join(folderPath, '.keep') 
        : path.join(folderPath, '.keep');
      
      const result = await this.documentService.createDocument(
        vault.id,
        placeholderPath,
        folderName,
        `# ${folderName}\n\nThis folder contains documents.\n`
      );

      if (result.success) {
        vscode.window.showInformationMessage(`Folder created: ${folderName}`);
        
        // 刷新视图，确保文件夹显示出来
        this.treeViewProvider.refresh();
        
        // 展开相关节点
        await this.expandNode(vaultName, parentFolderPath);
        
        // 再次刷新以确保新文件夹显示
        this.treeViewProvider.refresh();
      } else {
        vscode.window.showErrorMessage(`Failed to create folder: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add folder', error);
      vscode.window.showErrorMessage(`Failed to add folder: ${error.message}`);
    }
  }

  /**
   * 添加设计图
   */
  private async addDiagram(item?: DocumentTreeItem): Promise<void> {
    try {
      const vaultName = await this.getSelectedVaultName(item);
      if (!vaultName) {
        vscode.window.showErrorMessage('Please select a vault or document');
        return;
      }

      const vaultResult = await this.vaultService.listVaults();
      if (!vaultResult.success) {
        vscode.window.showErrorMessage('Failed to get vaults');
        return;
      }

      const vault = vaultResult.value.find(v => v.name === vaultName);
      if (!vault) {
        vscode.window.showErrorMessage(`Vault not found: ${vaultName}`);
        return;
      }

      if (vault.readOnly) {
        vscode.window.showErrorMessage(`Cannot add diagram to read-only vault: ${vaultName}`);
        return;
      }

      const diagramName = await vscode.window.showInputBox({
        prompt: 'Enter diagram name (without extension)',
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Diagram name cannot be empty';
          }
          if (/[<>:"/\\|?*]/.test(value)) {
            return 'Diagram name contains invalid characters';
          }
          return null;
        }
      });

      if (!diagramName) return;

      // 选择图表类型
      const diagramType = await vscode.window.showQuickPick([
        { label: 'Mermaid', value: 'mermaid', description: 'Mermaid diagram (.mmd)' },
        { label: 'PlantUML', value: 'puml', description: 'PlantUML diagram (.puml)' },
        { label: 'Archimate', value: 'archimate', description: 'Archimate diagram (.archimate)' },
      ], {
        placeHolder: 'Select diagram type'
      });

      if (!diagramType) return;

      // 确定文件路径和扩展名
      const extension = diagramType.value === 'mermaid' ? 'mmd' : diagramType.value === 'puml' ? 'puml' : 'archimate';
      let diagramPath: string;
      let targetFolderPath: string | undefined; // 用于展开文件夹
      if (item?.folderPath !== undefined) {
        // 如果是在文件夹节点上右键，在该文件夹下创建
        diagramPath = item.folderPath === '' ? `${diagramName}.${extension}` : `${item.folderPath}/${diagramName}.${extension}`;
        targetFolderPath = item.folderPath === '' ? undefined : item.folderPath;
      } else if (item?.artifact) {
        // 如果是在文档节点上右键，在同一个目录下创建
        const artifactPath = item.artifact.path;
        const dir = path.dirname(artifactPath);
        diagramPath = dir === '.' || dir === '' ? `${diagramName}.${extension}` : `${dir}/${diagramName}.${extension}`;
        targetFolderPath = dir === '.' || dir === '' ? undefined : dir;
      } else {
        // 如果是在 vault 节点上右键，在 diagrams 文件夹下创建
        diagramPath = `diagrams/${diagramName}.${extension}`;
        targetFolderPath = 'diagrams';
      }

      // 创建设计图文件
      const content = this.getDiagramTemplate(diagramType.value, diagramName);
      const result = await this.artifactService.createArtifact({
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
        vscode.window.showInformationMessage(`Diagram created: ${diagramName}`);
        
        // 刷新视图
        this.treeViewProvider.refresh();
        
        // 展开相关节点
        await this.expandNode(vaultName, targetFolderPath);
        
        // 打开新创建的图表文件
        const doc = await vscode.workspace.openTextDocument(result.value.contentLocation);
        await vscode.window.showTextDocument(doc);
      } else {
        vscode.window.showErrorMessage(`Failed to create diagram: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Failed to add diagram', error);
      vscode.window.showErrorMessage(`Failed to add diagram: ${error.message}`);
    }
  }

  /**
   * 获取图表模板
   */
  private getDiagramTemplate(type: string, name: string): string {
    switch (type) {
      case 'mermaid':
        return `# ${name}\n\n\`\`\`mermaid\ngraph TD\n    A[Start] --> B[End]\n\`\`\`\n`;
      case 'puml':
        return `@startuml\n!theme plain\n\ntitle ${name}\n\n[Component1] --> [Component2]\n\n@enduml\n`;
      case 'archimate':
        return `# ${name}\n\nArchimate diagram content\n`;
      default:
        return `# ${name}\n\n`;
    }
  }

  /**
   * 删除项
   */
  private async deleteItem(item?: DocumentTreeItem): Promise<void> {
    try {
      if (!item) {
        // 从当前选中的项获取
        const selection = this.treeView.selection;
        if (selection.length === 0) {
          vscode.window.showErrorMessage('Please select an item to delete');
          return;
        }
        item = selection[0] as DocumentTreeItem;
      }

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

        const vaultResult = await this.vaultService.listVaults();
        if (!vaultResult.success) {
          vscode.window.showErrorMessage('Failed to get vaults');
          return;
        }

        const vaultName = item.vaultName;
        if (!vaultName) {
          vscode.window.showErrorMessage('Vault name not found');
          return;
        }

        const vault = vaultResult.value.find(v => v.name === vaultName);
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
      } else if (item.artifact) {
        // 删除文档
        const confirm = await vscode.window.showWarningMessage(
          `Are you sure you want to delete '${item.artifact.title}'? This action cannot be undone.`,
          { modal: true },
          'Delete'
        );

        if (confirm !== 'Delete') {
          return;
        }

        const result = await this.documentService.deleteDocument(
          item.artifact.vault.id,
          item.artifact.path
        );

        if (result.success) {
          vscode.window.showInformationMessage(`Document '${item.artifact.title}' deleted`);
          this.treeViewProvider.refresh();
        } else {
          vscode.window.showErrorMessage(`Failed to delete document: ${result.error.message}`);
        }
      } else {
        vscode.window.showErrorMessage('Please select a vault or document to delete');
      }
    } catch (error: any) {
      this.logger.error('Failed to delete item', error);
      vscode.window.showErrorMessage(`Failed to delete: ${error.message}`);
    }
  }

  /**
   * 显示创建文件对话框（Webview）
   */
  private async showCreateFileDialog(item?: DocumentTreeItem): Promise<void> {
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
        // 从 vaultName 获取 vaultId
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          const vault = vaultsResult.value.find(v => v.name === item.vaultName);
          if (vault) {
            initialVaultId = vault.id;
          }
        }
      }
      if (item.folderPath) {
        initialFolderPath = item.folderPath;
      }
    }

    // 创建新的 webview panel（弹窗模式）
    const extensionPath = this.context.extensionPath;
    // 优先从 extension 目录读取（打包后的路径），否则从源码目录读取（开发环境）
    const webviewPathInExtension = path.join(extensionPath, 'webview');
    const webviewPathInSource = path.join(extensionPath, '..', 'webview', 'dist');
    const webviewDistPath = fs.existsSync(webviewPathInExtension) 
      ? webviewPathInExtension 
      : webviewPathInSource;
    
    // 创建标准表单页面（不使用弹窗，直接全屏显示）
    // 注意：VSCode 的 webview panel 只能在编辑区显示，所以我们使用标准表单页面
    const panel = vscode.window.createWebviewPanel(
      'createFileDialog',
      '创建文件',
      vscode.ViewColumn.Beside, // 在侧边打开，不替换当前编辑器
      {
        enableScripts: true,
        retainContextWhenHidden: false, // 关闭时释放资源
        localResourceRoots: [vscode.Uri.file(webviewDistPath)],
      }
    );

    // 设置 webview 消息处理器
    panel.webview.onDidReceiveMessage(
      async (message) => {
        // 处理关闭请求
        if (message.method === 'close') {
          panel.dispose();
          return;
        }
        // 处理其他 RPC 消息
        await this.webviewAdapter.handleMessage(panel.webview, message);
      },
      null,
      this.context.subscriptions
    );

    // 加载 webview 内容，并传递初始数据
    const htmlContent = await this.getWebviewContent(panel.webview, initialVaultId, initialFolderPath);
    panel.webview.html = htmlContent;

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this.createFileWebviewPanel = null;
    });

    this.createFileWebviewPanel = panel;
  }

  /**
   * 获取 Webview HTML 内容
   */
  private async getWebviewContent(webview: vscode.Webview, initialVaultId?: string, initialFolderPath?: string): Promise<string> {
    // 获取扩展路径
    const extensionPath = this.context.extensionPath;
    // 优先从 extension 目录读取（打包后的路径），否则从源码目录读取（开发环境）
    const webviewPathInExtension = path.join(extensionPath, 'webview');
    const webviewPathInSource = path.join(extensionPath, '..', 'webview', 'dist');
    const webviewDistPath = fs.existsSync(webviewPathInExtension) 
      ? webviewPathInExtension 
      : webviewPathInSource;

    this.logger.info(`Webview dist path: ${webviewDistPath}`);
    this.logger.info(`Webview dist exists: ${fs.existsSync(webviewDistPath)}`);

    // 检查构建后的文件是否存在
    // 优先尝试加载 create-file-dialog.html，如果不存在则使用 index.html
    let htmlPath = path.join(webviewDistPath, 'create-file-dialog.html');
    if (!fs.existsSync(htmlPath)) {
      this.logger.warn(`create-file-dialog.html not found, trying index.html`);
      htmlPath = path.join(webviewDistPath, 'index.html');
    }

    this.logger.info(`HTML path: ${htmlPath}`);
    this.logger.info(`HTML file exists: ${fs.existsSync(htmlPath)}`);

    if (fs.existsSync(htmlPath)) {
      // 读取构建后的 HTML
      let html = fs.readFileSync(htmlPath, 'utf-8');
      
      // 替换资源路径为 webview URI
      // 匹配所有 src 和 href 属性中的路径（包括 /path, ./path, path 等）
      // 排除已经是完整 URI 的路径（如 vscode-webview://, http://, https://, data: 等）
      html = html.replace(/(src|href)=["']([^"']+)["']/g, (match, attr, resourcePath) => {
        // 跳过已经是完整 URI 的路径
        if (resourcePath.match(/^(vscode-webview|https?|data|mailto|tel):/i)) {
          return match;
        }
        
        // 处理相对路径和绝对路径
        let normalizedPath = resourcePath;
        // 移除开头的 ./ 或 /
        if (normalizedPath.startsWith('./')) {
          normalizedPath = normalizedPath.substring(2);
        } else if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }
        
        // 构建资源文件的完整路径（相对于 webviewDistPath）
        const resourceFile = path.join(webviewDistPath, normalizedPath);
        
        // 检查文件是否存在
        if (fs.existsSync(resourceFile)) {
          // 转换为 webview URI
          const resourceUri = webview.asWebviewUri(vscode.Uri.file(resourceFile));
          return `${attr}="${resourceUri}"`;
        }
        
        // 如果文件不存在，保持原样（可能是外部资源）
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

    // 如果构建文件不存在，返回一个简单的 HTML，提示需要构建
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Create File</title>
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
}

