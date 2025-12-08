/**
 * VSCode API Adapter for PlantUML Editor
 * 适配 PlantUML 编辑器的通信方式到 ExtensionService
 */
import { extensionService } from '../../services/ExtensionService';

// 消息类型定义
type MessageType = 'load-request' | 'render' | 'save';

// 检测是否在 VSCode webview 环境中
export const isVSCodeWebview = typeof window !== 'undefined' && 
  (typeof (window as any).acquireVsCodeApi === 'function' || (window as any).vscode);

// 适配 postMessage（异步调用）
export async function postMessage(type: MessageType, payload?: any): Promise<void> {
  if (!isVSCodeWebview) {
    console.warn('[vscodeApiAdapter] Not in VSCode webview environment');
    return;
  }

  try {
    switch (type) {
      case 'load-request':
        // load-request 不需要等待响应，后端会通过事件推送
        await extensionService.call('loadPlantUML');
        break;
      case 'render':
        // render 不需要等待响应，后端会通过事件推送结果
        await extensionService.call('renderPlantUML', { source: payload?.source });
        break;
      case 'save':
        // save 不需要等待响应，后端会通过事件推送结果
        await extensionService.call('savePlantUML', { source: payload?.source });
        break;
      default:
        console.warn(`[vscodeApiAdapter] Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error(`[vscodeApiAdapter] Error sending message ${type}:`, error);
  }
}

// 设置全局回调函数（用于接收后端推送的消息）
// ExtensionService 通过 on() 方法监听事件，事件名对应后端的 method
export function setupMessageHandlers(callbacks: {
  onSourceLoad?: (source: string) => void;
  onRenderResult?: (svg: string) => void;
  onRenderError?: (error: string) => void;
  onSaveSuccess?: () => void;
}) {
  // 监听后端推送的 load 事件（method: 'load'）
  extensionService.on('load', (data: { source: string }) => {
    callbacks.onSourceLoad?.(data.source);
  });
  
  // 监听后端推送的 render-result 事件（method: 'render-result'）
  extensionService.on('render-result', (data: { svg: string }) => {
    callbacks.onRenderResult?.(data.svg);
  });
  
  // 监听后端推送的 render-error 事件（method: 'render-error'）
  extensionService.on('render-error', (data: { error: string }) => {
    callbacks.onRenderError?.(data.error);
  });
  
  // 监听后端推送的 save-success 事件（method: 'save-success'）
  extensionService.on('save-success', () => {
    callbacks.onSaveSuccess?.();
  });
}

