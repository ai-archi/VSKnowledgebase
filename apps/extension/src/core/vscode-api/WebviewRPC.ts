import * as vscode from 'vscode';
import { Logger } from '../logger/Logger';
import { VaultApplicationService } from '../../modules/shared/application/VaultApplicationService';
import { DocumentApplicationService } from '../../modules/document/application/DocumentApplicationService';
import { TemplateApplicationService } from '../../modules/template/application/TemplateApplicationService';
import { ArtifactApplicationService } from '../../modules/shared/application/ArtifactApplicationService';
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
    private artifactService: ArtifactApplicationService,
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
      relatedArtifacts?: string[];
      relatedCodePaths?: string[];
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

        // 如果创建成功且有关联关系，保存关联关系
        if (result.success && (params.relatedArtifacts || params.relatedCodePaths)) {
          const artifact = result.value;
          await Promise.all([
            params.relatedArtifacts && params.relatedArtifacts.length > 0
              ? this.artifactService.updateRelatedArtifacts(
                  artifact.vault.id,
                  artifact.id,
                  'artifact',
                  params.relatedArtifacts
                )
              : Promise.resolve({ success: true } as any),
            params.relatedCodePaths && params.relatedCodePaths.length > 0
              ? this.artifactService.updateRelatedCodePaths(
                  artifact.vault.id,
                  artifact.id,
                  'artifact',
                  params.relatedCodePaths
                )
              : Promise.resolve({ success: true } as any),
          ]);
        }
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
      templateId?: string; // 模板 ID，后端会根据 ID 读取模板文件
      relatedArtifacts?: string[];
      relatedCodePaths?: string[];
    }) => {
      const result = await this.documentService.createFolder(
        params.vaultId,
        params.folderPath,
        params.folderName,
        params.templateId
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }

      // 如果创建成功且有关联关系，保存关联关系
      if (result.success && (params.relatedArtifacts || params.relatedCodePaths)) {
        await Promise.all([
          params.relatedArtifacts && params.relatedArtifacts.length > 0
            ? this.artifactService.updateRelatedArtifacts(
                params.vaultId,
                result.value,
                'folder',
                params.relatedArtifacts
              )
            : Promise.resolve({ success: true } as any),
          params.relatedCodePaths && params.relatedCodePaths.length > 0
            ? this.artifactService.updateRelatedCodePaths(
                params.vaultId,
                result.value,
                'folder',
                params.relatedCodePaths
              )
            : Promise.resolve({ success: true } as any),
        ]);
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
      
      // 如果是结构模板，返回结构定义（返回对象，不要序列化为字符串）
      if (template.type === 'structure' && template.structure) {
        // 直接返回结构对象，让前端和后端都能正确处理
        let structure = typeof template.structure === 'string' 
          ? JSON.parse(template.structure)
          : template.structure;
        
        // 修复 YAML 解析时可能出现的对象序列化问题
        // 确保所有 name 字段都是字符串
        structure = this.fixStructureNames(structure);
        
        return structure;
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

    // Artifact 关联关系相关方法
    this.webviewAdapter.registerMethod('artifact.getRelatedArtifacts', async (params: {
      vaultId: string;
      targetId: string;
      targetType: 'artifact' | 'file' | 'folder' | 'vault';
    }) => {
      this.logger.info('[WebviewRPC] artifact.getRelatedArtifacts called', params);
      const result = await this.artifactService.getRelatedArtifacts(
        params.vaultId,
        params.targetId,
        params.targetType
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    });

    this.webviewAdapter.registerMethod('artifact.getRelatedCodePaths', async (params: {
      vaultId: string;
      targetId: string;
      targetType: 'artifact' | 'file' | 'folder' | 'vault';
    }) => {
      this.logger.info('[WebviewRPC] artifact.getRelatedCodePaths called', params);
      const result = await this.artifactService.getRelatedCodePaths(
        params.vaultId,
        params.targetId,
        params.targetType
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    });

    this.webviewAdapter.registerMethod('artifact.updateRelatedArtifacts', async (params: {
      vaultId: string;
      targetId: string;
      targetType: 'artifact' | 'file' | 'folder' | 'vault';
      relatedArtifacts: string[];
    }) => {
      this.logger.info('[WebviewRPC] artifact.updateRelatedArtifacts called', params);
      const result = await this.artifactService.updateRelatedArtifacts(
        params.vaultId,
        params.targetId,
        params.targetType,
        params.relatedArtifacts
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    });

    this.webviewAdapter.registerMethod('artifact.updateRelatedCodePaths', async (params: {
      vaultId: string;
      targetId: string;
      targetType: 'artifact' | 'file' | 'folder' | 'vault';
      relatedCodePaths: string[];
    }) => {
      this.logger.info('[WebviewRPC] artifact.updateRelatedCodePaths called', params);
      const result = await this.artifactService.updateRelatedCodePaths(
        params.vaultId,
        params.targetId,
        params.targetType,
        params.relatedCodePaths
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.value;
    });

    // Artifact 相关方法（用于创建设计图等）
    this.webviewAdapter.registerMethod('artifact.create', async (params: {
      vaultId: string;
      path: string;
      title: string;
      content: string;
      viewType: string;
      format?: string;
      category?: string;
      tags?: string[];
      relatedArtifacts?: string[];
      relatedCodePaths?: string[];
    }) => {
      this.logger.info('[WebviewRPC] artifact.create called', { 
        vaultId: params.vaultId, 
        path: params.path, 
        title: params.title,
        viewType: params.viewType,
        format: params.format
      });
      try {
        // 获取 vault 信息
        const vaultResult = await this.vaultService.getVault(params.vaultId);
        if (!vaultResult.success) {
          throw new Error(`Vault not found: ${params.vaultId}`);
        }

        const vault = vaultResult.value;
        const result = await this.artifactService.createArtifact({
          vault: {
            id: vault.id,
            name: vault.name,
          },
          path: params.path,
          title: params.title,
          content: params.content, // 可选，如果不提供则从模板复制
          viewType: params.viewType as any,
          format: params.format,
          category: params.category,
          tags: params.tags,
          templateViewType: (params as any).templateViewType, // 模板视图类型
        });

        if (!result.success) {
          this.logger.error('[WebviewRPC] artifact.create failed', { 
            error: result.error.message,
            vaultId: params.vaultId,
            path: params.path
          });
          throw new Error(result.error.message);
        }
        this.logger.info('[WebviewRPC] artifact.create succeeded', { 
          id: result.value.id,
          path: result.value.path
        });

        // 如果创建成功且有关联关系，保存关联关系
        if (params.relatedArtifacts || params.relatedCodePaths) {
          await Promise.all([
            params.relatedArtifacts && params.relatedArtifacts.length > 0
              ? this.artifactService.updateRelatedArtifacts(
                  result.value.vault.id,
                  result.value.id,
                  'artifact',
                  params.relatedArtifacts
                )
              : Promise.resolve({ success: true } as any),
            params.relatedCodePaths && params.relatedCodePaths.length > 0
              ? this.artifactService.updateRelatedCodePaths(
                  result.value.vault.id,
                  result.value.id,
                  'artifact',
                  params.relatedCodePaths
                )
              : Promise.resolve({ success: true } as any),
          ]);
        }

        return {
          id: result.value.id,
          path: result.value.path,
          name: result.value.name,
          title: result.value.title,
          vault: result.value.vault,
          viewType: result.value.viewType,
          format: result.value.format,
        };
      } catch (error: any) {
        this.logger.error('[WebviewRPC] artifact.create exception', { 
          error: error.message,
          stack: error.stack,
          vaultId: params.vaultId,
          path: params.path
        });
        throw error;
      }
    });

    this.logger.info('All Webview RPC methods registered');
  }

  /**
   * 修复结构中的 name 字段（处理 YAML 解析时可能出现的对象序列化问题）
   */
  private fixStructureNames(structure: any): any {
    if (Array.isArray(structure)) {
      return structure.map(item => this.fixStructureNames(item));
    } else if (structure && typeof structure === 'object') {
      // 如果是结构数组（structure 字段）
      if (structure.structure && Array.isArray(structure.structure)) {
        return {
          ...structure,
          structure: structure.structure.map((item: any) => this.fixStructureNames(item))
        };
      }
      
      // 修复单个结构项
      const fixed: any = { ...structure };
      
      // 修复 name 字段
      if (fixed.name && typeof fixed.name === 'object') {
        // 如果 name 是对象，尝试提取字符串值
        const objKeys = Object.keys(fixed.name);
        if (objKeys.length > 0) {
          // 检查是否是 {{variable}} 格式被错误解析
          const firstKey = objKeys[0];
          if (firstKey === '[object Object]' || firstKey.includes('object')) {
            // 尝试从对象值中恢复
            const objValue = fixed.name[firstKey];
            if (objValue === null || objValue === undefined) {
              // 可能是 {{folderName}} 被解析成了 {folderName: null}
              // 尝试从键名恢复
              fixed.name = firstKey.replace(/\[object Object\]/g, '').trim() || '{{folderName}}';
            } else {
              fixed.name = String(objValue);
            }
          } else {
            fixed.name = firstKey;
          }
        } else {
          fixed.name = '{{folderName}}'; // 默认值
        }
      }
      
      // 递归处理 children
      if (fixed.children && Array.isArray(fixed.children)) {
        fixed.children = fixed.children.map((child: any) => this.fixStructureNames(child));
      }
      
      return fixed;
    }
    
    return structure;
  }
}

