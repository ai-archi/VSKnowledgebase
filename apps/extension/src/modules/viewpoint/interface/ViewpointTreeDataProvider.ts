import * as vscode from 'vscode';
import { ViewpointApplicationService, Viewpoint } from '../application/ViewpointApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { FileWatcher } from './FileWatcher';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../shared/domain/artifact';
import { ConfigManager } from '../../../core/config/ConfigManager';

/**
 * 视点树项
 */
export class ViewpointTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly viewpoint?: Viewpoint,
    public readonly artifact?: Artifact,
    public readonly contextValue?: string,
    public readonly codePath?: string // 代码路径（用于代码关联视点）
  ) {
    super(label, collapsibleState);
    
    if (artifact) {
      this.tooltip = artifact.path;
      this.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [vscode.Uri.file(artifact.contentLocation)],
      };
      this.contextValue = 'viewpoint.artifact';
    } else if (codePath) {
      // 代码路径节点
      this.tooltip = codePath;
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(codePath)],
      };
      this.contextValue = 'viewpoint.codePath';
    } else if (viewpoint) {
      this.tooltip = viewpoint.description || viewpoint.name;
      this.contextValue = viewpoint.isPredefined ? 'viewpoint.predefined' : 'viewpoint.custom';
    } else {
      this.contextValue = contextValue || 'viewpoint.group';
    }
  }
}

/**
 * 视点树视图数据提供者
 */
export class ViewpointTreeDataProvider implements vscode.TreeDataProvider<ViewpointTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ViewpointTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ViewpointTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ViewpointTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private fileWatcher: FileWatcher;
  private selectedViewpointId: string | undefined; // 当前选择的视点 ID
  private defaultViewpointId: string = 'current-code-related'; // 默认视点 ID

  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
    private configManager: ConfigManager,
    private logger: Logger
  ) {
    // 创建文件监听器
    this.fileWatcher = new FileWatcher(viewpointService, logger);
    
    // 监听文件变更事件，自动更新视图
    this.fileWatcher.onFileChanged(async (filePath) => {
      // 如果当前选择的是代码关联视点，自动刷新
      const currentViewpoint = await this.getCurrentViewpoint();
      if (currentViewpoint && currentViewpoint.type === 'code-related') {
        this.refresh();
      }
    });
  }

  /**
   * 获取当前选择的视点
   */
  private async getCurrentViewpoint(): Promise<Viewpoint | undefined> {
    const viewpointId = this.selectedViewpointId || this.defaultViewpointId;
    if (!viewpointId) {
      return undefined;
    }

    // 先从预定义视点中查找
    const predefinedViewpoints = this.viewpointService.getPredefinedViewpoints();
    const predefinedViewpoint = predefinedViewpoints.find(v => v.id === viewpointId);
    if (predefinedViewpoint) {
      return predefinedViewpoint;
    }

    // 从自定义视点中查找
    const customViewpointsResult = await this.viewpointService.getCustomViewpoints();
    if (customViewpointsResult.success) {
      const customViewpoint = customViewpointsResult.value.find(v => v.id === viewpointId);
      if (customViewpoint) {
        return customViewpoint;
      }
    }

    return undefined;
  }

  /**
   * 设置当前选择的视点
   */
  setSelectedViewpoint(viewpointId: string | undefined): void {
    this.selectedViewpointId = viewpointId;
    this.refresh();
  }

  /**
   * 获取默认视点
   */
  getDefaultViewpoint(): Viewpoint | undefined {
    const predefinedViewpoints = this.viewpointService.getPredefinedViewpoints();
    return predefinedViewpoints.find(v => v.isDefault) || predefinedViewpoints.find(v => v.id === this.defaultViewpointId);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ViewpointTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ViewpointTreeItem): Promise<ViewpointTreeItem[]> {
    try {
      // 根节点：显示当前选择的视点内容，或显示视点列表
      if (!element) {
        const currentViewpoint = await this.getCurrentViewpoint();
        
        // 如果当前视点是代码关联视点，直接显示关联的文档
        if (currentViewpoint && currentViewpoint.type === 'code-related') {
          return await this.getCodeRelatedViewpointItems(currentViewpoint);
        }

        // 否则显示视点列表
        const predefinedViewpoints = this.viewpointService.getPredefinedViewpoints();
        const customViewpointsResult = await this.viewpointService.getCustomViewpoints();

        const items: ViewpointTreeItem[] = [];

        // 预定义视点分组
        if (predefinedViewpoints.length > 0) {
          items.push(
            new ViewpointTreeItem(
              '预定义视点',
              vscode.TreeItemCollapsibleState.Expanded,
              undefined,
              undefined,
              'viewpoint.group'
            )
          );
        }

        // 自定义视点分组
        if (customViewpointsResult.success && customViewpointsResult.value.length > 0) {
          items.push(
            new ViewpointTreeItem(
              '自定义视点',
              vscode.TreeItemCollapsibleState.Expanded,
              undefined,
              undefined,
              'viewpoint.group'
            )
          );
        }

        return items;
      }

      // 预定义视点分组：显示所有预定义视点
      if (element.label === '预定义视点') {
        const predefinedViewpoints = this.viewpointService.getPredefinedViewpoints();
        // 异步获取每个视点的文档数量
        const items = await Promise.all(
          predefinedViewpoints.map(async viewpoint => {
            const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(viewpoint);
            const count = artifactsResult.success ? artifactsResult.value.length : 0;
            return new ViewpointTreeItem(
              `${viewpoint.name} (${count})`,
              vscode.TreeItemCollapsibleState.Collapsed,
              viewpoint
            );
          })
        );
        return items;
      }

      // 自定义视点分组：显示所有自定义视点
      if (element.label === '自定义视点') {
        const customViewpointsResult = await this.viewpointService.getCustomViewpoints();
        if (customViewpointsResult.success) {
          // 异步获取每个视点的文档数量
          const items = await Promise.all(
            customViewpointsResult.value.map(async viewpoint => {
              const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(viewpoint);
              const count = artifactsResult.success ? artifactsResult.value.length : 0;
              return new ViewpointTreeItem(
                `${viewpoint.name} (${count})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                viewpoint
              );
            })
          );
          return items;
        }
        return [];
      }

      // 视点节点：按 vault 分组显示匹配的 Artifact
      if (element.viewpoint) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          return [];
        }

        const vaultItems: ViewpointTreeItem[] = [];

        // 遍历所有 vault，获取匹配的文档
        for (const vault of vaultsResult.value) {
          const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(
            element.viewpoint,
            vault.id
          );

          if (artifactsResult.success && artifactsResult.value.length > 0) {
            // 添加 vault 分组节点
            vaultItems.push(
              new ViewpointTreeItem(
                `${vault.name} (${artifactsResult.value.length})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                element.viewpoint,
                undefined,
                'viewpoint.vault'
              )
            );
          }
        }

        return vaultItems;
      }

      // Vault 节点（在视点下）：显示该 vault 的匹配文档
      if (element.contextValue === 'viewpoint.vault' && element.viewpoint) {
        // 从 label 中提取 vault 名称（格式：vaultName (count)）
        const vaultNameMatch = element.label.match(/^(.+?)\s*\(\d+\)$/);
        if (!vaultNameMatch) {
          return [];
        }

        const vaultName = vaultNameMatch[1];
        const vaultsResult = await this.vaultService.listVaults();
        const vault = vaultsResult.success
          ? vaultsResult.value.find(v => v.name === vaultName)
          : undefined;

        if (!vault) {
          return [];
        }

        const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(
          element.viewpoint!,
          vault.id
        );

        if (artifactsResult.success) {
          return artifactsResult.value.map(artifact =>
            new ViewpointTreeItem(
              artifact.title,
              vscode.TreeItemCollapsibleState.None,
              element.viewpoint,
              artifact
            )
          );
        }

        return [];
      }

      // ViewType 节点（代码关联视点下）：显示该 viewType 的 Artifact
      if (element.contextValue === 'viewpoint.viewType' && element.viewpoint) {
        const currentFilePath = this.fileWatcher.getCurrentFilePath();
        if (!currentFilePath) {
          return [];
        }

        const absoluteFilePath = this.getAbsoluteFilePath(currentFilePath) || currentFilePath;
        const artifactsResult = await this.viewpointService.getRelatedArtifacts(absoluteFilePath);
        if (!artifactsResult.success) {
          return [];
        }

        // 从 label 中提取 viewType（格式：📄 文档 (count)）
        const viewTypeMatch = element.label.match(/^[^\s]+\s+(\w+)\s*\(\d+\)$/);
        if (!viewTypeMatch) {
          return [];
        }

        const viewType = viewTypeMatch[1];
        const filteredArtifacts = artifactsResult.value.filter(a => a.viewType === viewType);

        return filteredArtifacts.map(artifact =>
          new ViewpointTreeItem(
            artifact.title,
            vscode.TreeItemCollapsibleState.None,
            element.viewpoint,
            artifact
          )
        );
      }

      // 代码目录节点（代码关联视点下）：显示子目录和文件
      if (element.contextValue === 'viewpoint.codeDirectory' && element.viewpoint) {
        const currentFilePath = this.fileWatcher.getCurrentFilePath();
        if (!currentFilePath) {
          return [];
        }

        const absoluteFilePath = this.getAbsoluteFilePath(currentFilePath) || currentFilePath;
        const isArtifactResult = await this.viewpointService.isArtifactFile(absoluteFilePath);
        if (!isArtifactResult.success || !isArtifactResult.value) {
          return [];
        }

        const artifactResult = await this.viewpointService.getArtifactByPath(absoluteFilePath);
        if (!artifactResult.success || !artifactResult.value) {
          return [];
        }

        const codePathsResult = await this.viewpointService.getRelatedCodePaths(artifactResult.value.id);
        if (!codePathsResult.success) {
          return [];
        }

        // 重新构建树，找到对应的节点
        const codeTree = this.viewpointService.organizeCodePathsAsTree(codePathsResult.value);
        const node = this.findNodeInTree(codeTree.root, element.label);
        
        if (node && node.children) {
          return node.children.map((child: any) => this.createCodePathTreeItem(child, element.viewpoint!));
        }

        return [];
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get viewpoint tree items', error);
      return [];
    }
  }

  /**
   * 获取代码关联视点的树项
   */
  private async getCodeRelatedViewpointItems(viewpoint: Viewpoint): Promise<ViewpointTreeItem[]> {
    const items: ViewpointTreeItem[] = [];

    // 获取当前打开的文件路径
    let currentFilePath = this.fileWatcher.getCurrentFilePath();
    
    // 如果是代码关联视点，需要更新视点的当前文件路径
    if (viewpoint.codeRelatedConfig && currentFilePath) {
      // 获取工作区根目录，将绝对路径转换为相对路径
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        if (currentFilePath.startsWith(workspaceRoot)) {
          currentFilePath = require('path').relative(workspaceRoot, currentFilePath);
        }
      }
      
      // 更新视点配置（临时更新，不持久化）
      viewpoint.codeRelatedConfig.currentFilePath = currentFilePath;
    }
    
    if (!currentFilePath) {
      items.push(
        new ViewpointTreeItem(
          '未打开文件',
          vscode.TreeItemCollapsibleState.None,
          viewpoint,
          undefined,
          'viewpoint.empty'
        )
      );
      return items;
    }

    // 判断文件类型（使用绝对路径判断）
    const absoluteFilePath = this.getAbsoluteFilePath(currentFilePath);
    const isCodeFile = absoluteFilePath ? this.viewpointService.isCodeFile(absoluteFilePath) : false;
    let isArtifact = false;
    if (absoluteFilePath) {
      const isArtifactResult = await this.viewpointService.isArtifactFile(absoluteFilePath);
      isArtifact = isArtifactResult.success && isArtifactResult.value === true;
    }

    if (viewpoint.codeRelatedConfig?.mode === 'reverse' && isCodeFile) {
      // 反向关联：代码 → 文档
      const artifactsResult = await this.viewpointService.getRelatedArtifacts(absoluteFilePath || currentFilePath);
      
      if (!artifactsResult.success || artifactsResult.value.length === 0) {
        items.push(
          new ViewpointTreeItem(
            `当前文件：${this.getFileName(currentFilePath)}`,
            vscode.TreeItemCollapsibleState.None,
            viewpoint,
            undefined,
            'viewpoint.currentFile'
          )
        );
        items.push(
          new ViewpointTreeItem(
            '未找到关联文档',
            vscode.TreeItemCollapsibleState.None,
            viewpoint,
            undefined,
            'viewpoint.empty'
          )
        );
        return items;
      }

      // 显示当前文件信息
      items.push(
        new ViewpointTreeItem(
          `当前文件：${this.getFileName(currentFilePath)}`,
          vscode.TreeItemCollapsibleState.None,
          viewpoint,
          undefined,
          'viewpoint.currentFile'
        )
      );

      // 按 viewType 组织 Artifact
      const tree = this.viewpointService.organizeArtifactsAsTree(artifactsResult.value);
      
      if (tree.root.children) {
        for (const viewTypeNode of tree.root.children) {
          items.push(
            new ViewpointTreeItem(
              `${this.getViewTypeLabel(viewTypeNode.viewType)} (${viewTypeNode.artifacts.length})`,
              vscode.TreeItemCollapsibleState.Collapsed,
              viewpoint,
              undefined,
              'viewpoint.viewType'
            )
          );
        }
      }
    } else if (viewpoint.codeRelatedConfig?.mode === 'forward' && isArtifact) {
      // 正向关联：文档 → 代码
      const artifactResult = await this.viewpointService.getArtifactByPath(absoluteFilePath || currentFilePath);
      
      if (!artifactResult.success || !artifactResult.value) {
        items.push(
          new ViewpointTreeItem(
            '无法获取文档信息',
            vscode.TreeItemCollapsibleState.None,
            viewpoint,
            undefined,
            'viewpoint.empty'
          )
        );
        return items;
      }

      const codePathsResult = await this.viewpointService.getRelatedCodePaths(artifactResult.value.id);
      
      if (!codePathsResult.success || codePathsResult.value.length === 0) {
        items.push(
          new ViewpointTreeItem(
            `当前文档：${artifactResult.value.title}`,
            vscode.TreeItemCollapsibleState.None,
            viewpoint,
            undefined,
            'viewpoint.currentFile'
          )
        );
        items.push(
          new ViewpointTreeItem(
            '未找到关联代码',
            vscode.TreeItemCollapsibleState.None,
            viewpoint,
            undefined,
            'viewpoint.empty'
          )
        );
        return items;
      }

      // 显示当前文档信息
      items.push(
        new ViewpointTreeItem(
          `当前文档：${artifactResult.value.title}`,
          vscode.TreeItemCollapsibleState.None,
          viewpoint,
          undefined,
          'viewpoint.currentFile'
        )
      );

      // 组织代码路径为树形结构
      const codeTree = this.viewpointService.organizeCodePathsAsTree(codePathsResult.value);
      
      if (codeTree.root.children) {
        for (const child of codeTree.root.children) {
          items.push(this.createCodePathTreeItem(child, viewpoint));
        }
      }
    } else {
      // 文件类型不匹配
      items.push(
        new ViewpointTreeItem(
          `当前文件：${this.getFileName(currentFilePath)}`,
          vscode.TreeItemCollapsibleState.None,
          viewpoint,
          undefined,
          'viewpoint.currentFile'
        )
      );
      items.push(
        new ViewpointTreeItem(
          '文件类型不匹配',
          vscode.TreeItemCollapsibleState.None,
          viewpoint,
          undefined,
          'viewpoint.empty'
        )
      );
    }

    return items;
  }

  /**
   * 创建代码路径树项（递归）
   */
  private createCodePathTreeItem(node: any, viewpoint: Viewpoint): ViewpointTreeItem {
    const item = new ViewpointTreeItem(
      node.name,
      node.type === 'directory' && node.children && node.children.length > 0
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
      viewpoint,
      undefined,
      node.type === 'directory' ? 'viewpoint.codeDirectory' : 'viewpoint.codeFile',
      node.type === 'file' ? node.path : undefined
    );

    // 如果是目录且有子节点，需要特殊处理以支持展开
    if (node.type === 'directory' && node.children && node.children.length > 0) {
      // 存储子节点信息，在 getChildren 中处理
    }

    return item;
  }

  /**
   * 获取文件名
   */
  private getFileName(filePath: string): string {
    return require('path').basename(filePath);
  }

  /**
   * 获取视图类型标签
   */
  private getViewTypeLabel(viewType: string): string {
    const labels: Record<string, string> = {
      document: '📄 文档',
      design: '🎨 设计',
      development: '💻 开发',
      test: '🧪 测试',
    };
    return labels[viewType] || viewType;
  }

  /**
   * 在树中查找节点
   */
  private findNodeInTree(node: any, name: string): any | undefined {
    if (node.name === name) {
      return node;
    }
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeInTree(child, name);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  /**
   * 获取绝对文件路径
   */
  private getAbsoluteFilePath(relativePath: string): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      return require('path').join(workspaceRoot, relativePath);
    }
    return undefined;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.fileWatcher.dispose();
  }
}

