import * as vscode from 'vscode';
import * as path from 'path';
import { ViewpointApplicationService, Viewpoint } from '../application/ViewpointApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { FileWatcher } from './FileWatcher';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../shared/domain/entity/artifact';
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
    
    // 如果明确指定了 contextValue，优先使用它（用于文档、任务等分组节点）
    if (contextValue) {
      this.contextValue = contextValue;
      if (artifact) {
        this.tooltip = artifact.path;
        this.command = {
          command: 'vscode.open',
          title: 'Open Document',
          arguments: [vscode.Uri.file(artifact.contentLocation)],
        };
        // 设置文件类型图标，与文档视图保持一致
        this.iconPath = this.getFileIcon(artifact);
      } else if (codePath) {
        this.tooltip = codePath;
        this.command = {
          command: 'vscode.open',
          title: 'Open File',
          arguments: [vscode.Uri.file(codePath)],
        };
      } else if (viewpoint) {
        this.tooltip = viewpoint.description || viewpoint.name;
      }
    } else if (artifact) {
      this.tooltip = artifact.path;
      this.command = {
        command: 'vscode.open',
        title: 'Open Document',
        arguments: [vscode.Uri.file(artifact.contentLocation)],
      };
      this.contextValue = 'viewpoint.artifact';
      // 设置文件类型图标，与文档视图保持一致
      this.iconPath = this.getFileIcon(artifact);
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
      this.contextValue = 'viewpoint.group';
    }
  }

  /**
   * 根据文件类型获取图标，与文档视图保持一致
   */
  private getFileIcon(artifact: Artifact): vscode.ThemeIcon | undefined {
    // 优先使用 path 的扩展名
    const ext = path.extname(artifact.path).toLowerCase();
    
    if (ext === '.md') {
      return new vscode.ThemeIcon('markdown');
    } else if (ext === '.yml' || ext === '.yaml') {
      return new vscode.ThemeIcon('file-code');
    } else if (ext === '.puml') {
      return new vscode.ThemeIcon('file-code');
    } else if (ext === '.mmd') {
      return new vscode.ThemeIcon('file-code');
    // Archimate 格式支持已移除
    // } else if (ext === '.archimate') {
    //   return new vscode.ThemeIcon('file-code');
    } else {
      return new vscode.ThemeIcon('file');
    }
  }
}

/**
 * 视点树视图数据提供者
 */
export class ViewpointTreeDataProvider implements vscode.TreeDataProvider<ViewpointTreeItem> {
  // 用于存储文档和任务分组的 artifacts，避免 VSCode 重新渲染时丢失数据
  private artifactsCache = new Map<string, Artifact[]>();
  private _onDidChangeTreeData: vscode.EventEmitter<ViewpointTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ViewpointTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ViewpointTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private fileWatcher: FileWatcher;
  private selectedViewpointId: string | undefined; // 当前选择的视点 ID
  private defaultViewpointId: string = 'current-code-related'; // 默认视点 ID

  constructor(
    private viewpointService: ViewpointApplicationService,
    private artifactService: ArtifactApplicationService,
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
      this.logger.debug('[ViewpointTreeDataProvider] getChildren called', {
        elementLabel: element?.label,
        elementContextValue: element?.contextValue,
        hasViewpoint: !!element?.viewpoint,
        hasArtifact: !!element?.artifact,
        hasCodePath: !!element?.codePath,
        viewpointId: element?.viewpoint?.id,
        cacheKey: element ? (element as any).cacheKey : undefined
      });

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

      // Artifact 节点：叶子节点，不显示关联的代码文件
      if (element.contextValue === 'viewpoint.artifact' && element.artifact) {
        this.logger.debug('[ViewpointTreeDataProvider] Artifact node (leaf)', {
          artifactTitle: element.artifact.title,
          artifactId: element.artifact.id,
          contextValue: element.contextValue
        });
        return [];
      }
      
      // 其他 artifact 节点：叶子节点
      if (element.artifact && element.contextValue !== 'viewpoint.artifact') {
        return [];
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
      // 注意：只有当节点是视点节点（没有 artifact）时才处理，避免 artifact 节点再次进入此逻辑
      // 这个逻辑只适用于非代码关联视点的普通视点
      if (element.viewpoint && !element.artifact && !element.codePath && 
          element.contextValue !== 'viewpoint.vault' && 
          element.contextValue !== 'viewpoint.viewType' &&
          element.contextValue !== 'viewpoint.codeDirectory' &&
          element.contextValue !== 'viewpoint.artifact' &&
          element.contextValue !== 'viewpoint.currentFile' &&
          element.contextValue !== 'viewpoint.empty' &&
          element.contextValue !== 'viewpoint.codePath' &&
          element.viewpoint.type !== 'code-related') {
        this.logger.debug('[ViewpointTreeDataProvider] Processing viewpoint node', {
          viewpointName: element.viewpoint.name,
          viewpointType: element.viewpoint.type
        });
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          return [];
        }

        const vaultItems: ViewpointTreeItem[] = [];

        // 遍历所有 vault，获取匹配的文档
        for (const vault of vaultsResult.value) {
          const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(
            element.viewpoint!,
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
        this.logger.debug('[ViewpointTreeDataProvider] Expanding vault node', {
          label: element.label,
          contextValue: element.contextValue,
          viewpointType: element.viewpoint.type,
          viewpointName: element.viewpoint.name
        });
        
        // 检查是否是代码关联视点（通过检查 viewpoint 类型）
        const isCodeRelated = element.viewpoint.type === 'code-related';
        
        this.logger.debug('[ViewpointTreeDataProvider] Vault node check', {
          isCodeRelated,
          viewpointType: element.viewpoint.type
        });
        
        if (isCodeRelated) {
          // 代码关联视点：重新查询当前文件关联的 artifacts，然后按 vault 分组
          let currentFilePath = this.fileWatcher.getCurrentFilePath();
          if (!currentFilePath) {
            return [];
          }

          // 将绝对路径转换为相对路径
          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            if (currentFilePath.startsWith(workspaceRoot)) {
              currentFilePath = require('path').relative(workspaceRoot, currentFilePath);
            }
          }

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
            this.logger.warn('[ViewpointTreeDataProvider] Vault not found', { vaultName });
            return [];
          }

          // 重新查询关联的 artifacts
          if (!currentFilePath) {
            return [];
          }
          const artifactsResult = await this.artifactService.findArtifactsByCodePath(currentFilePath);
          if (!artifactsResult.success) {
            return [];
          }

          // 过滤出当前 vault 的 artifacts
          const vaultArtifacts = artifactsResult.value.filter(a => a.vault.id === vault.id);
          
          // 区分任务和文档
          const tasks: Artifact[] = [];
          const documents: Artifact[] = [];
          
          for (const artifact of vaultArtifacts) {
            // 任务：路径以 'tasks/' 开头
            if (artifact.path.startsWith('tasks/')) {
              tasks.push(artifact);
            } else {
              documents.push(artifact);
            }
          }

          const children: ViewpointTreeItem[] = [];

          this.logger.info('[ViewpointTreeDataProvider] Processing vault artifacts', {
            vaultName,
            vaultId: vault.id,
            totalArtifacts: vaultArtifacts.length,
            tasksCount: tasks.length,
            documentsCount: documents.length,
            taskPaths: tasks.map(t => t.path),
            documentPaths: documents.map(d => d.path)
          });

          // 任务目录（即使为空也显示，参考助手视图）
          const tasksItem = new ViewpointTreeItem(
            `📋 任务 (${tasks.length})`,
            tasks.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            element.viewpoint,
            undefined,
            'viewpoint.tasks'
          );
          (tasksItem as any).vaultId = vault.id;
          (tasksItem as any).codePath = currentFilePath;
          children.push(tasksItem);
          this.logger.info('[ViewpointTreeDataProvider] Added tasks directory', {
            tasksCount: tasks.length
          });

          // 文档目录（即使为空也显示，参考助手视图）
          const artifactsItem = new ViewpointTreeItem(
            `📄 文档 (${documents.length})`,
            documents.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
            element.viewpoint,
            undefined,
            'viewpoint.artifacts'
          );
          (artifactsItem as any).vaultId = vault.id;
          (artifactsItem as any).codePath = currentFilePath;
          children.push(artifactsItem);
          this.logger.info('[ViewpointTreeDataProvider] Added artifacts directory', {
            documentsCount: documents.length
          });

          this.logger.info('[ViewpointTreeDataProvider] Returning vault children', {
            vaultName,
            tasksCount: tasks.length,
            documentsCount: documents.length,
            childrenCount: children.length,
            childrenLabels: children.map(c => c.label)
          });
          return children;
        }

        // 普通视点：显示该 vault 的匹配文档
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
          this.logger.warn('[ViewpointTreeDataProvider] Vault not found', { vaultName });
          return [];
        }

        const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(
          element.viewpoint!,
          vault.id
        );

        if (artifactsResult.success) {
          this.logger.info('[ViewpointTreeDataProvider] Found artifacts for vault', {
            vaultName,
            artifactCount: artifactsResult.value.length,
            artifactTitles: artifactsResult.value.map(a => a.title)
          });
          return artifactsResult.value.map(artifact => {
            // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
            const fileName = path.basename(artifact.path) || artifact.title;
            return new ViewpointTreeItem(
              fileName,
              vscode.TreeItemCollapsibleState.None,
              element.viewpoint,
              artifact
            );
          });
        }

        this.logger.warn('[ViewpointTreeDataProvider] Failed to filter artifacts', {
          vaultName,
          error: artifactsResult.success ? undefined : artifactsResult.error?.message
        });
        return [];
      }

      // 任务目录节点：显示任务列表
      if (element.contextValue === 'viewpoint.tasks' && element.viewpoint) {
        const tasksItem = element as any;
        
        // 优先使用存储的 artifacts（来自代码关联视点的根节点）
        // 优先从缓存中获取 artifacts
        const cacheKey = tasksItem.cacheKey;
        if (cacheKey) {
          const storedArtifacts = this.artifactsCache.get(cacheKey);
          if (storedArtifacts && Array.isArray(storedArtifacts)) {
            this.logger.info('[ViewpointTreeDataProvider] Using cached artifacts for tasks', {
              cacheKey,
              count: storedArtifacts.length,
              taskTitles: storedArtifacts.map(t => t.title)
            });
            return storedArtifacts.map(artifact => {
              // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
              const fileName = path.basename(artifact.path) || artifact.title;
              return new ViewpointTreeItem(
                fileName,
                vscode.TreeItemCollapsibleState.None,
                element.viewpoint,
                artifact,
                'viewpoint.artifact'
              );
            });
          } else {
            this.logger.warn('[ViewpointTreeDataProvider] Cache key found but no artifacts in cache', {
              cacheKey
            });
          }
        }
        
        // 也尝试从直接属性读取（兼容旧代码）
        const directArtifacts = tasksItem.artifacts;
        if (directArtifacts && Array.isArray(directArtifacts)) {
          this.logger.info('[ViewpointTreeDataProvider] Using direct artifacts property for tasks', {
            count: directArtifacts.length
          });
          return directArtifacts.map(artifact => {
            // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
            const fileName = path.basename(artifact.path) || artifact.title;
            return new ViewpointTreeItem(
              fileName,
              vscode.TreeItemCollapsibleState.None,
              element.viewpoint,
              artifact,
              'viewpoint.artifact'
            );
          });
        }

        // 后备逻辑：如果没有缓存的 artifacts，重新查询
        this.logger.info('[ViewpointTreeDataProvider] Falling back to re-query artifacts for tasks');
        // 获取当前文件路径
        let currentFilePath = this.fileWatcher.getCurrentFilePath();
        if (!currentFilePath) {
          this.logger.warn('[ViewpointTreeDataProvider] No current file path for tasks');
          return [];
        }

        // 将绝对路径转换为相对路径
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const workspaceRoot = workspaceFolders[0].uri.fsPath;
          if (currentFilePath.startsWith(workspaceRoot)) {
            const relativePath = require('path').relative(workspaceRoot, currentFilePath);
            if (relativePath) {
              currentFilePath = relativePath;
            }
          }
        }

        // 确保 currentFilePath 不为 undefined
        if (!currentFilePath) {
          this.logger.warn('[ViewpointTreeDataProvider] Failed to get relative path for tasks');
          return [];
        }

        // 重新查询关联的 artifacts
        const artifactsResult = await this.artifactService.findArtifactsByCodePath(currentFilePath);
        if (!artifactsResult.success) {
          return [];
        }

        // 过滤出任务（路径以 'tasks/' 开头）
        const tasks = artifactsResult.value.filter(a => a.path.startsWith('tasks/'));

        this.logger.info('[ViewpointTreeDataProvider] Found tasks from code path', {
          codePath: currentFilePath,
          taskCount: tasks.length,
          taskTitles: tasks.map(t => t.title)
        });

        return tasks.map(artifact => {
          // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
          const fileName = path.basename(artifact.path) || artifact.title;
          return new ViewpointTreeItem(
            fileName,
            vscode.TreeItemCollapsibleState.None,
            element.viewpoint,
            artifact,
            'viewpoint.artifact'
          );
        });
      }

      // 文档目录节点：显示文档列表
      // 先检查 contextValue 是否匹配
      const isDocumentsNode = element.contextValue === 'viewpoint.documents' || element.contextValue === 'viewpoint.artifacts';
      this.logger.debug('[ViewpointTreeDataProvider] Checking documents node', {
        contextValue: element.contextValue,
        isDocumentsNode,
        hasViewpoint: !!element.viewpoint,
        label: element.label
      });
      
      if (isDocumentsNode && element.viewpoint) {
        const artifactsItem = element as any;
        
        this.logger.info('[ViewpointTreeDataProvider] Expanding documents node', {
          label: element.label,
          contextValue: element.contextValue,
          viewpointId: element.viewpoint.id,
          hasCacheKey: !!(artifactsItem.cacheKey),
          cacheKey: artifactsItem.cacheKey,
          cacheSize: this.artifactsCache.size,
          allCacheKeys: Array.from(this.artifactsCache.keys())
        });
        
        // 优先从缓存中获取 artifacts
        const cacheKey = artifactsItem.cacheKey;
        if (cacheKey) {
          const storedArtifacts = this.artifactsCache.get(cacheKey);
          if (storedArtifacts && Array.isArray(storedArtifacts)) {
            this.logger.info('[ViewpointTreeDataProvider] Using cached artifacts for documents', {
              cacheKey,
              count: storedArtifacts.length,
              artifactTitles: storedArtifacts.map(a => a.title)
            });
            
            // 对于代码关联视点，直接显示文档列表，不按 viewType 分组
            const isCodeRelated = element.viewpoint.type === 'code-related';
            if (isCodeRelated) {
              return storedArtifacts.map(artifact => {
                // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
                const fileName = path.basename(artifact.path) || artifact.title;
                return new ViewpointTreeItem(
                  fileName,
                  vscode.TreeItemCollapsibleState.None,
                  element.viewpoint,
                  artifact,
                  'viewpoint.artifact'
                );
              });
            }
            
            // 普通视点：按 viewType 组织
            const tree = this.viewpointService.organizeArtifactsAsTree(storedArtifacts);
            const children: ViewpointTreeItem[] = [];
            
            if (tree.root.children) {
              for (const viewTypeNode of tree.root.children) {
                const viewTypeItem = new ViewpointTreeItem(
                  `${this.getViewTypeLabel(viewTypeNode.viewType)} (${viewTypeNode.artifacts.length})`,
                  vscode.TreeItemCollapsibleState.Collapsed,
                  element.viewpoint,
                  undefined,
                  'viewpoint.viewType'
                );
                (viewTypeItem as any).artifacts = viewTypeNode.artifacts;
                children.push(viewTypeItem);
              }
            }
            
            return children;
          } else {
            this.logger.warn('[ViewpointTreeDataProvider] Cache key found but no artifacts in cache', {
              cacheKey
            });
          }
        }
        
        // 也尝试从直接属性读取（兼容旧代码）
        const directArtifacts = artifactsItem.artifacts;
        if (directArtifacts && Array.isArray(directArtifacts)) {
          this.logger.info('[ViewpointTreeDataProvider] Using direct artifacts property for documents', {
            count: directArtifacts.length,
            artifactTitles: directArtifacts.map(a => a.title)
          });
          
          const isCodeRelated = element.viewpoint.type === 'code-related';
          if (isCodeRelated) {
            return directArtifacts.map(artifact => {
              // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
              const fileName = path.basename(artifact.path) || artifact.title;
              return new ViewpointTreeItem(
                fileName,
                vscode.TreeItemCollapsibleState.None,
                element.viewpoint,
                artifact,
                'viewpoint.artifact'
              );
            });
          }
        }

        // 后备逻辑：如果没有缓存的 artifacts，重新查询
        this.logger.info('[ViewpointTreeDataProvider] Falling back to re-query artifacts for documents');
        
        // 获取当前文件路径
        let currentFilePath = this.fileWatcher.getCurrentFilePath();
        if (!currentFilePath) {
          this.logger.warn('[ViewpointTreeDataProvider] No current file path for documents');
          return [];
        }

        // 将绝对路径转换为相对路径
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const workspaceRoot = workspaceFolders[0].uri.fsPath;
          if (currentFilePath.startsWith(workspaceRoot)) {
            const relativePath = require('path').relative(workspaceRoot, currentFilePath);
            if (relativePath) {
              currentFilePath = relativePath;
            }
          }
        }

        // 确保 currentFilePath 不为 undefined
        if (!currentFilePath) {
          this.logger.warn('[ViewpointTreeDataProvider] Failed to get relative path for documents');
          return [];
        }

        // 重新查询关联的 artifacts
        this.logger.info('[ViewpointTreeDataProvider] Re-querying artifacts by code path', {
          codePath: currentFilePath
        });
        
        const artifactsResult = await this.artifactService.findArtifactsByCodePath(currentFilePath);
        if (!artifactsResult.success) {
          this.logger.warn('[ViewpointTreeDataProvider] Failed to find artifacts by code path', {
            codePath: currentFilePath,
            error: artifactsResult.error?.message
          });
          return [];
        }

        // 过滤出文档（非任务）
        const documents = artifactsResult.value.filter(a => !a.path.startsWith('tasks/'));

        this.logger.info('[ViewpointTreeDataProvider] Found documents from code path (fallback)', {
          codePath: currentFilePath,
          documentCount: documents.length,
          documentTitles: documents.map(d => d.title)
        });

        // 对于代码关联视点，直接显示文档列表，不按 viewType 分组
        const isCodeRelated = element.viewpoint.type === 'code-related';
        if (isCodeRelated) {
          return documents.map(artifact => {
            // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
            const fileName = path.basename(artifact.path) || artifact.title;
            return new ViewpointTreeItem(
              fileName,
              vscode.TreeItemCollapsibleState.None,
              element.viewpoint,
              artifact,
              'viewpoint.artifact'
            );
          });
        }

        // 普通视点：按 viewType 组织
        const tree = this.viewpointService.organizeArtifactsAsTree(documents);
        const children: ViewpointTreeItem[] = [];
        
        if (tree.root.children) {
          for (const viewTypeNode of tree.root.children) {
            const viewTypeItem = new ViewpointTreeItem(
              `${this.getViewTypeLabel(viewTypeNode.viewType)} (${viewTypeNode.artifacts.length})`,
              vscode.TreeItemCollapsibleState.Collapsed,
              element.viewpoint,
              undefined,
              'viewpoint.viewType'
            );
            (viewTypeItem as any).artifacts = viewTypeNode.artifacts;
            children.push(viewTypeItem);
          }
        }

        return children;
      }

      // ViewType 节点（代码关联视点下）：显示该 viewType 的 Artifact
      if (element.contextValue === 'viewpoint.viewType' && element.viewpoint) {
        const viewTypeItem = element as any;
        if (viewTypeItem.artifacts) {
          // 代码关联视点：直接使用存储的 artifacts
          const artifacts: Artifact[] = viewTypeItem.artifacts || [];
          return artifacts.map(artifact => {
            // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
            const fileName = path.basename(artifact.path) || artifact.title;
            return new ViewpointTreeItem(
              fileName,
              vscode.TreeItemCollapsibleState.None,
              element.viewpoint,
              artifact
            );
          });
        }

        // 普通视点：需要重新查询（保留原有逻辑作为后备）
        let currentFilePath = this.fileWatcher.getCurrentFilePath();
        if (!currentFilePath) {
          return [];
        }

        // 将绝对路径转换为相对路径（相对于工作区根目录）
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          const workspaceRoot = workspaceFolders[0].uri.fsPath;
          if (currentFilePath.startsWith(workspaceRoot)) {
            const relativePath = require('path').relative(workspaceRoot, currentFilePath);
            if (relativePath) {
              currentFilePath = relativePath;
            }
          }
        }

        // 确保 currentFilePath 不为 undefined
        if (!currentFilePath) {
          return [];
        }

        const artifactsResult = await this.artifactService.findArtifactsByCodePath(currentFilePath);
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

        return filteredArtifacts.map(artifact => {
          // 使用文件名（包含扩展名）作为显示名称，与文档树保持一致
          const fileName = path.basename(artifact.path) || artifact.title;
          return new ViewpointTreeItem(
            fileName,
            vscode.TreeItemCollapsibleState.None,
            element.viewpoint,
            artifact
          );
        });
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
      // 使用相对路径（currentFilePath），因为关联路径是相对于工作区根目录的
      this.logger.info('[ViewpointTreeDataProvider] Getting related artifacts', {
        currentFilePath,
        isCodeFile,
        mode: viewpoint.codeRelatedConfig.mode
      });
      const artifactsResult = await this.artifactService.findArtifactsByCodePath(currentFilePath);
      this.logger.info('[ViewpointTreeDataProvider] findArtifactsByCodePath result', {
        success: artifactsResult.success,
        artifactCount: artifactsResult.success ? artifactsResult.value.length : 0,
        error: artifactsResult.success ? undefined : artifactsResult.error?.message
      });
      
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

      if (!artifactsResult.success || artifactsResult.value.length === 0) {
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

      // 区分任务和文档
      const tasks: Artifact[] = [];
      const documents: Artifact[] = [];
      
      for (const artifact of artifactsResult.value) {
        // 任务：路径以 'tasks/' 开头
        if (artifact.path.startsWith('tasks/')) {
          tasks.push(artifact);
        } else {
          documents.push(artifact);
        }
      }

      // 文档分组：默认展开，直接显示文档列表
      if (documents.length > 0) {
        const documentsItem = new ViewpointTreeItem(
          `📄 文档 (${documents.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          viewpoint,
          undefined,
          'viewpoint.documents'
        );
        // 使用 Map 存储 artifacts，避免 VSCode 重新渲染时丢失
        const cacheKey = `documents:${viewpoint.id}`;
        this.artifactsCache.set(cacheKey, documents);
        (documentsItem as any).cacheKey = cacheKey;
        this.logger.info('[ViewpointTreeDataProvider] Created documents node and cached artifacts', {
          cacheKey,
          documentCount: documents.length,
          documentTitles: documents.map(d => d.title)
        });
        items.push(documentsItem);
      }

      // 任务分组：默认展开，直接显示任务列表
      if (tasks.length > 0) {
        const tasksItem = new ViewpointTreeItem(
          `📋 任务 (${tasks.length})`,
          vscode.TreeItemCollapsibleState.Expanded,
          viewpoint,
          undefined,
          'viewpoint.tasks'
        );
        // 使用 Map 存储 artifacts，避免 VSCode 重新渲染时丢失
        const cacheKey = `tasks:${viewpoint.id}`;
        this.artifactsCache.set(cacheKey, tasks);
        (tasksItem as any).cacheKey = cacheKey;
        this.logger.info('[ViewpointTreeDataProvider] Created tasks node and cached artifacts', {
          cacheKey,
          taskCount: tasks.length,
          taskTitles: tasks.map(t => t.title)
        });
        items.push(tasksItem);
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

