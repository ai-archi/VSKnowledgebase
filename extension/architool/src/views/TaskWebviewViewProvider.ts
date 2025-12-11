import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 任务 Webview 视图提供者
 * 在面板中显示任务相关的 Webview
 */
export class TaskWebviewViewProvider implements vscode.WebviewViewProvider {
  private webviewView: vscode.WebviewView | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.webviewView = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [],
    };

    // 设置初始 HTML 内容（空实现）
    webviewView.webview.html = this.getWebviewContent(webviewView.webview);
  }

  private getWebviewContent(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasks</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="empty-state">
        <h2>Tasks View</h2>
        <p>Task view will be implemented here.</p>
    </div>
</body>
</html>`;
  }
}
