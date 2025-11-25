import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { mermaidToDiagramData, diagramDataToMermaid, DiagramData, Point } from './mermaidConverter';

// API 消息类型定义（与 packages/mermaid-editor/lib/types.ts 保持一致）
interface LayoutUpdate {
  nodes?: Record<string, Point | null>;
  edges?: Record<string, { points?: Point[] | null }>;
}

/**
 * Mermaid 编辑器提供者
 * 支持 .mmd 文件的可视化拖拽编辑（基于 oxdraw 前端）
 */
export class MermaidEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'architool.mermaidEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 注册编辑器提供者
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MermaidEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      MermaidEditorProvider.viewType,
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
    const extensionPath = this.context.extensionPath;
    const mermaidEditorPath = path.join(extensionPath, 'mermaid-editor');
    const mermaidEditorUri = vscode.Uri.file(mermaidEditorPath);
    
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        mermaidEditorUri,
      ],
      // 禁用 Trusted Types 以允许内联脚本（Next.js 需要）
      enableCommandUris: false,
    };

    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      document,
      this.context.extensionUri
    );

    // 处理来自 Webview 的消息
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (e) => {
        // 处理 API 请求（来自 api.ts 的 VSCode 适配）
        if (e.type && e.type.startsWith('api-') && e.messageId) {
          const apiType = e.type.substring(4); // 去掉 'api-' 前缀
          const messageId = e.messageId;
          const payload = e.payload;

          try {
            let result: unknown = undefined;
            let shouldUpdateDocument = false;

            switch (apiType) {
              case 'fetchDiagram': {
                console.log('[MermaidEditor] Handling api-fetchDiagram request');
                const source = document.getText();
                result = mermaidToDiagramData(source, document.uri.fsPath);
                console.log('[MermaidEditor] Generated diagram data:', {
                  nodes: (result as DiagramData).nodes.length,
                  edges: (result as DiagramData).edges.length,
                });
                break;
              }

              case 'saveDiagram': {
                // 保存整个图表数据
                if (payload && typeof payload === 'object' && 'diagram' in payload) {
                  const diagram = payload.diagram as DiagramData;
                  const mermaidSource = diagramDataToMermaid(diagram);
                  const edit = new vscode.WorkspaceEdit();
                  edit.replace(
                    document.uri,
                    new vscode.Range(0, 0, document.lineCount, 0),
                    mermaidSource
                  );
                  await vscode.workspace.applyEdit(edit);
                  await document.save();
                  shouldUpdateDocument = true;
                }
                break;
              }

              case 'updateLayout': {
                // 布局更新需要重新生成图表并保存
                const source = document.getText();
                const diagram = mermaidToDiagramData(source, document.uri.fsPath);
                // 应用布局更新
                if (payload && typeof payload === 'object') {
                  const update = payload as LayoutUpdate;
                  if (update.nodes) {
                    for (const [nodeId, position] of Object.entries(update.nodes)) {
                      const node = diagram.nodes.find(n => n.id === nodeId);
                      if (node && position) {
                        node.overridePosition = position;
                        node.renderedPosition = position;
                      } else if (node && position === null) {
                        node.overridePosition = undefined;
                        node.renderedPosition = node.autoPosition;
                      }
                    }
                  }
                  if (update.edges) {
                    for (const [edgeId, edgeUpdate] of Object.entries(update.edges)) {
                      const edge = diagram.edges.find(e => e.id === edgeId);
                      if (edge && edgeUpdate) {
                        if (edgeUpdate.points) {
                          edge.overridePoints = edgeUpdate.points;
                          edge.renderedPoints = edgeUpdate.points;
                        } else if (edgeUpdate.points === null) {
                          edge.overridePoints = undefined;
                          edge.renderedPoints = edge.autoPoints;
                        }
                      }
                    }
                  }
                }
                const mermaidSource = diagramDataToMermaid(diagram);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(
                  document.uri,
                  new vscode.Range(0, 0, document.lineCount, 0),
                  mermaidSource
                );
                await vscode.workspace.applyEdit(edit);
                await document.save();
                shouldUpdateDocument = true;
                break;
              }

              case 'updateSource': {
                if (payload && typeof payload === 'object' && 'source' in payload) {
                  const source = payload.source as string;
                  const edit = new vscode.WorkspaceEdit();
                  edit.replace(
                    document.uri,
                    new vscode.Range(0, 0, document.lineCount, 0),
                    source
                  );
                  await vscode.workspace.applyEdit(edit);
                  await document.save();
                  shouldUpdateDocument = true;
                }
                break;
              }

              case 'updateStyle': {
                // 样式更新需要重新生成图表并保存
                const source = document.getText();
                const diagram = mermaidToDiagramData(source, document.uri.fsPath);
                // 应用样式更新（这里简化处理，实际应该更新 diagram 中的样式信息）
                // 注意：Mermaid 的样式通常通过 CSS 或注释来设置，这里可能需要更复杂的处理
                const mermaidSource = diagramDataToMermaid(diagram);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(
                  document.uri,
                  new vscode.Range(0, 0, document.lineCount, 0),
                  mermaidSource
                );
                await vscode.workspace.applyEdit(edit);
                await document.save();
                shouldUpdateDocument = true;
                break;
              }

              case 'deleteNode': {
                if (payload && typeof payload === 'object' && 'nodeId' in payload) {
                  const nodeId = payload.nodeId as string;
                  const source = document.getText();
                  const diagram = mermaidToDiagramData(source, document.uri.fsPath);
                  // 删除节点
                  diagram.nodes = diagram.nodes.filter(n => n.id !== nodeId);
                  diagram.edges = diagram.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
                  const mermaidSource = diagramDataToMermaid(diagram);
                  const edit = new vscode.WorkspaceEdit();
                  edit.replace(
                    document.uri,
                    new vscode.Range(0, 0, document.lineCount, 0),
                    mermaidSource
                  );
                  await vscode.workspace.applyEdit(edit);
                  await document.save();
                  shouldUpdateDocument = true;
                }
                break;
              }

              case 'deleteEdge': {
                if (payload && typeof payload === 'object' && 'edgeId' in payload) {
                  const edgeId = payload.edgeId as string;
                  const source = document.getText();
                  const diagram = mermaidToDiagramData(source, document.uri.fsPath);
                  // 删除边
                  diagram.edges = diagram.edges.filter(e => e.id !== edgeId);
                  const mermaidSource = diagramDataToMermaid(diagram);
                  const edit = new vscode.WorkspaceEdit();
                  edit.replace(
                    document.uri,
                    new vscode.Range(0, 0, document.lineCount, 0),
                    mermaidSource
                  );
                  await vscode.workspace.applyEdit(edit);
                  await document.save();
                  shouldUpdateDocument = true;
                }
                break;
              }

              case 'updateNodeImage': {
                // 节点图片更新（Mermaid 本身不支持图片，这里可能需要扩展语法）
                // 暂时只保存，不做特殊处理
                break;
              }

              default:
                throw new Error(`Unknown API type: ${apiType}`);
            }

            // 发送成功响应
            console.log(`[MermaidEditor] Sending API response for ${apiType} (messageId: ${messageId})`);
            webviewPanel.webview.postMessage({
              messageId,
              result,
            });

            // 如果文档已更新，发送新的图表数据
            if (shouldUpdateDocument) {
              const updatedSource = document.getText();
              const updatedDiagram = mermaidToDiagramData(updatedSource, document.uri.fsPath);
              webviewPanel.webview.postMessage({
                type: 'load',
                diagram: updatedDiagram,
              });
            }
          } catch (error) {
            // 发送错误响应（类似 HTTP 错误响应）
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStatus = (error as any)?.status || 500;
            const errorStatusText = (error as any)?.statusText || 'Internal Server Error';
            console.error(`[MermaidEditor] API error for ${apiType} (messageId: ${messageId}):`, errorMessage, `(${errorStatus} ${errorStatusText})`);
            webviewPanel.webview.postMessage({
              messageId,
              error: errorMessage,
              status: errorStatus,
              statusText: errorStatusText,
            });
          }
          return;
        }

        // 处理原有的消息类型
        switch (e.type) {
          case 'load-request':
            // Webview 请求加载图表数据
            console.log('[MermaidEditor] Received load-request from webview');
            const source = document.getText();
            const diagram = mermaidToDiagramData(source, document.uri.fsPath);
            console.log('[MermaidEditor] Sending load-response with diagram:', {
              nodes: diagram.nodes.length,
              edges: diagram.edges.length,
              sourceLength: diagram.source.length,
            });
            webviewPanel.webview.postMessage({
              type: 'load-response',
              diagram,
            });
            break;

          case 'save':
            // 保存完整的图表数据
            if (e.diagram) {
              const diagram = e.diagram as DiagramData;
              const mermaidSource = diagramDataToMermaid(diagram);
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                mermaidSource
              );
              const success = await vscode.workspace.applyEdit(edit);
              if (!success) {
                vscode.window.showErrorMessage('Failed to save document');
              } else {
                await document.save();
              }
            } else if (e.content) {
              // 兼容旧的保存方式（直接保存内容）
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
            }
            break;

          case 'save-source':
            // 保存源代码
            if (e.source) {
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                e.source
              );
              const success = await vscode.workspace.applyEdit(edit);
              if (!success) {
                vscode.window.showErrorMessage('Failed to save document');
              } else {
                await document.save();
              }
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
          const source = e.document.getText();
          const diagram = mermaidToDiagramData(source, document.uri.fsPath);
          webviewPanel.webview.postMessage({
            type: 'load',
            diagram,
          });
        }
      }
    );

    // 清理订阅
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeDocumentSubscription2.dispose();
    });

    // 发送初始内容的函数
    const sendInitialContent = () => {
      const source = document.getText();
      const diagram = mermaidToDiagramData(source, document.uri.fsPath);
      console.log('[MermaidEditor] Sending initial load message with diagram:', {
        nodes: diagram.nodes.length,
        edges: diagram.edges.length,
        sourceLength: diagram.source.length,
      });
      webviewPanel.webview.postMessage({
        type: 'load',
        diagram,
      });
    };

    // 监听 webview 可见性变化，确保在 webview 可见时发送消息
    webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        console.log('[MermaidEditor] Webview became visible, sending initial content');
        // 延迟发送，确保 React 应用已加载
        setTimeout(sendInitialContent, 500);
      }
    });

    // 等待 webview 加载完成后发送初始内容
    // 使用多个延迟确保 React 应用完全初始化
    setTimeout(sendInitialContent, 500);
    setTimeout(sendInitialContent, 1500);
    setTimeout(sendInitialContent, 3000);
  }

  /**
   * 获取 Webview HTML 内容
   */
  private getWebviewContent(
    webview: vscode.Webview,
    document: vscode.TextDocument,
    extensionUri: vscode.Uri
  ): string {
    // 获取 mermaid-editor 的路径
    const extensionPath = this.context.extensionPath;
    const mermaidEditorPath = path.join(extensionPath, 'mermaid-editor');
    // 使用 V2 版本的 index-v2.html
    const indexHtmlPath = path.join(mermaidEditorPath, 'index-v2.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(indexHtmlPath)) {
      // 提供更详细的错误信息
      const possiblePaths = [
        indexHtmlPath,
        path.join(extensionPath, 'mermaid-editor', 'app', 'index-v2.html'),
      ];
      
      const errorMessage = `Mermaid editor V2 build artifacts not found.
Expected path: ${indexHtmlPath}
Extension path: ${extensionPath}
Checked paths:
${possiblePaths.map(p => `  - ${p} (exists: ${fs.existsSync(p)})`).join('\n')}

Please run: pnpm run build:mermaid-editor (or npm run build:v2 in packages/mermaid-editor)`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数
    // Next.js 输出的路径格式：/_next/static/xxx
    const mermaidEditorUri = vscode.Uri.file(mermaidEditorPath);
    const webviewUri = (relativePath: string) => {
      // 跳过已经是 webview URI 或 blob URL 的路径
      if (relativePath.startsWith('vscode-webview://') || 
          relativePath.startsWith('blob:') ||
          relativePath.startsWith('data:')) {
        return relativePath;
      }
      
      // 处理 Next.js 的路径格式：
      // /_next/static/xxx -> _next/static/xxx (去掉开头的 /)
      // /favicon.ico -> favicon.ico
      // ./xxx -> xxx
      let normalizedPath = relativePath;
      if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1); // 去掉开头的 /
      } else if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2); // 去掉 ./
      }
      
      // 检查文件是否存在
      const fullPath = path.join(mermaidEditorPath, normalizedPath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`[MermaidEditor] Resource not found: ${normalizedPath}, full path: ${fullPath}`);
        // 仍然尝试转换，可能文件在子目录中
      }
      
      const uri = vscode.Uri.joinPath(mermaidEditorUri, normalizedPath);
      return webview.asWebviewUri(uri).toString();
    };
    
    // 替换所有资源文件的路径为 webview URI
    // Next.js 输出的路径格式：/_next/static/chunks/xxx.js
    
    // 1. 替换 CSS 文件路径
    htmlContent = htmlContent.replace(
      /<link[^>]*href=["']([^"']+)["'][^>]*>/gi,
      (match, href) => {
        if (href.startsWith('http://') || 
            href.startsWith('https://') || 
            href.startsWith('data:') ||
            href.startsWith('blob:') ||
            href.startsWith('vscode-webview://')) {
          return match;
        }
        return match.replace(href, webviewUri(href));
      }
    );
    
    // 2. 替换所有 script 标签中的 JS 文件路径
    htmlContent = htmlContent.replace(
      /<script[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi,
      (match, src) => {
        if (src.startsWith('http://') || 
            src.startsWith('https://') || 
            src.startsWith('data:') ||
            src.startsWith('blob:') ||
            src.startsWith('vscode-webview://')) {
          return match;
        }
        // 保持原有属性
        return match.replace(src, webviewUri(src));
      }
    );
    
    // 3. 替换 preload 链接
    htmlContent = htmlContent.replace(
      /<link[^>]*href=["']([^"']+)["'][^>]*as=["'](script|style|font|image)["'][^>]*>/gi,
      (match, href) => {
        if (href.startsWith('http://') || 
            href.startsWith('https://') || 
            href.startsWith('data:') ||
            href.startsWith('blob:') ||
            href.startsWith('vscode-webview://')) {
          return match;
        }
        return match.replace(href, webviewUri(href));
      }
    );
    
    // 4. 替换其他资源文件（如图片、字体等）
    htmlContent = htmlContent.replace(
      /(src|href)=["']([^"']+\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico))["']/gi,
      (match, attr, resourcePath) => {
        if (resourcePath.startsWith('http://') || 
            resourcePath.startsWith('https://') || 
            resourcePath.startsWith('data:') ||
            resourcePath.startsWith('blob:') ||
            resourcePath.startsWith('vscode-webview://')) {
          return match;
        }
        return `${attr}="${webviewUri(resourcePath)}"`;
      }
    );
    
    // 5. 处理内联脚本中可能出现的动态导入路径（如 import() 语句）
    // Next.js 可能会在运行时动态加载代码块，这些路径也需要转换
    // 注意：这只能处理静态字符串，动态生成的路径需要在运行时处理
    
    // 5. 处理内联脚本（Next.js 的内联脚本）
    // VS Code webview 支持内联脚本，但需要确保内容正确
    // 注意：Next.js 的内联脚本是必需的，用于初始化应用
    // 我们不需要修改它们，VS Code webview 应该能够执行
    
    // 6. 注入初始内容和 VS Code API
    // 注意：acquireVsCodeApi() 只能调用一次，所以在这里调用
    // 将脚本注入到第一个 script 标签之前，确保在 Next.js 脚本之前执行
    const source = document.getText();
    const mermaidEditorBasePath = webview.asWebviewUri(mermaidEditorUri).toString();
    const initialContentScript = `<script>
(function() {
    try {
        window.initialContent = ${JSON.stringify(source)};
        
        // 路径转换辅助函数（用于运行时动态导入）
        // Next.js 使用 webpack 进行代码分割，需要拦截动态导入的路径
        const basePath = '${mermaidEditorBasePath}';
        
        // 拦截 fetch/XMLHttpRequest 以处理动态导入的资源
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string') {
                // 如果是相对路径且不是已转换的路径，进行转换
                if (!input.startsWith('http://') && 
                    !input.startsWith('https://') && 
                    !input.startsWith('vscode-webview://') && 
                    !input.startsWith('blob:') && 
                    !input.startsWith('data:')) {
                    let normalizedPath = input;
                    if (normalizedPath.startsWith('/')) {
                        normalizedPath = normalizedPath.substring(1);
                    } else if (normalizedPath.startsWith('./')) {
                        normalizedPath = normalizedPath.substring(2);
                    }
                    input = basePath + '/' + normalizedPath;
                }
            }
            return originalFetch.call(this, input, init);
        };
        
        // 拦截 Next.js 的 __webpack_require__.p (publicPath)
        if (typeof window.__webpack_require__ !== 'undefined' && window.__webpack_require__.p) {
            const originalPublicPath = window.__webpack_require__.p;
            Object.defineProperty(window.__webpack_require__, 'p', {
                get: function() {
                    return basePath + '/';
                },
                configurable: true
            });
        }
        
        if (typeof acquireVsCodeApi !== 'undefined') {
            window.vscode = acquireVsCodeApi();
            window.isVSCodeWebview = true;
            console.log('[MermaidEditor] VS Code API initialized');
            
            // 监听来自扩展的消息
            window.addEventListener('message', function(event) {
                console.log('[MermaidEditor] Received message in inline script:', event.data);
                if (event.data && event.data.type === 'load' && event.data.diagram) {
                    // 如果 React 应用还没有加载，将数据存储在 window 上
                    window.pendingDiagram = event.data.diagram;
                    console.log('[MermaidEditor] Stored pending diagram data');
                }
            });
            
            // 请求初始数据
            setTimeout(function() {
                if (window.vscode) {
                    console.log('[MermaidEditor] Requesting initial data from inline script');
                    window.vscode.postMessage({ type: 'load-request' });
                }
            }, 100);
            
            // 添加全局错误处理器来捕获 React 加载错误
            window.addEventListener('error', function(event) {
                console.error('[MermaidEditor] Global error:', event.error, event.message, event.filename, event.lineno);
            });
            
            window.addEventListener('unhandledrejection', function(event) {
                console.error('[MermaidEditor] Unhandled promise rejection:', event.reason);
            });
            
            // 检查 React 是否加载（延迟检查，给 React 时间加载）
            setTimeout(function() {
                console.log('[MermaidEditor] Checking if React app loaded...');
                console.log('[MermaidEditor] window.pendingDiagram:', !!window.pendingDiagram);
                console.log('[MermaidEditor] document.querySelector(".app"):', !!document.querySelector('.app'));
                console.log('[MermaidEditor] document.querySelector("main"):', !!document.querySelector('main'));
                console.log('[MermaidEditor] All script tags:', document.querySelectorAll('script').length);
                // 如果 React 还没有加载，尝试触发一个事件
                if (!document.querySelector('.app') || !document.querySelector('main')) {
                    console.warn('[MermaidEditor] React app may not have loaded yet');
                    // 尝试手动触发 React 加载
                    const scripts = document.querySelectorAll('script[src]');
                    console.log('[MermaidEditor] Found', scripts.length, 'script tags with src');
                    scripts.forEach(function(script, index) {
                        console.log('[MermaidEditor] Script', index, ':', script.getAttribute('src'));
                    });
                } else {
                    console.log('[MermaidEditor] React app appears to be loaded');
                }
            }, 2000);
        } else {
            console.warn('[MermaidEditor] acquireVsCodeApi is not available');
        }
    } catch (e) {
        console.error('[MermaidEditor] Failed to initialize VS Code API:', e);
    }
})();
</script>`;
    
    // 在第一个 <script> 标签之前注入（在 </head> 之前）
    const firstScriptMatch = htmlContent.match(/<script[^>]*>/i);
    if (firstScriptMatch) {
      htmlContent = htmlContent.replace(firstScriptMatch[0], `${initialContentScript}\n${firstScriptMatch[0]}`);
    } else {
      // 如果没有找到 script 标签，在 </head> 之前注入
      htmlContent = htmlContent.replace('</head>', `${initialContentScript}\n</head>`);
    }
    
    return htmlContent;
  }
}

