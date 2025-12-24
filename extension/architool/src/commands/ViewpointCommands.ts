import * as vscode from 'vscode';
import { ViewpointWebviewViewProvider, ViewpointApplicationService, AIApplicationService } from '../views/ViewpointWebviewViewProvider';
import { TaskApplicationService } from '../modules/task/application/TaskApplicationService';
import { VaultApplicationService } from '../modules/shared/application/VaultApplicationService';
import { ArtifactApplicationService } from '../modules/shared/application/ArtifactApplicationService';
import { FileOperationDomainService } from '../modules/shared/domain/services/FileOperationDomainService';
import { Logger } from '../core/logger/Logger';
import { IDEAdapter } from '../core/ide-api/ide-adapter';

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
    private fileOperationService: FileOperationDomainService,
    private logger: Logger,
    private context: vscode.ExtensionContext,
    private ideAdapter: IDEAdapter
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
        this.fileOperationService,
        this.logger,
        this.context,
        this.ideAdapter
      );

      const disposable = this.ideAdapter.registerWebviewViewProvider(
        'architool.viewpointView',
        webviewViewProvider,
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        }
      );
      
      this.logger.info('[ViewpointCommands] WebviewView provider registered successfully');
      this.ideAdapter.subscribe(disposable);
    } catch (error: any) {
      this.logger.error('[ViewpointCommands] Failed to register WebviewView provider', {
        message: error.message,
        stack: error.stack,
        errorObject: error
      });
      throw error;
    }

    // 创建自定义视点
    const createViewpointCommand = this.ideAdapter.registerCommand(
      'archi.viewpoint.create',
      async () => {
        this.ideAdapter.showInformationMessage('archi.viewpoint.create - 待实现（需要完整的 ViewpointApplicationService）');
      }
    );

    this.ideAdapter.subscribe(createViewpointCommand);
  }
}
