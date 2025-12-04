import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ArchiMate 编辑器提供者
 * 支持 .archimate 文件的自定义编辑器
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
    console.log('[ArchimateEditor] Resolving custom editor for:', document.uri.fsPath);
    
    // 设置 Webview 内容
    // 获取 archimate-js 的路径（从 extension 目录读取打包后的路径）
    const extensionPath = this.context.extensionPath;
    const archimateJsPath = path.join(extensionPath, 'dist', 'archimate-js');
    const archimateJsUri = vscode.Uri.file(archimateJsPath);
    
    console.log('[ArchimateEditor] Extension path:', extensionPath);
    console.log('[ArchimateEditor] Archimate JS path:', archimateJsPath);
    
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

    // 处理来自 Webview 的消息
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (e: any) => {
        // 处理 API 请求（带 messageId 的请求-响应消息）
        if (e.type && e.type.startsWith('api-') && e.messageId) {
          const apiType = e.type.substring(4); // 去掉 'api-' 前缀
          const messageId = e.messageId;
          const payload = e.payload;

          try {
            let result: unknown = undefined;

            switch (apiType) {
              case 'fetchArchimate': {
                // 返回当前文档的 XML 内容
                result = document.getText();
                break;
              }

              case 'saveArchimate': {
                // 保存 Archimate XML
                if (payload && typeof payload === 'object' && 'xml' in payload) {
                  const xml = payload.xml as string;
                  const edit = new vscode.WorkspaceEdit();
                  edit.replace(
                    document.uri,
                    new vscode.Range(0, 0, document.lineCount, 0),
                    xml
                  );
                  await vscode.workspace.applyEdit(edit);
                  await document.save();
                  result = { success: true };
                }
                break;
              }

              default:
                console.warn(`[ArchimateEditor] Unknown API type: ${apiType}`);
            }

            // 发送响应
            webviewPanel.webview.postMessage({
              type: `api-${apiType}-response`,
              messageId,
              result,
            });
          } catch (error: any) {
            // 发送错误响应
            webviewPanel.webview.postMessage({
              type: `api-${apiType}-response`,
              messageId,
              error: error.message || 'Unknown error',
              status: 500,
              statusText: 'Internal Server Error',
            });
          }
          return;
        }

        // 处理其他消息类型
        switch (e.type) {
          case 'save':
            // 保存文档内容（兼容旧版本）
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
              await document.save();
            }
            break;

          case 'error':
            vscode.window.showErrorMessage(`Editor error: ${e.message}`);
            break;

          case 'info':
            vscode.window.showInformationMessage(e.message);
            break;
        }
      }
    );

    // 监听文档变更：发送加载消息
    const changeDocumentSubscription2 = vscode.workspace.onDidChangeTextDocument(
      (e: vscode.TextDocumentChangeEvent) => {
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
    // 增加延迟以确保消息监听器已设置
    setTimeout(() => {
      const content = document.getText();
      webviewPanel.webview.postMessage({
        type: 'load',
        content: content,
      });
      console.log(`[ArchimateEditor] Sent initial content, length: ${content.length}`);
    }, 300);
  }

  /**
   * 获取 Webview HTML 内容
   * 参考 mermaid-editor 和 plantuml-js 的简单实现方式
   */
  private getWebviewContent(
    webview: vscode.Webview,
    document: vscode.TextDocument,
    extensionUri: vscode.Uri
  ): string {
    // 获取 archimate-js 的路径
    const extensionPath = this.context.extensionPath;
    const archimateJsPath = path.join(extensionPath, 'dist', 'archimate-js');
    const indexHtmlPath = path.join(archimateJsPath, 'index.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(indexHtmlPath)) {
      throw new Error(
        `ArchiMate editor build artifacts not found at ${indexHtmlPath}. Please run: pnpm build:archimate-js`
      );
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数（参考 plantuml-js 的实现）
    // 统一转换为 CDN 格式：https://file+.vscode-resource.vscode-cdn.net/...
    const archimateJsUri = vscode.Uri.file(archimateJsPath);
    const webviewUri = (relativePath: string) => {
      // 跳过已经是绝对路径的（但需要转换 vscode-webview:// 格式）
      if (relativePath.startsWith('http://') || 
          relativePath.startsWith('https://') ||
          relativePath.startsWith('data:') ||
          relativePath.startsWith('blob:')) {
        // 如果是 CDN 格式，直接返回
        if (relativePath.includes('vscode-resource.vscode-cdn.net')) {
          return relativePath;
        }
        // 如果是 vscode-webview:// 格式，转换为 CDN 格式
        if (relativePath.includes('vscode-webview://')) {
          return convertToCdnFormat(relativePath);
        }
        return relativePath;
      }
      
      // 规范化路径（去掉开头的 ./ 或 /）
      let normalizedPath = relativePath;
      if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2);
      } else if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1);
      }
      
      const uri = vscode.Uri.joinPath(archimateJsUri, normalizedPath);
      const webviewUriString = webview.asWebviewUri(uri).toString();
      
      // 统一转换为 CDN 格式
      return convertToCdnFormat(webviewUriString);
    };
    
    // 将 vscode-webview:// 格式转换为 CDN 格式的辅助函数
    const convertToCdnFormat = (url: string): string => {
      if (!url || !url.includes('vscode-webview://')) {
        return url;
      }
      
      // 提取路径部分：vscode-webview://xxx/path/to/file
      const match = url.match(/vscode-webview:\/\/[^/]+\/(.+)$/);
      if (match && match[1]) {
        const filePath = match[1];
        // 直接使用文件系统路径构建 CDN 格式 URL
        return 'https://file+.vscode-resource.vscode-cdn.net' + archimateJsPath + '/' + filePath;
      }
      
      return url;
    };
    
    // 1. 替换 CSS 文件路径（参考 mermaid-editor 的实现）
    // 注意：CSS 中的 url() 路径由运行时脚本修复（在 ArchimateEditorApp.js 中）
    htmlContent = htmlContent.replace(
      /<link[^>]*href=["']([^"']+)["'][^>]*>/gi,
      (match, href) => {
        // 如果是 vscode-webview:// 格式，转换为 CDN 格式
        if (href.includes('vscode-webview://')) {
          return match.replace(href, convertToCdnFormat(href));
        }
        // 如果已经是 CDN 格式或其他绝对路径，保持不变
        if (href.startsWith('http://') || 
            href.startsWith('https://') || 
            href.startsWith('data:') ||
            href.startsWith('blob:') ||
            href.includes('vscode-resource.vscode-cdn.net')) {
          return match;
        }
        // 相对路径，使用 webviewUri 转换
        return match.replace(href, webviewUri(href));
      }
    );
    
    // 2. 替换所有 script 标签中的 JS 文件路径（参考 mermaid-editor 的实现）
    htmlContent = htmlContent.replace(
      /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
      (match, src) => {
        // 如果是 vscode-webview:// 格式，转换为 CDN 格式
        if (src.includes('vscode-webview://')) {
          return match.replace(src, convertToCdnFormat(src));
        }
        // 如果已经是 CDN 格式或其他绝对路径，保持不变
        if (src.startsWith('http://') || 
            src.startsWith('https://') || 
            src.startsWith('data:') ||
            src.startsWith('blob:') ||
            src.includes('vscode-resource.vscode-cdn.net')) {
          return match;
        }
        // 相对路径，使用 webviewUri 转换
        return match.replace(src, webviewUri(src));
      }
    );
    
    // 3. 替换其他资源文件（如图片、字体等，参考 mermaid-editor 的实现）
    htmlContent = htmlContent.replace(
      /(src|href)=["']([^"']+\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico))["']/gi,
      (match, attr, resourcePath) => {
        // 如果是 vscode-webview:// 格式，转换为 CDN 格式
        if (resourcePath.includes('vscode-webview://')) {
          return `${attr}="${convertToCdnFormat(resourcePath)}"`;
        }
        // 如果已经是 CDN 格式或其他绝对路径，保持不变
        if (resourcePath.startsWith('http://') || 
            resourcePath.startsWith('https://') || 
            resourcePath.startsWith('data:') ||
            resourcePath.startsWith('blob:') ||
            resourcePath.includes('vscode-resource.vscode-cdn.net')) {
          return match;
        }
        // 相对路径，使用 webviewUri 转换
        return `${attr}="${webviewUri(resourcePath)}"`;
      }
    );
    
    // 4. 替换所有剩余的 vscode-webview:// 格式（包括非标准资源）
    htmlContent = htmlContent.replace(
      /vscode-webview:\/\/[^"'\s]+/g,
      (match) => {
        return convertToCdnFormat(match);
      }
    );
    
    // 注入 basePath 到全局变量，供运行时脚本使用（统一使用 CDN 格式）
    // 直接使用文件系统路径构建 CDN 格式 URL，确保可访问
    // 格式：https://file+.vscode-resource.vscode-cdn.net/绝对路径
    const cdnBasePath = 'https://file+.vscode-resource.vscode-cdn.net' + archimateJsPath + '/';
    
    // 注入 basePath 到页面，供运行时脚本使用
    const basePathScript = `
    <script>
      // 设置全局 basePath（使用 CDN 格式，确保可访问）
      window.__ARCHIMATE_EDITOR_BASE_PATH__ = '${cdnBasePath}';
      console.log('[ArchimateEditor] Base path (CDN format):', window.__ARCHIMATE_EDITOR_BASE_PATH__);
    </script>
    `;
    htmlContent = htmlContent.replace('</head>', basePathScript + '</head>');
    
    return htmlContent;
  }


}

