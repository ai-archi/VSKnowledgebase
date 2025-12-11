import * as vscode from 'vscode';

/**
 * 基础 Artifact 树项类
 * 定义通用属性，供子类继承
 */
export abstract class BaseArtifactTreeItem extends vscode.TreeItem {
  public readonly vaultName?: string;
  public readonly vaultId?: string;
  public readonly folderPath?: string; // 文件夹路径（相对于 vault 的根目录）
  public readonly filePath?: string; // 文件路径（相对于 vault 的根目录）

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    vaultName?: string,
    vaultId?: string,
    folderPath?: string,
    filePath?: string,
    contextValue?: string
  ) {
    super(label, collapsibleState);
    this.vaultName = vaultName;
    this.vaultId = vaultId;
    this.folderPath = folderPath;
    this.filePath = filePath;
    this.contextValue = contextValue;
  }

  /**
   * 判断是否为指定的 vault 节点
   */
  isVault(vaultName: string): boolean {
    return this.vaultName === vaultName && this.folderPath === undefined && this.filePath === undefined;
  }

  /**
   * 判断是否为指定的文件夹节点
   */
  isFolder(vaultName: string, folderPath: string): boolean {
    return this.vaultName === vaultName && this.folderPath === folderPath;
  }

  /**
   * 判断是否为文件节点
   */
  isFile(): boolean {
    return this.filePath !== undefined;
  }
}
