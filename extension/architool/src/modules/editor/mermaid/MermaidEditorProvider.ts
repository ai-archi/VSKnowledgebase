import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { mermaidToDiagramData, diagramDataToMermaid, DiagramData, Point } from './mermaidConverter';
import { IDEAdapter } from '../../../core/ide-api/ide-adapter';
import { CustomTextEditorProvider, TextDocument, WebviewPanel, CancellationToken, Uri, WorkspaceEdit, Range, ViewColumn, WebviewOptions, Disposable } from '../../../core/ide-api/ide-types';
import { injectIDEAPIScript } from '../../../core/ide-api/webview-api-injector';

// API 消息类型定义
interface LayoutUpdate {
  nodes?: Record<string, Point | null>;
  edges?: Record<string, { points?: Point[] | null }>;
}

/**
 * Mermaid 编辑器提供者
 * 支持 .mmd 文件的可视化拖拽编辑（基于 oxdraw 前端）
 */
export class MermaidEditorProvider implements CustomTextEditorProvider {
  public static readonly viewType = 'architool.mermaidEditor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly ideAdapter: IDEAdapter
  ) {}

  /**
   * 注册编辑器提供者
   */
  public static register(context: vscode.ExtensionContext, ideAdapter: IDEAdapter): Disposable {
    const provider = new MermaidEditorProvider(context, ideAdapter);
    return ideAdapter.registerCustomEditorProvider(
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
    document: TextDocument,
    webviewPanel: WebviewPanel,
    token: CancellationToken
  ): Promise<void> {
    // 设置 Webview 内容
    const extensionPath = this.ideAdapter.getExtensionPath();
    const webviewPath = path.join(extensionPath, 'dist', 'webview');
    const webviewUri = this.ideAdapter.UriFile(webviewPath);
    
    const extensionUri = this.ideAdapter.getExtensionUri();
    const options: WebviewOptions = {
      enableScripts: true,
      localResourceRoots: [
        this.ideAdapter.UriJoinPath(extensionUri, 'dist'),
        webviewUri,
      ],
      enableCommandUris: false,
    };
    // 设置 webview 选项（必须在设置 HTML 之前）
    (webviewPanel.webview as any).options = options;

    (webviewPanel.webview as any).html = this.getWebviewContent(
      webviewPanel.webview as any,
      document as any,
      this.context.extensionUri as any
    );

    // 处理来自 Webview 的消息（使用 ExtensionService 格式）
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          // 使用 ExtensionService 的消息格式
          if (message.method === 'loadMermaid') {
            // 先发送响应（用于 call 方法的 Promise resolve）
            webviewPanel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: { success: true },
            });
            // 然后返回文档内容，通过事件推送（参考 PlantUML 的方式）
            webviewPanel.webview.postMessage({
              method: 'load',
              params: { source: document.getText() },
            });
          } else if (message.method === 'renderMermaid') {
            // 渲染 Mermaid（前端渲染，这里只返回源码用于验证）
            // 注意：Mermaid 渲染在前端进行，后端只负责提供源码
            const { source } = message.params || {};
            console.log('[MermaidEditor] Received renderMermaid request, source length:', source?.length || 0);
            // 先发送响应（用于 call 方法的 Promise resolve）
            webviewPanel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: { success: true },
            });
            if (source) {
              // 前端会自己渲染，这里只返回成功确认
              webviewPanel.webview.postMessage({
                method: 'render-result',
                params: { source: source }, // 返回源码，前端自己渲染
              });
            }
          } else if (message.method === 'fetchDiagram') {
            // 保留用于兼容性，返回 diagram 数据（用于交互功能）
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
              const currentDocumentText = document.getText();
              
              console.log('[MermaidEditorProvider] saveDiagram: START', {
                sourceLength: mermaidSource?.length || 0,
                sourcePreview: mermaidSource?.substring(0, 50) || '',
                currentDocumentLength: currentDocumentText?.length || 0,
                currentDocumentPreview: currentDocumentText?.substring(0, 50) || '',
                documentUri: document.uri.toString(),
                timestamp: new Date().toISOString()
              });
              
              const edit = this.ideAdapter.createWorkspaceEdit();
              edit.replace(
                document.uri,
                this.ideAdapter.Range(0, 0, document.lineCount, 0),
                mermaidSource
              );
              await this.ideAdapter.applyEdit(edit);
              console.log('[MermaidEditorProvider] saveDiagram: edit applied');
              
              if ((document as any).save) {
                await (document as any).save();
              }
              console.log('[MermaidEditorProvider] saveDiagram: document saved');
              
              const savedDocumentText = document.getText();
              console.log('[MermaidEditorProvider] saveDiagram: after save, document length:', savedDocumentText?.length || 0);
              
              // 发送响应（用于 call 方法的 Promise resolve）
              webviewPanel.webview.postMessage({
                id: message.id,
                method: message.method,
                result: { success: true },
              });
              console.log('[MermaidEditorProvider] saveDiagram: success message sent');
              
              // 发送 save-success 事件（与 PlantUML 保持一致）
              // 前端可以监听此事件来更新状态
              webviewPanel.webview.postMessage({
                method: 'save-success',
              });
              console.log('[MermaidEditorProvider] saveDiagram: save-success event sent');
              
              // 不在这里发送 load 事件，让 onDidChangeTextDocument 自然触发
              // 这样可以避免保存后立即覆盖编辑器内容
              // 参考 PlantUML 的方式：保存后只发送 save-success，不发送 load
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
                  const edit = this.ideAdapter.createWorkspaceEdit();
                  edit.replace(
                    document.uri as any,
                    this.ideAdapter.Range(0, 0, document.lineCount, 0),
                    mermaidSource
                  );
                  await this.ideAdapter.applyEdit(edit);
                  if ((document as any).save) {
                await (document as any).save();
              }
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
                const edit = this.ideAdapter.createWorkspaceEdit();
                edit.replace(
                  document.uri as any,
                  this.ideAdapter.Range(0, 0, document.lineCount, 0),
                  mermaidSource
                );
                await this.ideAdapter.applyEdit(edit);
                if ((document as any).save) {
                await (document as any).save();
              }
                shouldUpdateDocument = true;
                break;
              }

              case 'updateSource': {
                if (payload && typeof payload === 'object' && 'source' in payload) {
                  const source = payload.source as string;
                  const edit = this.ideAdapter.createWorkspaceEdit();
                  edit.replace(
                    document.uri as any,
                    this.ideAdapter.Range(0, 0, document.lineCount, 0),
                    source
                  );
                  await this.ideAdapter.applyEdit(edit);
                  if ((document as any).save) {
                await (document as any).save();
              }
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
                const edit = this.ideAdapter.createWorkspaceEdit();
                edit.replace(
                  document.uri as any,
                  this.ideAdapter.Range(0, 0, document.lineCount, 0),
                  mermaidSource
                );
                await this.ideAdapter.applyEdit(edit);
                if ((document as any).save) {
                await (document as any).save();
              }
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
                  const edit = this.ideAdapter.createWorkspaceEdit();
                  edit.replace(
                    document.uri as any,
                    this.ideAdapter.Range(0, 0, document.lineCount, 0),
                    mermaidSource
                  );
                  await this.ideAdapter.applyEdit(edit);
                  if ((document as any).save) {
                await (document as any).save();
              }
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
                  const edit = this.ideAdapter.createWorkspaceEdit();
                  edit.replace(
                    document.uri as any,
                    this.ideAdapter.Range(0, 0, document.lineCount, 0),
                    mermaidSource
                  );
                  await this.ideAdapter.applyEdit(edit);
                  if ((document as any).save) {
                await (document as any).save();
              }
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
                const edit = this.ideAdapter.createWorkspaceEdit();
                edit.replace(
                  document.uri as any,
                  this.ideAdapter.Range(0, 0, document.lineCount, 0),
                  mermaidSource
                );
                const success = await this.ideAdapter.applyEdit(edit);
                if (!success) {
                  this.ideAdapter.showErrorMessage('Failed to save document');
                } else {
                  if ((document as any).save) {
                    await (document as any).save();
                  }
                }
              } else if ((message as any).content) {
                // 兼容旧的保存方式（直接保存内容）
                const edit = this.ideAdapter.createWorkspaceEdit();
                edit.replace(
                  document.uri as any,
                  this.ideAdapter.Range(0, 0, document.lineCount, 0),
                  (message as any).content
                );
                const success = await this.ideAdapter.applyEdit(edit);
                if (!success) {
                  this.ideAdapter.showErrorMessage('Failed to save document');
                } else {
                  if ((document as any).save) {
                    await (document as any).save();
                  }
                }
              }
              break;

            case 'save-source':
              // 保存源代码
              if ((message as any).source) {
                const edit = this.ideAdapter.createWorkspaceEdit();
                edit.replace(
                  document.uri as any,
                  this.ideAdapter.Range(0, 0, document.lineCount, 0),
                  (message as any).source
                );
                const success = await this.ideAdapter.applyEdit(edit);
                if (!success) {
                  this.ideAdapter.showErrorMessage('Failed to save document');
                } else {
                  if ((document as any).save) {
                    await (document as any).save();
                  }
                }
              }
              break;

            case 'error':
              this.ideAdapter.showErrorMessage(`Editor error: ${(message as any).message || 'Unknown error'}`);
              break;
          }
        }
      }
    );

    // 监听文档变更：发送加载消息（参考 PlantUML 的方式）
    const changeDocumentSubscription2 = this.ideAdapter.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          const source = e.document.getText();
          console.log('[MermaidEditorProvider] onDidChangeTextDocument: document changed', {
            sourceLength: source?.length || 0,
            sourcePreview: source?.substring(0, 50) || '',
            reason: e.reason?.toString() || 'unknown',
            documentUri: e.document.uri.toString(),
            timestamp: new Date().toISOString()
          });
          
          webviewPanel.webview.postMessage({
            method: 'load',
            params: { source: source },
          });
          console.log('[MermaidEditorProvider] onDidChangeTextDocument: load message sent');
        }
      }
    );

    // 清理订阅
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeDocumentSubscription2.dispose();
    });

    // 发送初始内容的函数（参考 PlantUML 的方式）
    const sendInitialContent = () => {
      webviewPanel.webview.postMessage({
        method: 'load',
        params: { source: document.getText() },
      });
    };

    // 监听 webview 可见性变化（参考 PlantUML 的方式）
    const viewStateSubscription = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        // webview 变为可见时，发送初始内容
        webviewPanel.webview.postMessage({
          method: 'load',
          params: { source: document.getText() },
        });
      }
    });

    // 清理订阅
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeDocumentSubscription2.dispose();
      viewStateSubscription.dispose();
    });

    // 发送初始内容（参考 PlantUML，只发送一次，延迟 200ms）
    setTimeout(sendInitialContent, 200);
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
    const mermaidEditorHtmlPath = path.join(webviewPath, 'index.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(mermaidEditorHtmlPath)) {
      const errorMessage = `Mermaid editor HTML not found: ${mermaidEditorHtmlPath}
Extension path: ${extensionPath}
Webview dist path: ${webviewPath}

Please run: cd packages/webview && pnpm build`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(mermaidEditorHtmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数（参考 PlantUML 的实现）
    const webviewUri = vscode.Uri.file(webviewPath);
    const webviewUriHelper = (relativePath: string) => {
      // 跳过已经是绝对路径的（如 CDN、data URI、vscode-webview://）
      if (
        relativePath.startsWith('http://') ||
        relativePath.startsWith('https://') ||
        relativePath.startsWith('data:') ||
        relativePath.startsWith('blob:') ||
        relativePath.startsWith('vscode-webview://')
      ) {
        return relativePath;
      }
      // 使用 vscode.Uri.joinPath 连接路径，然后转换为 webview URI
      const uri = vscode.Uri.joinPath(webviewUri, relativePath);
      return (webview as any).asWebviewUri(uri).toString();
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

    // 使用统一的 IDE API 注入工具（支持多 IDE）
    htmlContent = injectIDEAPIScript(htmlContent, 'vscode', {
      view: 'mermaid-editor',
    });

    return htmlContent;
  }
}
