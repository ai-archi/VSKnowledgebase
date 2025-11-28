import * as vscode from 'vscode';
import * as path from 'path';
import { BaseArtifactTreeItem } from '../../shared/interface/tree/BaseArtifactTreeItem';
import { BaseArtifactTreeViewProvider } from '../../shared/interface/tree/BaseArtifactTreeViewProvider';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactTreeApplicationService, FileTreeNode } from '../../shared/application/ArtifactTreeApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 模板树项
 */
export class TemplateTreeItem extends BaseArtifactTreeItem {
  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string
  ) {
    super(label, collapsibleState, vaultName, vaultId, folderPath, filePath, contextValue);
  }
}

/**
 * 模板树视图数据提供者
 */
export class TemplateTreeDataProvider extends BaseArtifactTreeViewProvider<TemplateTreeItem> {
  constructor(
    vaultService: VaultApplicationService,
    treeService: ArtifactTreeApplicationService,
    logger: Logger
  ) {
    super(vaultService, treeService, logger);
  }

  protected getRootDirectory(): string {
    return 'templates';
  }

  protected createTreeItem(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string
  ): TemplateTreeItem {
    return new TemplateTreeItem(
      label,
      collapsibleState,
      vaultName,
      vaultId,
      folderPath,
      filePath,
      contextValue
    );
        }

  protected getItemContextValue(
    item: TemplateTreeItem | undefined,
    type: 'vault' | 'folder' | 'file'
  ): string {
    switch (type) {
      case 'vault':
        return 'vault';
      case 'folder':
        return 'template.directory';
      case 'file':
        return 'template.file';
      default:
        return 'template.file';
    }
  }

  protected getItemIcon(
    item: TemplateTreeItem,
    node: FileTreeNode
  ): vscode.ThemeIcon | undefined {
    if (node.isDirectory) {
      return new vscode.ThemeIcon('folder');
    }

    const ext = path.extname(node.path).toLowerCase();
    if (ext === '.yml' || ext === '.yaml') {
      return new vscode.ThemeIcon('file-code');
    } else if (ext === '.md') {
      return new vscode.ThemeIcon('markdown');
        } else {
      return new vscode.ThemeIcon('file');
    }
  }
}
