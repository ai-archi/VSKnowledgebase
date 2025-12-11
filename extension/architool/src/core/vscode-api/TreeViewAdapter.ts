import * as vscode from 'vscode';

/**
 * TreeView 适配器
 * 封装 VSCode TreeView API
 */
export class TreeViewAdapter<T> {
  private treeView: vscode.TreeView<T>;

  constructor(
    viewId: string,
    treeDataProvider: vscode.TreeDataProvider<T>
  ) {
    this.treeView = vscode.window.createTreeView(viewId, {
      treeDataProvider,
    });
  }

  reveal(element: T, options?: { select?: boolean; focus?: boolean; expand?: boolean }): Thenable<void> {
    return this.treeView.reveal(element, options);
  }

  dispose(): void {
    this.treeView.dispose();
  }
}


