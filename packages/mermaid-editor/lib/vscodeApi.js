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
    
    // 处理其他消息类型（如 load）
    // 注意：load 消息由 app.js 直接处理，这里不需要处理
    // 但为了兼容性，如果存在 window.onDiagramLoad 回调，也调用它
    if ((data.type === 'load' || data.type === 'load-response') && data.diagram) {
      // 存储到 window.pendingDiagram 供应用使用（如果应用还未初始化）
      if (typeof window !== 'undefined') {
        window.pendingDiagram = data.diagram;
      }
      // 如果存在回调，也调用它
      if (window.onDiagramLoad) {
        window.onDiagramLoad(data.diagram);
      }
    }
  });
}

// API 函数 - 简化版本，只保留加载和保存
// 所有编辑操作都在前端完成，只通过保存整个图表数据来同步

export async function fetchDiagram() {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId();
    pendingMessages.set(messageId, { resolve, reject });
    
    vscode.postMessage({
      type: 'api-fetchDiagram',
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

export async function saveDiagram(diagram) {
  if (!isVSCodeWebview) {
    throw new Error('Not in VSCode webview environment');
  }
  
  return new Promise((resolve, reject) => {
    const messageId = generateMessageId();
    pendingMessages.set(messageId, { resolve, reject });
    
    vscode.postMessage({
      type: 'api-saveDiagram',
      messageId,
      payload: { diagram },
    });
    
    setTimeout(() => {
      if (pendingMessages.has(messageId)) {
        pendingMessages.delete(messageId);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

// 为了兼容性，保留这些函数，但它们内部都调用 saveDiagram
export async function updateLayout(update) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

export async function updateSource(source) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

export async function updateStyle(update) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

export async function deleteNode(nodeId) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

export async function deleteEdge(edgeId) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

export async function updateNodeImage(nodeId, payload) {
  // 这个函数应该在前端直接更新 diagram 状态，然后调用 saveDiagram
  // 这里只是占位，实际逻辑在 app.js 中
  return Promise.resolve();
}

// 导出 VSCode API 状态
export { vscode, isVSCodeWebview };

