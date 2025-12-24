/**
 * 全局 Window 类型扩展
 * 用于定义 webview 环境中的全局变量
 * 
 * 注意：现在通过 ExtensionService 统一处理 IDE 通信，
 * 不再直接使用 acquireVsCodeApi 和 vscode
 */
declare global {
  interface Window {
    initialData?: {
      view?: string;
      [key: string]: any;
    };
    // 保留这些类型定义以支持向后兼容，但推荐使用 ExtensionService
    acquireVsCodeApi?: () => any;
    vscode?: any;
    // IntelliJ 支持（未来）
    idea?: any;
    intellij?: any;
  }
}

export {};

