/**
 * 全局 Window 类型扩展
 * 用于定义 webview 环境中的全局变量
 */
interface WindowWithInitialData extends Window {
  initialData?: {
    view?: string;
    [key: string]: any;
  };
  acquireVsCodeApi?: () => any;
  vscode?: any;
}

declare const window: WindowWithInitialData;

