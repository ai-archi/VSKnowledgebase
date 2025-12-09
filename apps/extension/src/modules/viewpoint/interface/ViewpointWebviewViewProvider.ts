import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
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

        case 'getTaskTemplates':
          result = await this.getTaskTemplates(message.params?.vaultId);
          break;

        case 'vault.list':
          result = await this.listVaults();
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
          await this.openFile(message.params);
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
      contentLocation: artifact.contentLocation, // 添加完整文件路径
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

    // 读取每个任务的完整信息，包括 workflow
    const tasksWithWorkflow = await Promise.all(
      result.value.map(async (task) => {
        try {
          // 获取 vault 信息
          const vaultResult = await this.vaultService.getVault(task.vaultId);
          if (!vaultResult.success || !vaultResult.value) {
            return {
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              artifactId: task.artifactId,
              artifactPath: task.artifactPath,
              vaultId: task.vaultId,
              workflowStep: 'draft-proposal',
              workflowData: {},
              templateId: undefined,
            };
          }

          // 读取任务文件内容
          const readResult = await this.artifactService.readFile(
            { id: vaultResult.value.id, name: vaultResult.value.name },
            task.artifactPath
          );

          if (readResult.success) {
            const taskData = yaml.load(readResult.value) as any;
            
            if (taskData && taskData.workflow) {
              return {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate,
                artifactId: task.artifactId,
                artifactPath: task.artifactPath,
                vaultId: task.vaultId,
                workflowStep: taskData.workflow.step || 'draft-proposal',
                workflowData: taskData.workflow.data || {},
                templateId: taskData.workflow.templateId,
                createdAt: taskData.createdAt,
              };
            }
          }
        } catch (error: any) {
          this.logger.warn(`Failed to read workflow for task ${task.id}`, error);
        }

        // 如果读取失败，返回基本信息
        return {
          id: task.id,
          title: task.title,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          artifactId: task.artifactId,
          artifactPath: task.artifactPath,
          vaultId: task.vaultId,
          workflowStep: 'draft-proposal',
          workflowData: {},
          templateId: undefined,
        };
      })
    );

    return tasksWithWorkflow;
  }

  /**
   * 创建任务
   */
  private async createTask(params: any): Promise<any> {
    const vaultId = params.vaultId;
    if (!vaultId) {
      throw new Error('Vault ID is required');
    }

    // 验证 vault 类型，只能创建到 task 或 document 类型的 vault
    const vaultResult = await this.vaultService.getVault(vaultId);
    if (!vaultResult.success || !vaultResult.value) {
      throw new Error(`Vault not found: ${vaultId}`);
    }

    const vault = vaultResult.value;
    if (vault.type !== 'task' && vault.type !== 'document') {
      throw new Error(`Cannot create task in vault of type '${vault.type}'. Only 'task' or 'document' type vaults are allowed.`);
    }

    // 构建任务路径（使用 archi-tasks/ 目录，YAML 格式）
    const artifactPath = params.artifactPath || `archi-tasks/${params.title || '新任务'}.yml`;

    // 创建任务，支持模板ID
    const result = await this.taskService.createTask({
      vaultId,
      artifactPath,
      title: params.title || '新任务',
      status: params.status || 'pending',
      priority: params.priority || 'medium',
      dueDate: params.dueDate,
      templateId: params.workflowTemplate || params.templateId,
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

    // 刷新任务树视图
    try {
      await vscode.commands.executeCommand('archi.task.refresh');
    } catch (error) {
      this.logger.warn('[ViewpointWebviewViewProvider] Failed to refresh task tree view', error);
    }

    return task;
  }

  /**
   * 获取任务模板列表
   */
  private async getTaskTemplates(vaultId?: string): Promise<any[]> {
    this.logger.info(`[ViewpointWebviewViewProvider] getTaskTemplates called with vaultId: ${vaultId || 'undefined (all vaults)'}`);
    
    const result = await this.taskService.getTaskTemplates(vaultId);
    
    if (!result.success) {
      this.logger.error('[ViewpointWebviewViewProvider] Failed to get task templates', result.error);
      return [];
    }

    this.logger.info(`[ViewpointWebviewViewProvider] getTaskTemplates returned ${result.value.length} templates`);
    
    const mappedTemplates = result.value.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
    }));
    
    this.logger.info(`[ViewpointWebviewViewProvider] Mapped templates:`, mappedTemplates.map(t => `${t.id} (${t.name})`).join(', '));
    
    return mappedTemplates;
  }

  /**
   * 获取 Vault 列表
   */
  private async listVaults(): Promise<any[]> {
    const result = await this.vaultService.listVaults();
    if (!result.success) {
      this.logger.warn('[ViewpointWebviewViewProvider] Failed to list vaults', result.error);
      return [];
    }

    return result.value.map(vault => ({
      id: vault.id,
      name: vault.name,
      description: vault.description,
      type: vault.type,
    }));
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
   * 支持两种方式：
   * 1. 如果提供了 contentLocation（完整文件路径），直接使用（推荐）
   * 2. 如果只提供了 filePath 和 vaultId，通过 artifactService 获取完整路径
   * 3. 如果只提供了 filePath（无 vaultId），尝试作为工作区相对路径或绝对路径处理
   */
  private async openFile(params: { filePath?: string; contentLocation?: string; vaultId?: string }): Promise<void> {
    let fullPath: string;

    // 优先使用 contentLocation（完整文件路径）
    if (params.contentLocation) {
      fullPath = params.contentLocation;
    } else if (params.filePath && params.vaultId) {
      // 如果有 vaultId 和 filePath，通过 artifactService 获取完整路径
      const vaultResult = await this.vaultService.getVault(params.vaultId);
      if (vaultResult.success && vaultResult.value) {
        const vaultRef = { id: vaultResult.value.id, name: vaultResult.value.name };
        // 使用 artifactService 获取 artifact，获取完整路径
        const artifactResult = await this.artifactService.getArtifact(vaultRef.id, params.filePath);
        if (artifactResult.success && artifactResult.value?.contentLocation) {
          fullPath = artifactResult.value.contentLocation;
        } else {
          // 如果获取 artifact 失败，尝试通过 artifactService 的 getFullPath 方法
          // 由于 getFullPath 是公共方法，我们可以通过读取文件来获取完整路径
          const readResult = await this.artifactService.readFile(vaultRef, params.filePath);
          if (readResult.success) {
            // 如果文件存在，构建完整路径
            // 使用 artifactService 的内部逻辑：vaultPath + filePath
            const vaultPath = await this.getVaultPath(vaultRef.id);
            fullPath = path.join(vaultPath, params.filePath);
          } else {
            throw new Error(`File not found: ${params.filePath} in vault ${params.vaultId}`);
          }
        }
      } else {
        throw new Error(`Vault not found: ${params.vaultId}`);
      }
    } else if (params.filePath) {
      // 没有 vaultId，尝试作为工作区相对路径或绝对路径
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error('No workspace folder found');
      }
      fullPath = path.isAbsolute(params.filePath)
        ? params.filePath
        : path.join(workspaceFolder.uri.fsPath, params.filePath);
    } else {
      throw new Error('Either filePath or contentLocation must be provided');
    }

    const fileUri = vscode.Uri.file(fullPath);
    
    // 根据文件扩展名确定使用哪个自定义编辑器
    const ext = path.extname(fullPath).toLowerCase();
    let viewType: string | undefined;
    
    switch (ext) {
      case '.archimate':
        viewType = 'architool.archimateEditor';
        break;
      case '.mmd':
        viewType = 'architool.mermaidEditor';
        break;
      case '.puml':
        viewType = 'architool.plantumlEditor';
        break;
      default:
        // 其他文件类型使用默认文本编辑器
        viewType = undefined;
        break;
    }
    
    if (viewType) {
      // 使用自定义编辑器打开（会在新标签页中打开）
      this.logger.info('Opening file with custom editor', { fullPath, viewType });
      await vscode.commands.executeCommand('vscode.openWith', fileUri, viewType);
    } else {
      // 使用默认文本编辑器打开，在新标签页中打开（preview: false）
      this.logger.info('Opening file with default text editor', { fullPath });
      const document = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(document, { 
        preview: false,
        viewColumn: vscode.ViewColumn.Active 
      });
    }
  }

  /**
   * 获取 vault 路径（辅助方法）
   */
  private async getVaultPath(vaultId: string): Promise<string> {
    // 通过读取任意文件来获取 vault 路径
    // 或者通过 artifactService 的内部方法
    // 这里使用一个简单的方法：通过读取一个已知文件来推断路径
    const vaultResult = await this.vaultService.getVault(vaultId);
    if (vaultResult.success && vaultResult.value) {
      // 尝试读取 vault 的 .metadata/vault.yaml 文件来获取路径
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        // 假设 .architool 在工作区根目录下
        const architoolRoot = path.join(workspaceFolder.uri.fsPath, '.architool');
        const vaultPath = path.join(architoolRoot, vaultId);
        if (fs.existsSync(vaultPath)) {
          return vaultPath;
        }
      }
    }
    throw new Error(`Cannot determine vault path for vault: ${vaultId}`);
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
          // 注意：只处理 document 类型的 vault
          const params = message.params || {};
          
          // 如果指定了 vaultId，验证 vault 类型
          if (params.vaultId) {
            const vaultResult = await this.vaultService.getVault(params.vaultId);
            if (vaultResult.success && vaultResult.value) {
              // 只处理 document 类型的 vault
              if (vaultResult.value.type !== 'document') {
                panel.webview.postMessage({
                  id: message.id,
                  method: message.method,
                  result: [],
                });
                return;
              }
            }
          }
          
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
        } else if (message.method === 'getTaskTemplates') {
          // 获取任务模板列表
          try {
            const templates = await this.getTaskTemplates(message.params?.vaultId);
            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: templates,
            });
          } catch (error: any) {
            this.logger.error('[ViewpointWebviewViewProvider] Error getting task templates in dialog', error);
            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              error: {
                code: -1,
                message: error.message,
              },
            });
          }
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
        } else {
          // 未处理的消息
          this.logger.warn(`[ViewpointWebviewViewProvider] Unhandled message in create task dialog: ${message.method}`);
          panel.webview.postMessage({
            id: message.id,
            method: message.method,
            error: {
              code: -1,
              message: `Unhandled method: ${message.method}`,
            },
          });
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

