import * as vscode from 'vscode';
import * as path from 'path';
import { BaseArtifactTreeItem } from '../modules/shared/interface/tree/BaseArtifactTreeItem';
import { BaseArtifactTreeViewProvider } from '../modules/shared/interface/tree/BaseArtifactTreeViewProvider';
import { FileTreeNode } from '../modules/shared/application/ArtifactApplicationService';
import { Artifact } from '../modules/shared/domain/entity/artifact';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { DocumentApplicationService } from '../modules/document/application/DocumentApplicationService';
import { Logger } from '../core/logger/Logger';
import { IDEAdapter } from '../core/ide-api/ide-adapter';
import { TreeItemCollapsibleState, Uri, Command } from '../core/ide-api/ide-types';
import { FolderMetadata } from '../modules/shared/domain/FolderMetadata';

export class DocumentTreeItem extends BaseArtifactTreeItem {
  public readonly artifact?: Artifact;

  constructor(
    artifact?: Artifact,
    collapsibleState: TreeItemCollapsibleState = TreeItemCollapsibleState.None,
    vaultName?: string,
    contextValue?: string,
    folderPath?: string,
    filePath?: string,
    vaultId?: string,
    ideAdapter?: IDEAdapter
  ) {
    if (artifact) {
      // 使用文件名（包含扩展名）作为显示名称
      const fileName = path.basename(artifact.path) || artifact.title;
      super(fileName, collapsibleState, artifact.vault.name, artifact.vault.id, undefined, artifact.path, 'document');
      this.artifact = artifact;
      this.tooltip = artifact.path;
      const uri = ideAdapter ? ideAdapter.UriFile(artifact.contentLocation) : vscode.Uri.file(artifact.contentLocation) as any;
      this.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [uri],
      } as Command;
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
  private ideAdapter?: IDEAdapter;
  private documentService?: DocumentApplicationService;

  constructor(
    vaultService: VaultApplicationService,
    treeService: ArtifactApplicationService,
    logger: Logger,
    ideAdapter?: IDEAdapter,
    documentService?: DocumentApplicationService
  ) {
    super(vaultService, treeService, logger);
    this.ideAdapter = ideAdapter;
    this.documentService = documentService;
  }

  protected getRootDirectory(): string {
    // 新结构：文档文件直接在 vault 根目录下，不再使用 artifacts 子目录
    return '';
  }

  /**
   * 过滤 vault：显示所有类型的 vault
   */
  protected filterVaults(vaults: Array<{ id: string; name: string; type?: string }>): Array<{ id: string; name: string; type?: string }> {
    return vaults; // 返回所有 vault，不再过滤
  }

  /**
   * 过滤节点：显示所有节点，包括 archi-* 目录
   */
  protected shouldIncludeNode(node: FileTreeNode, dirPath: string): boolean {
    // 显示所有节点，不再排除 archi-* 目录
    return true;
  }

  protected createTreeItem(
    label: string,
    collapsibleState: TreeItemCollapsibleState,
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
      vaultId,
      this.ideAdapter
    );
  }

  protected async getRootVaults(): Promise<DocumentTreeItem[]> {
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success || vaultsResult.value.length === 0) {
      return [];
    }
    
    // 默认返回所有 vault，不再过滤
    const filteredVaults = this.filterVaults(vaultsResult.value);
    
    return filteredVaults.map(vault =>
      this.createTreeItem(
        vault.name,
        TreeItemCollapsibleState.Collapsed,
        vault.name,
        vault.id,
        undefined,
        undefined,
        this.getItemContextValue(undefined, 'vault', vault)
      )
    );
  }

  protected getItemContextValue(
    item: DocumentTreeItem | undefined,
    type: 'vault' | 'folder' | 'file',
    vault?: { id?: string; name?: string; remote?: any }
  ): string {
    switch (type) {
      case 'vault':
        // 如果 vault 有 remote，返回 'vault-git'，否则返回 'vault'
        return vault?.remote ? 'vault-git' : 'vault';
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
    node?: FileTreeNode
  ): vscode.ThemeIcon | undefined {
    // 占位节点使用特殊图标（灰色 file-add 图标）
    if (item.contextValue === 'placeholder-file') {
      return new vscode.ThemeIcon('file-add', new vscode.ThemeColor('disabledForeground'));
    }

    // 如果没有 node（占位节点没有对应的 FileTreeNode），根据 filePath 判断
    if (!node) {
      if (item.filePath) {
        const ext = path.extname(item.filePath).toLowerCase();
        if (ext === '.md') {
          return new vscode.ThemeIcon('markdown');
        } else if (ext === '.yml' || ext === '.yaml') {
          return new vscode.ThemeIcon('file-code');
        } else if (ext === '.mmd' || ext === '.mermaid') {
          return new vscode.ThemeIcon('file-code');
        }
      }
      return new vscode.ThemeIcon('file');
    }

    if (node.isDirectory) {
      return new vscode.ThemeIcon('folder');
    }

    const ext = path.extname(node.path).toLowerCase();
    if (ext === '.md') {
      return new vscode.ThemeIcon('markdown');
    } else if (ext === '.yml' || ext === '.yaml') {
      return new vscode.ThemeIcon('file-code');
    } else if (ext === '.mmd' || ext === '.mermaid') {
      return new vscode.ThemeIcon('file-code');
    } else {
      return new vscode.ThemeIcon('file');
    }
  }

  /**
   * 重写 getChildren 方法，添加占位节点生成逻辑
   */
  async getChildren(element?: DocumentTreeItem): Promise<DocumentTreeItem[]> {
    // 1. 先调用父类方法获取实际文件和文件夹
    const actualItems = await super.getChildren(element);

    // 2. 如果是文件夹节点（不是 vault 节点），添加占位节点
    // 检查条件：folderPath 存在且不为空字符串，vaultId 存在，documentService 已注入
    if (element && 
        element.folderPath !== undefined && 
        element.folderPath !== null && 
        element.folderPath !== '' &&
        element.vaultId && 
        this.documentService) {
      const folderPath = element.folderPath;
      const vaultId = element.vaultId;

      this.logger?.debug('Checking for placeholder nodes', {
        vaultId,
        folderPath,
        hasDocumentService: !!this.documentService,
        actualItemsCount: actualItems.length
      });

      try {
        // 读取文件夹元数据（如果存在）
        const folderMetadata = await this.documentService.readFolderMetadata(vaultId, folderPath);

        // 生成占位节点（如果存在expectedFiles）
        const placeholderNodes: DocumentTreeItem[] = [];
        if (folderMetadata?.expectedFiles && folderMetadata.expectedFiles.length > 0) {
          this.logger?.debug('Found folder metadata with expectedFiles', {
            vaultId,
            folderPath,
            expectedFilesCount: folderMetadata.expectedFiles.length,
            expectedFiles: folderMetadata.expectedFiles.map(f => f.path)
          });
          // 获取实际文件的路径列表（用于对比）
          const actualFilePaths = new Set(
            actualItems
              .filter(item => item.filePath) // 只取文件节点
              .map(item => item.filePath!)
          );

          for (const expectedFile of folderMetadata.expectedFiles) {
            // expectedFile.path 是相对于文件夹的路径（如 "system-context.md"）
            const expectedFilePath = folderPath === ''
              ? expectedFile.path
              : `${folderPath}/${expectedFile.path}`;

            // 检查文件是否已存在
            const fileExists = actualFilePaths.has(expectedFilePath);
            this.logger?.debug('Checking expected file', {
              expectedFile: expectedFile.path,
              expectedFilePath,
              fileExists,
              actualFilePaths: Array.from(actualFilePaths)
            });

            if (!fileExists) {
              // 创建占位节点
              placeholderNodes.push(
                this.createPlaceholderNode(
                  expectedFile,
                  folderPath,
                  element.vaultName!,
                  vaultId
                )
              );
            }
          }

          this.logger?.debug('Placeholder nodes created', {
            vaultId,
            folderPath,
            placeholderNodesCount: placeholderNodes.length
          });
        }

        // 合并节点：实际文件在前，占位节点在后
        if (placeholderNodes.length > 0) {
          const allItems = [...actualItems, ...placeholderNodes];
          return this.sortNodes(allItems);
        }
      } catch (error: any) {
        // 如果读取元数据失败，记录错误但不影响正常显示
        this.logger?.error('Failed to read folder metadata for placeholder nodes', {
          vaultId,
          folderPath,
          error: error.message
        });
      }
    }

    // 非文件夹节点或没有占位节点，直接返回父类结果
    return actualItems;
  }

  /**
   * 创建占位节点
   */
  private createPlaceholderNode(
    expectedFile: { path: string; name: string; extension?: string; description?: string; template?: string },
    folderPath: string,
    vaultName: string,
    vaultId: string
  ): DocumentTreeItem {
    // 构建完整文件路径（相对于vault根目录）
    const filePath = folderPath === ''
      ? expectedFile.path
      : `${folderPath}/${expectedFile.path}`;

    // 构建显示名称（添加 [未创建] 后缀）
    const displayName = expectedFile.extension
      ? `${expectedFile.name}.${expectedFile.extension} [未创建]`
      : `${expectedFile.name} [未创建]`;

    // 创建占位节点
    const placeholderItem = new DocumentTreeItem(
      undefined,  // 无artifact
      TreeItemCollapsibleState.None,
      vaultName,
      'placeholder-file',  // contextValue
      undefined,  // folderPath
      filePath,    // filePath（完整路径）
      vaultId,
      this.ideAdapter
    );

    // 设置占位节点的专用命令
    placeholderItem.command = {
      command: 'archi.document.createFromPlaceholder',
      title: '创建文件',
      arguments: [placeholderItem],
    } as Command;

    // 设置占位节点的显示名称（覆盖默认的文件名）
    placeholderItem.label = displayName;

    // 设置占位节点的图标（灰色 file-add 图标）
    placeholderItem.iconPath = new vscode.ThemeIcon('file-add', new vscode.ThemeColor('disabledForeground'));

    // 设置工具提示
    placeholderItem.tooltip = `点击创建此文件: ${filePath}${expectedFile.description ? `\n${expectedFile.description}` : ''}`;

    return placeholderItem;
  }

  /**
   * 排序节点：已创建文件在前，按名称排序；未创建文件占位在后，按名称排序
   */
  private sortNodes(items: DocumentTreeItem[]): DocumentTreeItem[] {
    const actualFiles: DocumentTreeItem[] = [];
    const placeholderFiles: DocumentTreeItem[] = [];
    const folders: DocumentTreeItem[] = [];

    for (const item of items) {
      if (item.contextValue === 'placeholder-file') {
        placeholderFiles.push(item);
      } else if (item.folderPath !== undefined && !item.filePath) {
        folders.push(item);
      } else {
        actualFiles.push(item);
      }
    }

    // 排序函数
    const sortByName = (a: DocumentTreeItem, b: DocumentTreeItem) => {
      const nameA = (a.label as string || '').toLowerCase();
      const nameB = (b.label as string || '').toLowerCase();
      return nameA.localeCompare(nameB);
    };

    // 分别排序并合并
    return [
      ...folders.sort(sortByName),
      ...actualFiles.sort(sortByName),
      ...placeholderFiles.sort(sortByName)
    ];
  }
}
