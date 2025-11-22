import * as vscode from 'vscode';
import { TaskApplicationService, Task } from '../application/TaskApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';

export class TaskTreeItem extends vscode.TreeItem {
  public readonly task?: Task;
  public readonly vaultName?: string;

  constructor(
    task?: Task,
    collapsibleState: vscode.TreeItemCollapsibleState = vscode.TreeItemCollapsibleState.None,
    vaultName?: string,
    contextValue?: string
  ) {
    if (task) {
      super(task.title, collapsibleState);
      this.task = task;
      this.tooltip = `${task.title} - ${task.status}`;
      this.description = task.status;
      this.contextValue = 'task';
    } else if (vaultName) {
      super(vaultName, collapsibleState);
      this.vaultName = vaultName;
      this.tooltip = `Vault: ${vaultName}`;
      this.contextValue = contextValue || 'vault';
      this.iconPath = new vscode.ThemeIcon('folder');
    } else {
      super('', collapsibleState);
    }
  }
}

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null | void> =
    new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private taskService: TaskApplicationService,
    private vaultService: VaultApplicationService,
    private logger: Logger
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    try {
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success || vaultsResult.value.length === 0) {
        return [];
      }

      // 根节点：显示所有 vault
      if (!element) {
        return vaultsResult.value.map(vault =>
          new TaskTreeItem(
            undefined,
            vscode.TreeItemCollapsibleState.Collapsed,
            vault.name,
            'vault'
          )
        );
      }

      // Vault 节点：显示该 vault 的所有任务
      if (element.vaultName) {
        const vault = vaultsResult.value.find(v => v.name === element.vaultName);
        if (!vault) {
          return [];
        }

        const tasksResult = await this.taskService.listTasks(vault.id);
        if (!tasksResult.success) {
          return [];
        }

        return tasksResult.value.map(task =>
          new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None)
        );
      }

      return [];
    } catch (error: any) {
      this.logger.error('Failed to get task tree items', error);
      return [];
    }
  }
}

