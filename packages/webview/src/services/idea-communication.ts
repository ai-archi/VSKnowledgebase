/**
 * IntelliJ 通信实现
 * 封装 IntelliJ Webview API，实现 IDECommunication 接口
 */

import { IDECommunication } from './ide-communication';

/**
 * IntelliJ 通信实现
 * 将 IntelliJ Webview API 适配到 IDECommunication 接口
 */
export class IntelliJCommunication implements IDECommunication {
  private ideaApi: any;

  constructor() {
    // IntelliJ 通过 JCEF 或 Swing 组件注入 API
    // 通常通过 window.idea 或 window.intellij 访问
    if ((window as any).idea) {
      this.ideaApi = (window as any).idea;
    } else if ((window as any).intellij) {
      this.ideaApi = (window as any).intellij;
    } else {
      this.ideaApi = null;
    }
  }

  postMessage(message: any): void {
    if (!this.ideaApi) {
      throw new Error('IntelliJ API not available');
    }
    // IntelliJ 使用不同的消息传递机制
    // 可能是通过 JCEF 的 postMessage 或自定义协议
    if (typeof this.ideaApi.postMessage === 'function') {
      this.ideaApi.postMessage(JSON.stringify(message));
    } else {
      throw new Error('IntelliJ postMessage not available');
    }
  }

  onMessage(callback: (message: any) => void): () => void {
    if (!this.ideaApi) {
      return () => {};
    }

    // IntelliJ 的消息监听机制
    const handler = (data: string) => {
      try {
        const message = JSON.parse(data);
        callback(message);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    if (typeof this.ideaApi.onMessage === 'function') {
      this.ideaApi.onMessage(handler);
      return () => {
        if (typeof this.ideaApi.offMessage === 'function') {
          this.ideaApi.offMessage(handler);
        }
      };
    }

    // 降级：使用 window.addEventListener
    window.addEventListener('message', (event) => {
      handler(event.data);
    });
    return () => window.removeEventListener('message', handler);
  }

  isAvailable(): boolean {
    return this.ideaApi !== null;
  }

  getIDEType(): 'vscode' | 'intellij' | 'unknown' {
    return 'intellij';
  }
}

