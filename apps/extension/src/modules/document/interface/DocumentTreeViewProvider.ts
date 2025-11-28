import * as vscode from 'vscode';
import * as path from 'path';
import { BaseArtifactTreeItem } from '../../shared/interface/tree/BaseArtifactTreeItem';
import { BaseArtifactTreeViewProvider } from '../../shared/interface/tree/BaseArtifactTreeViewProvider';
import { Artifact } from '../../shared/domain/entity/artifact';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactTreeApplicationService, FileTreeNode } from '../../shared/application/ArtifactTreeApplicationService';
import { Logger } from '../../../core/logger/Logger';

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
    treeService: ArtifactTreeApplicationService,
    logger: Logger
  ) {
    super(vaultService, treeService, logger);
  }

  protected getRootDirectory(): string {
    return 'artifacts';
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

