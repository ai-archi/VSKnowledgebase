/**
 * Webview API 注入工具
 * 统一处理 Webview HTML 中的 IDE API 注入，支持多 IDE
 */

/**
 * 生成 IDE API 注入脚本
 * 根据 IDE 类型自动生成相应的 API 注入代码
 * @param ideType IDE 类型
 * @param initialData 初始数据（可选）
 * @returns 注入脚本字符串
 */
export function generateIDEAPIScript(
  ideType: 'vscode' | 'intellij' | 'unknown' = 'vscode',
  initialData?: Record<string, any>
): string {
  // 基础脚本：初始化 IDE API 和错误处理
  let script = `
    <script>
      (function() {
        // 检测 IDE 类型并初始化 API
        let ideApi = null;
        let ideType = '${ideType}';
        
        // VS Code API
        if (typeof acquireVsCodeApi === 'function') {
          ideApi = acquireVsCodeApi();
          ideType = 'vscode';
          window.vscode = ideApi;
          window.acquireVsCodeApi = () => ideApi;
        }
        // IntelliJ API
        else if (window.idea) {
          ideApi = window.idea;
          ideType = 'intellij';
        }
        else if (window.intellij) {
          ideApi = window.intellij;
          ideType = 'intellij';
        }
        
        // 统一 API 接口（向后兼容）
        if (ideApi) {
          window.ideApi = ideApi;
          window.ideType = ideType;
          
          // 为 VS Code 兼容性提供 acquireVsCodeApi
          if (ideType === 'vscode' && !window.acquireVsCodeApi) {
            window.acquireVsCodeApi = () => ideApi;
          }
        }
        
        // 注入初始数据
        ${initialData ? `window.initialData = ${JSON.stringify(initialData)};` : ''}
        
        // 全局错误处理
        window.addEventListener('error', (event) => {
          console.error('[Webview] Global error:', event.error);
          if (ideApi && ideApi.postMessage) {
            ideApi.postMessage({
              method: 'webviewError',
              params: {
                message: event.error?.message || event.message,
                stack: event.error?.stack,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
              }
            });
          }
        });
        
        // 未处理的 Promise 拒绝
        window.addEventListener('unhandledrejection', (event) => {
          console.error('[Webview] Unhandled rejection:', event.reason);
          if (ideApi && ideApi.postMessage) {
            const message = ideType === 'vscode' 
              ? {
                  method: 'webviewError',
                  params: {
                    message: 'Unhandled Promise Rejection: ' + (event.reason?.message || String(event.reason)),
                    stack: event.reason?.stack
                  }
                }
              : JSON.stringify({
                  method: 'webviewError',
                  params: {
                    message: 'Unhandled Promise Rejection: ' + (event.reason?.message || String(event.reason)),
                    stack: event.reason?.stack
                  }
                });
            
            ideApi.postMessage(message);
          }
        });
      })();
    </script>
  `;
  
  return script;
}

/**
 * 注入 IDE API 脚本到 HTML
 * @param html HTML 内容
 * @param ideType IDE 类型
 * @param initialData 初始数据（可选）
 * @returns 注入后的 HTML
 */
export function injectIDEAPIScript(
  html: string,
  ideType: 'vscode' | 'intellij' | 'unknown' = 'vscode',
  initialData?: Record<string, any>
): string {
  const script = generateIDEAPIScript(ideType, initialData);
  
  // 在 </head> 标签前注入脚本
  if (html.includes('</head>')) {
    html = html.replace('</head>', `${script}</head>`);
  } else if (html.includes('</body>')) {
    // 如果没有 </head>，则在 </body> 前注入
    html = html.replace('</body>', `${script}</body>`);
  } else {
    // 如果都没有，则在开头注入
    html = script + html;
  }
  
  return html;
}

