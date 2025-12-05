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
    const webviewPath = path.join(extensionPath, 'dist', 'webview');
    const webviewUri = vscode.Uri.file(webviewPath);
    
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        webviewUri,
      ],
      enableCommandUris: false,
    };

    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      document,
      this.context.extensionUri
    );

    // 处理来自 Webview 的消息（使用 ExtensionService 格式）
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          // 使用 ExtensionService 的消息格式
          if (message.method === 'fetchDiagram') {
            const source = document.getText();
            const diagram = mermaidToDiagramData(source, document.uri.fsPath);
            console.log('[MermaidEditor] Generated diagram data:', {
              nodes: diagram.nodes.length,
              edges: diagram.edges.length,
            });
            
            webviewPanel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: diagram,
            });
          } else if (message.method === 'saveDiagram') {
            const { diagram } = message.params || {};
            if (diagram) {
              const mermaidSource = diagramDataToMermaid(diagram);
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                mermaidSource
              );
              await vscode.workspace.applyEdit(edit);
              await document.save();
              
              webviewPanel.webview.postMessage({
                id: message.id,
                method: message.method,
                result: { success: true },
              });
              
              // 发送更新后的图表数据
              const updatedSource = document.getText();
              const updatedDiagram = mermaidToDiagramData(updatedSource, document.uri.fsPath);
              webviewPanel.webview.postMessage({
                method: 'load',
                params: { diagram: updatedDiagram },
              });
            }
          }
        } catch (error) {
          console.error('Message handler error:', error);
          webviewPanel.webview.postMessage({
            id: message.id,
            error: {
              code: -1,
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });
        }
        
        // 兼容旧的消息格式（保留一段时间）
        if (message.type && message.type.startsWith('api-') && message.messageId) {
          const apiType = message.type.substring(4); // 去掉 'api-' 前缀
          const messageId = message.messageId;
          const payload = message.payload;

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

        // 处理原有的消息类型（兼容旧格式）
        if (message.type && !message.method) {
          switch (message.type) {
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
              if ((message as any).diagram) {
                const diagram = (message as any).diagram as DiagramData;
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
              } else if ((message as any).content) {
                // 兼容旧的保存方式（直接保存内容）
                const edit = new vscode.WorkspaceEdit();
                edit.replace(
                  document.uri,
                  new vscode.Range(0, 0, document.lineCount, 0),
                  (message as any).content
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
              if ((message as any).source) {
                const edit = new vscode.WorkspaceEdit();
                edit.replace(
                  document.uri,
                  new vscode.Range(0, 0, document.lineCount, 0),
                  (message as any).source
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
              vscode.window.showErrorMessage(`Editor error: ${(message as any).message || 'Unknown error'}`);
              break;
          }
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
            method: 'load',
            params: { diagram },
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
        method: 'load',
        params: { diagram },
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
    // 获取 webview 构建产物路径
    const extensionPath = this.context.extensionPath;
    const webviewPath = path.join(extensionPath, 'dist', 'webview');
    const mermaidEditorHtmlPath = path.join(webviewPath, 'mermaid-editor.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(mermaidEditorHtmlPath)) {
      const errorMessage = `Mermaid editor HTML not found: ${mermaidEditorHtmlPath}
Extension path: ${extensionPath}
Webview dist path: ${webviewPath}

Please run: cd apps/webview && pnpm build`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(mermaidEditorHtmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数
    const webviewUri = vscode.Uri.file(webviewPath);
    const webviewUriHelper = (relativePath: string) => {
      // 跳过已经是绝对路径的
      if (
        relativePath.startsWith('http://') ||
        relativePath.startsWith('https://') ||
        relativePath.startsWith('data:') ||
        relativePath.startsWith('blob:') ||
        relativePath.startsWith('vscode-webview://')
      ) {
        return relativePath;
      }

      // 规范化路径
      let normalizedPath = relativePath;
      if (normalizedPath.startsWith('./')) {
        normalizedPath = normalizedPath.substring(2);
      } else if (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1);
      }

      const resourceFile = path.join(webviewPath, normalizedPath);
      if (fs.existsSync(resourceFile)) {
        const resourceUri = webview.asWebviewUri(
          vscode.Uri.file(resourceFile)
        );
        return resourceUri.toString();
      }

      return relativePath;
    };

    // 替换所有资源文件的路径为 webview URI
    htmlContent = htmlContent.replace(
      /(src|href)=["']([^"']+)["']/g,
      (match: string, attr: string, resourcePath: string) => {
        if (
          resourcePath.match(/^(vscode-webview|https?|data|mailto|tel):/i)
        ) {
          return match;
        }
        return `${attr}="${webviewUriHelper(resourcePath)}"`;
      }
    );

    // 注入 VSCode API
    const vscodeScript = `
      <script>
        const vscode = acquireVsCodeApi();
        window.acquireVsCodeApi = () => vscode;
      </script>
    `;
    htmlContent = htmlContent.replace('</head>', `${vscodeScript}</head>`);

    return htmlContent;
  }
}

