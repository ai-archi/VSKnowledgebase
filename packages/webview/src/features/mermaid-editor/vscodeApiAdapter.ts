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
 * 获取图表数据
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
export async function updateLayout(update: any) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function updateSource(source: string) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function updateStyle(update: any) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function deleteNode(nodeId: string) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function deleteEdge(edgeId: string) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}

export async function updateNodeImage(nodeId: string, payload: any) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  return Promise.resolve();
}


