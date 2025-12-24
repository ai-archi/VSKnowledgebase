import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { IDEAdapter } from '../../../core/ide-api/ide-adapter';
import { CustomTextEditorProvider, TextDocument, WebviewPanel, CancellationToken, Uri, WorkspaceEdit, Range, WebviewOptions, Disposable } from '../../../core/ide-api/ide-types';

/**
 * PlantUML 编辑器提供者
 * 支持 .puml 文件的可视化编辑
 */
export class PlantUMLEditorProvider implements CustomTextEditorProvider {
  public static readonly viewType = 'architool.plantumlEditor';
  
  // 静态缓存 jar 文件路径，避免重复查找
  private static cachedJarPath: string | null = null;
  private jarPath: string | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly ideAdapter: IDEAdapter
  ) {}

  /**
   * 注册编辑器提供者
   */
  public static register(context: vscode.ExtensionContext, ideAdapter: IDEAdapter): Disposable {
    const provider = new PlantUMLEditorProvider(context, ideAdapter);
    return ideAdapter.registerCustomEditorProvider(
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
    document: TextDocument,
    webviewPanel: WebviewPanel,
    token: CancellationToken
  ): Promise<void> {
    // 设置 Webview 内容
    const extensionPath = this.ideAdapter.getExtensionPath();
    const webviewPath = path.join(extensionPath, 'dist', 'webview');
    const webviewUri = this.ideAdapter.UriFile(webviewPath);
    
    const extensionUri = this.ideAdapter.getExtensionUri();
    const options: WebviewOptions = {
      enableScripts: true,
      localResourceRoots: [
        this.ideAdapter.UriJoinPath(extensionUri, 'dist'),
        webviewUri,
      ],
      enableCommandUris: false,
    };
    (webviewPanel.webview as any).options = options;

    (webviewPanel.webview as any).html = this.getWebviewContent(
      webviewPanel.webview as any,
      document as any,
      this.context.extensionUri as any
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
            console.log('[PlantUMLEditor] Received renderPlantUML request, source length:', source?.length || 0);
            if (source) {
              try {
                console.log('[PlantUMLEditor] Starting render...');
                const svg = await this.renderPlantUML(source);
                console.log('[PlantUMLEditor] Render completed, SVG length:', svg?.length || 0);
                webviewPanel.webview.postMessage({
                  method: 'render-result',
                  params: { svg: svg },
                });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('[PlantUMLEditor] Render error:', errorMessage);
                webviewPanel.webview.postMessage({
                  method: 'render-error',
                  params: { error: errorMessage },
                });
              }
            } else {
              console.warn('[PlantUMLEditor] renderPlantUML called without source');
            }
          } else if (message.method === 'savePlantUML') {
            // 保存文档
            const { source } = message.params || {};
            if (source !== undefined) {
              const edit = this.ideAdapter.createWorkspaceEdit();
              edit.replace(
                document.uri,
                this.ideAdapter.Range(0, 0, document.lineCount, 0),
                source
              );
              await this.ideAdapter.applyEdit(edit);
              if ((document as any).save) {
                await (document as any).save();
              }
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

    // 发送初始内容（优化：减少延迟，只发送一次）
    // 前端已经优化了初始化时序，这里只需要发送一次即可
    const sendInitialContent = () => {
      webviewPanel.webview.postMessage({
        method: 'load',
        params: { source: document.getText() },
      });
    };

    // 优化：减少延迟，前端已经处理了初始化时序
    // 只发送一次，延迟 200ms 确保 webview 基本初始化完成
    setTimeout(sendInitialContent, 200);
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
        `PlantUML jar file not found. Please ensure plantuml-1.2025.10.jar is placed in dist/vendor/plantuml/ and run the build process.\n` +
        `Extension path: ${extensionPath}\n` +
        `Expected locations:\n` +
        `  - ${path.join(extensionPath, 'dist', 'vendor', 'plantuml', 'plantuml-1.2025.10.jar')}\n` +
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
    // 首先检查静态缓存（跨实例共享）
    if (PlantUMLEditorProvider.cachedJarPath && fs.existsSync(PlantUMLEditorProvider.cachedJarPath)) {
      this.jarPath = PlantUMLEditorProvider.cachedJarPath;
      return this.jarPath;
    }
    
    // 如果实例级别的缓存存在，也检查一下
    if (this.jarPath && fs.existsSync(this.jarPath)) {
      PlantUMLEditorProvider.cachedJarPath = this.jarPath;
      return this.jarPath;
    }

    const extensionPath = this.context.extensionPath;
    
    // 优先：打包后的位置 dist/vendor/plantuml/plantuml-1.2025.10.jar
    const distJarPath = path.join(extensionPath, 'dist', 'vendor', 'plantuml', 'plantuml-1.2025.10.jar');
    if (fs.existsSync(distJarPath)) {
      this.jarPath = distJarPath;
      PlantUMLEditorProvider.cachedJarPath = distJarPath; // 更新静态缓存
      return this.jarPath;
    }

    // 备选：vendor/plantuml/plantuml-1.2025.10.jar（如果直接放在扩展根目录）
    const vendorJarPath = path.join(extensionPath, 'vendor', 'plantuml', 'plantuml-1.2025.10.jar');
    if (fs.existsSync(vendorJarPath)) {
      this.jarPath = vendorJarPath;
      PlantUMLEditorProvider.cachedJarPath = vendorJarPath; // 更新静态缓存
      return this.jarPath;
    }

    // 开发环境：项目根目录的 vendor/plantuml/plantuml-1.2025.10.jar
    const devJarPath = path.join(extensionPath, '..', '..', 'vendor', 'plantuml', 'plantuml-1.2025.10.jar');
    if (fs.existsSync(devJarPath)) {
      this.jarPath = devJarPath;
      PlantUMLEditorProvider.cachedJarPath = devJarPath; // 更新静态缓存
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
    const htmlPath = path.join(webviewPath, 'index.html');
    
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
    
    // 3. 注入 VSCode API 脚本和视图名称（在 </head> 标签前）
    // 调用一次 acquireVsCodeApi() 并保存，然后重写 acquireVsCodeApi 以避免重复调用
    const vscodeApiScript = `
    <script>
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
      window.acquireVsCodeApi = () => vscode;
      if (!window.initialData) {
        window.initialData = {};
      }
      window.initialData.view = 'plantuml-editor';
    </script>
    `;
    htmlContent = htmlContent.replace('</head>', vscodeApiScript + '</head>');
    
    return htmlContent;
  }
}
