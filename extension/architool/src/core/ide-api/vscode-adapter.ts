/**
 * VS Code 适配器实现
 * 封装 VS Code API，实现 IDEAdapter 接口
 */

import * as vscode from 'vscode';
import { IDEAdapter } from './ide-adapter';
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
  WorkspaceEdit,
} from './ide-types';

/**
 * VS Code 适配器
 * 将 VS Code API 适配到 IDEAdapter 接口
 */
export class VSCodeAdapter implements IDEAdapter {
  constructor(private context: vscode.ExtensionContext) {}

  // ========== 命令系统 ==========

  registerCommand(command: string, callback: (...args: any[]) => any): Disposable {
    const disposable = vscode.commands.registerCommand(command, callback);
    this.context.subscriptions.push(disposable);
    return disposable;
  }

  executeCommand<T = any>(command: string, ...rest: any[]): Thenable<T | undefined> {
    return vscode.commands.executeCommand<T>(command, ...rest);
  }

  // ========== 视图系统 ==========

  createTreeView<T>(viewId: string, treeDataProvider: TreeDataProvider<T>): TreeView<T> {
    return vscode.window.createTreeView<T>(viewId, {
      treeDataProvider: treeDataProvider as vscode.TreeDataProvider<T>,
    }) as any;
  }

  createWebviewPanel(
    viewType: string,
    title: string,
    viewColumn: ViewColumn,
    options: WebviewOptions
  ): WebviewPanel {
    return vscode.window.createWebviewPanel(
      viewType,
      title,
      viewColumn as vscode.ViewColumn,
      options as vscode.WebviewOptions
    ) as any;
  }

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
  ): Disposable {
    const vscodeProvider: vscode.WebviewViewProvider = {
      resolveWebviewView: (webviewView, context, token) => {
        return provider.resolveWebviewView(
          webviewView as any,
          context as any,
          token as any
        );
      },
    };
    return vscode.window.registerWebviewViewProvider(viewId, vscodeProvider, options as any);
  }

  // ========== 工作区 ==========

  getWorkspaceRoot(): string | null {
    const folder = vscode.workspace.workspaceFolders?.[0];
    return folder ? folder.uri.fsPath : null;
  }

  getWorkspaceFolders(): readonly WorkspaceFolder[] | undefined {
    return vscode.workspace.workspaceFolders as any;
  }

  getConfiguration(section?: string, scope?: Uri | null): any {
    return vscode.workspace.getConfiguration(section, scope as vscode.Uri | null);
  }

  // ========== 文件系统 ==========

  createWorkspaceEdit(): WorkspaceEdit {
    return new vscode.WorkspaceEdit() as any;
  }

  readFile(uri: Uri): Thenable<Uint8Array> {
    return vscode.workspace.fs.readFile(uri as vscode.Uri);
  }

  writeFile(uri: Uri, content: Uint8Array): Thenable<void> {
    return vscode.workspace.fs.writeFile(uri as vscode.Uri, content);
  }

  exists(uri: Uri): Thenable<boolean> {
    return vscode.workspace.fs.stat(uri as vscode.Uri).then(
      () => true,
      () => false
    );
  }

  applyEdit(edit: WorkspaceEdit): Thenable<boolean> {
    return vscode.workspace.applyEdit(edit as unknown as vscode.WorkspaceEdit);
  }

  onDidChangeTextDocument(
    listener: (e: any) => any,
    thisArgs?: any,
    disposables?: Disposable[]
  ): Disposable {
    return vscode.workspace.onDidChangeTextDocument(listener, thisArgs, disposables as vscode.Disposable[]);
  }

  // ========== 编辑器 ==========

  registerCustomEditorProvider(
    viewType: string,
    provider: CustomTextEditorProvider,
    options?: {
      webviewOptions?: WebviewOptions;
      supportsMultipleEditorsPerDocument?: boolean;
    }
  ): Disposable {
    return vscode.window.registerCustomEditorProvider(
      viewType,
      provider as vscode.CustomTextEditorProvider,
      options as any
    );
  }

  openTextDocument(uri: Uri | string): Thenable<TextDocument> {
    if (typeof uri === 'string') {
      return vscode.workspace.openTextDocument(uri) as any;
    }
    return vscode.workspace.openTextDocument(uri as vscode.Uri) as any;
  }

  showTextDocument(
    document: TextDocument,
    column?: ViewColumn,
    preserveFocus?: boolean
  ): Thenable<any> {
    return vscode.window.showTextDocument(
      document as vscode.TextDocument,
      column as vscode.ViewColumn | undefined,
      preserveFocus
    );
  }

  // ========== 通知 ==========

  showInformationMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showInformationMessage(message, ...items);
  }

  showWarningMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showWarningMessage(message, ...items);
  }

  showErrorMessage(
    message: string,
    ...items: string[]
  ): Thenable<string | undefined> {
    return vscode.window.showErrorMessage(message, ...items);
  }

  // ========== URI 工具 ==========

  Uri(value: string | Uri): Uri {
    if (typeof value === 'string') {
      return vscode.Uri.parse(value) as any;
    }
    return value;
  }

  UriFile(path: string): Uri {
    return vscode.Uri.file(path) as any;
  }

  UriJoinPath(base: Uri, ...path: string[]): Uri {
    return vscode.Uri.joinPath(base as vscode.Uri, ...path) as any;
  }

  // ========== 范围工具 ==========

  Position(line: number, character: number): Position {
    return new vscode.Position(line, character) as any;
  }

  Range(start: Position, end: Position): Range;
  Range(startLine: number, startCharacter: number, endLine: number, endCharacter: number): Range;
  Range(
    startOrStartLine: Position | number,
    endOrStartCharacter?: Position | number,
    endLine?: number,
    endCharacter?: number
  ): Range {
    if (typeof startOrStartLine === 'number') {
      return new vscode.Range(
        startOrStartLine,
        endOrStartCharacter as number,
        endLine!,
        endCharacter!
      ) as any;
    }
    return new vscode.Range(startOrStartLine as any, endOrStartCharacter as any) as any;
  }

  // ========== 扩展上下文 ==========

  getExtensionPath(): string {
    return this.context.extensionPath;
  }

  getExtensionUri(): Uri {
    return this.context.extensionUri as any;
  }

  subscribe(disposable: Disposable): void {
    this.context.subscriptions.push(disposable as vscode.Disposable);
  }
}

