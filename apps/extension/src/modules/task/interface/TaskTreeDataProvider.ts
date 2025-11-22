import * as vscode from 'vscode';
import { TaskApplicationService, Task } from '../application/TaskApplicationService';
import { Logger } from '../../../core/logger/Logger';

export class TaskTreeItem extends vscode.TreeItem {
  constructor(
    public readonly task: Task,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(task.title, collapsibleState);
    this.tooltip = `${task.title} - ${task.status}`;
    this.description = task.status;
    this.contextValue = 'task';
  }
}

export class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TaskTreeItem | undefined | null | void> =
    new vscode.EventEmitter<TaskTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(
    private taskService: TaskApplicationService,
    private logger: Logger
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TaskTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success) {
        return [];
      }

      return tasksResult.value.map(
        task => new TaskTreeItem(task, vscode.TreeItemCollapsibleState.None)
      );
    } catch (error: any) {
      this.logger.error('Failed to get task tree items', error);
      return [];
    }
  }
}

