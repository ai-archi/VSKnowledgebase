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
    const plantumlEditorPath = path.join(extensionPath, 'dist', 'plantuml-js');
    const plantumlEditorUri = vscode.Uri.file(plantumlEditorPath);
    
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        plantumlEditorUri,
      ],
      enableCommandUris: false,
    };

    webviewPanel.webview.html = this.getWebviewContent(
      webviewPanel.webview,
      document,
      this.context.extensionUri
    );

    // 处理来自 Webview 的消息
    const changeDocumentSubscription = webviewPanel.webview.onDidReceiveMessage(
      async (e) => {
        switch (e.type) {
          case 'load-request':
            // 发送文档内容
            webviewPanel.webview.postMessage({
              type: 'load',
              source: document.getText(),
            });
            break;

          case 'render':
            // 渲染 PlantUML
            if (e.source) {
              try {
                const svg = await this.renderPlantUML(e.source);
                webviewPanel.webview.postMessage({
                  type: 'render-result',
                  svg: svg,
                });
              } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                webviewPanel.webview.postMessage({
                  type: 'render-error',
                  error: errorMessage,
                });
              }
            }
            break;

          case 'save':
            // 保存文档
            if (e.source !== undefined) {
              const edit = new vscode.WorkspaceEdit();
              edit.replace(
                document.uri,
                new vscode.Range(0, 0, document.lineCount, 0),
                e.source
              );
              await vscode.workspace.applyEdit(edit);
              await document.save();
              webviewPanel.webview.postMessage({
                type: 'save-success',
              });
            }
            break;
        }
      }
    );

    // 监听文档变更
    const changeDocumentSubscription2 = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          webviewPanel.webview.postMessage({
            type: 'load',
            source: e.document.getText(),
          });
        }
      }
    );

    // 清理订阅
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
      changeDocumentSubscription2.dispose();
    });

    // 发送初始内容
    const sendInitialContent = () => {
      webviewPanel.webview.postMessage({
        type: 'load',
        source: document.getText(),
      });
    };

    // 等待 webview 加载完成后发送初始内容
    setTimeout(sendInitialContent, 500);
  }

  /**
   * 渲染 PlantUML 源码为 SVG
   */
  private async renderPlantUML(source: string): Promise<string> {
    // 查找 jar 文件
    const jarPath = await this.findJarPath();
    
    if (!jarPath) {
      throw new Error(
        'PlantUML jar file not found. Please ensure plantuml-1.2025.10.jar is placed in ' +
        'packages/plantuml-js/vendor/ and run the build process.'
      );
    }

    return new Promise((resolve, reject) => {
      // 使用 spawn 执行 java -jar plantuml-1.2025.10.jar -pipe -tsvg
      const javaProcess: ChildProcess = spawn('java', [
        '-jar',
        jarPath,
        '-pipe',    // 使用 pipe 模式
        '-tsvg',    // 输出 SVG 格式
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      // 收集 stdout
      if (javaProcess.stdout) {
        javaProcess.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
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
        if (error.code === 'ENOENT') {
          reject(new Error(
            'Java runtime not found. Please install Java and ensure it is in your PATH.'
          ));
        } else {
          reject(error);
        }
      });

      // 写入源码到 stdin
      if (javaProcess.stdin) {
        javaProcess.stdin.write(source, 'utf-8');
        javaProcess.stdin.end();
      } else {
        reject(new Error('Failed to open stdin for PlantUML process'));
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
    
    // 优先：构建输出目录（保留 vendor 结构）
    // 支持多个可能的文件名
    const possibleJarNames = [
      'plantuml-1.2025.10.jar',  // 当前使用的版本
      'plantuml-core.jar',        // 备选名称
    ];
    
    for (const jarName of possibleJarNames) {
      const preferredPath = path.join(extensionPath, 'dist', 'plantuml-js', 'vendor', jarName);
      if (fs.existsSync(preferredPath)) {
        this.jarPath = preferredPath;
        return this.jarPath;
      }
    }

    // 备选：libs 目录（如果手动放置）
    const fallbackPath = path.join(extensionPath, 'libs', 'plantuml.jar');
    if (fs.existsSync(fallbackPath)) {
      this.jarPath = fallbackPath;
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
    // 获取 plantuml-js 的路径
    const extensionPath = this.context.extensionPath;
    const plantumlJsPath = path.join(extensionPath, 'dist', 'plantuml-js');
    const indexHtmlPath = path.join(plantumlJsPath, 'index.html');
    
    // 检查构建产物是否存在
    if (!fs.existsSync(indexHtmlPath)) {
      const errorMessage = `PlantUML editor build artifacts not found.
Expected path: ${indexHtmlPath}
Extension path: ${extensionPath}

Please run: pnpm run build:plantuml-js`;
      
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
    
    // 读取静态 HTML 文件
    let htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8');
    
    // 获取 webview URI 辅助函数
    const plantumlJsUri = vscode.Uri.file(plantumlJsPath);
    const webviewUri = (relativePath: string) => {
      // 跳过已经是绝对路径的（如 CDN）
      if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
      }
      const uri = vscode.Uri.joinPath(plantumlJsUri, relativePath);
      return webview.asWebviewUri(uri).toString();
    };
    
    // 替换所有 JS 和 CSS 文件的相对路径为 webview URI
    // 1. 替换 CSS 文件路径
    htmlContent = htmlContent.replace(
      /<link[^>]*href=["']([^"']+\.css)["'][^>]*>/gi,
      (match: string, cssPath: string) => {
        if (cssPath.startsWith('http://') || cssPath.startsWith('https://')) {
          return match;
        }
        return match.replace(cssPath, webviewUri(cssPath));
      }
    );
    
    // 2. 替换所有 script 标签中的 JS 文件路径
    htmlContent = htmlContent.replace(
      /<script[^>]*src=["']([^"']+\.js)["'][^>]*>/gi,
      (match: string, jsPath: string) => {
        if (jsPath.startsWith('http://') || jsPath.startsWith('https://')) {
          return match;
        }
        return match.replace(jsPath, webviewUri(jsPath));
      }
    );
    
    // 3. 添加 VSCode API 初始化脚本（在第一个 script 标签之前）
    const vscodeApiScript = `
    <script>
      (function() {
        const vscode = acquireVsCodeApi();
        window.vscode = vscode;
      })();
    </script>
    `;
    htmlContent = htmlContent.replace('</head>', vscodeApiScript + '</head>');
    
    return htmlContent;
  }
}

