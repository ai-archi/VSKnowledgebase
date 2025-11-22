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
   * 获取指定 vault 的 TreeItem（用于展开/折叠操作）
   */
  async getVaultTreeItem(vaultName: string): Promise<DocumentTreeItem | undefined> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success) {
      return undefined;
    }

    const vault = vaultsResult.value.find(v => v.name === vaultName);
    if (!vault) {
      return undefined;
    }

    return new DocumentTreeItem(
      undefined,
      vscode.TreeItemCollapsibleState.Collapsed,
      vault.name,
      'vault'
    );
  }

  async getChildren(element?: DocumentTreeItem): Promise<DocumentTreeItem[]> {
    try {
      this.logger.info(`DocumentTreeViewProvider.getChildren called, element: ${element ? (element.vaultName || element.artifact?.title) : 'root'}`);
      
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        this.logger.warn('Failed to list vaults');
        return [];
      }
      this.logger.info(`listVaults result: success=${vaultsResult.success}, count=${vaultsResult.value.length}`);
      
      if (vaultsResult.value.length === 0) {
        this.logger.warn('No vaults found');
        return [];
      }

      // 根节点：显示所有 vault
      if (!element) {
        this.logger.info(`Returning ${vaultsResult.value.length} vaults as root items`);
        return vaultsResult.value.map(vault =>
          new DocumentTreeItem(
            undefined,
            vscode.TreeItemCollapsibleState.Collapsed,
            vault.name,
            'vault'
          )
        );
      }

      // Vault 节点：显示该 vault 的文件夹和文档（按文件夹结构组织）
      if (element.vaultName && element.folderPath === undefined) {
        this.logger.info(`Getting documents for vault: ${element.vaultName}`);
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          this.logger.warn(`Vault not found: ${element.vaultName}`);
          return [];
        }

        this.logger.info(`Calling documentService.listDocuments for vault: ${vault.id} (${vault.name})`);
        const documentsResult = await this.documentService.listDocuments(vault.id);
        
        if (!documentsResult.success) {
          this.logger.error(`Failed to list documents: ${documentsResult.error?.message || 'unknown error'}`);
          return [];
        }
        
        this.logger.info(`listDocuments result: success=${documentsResult.success}, count=${documentsResult.value.length}`);
        
        // 按文件夹结构组织文档
        return this.organizeByFolders(documentsResult.value, element.vaultName);
      }

      // 文件夹节点：显示该文件夹下的文件和子文件夹
      if (element.folderPath !== undefined && element.vaultName) {
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          return [];
        }

        const documentsResult = await this.documentService.listDocuments(vault.id);
        if (!documentsResult.success) {
          return [];
        }

        // 过滤出该文件夹下的文件和子文件夹
        const folderItems: DocumentTreeItem[] = [];
        const folderPrefix = element.folderPath === '' ? '' : `${element.folderPath}/`;
        const normalizedFolderPath = element.folderPath === '' ? '' : element.folderPath;
        const subFolders = new Set<string>();
        
        for (const artifact of documentsResult.value) {
          const artifactDir = path.dirname(artifact.path);
          // 标准化路径
          const normalizedDir = artifactDir === '.' || artifactDir === '' ? '' : artifactDir;
          
          // 检查是否在当前文件夹下
          if (normalizedDir === normalizedFolderPath) {
            // 直接在当前文件夹下的文件
            folderItems.push(new DocumentTreeItem(artifact, vscode.TreeItemCollapsibleState.None));
          } else if (normalizedDir.startsWith(folderPrefix)) {
            // 在当前文件夹的子目录中
            const relativePath = normalizedDir.substring(folderPrefix.length);
            const parts = relativePath.split('/').filter(p => p);
            
            if (parts.length > 0) {
              // 检查是否是直接子文件夹
              const firstPart = parts[0];
              if (parts.length === 1) {
                // 这是直接子文件夹下的文件，需要显示子文件夹
                subFolders.add(firstPart);
              } else {
                // 这是更深层的文件夹，只显示第一层
                subFolders.add(firstPart);
              }
            }
          }
        }

        // 添加直接子文件夹
        for (const subFolderName of Array.from(subFolders).sort()) {
          const subFolderPath = folderPrefix === '' ? subFolderName : `${folderPrefix}${subFolderName}`;
          folderItems.push(new DocumentTreeItem(
            undefined,
            vscode.TreeItemCollapsibleState.Collapsed,
            element.vaultName,
            'folder',
            subFolderPath
          ));
        }

        return folderItems;
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get document tree items', error);
      return [];
    }
  }

  /**
   * 按文件夹结构组织文档
   */
  private organizeByFolders(artifacts: Artifact[], vaultName: string): DocumentTreeItem[] {
    const items: DocumentTreeItem[] = [];
    const rootFiles: Artifact[] = [];
    const rootFolders = new Set<string>();

    // 第一遍：收集根目录下的文件和第一层文件夹
    for (const artifact of artifacts) {
      const artifactDir = path.dirname(artifact.path);
      
      // 标准化路径：将 '.' 和 '' 都视为根目录
      const normalizedDir = artifactDir === '.' || artifactDir === '' ? '' : artifactDir;
      
      if (normalizedDir === '') {
        // 根目录下的文件
        rootFiles.push(artifact);
      } else {
        // 有文件夹路径的文件，提取第一层文件夹
        const parts = normalizedDir.split('/').filter(p => p);
        if (parts.length > 0) {
          rootFolders.add(parts[0]);
        }
      }
    }

    // 添加根目录下的文件
    for (const artifact of rootFiles) {
      items.push(new DocumentTreeItem(artifact, vscode.TreeItemCollapsibleState.None));
    }

    // 添加根目录下的第一层文件夹
    for (const folderName of Array.from(rootFolders).sort()) {
      items.push(new DocumentTreeItem(
        undefined,
        vscode.TreeItemCollapsibleState.Collapsed,
        vaultName,
        'folder',
        folderName
      ));
    }

    return items;
  }
}

