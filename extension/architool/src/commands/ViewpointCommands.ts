import * as vscode from 'vscode';
import { ViewpointWebviewViewProvider, ViewpointApplicationService, TaskApplicationService, AIApplicationService } from '../views/ViewpointWebviewViewProvider';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { Logger } from '../core/logger/Logger';

/**
 * 视点模块命令
 */
export class ViewpointCommands {
  constructor(
    private viewpointService: ViewpointApplicationService,
    private vaultService: VaultApplicationService,
    private artifactService: ArtifactApplicationService,
    private taskService: TaskApplicationService,
    private aiService: AIApplicationService,
    private logger: Logger,
    private context: vscode.ExtensionContext
  ) {}

  /**
   * 注册所有命令和 WebviewView
   */
  registerCommands(context: vscode.ExtensionContext): void {
    try {
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
    } catch (error: any) {
      this.logger.error('[ViewpointCommands] Failed to register WebviewView provider', {
        message: error.message,
        stack: error.stack,
        errorObject: error
      });
      throw error;
    }

    // 创建自定义视点
    const createViewpointCommand = vscode.commands.registerCommand(
      'archi.viewpoint.create',
      async () => {
        vscode.window.showInformationMessage('archi.viewpoint.create - 待实现（需要完整的 ViewpointApplicationService）');
      }
    );

    context.subscriptions.push(createViewpointCommand);
  }
}
