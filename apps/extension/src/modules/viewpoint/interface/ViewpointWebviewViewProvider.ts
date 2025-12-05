import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ViewpointApplicationService } from '../application/ViewpointApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { TaskApplicationService } from '../../task/application/TaskApplicationService';
import { AIApplicationService } from '../../ai/application/AIApplicationService';
import { Logger } from '../../../core/logger/Logger';

/**
 * 视点 WebviewView Provider
 * 用于在 panel 中直接显示 Webview
 */
export class ViewpointWebviewViewProvider implements vscode.WebviewViewProvider {
  private webviewView: vscode.WebviewView | null = null;
  private fileWatcherDisposable: vscode.Disposable | null = null;

  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
    private artifactService: ArtifactApplicationService,
    private taskService: TaskApplicationService,
    private aiService: AIApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): void | Thenable<void> {
    this.logger.info('[ViewpointWebviewViewProvider] Resolving webview view');
    
    this.webviewView = webviewView;
    
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(this.getWebviewDistPath())],
    };

    // 加载 HTML
    const html = this.getWebviewContent(webviewView.webview);
    webviewView.webview.html = html;
    this.logger.info('[ViewpointWebviewViewProvider] Webview HTML loaded');

    // 设置消息处理器
    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        await this.handleWebviewMessage(webviewView.webview, message);
      },
      null,
      this.context.subscriptions
    );

    // 监听编辑器切换事件
    this.setupFileWatcher();

    // 当 webview 被销毁时清理
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        // 当视图变为可见时，重新加载关联文件
        this.notifyFileChanged();
      }
    });
  }

  /**
   * 设置文件监听器
   */
  private setupFileWatcher(): void {
    // 清理旧的监听器
    if (this.fileWatcherDisposable) {
      this.fileWatcherDisposable.dispose();
    }

    // 监听编辑器切换事件
    this.fileWatcherDisposable = vscode.window.onDidChangeActiveTextEditor(
      async (editor) => {
        if (editor && this.webviewView?.visible) {
          this.logger.info('[ViewpointWebviewViewProvider] Active editor changed, notifying webview');
          this.notifyFileChanged();
        }
      }
    );

    this.context.subscriptions.push(this.fileWatcherDisposable);
  }

  /**
   * 通知 webview 文件已变更
   */
  private async notifyFileChanged(): Promise<void> {
    if (!this.webviewView?.visible) {
      return;
    }

    try {
      // 发送文件变更事件
      this.webviewView.webview.postMessage({
        method: 'fileChanged',
        params: {},
      });
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Failed to notify file changed', error);
    }
  }

  /**
   * 处理 Webview 消息
   */
  private async handleWebviewMessage(
    webview: vscode.Webview,
    message: any
  ): Promise<void> {
    this.logger.info(`[ViewpointWebviewViewProvider] Received message: ${message.method}`, {
      id: message.id,
      params: message.params,
    });

    try {
      let result: any;

      switch (message.method) {
        case 'getRelatedFiles':
          result = await this.getRelatedFiles();
          break;

        case 'getTasks':
          result = await this.getTasks();
          break;

        case 'createTask':
          result = await this.createTask(message.params);
          break;

        case 'updateTask':
          result = await this.updateTask(
            message.params.taskId,
            message.params.updates
          );
          break;

        case 'updateTaskWorkflow':
          result = await this.updateTaskWorkflow(
            message.params.taskId,
            message.params.stepType,
            message.params.data
          );
          break;

        case 'openFile':
          await this.openFile(message.params.filePath);
          result = { success: true };
          break;

        case 'openCreateTaskDialog':
          await this.openCreateTaskDialog();
          result = { success: true };
          break;

        default:
          throw new Error(`Unknown method: ${message.method}`);
      }

      webview.postMessage({
        id: message.id,
        method: message.method,
        result,
      });
    } catch (error: any) {
      this.logger.error(
        `[ViewpointWebviewViewProvider] Error handling message: ${message.method}`,
        error
      );
      webview.postMessage({
        id: message.id,
        method: message.method,
        error: {
          code: -1,
          message: error.message,
        },
      });
    }
  }

  /**
   * 获取关联文件
   */
  private async getRelatedFiles(): Promise<any[]> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return [];
    }

    const currentFilePath = activeEditor.document.uri.fsPath;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [];
    }

    const relativePath = path.relative(
      workspaceFolder.uri.fsPath,
      currentFilePath
    );

    // 获取关联的 Artifacts
    const artifactsResult = await this.viewpointService.getRelatedArtifacts(
      relativePath
    );

    if (!artifactsResult.success) {
      return [];
    }

    return artifactsResult.value.map(artifact => ({
      id: artifact.id,
      name: path.basename(artifact.path),
      path: artifact.path,
      type: artifact.viewType === 'design' ? 'design' : 'document',
      vault: {
        id: artifact.vault.id,
        name: artifact.vault.name,
      },
    }));
  }

  /**
   * 获取任务列表
   */
  private async getTasks(): Promise<any[]> {
    const result = await this.taskService.listTasks();
    if (!result.success) {
      throw new Error(result.error.message);
    }

    // 从 metadata 中读取 workflowData（如果存在）
    return result.value.map(task => {
      const metadata = (task as any).metadata || {};
      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        artifactId: task.artifactId,
        artifactPath: task.artifactPath,
        vaultId: task.vaultId,
        workflowStep: metadata.workflowStep || 'draft-proposal',
        workflowData: metadata.workflowData || {},
        createdAt: (task as any).createdAt,
      };
    });
  }

  /**
   * 创建任务
   */
  private async createTask(params: any): Promise<any> {
    const vaultId = params.vaultId;
    if (!vaultId) {
      throw new Error('Vault ID is required');
    }

    // 构建任务路径
    const artifactPath = params.artifactPath || `tasks/${params.title || '新任务'}.md`;

    // 创建任务
    const result = await this.taskService.createTask({
      vaultId,
      artifactPath,
      title: params.title || '新任务',
      status: params.status || 'pending',
      priority: params.priority || 'medium',
      dueDate: params.dueDate,
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    const task = result.value;

    // 如果有关联文件，创建关联关系
    if (params.relatedFiles && params.relatedFiles.length > 0) {
      // TODO: 创建任务与文件的关联关系
      this.logger.info('[ViewpointWebviewViewProvider] Task created with related files', {
        taskId: task.id,
        relatedFiles: params.relatedFiles,
      });
    }

    // 如果有流程模板，初始化流程数据
    if (params.workflowTemplate) {
      const workflowData = this.getWorkflowTemplateData(params.workflowTemplate);
      // 更新任务的 workflowData（存储在 metadata 中）
      const updateResult = await this.taskService.updateTask(task.id, {
        metadata: {
          workflowStep: workflowData.initialStep || 'draft-proposal',
          workflowData: workflowData.data || {},
        },
      } as any);
      
      if (updateResult.success) {
        return updateResult.value;
      }
    }

    return task;
  }

  /**
   * 获取流程模板数据
   */
  private getWorkflowTemplateData(templateId: string): { initialStep: string; data: any } {
    const templates: Record<string, { initialStep: string; data: any }> = {
      default: {
        initialStep: 'draft-proposal',
        data: {
          'draft-proposal': {},
          'review-alignment': {},
          'implementation': {},
          'archive-update': {},
        },
      },
      simple: {
        initialStep: 'implementation',
        data: {
          'implementation': {},
          'archive-update': {},
        },
      },
      detailed: {
        initialStep: 'draft-proposal',
        data: {
          'draft-proposal': {},
          'review-alignment': {},
          'implementation': {},
          'test-verification': {},
          'archive-update': {},
        },
      },
    };

    return templates[templateId] || templates.default;
  }

  /**
   * 更新任务
   */
  private async updateTask(taskId: string, updates: any): Promise<any> {
    const result = await this.taskService.updateTask(taskId, updates);
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.value;
  }

  /**
   * 更新任务流程
   */
  private async updateTaskWorkflow(
    taskId: string,
    stepType: string,
    data: any
  ): Promise<any> {
    const taskResult = await this.taskService.listTasks();
    if (!taskResult.success) {
      throw new Error('Failed to get task');
    }

    const task = taskResult.value.find(t => t.id === taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // 从 metadata 中读取 workflowData
    const metadata = (task as any).metadata || {};
    const workflowData = metadata.workflowData || {};
    workflowData[stepType] = data;

    // 更新任务，将 workflowData 存储在 metadata 中
    const result = await this.taskService.updateTask(taskId, {
      metadata: {
        ...metadata,
        workflowStep: stepType,
        workflowData,
      },
    } as any);

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.value;
  }

  /**
   * 打开文件
   */
  private async openFile(filePath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(workspaceFolder.uri.fsPath, filePath);

    const document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(fullPath)
    );
    await vscode.window.showTextDocument(document);
  }

  /**
   * 打开创建任务弹窗
   */
  private async openCreateTaskDialog(): Promise<void> {
    const webviewDistPath = this.getWebviewDistPath();
    const htmlPath = path.join(webviewDistPath, 'create-task-dialog.html');

    if (!fs.existsSync(htmlPath)) {
      vscode.window.showErrorMessage('创建任务弹窗未构建，请先运行: cd apps/webview && pnpm build');
      return;
    }

    // 获取当前选中的 vault
    const vaultsResult = await this.vaultService.listVaults();
    let initialVaultId: string | undefined;
    if (vaultsResult.success && vaultsResult.value.length > 0) {
      initialVaultId = vaultsResult.value[0].id;
    }

    // 创建 webview panel
    const panel = vscode.window.createWebviewPanel(
      'createTaskDialog',
      '创建任务',
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [vscode.Uri.file(webviewDistPath)],
      }
    );

    // 加载 HTML
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换资源路径为 webview URI
    html = html.replace(
      /(src|href)=["']([^"']+)["']/g,
      (match: string, attr: string, resourcePath: string) => {
        if (
          resourcePath.match(/^(vscode-webview|https?|data|mailto|tel):/i)
        ) {
          return match;
        }

        let normalizedPath = resourcePath;
        if (normalizedPath.startsWith('./')) {
          normalizedPath = normalizedPath.substring(2);
        } else if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }

        const resourceFile = path.join(webviewDistPath, normalizedPath);

        if (fs.existsSync(resourceFile)) {
          const resourceUri = panel.webview.asWebviewUri(
            vscode.Uri.file(resourceFile)
          );
          return `${attr}="${resourceUri}"`;
        }

        return match;
      }
    );

    // 注入 VSCode API 和初始数据
    const vscodeScript = `
      <script>
        const vscode = acquireVsCodeApi();
        window.acquireVsCodeApi = () => vscode;
        window.initialData = ${JSON.stringify({ vaultId: initialVaultId })};
      </script>
    `;
    html = html.replace('</head>', `${vscodeScript}</head>`);

    panel.webview.html = html;

    // 设置消息处理器
    panel.webview.onDidReceiveMessage(
      async (message: any) => {
        if (message.method === 'close') {
          panel.dispose();
        } else if (message.method === 'taskCreated') {
          // 任务创建成功，关闭弹窗
          panel.dispose();
          // 通知主视图刷新任务列表
          if (this.webviewView?.visible) {
            this.webviewView.webview.postMessage({
              method: 'taskChanged',
              params: {},
            });
          }
        } else if (message.method === 'getRelatedFiles') {
          // 获取关联文件
          const files = await this.getRelatedFiles();
          panel.webview.postMessage({
            id: message.id,
            method: message.method,
            result: files,
          });
        } else if (message.method === 'vault.list') {
          // 获取 Vault 列表
          const vaultsResult = await this.vaultService.listVaults();
          panel.webview.postMessage({
            id: message.id,
            method: message.method,
            result: vaultsResult.success ? vaultsResult.value : [],
          });
        } else if (message.method === 'document.list') {
          // 获取文档列表（支持查询）
          const params = message.params || {};
          const result = await this.artifactService.listFilesAndFolders(params.vaultId, {
            query: params.query,
          });
          if (!result.success) {
            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              error: {
                code: -1,
                message: result.error.message,
              },
            });
          } else {
            // 获取 vault 信息并添加到返回结果中
            let vaultInfo: { id: string; name: string } | undefined;
            if (params.vaultId) {
              const vaultResult = await this.vaultService.getVault(params.vaultId);
              if (vaultResult.success && vaultResult.value) {
                vaultInfo = { id: vaultResult.value.id, name: vaultResult.value.name };
              }
            }

            const items = result.value.map(item => ({
              ...item,
              vault: vaultInfo,
            }));

            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: items,
            });
          }
        } else if (message.method === 'workspace.listFiles') {
          // 获取工作区文件列表（支持查询）
          // 注意：这个功能需要 CodeFileSystemApplicationService，但当前 ViewpointWebviewViewProvider 没有注入
          // 暂时返回空结果，或者可以通过 WebviewRPC 来处理
          // TODO: 考虑通过 WebviewRPC 统一处理，或者注入 CodeFileSystemApplicationService
          panel.webview.postMessage({
            id: message.id,
            method: message.method,
            result: [],
          });
        } else if (message.method === 'createTask') {
          // 创建任务
          try {
            const task = await this.createTask(message.params);
            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: task,
            });
          } catch (error: any) {
            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              error: {
                code: -1,
                message: error.message,
              },
            });
          }
        }
      },
      null,
      this.context.subscriptions
    );
  }

  /**
   * 获取 Webview 内容
   */
  private getWebviewContent(webview: vscode.Webview): string {
    const webviewDistPath = this.getWebviewDistPath();
    const htmlPath = path.join(webviewDistPath, 'viewpoint-panel.html');

    if (!fs.existsSync(htmlPath)) {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Viewpoints</title>
          </head>
          <body>
            <div style="padding: 20px; text-align: center;">
              <h2>Webview 未构建</h2>
              <p>请先运行 <code>cd apps/webview && pnpm build</code> 构建 webview</p>
            </div>
          </body>
        </html>
      `;
    }

    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换资源路径为 webview URI
    html = html.replace(
      /(src|href)=["']([^"']+)["']/g,
      (match: string, attr: string, resourcePath: string) => {
        if (
          resourcePath.match(/^(vscode-webview|https?|data|mailto|tel):/i)
        ) {
          return match;
        }

        let normalizedPath = resourcePath;
        if (normalizedPath.startsWith('./')) {
          normalizedPath = normalizedPath.substring(2);
        } else if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }

        const resourceFile = path.join(webviewDistPath, normalizedPath);

        if (fs.existsSync(resourceFile)) {
          const resourceUri = webview.asWebviewUri(
            vscode.Uri.file(resourceFile)
          );
          return `${attr}="${resourceUri}"`;
        }

        return match;
      }
    );

    // 注入 VSCode API
    const vscodeScript = `
      <script>
        const vscode = acquireVsCodeApi();
        window.acquireVsCodeApi = () => vscode;
      </script>
    `;
    html = html.replace('</head>', `${vscodeScript}</head>`);

    return html;
  }

  /**
   * 获取 Webview 构建路径
   */
  private getWebviewDistPath(): string {
    const extensionPath = this.context.extensionPath;
    const webviewPathInExtension = path.join(extensionPath, 'dist', 'webview');
    const webviewPathInSource = path.join(extensionPath, '..', 'webview', 'dist');
    return fs.existsSync(webviewPathInExtension)
      ? webviewPathInExtension
      : webviewPathInSource;
  }
}

