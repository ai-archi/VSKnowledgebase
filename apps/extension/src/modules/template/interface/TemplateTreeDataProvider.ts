import * as vscode from 'vscode';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 模板树项
 */
export class TemplateTreeItem extends vscode.TreeItem {
  public readonly vaultName?: string;
  public readonly filePath?: string; // 相对于 vault/templates 的路径

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    filePath?: string,
    contextValue?: string
  ) {
    super(label, collapsibleState);
    
    this.vaultName = vaultName;
    this.filePath = filePath;
    this.contextValue = contextValue || 'template.file';
    
    // 根据文件扩展名设置图标
    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.yml' || ext === '.yaml') {
        this.iconPath = new vscode.ThemeIcon('file-code');
      } else if (ext === '.md') {
        this.iconPath = new vscode.ThemeIcon('markdown');
      } else {
        this.iconPath = new vscode.ThemeIcon('file');
      }
      this.tooltip = filePath;
    } else {
      // 目录
      this.iconPath = new vscode.ThemeIcon('folder');
      this.tooltip = vaultName ? `Vault: ${vaultName}` : label;
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
    private vaultService: VaultApplicationService,
    private vaultAdapter: VaultFileSystemAdapter,
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
      // 根节点：显示所有 Vault
      if (!element) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          return [];
        }

        return vaultsResult.value.map(vault =>
          new TemplateTreeItem(
            vault.name,
            vscode.TreeItemCollapsibleState.Collapsed,
            vault.name,
            undefined,
            'vault'
          )
        );
      }

      // Vault 节点：显示该 vault 的 templates 目录下的文件和子目录
      if (element.contextValue === 'vault' && element.vaultName) {
        const vaultPath = this.vaultAdapter.getVaultPath(element.vaultName);
        const templatesDir = path.join(vaultPath, 'templates');

        if (!fs.existsSync(templatesDir)) {
          return [];
        }

        return this.getTemplateFiles(templatesDir, element.vaultName, '');
      }

      // 目录节点：显示该目录下的文件和子目录
      if (element.vaultName && element.filePath !== undefined) {
        const vaultPath = this.vaultAdapter.getVaultPath(element.vaultName);
        const fullPath = path.join(vaultPath, 'templates', element.filePath);

        if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
          return [];
        }

        return this.getTemplateFiles(fullPath, element.vaultName, element.filePath);
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get template tree items', error);
      return [];
    }
  }

  /**
   * 获取模板目录下的文件和子目录
   */
  private getTemplateFiles(
    dirPath: string,
    vaultName: string,
    relativePath: string
  ): TemplateTreeItem[] {
    try {
      if (!fs.existsSync(dirPath)) {
        return [];
      }

      const items: TemplateTreeItem[] = [];
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });

      // 排序：目录在前，文件在后，都按名称排序
      entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of entries) {
        // 跳过隐藏文件和系统文件
        if (entry.name.startsWith('.')) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const itemRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          items.push(
            new TemplateTreeItem(
              entry.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              vaultName,
              itemRelativePath,
              'template.directory'
            )
          );
        } else {
          items.push(
            new TemplateTreeItem(
              entry.name,
              vscode.TreeItemCollapsibleState.None,
              vaultName,
              itemRelativePath,
              'template.file'
            )
          );
        }
      }

      return items;
    } catch (error: any) {
      this.logger.error(`Failed to read template directory: ${dirPath}`, error);
      return [];
    }
  }
}
