import * as vscode from 'vscode';

/**
 * 树视图工具类
 * 提供 VSCode TreeView 的底层操作能力
 */
export class TreeViewUtils {
  /**
   * 在树视图中查找节点
   * @param treeDataProvider 树数据提供者
   * @param element 起始元素（从根节点开始查找时传入 undefined）
   * @param predicate 查找条件
   * @returns 找到的节点，如果未找到则返回 undefined
   */
  static async findTreeItem<T extends vscode.TreeItem>(
    treeDataProvider: vscode.TreeDataProvider<T>,
    element: T | undefined,
    predicate: (item: T) => boolean
  ): Promise<T | undefined> {
    // 检查当前节点
    if (element && predicate(element)) {
      return element;
    }

    // 获取子节点
    const children = await treeDataProvider.getChildren(element);
    if (!children) {
      return undefined;
    }
    for (const child of children) {
      if (predicate(child)) {
        return child;
      }
      // 递归查找子节点
      const found = await this.findTreeItem(treeDataProvider, child, predicate);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * 展开所有节点
   * @param treeView 树视图
   * @param treeDataProvider 树数据提供者
   * @param getRootItems 获取根节点的方法
   * @param delay 延迟时间（毫秒），用于等待视图更新
   */
  static async expandAll<T extends vscode.TreeItem>(
    treeView: vscode.TreeView<T>,
    treeDataProvider: vscode.TreeDataProvider<T>,
    getRootItems: () => Promise<T[]>,
    delay: number = 100
  ): Promise<void> {
    try {
      // 先刷新视图以确保所有节点都已加载
      if ('refresh' in treeDataProvider && typeof treeDataProvider.refresh === 'function') {
        (treeDataProvider as any).refresh();
      }

      // 等待一小段时间让视图更新
      await new Promise(resolve => setTimeout(resolve, delay));

      // 展开所有根节点
      const rootItems = await getRootItems();
      for (const item of rootItems) {
        try {
          await treeView.reveal(item, { expand: true });
        } catch (error) {
          // 忽略单个节点展开失败
        }
      }
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 折叠所有节点
   * @param treeDataProvider 树数据提供者
   */
  static collapseAll<T extends vscode.TreeItem>(
    treeDataProvider: vscode.TreeDataProvider<T>
  ): void {
    // VSCode TreeView 没有直接的 collapseAll API
    // 最简单的方法是通过刷新视图来折叠所有节点
    // 刷新后所有节点默认是折叠状态
    if ('refresh' in treeDataProvider && typeof treeDataProvider.refresh === 'function') {
      (treeDataProvider as any).refresh();
    }
  }

  /**
   * 展开指定的节点
   * @param treeView 树视图
   * @param treeDataProvider 树数据提供者
   * @param findItem 查找节点的方法
   * @param delay 延迟时间（毫秒），用于等待视图更新
   */
  static async expandNode<T extends vscode.TreeItem>(
    treeView: vscode.TreeView<T>,
    treeDataProvider: vscode.TreeDataProvider<T>,
    findItem: () => Promise<T | undefined>,
    delay: number = 50
  ): Promise<void> {
    // 等待树视图更新完成
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      const item = await findItem();
      if (item) {
        await treeView.reveal(item, { expand: true });
      }
    } catch (error) {
      // 忽略错误
    }
  }
}

