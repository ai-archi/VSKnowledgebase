import { IDEAdapter } from '../ide-api/ide-adapter';
import { TreeView, TreeDataProvider, TreeViewRevealOptions } from '../ide-api/ide-types';

/**
 * TreeView 适配器
 * 封装 TreeView API，使用 IDEAdapter 接口
 */
export class TreeViewAdapter<T> {
  private treeView: TreeView<T>;

  constructor(
    ideAdapter: IDEAdapter,
    viewId: string,
    treeDataProvider: TreeDataProvider<T>
  ) {
    this.treeView = ideAdapter.createTreeView(viewId, treeDataProvider);
  }

  reveal(element: T, options?: TreeViewRevealOptions): Thenable<void> {
    return this.treeView.reveal(element, options);
  }

  dispose(): void {
    this.treeView.dispose();
  }
}


