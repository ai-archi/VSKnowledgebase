import * as vscode from 'vscode';
import { Logger } from '../logger/Logger';

/**
 * Webview RPC 消息接口
 */
export interface WebviewMessage {
  method: string;
  params?: any;
  id?: number | string;
}

/**
 * Webview RPC 响应接口
 */
export interface WebviewResponse {
  id?: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Webview 适配器
 * 处理 Webview 与 Extension 后端的 RPC 通信
 */
export class WebviewAdapter {
  private webviewPanel: vscode.WebviewPanel | null = null;
  private messageHandlers: Map<string, (params: any) => Promise<any>> = new Map();
  private logger: Logger;
  private static globalInstance: WebviewAdapter | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
    // 设置为全局实例，以便从任何地方访问
    WebviewAdapter.globalInstance = this;
  }

  /**
   * 获取全局实例
   */
  static getGlobalInstance(): WebviewAdapter | null {
    return WebviewAdapter.globalInstance;
  }

  /**
   * 处理来自任何 webview 的消息（全局消息处理器）
   */
  static async handleGlobalMessage(webview: vscode.Webview, message: WebviewMessage): Promise<void> {
    const instance = WebviewAdapter.getGlobalInstance();
    if (instance) {
      await instance.handleMessage(webview, message);
    }
  }

  /**
   * 创建或获取 Webview Panel
   */
  createWebviewPanel(
    viewType: string,
    title: string,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.One
  ): vscode.WebviewPanel {
    if (this.webviewPanel) {
      this.webviewPanel.reveal(viewColumn);
      return this.webviewPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      viewType,
      title,
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      }
    );

    // 监听来自 Webview 的消息
    panel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        await this.handleMessage(panel.webview, message);
      },
      null,
      []
    );

    // 监听面板关闭事件
    panel.onDidDispose(() => {
      this.webviewPanel = null;
    });

    this.webviewPanel = panel;
    return panel;
  }

  /**
   * 注册 RPC 方法处理器
   */
  registerMethod(method: string, handler: (params: any) => Promise<any>): void {
    this.messageHandlers.set(method, handler);
  }

  /**
   * 取消注册方法处理器
   */
  unregisterMethod(method: string): void {
    this.messageHandlers.delete(method);
  }

  /**
   * 向 Webview 发送消息
   */
  postMessage(webview: vscode.Webview, message: WebviewResponse): void {
    webview.postMessage(message);
  }

  /**
   * 处理来自 Webview 的消息
   */
  async handleMessage(webview: vscode.Webview, message: WebviewMessage): Promise<void> {
    try {
      this.logger.info(`[WebviewAdapter] handleMessage called with method: ${message.method}`, { 
        id: message.id, 
        params: message.params,
        handlerCount: this.messageHandlers.size,
        registeredMethods: Array.from(this.messageHandlers.keys())
      });
      const handler = this.messageHandlers.get(message.method);
      if (!handler) {
        this.logger.warn(`[WebviewAdapter] No handler found for method: ${message.method}. Registered methods: ${Array.from(this.messageHandlers.keys()).join(', ')}`);
        this.postMessage(webview, {
          id: message.id,
          error: {
            code: -32601,
            message: `Method not found: ${message.method}`,
          },
        });
        return;
      }

      this.logger.debug(`Calling handler for method: ${message.method}`);
      const result = await handler(message.params);
      this.postMessage(webview, {
        id: message.id,
        result,
      });
    } catch (error: any) {
      this.logger.error(`Error handling message: ${message.method}`, error);
      this.postMessage(webview, {
        id: message.id,
        error: {
          code: -32603,
          message: error.message || 'Internal error',
        },
      });
    }
  }

  /**
   * 获取 Webview HTML 内容
   */
  getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, htmlContent: string): string {
    // 将相对路径转换为 Webview URI
    // 这里简化处理，实际应该处理资源文件路径
    return htmlContent;
  }
}

