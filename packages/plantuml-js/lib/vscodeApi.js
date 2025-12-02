// VSCode API adapter - converts fetch API calls to VSCode message passing

// 检测是否在 VSCode webview 环境中
// 注意：acquireVsCodeApi() 只能调用一次，所以优先使用 window.vscode（可能由内联脚本初始化）
let vscode = null;
let isVSCodeWebview = false;

if (typeof window !== 'undefined' && window.vscode) {
  // 如果内联脚本已经初始化了 vscode，使用它
  vscode = window.vscode;
  isVSCodeWebview = true;
} else if (typeof acquireVsCodeApi !== 'undefined') {
  // 否则尝试获取 VS Code API
  try {
    vscode = acquireVsCodeApi();
    isVSCodeWebview = !!vscode;
    // 如果成功获取，也存储到 window 上供其他模块使用
    if (typeof window !== 'undefined') {
      window.vscode = vscode;
    }
  } catch (e) {
    // 如果已经获取过，会抛出错误，尝试使用 window.vscode
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
    
    // 处理其他消息类型（如 load, render-result, render-error）
    if (data.type === 'load' && data.source !== undefined) {
      if (window.onSourceLoad) {
        window.onSourceLoad(data.source);
      }
    }
    
    if (data.type === 'render-result' && data.svg !== undefined) {
      if (window.onRenderResult) {
        window.onRenderResult(data.svg);
      }
    }
    
    if (data.type === 'render-error' && data.error !== undefined) {
      if (window.onRenderError) {
        window.onRenderError(data.error);
      }
    }
    
    if (data.type === 'save-success') {
      if (window.onSaveSuccess) {
        window.onSaveSuccess();
      }
    }
  });
}

// 发送消息到扩展
export function postMessage(type, payload) {
  if (!isVSCodeWebview) {
    console.warn('[vscodeApi] Not in VSCode webview environment');
    return;
  }
  
  vscode.postMessage({
    type,
    ...payload
  });
}

// 导出 VSCode API 状态
export { vscode, isVSCodeWebview };

