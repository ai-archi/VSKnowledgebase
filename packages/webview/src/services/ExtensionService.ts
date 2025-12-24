/**
 * Extension Service
 * 提供与 IDE Extension 后端通信的功能
 */

import { IDECommunication } from './ide-communication';
import { createIDECommunication } from './ide-communication-factory';

export interface ExtensionMessage {
  method: string;
  params?: any;
  id?: string | number;
}

export interface ExtensionResponse {
  id?: string | number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Extension Service
 * 用于 Webview 与 IDE Extension 后端通信
 */
export class ExtensionService {
  private ideComm: IDECommunication;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (value: any) => void; reject: (error: any) => void }> = new Map();
  private unsubscribeMessage?: () => void;

  constructor() {
    // 自动检测 IDE 类型并创建相应的通信实例
    this.ideComm = createIDECommunication();

    // 监听来自 IDE 的消息
    this.unsubscribeMessage = this.ideComm.onMessage((message: ExtensionResponse) => {
      this.handleMessage(message);
    });
  }

  /**
   * 调用后端方法
   */
  async call<T = any>(method: string, params?: any): Promise<T> {
    if (!this.ideComm.isAvailable()) {
      throw new Error(`${this.ideComm.getIDEType()} API not available`);
    }

    const id = ++this.requestId;
    const message: ExtensionMessage = {
      method,
      params,
      id,
    };

    // 添加前端调试日志
    console.log('[ExtensionService] Sending message:', { method, params, id, ideType: this.ideComm.getIDEType() });

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      // 发送消息到 Extension
      console.log('[ExtensionService] postMessage called with:', message);
      this.ideComm.postMessage(message);

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
    if (message.id !== undefined) {
      const id = typeof message.id === 'string' ? parseInt(message.id, 10) : message.id;
      if (!isNaN(id) && this.pendingRequests.has(id)) {
        const { resolve, reject } = this.pendingRequests.get(id)!;
        this.pendingRequests.delete(id);

        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }
        return;
      }
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

