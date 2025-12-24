/**
 * IDE 适配器接口
 * 定义与 IDE 无关的统一接口，用于抽象不同 IDE 的 API
 */

import {
  Disposable,
  WorkspaceFolder,
  Uri,
  Position,
  Range,
  TextDocument,
  ViewColumn,
  TreeItemCollapsibleState,
  TreeItem,
  TreeDataProvider,
  TreeView,
  TreeViewRevealOptions,
  Webview,
  WebviewOptions,
  WebviewPanel,
  WebviewView,
  CustomTextEditorProvider,
  CancellationToken,
  Command,
  WorkspaceEdit,
} from './ide-types';

/**
 * IDE 适配器接口
 * 提供统一的 IDE API 访问接口
 */
export interface IDEAdapter {
  // ========== 命令系统 ==========
  
  /**
   * 注册命令
   * @param command 命令 ID
   * @param callback 命令回调函数
   * @returns 可释放资源
   */
  registerCommand(command: string, callback: (...args: any[]) => any): Disposable;

  /**
   * 执行命令
   * @param command 命令 ID
   * @param rest 命令参数
   * @returns 命令执行结果
   */
  executeCommand<T = any>(command: string, ...rest: any[]): Thenable<T | undefined>;

  // ========== 视图系统 ==========

  /**
   * 创建树视图
   * @param viewId 视图 ID
   * @param treeDataProvider 树数据提供者
   * @returns 树视图实例
   */
  createTreeView<T>(viewId: string, treeDataProvider: TreeDataProvider<T>): TreeView<T>;

  /**
   * 创建 Webview 面板
   * @param viewType 视图类型
   * @param title 标题
   * @param viewColumn 视图列
   * @param options Webview 选项
   * @returns Webview 面板实例
   */
  createWebviewPanel(
    viewType: string,
    title: string,
    viewColumn: ViewColumn,
    options: WebviewOptions
  ): WebviewPanel;

  /**
   * 注册 Webview 视图提供者
   * @param viewId 视图 ID
   * @param provider Webview 视图提供者
   * @param options 选项
   * @returns 可释放资源
   */
  registerWebviewViewProvider(
    viewId: string,
    provider: {
      resolveWebviewView(
        webviewView: WebviewView,
        context: { readonly webview: Webview },
        token: CancellationToken
      ): void | Thenable<void>;
    },
    options?: {
      webviewOptions?: WebviewOptions;
    }
  ): Disposable;

  // ========== 工作区 ==========

  /**
   * 获取工作区根路径
   * @returns 工作区根路径，如果没有工作区则返回 null
   */
  getWorkspaceRoot(): string | null;

  /**
   * 获取工作区文件夹列表
   * @returns 工作区文件夹数组
   */
  getWorkspaceFolders(): readonly WorkspaceFolder[] | undefined;

  /**
   * 获取工作区配置
   * @param section 配置节名称
   * @param scope 配置作用域
   * @returns 配置对象
   */
  getConfiguration(section?: string, scope?: Uri | null): {
    get<T>(key: string, defaultValue?: T): T;
    has(key: string): boolean;
    update(key: string, value: any, target?: boolean | 1 | 2): Thenable<void>;
    inspect<T>(key: string): {
      key: string;
      defaultValue?: T;
      globalValue?: T;
      workspaceValue?: T;
      workspaceFolderValue?: T;
    } | undefined;
  };

  // ========== 文件系统 ==========

  /**
   * 创建 WorkspaceEdit
   * @returns WorkspaceEdit 实例
   */
  createWorkspaceEdit(): WorkspaceEdit;

  /**
   * 读取文件内容
   * @param uri 文件 URI
   * @returns 文件内容
   */
  readFile(uri: Uri): Thenable<Uint8Array>;

  /**
   * 写入文件内容
   * @param uri 文件 URI
   * @param content 文件内容
   * @returns Promise
   */
  writeFile(uri: Uri, content: Uint8Array): Thenable<void>;

  /**
   * 检查文件或目录是否存在
   * @param uri 文件或目录 URI
   * @returns 是否存在
   */
  exists(uri: Uri): Thenable<boolean>;

  /**
   * 应用工作区编辑
   * @param edit 工作区编辑
   * @returns 是否成功
   */
  applyEdit(edit: WorkspaceEdit): Thenable<boolean>;

  /**
   * 监听文本文档变更事件
   * @param listener 事件监听器
   * @param thisArgs this 参数
   * @param disposables 可释放资源数组
   * @returns 可释放资源
   */
  onDidChangeTextDocument(
    listener: (e: any) => any,
    thisArgs?: any,
    disposables?: Disposable[]
  ): Disposable;

  // ========== 编辑器 ==========

  /**
   * 注册自定义文本编辑器
   * @param viewType 视图类型
   * @param provider 编辑器提供者
   * @param options 选项
   * @returns 可释放资源
   */
  registerCustomEditorProvider(
    viewType: string,
    provider: CustomTextEditorProvider,
    options?: {
      webviewOptions?: WebviewOptions;
      supportsMultipleEditorsPerDocument?: boolean;
    }
  ): Disposable;

  /**
   * 打开文本文档
   * @param uri 文档 URI
   * @returns 文本文档
   */
  openTextDocument(uri: Uri): Thenable<TextDocument>;

  /**
   * 打开文本文档（通过 URI 字符串）
   * @param uri 文档 URI 字符串
   * @returns 文本文档
   */
  openTextDocument(uri: string): Thenable<TextDocument>;

  /**
   * 显示文档
   * @param document 文档
   * @param column 视图列
   * @param preserveFocus 是否保持焦点
   * @returns 编辑器实例
   */
  showTextDocument(
    document: TextDocument,
    column?: ViewColumn,
    preserveFocus?: boolean
  ): Thenable<any>;

  // ========== 通知 ==========

  /**
   * 显示信息消息
   * @param message 消息内容
   * @param items 操作项
   * @returns 用户选择的操作项
   */
  showInformationMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;

  /**
   * 显示警告消息
   * @param message 消息内容
   * @param items 操作项
   * @returns 用户选择的操作项
   */
  showWarningMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;

  /**
   * 显示错误消息
   * @param message 消息内容
   * @param items 操作项
   * @returns 用户选择的操作项
   */
  showErrorMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined>;

  // ========== URI 工具 ==========

  /**
   * 解析 URI
   * @param value URI 字符串或 URI 对象
   * @returns URI 对象
   */
  Uri(value: string | Uri): Uri;

  /**
   * 文件 URI
   * @param path 文件路径
   * @returns URI 对象
   */
  UriFile(path: string): Uri;

  /**
   * 连接路径 URI
   * @param base 基础 URI
   * @param ...path 路径片段
   * @returns URI 对象
   */
  UriJoinPath(base: Uri, ...path: string[]): Uri;

  // ========== 范围工具 ==========

  /**
   * 创建位置
   * @param line 行号
   * @param character 字符位置
   * @returns 位置对象
   */
  Position(line: number, character: number): Position;

  /**
   * 创建范围
   * @param start 起始位置
   * @param end 结束位置
   * @returns 范围对象
   */
  Range(start: Position, end: Position): Range;

  /**
   * 创建范围（通过行号和字符位置）
   * @param startLine 起始行号
   * @param startCharacter 起始字符位置
   * @param endLine 结束行号
   * @param endCharacter 结束字符位置
   * @returns 范围对象
   */
  Range(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range;

  // ========== 扩展上下文 ==========

  /**
   * 获取扩展路径
   * @returns 扩展路径
   */
  getExtensionPath(): string;

  /**
   * 获取扩展 URI
   * @returns 扩展 URI
   */
  getExtensionUri(): Uri;

  /**
   * 订阅资源（用于自动清理）
   * @param disposable 可释放资源
   */
  subscribe(disposable: Disposable): void;
}

