import * as vscode from 'vscode';
import { TemplateApplicationService, Template, TemplateLibrary } from '../application/TemplateApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 模板树项
 */
export class TemplateTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly template?: Template,
    public readonly library?: TemplateLibrary,
    public readonly contextValue?: string
  ) {
    super(label, collapsibleState);
    
    if (template) {
      this.tooltip = template.description || template.name;
      this.contextValue = template.type === 'structure' ? 'template.structure' : 'template.content';
      this.iconPath = template.type === 'structure' 
        ? new vscode.ThemeIcon('folder')
        : new vscode.ThemeIcon('file-text');
    } else if (library) {
      this.tooltip = library.description || library.name;
      this.contextValue = 'template.library';
      this.iconPath = new vscode.ThemeIcon('library');
    } else {
      this.contextValue = contextValue || 'template.group';
    }
  }
}

/**
 * 模板树视图数据提供者
 */
export class TemplateTreeDataProvider implements vscode.TreeDataProvider<TemplateTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TemplateTreeItem | undefined | null | void> =
    new vscode.EventEmitter<TemplateTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TemplateTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private templateService: TemplateApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TemplateTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TemplateTreeItem): Promise<TemplateTreeItem[]> {
    try {
      // 根节点：显示所有 Vault 的模板库
      if (!element) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          return [];
        }

        const allLibraries: TemplateLibrary[] = [];
        for (const vault of vaultsResult.value) {
          const librariesResult = await this.templateService.getTemplateLibraries(vault.id);
          if (librariesResult.success) {
            allLibraries.push(...librariesResult.value);
          }
        }

        return allLibraries.map(library =>
          new TemplateTreeItem(
            library.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            library
          )
        );
      }

      // 模板库节点：显示结构模板和内容模板分组
      if (element.library) {
        const library = element.library;
        const structureTemplates = library.templates.filter(t => t.type === 'structure');
        const contentTemplates = library.templates.filter(t => t.type === 'content');

        const items: TemplateTreeItem[] = [];

        if (structureTemplates.length > 0) {
          items.push(
            new TemplateTreeItem(
              `结构模板 (${structureTemplates.length})`,
              vscode.TreeItemCollapsibleState.Collapsed,
              undefined,
              library,
              'template.group'
            )
          );
        }

        if (contentTemplates.length > 0) {
          items.push(
            new TemplateTreeItem(
              `内容模板 (${contentTemplates.length})`,
              vscode.TreeItemCollapsibleState.Collapsed,
              undefined,
              library,
              'template.group'
            )
          );
        }

        return items;
      }

      // 模板分组节点：显示该类型的模板
      if (element.label.includes('结构模板') || element.label.includes('内容模板')) {
        const library = element.library!;
        const templateType = element.label.includes('结构模板') ? 'structure' : 'content';
        const templates = library.templates.filter(t => t.type === templateType);

        return templates.map(template =>
          new TemplateTreeItem(
            template.name,
            vscode.TreeItemCollapsibleState.None,
            template,
            library
          )
        );
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get template tree items', error);
      return [];
    }
  }
}

