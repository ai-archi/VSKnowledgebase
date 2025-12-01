import * as vscode from 'vscode';
import { VaultApplicationService } from '../../application/VaultApplicationService';
import { ArtifactApplicationService, FileTreeNode } from '../../application/ArtifactApplicationService';
import { Logger } from '../../../../core/logger/Logger';
import { BaseArtifactTreeItem } from './BaseArtifactTreeItem';
import { TreeViewUtils } from '../../infrastructure/utils/TreeViewUtils';
import { PathUtils } from '../../infrastructure/utils/PathUtils';

/**
 * 基础 Artifact 树视图提供者
 * 提供通用树视图逻辑，子类只需实现少量抽象方法
 */
export abstract class BaseArtifactTreeViewProvider<T extends BaseArtifactTreeItem>
  implements vscode.TreeDataProvider<T>
{
  private _onDidChangeTreeData: vscode.EventEmitter<T | undefined | null | void> =
    new vscode.EventEmitter<T | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<T | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    protected vaultService: VaultApplicationService,
    protected treeService: ArtifactApplicationService,
    protected logger: Logger
  ) {}

  /**
   * 刷新视图
   * @param element 要刷新的元素，如果为 undefined 则刷新整个树
   */
  refresh(element?: T | undefined | null | void): void {
    this._onDidChangeTreeData.fire(element);
  }

  /**
   * 获取树项
   */
  getTreeItem(element: T): vscode.TreeItem {
    return element;
  }

  /**
   * 通过递归查找获取实际的 TreeItem 节点
   */
  async findTreeItem(
    element: T | undefined,
    predicate: (item: T) => boolean
  ): Promise<T | undefined> {
    return TreeViewUtils.findTreeItem(this, element, predicate);
  }

  /**
   * 获取子节点
   */
  async getChildren(element?: T): Promise<T[]> {
    try {
      // 根节点：返回所有 vault
      if (!element) {
        return await this.getRootVaults();
      }

      // Vault 节点：显示该 vault 的根目录下的文件和子目录
      if (element.isVault(element.vaultName!)) {
        return await this.getVaultChildren(element);
      }

      // 文件夹节点：显示该目录下的文件和子目录
      if (element.folderPath !== undefined && element.vaultName) {
        return await this.getFolderChildren(element);
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get tree items', error);
      return [];
    }
  }

  /**
   * 获取父节点
   * 这是使用 reveal() 方法所必需的
   */
  async getParent(element: T): Promise<T | undefined> {
    try {
      // 根节点没有父节点
      if (!element.vaultName) {
        return undefined;
      }

      // Vault 节点的父节点是根节点
      if (element.isVault(element.vaultName)) {
        return undefined;
      }

      // 文件节点的父节点是包含它的文件夹
      if (element.filePath !== undefined && element.vaultName) {
        const dirPath = PathUtils.dirname(element.filePath);
        if (dirPath === '') {
          // 文件在根目录，父节点是 vault
          return await this.findVaultNode(element.vaultName);
        } else {
          // 文件在子目录，父节点是文件夹
          // 直接创建父文件夹节点，不需要查找
          return this.createTreeItem(
            PathUtils.basename(dirPath),
            vscode.TreeItemCollapsibleState.Collapsed,
            element.vaultName,
            element.vaultId,
            dirPath,
            undefined,
            this.getItemContextValue(undefined, 'folder')
          );
        }
      }

      // 文件夹节点的父节点
      if (element.folderPath !== undefined && element.vaultName) {
        const dirPath = PathUtils.dirname(element.folderPath);
        if (dirPath === '') {
          // 文件夹在根目录，父节点是 vault
          return await this.findVaultNode(element.vaultName);
        } else {
          // 文件夹在子目录，父节点是父文件夹
          // 直接创建父文件夹节点，不需要查找
          return this.createTreeItem(
            PathUtils.basename(dirPath),
            vscode.TreeItemCollapsibleState.Collapsed,
            element.vaultName,
            element.vaultId,
            dirPath,
            undefined,
            this.getItemContextValue(undefined, 'folder')
          );
        }
      }

      return undefined;
    } catch (error: any) {
      this.logger.error('Failed to get parent node', error);
      return undefined;
    }
  }

  /**
   * 查找 vault 节点
   */
  private async findVaultNode(vaultName: string): Promise<T | undefined> {
    const rootVaults = await this.getRootVaults();
    return rootVaults.find(item => item.isVault(vaultName));
  }

  /**
   * 获取根节点（所有 vault）
   */
  private async getRootVaults(): Promise<T[]> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success || vaultsResult.value.length === 0) {
      return [];
    }
    return vaultsResult.value.map(vault =>
      this.createTreeItem(
        vault.name,
        vscode.TreeItemCollapsibleState.Collapsed,
        vault.name,
        vault.id,
        undefined,
        undefined,
        this.getItemContextValue(undefined, 'vault')
      )
    );
  }

  /**
   * 获取 Vault 节点的子节点
   */
  private async getVaultChildren(element: T): Promise<T[]> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success) {
      return [];
    }
    const vault = vaultsResult.value.find(v => v.name === element.vaultName);
    if (!vault) {
      return [];
    }
    const vaultRef = { id: vault.id, name: vault.name };
    const rootDir = this.getRootDirectory();

    const existsResult = await this.treeService.exists(vaultRef, rootDir);
    if (!existsResult.success || !existsResult.value) {
      return [];
    }

    return this.getDirectoryFiles(vaultRef, rootDir, '');
  }

  /**
   * 获取文件夹节点的子节点
   */
  private async getFolderChildren(element: T): Promise<T[]> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success) {
      return [];
    }
    const vault = vaultsResult.value.find(v => v.name === element.vaultName);
    if (!vault) {
      return [];
    }
    const vaultRef = { id: vault.id, name: vault.name };
    const rootDir = this.getRootDirectory();
    const dirPath = `${rootDir}/${element.folderPath}`;

    const isDirResult = await this.treeService.isDirectory(vaultRef, dirPath);
    if (!isDirResult.success || !isDirResult.value) {
      return [];
    }

    return this.getDirectoryFiles(vaultRef, dirPath, element.folderPath!);
  }

  /**
   * 获取目录下的文件和子目录
   */
  private async getDirectoryFiles(
    vaultRef: { id: string; name: string },
    dirPath: string,
    relativePath: string
  ): Promise<T[]> {
    try {
      const listResult = await this.treeService.listDirectory(vaultRef, dirPath, {
        includeHidden: false,
      });

      if (!listResult.success) {
        return [];
      }

      const items: T[] = [];
      for (const node of listResult.value) {
        const itemRelativePath = relativePath ? `${relativePath}/${node.name}` : node.name;

        if (node.isDirectory) {
          items.push(
            this.createTreeItem(
              node.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              vaultRef.name,
              vaultRef.id,
              itemRelativePath,
              undefined,
              this.getItemContextValue(undefined, 'folder')
            )
          );
        } else if (node.isFile) {
          const fileItem = await this.createFileItem(
            node,
            vaultRef,
            itemRelativePath,
            dirPath
          );
          items.push(fileItem);
        }
      }

      return items;
    } catch (error: any) {
      this.logger.error(`Failed to read directory: ${dirPath}`, error);
      return [];
    }
  }

  /**
   * 创建文件项
   */
  private async createFileItem(
    node: FileTreeNode,
    vaultRef: { id: string; name: string },
    relativePath: string,
    dirPath: string
  ): Promise<T> {
    // 移除根目录前缀
    const artifactPath = PathUtils.removeRootDirPrefix(node.path, this.getRootDirectory());

    const fileItem = this.createTreeItem(
      PathUtils.basename(node.path),
      vscode.TreeItemCollapsibleState.None,
      vaultRef.name,
      vaultRef.id,
      undefined,
      artifactPath,
      this.getItemContextValue(undefined, 'file')
    );

    // 设置图标
    const icon = this.getItemIcon(fileItem, node);
    if (icon) {
      fileItem.iconPath = icon;
    }

    // 设置工具提示
    fileItem.tooltip = artifactPath;

    // 设置打开文件的命令
    fileItem.command = {
      command: 'vscode.open',
      title: 'Open File',
      arguments: [vscode.Uri.file(node.fullPath)],
    };

    // 允许子类增强文件项
    await this.enhanceFileItem(fileItem, node, vaultRef);

    return fileItem;
  }

  // ==================== 抽象方法（子类必须实现） ====================

  /**
   * 返回根目录名称（如 'artifacts' 或 'templates'）
   */
  protected abstract getRootDirectory(): string;

  /**
   * 创建树项
   */
  protected abstract createTreeItem(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string
  ): T;

  /**
   * 获取上下文值
   */
  protected abstract getItemContextValue(
    item: T | undefined,
    type: 'vault' | 'folder' | 'file'
  ): string;

  /**
   * 获取图标
   */
  protected abstract getItemIcon(
    item: T,
    node: FileTreeNode
  ): vscode.ThemeIcon | vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | undefined;

  // ==================== 可选方法（子类可以覆盖） ====================

  /**
   * 增强文件项（子类可以覆盖以添加特定逻辑）
   */
  protected async enhanceFileItem(
    item: T,
    node: FileTreeNode,
    vaultRef: { id: string; name: string }
  ): Promise<void> {
    // 默认实现为空，子类可以覆盖
  }
}

