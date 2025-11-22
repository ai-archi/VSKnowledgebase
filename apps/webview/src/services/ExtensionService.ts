/**
 * Extension Service
 * 提供与 VSCode Extension 后端通信的功能
 */

export interface ExtensionMessage {
  method: string;
  params?: any;
  id?: string;
}

export interface ExtensionResponse {
  id?: string;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Extension Service
 * 用于 Webview 与 VSCode Extension 后端通信
 */
export class ExtensionService {
  private vscode: any;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();

  constructor() {
    // 获取 VSCode API（在 Webview 环境中可用）
    this.vscode = (window as any).acquireVsCodeApi?.() || null;

    // 监听来自 Extension 的消息
    window.addEventListener('message', (event) => {
      const message: ExtensionResponse = event.data;
      this.handleMessage(message);
    });
  }

  /**
   * 调用后端方法
   */
  async call<T = any>(method: string, params?: any): Promise<T> {
    if (!this.vscode) {
      throw new Error('VSCode API not available');
    }

    const id = ++this.requestId;
    const message: ExtensionMessage = {
      method,
      params,
      id,
    };

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // 发送消息到 Extension
      this.vscode.postMessage(message);

      // 设置超时
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000); // 30 秒超时
    });
  }

  /**
   * 监听后端事件
   */
  on(event: string, handler: (data: any) => void): void {
    this.messageHandlers.set(event, handler);
  }

  /**
   * 取消监听
   */
  off(event: string): void {
    this.messageHandlers.delete(event);
  }

  /**
   * 处理来自 Extension 的消息
   */
  private handleMessage(message: ExtensionResponse): void {
    // 处理请求响应
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
      return;
    }

    // 处理事件
    if (message.method) {
      const handler = this.messageHandlers.get(message.method);
      if (handler) {
        handler(message.params);
      }
    }
  }
}

// 导出单例
export const extensionService = new ExtensionService();

