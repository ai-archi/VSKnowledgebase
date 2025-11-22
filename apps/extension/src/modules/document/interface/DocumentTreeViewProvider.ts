import * as vscode from 'vscode';
import { DocumentApplicationService } from '../application/DocumentApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import * as path from 'path';

export class DocumentTreeItem extends vscode.TreeItem {
  public readonly artifact?: Artifact;
  public readonly vaultName?: string;
  public readonly folderPath?: string; // 文件夹路径（相对于 vault 的 artifacts 目录）

  constructor(
    artifact?: Artifact,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    vaultName?: string,
    contextValue?: string,
    folderPath?: string
  ) {
    if (artifact) {
      super(artifact.title, collapsibleState);
      this.artifact = artifact;
      this.tooltip = artifact.path;
      this.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [vscode.Uri.file(artifact.contentLocation)],
      };
      this.contextValue = 'document';
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

      // Vault 节点：返回该 vault 下的文件和文件夹
      if (element.isVault(element.vaultName!)) {
        return this.getVaultChildren(element.vaultName!);
      }

      // 文件夹节点：返回该文件夹下的文件和子文件夹
      if (element.folderPath !== undefined && element.vaultName) {
        return this.getFolderChildren(element.vaultName, element.folderPath);
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get document tree items', error);
      return [];
    }
  }

  /**
   * 获取 vault 对象
   */
  private async getVaultByName(vaultName: string) {
    const vaultsResult = await this.vaultService.listVaults();
    return vaultsResult.success ? vaultsResult.value.find(v => v.name === vaultName) : undefined;
  }

  /**
   * 获取 vault 的子节点（文件和文件夹）
   */
  private async getVaultChildren(vaultName: string): Promise<DocumentTreeItem[]> {
    const vault = await this.getVaultByName(vaultName);
    if (!vault) {
      return [];
    }

    const documentsResult = await this.documentService.listDocuments(vault.id);
    if (!documentsResult.success) {
      return [];
    }

    return this.organizeByFolders(documentsResult.value, vaultName);
  }

  /**
   * 获取文件夹的子节点（文件和子文件夹）
   */
  private async getFolderChildren(vaultName: string, folderPath: string): Promise<DocumentTreeItem[]> {
    const vault = await this.getVaultByName(vaultName);
    if (!vault) {
      return [];
    }

    const documentsResult = await this.documentService.listDocuments(vault.id);
    if (!documentsResult.success) {
      return [];
    }

    const items: DocumentTreeItem[] = [];
    const folderPrefix = folderPath === '' ? '' : `${folderPath}/`;
    const subFolders = new Set<string>();

    for (const artifact of documentsResult.value) {
      const artifactDir = this.normalizePath(path.dirname(artifact.path));
      const folderDir = this.normalizePath(folderPath);

      // 直接在当前文件夹下的文件
      if (artifactDir === folderDir) {
        items.push(new DocumentTreeItem(artifact, vscode.TreeItemCollapsibleState.None));
      }
      // 在子文件夹中的文件
      else if (artifactDir.startsWith(folderPrefix)) {
        const relativePath = artifactDir.substring(folderPrefix.length);
        const firstPart = relativePath.split('/').filter(p => p)[0];
        if (firstPart) {
          subFolders.add(firstPart);
        }
      }
    }

    // 添加子文件夹
    for (const subFolderName of Array.from(subFolders).sort()) {
      const subFolderPath = folderPrefix === '' ? subFolderName : `${folderPrefix}${subFolderName}`;
      items.push(new DocumentTreeItem(
        undefined,
        vscode.TreeItemCollapsibleState.Collapsed,
        vaultName,
        'folder',
        subFolderPath
      ));
    }

    return items;
  }

  /**
   * 标准化路径：将 '.' 和 '' 都视为根目录
   */
  private normalizePath(dirPath: string): string {
    return dirPath === '.' || dirPath === '' ? '' : dirPath;
  }

  /**
   * 按文件夹结构组织文档（vault 根目录下的文件和文件夹）
   */
  private organizeByFolders(artifacts: Artifact[], vaultName: string): DocumentTreeItem[] {
    const items: DocumentTreeItem[] = [];
    const rootFiles: Artifact[] = [];
    const rootFolders = new Set<string>();

    for (const artifact of artifacts) {
      const artifactDir = this.normalizePath(path.dirname(artifact.path));
      
      if (artifactDir === '') {
        rootFiles.push(artifact);
      } else {
        const firstFolder = artifactDir.split('/').filter(p => p)[0];
        if (firstFolder) {
          rootFolders.add(firstFolder);
        }
      }
    }

    // 先添加文件，再添加文件夹
    rootFiles.forEach(artifact => {
      items.push(new DocumentTreeItem(artifact, vscode.TreeItemCollapsibleState.None));
    });

    Array.from(rootFolders).sort().forEach(folderName => {
      items.push(new DocumentTreeItem(
        undefined,
        vscode.TreeItemCollapsibleState.Collapsed,
        vaultName,
        'folder',
        folderName
      ));
    });

    return items;
  }
}

