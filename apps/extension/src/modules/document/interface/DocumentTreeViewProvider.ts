import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactTreeApplicationService } from '../../shared/application/ArtifactTreeApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../shared/domain/artifact';
import * as path from 'path';

export class DocumentTreeItem extends vscode.TreeItem {
  public readonly artifact?: Artifact;
  public readonly vaultName?: string;
  public readonly folderPath?: string; // 文件夹路径（相对于 vault 的 artifacts 目录）
  public readonly filePath?: string; // 文件路径（相对于 vault 的 artifacts 目录）
  public readonly vaultId?: string; // Vault ID

  constructor(
    artifact?: Artifact,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    vaultName?: string,
    contextValue?: string,
    folderPath?: string,
    filePath?: string,
    vaultId?: string
  ) {
    if (artifact) {
      // 使用文件名（包含扩展名）作为显示名称，与模板视图保持一致
      const fileName = path.basename(artifact.path) || artifact.title;
      super(fileName, collapsibleState);
      this.artifact = artifact;
      this.filePath = artifact.path;
      this.vaultId = artifact.vault.id;
      this.vaultName = artifact.vault.name;
      this.tooltip = artifact.path;
      this.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [vscode.Uri.file(artifact.contentLocation)],
      };
      this.contextValue = 'document';
    } else if (filePath !== undefined) {
      // 文件节点（未索引的文件，直接使用文件系统信息）
      const fileName = path.basename(filePath);
      super(fileName, collapsibleState);
      this.filePath = filePath;
      this.vaultName = vaultName;
      this.vaultId = vaultId;
      this.tooltip = filePath;
      this.contextValue = 'document';
      // 设置图标
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.md') {
        this.iconPath = new vscode.ThemeIcon('markdown');
      } else if (ext === '.yml' || ext === '.yaml') {
        this.iconPath = new vscode.ThemeIcon('file-code');
      } else {
        this.iconPath = new vscode.ThemeIcon('file');
      }
    } else if (folderPath !== undefined) {
      // 文件夹节点
      const folderName = path.basename(folderPath) || folderPath;
      super(folderName, collapsibleState);
      this.folderPath = folderPath;
      this.vaultName = vaultName;
      this.tooltip = `Folder: ${folderPath}`;
      this.contextValue = contextValue || 'folder';
      this.iconPath = new vscode.ThemeIcon('folder');
    } else if (vaultName) {
      super(vaultName, collapsibleState);
      this.vaultName = vaultName;
      this.tooltip = `Vault: ${vaultName}`;
      this.contextValue = contextValue || 'vault';
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      super('', collapsibleState);
    }
  }

  /**
   * 判断是否为指定的 vault 节点
   */
  isVault(vaultName: string): boolean {
    return this.vaultName === vaultName && this.folderPath === undefined && !this.artifact;
  }

  /**
   * 判断是否为指定的文件夹节点
   */
  isFolder(vaultName: string, folderPath: string): boolean {
    return this.vaultName === vaultName && this.folderPath === folderPath;
  }
}

export class DocumentTreeViewProvider implements vscode.TreeDataProvider<DocumentTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<DocumentTreeItem | undefined | null | void> =
    new vscode.EventEmitter<DocumentTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<DocumentTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private documentService: DocumentApplicationService,
    private vaultService: VaultApplicationService,
    private treeService: ArtifactTreeApplicationService,
    private logger: Logger
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DocumentTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * 通过递归查找获取实际的 TreeItem 节点
   */
  async findTreeItem(
    element: DocumentTreeItem | undefined,
    predicate: (item: DocumentTreeItem) => boolean
  ): Promise<DocumentTreeItem | undefined> {
    // 检查当前节点
    if (element && predicate(element)) {
      return element;
    }

    // 获取子节点
    const children = await this.getChildren(element);
    for (const child of children) {
      if (predicate(child)) {
        return child;
      }
      // 递归查找子节点
      const found = await this.findTreeItem(child, predicate);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  async getChildren(element?: DocumentTreeItem): Promise<DocumentTreeItem[]> {
    try {
      // 根节点：返回所有 vault
      if (!element) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          return [];
        }
        return vaultsResult.value.map(vault =>
          new DocumentTreeItem(undefined, vscode.TreeItemCollapsibleState.Collapsed, vault.name, 'vault')
        );
      }

      // Vault 节点：显示该 vault 的 artifacts 目录下的文件和子目录
      if (element.isVault(element.vaultName!)) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          return [];
        }
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          return [];
        }
        const vaultRef = { id: vault.id, name: vault.name };
        
        const existsResult = await this.treeService.exists(vaultRef, 'artifacts');
        if (!existsResult.success || !existsResult.value) {
          return [];
        }

        return this.getDocumentFiles(vaultRef, 'artifacts', '');
      }

      // 文件夹节点：显示该目录下的文件和子目录
      if (element.folderPath !== undefined && element.vaultName) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          return [];
        }
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          return [];
        }
        const vaultRef = { id: vault.id, name: vault.name };
        const dirPath = `artifacts/${element.folderPath}`;
        
        const isDirResult = await this.treeService.isDirectory(vaultRef, dirPath);
        if (!isDirResult.success || !isDirResult.value) {
          return [];
        }

        return this.getDocumentFiles(vaultRef, dirPath, element.folderPath);
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get document tree items', error);
      return [];
    }
  }

  /**
   * 获取文档目录下的文件和子目录
   */
  private async getDocumentFiles(
    vaultRef: { id: string; name: string },
    dirPath: string,
    relativePath: string
  ): Promise<DocumentTreeItem[]> {
    try {
      const listResult = await this.treeService.listDirectory(
        vaultRef,
        dirPath,
        { includeHidden: false }
      );

      if (!listResult.success) {
        return [];
      }

      const items: DocumentTreeItem[] = [];
      for (const node of listResult.value) {
        const itemRelativePath = relativePath ? `${relativePath}/${node.name}` : node.name;

        if (node.isDirectory) {
          items.push(
            new DocumentTreeItem(
              undefined,
              vscode.TreeItemCollapsibleState.Collapsed,
              vaultRef.name,
              'folder',
              itemRelativePath,
              undefined,
              vaultRef.id
            )
          );
        } else if (node.isFile) {
          // 文件节点：直接使用文件系统信息，与模板视图保持一致
          const artifactPath = node.path.startsWith('artifacts/')
            ? node.path.substring('artifacts/'.length)
            : node.path;
          
          const fileItem = new DocumentTreeItem(
            undefined,
            vscode.TreeItemCollapsibleState.None,
            vaultRef.name,
            'document',
            undefined,
            artifactPath,
            vaultRef.id
          );
          // 添加打开文件的命令
          fileItem.command = {
            command: 'vscode.open',
            title: 'Open Document',
            arguments: [vscode.Uri.file(node.fullPath)],
          };
          items.push(fileItem);
        }
      }

      return items;
    } catch (error: any) {
      this.logger.error(`Failed to read document directory: ${dirPath}`, error);
      return [];
    }
  }
}

