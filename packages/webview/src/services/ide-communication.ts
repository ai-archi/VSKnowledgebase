/**
 * IDE 通信接口
 * 定义与 IDE 无关的统一通信接口，用于抽象不同 IDE 的 Webview 通信
 */

/**
 * IDE 通信接口
 * 提供统一的 Webview 与后端通信接口
 */
export interface IDECommunication {
  /**
   * 发送消息到后端
   * @param message 消息对象
   */
  postMessage(message: any): void;

  /**
   * 监听来自后端的消息
   * @param callback 消息回调函数
   * @returns 取消监听的函数
   */
  onMessage(callback: (message: any) => void): () => void;

  /**
   * 检测 IDE API 是否可用
   * @returns 是否可用
   */
  isAvailable(): boolean;

  /**
   * 获取 IDE 类型
   * @returns IDE 类型
   */
  getIDEType(): 'vscode' | 'intellij' | 'unknown';
}

