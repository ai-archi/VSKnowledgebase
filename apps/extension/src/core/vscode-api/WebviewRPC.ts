import * as vscode from 'vscode';
import { Logger } from '../logger/Logger';
import { VaultApplicationService } from '../../modules/shared/application/VaultApplicationService';
import { DocumentApplicationService } from '../../modules/document/application/DocumentApplicationService';
import { TemplateApplicationService } from '../../modules/template/application/TemplateApplicationService';
import { ArtifactFileSystemApplicationService } from '../../modules/shared/application/ArtifactFileSystemApplicationService';
import { CodeFileSystemApplicationService } from '../../modules/shared/application/CodeFileSystemApplicationService';
import { WebviewAdapter, WebviewMessage } from './WebviewAdapter';

/**
 * Webview RPC 服务
 * 统一管理所有 Webview 与 Extension 后端的 RPC 方法
 */
export class WebviewRPC {
  private webviewAdapter: WebviewAdapter;

  constructor(
    private logger: Logger,
    private vaultService: VaultApplicationService,
    private documentService: DocumentApplicationService,
    private templateService: TemplateApplicationService,
    private artifactService: ArtifactFileSystemApplicationService,
    private codeFileService: CodeFileSystemApplicationService
  ) {
    this.webviewAdapter = new WebviewAdapter(logger);
    this.registerAllMethods();
  }

  /**
   * 获取 WebviewAdapter 实例
   */
  getAdapter(): WebviewAdapter {
    return this.webviewAdapter;
  }

  /**
   * 注册全局消息处理器（用于处理来自任何 webview 的消息）
   * 这个方法应该在 extension 激活时调用
   */
  registerGlobalMessageHandler(context: vscode.ExtensionContext): void {
    // 监听所有 webview 的消息
    // 注意：VSCode 没有直接的全局 webview 消息监听器
    // 我们需要在每个 webview 创建时注册消息处理器
    // 这里提供一个辅助方法来设置消息处理器
    this.logger.info('Global webview message handler registered');
  }

  /**
   * 为指定的 webview 设置消息处理器
   * 这个方法应该在创建 webview 时调用
   */
  setupWebviewMessageHandler(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        await this.webviewAdapter['handleMessage'](webview, message);
      },
      null,
      []
    );
  }

  /**
   * 注册所有 RPC 方法
   */
  private registerAllMethods(): void {
    // Vault 相关方法
    this.webviewAdapter.registerMethod('vault.list', async () => {
      const result = await this.vaultService.listVaults();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value.map(v => ({
        id: v.id,
        name: v.name,
        description: v.description,
      }));
    });

    // Document 相关方法（不限制文件类型，支持查询）
    this.webviewAdapter.registerMethod('document.list', async (params: { vaultId?: string; query?: string }) => {
      this.logger.debug('document.list handler called', { vaultId: params.vaultId, query: params.query });
      this.logger.info(`[DEBUG] document.list - artifactService type: ${this.artifactService.constructor.name}`);
      // 调用应用服务层处理业务逻辑
      this.logger.info(`[DEBUG] document.list - calling listFilesAndFolders with vaultId: ${params.vaultId}, query: ${params.query}`);
      const result = await this.artifactService.listFilesAndFolders(params.vaultId, {
        query: params.query,
      });
      this.logger.info(`[DEBUG] document.list - listFilesAndFolders returned, success: ${result.success}`);
      
      if (!result.success) {
        throw new Error(result.error.message);
      }

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

      return items;
    });

    this.webviewAdapter.registerMethod('document.create', async (params: {
      vaultId: string;
      path: string;
      title: string;
      content: string;
    }) => {
      this.logger.info('[WebviewRPC] document.create called', { 
        vaultId: params.vaultId, 
        path: params.path, 
        title: params.title 
      });
      try {
        const result = await this.documentService.createDocument(
          params.vaultId,
          params.path,
          params.title,
          params.content
        );
        if (!result.success) {
          this.logger.error('[WebviewRPC] document.create failed', { 
            error: result.error.message,
            vaultId: params.vaultId,
            path: params.path
          });
          throw new Error(result.error.message);
        }
        this.logger.info('[WebviewRPC] document.create succeeded', { 
          id: result.value.id,
          path: result.value.path
        });
        return {
          id: result.value.id,
          path: result.value.path,
          name: result.value.name,
          title: result.value.title,
          vault: result.value.vault,
        };
      } catch (error: any) {
        this.logger.error('[WebviewRPC] document.create exception', { 
          error: error.message,
          stack: error.stack,
          vaultId: params.vaultId,
          path: params.path
        });
        throw error;
      }
    });

    this.webviewAdapter.registerMethod('document.createFolder', async (params: {
      vaultId: string;
      folderPath: string;
      folderName: string;
      template?: any; // 模板内容（structure 类型）
    }) => {
      const result = await this.documentService.createFolder(
        params.vaultId,
        params.folderPath,
        params.folderName,
        params.template
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }

      // 获取 vault 信息用于返回
      const vaultsResult = await this.vaultService.listVaults();
      const vault = vaultsResult.success 
        ? vaultsResult.value.find(v => v.id === params.vaultId)
        : undefined;

      return {
        path: result.value,
        name: params.folderName,
        title: params.folderName,
        vault: vault ? { id: vault.id, name: vault.name } : undefined,
        folderPath: result.value,
      };
    });

    // Template 相关方法
    this.webviewAdapter.registerMethod('template.list', async (params: { vaultId?: string }) => {
      const result = await this.templateService.getTemplates(params.vaultId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        type: template.type,
        category: template.category,
        viewType: template.viewType,
      }));
    });

    this.webviewAdapter.registerMethod('template.getContent', async (params: {
      templateId: string;
      vaultId: string;
    }) => {
      // 先获取模板
      const templateResult = await this.templateService.getTemplate(
        params.templateId,
        params.vaultId
      );
      if (!templateResult.success) {
        throw new Error(templateResult.error.message);
      }

      const template = templateResult.value;
      
      // 如果是内容模板，直接返回内容
      if (template.type === 'content' && template.content) {
        return template.content;
      }
      
      // 如果是结构模板，返回结构定义（转换为字符串）
      if (template.type === 'structure' && template.structure) {
        return typeof template.structure === 'string' 
          ? template.structure 
          : JSON.stringify(template.structure, null, 2);
      }
      
      return '';
    });

    // Workspace 相关方法
    this.webviewAdapter.registerMethod('workspace.listFiles', async (params?: { query?: string }) => {
      this.logger.info(`[WebviewRPC] workspace.listFiles handler called`, { 
        query: params?.query,
        codeFileServiceType: this.codeFileService?.constructor?.name 
      });
      // 调用应用服务层处理业务逻辑
      this.logger.info(`[WebviewRPC] Calling codeFileService.listWorkspaceFiles`);
      const result = await this.codeFileService.listWorkspaceFiles({
        query: params?.query,
      });
      this.logger.info(`[WebviewRPC] codeFileService.listWorkspaceFiles returned`, { 
        success: result.success,
        itemCount: result.success ? result.value.length : 0
      });
      
      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.value;
    });

    this.logger.info('All Webview RPC methods registered');
  }
}

