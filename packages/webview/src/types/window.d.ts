/**
 * 全局 Window 类型扩展
 * 用于定义 webview 环境中的全局变量
 */
declare global {
  interface Window {
    initialData?: {
      view?: string;
      [key: string]: any;
    };
    acquireVsCodeApi?: () => any;
    vscode?: any;
  }
}

export {};

