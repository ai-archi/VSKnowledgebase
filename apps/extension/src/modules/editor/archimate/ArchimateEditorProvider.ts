import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ArchiMate 编辑器提供者
 * 支持 .xml.at 文件的自定义编辑器
 */
export class ArchimateEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'architool.archimateEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 注册编辑器提供者
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new ArchimateEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      ArchimateEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  /**
   * 解析自定义编辑器
   */
  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    // 设置 Webview 内容
    // 获取 archimate-js 的路径（从 extension 目录读取打包后的路径）
    const extensionPath = this.context.extensionPath;
    const archimateJsPath = path.join(extensionPath, 'archimate-js');
    const archimateJsUri = vscode.Uri.file(archimateJsPath);
    
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        archimateJsUri,
      ],
    };

    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      document,
      this.context.extensionUri
    );

    // 处理来自 Webview 的消息：仅处理保存
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (e) => {
        switch (e.type) {
          case 'save':
            // 保存文档内容
            const edit = new vscode.WorkspaceEdit();
            edit.replace(
              document.uri,
              new vscode.Range(0, 0, document.lineCount, 0),
              e.content
            );
            const success = await vscode.workspace.applyEdit(edit);
            if (!success) {
              vscode.window.showErrorMessage('Failed to save document');
            } else {
              // 保存成功后，标记文档为已保存
              await document.save();
            }
            break;

          case 'error':
            vscode.window.showErrorMessage(`Editor error: ${e.message}`);
            break;
        }
      }
    );

    // 监听文档变更：发送加载消息
    const changeDocumentSubscription2 = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          webviewPanel.webview.postMessage({
            type: 'load',
            content: e.document.getText(),
          });
        }
      }
    );

    // 清理订阅
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeDocumentSubscription2.dispose();
    });

    // 等待 webview 加载完成后发送初始内容（加载功能）
    // 使用 setTimeout 确保 webview 已完全加载并准备好接收消息
    setTimeout(() => {
      webviewPanel.webview.postMessage({
        type: 'load',
        content: document.getText(),
      });
    }, 100);
  }

  /**
   * 获取 Webview HTML 内容
   * 简化版本：只处理必要的路径替换和初始内容注入
   */
  private getWebviewContent(
    webview: vscode.Webview,
    document: vscode.TextDocument,
    extensionUri: vscode.Uri
  ): string {
    // 获取 archimate-js 的路径
    const extensionPath = this.context.extensionPath;
    const archimateJsPath = path.join(extensionPath, 'archimate-js');
    const indexHtmlPath = path.join(archimateJsPath, 'index.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(indexHtmlPath)) {
      throw new Error(
        `ArchiMate editor build artifacts not found. Please run: pnpm build`
      );
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数
    const archimateJsUri = vscode.Uri.file(archimateJsPath);
    const webviewUri = (relativePath: string) => {
      const uri = vscode.Uri.joinPath(archimateJsUri, relativePath);
      return webview.asWebviewUri(uri).toString();
    };
    
    // 替换所有 JS 和 CSS 文件的相对路径为 webview URI（必须，因为相对路径在 webview 中无法工作）
    // 1. 替换 CSS 文件路径
    htmlContent = htmlContent.replace(
      /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi,
      (match, cssPath) => {
        // 跳过已经是绝对路径的（如 CDN）
        if (cssPath.startsWith('http://') || cssPath.startsWith('https://')) {
          return match;
        }
        return match.replace(cssPath, webviewUri(cssPath));
      }
    );
    
    // 2. 替换所有 script 标签中的 JS 文件路径
    htmlContent = htmlContent.replace(
      /<script[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi,
      (match, jsPath) => {
        // 跳过已经是绝对路径的（如 CDN）
        if (jsPath.startsWith('http://') || jsPath.startsWith('https://')) {
          return match;
        }
        // 对于 app.js，保持 type="module"
        if (jsPath === 'app.js') {
          return `<script type="module" src="${webviewUri(jsPath)}"></script>`;
        }
        return match.replace(jsPath, webviewUri(jsPath));
      }
    );
    
    // 3. 注入初始内容（必须，用于传递文档内容）
    const initialContentScript = `
    <script>
        window.initialContent = ${JSON.stringify(document.getText())};
    </script>`;
    
    // 在 </head> 之前注入初始内容脚本（在 app.js 加载之前）
    htmlContent = htmlContent.replace('</head>', `${initialContentScript}\n</head>`);
    
    return htmlContent;
  }


}

