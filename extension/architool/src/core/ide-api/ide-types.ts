/**
 * IDE 通用类型定义
 * 定义与 IDE 无关的通用类型，用于适配层
 */

/**
 * 可释放资源接口
 */
export interface Disposable {
  dispose(): void;
}

/**
 * 工作区文件夹
 */
export interface WorkspaceFolder {
  uri: Uri;
  name: string;
  index: number;
}

/**
 * URI 接口
 */
export interface Uri {
  scheme: string;
  authority: string;
  path: string;
  query: string;
  fragment: string;
  fsPath: string;
  toString(): string;
  with(change: {
    scheme?: string;
    authority?: string;
    path?: string;
    query?: string;
    fragment?: string;
  }): Uri;
}

/**
 * 文本位置
 */
export interface Position {
  line: number;
  character: number;
  isBefore(other: Position): boolean;
  isAfter(other: Position): boolean;
  isBeforeOrEqual(other: Position): boolean;
  isAfterOrEqual(other: Position): boolean;
  compareTo(other: Position): number;
  translate(lineDelta?: number, characterDelta?: number): Position;
  translate(change: { lineDelta?: number; characterDelta?: number }): Position;
  with(line?: number, character?: number): Position;
  with(change: { line?: number; character?: number }): Position;
}

/**
 * 文本范围
 */
export interface Range {
  start: Position;
  end: Position;
  isEmpty: boolean;
  isSingleLine: boolean;
  contains(positionOrRange: Position | Range): boolean;
  isEqual(other: Range): boolean;
  intersection(range: Range): Range | undefined;
  union(other: Range): Range;
  with(start?: Position, end?: Position): Range;
  with(change: { start?: Position; end?: Position }): Range;
}

/**
 * 文本文档
 */
export interface TextDocument {
  uri: Uri;
  fileName: string;
  isUntitled: boolean;
  languageId: string;
  version: number;
  isDirty: boolean;
  isClosed: boolean;
  eol: 1 | 2; // EndOfLine.LF | EndOfLine.CRLF
  lineCount: number;
  getText(range?: Range): string;
  getWordRangeAtPosition(position: Position, regex?: RegExp): Range | undefined;
  positionAt(offset: number): Position;
  offsetAt(position: Position): number;
  validateRange(range: Range): Range;
  validatePosition(position: Position): Position;
}

/**
 * 视图列
 */
export enum ViewColumn {
  Active = -1,
  Beside = -2,
  One = 1,
  Two = 2,
  Three = 3,
  Four = 4,
  Five = 5,
  Six = 6,
  Seven = 7,
  Eight = 8,
  Nine = 9,
}

/**
 * 树项可折叠状态
 */
export enum TreeItemCollapsibleState {
  None = 0,
  Collapsed = 1,
  Expanded = 2,
}

/**
 * 树项
 */
export interface TreeItem {
  label?: string;
  id?: string;
  iconPath?: Uri | { light: Uri; dark: Uri } | string;
  resourceUri?: Uri;
  tooltip?: string;
  command?: Command;
  collapsibleState?: TreeItemCollapsibleState;
  contextValue?: string;
  description?: string | boolean;
}

/**
 * 命令
 */
export interface Command {
  command: string;
  title: string;
  arguments?: any[];
}

/**
 * 树数据提供者
 */
export interface TreeDataProvider<T> {
  onDidChangeTreeData?: Event<T | undefined | null | void>;
  getTreeItem(element: T): TreeItem | Thenable<TreeItem>;
  getChildren(element?: T): T[] | Thenable<T[]>;
  getParent?(element: T): T | null | undefined | Thenable<T | null | undefined>;
  resolveTreeItem?(item: T, element: T, token: CancellationToken): TreeItem | Thenable<TreeItem>;
}

/**
 * 树视图
 */
export interface TreeView<T> {
  readonly onDidExpandElement: Event<TreeViewExpansionEvent<T>>;
  readonly onDidCollapseElement: Event<TreeViewExpansionEvent<T>>;
  readonly selection: readonly T[];
  readonly onDidChangeSelection: Event<TreeViewSelectionChangeEvent<T>>;
  readonly visible: boolean;
  readonly onDidChangeVisibility: Event<TreeViewVisibilityChangeEvent>;
  message?: string;
  title?: string;
  description?: string;
  badge?: ViewBadge;
  reveal(element: T, options?: Partial<TreeViewRevealOptions>): Thenable<void>;
  dispose(): void;
}

/**
 * 树视图展开事件
 */
export interface TreeViewExpansionEvent<T> {
  element: T;
}

/**
 * 树视图选择变更事件
 */
export interface TreeViewSelectionChangeEvent<T> {
  selection: readonly T[];
}

/**
 * 树视图可见性变更事件
 */
export interface TreeViewVisibilityChangeEvent {
  visible: boolean;
}

/**
 * 树视图显示选项
 */
export interface TreeViewRevealOptions {
  select?: boolean;
  focus?: boolean;
  expand?: boolean | number;
}

/**
 * 视图徽章
 */
export interface ViewBadge {
  value: number;
  tooltip: string;
}

/**
 * Webview
 */
export interface Webview {
  html: string; // 允许设置（虽然 VS Code 中可能是只读，但为了兼容性设为可写）
  readonly onDidReceiveMessage: Event<any>;
  readonly cspSource: string;
  options: WebviewOptions; // 允许设置
  asWebviewUri(localResource: Uri): Uri;
  postMessage(message: any): Thenable<boolean>;
}

/**
 * Webview 选项
 */
export interface WebviewOptions {
  enableScripts?: boolean;
  enableCommandUris?: boolean | readonly string[]; // VS Code supports array, IntelliJ may only support boolean
  enableFindWidget?: boolean;
  retainContextWhenHidden?: boolean;
  localResourceRoots?: readonly Uri[];
}

/**
 * Webview 面板
 */
export interface WebviewPanel {
  readonly viewType: string;
  readonly title: string;
  readonly webview: Webview;
  readonly viewColumn?: ViewColumn;
  readonly active: boolean;
  readonly visible: boolean;
  readonly onDidDispose: Event<void>;
  readonly onDidChangeViewState: Event<WebviewPanelOnDidChangeViewStateEvent>;
  dispose(): void;
  reveal(viewColumn?: ViewColumn, preserveFocus?: boolean): void;
}

/**
 * Webview 面板视图状态变更事件
 */
export interface WebviewPanelOnDidChangeViewStateEvent {
  readonly webviewPanel: WebviewPanel;
}

/**
 * Webview 视图
 */
export interface WebviewView {
  readonly webview: Webview;
  readonly title?: string;
  readonly description?: string;
  readonly badge?: ViewBadge;
  readonly onDidChangeVisibility: Event<WebviewViewVisibilityChangeEvent>;
  readonly visible: boolean;
  readonly onDidDispose: Event<void>;
  show(preserveFocus?: boolean): void;
  dispose(): void;
}

/**
 * Webview 视图可见性变更事件
 */
export interface WebviewViewVisibilityChangeEvent {
  readonly visible: boolean;
}

/**
 * 自定义文本编辑器提供者
 */
export interface CustomTextEditorProvider {
  resolveCustomTextEditor(
    document: TextDocument,
    webviewPanel: WebviewPanel,
    token: CancellationToken
  ): Thenable<void> | void;
}

/**
 * 取消令牌
 */
export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: Event<any>;
}

/**
 * 事件
 */
export interface Event<T> {
  (listener: (e: T) => any, thisArgs?: any, disposables?: Disposable[]): Disposable;
}

/**
 * Thenable（Promise-like）
 */
export interface Thenable<T> {
  then<TResult>(
    onfulfilled?: (value: T) => TResult | Thenable<TResult>,
    onrejected?: (reason: any) => TResult | Thenable<TResult>
  ): Thenable<TResult>;
  then<TResult>(
    onfulfilled?: (value: T) => TResult | Thenable<TResult>,
    onrejected?: (reason: any) => void
  ): Thenable<TResult>;
}

/**
 * 工作区编辑
 */
export interface WorkspaceEdit {
  entries(): [Uri, TextEdit[]][];
  has(uri: Uri): boolean;
  set(uri: Uri, edits: TextEdit[]): void;
  delete(uri: Uri, range: Range): void;
  insert(uri: Uri, position: Position, newText: string): void;
  replace(uri: Uri, range: Range, newText: string): void;
  get(uri: Uri): TextEdit[];
  size: number;
}

/**
 * 文本编辑
 */
export interface TextEdit {
  range: Range;
  newText: string;
}

