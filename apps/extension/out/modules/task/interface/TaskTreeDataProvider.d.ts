import * as vscode from 'vscode';
import { TaskApplicationService, Task } from '../application/TaskApplicationService';
import { Logger } from '../../../core/logger/Logger';
export declare class TaskTreeItem extends vscode.TreeItem {
    readonly task: Task;
    readonly collapsibleState: vscode.TreeItemCollapsibleState;
    constructor(task: Task, collapsibleState: vscode.TreeItemCollapsibleState);
}
export declare class TaskTreeDataProvider implements vscode.TreeDataProvider<TaskTreeItem> {
    private taskService;
    private logger;
    private _onDidChangeTreeData;
    readonly onDidChangeTreeData: vscode.Event<TaskTreeItem | undefined | null | void>;
    constructor(taskService: TaskApplicationService, logger: Logger);
    refresh(): void;
    getTreeItem(element: TaskTreeItem): vscode.TreeItem;
    getChildren(element?: TaskTreeItem): Promise<TaskTreeItem[]>;
}
//# sourceMappingURL=TaskTreeDataProvider.d.ts.map