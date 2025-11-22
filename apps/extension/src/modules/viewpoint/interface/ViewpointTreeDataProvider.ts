import * as vscode from 'vscode';
import { ViewpointApplicationService, Viewpoint } from '../application/ViewpointApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { Artifact } from '../../../domain/shared/artifact/Artifact';

/**
 * 视点树项
 */
export class ViewpointTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly viewpoint?: Viewpoint,
    public readonly artifact?: Artifact,
    public readonly contextValue?: string
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

  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ViewpointTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ViewpointTreeItem): Promise<ViewpointTreeItem[]> {
    try {
      // 根节点：显示预定义视点和自定义视点分组
      if (!element) {
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

      // 视点节点：显示匹配的 Artifact
      if (element.viewpoint) {
        const artifactsResult = await this.viewpointService.filterArtifactsByViewpoint(element.viewpoint);
        if (artifactsResult.success) {
          // 按路径组织文档（可以进一步优化为树形结构）
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

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get viewpoint tree items', error);
      return [];
    }
  }
}

