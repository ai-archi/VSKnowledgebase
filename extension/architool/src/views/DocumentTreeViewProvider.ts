import * as vscode from 'vscode';
import * as path from 'path';
import { BaseArtifactTreeItem } from '../modules/shared/interface/tree/BaseArtifactTreeItem';
import { BaseArtifactTreeViewProvider } from '../modules/shared/interface/tree/BaseArtifactTreeViewProvider';
import { FileTreeNode } from '../modules/shared/application/ArtifactApplicationService';
import { Artifact } from '../modules/shared/domain/entity/artifact';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { Logger } from '../core/logger/Logger';

export class DocumentTreeItem extends BaseArtifactTreeItem {
  public readonly artifact?: Artifact;

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
      // 使用文件名（包含扩展名）作为显示名称
      const fileName = path.basename(artifact.path) || artifact.title;
      super(fileName, collapsibleState, artifact.vault.name, artifact.vault.id, undefined, artifact.path, 'document');
      this.artifact = artifact;
      this.tooltip = artifact.path;
      this.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [vscode.Uri.file(artifact.contentLocation)],
      };
    } else if (filePath !== undefined) {
      // 文件节点（未索引的文件，直接使用文件系统信息）
      const fileName = path.basename(filePath);
      super(fileName, collapsibleState, vaultName, vaultId, undefined, filePath, 'document');
      this.tooltip = filePath;
    } else if (folderPath !== undefined) {
      // 文件夹节点
      const folderName = path.basename(folderPath) || folderPath;
      super(folderName, collapsibleState, vaultName, vaultId, folderPath, undefined, contextValue || 'folder');
      this.tooltip = `Folder: ${folderPath}`;
    } else if (vaultName) {
      super(vaultName, collapsibleState, vaultName, vaultId, undefined, undefined, contextValue || 'vault');
      this.tooltip = `Vault: ${vaultName}`;
    } else {
      super('', collapsibleState);
    }
  }
}

export class DocumentTreeViewProvider extends BaseArtifactTreeViewProvider<DocumentTreeItem> {
  constructor(
    vaultService: VaultApplicationService,
    treeService: ArtifactApplicationService,
    logger: Logger
  ) {
    super(vaultService, treeService, logger);
  }

  protected getRootDirectory(): string {
    // 新结构：文档文件直接在 vault 根目录下，不再使用 artifacts 子目录
    return '';
  }

  /**
   * 过滤 vault：只显示 document 类型的 vault
   */
  protected filterVaults(vaults: Array<{ id: string; name: string; type?: string }>): Array<{ id: string; name: string; type?: string }> {
    return vaults.filter(vault => vault.type === 'document');
  }

  /**
   * 过滤节点：文档视图排除所有 archi-* 目录
   */
  protected shouldIncludeNode(node: FileTreeNode, dirPath: string): boolean {
    // 在 vault 根目录时，排除所有 archi-* 目录
    if (!dirPath && node.isDirectory && node.name.startsWith('archi-')) {
      return false;
    }
    return true;
  }

  protected createTreeItem(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string
  ): DocumentTreeItem {
    return new DocumentTreeItem(
      undefined,
      collapsibleState,
      vaultName,
      contextValue,
      folderPath,
      filePath,
      vaultId
    );
  }

  protected getItemContextValue(
    item: DocumentTreeItem | undefined,
    type: 'vault' | 'folder' | 'file'
  ): string {
    switch (type) {
      case 'vault':
        return 'vault';
      case 'folder':
        return 'folder';
      case 'file':
        return 'document';
      default:
        return 'document';
    }
  }

  protected getItemIcon(
    item: DocumentTreeItem,
    node: FileTreeNode
  ): vscode.ThemeIcon | undefined {
    if (node.isDirectory) {
      return new vscode.ThemeIcon('folder');
    }

    const ext = path.extname(node.path).toLowerCase();
    if (ext === '.md') {
      return new vscode.ThemeIcon('markdown');
    } else if (ext === '.yml' || ext === '.yaml') {
      return new vscode.ThemeIcon('file-code');
    } else {
      return new vscode.ThemeIcon('file');
    }
  }
}
