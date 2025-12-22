/**
 * VSCode API Adapter
 * 适配 mermaid-editor 的通信方式到 ExtensionService
 */
import { extensionService } from '@/services/ExtensionService';

// 检测是否在 VSCode webview 环境中
export const isVSCodeWebview = typeof window !== 'undefined' && 
  (typeof (window as any).acquireVsCodeApi === 'function' || (window as any).vscode);

// 导出 vscode（不再直接使用，通过 ExtensionService）
export const vscode = null;

/**
 * 获取图表数据（保留用于兼容性，用于交互功能）
 */
export async function fetchDiagram() {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  try {
    const result = await extensionService.call('fetchDiagram');
    return result;
  } catch (error) {
    console.error('[vscodeApiAdapter] fetchDiagram error:', error);
    throw error;
  }
}

/**
 * 请求加载 Mermaid 源码
 */
export async function loadMermaid(): Promise<void> {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  try {
    await extensionService.call('loadMermaid');
  } catch (error) {
    console.error('[vscodeApiAdapter] loadMermaid error:', error);
    throw error;
  }
}

/**
 * 请求渲染 Mermaid（前端渲染，这里只用于通知）
 */
export async function renderMermaid(source: string): Promise<void> {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  try {
    await extensionService.call('renderMermaid', { source });
  } catch (error) {
    console.error('[vscodeApiAdapter] renderMermaid error:', error);
    throw error;
  }
}

/**
 * 保存图表数据
 */
export async function saveDiagram(diagram: any) {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  try {
    const result = await extensionService.call('saveDiagram', { diagram });
    return result;
  } catch (error) {
    console.error('[vscodeApiAdapter] saveDiagram error:', error);
    throw error;
  }
}

/**
 * 为了兼容性，保留这些函数（占位）
 */
export async function updateLayout(_update: any) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function updateSource(_source: string) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function updateStyle(_update: any) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function deleteNode(_nodeId: string) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function deleteEdge(_edgeId: string) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function updateNodeImage(_nodeId: string, _payload: any) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}


