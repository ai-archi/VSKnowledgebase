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
    if (data.type === 'load' && data.content) {
      window.pendingContent = data.content;
    }
  });
}

// API 函数
export async function fetchDiagram() {
  if (!isVSCodeWebview) {
    // 开发模式：返回空内容
    return '';
  }
  
  // ArchimateEditorProvider 通过 postMessage 发送 'load' 消息
  // 这里返回一个 Promise，但实际内容通过消息传递
  return new Promise((resolve) => {
    // 如果已经有待处理的内容，直接返回
    if (window.pendingContent) {
      const content = window.pendingContent;
      window.pendingContent = null;
      resolve(content);
      return;
    }
    
    // 否则等待消息
    const handler = (event) => {
      const data = event.data;
      if (data.type === 'load' && data.content) {
        window.removeEventListener('message', handler);
        resolve(data.content);
      }
    };
    window.addEventListener('message', handler);
    
    // 超时处理
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve('');
    }, 5000);
  });
}

export async function saveDiagram(content) {
  if (!isVSCodeWebview) {
    // 开发模式：只打印日志
    console.log('Save (dev mode):', content.substring(0, 100) + '...');
    return;
  }
  
  // ArchimateEditorProvider 期望 'save' 消息
  vscode.postMessage({
    type: 'save',
    content: content,
  });
}

// 导出 VSCode API 状态
export { vscode, isVSCodeWebview };

