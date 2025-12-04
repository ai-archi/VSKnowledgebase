// VSCode API adapter - converts fetch API calls to VSCode message passing

// 检测是否在 VSCode webview 环境中
let vscode = null;
let isVSCodeWebview = false;

if (typeof window !== 'undefined' && window.vscode) {
  vscode = window.vscode;
  isVSCodeWebview = true;
} else if (typeof acquireVsCodeApi !== 'undefined') {
  try {
    vscode = acquireVsCodeApi();
    isVSCodeWebview = !!vscode;
    if (typeof window !== 'undefined') {
      window.vscode = vscode;
    }
  } catch (e) {
    if (typeof window !== 'undefined' && window.vscode) {
      vscode = window.vscode;
      isVSCodeWebview = true;
    } else {
      console.warn('[vscodeApi] Failed to acquire VS Code API:', e);
    }
  }
}

// 消息 ID 生成器
let messageIdCounter = 0;
function generateMessageId() {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

// 等待消息响应的 Promise 映射
const pendingMessages = new Map();

// 监听来自扩展的消息
if (isVSCodeWebview) {
  window.addEventListener('message', (event) => {
    const data = event.data;
    
    // 处理 API 响应（带 messageId 的请求-响应消息）
    if (data.messageId && pendingMessages.has(data.messageId)) {
      const { resolve, reject } = pendingMessages.get(data.messageId);
      pendingMessages.delete(data.messageId);
      
      if (data.error) {
        const error = new Error(data.error);
        error.status = data.status || 500;
        error.statusText = data.statusText || 'Internal Server Error';
        reject(error);
      } else {
        resolve(data.result);
      }
      return;
    }
    
    // 处理 load 消息（ArchimateEditorProvider 发送）
    if (data.type === 'load' && data.content !== undefined) {
      console.log('[vscodeApi] Received load message, content length:', data.content ? data.content.length : 0);
      if (typeof window !== 'undefined') {
        window.pendingContent = data.content;
      }
      if (window.onArchimateLoad) {
        window.onArchimateLoad(data.content);
      }
    }
  });
}

/**
 * 获取 Archimate XML 内容
 */
export async function fetchDiagram() {
  if (!isVSCodeWebview) {
    // 开发模式：返回空内容
    return '';
  }
  
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId();
    pendingMessages.set(messageId, { resolve, reject });
    
    vscode.postMessage({
      type: 'api-fetchArchimate',
      messageId,
    });
    
    setTimeout(() => {
      if (pendingMessages.has(messageId)) {
        pendingMessages.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

/**
 * 保存 Archimate XML 内容
 */
export async function saveDiagram(content) {
  if (!isVSCodeWebview) {
    // 开发模式：只打印日志
    console.log('Save (dev mode):', content.substring(0, 100) + '...');
    return Promise.resolve();
  }
  
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId();
    pendingMessages.set(messageId, { resolve, reject });
    
    vscode.postMessage({
      type: 'api-saveArchimate',
      messageId,
      payload: { xml: content },
    });
    
    setTimeout(() => {
      if (pendingMessages.has(messageId)) {
        pendingMessages.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

// 导出 VSCode API 状态
export { vscode, isVSCodeWebview };
