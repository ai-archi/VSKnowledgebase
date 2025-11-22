import * as vscode from 'vscode';
/**
 * TreeView 适配器
 * 封装 VSCode TreeView API
 */
export declare class TreeViewAdapter<T> {
    private treeView;
    constructor(viewId: string, treeDataProvider: vscode.TreeDataProvider<T>);
    reveal(element: T, options?: {
        select?: boolean;
        focus?: boolean;
        expand?: boolean;
    }): Thenable<void>;
    dispose(): void;
}
//# sourceMappingURL=TreeViewAdapter.d.ts.map