import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

/**
 * PlantUML 编辑器提供者
 * 支持 .puml 文件的可视化编辑
 */
export class PlantUMLEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'architool.plantumlEditor';
  
  private jarPath: string | null = null;

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 注册编辑器提供者
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new PlantUMLEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      PlantUMLEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  /**
   * 解析自定义编辑器
   */
  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    // 设置 Webview 内容
    const extensionPath = this.context.extensionPath;
    const webviewPath = path.join(extensionPath, 'dist', 'webview');
    const webviewUri = vscode.Uri.file(webviewPath);
    
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
        webviewUri,
      ],
      enableCommandUris: false,
    };

    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      document,
      this.context.extensionUri
    );

    // 处理来自 Webview 的消息（使用 ExtensionService 格式）
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (message) => {
        try {
          // 使用 ExtensionService 的消息格式
          if (message.method === 'loadPlantUML') {
            // 返回文档内容，通过事件推送
            webviewPanel.webview.postMessage({
              method: 'load',
              params: { source: document.getText() },
            });
          } else if (message.method === 'renderPlantUML') {
            // 渲染 PlantUML
            const { source } = message.params || {};
            if (source) {
              try {
                const svg = await this.renderPlantUML(source);
                webviewPanel.webview.postMessage({
                  method: 'render-result',
                  params: { svg: svg },
                });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                webviewPanel.webview.postMessage({
                  method: 'render-error',
                  params: { error: errorMessage },
                });
              }
            }
          } else if (message.method === 'savePlantUML') {
            // 保存文档
            const { source } = message.params || {};
            if (source !== undefined) {
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                source
              );
              await vscode.workspace.applyEdit(edit);
              await document.save();
              webviewPanel.webview.postMessage({
                method: 'save-success',
              });
            }
          }
        } catch (error) {
          console.error('[PlantUMLEditor] Message handler error:', error);
        }
      }
    );

    // 监听文档变更
    const changeDocumentSubscription2 = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          webviewPanel.webview.postMessage({
            method: 'load',
            params: { source: e.document.getText() },
          });
        }
      }
    );

    // 监听 webview 可见性变化
    const viewStateSubscription = webviewPanel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) {
        // webview 变为可见时，发送初始内容
        webviewPanel.webview.postMessage({
          method: 'load',
          params: { source: document.getText() },
        });
      }
    });

    // 清理订阅
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeDocumentSubscription2.dispose();
      viewStateSubscription.dispose();
    });

    // 发送初始内容（使用多个延迟确保 Vue 应用已初始化）
    const sendInitialContent = () => {
      webviewPanel.webview.postMessage({
        method: 'load',
        params: { source: document.getText() },
      });
    };

    // 使用多个延迟确保 Vue 应用已初始化（参考 MermaidEditorProvider）
    setTimeout(sendInitialContent, 500);
    setTimeout(sendInitialContent, 1500);
    setTimeout(sendInitialContent, 3000);
  }

  /**
   * 渲染 PlantUML 源码为 SVG
   */
  private async renderPlantUML(source: string): Promise<string> {
    // 查找 jar 文件
    const jarPath = await this.findJarPath();
    
    if (!jarPath) {
      const extensionPath = this.context.extensionPath;
      throw new Error(
        `PlantUML jar file not found. Please ensure plantuml-1.2025.10.jar is placed in vendor/plantuml/ and run the build process.\n` +
        `Extension path: ${extensionPath}\n` +
        `Expected location:\n` +
        `  - ${path.join(extensionPath, 'vendor', 'plantuml', 'plantuml-1.2025.10.jar')}`
      );
    }

    // 获取 vendor/plantuml 目录路径（用于宏文件的 !include）
    const vendorDir = path.dirname(jarPath);

    return new Promise((resolve, reject) => {
      // 使用 spawn 执行 java -jar plantuml-1.2025.10.jar -pipe -tsvg
      // 添加性能优化参数：
      // -Djava.awt.headless=true: 无头模式，不需要图形界面
      // -Xmx512m: 限制最大堆内存为 512MB，避免内存占用过大
      // -Xms128m: 初始堆内存 128MB
      const javaProcess: ChildProcess = spawn('java', [
        '-Djava.awt.headless=true',  // 无头模式，提升性能
        '-Xmx512m',                   // 限制最大堆内存
        '-Xms128m',                   // 初始堆内存
        '-jar',
        jarPath,
        '-pipe',    // 使用 pipe 模式
        '-tsvg',    // 输出 SVG 格式
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        // 设置工作目录为 vendor/plantuml，这样 !include 指令可以找到宏文件
        cwd: vendorDir,
        // 设置环境变量，禁用不必要的功能
        env: {
          ...process.env,
          JAVA_TOOL_OPTIONS: '-Djava.awt.headless=true',
        },
      });

      let stdout = '';
      let stderr = '';
      let hasResolved = false;

      // 设置超时（30秒）
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          javaProcess.kill('SIGTERM');
          reject(new Error('PlantUML render timeout after 30 seconds'));
        }
      }, 30000);

      // 收集 stdout（使用 Buffer 拼接，提升性能）
      if (javaProcess.stdout) {
        const chunks: Buffer[] = [];
        javaProcess.stdout.on('data', (data: Buffer) => {
          chunks.push(data);
        });
        javaProcess.stdout.on('end', () => {
          stdout = Buffer.concat(chunks).toString('utf-8');
        });
      }

      // 收集 stderr
      if (javaProcess.stderr) {
        javaProcess.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });
      }

      // 处理进程结束
      javaProcess.on('close', (code: number | null) => {
        clearTimeout(timeout);
        if (hasResolved) return;
        hasResolved = true;

        if (code !== 0) {
          reject(new Error(`PlantUML render failed with code ${code}: ${stderr || 'Unknown error'}`));
          return;
        }

        if (!stdout || stdout.trim() === '') {
          reject(new Error('PlantUML render produced no output'));
          return;
        }

        // 检查输出是否是 SVG
        if (stdout.trim().startsWith('<?xml') || stdout.trim().startsWith('<svg')) {
          resolve(stdout);
        } else {
          // 可能是错误消息
          reject(new Error(`PlantUML render error: ${stdout}`));
        }
      });

      // 处理进程错误
      javaProcess.on('error', (error: NodeJS.ErrnoException) => {
        clearTimeout(timeout);
        if (hasResolved) return;
        hasResolved = true;

        if (error.code === 'ENOENT') {
          reject(new Error(
            'Java runtime not found. Please install Java and ensure it is in your PATH.'
          ));
        } else {
          reject(error);
        }
      });

      // 写入源码到 stdin（使用 Buffer 一次性写入，提升性能）
      if (javaProcess.stdin) {
        try {
          javaProcess.stdin.write(Buffer.from(source, 'utf-8'), (error) => {
            if (error) {
              clearTimeout(timeout);
              if (!hasResolved) {
                hasResolved = true;
                reject(new Error(`Failed to write to stdin: ${error.message}`));
              }
            } else {
              javaProcess.stdin?.end();
            }
          });
        } catch (error) {
          clearTimeout(timeout);
          if (!hasResolved) {
            hasResolved = true;
            reject(new Error(`Failed to open stdin for PlantUML process: ${error}`));
          }
        }
      } else {
        clearTimeout(timeout);
        if (!hasResolved) {
          hasResolved = true;
        reject(new Error('Failed to open stdin for PlantUML process'));
        }
      }
    });
  }

  /**
   * 查找 PlantUML jar 文件路径
   */
  private async findJarPath(): Promise<string | null> {
    // 如果已经找到，直接返回
    if (this.jarPath && fs.existsSync(this.jarPath)) {
      return this.jarPath;
    }

    const extensionPath = this.context.extensionPath;
    
    // 优先：新位置 vendor/plantuml/plantuml-1.2025.10.jar（打包后的位置）
    const newJarPath = path.join(extensionPath, 'vendor', 'plantuml', 'plantuml-1.2025.10.jar');
    if (fs.existsSync(newJarPath)) {
      this.jarPath = newJarPath;
        return this.jarPath;
      }

    // 备选：开发环境中的位置（项目根目录）
    const devJarPath = path.join(extensionPath, '..', '..', 'vendor', 'plantuml', 'plantuml-1.2025.10.jar');
    if (fs.existsSync(devJarPath)) {
      this.jarPath = devJarPath;
      return this.jarPath;
    }

    // 未找到
    return null;
  }

  /**
   * 获取 Webview HTML 内容
   */
  private getWebviewContent(
    webview: vscode.Webview,
    document: vscode.TextDocument,
    extensionUri: vscode.Uri
  ): string {
    // 获取 webview 的路径
    const extensionPath = this.context.extensionPath;
    const webviewPath = path.join(extensionPath, 'dist', 'webview');
    const htmlPath = path.join(webviewPath, 'plantuml-editor.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(htmlPath)) {
      const errorMessage = `PlantUML editor build artifacts not found.
Expected path: ${htmlPath}
Extension path: ${extensionPath}

Please run: pnpm run build:webview`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数
    const webviewUri = vscode.Uri.file(webviewPath);
    const getWebviewUri = (relativePath: string) => {
      // 跳过已经是绝对路径的（如 CDN、data URI、vscode-webview://）
      if (
        relativePath.startsWith('http://') || 
        relativePath.startsWith('https://') ||
        relativePath.startsWith('data:') ||
        relativePath.startsWith('vscode-webview://')
      ) {
        return relativePath;
      }
      const uri = vscode.Uri.joinPath(webviewUri, relativePath);
      return webview.asWebviewUri(uri).toString();
    };
    
    // 替换所有 JS 和 CSS 文件的相对路径为 webview URI
    // 1. 替换 CSS 文件路径
    htmlContent = htmlContent.replace(
      /<link[^>]*href=["']([^"']+)["'][^>]*>/gi,
      (match: string, href: string) => {
        if (
          href.startsWith('http://') || 
          href.startsWith('https://') ||
          href.startsWith('data:') ||
          href.startsWith('vscode-webview://')
        ) {
          return match;
        }
        return match.replace(href, getWebviewUri(href));
      }
    );
    
    // 2. 替换所有 script 标签中的 JS 文件路径
    htmlContent = htmlContent.replace(
      /<script[^>]*src=["']([^"']+)["'][^>]*>/gi,
      (match: string, src: string) => {
        if (
          src.startsWith('http://') || 
          src.startsWith('https://') ||
          src.startsWith('data:') ||
          src.startsWith('vscode-webview://')
        ) {
          return match;
        }
        return match.replace(src, getWebviewUri(src));
      }
    );
    
    // 3. 注入 VSCode API 脚本（在 </head> 标签前）
    // 调用一次 acquireVsCodeApi() 并保存，然后重写 acquireVsCodeApi 以避免重复调用
    const vscodeApiScript = `
    <script>
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
      window.acquireVsCodeApi = () => vscode;
    </script>
    `;
    htmlContent = htmlContent.replace('</head>', vscodeApiScript + '</head>');
    
    return htmlContent;
  }
}
