import * as vscode from 'vscode';
import * as path from 'path';
import { BaseArtifactTreeItem } from '../../shared/interface/tree/BaseArtifactTreeItem';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService, FileTreeNode } from '../../shared/application/ArtifactApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { TreeViewUtils } from '../../shared/infrastructure/utils/TreeViewUtils';
import { PathUtils } from '../../shared/infrastructure/utils/PathUtils';

/**
 * 助手树项（支持archi-templates和archi-ai-enhancements）
 * 
 * 设计原则：
 * - folderPath 和 filePath 统一从 vault 根目录开始（如 'archi-templates/structure/template.yml'）
 * - rootType 仅用于展示层级和上下文判断，不影响路径处理
 * - 展示可以从 archi-templates 或 archi-ai-enhancements 开始，但工件处理统一从 vault 开始
 */
export class AssistantsTreeItem extends BaseArtifactTreeItem {
  // 标识这是哪个根目录（archi-templates 或 archi-ai-enhancements），仅用于展示和上下文判断
  rootType?: 'archi-templates' | 'archi-ai-enhancements';

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string,
    rootType?: 'archi-templates' | 'archi-ai-enhancements'
  ) {
    super(label, collapsibleState, vaultName, vaultId, folderPath, filePath, contextValue);
    this.rootType = rootType;
  }
}

/**
 * 助手树视图数据提供者
 * 显示 archi-templates 和 archi-ai-enhancements 两个目录
 * 
 * 设计原则：
 * - 展示层可以从 vault 下层的分类（archi-templates/archi-ai-enhancements）开始
 * - 工件处理层统一从 vault 根目录开始，所有路径和 ID 保持一致
 * - 解耦展示逻辑和工件处理逻辑，避免不同视图采用不同的处理方式
 */
export class AssistantsTreeDataProvider implements vscode.TreeDataProvider<AssistantsTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AssistantsTreeItem | undefined | null | void> =
    new vscode.EventEmitter<AssistantsTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AssistantsTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private readonly ROOT_DIRECTORIES = ['archi-templates', 'archi-ai-enhancements'] as const;

  constructor(
    private vaultService: VaultApplicationService,
    private treeService: ArtifactApplicationService,
    private logger: Logger
  ) {}

  refresh(element?: AssistantsTreeItem | undefined | null | void): void {
    this._onDidChangeTreeData.fire(element);
  }

  getTreeItem(element: AssistantsTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: AssistantsTreeItem): Promise<AssistantsTreeItem[]> {
    try {
      // 根节点：返回所有 vault
      if (!element) {
        this.logger.debug('Getting root vaults');
        return await this.getRootVaults();
      }

      // 获取 vault 引用
      const vaultRef = await this.getVaultRef(element);
      if (!vaultRef) {
        this.logger.warn('Failed to get vault reference', { element: element.label });
        return [];
      }

      // Vault 节点：显示 archi-templates 和 archi-ai-enhancements 两个根目录
      // 注意：需要排除有 rootType 的节点（根目录节点也有 folderPath === undefined）
      if (element.isVault(element.vaultName!) && !element.rootType) {
        this.logger.info(`[AssistantsTree] Expanding vault node: ${element.vaultName}`);
        const rootItems: AssistantsTreeItem[] = [];
        
        for (const rootDir of this.ROOT_DIRECTORIES) {
          // 创建根目录节点（folderPath 设为 undefined，表示这是根目录）
          const rootItem = this.createTreeItem(
            rootDir === 'archi-templates' ? '📁 Templates' : '🤖 AI Enhancements',
            vscode.TreeItemCollapsibleState.Collapsed,
            element.vaultName,
            element.vaultId,
            undefined, // folderPath 设为 undefined，表示这是根目录节点
            undefined,
            this.getItemContextValue(undefined, 'folder', rootDir),
            rootDir as 'archi-templates' | 'archi-ai-enhancements'
          );
          
          rootItems.push(rootItem);
        }
        
        this.logger.info(`[AssistantsTree] Created ${rootItems.length} root directory items for vault: ${element.vaultName}`);
        return rootItems;
      }

      // 根目录节点（archi-templates 或 archi-ai-enhancements）：显示该目录下的文件和子目录
      // 判断条件：rootType 存在 且 folderPath 为 undefined（这是根目录节点的特征）
      // 根目录节点是在 Vault 节点下创建的，folderPath 被显式设置为 undefined
      if (element.rootType && element.folderPath === undefined && !element.filePath) {
        this.logger.info(`[AssistantsTree] Expanding root directory node: ${element.rootType} in vault: ${vaultRef.name}`);
        const children = await this.getDirectoryFiles(vaultRef, element.rootType, '', element.rootType);
        this.logger.info(`[AssistantsTree] Found ${children.length} items in root directory: ${element.rootType}`);
        return children;
      }

      // 文件夹节点：显示该目录下的文件和子目录
      // 判断条件：folderPath 存在且不为空，且 rootType 存在，且不是文件节点
      // folderPath 是相对于 vault 根目录的完整路径（统一从 vault 开始）
      // 例如：'archi-templates/structure' 或 'archi-ai-enhancements/commands'
      // 注意：即使 folderPath === rootType（如 'archi-templates'），只要 folderPath 不是 undefined，就是文件夹节点
      if (element.folderPath !== undefined && element.folderPath !== '' && element.rootType && !element.filePath) {
        const dirPath = element.folderPath;
        // 确保 dirPath 以 rootType 开头，避免路径错误
        if (!dirPath.startsWith(element.rootType)) {
          this.logger.warn(`Unexpected folder path: ${dirPath}, rootType: ${element.rootType}`);
          return [];
        }
        this.logger.debug(`Expanding folder node: ${dirPath} in vault: ${vaultRef.name}`);
        const children = await this.getDirectoryFiles(vaultRef, dirPath, dirPath, element.rootType);
        this.logger.debug(`Found ${children.length} items in folder: ${dirPath}`);
        return children;
      }

      this.logger.debug(`No children found for element: ${element.label}`, {
        rootType: element.rootType,
        folderPath: element.folderPath,
        filePath: element.filePath,
        isVault: element.isVault(element.vaultName || '')
      });
      return [];
    } catch (error: any) {
      this.logger.error('Failed to get tree items', error);
      return [];
    }
  }

  async getParent(element: AssistantsTreeItem): Promise<AssistantsTreeItem | undefined> {
    try {
      // 根节点或 Vault 节点没有父节点
      if (!element.vaultName || element.isVault(element.vaultName)) {
        return undefined;
      }

      // 根目录节点（archi-templates 或 archi-ai-enhancements）的父节点是 vault
      if (element.rootType && element.folderPath === undefined) {
        const rootVaults = await this.getRootVaults();
        return rootVaults.find(item => item.isVault(element.vaultName!));
      }

      // 获取父路径（currentPath 是相对于 vault 根目录的完整路径）
      const currentPath = element.filePath || element.folderPath;
      if (!currentPath) {
        return undefined;
      }

      const parentPath = PathUtils.dirname(currentPath);
      
      // 如果父路径为空，说明在根目录（archi-templates 或 archi-ai-enhancements），父节点是根目录节点
      if (parentPath === '') {
        if (!element.rootType) {
          return undefined;
        }
        
        return this.createTreeItem(
          element.rootType === 'archi-templates' ? '📁 Templates' : '🤖 AI Enhancements',
          vscode.TreeItemCollapsibleState.Collapsed,
          element.vaultName,
          element.vaultId,
          undefined, // folderPath 设为 undefined，表示这是根目录节点
          undefined,
          this.getItemContextValue(undefined, 'folder', element.rootType),
          element.rootType
        );
      }

      // 如果父路径就是 rootType，说明父节点是根目录节点
      if (parentPath === element.rootType) {
        return this.createTreeItem(
          element.rootType === 'archi-templates' ? '📁 Templates' : '🤖 AI Enhancements',
          vscode.TreeItemCollapsibleState.Collapsed,
          element.vaultName,
          element.vaultId,
          undefined,
          undefined,
          this.getItemContextValue(undefined, 'folder', element.rootType),
          element.rootType
        );
      }

      // 否则，父节点是父文件夹（使用完整路径）
      return this.createTreeItem(
        PathUtils.basename(parentPath),
        vscode.TreeItemCollapsibleState.Collapsed,
        element.vaultName,
        element.vaultId,
        parentPath, // 父文件夹的完整路径
        undefined,
        this.getItemContextValue(undefined, 'folder', element.rootType),
        element.rootType
      );
    } catch (error: any) {
      this.logger.error('Failed to get parent node', error);
      return undefined;
    }
  }

  private async getRootVaults(): Promise<AssistantsTreeItem[]> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success || vaultsResult.value.length === 0) {
      return [];
    }
    
    // 只显示 ai-enhancement 和 template 类型的 vault
    const filteredVaults = vaultsResult.value.filter(
      vault => vault.type === 'ai-enhancement' || vault.type === 'template'
    );
    
    return filteredVaults.map(vault =>
      this.createTreeItem(
        vault.name,
        vscode.TreeItemCollapsibleState.Collapsed,
        vault.name,
        vault.id,
        undefined,
        undefined,
        'vault'
      )
    );
  }

  private async getVaultRef(element: AssistantsTreeItem): Promise<{ id: string; name: string } | null> {
    if (!element.vaultName || !element.vaultId) {
      return null;
    }
    return { id: element.vaultId, name: element.vaultName };
  }

  private async getDirectoryFiles(
    vaultRef: { id: string; name: string },
    dirPath: string,
    relativePath: string,
    rootType: 'archi-templates' | 'archi-ai-enhancements'
  ): Promise<AssistantsTreeItem[]> {
    try {
      this.logger.info(`[AssistantsTree] Listing directory: ${dirPath} in vault: ${vaultRef.name}`);
      const listResult = await this.treeService.listDirectory(vaultRef, dirPath, {
        includeHidden: false,
      });
      
      if (!listResult.success) {
        this.logger.warn(`[AssistantsTree] Failed to list directory: ${dirPath}`, {
          error: listResult.error?.message || 'Unknown error',
          vaultName: vaultRef.name
        });
        return [];
      }
      
      if (!listResult.value || listResult.value.length === 0) {
        this.logger.info(`[AssistantsTree] Directory is empty: ${dirPath} in vault: ${vaultRef.name}`);
        return [];
      }

      this.logger.info(`[AssistantsTree] Found ${listResult.value.length} items in directory: ${dirPath}`);
      const items: AssistantsTreeItem[] = [];

      for (const node of listResult.value) {
        // node.path 是相对于 vault 根目录的完整路径（统一从 vault 开始）
        // 例如：dirPath='archi-templates' 时，node.path='archi-templates/structure'
        //      dirPath='archi-templates/structure' 时，node.path='archi-templates/structure/subfolder'
        // 所有路径处理统一使用完整路径，rootType 仅用于展示和上下文判断
        
        if (node.isDirectory) {
          // 文件夹：folderPath 使用完整路径（相对于 vault 根目录）
          const item = this.createTreeItem(
            node.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            vaultRef.name,
            vaultRef.id,
            node.path, // 完整路径，统一从 vault 开始
            undefined,
            this.getItemContextValue(undefined, 'folder', rootType),
            rootType
          );
          items.push(item);
          this.logger.debug(`Added directory item: ${node.name} (path: ${node.path})`);
        } else if (node.isFile) {
          // 文件：filePath 使用完整路径（相对于 vault 根目录），folderPath 是父目录的完整路径
          const parentFolderPath = PathUtils.dirname(node.path);
          
          const item = this.createTreeItem(
            node.name,
            vscode.TreeItemCollapsibleState.None,
            vaultRef.name,
            vaultRef.id,
            parentFolderPath || undefined, // 父目录的完整路径
            node.path, // 文件的完整路径，统一从 vault 开始
            this.getItemContextValue(undefined, 'file', rootType),
            rootType
          );
          
          // 设置图标
          const icon = this.getItemIcon(item, node);
          if (icon) {
            item.iconPath = icon;
          }
          
          // 设置打开文件的命令
          item.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [vscode.Uri.file(node.fullPath)],
          };
          
          items.push(item);
          this.logger.debug(`Added file item: ${node.name} (path: ${node.path})`);
        }
      }

      this.logger.debug(`Returning ${items.length} items from directory: ${dirPath}`);
      return items;
    } catch (error: any) {
      this.logger.error(`Failed to get directory files: ${dirPath}`, error);
      return [];
    }
  }

  private createTreeItem(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string,
    rootType?: 'archi-templates' | 'archi-ai-enhancements'
  ): AssistantsTreeItem {
    return new AssistantsTreeItem(
      label,
      collapsibleState,
      vaultName,
      vaultId,
      folderPath,
      filePath,
      contextValue,
      rootType
    );
  }

  private getItemContextValue(
    item: AssistantsTreeItem | undefined,
    type: 'vault' | 'folder' | 'file',
    rootType?: 'archi-templates' | 'archi-ai-enhancements'
  ): string {
    switch (type) {
      case 'vault':
        return 'vault';
      case 'folder':
        if (rootType === 'archi-templates') {
        return 'template.directory';
        } else if (rootType === 'archi-ai-enhancements') {
          return 'ai-command.directory';
        }
        return 'assistant.directory';
      case 'file':
        if (rootType === 'archi-templates') {
        return 'template.file';
        } else if (rootType === 'archi-ai-enhancements') {
          return 'ai-command.file';
        }
        return 'assistant.file';
      default:
        return 'assistant.file';
    }
  }

  private getItemIcon(
    item: AssistantsTreeItem,
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

