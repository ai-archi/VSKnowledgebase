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
   * 注意：VSCode 会维护节点的展开/折叠状态，这里返回的 collapsibleState 只是初始状态
   * 为了确保折叠功能正常工作，我们需要确保返回的 TreeItem 对象能够正确反映节点的可折叠状态
   * 
   * 重要：直接返回 element 对象，VSCode 会维护实际的展开/折叠状态。
   * collapsibleState 只是用来判断节点是否可折叠（Collapsed/Expanded/None），
   * 实际的展开/折叠状态由 VSCode 内部管理，用户点击折叠图标时 VSCode 会自动处理。
   */
  getTreeItem(element: T): vscode.TreeItem {
    // 直接返回 element，VSCode 会维护实际的展开/折叠状态
    // collapsibleState 只是用来判断节点是否可折叠，实际的展开/折叠由 VSCode 管理
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

      // 获取 vault 引用
      const vaultRef = await this.getVaultRef(element);
      if (!vaultRef) {
        return [];
      }

      // Vault 节点：显示该 vault 的根目录下的文件和子目录
      if (element.isVault(element.vaultName!)) {
        const rootDir = this.getRootDirectory();
        return this.getDirectoryFiles(vaultRef, rootDir, '');
      }

      // 文件夹节点：显示该目录下的文件和子目录
      if (element.folderPath) {
        const rootDir = this.getRootDirectory();
        const dirPath = `${rootDir}/${element.folderPath}`;
        return this.getDirectoryFiles(vaultRef, dirPath, element.folderPath);
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
      // 根节点或 Vault 节点没有父节点
      if (!element.vaultName || element.isVault(element.vaultName)) {
        return undefined;
      }

      // 获取父路径（文件或文件夹的父目录）
      const currentPath = element.filePath || element.folderPath;
      if (!currentPath) {
        return undefined;
      }

      const parentPath = PathUtils.dirname(currentPath);
      
      // 如果父路径为空，说明在根目录，父节点是 vault
      if (parentPath === '') {
        const rootVaults = await this.getRootVaults();
        return rootVaults.find(item => item.isVault(element.vaultName!));
      }

      // 否则，父节点是父文件夹
      return this.createTreeItem(
        PathUtils.basename(parentPath),
        vscode.TreeItemCollapsibleState.Collapsed,
        element.vaultName,
        element.vaultId,
        parentPath,
        undefined,
        this.getItemContextValue(undefined, 'folder')
      );
    } catch (error: any) {
      this.logger.error('Failed to get parent node', error);
      return undefined;
    }
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
   * 获取 vault 引用（从 element 或通过查找）
   */
  private async getVaultRef(element: T): Promise<{ id: string; name: string } | undefined> {
    // 如果 element 中已有 vaultId 和 vaultName，直接使用
    if (element.vaultId && element.vaultName) {
      return { id: element.vaultId, name: element.vaultName };
    }

    // 否则查找 vault
    if (!element.vaultName) {
      return undefined;
    }

    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success) {
      return undefined;
    }

    const vault = vaultsResult.value.find(v => v.name === element.vaultName);
    return vault ? { id: vault.id, name: vault.name } : undefined;
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
      const filePromises: Promise<T>[] = [];

      for (const node of listResult.value) {
        const itemRelativePath = relativePath ? `${relativePath}/${node.name}` : node.name;

        if (node.isDirectory) {
          // 目录：同步创建
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
          // 文件：异步创建（可能需要额外处理）
          filePromises.push(this.createFileItem(node, vaultRef, itemRelativePath, dirPath));
        }
      }

      // 等待所有文件项创建完成
      if (filePromises.length > 0) {
        const fileItems = await Promise.all(filePromises);
        items.push(...fileItems);
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

