import * as vscode from 'vscode';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactTreeApplicationService } from '../../../domain/shared/artifact/application';
import { Logger } from '../../../core/logger/Logger';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
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
    private treeService: ArtifactTreeApplicationService,
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
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          return [];
        }
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          return [];
        }
        const vaultRef = { id: vault.id, name: vault.name };
        
        const existsResult = await this.treeService.exists(vaultRef, 'templates');
        if (!existsResult.success || !existsResult.value) {
          return [];
        }

        return this.getTemplateFiles(vaultRef, 'templates', '');
      }

      // 目录节点：显示该目录下的文件和子目录
      if (element.vaultName && element.filePath !== undefined) {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          return [];
        }
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          return [];
        }
        const vaultRef = { id: vault.id, name: vault.name };
        const dirPath = `templates/${element.filePath}`;
        
        const isDirResult = await this.treeService.isDirectory(vaultRef, dirPath);
        if (!isDirResult.success || !isDirResult.value) {
          return [];
        }

        return this.getTemplateFiles(vaultRef, dirPath, element.filePath);
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
  private async getTemplateFiles(
    vaultRef: { id: string; name: string },
    dirPath: string,
    relativePath: string
  ): Promise<TemplateTreeItem[]> {
    try {
      const listResult = await this.treeService.listDirectory(
        vaultRef,
        dirPath,
        { includeHidden: false }
      );

      if (!listResult.success) {
        return [];
      }

      const items: TemplateTreeItem[] = [];
      for (const node of listResult.value) {
        const itemRelativePath = relativePath ? `${relativePath}/${node.name}` : node.name;

        if (node.isDirectory) {
          items.push(
            new TemplateTreeItem(
              node.name,
              vscode.TreeItemCollapsibleState.Collapsed,
              vaultRef.name,
              itemRelativePath,
              'template.directory'
            )
          );
        } else {
          items.push(
            new TemplateTreeItem(
              node.name,
              vscode.TreeItemCollapsibleState.None,
              vaultRef.name,
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
