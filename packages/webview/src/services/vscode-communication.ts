/**
 * VS Code 通信实现
 * 封装 VS Code Webview API，实现 IDECommunication 接口
 */

import { IDECommunication } from './ide-communication';

/**
 * VS Code 通信实现
 * 将 VS Code Webview API 适配到 IDECommunication 接口
 */
export class VSCodeCommunication implements IDECommunication {
  private vscode: any;

  constructor() {
    // 获取 VSCode API（在 Webview 环境中可用）
    if ((window as any).vscode) {
      this.vscode = (window as any).vscode;
    } else if (typeof (window as any).acquireVsCodeApi === 'function') {
      this.vscode = (window as any).acquireVsCodeApi();
      // 保存到 window 以便其他地方使用
      (window as any).vscode = this.vscode;
    } else {
      this.vscode = null;
    }
  }

  postMessage(message: any): void {
    if (!this.vscode) {
      throw new Error('VSCode API not available');
    }
    this.vscode.postMessage(message);
  }

  onMessage(callback: (message: any) => void): () => void {
    const handler = (event: MessageEvent) => {
      callback(event.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }

  isAvailable(): boolean {
    return this.vscode !== null;
  }

  getIDEType(): 'vscode' | 'intellij' | 'unknown' {
    return 'vscode';
  }
}

