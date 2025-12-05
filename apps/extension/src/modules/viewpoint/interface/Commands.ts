import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ViewpointApplicationService } from '../application/ViewpointApplicationService';
import { VaultApplicationService } from '../../shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../../shared/application/ArtifactApplicationService';
import { TaskApplicationService } from '../../task/application/TaskApplicationService';
import { AIApplicationService } from '../../ai/application/AIApplicationService';
import { WebviewAdapter } from '../../../core/vscode-api/WebviewAdapter';
import { Logger } from '../../../core/logger/Logger';
import { ViewpointWebviewViewProvider } from './ViewpointWebviewViewProvider';

/**
 * 视点模块命令
 */
export class ViewpointCommands {
  private webviewView: vscode.WebviewView | null = null;

  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
    private artifactService: ArtifactApplicationService,
    private taskService: TaskApplicationService,
    private aiService: AIApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private webviewAdapter: WebviewAdapter
  ) {}

  /**
   * 注册所有命令和 WebviewView
   */
  registerCommands(context: vscode.ExtensionContext): void {
    // 注册 WebviewView Provider
    this.logger.info('[ViewpointCommands] Registering WebviewView provider for architool.viewpointView');
    const webviewViewProvider = new ViewpointWebviewViewProvider(
      this.viewpointService,
      this.vaultService,
      this.artifactService,
      this.taskService,
      this.aiService,
      this.logger,
      this.context
    );

    const disposable = vscode.window.registerWebviewViewProvider(
      'architool.viewpointView',
      webviewViewProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    );
    
    this.logger.info('[ViewpointCommands] WebviewView provider registered successfully');
    context.subscriptions.push(disposable);

    // 创建自定义视点
    const createViewpointCommand = vscode.commands.registerCommand(
      'archi.viewpoint.create',
      async () => {
        const name = await vscode.window.showInputBox({
          prompt: '输入视点名称',
          placeHolder: '例如：前端开发视图',
        });

        if (!name) {
          return;
        }

        const description = await vscode.window.showInputBox({
          prompt: '输入视点描述（可选）',
          placeHolder: '例如：聚焦前端开发相关的文档',
        });

        const requiredTagsInput = await vscode.window.showInputBox({
          prompt: '输入必须包含的标签（用逗号分隔，可选）',
          placeHolder: '例如：frontend,react',
        });

        const requiredTags = requiredTagsInput
          ? requiredTagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
          : undefined;

        // 获取 Vault 列表并让用户选择
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success || vaultsResult.value.length === 0) {
          vscode.window.showErrorMessage('没有可用的 Vault。请先创建一个 Vault。');
          return;
        }

        let vaultId: string;
        if (vaultsResult.value.length === 1) {
          // 如果只有一个 Vault，直接使用
          vaultId = vaultsResult.value[0].id;
        } else {
          // 多个 Vault，让用户选择
          const vaultItems = vaultsResult.value.map(v => ({
            label: v.name,
            description: v.description || (v.readOnly ? 'Git vault' : 'Local vault'),
            id: v.id,
          }));

          const selectedVault = await vscode.window.showQuickPick(vaultItems, {
            placeHolder: '选择要创建视点的 Vault',
          });

          if (!selectedVault) {
            return; // 用户取消
          }

          vaultId = selectedVault.id;
        }

        const result = await this.viewpointService.createViewpoint(vaultId, {
          type: 'tag', // 自定义视点默认为标签视点
          name,
          description,
          requiredTags,
        });

        if (result.success) {
          vscode.window.showInformationMessage(`视点 '${name}' 创建成功`);
        } else {
          vscode.window.showErrorMessage(`创建视点失败: ${result.error.message}`);
        }
      }
    );

    context.subscriptions.push(createViewpointCommand);
  }

  /**
   * 处理 Webview 消息
   */
  private async handleWebviewMessage(
    webview: vscode.Webview,
    message: any
  ): Promise<void> {
    this.logger.info(`[ViewpointCommands] Received message: ${message.method}`, {
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
        `[ViewpointCommands] Error handling message: ${message.method}`,
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
    const vaultsResult = await this.vaultService.listVaults();
    if (!vaultsResult.success || vaultsResult.value.length === 0) {
      throw new Error('No vaults available');
    }

    const vaultId = vaultsResult.value[0].id;
    const result = await this.taskService.createTask({
      vaultId,
      artifactPath: params.artifactPath || `tasks/${params.title || '新任务'}.md`,
      title: params.title || '新任务',
      status: params.status || 'pending',
      priority: params.priority,
      dueDate: params.dueDate,
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    return result.value;
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
   * 获取 Webview 内容
   */
  protected async getWebviewContent(
    webview: vscode.Webview
  ): Promise<string> {
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
  protected getWebviewDistPath(): string {
    const extensionPath = this.context.extensionPath;
    const webviewPathInExtension = path.join(extensionPath, 'dist', 'webview');
    const webviewPathInSource = path.join(extensionPath, '..', 'webview', 'dist');
    return fs.existsSync(webviewPathInExtension)
      ? webviewPathInExtension
      : webviewPathInSource;
  }
}

