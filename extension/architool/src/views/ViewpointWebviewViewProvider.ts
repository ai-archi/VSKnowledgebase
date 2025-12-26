import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { ARCHITOOL_PATHS } from '../core/constants/Paths';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { TaskApplicationService } from '../modules/task/application/TaskApplicationService';
import { FileOperationDomainService } from '../modules/shared/domain/services/FileOperationDomainService';
import { CommandExecutionContext } from '../modules/shared/domain/value_object/CommandExecutionContext';
import { Artifact } from '../modules/shared/domain/entity/artifact';
import { Logger } from '../core/logger/Logger';
import { IDEAdapter } from '../core/ide-api/ide-adapter';
import { WebviewView, Webview, CancellationToken, Uri, WebviewOptions } from '../core/ide-api/ide-types';
import { injectIDEAPIScript } from '../core/ide-api/webview-api-injector';

/**
 * 视点应用服务接口（临时定义，待后续迁移完整服务）
 */
export interface ViewpointApplicationService {
  getRelatedArtifacts(codePath: string): Promise<{ success: boolean; value?: any[]; error?: any }>;
}

/**
 * AI 应用服务接口（临时定义，待后续迁移完整服务）
 */
export interface AIApplicationService {
  // 暂时为空，ViewpointWebviewViewProvider 中未使用
}

/**
 * 视点 WebviewView Provider
 * 用于在 panel 中直接显示 Webview
 */
export class ViewpointWebviewViewProvider {
  private webviewView: WebviewView | null = null;
  private fileWatcherDisposable: any | null = null;

  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
    private artifactService: ArtifactApplicationService,
    private taskService: TaskApplicationService,
    private aiService: AIApplicationService,
    private fileOperationService: FileOperationDomainService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private ideAdapter: IDEAdapter
  ) {}

  resolveWebviewView(
    webviewView: WebviewView,
    context: { readonly webview: Webview },
    token: CancellationToken
  ): void | Thenable<void> {
    try {
      this.logger.info('[ViewpointWebviewViewProvider] Resolving webview view');
      this.logger.info(`[ViewpointWebviewViewProvider] Extension path: ${this.context.extensionPath}`);
      
      this.webviewView = webviewView;
      
      // 获取 webview 构建路径
      const webviewDistPath = this.getWebviewDistPath();
      this.logger.info(`[ViewpointWebviewViewProvider] Webview dist path: ${webviewDistPath}`);
      this.logger.info(`[ViewpointWebviewViewProvider] Webview dist exists: ${fs.existsSync(webviewDistPath)}`);
      
      // 检查关键文件
      const htmlPath = path.join(webviewDistPath, 'index.html');
      this.logger.info(`[ViewpointWebviewViewProvider] HTML path: ${htmlPath}`);
      this.logger.info(`[ViewpointWebviewViewProvider] HTML file exists: ${fs.existsSync(htmlPath)}`);
      
      const options: WebviewOptions = {
        enableScripts: true,
        localResourceRoots: [this.ideAdapter.UriFile(webviewDistPath)],
      };
      (webviewView.webview as any).options = options;

      // 加载 HTML
      this.logger.info('[ViewpointWebviewViewProvider] Loading webview HTML content...');
      const html = this.getWebviewContent(webviewView.webview as any);
      (webviewView.webview as any).html = html;
      this.logger.info('[ViewpointWebviewViewProvider] Webview HTML loaded successfully');

      // 监听 webview 错误
      webviewView.webview.onDidReceiveMessage(
        async (message) => {
          try {
            await this.handleWebviewMessage(webviewView.webview as any, message);
          } catch (error: any) {
            this.logger.error('[ViewpointWebviewViewProvider] Error in message handler', error);
          }
        },
        null,
        this.context.subscriptions
      );

      // 监听编辑器切换事件
      this.setupFileWatcher();

      // 当 webview 被销毁时清理
      webviewView.onDidChangeVisibility(() => {
        this.logger.info(`[ViewpointWebviewViewProvider] Webview visibility changed: ${webviewView.visible}`);
        if (webviewView.visible) {
          // 当视图变为可见时，重新加载关联文件
          this.notifyFileChanged();
        }
      });
      
      this.logger.info('[ViewpointWebviewViewProvider] Webview view resolved successfully');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const errorStack = error?.stack || '';
      this.logger.error('[ViewpointWebviewViewProvider] Failed to resolve webview view', {
        message: errorMessage,
        stack: errorStack,
        error
      });
      
      // 显示错误信息给用户
      const errorHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Viewpoints - Error</title>
            <style>
              body {
                font-family: var(--vscode-font-family);
                padding: 20px;
                color: var(--vscode-foreground);
                background-color: var(--vscode-editor-background);
              }
              .error-container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                background-color: var(--vscode-input-background);
              }
              h2 {
                color: var(--vscode-errorForeground);
                margin-top: 0;
              }
              pre {
                background-color: var(--vscode-textBlockQuote-background);
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="error-container">
              <h2>加载 ArchiTool 面板时出错</h2>
              <p>请检查输出面板中的 ArchiTool 通道以获取详细错误信息。</p>
              <details>
                <summary>错误详情</summary>
                <pre>${this.escapeHtml(errorMessage)}\n${this.escapeHtml(errorStack)}</pre>
              </details>
            </div>
          </body>
        </html>
      `;
      try {
        webviewView.webview.html = errorHtml;
      } catch (htmlError: any) {
        this.logger.error('[ViewpointWebviewViewProvider] Failed to set error HTML', htmlError);
      }
    }
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
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
      // 处理 webview 错误报告
      if (message.method === 'webviewError') {
        this.logger.error('[ViewpointWebviewViewProvider] Webview reported error:', message.params);
        return;
      }

      let result: any;

      switch (message.method) {
        case 'getRelatedFiles':
          result = await this.getRelatedFiles();
          break;

        case 'getTasks':
          result = await this.getTasks();
          break;

        case 'getTaskRelatedFiles':
          result = await this.getTaskRelatedFilesByTaskId(message.params?.taskId);
          break;

        case 'updateTaskRelatedFiles':
          result = await this.updateTaskRelatedFiles(
            message.params?.taskId,
            message.params?.relatedArtifacts,
            message.params?.relatedCodePaths
          );
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

        case 'openSolution':
          await this.openSolution(message.params.taskId);
          result = { success: true };
          break;

        case 'openCreateTaskDialog':
          await this.openCreateTaskDialog();
          result = { success: true };
          break;

        case 'generateStepPrompt':
          result = await this.generateStepPrompt(
            message.params.taskId,
            message.params.stepId,
            message.params.formData || {}
          );
          break;

        case 'saveStepFormData':
          result = await this.saveStepFormData(
            message.params.taskId,
            message.params.stepId,
            message.params.formData || {}
          );
          break;

        case 'goToNextStep':
          result = await this.goToNextStep(
            message.params.taskId,
            message.params.currentStepId
          );
          break;

        case 'goToPreviousStep':
          result = await this.goToPreviousStep(
            message.params.taskId,
            message.params.currentStepId
          );
          break;

        case 'completeTask':
          result = await this.completeTask(
            message.params.taskId,
            message.params.stepId
          );
          break;

        case 'deleteTask':
          result = await this.deleteTask(message.params.taskId);
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
        {
          message: error.message,
          stack: error.stack,
          errorObject: error
        }
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
   * 支持代码文件、文档文件和任务文件
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

    // 判断是否是任务文件（archi-tasks/ 目录下的文件）
    const isTaskFile = relativePath.includes('archi-tasks/') && 
                       (relativePath.endsWith('.yml') || relativePath.endsWith('.yaml'));
    
    // 判断是否是任务方案文件（archi-tasks/ 目录下的 .solution.md 文件）
    const isTaskSolutionFile = relativePath.includes('archi-tasks/') && 
                                relativePath.endsWith('.solution.md');

    if (isTaskFile) {
      // 处理任务文件：获取任务的关联文件
      return await this.getTaskRelatedFiles(relativePath);
    } else if (isTaskSolutionFile) {
      // 处理任务方案文件：找到对应的任务文件（将 .solution.md 替换为 .yml）
      const taskFilePath = relativePath.replace(/\.solution\.md$/, '.yml');
      this.logger.info('[ViewpointWebviewViewProvider] Detected task solution file, using task file', {
        solutionPath: relativePath,
        taskFilePath,
      });
      return await this.getTaskRelatedFiles(taskFilePath);
    }

    // 处理代码文件：获取关联的文档
    // 获取关联的 Artifacts
    // 优先使用 viewpointService，如果不存在则直接使用 artifactService
    let artifactsResult: { success: boolean; value?: any[]; error?: any };
    
    if (this.viewpointService && typeof this.viewpointService.getRelatedArtifacts === 'function') {
      // 使用 ViewpointApplicationService
      artifactsResult = await this.viewpointService.getRelatedArtifacts(relativePath);
    } else {
      // 直接使用 ArtifactApplicationService
      this.logger.info('[ViewpointWebviewViewProvider] Using artifactService.findArtifactsByCodePath directly');
      try {
        const result = await this.artifactService.findArtifactsByCodePath(relativePath);
        artifactsResult = {
          success: result.success,
          value: result.success ? result.value : undefined,
          error: result.success ? undefined : result.error,
        };
      } catch (error: any) {
        this.logger.error('[ViewpointWebviewViewProvider] Error finding artifacts by code path', error);
        artifactsResult = {
          success: false,
          error: error,
        };
      }
    }

    if (!artifactsResult.success || !artifactsResult.value) {
      this.logger.warn('[ViewpointWebviewViewProvider] No related artifacts found', {
        relativePath,
        error: artifactsResult.error,
      });
      return [];
    }

    const artifacts = artifactsResult.value;
    return artifacts.map((artifact: any) => ({
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
   * 从任务文件路径中提取 vaultId 和相对路径
   * 路径格式：archidocs/{vaultId}/archi-tasks/...
   */
  private extractVaultAndPathFromTaskFile(taskFilePath: string): { vaultId: string; relativeTaskPath: string } | null {
    // 使用常量匹配 archidocs/{vaultId}/archi-tasks/... 格式
    const match = taskFilePath.match(new RegExp(`${ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR}/([^/]+)/(.+)`));
    if (match) {
      return {
        vaultId: match[1],
        relativeTaskPath: match[2],
      };
    }
    return null;
  }

  /**
   * 获取任务的关联文件（公共方法）
   * 根据 vaultId 和相对路径获取关联文件
   */
  private async getTaskRelatedFilesByPath(vaultId: string, relativeTaskPath: string): Promise<any[]> {
    try {
      // 获取任务的关联文档和代码路径
      const [artifactsResult, codePathsResult] = await Promise.all([
        this.artifactService.getRelatedArtifacts(vaultId, relativeTaskPath, 'file'),
        this.artifactService.getRelatedCodePaths(vaultId, relativeTaskPath, 'file'),
      ]);

      return await this.buildRelatedFilesList(artifactsResult, codePathsResult, vaultId);
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Failed to get task related files by path', error);
      return [];
    }
  }

  /**
   * 构建关联文件列表（公共方法）
   * 将关联的 artifacts 和 code paths 转换为统一的文件列表格式
   * @param artifactsResult 关联的 artifacts 结果
   * @param codePathsResult 关联的代码路径结果
   * @param defaultVaultId 默认 vaultId，用于处理非 file: 格式的 artifactId
   */
  private async buildRelatedFilesList(
    artifactsResult: { success: boolean; value?: string[]; error?: any },
    codePathsResult: { success: boolean; value?: string[]; error?: any },
    defaultVaultId?: string
  ): Promise<any[]> {
    const relatedFiles: any[] = [];

    // 处理关联的文档
    if (artifactsResult.success && artifactsResult.value && artifactsResult.value.length > 0) {
      for (const artifactId of artifactsResult.value) {
        // artifactId 可能是 file:vaultId:filePath 格式
        if (artifactId.startsWith('file:')) {
          const parts = artifactId.split(':');
          if (parts.length >= 3) {
            const artifactVaultId = parts[1];
            const artifactPath = parts.slice(2).join(':');
            
            // 获取 artifact 详细信息
            const artifactResult = await this.artifactService.getArtifact(artifactVaultId, artifactId);
            if (artifactResult.success && artifactResult.value) {
              const artifact = artifactResult.value;
              relatedFiles.push({
                id: artifact.id,
                name: path.basename(artifact.path),
                path: artifact.path,
                contentLocation: artifact.contentLocation,
                type: artifact.viewType === 'design' ? 'design' : 'document',
                vault: {
                  id: artifact.vault.id,
                  name: artifact.vault.name,
                },
              });
            }
          }
        } else if (defaultVaultId) {
          // 直接是路径，使用默认 vaultId 尝试查找
          const artifactResult = await this.artifactService.getArtifact(defaultVaultId, artifactId);
          if (artifactResult.success && artifactResult.value) {
            const artifact = artifactResult.value;
            relatedFiles.push({
              id: artifact.id,
              name: path.basename(artifact.path),
              path: artifact.path,
              contentLocation: artifact.contentLocation,
              type: artifact.viewType === 'design' ? 'design' : 'document',
              vault: {
                id: artifact.vault.id,
                name: artifact.vault.name,
              },
            });
          }
        } else {
          // 没有默认 vaultId，跳过
          this.logger.warn('[ViewpointWebviewViewProvider] Artifact ID without vault prefix and no default vaultId, skipping', { artifactId });
        }
      }
    }

    // 处理关联的代码路径
    if (codePathsResult.success && codePathsResult.value && codePathsResult.value.length > 0) {
      for (const codePath of codePathsResult.value) {
        relatedFiles.push({
          id: codePath,
          name: path.basename(codePath),
          path: codePath,
          type: 'code',
          vault: undefined,
        });
      }
    }

    return relatedFiles;
  }

  /**
   * 获取任务的关联文件
   * 从任务文件路径中提取信息并获取关联文件
   */
  private async getTaskRelatedFiles(taskFilePath: string): Promise<any[]> {
    const extracted = this.extractVaultAndPathFromTaskFile(taskFilePath);
    if (!extracted) {
      this.logger.warn('[ViewpointWebviewViewProvider] Invalid task file path format', { taskFilePath });
      return [];
    }

    this.logger.info('[ViewpointWebviewViewProvider] Extracted vault and path from task file', {
      taskFilePath,
      vaultId: extracted.vaultId,
      relativeTaskPath: extracted.relativeTaskPath,
    });

    return await this.getTaskRelatedFilesByPath(extracted.vaultId, extracted.relativeTaskPath);
  }

  /**
   * 通过 taskId 获取任务的关联文件
   */
  private async getTaskRelatedFilesByTaskId(taskId: string): Promise<any[]> {
    this.logger.info('[ViewpointWebviewViewProvider] getTaskRelatedFilesByTaskId called', { taskId });
    try {
      // 获取任务列表，找到对应的任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success) {
        this.logger.warn('[ViewpointWebviewViewProvider] Failed to list tasks', tasksResult.error);
        return [];
      }
      if (!tasksResult.value) {
        this.logger.warn('[ViewpointWebviewViewProvider] Tasks list is empty');
        return [];
      }

      this.logger.info('[ViewpointWebviewViewProvider] Found tasks', { count: tasksResult.value.length });
      const task = tasksResult.value.find(t => t.id === taskId);
      if (!task) {
        this.logger.warn('[ViewpointWebviewViewProvider] Task not found', { taskId, availableTaskIds: tasksResult.value.map(t => t.id) });
        return [];
      }

      this.logger.info('[ViewpointWebviewViewProvider] Task found', { taskId, artifactPath: task.artifactPath, vaultId: task.vaultId });

      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        this.logger.warn('[ViewpointWebviewViewProvider] Vault not found', { vaultId: task.vaultId });
        return [];
      }

      // 获取任务的关联文档和代码路径
      this.logger.info('[ViewpointWebviewViewProvider] Getting related artifacts and code paths', {
        vaultId: task.vaultId,
        artifactPath: task.artifactPath,
      });
      const [artifactsResult, codePathsResult] = await Promise.all([
        this.artifactService.getRelatedArtifacts(task.vaultId, task.artifactPath, 'file'),
        this.artifactService.getRelatedCodePaths(task.vaultId, task.artifactPath, 'file'),
      ]);

      this.logger.info('[ViewpointWebviewViewProvider] Related artifacts result', {
        success: artifactsResult.success,
        count: artifactsResult.success ? artifactsResult.value?.length || 0 : 0,
        artifacts: artifactsResult.success ? artifactsResult.value : undefined,
      });
      this.logger.info('[ViewpointWebviewViewProvider] Related code paths result', {
        success: codePathsResult.success,
        count: codePathsResult.success ? codePathsResult.value?.length || 0 : 0,
        codePaths: codePathsResult.success ? codePathsResult.value : undefined,
      });

      const relatedFiles = await this.buildRelatedFilesList(artifactsResult, codePathsResult, task.vaultId);

      this.logger.info('[ViewpointWebviewViewProvider] Returning related files', {
        count: relatedFiles.length,
        files: relatedFiles.map(f => ({ id: f.id, name: f.name, type: f.type })),
      });

      return relatedFiles;
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Failed to get task related files by taskId', error);
      return [];
    }
  }

  /**
   * 更新任务的关联文件
   */
  private async updateTaskRelatedFiles(
    taskId: string,
    relatedArtifacts?: string[],
    relatedCodePaths?: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 获取任务列表，找到对应的任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success) {
        return {
          success: false,
          error: tasksResult.error?.message || 'Failed to list tasks',
        };
      }
      if (!tasksResult.value) {
        return {
          success: false,
          error: 'Tasks list is empty',
        };
      }

      const task = tasksResult.value.find(t => t.id === taskId);
      if (!task) {
        return {
          success: false,
          error: `Task not found: ${taskId}`,
        };
      }

      // 更新关联关系
      const updateResults = await Promise.all([
        relatedArtifacts && relatedArtifacts.length > 0
          ? this.artifactService.updateRelatedArtifacts(
              task.vaultId,
              task.artifactPath,
              'file',
              relatedArtifacts
            )
          : this.artifactService.updateRelatedArtifacts(
              task.vaultId,
              task.artifactPath,
              'file',
              []
            ),
        relatedCodePaths !== undefined
          ? this.artifactService.updateRelatedCodePaths(
              task.vaultId,
              task.artifactPath,
              'file',
              relatedCodePaths || []
            )
          : Promise.resolve({ success: true } as any),
      ]);

      // 检查更新结果
      for (let i = 0; i < updateResults.length; i++) {
        const updateResult = updateResults[i];
        if (!updateResult.success) {
          this.logger.warn('[ViewpointWebviewViewProvider] Failed to update task relations', {
            taskId,
            updateIndex: i,
            error: updateResult.error,
          });
          return {
            success: false,
            error: updateResult.error?.message || 'Failed to update task relations',
          };
        }
      }

      return { success: true };
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Failed to update task related files', error);
      return {
        success: false,
        error: error.message || 'Failed to update task related files',
      };
    }
  }

  /**
   * 获取任务列表
   */
  private async getTasks(): Promise<any[]> {
    const result = await this.taskService.listTasks();
    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to list tasks');
    }
    if (!result.value) {
      return [];
    }

    // 读取每个任务的完整信息，包括 workflow
    const tasks = result.value;
    const tasksWithWorkflow = await Promise.all(
      tasks.map(async (task: any) => {
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
              category: task.category || 'task',
              steps: [],
              currentStep: undefined,
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
            
            // 使用新格式：steps 和 currentStep
            if (taskData && taskData.steps && Array.isArray(taskData.steps)) {
                return {
                  id: task.id,
                  title: task.title,
                  status: task.status,
                  priority: task.priority,
                  dueDate: task.dueDate,
                  artifactId: task.artifactId,
                  artifactPath: task.artifactPath,
                  vaultId: task.vaultId,
                  category: task.category || taskData.category || 'task',
                  steps: taskData.steps,
                  currentStep: taskData.currentStep,
                templateId: taskData.templateId,
                  description: taskData.description || '',
                  createdAt: taskData.createdAt,
                updatedAt: taskData.updatedAt,
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
        category: task.category || 'task',
        steps: [],
        currentStep: undefined,
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
      category: params.category || 'task', // 默认分类为 'task'
    });

    if (!result.success) {
      throw new Error(result.error.message);
    }

    const task = result.value;

    // 如果有关联文件，创建关联关系
    if (params.relatedFiles && params.relatedFiles.length > 0) {
      // 分离文档和代码文件
      // relatedFiles 是字符串数组，可能是：
      // 1. 文档：file:vaultId:filePath 格式的 ID，或者直接的 filePath（需要判断）
      // 2. 代码文件：代码路径
      const relatedArtifacts: string[] = [];
      const relatedCodePaths: string[] = [];

      for (const fileIdOrPath of params.relatedFiles) {
        // 判断是否是文档 ID 格式：file:vaultId:filePath
        if (fileIdOrPath.startsWith('file:')) {
          relatedArtifacts.push(fileIdOrPath);
        } else {
          // 尝试通过 artifactService 查找，判断是否是文档
          // 如果是代码路径，直接添加到 relatedCodePaths
          // 这里简化处理：如果路径不包含 .architool/，认为是代码路径
          // 更准确的方法是尝试在所有 vault 中查找该路径
          const isCodePath = !fileIdOrPath.includes('.architool/');
          if (isCodePath) {
            relatedCodePaths.push(fileIdOrPath);
          } else {
            // 可能是文档路径，尝试查找对应的 artifact
            // 这里简化处理，直接作为 artifact ID 处理
            relatedArtifacts.push(fileIdOrPath);
          }
        }
      }

      this.logger.info('[ViewpointWebviewViewProvider] Saving task relations', {
        taskId: task.id,
        taskPath: task.artifactPath,
        relatedArtifactsCount: relatedArtifacts.length,
        relatedCodePathsCount: relatedCodePaths.length,
      });

      // 保存关联关系
      const updateResults = await Promise.all([
        relatedArtifacts.length > 0
          ? this.artifactService.updateRelatedArtifacts(
              vaultId,
              task.artifactPath,  // 使用任务文件路径
              'file',  // 使用 'file' 类型
              relatedArtifacts
            )
          : Promise.resolve({ success: true } as any),
        relatedCodePaths.length > 0
          ? this.artifactService.updateRelatedCodePaths(
              vaultId,
              task.artifactPath,  // 使用任务文件路径
              'file',  // 使用 'file' 类型
              relatedCodePaths
            )
          : Promise.resolve({ success: true } as any),
      ]);

      // 检查更新结果
      for (let i = 0; i < updateResults.length; i++) {
        const updateResult = updateResults[i];
        if (!updateResult.success) {
          this.logger.warn('[ViewpointWebviewViewProvider] Failed to save task relations', {
            taskId: task.id,
            updateIndex: i,
            error: updateResult.error,
          });
        }
      }
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
    if (!result.value) {
      return [];
    }

    const templates = result.value;
    this.logger.info(`[ViewpointWebviewViewProvider] getTaskTemplates returned ${templates.length} templates`);
    
    const mappedTemplates = templates.map((template: any) => ({
      id: template.id,
      name: template.name,
      description: template.description,
    }));
    
    this.logger.info(`[ViewpointWebviewViewProvider] Mapped templates:`, mappedTemplates.map((t: any) => `${t.id} (${t.name})`).join(', '));
    
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

    return result.value.map((vault: any) => ({
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
    if (!taskResult.success || !taskResult.value) {
      throw new Error('Failed to get task');
    }

    const tasks = taskResult.value;
    const task = tasks.find((t: any) => t.id === taskId);
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
   * 打开任务方案文件
   * 如果方案文件不存在，会自动创建
   */
  private async openSolution(taskId: string): Promise<void> {
    try {
      // 获取任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success || !tasksResult.value) {
        throw new Error('Failed to get task list');
      }

      const task = tasksResult.value.find((t: any) => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // 获取 vault
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        throw new Error(`Vault not found: ${task.vaultId}`);
      }
      const vaultRef = { id: vaultResult.value.id, name: vaultResult.value.name };

      // 构建方案文件路径（将 .yml 或 .yaml 替换为 .solution.md）
      const solutionPath = task.artifactPath
        .replace(/\.yml$/, '.solution.md')
        .replace(/\.yaml$/, '.solution.md');

      // 检查方案文件是否存在
      const existsResult = await this.artifactService.exists(vaultRef, solutionPath);
      if (!existsResult.success) {
        this.logger.error('Failed to check solution file existence', { solutionPath, error: existsResult.error });
        throw new Error('Failed to check solution file existence');
      }

      // 如果方案文件不存在，自动创建
      if (!existsResult.value) {
        this.logger.info('Solution file not found, creating it', { solutionPath, taskId });
        
        // 读取任务 YAML 文件以获取任务标题和步骤信息
        const readResult = await this.artifactService.readFile(vaultRef, task.artifactPath);
        if (!readResult.success) {
          throw new Error('Failed to read task file');
        }

        const taskData = yaml.load(readResult.value) as any;
        if (!taskData) {
          throw new Error('Invalid task file');
        }

        // 生成方案文件内容
        const taskTitle = taskData.title || task.title || '任务方案';
        const steps = taskData.steps || [];
        const solutionContent = this.generateSolutionContent(taskTitle, steps);

        // 创建方案文件
        const writeResult = await this.artifactService.writeFile(vaultRef, solutionPath, solutionContent);
        if (!writeResult.success) {
          this.logger.error('Failed to create solution file', { solutionPath, error: writeResult.error });
          throw new Error('Failed to create solution file');
        }

        this.logger.info('Solution file created successfully', { solutionPath, taskId });
      }

      // 使用 openFile 方法打开方案文件
      await this.openFile({
        filePath: solutionPath,
        vaultId: task.vaultId,
      });
    } catch (error: any) {
      this.logger.error('Failed to open solution', { taskId, error });
      throw new Error(error?.message || 'Failed to open solution');
    }
  }

  /**
   * 生成任务方案文件的初始内容
   */
  private generateSolutionContent(taskTitle: string, steps: any[]): string {
    let content = `# ${taskTitle} 方案\n\n`;
    
    // 为每个步骤生成章节占位符
    if (steps && steps.length > 0) {
      steps.forEach((step, index) => {
        const stepTitle = step.form?.title || step.id || `步骤 ${index + 1}`;
        content += `## ${stepTitle}\n\n`;
        content += `<!-- 在此处添加 ${stepTitle} 的内容 -->\n\n`;
      });
    } else {
      content += `## 任务说明\n\n`;
      content += `<!-- 在此处添加任务说明 -->\n\n`;
    }
    
    return content;
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
        // 假设 archidocs 在工作区根目录下
        const architoolRoot = path.join(workspaceFolder.uri.fsPath, ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR);
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
    const htmlPath = path.join(webviewDistPath, 'index.html');

    if (!fs.existsSync(htmlPath)) {
      vscode.window.showErrorMessage('创建任务弹窗未构建，请先运行: cd packages/webview && pnpm build');
      return;
    }

    // 获取当前选中的 vault，只选择 task 或 document 类型的 vault
    const vaultsResult = await this.vaultService.listVaults();
    let initialVaultId: string | undefined;
    if (vaultsResult.success && vaultsResult.value.length > 0) {
      // 过滤出 task 或 document 类型的 vault
      const validVaults = vaultsResult.value.filter(
        v => v.type === 'task' || v.type === 'document'
      );
      
      if (validVaults.length > 0) {
        // 优先选择 task 类型的 vault，如果没有则选择 document 类型
        const taskVault = validVaults.find(v => v.type === 'task');
        initialVaultId = taskVault ? taskVault.id : validVaults[0].id;
      }
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

    // 使用统一的 IDE API 注入工具（支持多 IDE）
    html = injectIDEAPIScript(html, 'vscode', {
      view: 'create-task-dialog',
      vaultId: initialVaultId,
    });

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
          // 在任务创建对话框中，支持 task 和 document 类型的 vault
          const params = message.params || {};
          
          // 如果指定了 vaultId，验证 vault 类型
          if (params.vaultId) {
            const vaultResult = await this.vaultService.getVault(params.vaultId);
            if (vaultResult.success && vaultResult.value) {
              // 支持 task 和 document 类型的 vault（任务创建对话框需要）
              if (vaultResult.value.type !== 'document' && vaultResult.value.type !== 'task') {
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

            const items = result.value.map((item: any) => ({
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
          // 获取工作区文件列表（支持查询，包含文件和文件夹）
          try {
            const params = message.params || {};
            const query = params.query?.trim().toLowerCase() || '';
            
            // 获取工作区文件夹
            const workspaceFolders = this.ideAdapter.getWorkspaceFolders();
            if (!workspaceFolders || workspaceFolders.length === 0) {
              panel.webview.postMessage({
                id: message.id,
                method: message.method,
                result: [],
              });
              return;
            }

            // 递归遍历文件夹，获取所有文件和文件夹
            const allItems: any[] = [];
            const maxResults = 10000;
            const excludePatterns = ['node_modules', '.git', '.architool'];
            
            // 递归遍历函数
            const traverseDirectory = async (dirPath: string, basePath: string, relativeBase: string): Promise<void> => {
              try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                  // 检查是否应该排除
                  if (excludePatterns.includes(entry.name)) {
                    continue;
                  }
                  
                  const fullPath = path.join(dirPath, entry.name);
                  const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');
                  
                  // 如果有关键词，进行过滤
                  if (query && !relativePath.toLowerCase().includes(query)) {
                    // 如果是文件夹，仍然需要递归检查子项
                    if (entry.isDirectory()) {
                      await traverseDirectory(fullPath, basePath, relativePath);
                    }
                    continue;
                  }
                  
                  // 检查是否超过最大结果数
                  if (allItems.length >= maxResults) {
                    return;
                  }
                  
                  const fileName = entry.name;
                  const itemType = entry.isDirectory() ? 'folder' : 'file';
                  
                  allItems.push({
                    id: relativePath,
                    path: relativePath,
                    name: fileName,
                    title: itemType === 'file' ? fileName.replace(/\.[^/.]+$/, '') : fileName,
                    type: itemType,
                  });
                  
                  // 如果是文件夹，递归遍历
                  if (entry.isDirectory()) {
                    await traverseDirectory(fullPath, basePath, relativePath);
                  }
                }
              } catch (error: any) {
                // 忽略权限错误等
                this.logger.debug(`Failed to traverse directory: ${dirPath}`, error);
              }
            };

            // 遍历所有工作区文件夹
            for (const folder of workspaceFolders) {
              try {
                const folderPath = folder.uri.fsPath;
                await traverseDirectory(folderPath, folderPath, '');
              } catch (error: any) {
                this.logger.warn(`Failed to list files in workspace folder: ${folder.uri}`, error);
              }
            }

            // 排序：文件夹在前，文件在后，都按路径排序
            allItems.sort((a, b) => {
              if (a.type === 'folder' && b.type === 'file') return -1;
              if (a.type === 'file' && b.type === 'folder') return 1;
              return a.path.localeCompare(b.path);
            });

            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              result: allItems,
            });
          } catch (error: any) {
            this.logger.error('[ViewpointWebviewViewProvider] Failed to list workspace files', error);
            panel.webview.postMessage({
              id: message.id,
              method: message.method,
              error: {
                code: -1,
                message: error.message,
              },
            });
          }
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
    try {
      const webviewDistPath = this.getWebviewDistPath();
        const htmlPath = path.join(webviewDistPath, 'index.html');

      this.logger.info(`[ViewpointWebviewViewProvider] Reading HTML from: ${htmlPath}`);

      if (!fs.existsSync(htmlPath)) {
        this.logger.warn(`[ViewpointWebviewViewProvider] HTML file not found: ${htmlPath}`);
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
                <p>请先运行 <code>cd packages/webview && pnpm build</code> 构建 webview</p>
                <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">
                  预期路径: ${htmlPath}
                </p>
              </div>
            </body>
          </html>
        `;
      }

      let html = fs.readFileSync(htmlPath, 'utf-8');
      this.logger.info(`[ViewpointWebviewViewProvider] HTML file read successfully, length: ${html.length}`);

      // 注入视图名称到 initialData
      const initialDataScript = `
        <script>
          if (!window.initialData) {
            window.initialData = {};
          }
          window.initialData.view = 'viewpoint-panel';
        </script>
      `;
      html = html.replace('</head>', `${initialDataScript}</head>`);

      // 替换资源路径为 webview URI
      let resourceReplaceCount = 0;
      let missingResourceCount = 0;
      const missingResources: string[] = [];

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
            resourceReplaceCount++;
            return `${attr}="${resourceUri}"`;
          } else {
            missingResourceCount++;
            missingResources.push(resourcePath);
            this.logger.warn(`[ViewpointWebviewViewProvider] Resource not found: ${resourcePath} (resolved to: ${resourceFile})`);
            return match; // 保持原路径，但可能会404
          }
        }
      );

      if (missingResourceCount > 0) {
        this.logger.warn(`[ViewpointWebviewViewProvider] ${missingResourceCount} resources not found:`, missingResources.slice(0, 10));
      }
      this.logger.info(`[ViewpointWebviewViewProvider] Resource replacement: ${resourceReplaceCount} replaced, ${missingResourceCount} missing`);

      // 使用统一的 IDE API 注入工具（支持多 IDE）
      html = injectIDEAPIScript(html, 'vscode');

      return html;
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Error in getWebviewContent', error);
      throw error;
    }
  }

  /**
   * 获取 Webview 构建路径
   */
  private getWebviewDistPath(): string {
    try {
      const extensionPath = this.context.extensionPath;
      const webviewPathInExtension = path.join(extensionPath, 'dist', 'webview');
      const webviewPathInSource = path.join(extensionPath, '..', 'webview', 'dist');
      
      const existsInExtension = fs.existsSync(webviewPathInExtension);
      const existsInSource = fs.existsSync(webviewPathInSource);
      
      this.logger.info(`[ViewpointWebviewViewProvider] Webview paths - Extension: ${webviewPathInExtension} (exists: ${existsInExtension}), Source: ${webviewPathInSource} (exists: ${existsInSource})`);
      
      if (existsInExtension) {
        return webviewPathInExtension;
      } else if (existsInSource) {
        return webviewPathInSource;
      } else {
        this.logger.warn(`[ViewpointWebviewViewProvider] Neither webview path exists, using extension path as fallback`);
        return webviewPathInExtension;
      }
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Error getting webview dist path', error);
      // 返回一个默认路径，即使可能不存在
      return path.join(this.context.extensionPath, 'dist', 'webview');
    }
  }

  /**
   * 生成步骤提示词
   * 使用与创建文件提示词生成一致的逻辑
   */
  private async generateStepPrompt(
    taskId: string,
    stepId: string,
    formData: Record<string, any>
  ): Promise<string> {
    try {
      // 获取任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success || !tasksResult.value) {
        throw new Error('Failed to get task list');
      }

      const task = tasksResult.value.find((t: any) => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        throw new Error(`Vault not found: ${task.vaultId}`);
      }

      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };
      
      // 读取任务文件，获取步骤定义
      const readResult = await this.artifactService.readFile(vaultRef, task.artifactPath);
      if (!readResult.success) {
        throw new Error('Failed to read task file');
      }

      const taskData = yaml.load(readResult.value) as any;
      if (!taskData) {
        throw new Error('Invalid task file');
      }

      // 使用 steps 格式
      if (!taskData.steps || !Array.isArray(taskData.steps)) {
        throw new Error('Task does not have steps');
      }

      const stepDefinition = taskData.steps.find((s: any) => s.id === stepId);
      if (!stepDefinition) {
        throw new Error(`Step not found: ${stepId}`);
      }

      // 获取步骤的 prompt 模板
      const promptTemplate = stepDefinition.prompt;
      if (!promptTemplate) {
        throw new Error(`Step ${stepId} does not have a prompt template`);
      }

      // 构建方案路径（从 archidocs 开始）
      const solutionFileName = task.artifactPath.replace(/\.yml$/, '.solution.md').replace(/\.yaml$/, '.solution.md');
      const solutionPath = `${ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR}/${task.vaultId}/${solutionFileName}`;

      // 确保 formData 是可序列化的（深拷贝并移除不可序列化的属性）
      const serializableFormData = this.sanitizeForSerialization(formData || {});

      // 将 formData 转换为适合 Jinja2 循环的格式（数组格式，每个元素包含 key 和 value）
      // 这样模板可以使用 {% for item in formDataItems %} {{ item.key }}: {{ item.value }}
      const formDataForTemplate = Object.entries(serializableFormData).map(([key, value]) => ({
        key,
        value: typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value || '')
      }));

      // 调试日志
      this.logger.info('FormData for template', {
        originalFormData: formData,
        serializableFormData,
        formDataForTemplate,
        formDataEntriesCount: formDataForTemplate.length
      });

      // 获取任务的关联文件
      this.logger.info('[ViewpointWebviewViewProvider] Getting related files for prompt generation', {
        taskId,
        vaultId: task.vaultId,
        artifactPath: task.artifactPath,
      });
      const relatedFiles = await this.getTaskRelatedFilesByPath(task.vaultId, task.artifactPath);
      
      this.logger.info('[ViewpointWebviewViewProvider] Related files retrieved', {
        count: relatedFiles.length,
        files: relatedFiles.map(f => ({ id: f.id, name: f.name, type: f.type })),
      });
      
      // 将关联文件转换为适合模板使用的格式
      const relatedFilesForTemplate = relatedFiles.map(file => ({
        id: file.id,
        name: file.name,
        path: file.path,
        type: file.type, // 'document', 'design', 'code'
        vaultId: file.vault?.id,
        vaultName: file.vault?.name,
        contentLocation: file.contentLocation,
      }));

      // 分离不同类型的关联文件
      const relatedDocuments = relatedFilesForTemplate.filter(f => f.type === 'document');
      const relatedDesigns = relatedFilesForTemplate.filter(f => f.type === 'design');
      const relatedCodePaths = relatedFilesForTemplate.filter(f => f.type === 'code').map(f => f.path);

      this.logger.info('[ViewpointWebviewViewProvider] Related files categorized', {
        documents: relatedDocuments.length,
        designs: relatedDesigns.length,
        codePaths: relatedCodePaths.length,
      });

      // 确保 task 对象是可序列化的
      const serializableTask = {
        id: String(taskData.id || taskId),
        name: String(taskData.name || task.title || ''),
        description: String(taskData.description || ''),
        vaultId: String(task.vaultId),
        solutionPath: String(solutionPath),
      };

      // 将 prompt 模板转换为 Artifact 对象（与创建文件的逻辑一致）
      // 将 context 中的信息合并到 artifact 中
      const stepTitle = stepDefinition.form?.title || stepId;
      const artifact: Artifact = {
        id: `${taskId}-${stepId}`,
        vault: vaultRef,
        nodeType: 'FILE',
        path: task.artifactPath,
        name: stepTitle,
        format: 'md',
        contentLocation: '',
        viewType: 'document',
        title: stepTitle,
        description: stepTitle,
        content: promptTemplate, // 模板内容放在 content 字段中
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'draft',
        // 自定义上下文信息（task, formData, solutionPath, relatedFiles 等）
        custom: {
        task: serializableTask,
        formData: serializableFormData, // 保持对象格式，Jinja2 应该支持 {% for key, value in formData.items() %}
        formDataItems: formDataForTemplate, // 数组格式，用于 {% for item in formDataItems %}
        solutionPath: String(solutionPath),
        relatedFiles: relatedFilesForTemplate, // 所有关联文件
        relatedDocuments: relatedDocuments, // 关联的文档
        relatedDesigns: relatedDesigns, // 关联的设计
        relatedCodePaths: relatedCodePaths, // 关联的代码路径（字符串数组）
        },
      };

      // 使用 fileOperationService.renderTemplate 渲染模板（与创建文件的逻辑一致）
      const rendered = this.fileOperationService.renderTemplate(artifact);

      // 确保返回的是纯字符串，并且可序列化
      const renderedStr = String(rendered || '').trim();
      
      // 验证可以序列化
      try {
        JSON.stringify(renderedStr);
        return renderedStr;
      } catch (e) {
        this.logger.warn('Rendered prompt is not serializable, using empty string', { rendered });
        return '';
      }
    } catch (error: any) {
      this.logger.error('Failed to generate step prompt', { taskId, stepId, error });
      const errorMessage = error?.message || String(error) || 'Failed to generate prompt';
      throw new Error(errorMessage);
    }
  }

  /**
   * 保存步骤表单数据
   */
  private async saveStepFormData(
    taskId: string,
    stepId: string,
    formData: Record<string, any>
  ): Promise<{ success: boolean }> {
    try {
      // 获取任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success || !tasksResult.value) {
        throw new Error('Failed to get task list');
      }

      const task = tasksResult.value.find((t: any) => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        throw new Error(`Vault not found: ${task.vaultId}`);
      }

      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };
      
      // 读取任务文件
      const readResult = await this.artifactService.readFile(vaultRef, task.artifactPath);
      if (!readResult.success) {
        throw new Error('Failed to read task file');
      }

      const taskData = yaml.load(readResult.value) as any;
      if (!taskData) {
        throw new Error('Invalid task file');
      }

      // 更新步骤的表单数据
      if (!taskData.steps || !Array.isArray(taskData.steps)) {
        throw new Error('Task does not have steps');
      }
      
      const stepIndex = taskData.steps.findIndex((s: any) => s.id === stepId);
      if (stepIndex === -1) {
        throw new Error(`Step not found: ${stepId}`);
      }
      taskData.steps[stepIndex].formData = this.sanitizeForSerialization(formData || {});
      
      // 更新任务的 updatedAt
      taskData.updatedAt = new Date().toISOString();

      // 保存回文件
      const content = yaml.dump(taskData, { indent: 2, lineWidth: -1 });
      const writeResult = await this.artifactService.writeFile(vaultRef, task.artifactPath, content);
      
      if (!writeResult.success) {
        throw new Error('Failed to write task file');
      }

      // 通知任务已变更
      await this.notifyTaskChanged();

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to save step form data', { taskId, stepId, error });
      throw new Error(error?.message || 'Failed to save step form data');
    }
  }

  /**
   * 切换到下一步
   */
  private async goToNextStep(
    taskId: string,
    currentStepId: string
  ): Promise<{ success: boolean; nextStepId?: string }> {
    try {
      // 获取任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success || !tasksResult.value) {
        throw new Error('Failed to get task list');
      }

      const task = tasksResult.value.find((t: any) => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        throw new Error(`Vault not found: ${task.vaultId}`);
      }

      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };
      
      // 读取任务文件
      const readResult = await this.artifactService.readFile(vaultRef, task.artifactPath);
      if (!readResult.success) {
        throw new Error('Failed to read task file');
      }

      const taskData = yaml.load(readResult.value) as any;
      if (!taskData) {
        throw new Error('Invalid task file');
      }

      // 使用 steps 格式
      if (!taskData.steps || !Array.isArray(taskData.steps)) {
        throw new Error('Task does not have steps');
      }

      const steps = taskData.steps;
      const currentStepIndex = steps.findIndex((s: any) => s.id === currentStepId);
      if (currentStepIndex === -1) {
        throw new Error(`Current step not found: ${currentStepId}`);
      }

      // 检查是否有下一步
      if (currentStepIndex >= steps.length - 1) {
        throw new Error('No next step available');
      }

      // 更新当前步骤状态为 completed
      steps[currentStepIndex].status = 'completed';
      if (!steps[currentStepIndex].completedAt) {
        steps[currentStepIndex].completedAt = new Date().toISOString();
      }

      // 更新下一步状态为 in-progress
      const nextStepIndex = currentStepIndex + 1;
      steps[nextStepIndex].status = 'in-progress';
      if (!steps[nextStepIndex].startedAt) {
        steps[nextStepIndex].startedAt = new Date().toISOString();
      }

      // 更新 currentStep
      taskData.currentStep = steps[nextStepIndex].id;
      
      // 更新任务的 updatedAt
      taskData.updatedAt = new Date().toISOString();

      // 保存回文件
      const content = yaml.dump(taskData, { indent: 2, lineWidth: -1 });
      const writeResult = await this.artifactService.writeFile(vaultRef, task.artifactPath, content);
      
      if (!writeResult.success) {
        throw new Error('Failed to write task file');
      }

      // 通知任务已变更
      await this.notifyTaskChanged();

      return { success: true, nextStepId: taskData.currentStep };
    } catch (error: any) {
      this.logger.error('Failed to go to next step', { taskId, currentStepId, error });
      throw new Error(error?.message || 'Failed to go to next step');
    }
  }

  /**
   * 切换到上一步
   */
  private async goToPreviousStep(
    taskId: string,
    currentStepId: string
  ): Promise<{ success: boolean; prevStepId?: string }> {
    try {
      // 获取任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success || !tasksResult.value) {
        throw new Error('Failed to get task list');
      }

      const task = tasksResult.value.find((t: any) => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        throw new Error(`Vault not found: ${task.vaultId}`);
      }

      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };
      
      // 读取任务文件
      const readResult = await this.artifactService.readFile(vaultRef, task.artifactPath);
      if (!readResult.success) {
        throw new Error('Failed to read task file');
      }

      const taskData = yaml.load(readResult.value) as any;
      if (!taskData) {
        throw new Error('Invalid task file');
      }

      // 使用 steps 格式
      if (!taskData.steps || !Array.isArray(taskData.steps)) {
        throw new Error('Task does not have steps');
      }

      const steps = taskData.steps;
      const currentStepIndex = steps.findIndex((s: any) => s.id === currentStepId);
      if (currentStepIndex === -1) {
        throw new Error(`Current step not found: ${currentStepId}`);
      }

      // 检查是否有上一步
      if (currentStepIndex <= 0) {
        throw new Error('No previous step available');
      }

      // 更新当前步骤状态为 pending（如果之前是 in-progress）
      if (steps[currentStepIndex].status === 'in-progress') {
        steps[currentStepIndex].status = 'pending';
        // 移除 startedAt（如果存在）
        if (steps[currentStepIndex].startedAt) {
          delete steps[currentStepIndex].startedAt;
        }
      }

      // 更新上一步状态为 in-progress
      const prevStepIndex = currentStepIndex - 1;
      steps[prevStepIndex].status = 'in-progress';
      if (!steps[prevStepIndex].startedAt) {
        steps[prevStepIndex].startedAt = new Date().toISOString();
      }
      // 如果上一步之前是 completed，移除 completedAt
      if (steps[prevStepIndex].completedAt) {
        delete steps[prevStepIndex].completedAt;
      }

      // 更新 currentStep
      taskData.currentStep = steps[prevStepIndex].id;
      
      // 更新任务的 updatedAt
      taskData.updatedAt = new Date().toISOString();

      // 保存回文件
      const content = yaml.dump(taskData, { indent: 2, lineWidth: -1 });
      const writeResult = await this.artifactService.writeFile(vaultRef, task.artifactPath, content);
      
      if (!writeResult.success) {
        throw new Error('Failed to write task file');
      }

      // 通知任务已变更
      await this.notifyTaskChanged();

      return { success: true, prevStepId: taskData.currentStep };
    } catch (error: any) {
      this.logger.error('Failed to go to previous step', { taskId, currentStepId, error });
      throw new Error(error?.message || 'Failed to go to previous step');
    }
  }

  /**
   * 完成任务
   */
  private async completeTask(
    taskId: string,
    stepId: string
  ): Promise<{ success: boolean }> {
    try {
      // 获取任务
      const tasksResult = await this.taskService.listTasks();
      if (!tasksResult.success || !tasksResult.value) {
        throw new Error('Failed to get task list');
      }

      const task = tasksResult.value.find((t: any) => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // 获取 vault 信息
      const vaultResult = await this.vaultService.getVault(task.vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        throw new Error(`Vault not found: ${task.vaultId}`);
      }

      const vault = vaultResult.value;
      const vaultRef = { id: vault.id, name: vault.name };
      
      // 读取任务文件
      const readResult = await this.artifactService.readFile(vaultRef, task.artifactPath);
      if (!readResult.success) {
        throw new Error('Failed to read task file');
      }

      const taskData = yaml.load(readResult.value) as any;
      if (!taskData) {
        throw new Error('Invalid task file');
      }

      // 使用 steps 格式
      if (!taskData.steps || !Array.isArray(taskData.steps)) {
        throw new Error('Task does not have steps');
      }

      const steps = taskData.steps;
      const currentStepIndex = steps.findIndex((s: any) => s.id === stepId);
      if (currentStepIndex === -1) {
        throw new Error(`Step not found: ${stepId}`);
      }

      // 检查是否是最后一个步骤
      if (currentStepIndex !== steps.length - 1) {
        throw new Error('Can only complete the last step');
      }

      // 更新当前步骤状态为 completed
      steps[currentStepIndex].status = 'completed';
      if (!steps[currentStepIndex].completedAt) {
        steps[currentStepIndex].completedAt = new Date().toISOString();
      }

      // 更新任务状态为 completed
      taskData.status = 'completed';
      
      // 更新任务的 updatedAt
      taskData.updatedAt = new Date().toISOString();

      // 保存回文件
      const content = yaml.dump(taskData, { indent: 2, lineWidth: -1 });
      const writeResult = await this.artifactService.writeFile(vaultRef, task.artifactPath, content);
      
      if (!writeResult.success) {
        throw new Error('Failed to write task file');
      }

      // 通知任务已变更
      await this.notifyTaskChanged();

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to complete task', { taskId, stepId, error });
      throw new Error(error?.message || 'Failed to complete task');
    }
  }

  /**
   * 通知 webview 任务已变更
   */
  private async notifyTaskChanged(): Promise<void> {
    if (!this.webviewView?.visible) {
      return;
    }

    try {
      // 发送任务变更事件
      this.webviewView.webview.postMessage({
        method: 'taskChanged',
        params: {},
      });
    } catch (error: any) {
      this.logger.error('[ViewpointWebviewViewProvider] Failed to notify task changed', error);
    }
  }

  /**
   * 删除任务
   */
  private async deleteTask(taskId: string): Promise<{ success: boolean }> {
    try {
      const result = await this.taskService.deleteTask(taskId);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to delete task');
      }

      // 通知任务已变更
      await this.notifyTaskChanged();

      return { success: true };
    } catch (error: any) {
      this.logger.error('Failed to delete task', { taskId, error });
      throw new Error(error?.message || 'Failed to delete task');
    }
  }

  /**
   * 清理对象，移除不可序列化的属性
   */
  private sanitizeForSerialization(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeForSerialization(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const value = obj[key];
          // 跳过函数、Symbol 等不可序列化的值
          if (typeof value !== 'function' && typeof value !== 'symbol') {
            try {
              // 尝试序列化以验证是否可序列化
              JSON.stringify(value);
              sanitized[key] = this.sanitizeForSerialization(value);
            } catch (e) {
              // 如果无法序列化，转换为字符串
              sanitized[key] = String(value);
            }
          }
        }
      }
      return sanitized;
    }

    // 其他类型转换为字符串
    return String(obj);
  }
}
