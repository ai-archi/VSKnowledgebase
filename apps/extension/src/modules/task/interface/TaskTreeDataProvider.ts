import * as vscode from 'vscode';
import * as path from 'path';
import { BaseArtifactTreeItem } from '../../shared/interface/tree/BaseArtifactTreeItem';
import { BaseArtifactTreeViewProvider } from '../../shared/interface/tree/BaseArtifactTreeViewProvider';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService, FileTreeNode } from '../../shared/application/ArtifactApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 任务树项
 */
export class TaskTreeItem extends BaseArtifactTreeItem {
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
 * 任务树视图数据提供者
 */
export class TaskTreeDataProvider extends BaseArtifactTreeViewProvider<TaskTreeItem> {
  constructor(
    vaultService: VaultApplicationService,
    treeService: ArtifactApplicationService,
    logger: Logger
  ) {
    super(vaultService, treeService, logger);
  }

  protected getRootDirectory(): string {
    return 'tasks';
  }

  protected createTreeItem(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string
  ): TaskTreeItem {
    return new TaskTreeItem(
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
    item: TaskTreeItem | undefined,
    type: 'vault' | 'folder' | 'file'
  ): string {
    switch (type) {
      case 'vault':
        return 'vault';
      case 'folder':
        return 'task.directory';
      case 'file':
        return 'task.file';
      default:
        return 'task.file';
    }
  }

  protected getItemIcon(
    item: TaskTreeItem,
    node: FileTreeNode
  ): vscode.ThemeIcon | undefined {
    if (node.isDirectory) {
      return new vscode.ThemeIcon('folder');
    }

    const ext = path.extname(node.path).toLowerCase();
    if (ext === '.md') {
      return new vscode.ThemeIcon('checklist');
    } else {
      return new vscode.ThemeIcon('file');
    }
  }
}

