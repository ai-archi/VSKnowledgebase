import * as vscode from 'vscode';
import { Logger } from '../logger/Logger';
import { VaultApplicationService } from '../../modules/shared/application/VaultApplicationService';
import { DocumentApplicationService } from '../../modules/document/application/DocumentApplicationService';
import { TemplateApplicationService, Template } from '../../modules/template/application/TemplateApplicationService';
import { ArtifactApplicationService } from '../../modules/shared/application/ArtifactApplicationService';
import { CodeFileSystemApplicationService } from '../../modules/shared/application/CodeFileSystemApplicationService';
import { AICommandApplicationService } from '../../modules/shared/application/AICommandApplicationService';
import { CommandExecutionContext } from '../../modules/shared/domain/value_object/CommandExecutionContext';
import { WebviewAdapter, WebviewMessage } from './WebviewAdapter';
import { IDEAdapter } from '../ide-api/ide-adapter';

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
    private codeFileService: CodeFileSystemApplicationService,
    private aiCommandService: AICommandApplicationService,
    ideAdapter: IDEAdapter
  ) {
    this.webviewAdapter = new WebviewAdapter(logger, ideAdapter);
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
        await this.webviewAdapter['handleMessage'](webview as any, message);
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
        type: v.type,
        readonly: v.readonly,
      }));
    });

    this.webviewAdapter.registerMethod('vault.get', async (params: { vaultId: string }) => {
      const result = await this.vaultService.getVault(params.vaultId);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return {
        id: result.value.id,
        name: result.value.name,
        description: result.value.description,
        type: result.value.type,
        readonly: result.value.readonly,
        remote: result.value.remote,
        createdAt: result.value.createdAt,
        updatedAt: result.value.updatedAt,
      };
    });

    this.webviewAdapter.registerMethod('vault.update', async (params: {
      vaultId: string;
      name?: string;
      type?: string;
      description?: string;
      readonly?: boolean;
    }) => {
      const result = await this.vaultService.updateVault(params.vaultId, {
        name: params.name,
        type: params.type as any,
        description: params.description,
        readonly: params.readonly,
      });
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return {
        id: result.value.id,
        name: result.value.name,
        description: result.value.description,
        type: result.value.type,
        readonly: result.value.readonly,
        remote: result.value.remote,
        createdAt: result.value.createdAt,
        updatedAt: result.value.updatedAt,
      };
    });

    // Document 相关方法（不限制文件类型，支持查询）
    // 注意：只处理 document 类型的 vault
    this.webviewAdapter.registerMethod('document.list', async (params: { vaultId?: string; query?: string }) => {
      this.logger.debug('document.list handler called', { vaultId: params.vaultId, query: params.query });
      
      // 如果指定了 vaultId，验证 vault 类型
      if (params.vaultId) {
        const vaultResult = await this.vaultService.getVault(params.vaultId);
        if (vaultResult.success && vaultResult.value) {
          // 只处理 document 类型的 vault
          if (vaultResult.value.type !== 'document') {
            this.logger.debug(`Skipping non-document vault: ${vaultResult.value.name} (type: ${vaultResult.value.type})`);
            return [];
          }
        }
      } else {
        // 如果没有指定 vaultId，只返回 document 类型的 vault 的文件
        // 这里需要特殊处理：获取所有 document 类型的 vault，然后合并结果
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          const documentVaults = vaultsResult.value.filter(v => v.type === 'document');
          if (documentVaults.length === 0) {
            return [];
          }
          
          // 合并所有 document vault 的文件
          const allItems: any[] = [];
          for (const vault of documentVaults) {
            try {
              const result = await this.artifactService.listFilesAndFolders(vault.id, {
                query: params.query,
              });
              if (result.success) {
                const items = result.value.map(item => ({
                  ...item,
                  vault: { id: vault.id, name: vault.name },
                }));
                allItems.push(...items);
              }
            } catch (error: any) {
              this.logger.error(`Failed to list files from vault ${vault.name}:`, error);
            }
          }
          return allItems;
        }
        return [];
      }
      
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
      templateId?: string; // 模板ID，如果提供则使用模板内容（经过Jinja2渲染）
      content?: string; // 可选，如果不提供模板ID则使用此内容
      relatedArtifacts?: string[];
      relatedCodePaths?: string[];
    }) => {
      this.logger.info('[WebviewRPC] document.create called', { 
        vaultId: params.vaultId, 
        path: params.path, 
        title: params.title,
        templateId: params.templateId,
        relatedArtifacts: params.relatedArtifacts,
        relatedCodePaths: params.relatedCodePaths
      });
      try {
        const result = await this.documentService.createDocument(
          params.vaultId,
          params.path,
          params.title,
          params.templateId,
          params.content
        );

        // 如果创建成功且有关联关系，保存关联关系
        this.logger.info('[WebviewRPC] Checking if need to save relations', {
          resultSuccess: result.success,
          hasRelatedArtifacts: !!params.relatedArtifacts,
          hasRelatedCodePaths: !!params.relatedCodePaths,
          relatedArtifactsLength: params.relatedArtifacts?.length || 0,
          relatedCodePathsLength: params.relatedCodePaths?.length || 0
        });
        
        if (result.success && (params.relatedArtifacts || params.relatedCodePaths)) {
          const artifact = result.value;
          this.logger.info('[WebviewRPC] Saving related artifacts and code paths', {
            artifactId: artifact.id,
            artifactPath: artifact.path,
            relatedArtifacts: params.relatedArtifacts,
            relatedCodePaths: params.relatedCodePaths
          });
          
          // 使用 file:vaultId:filePath 格式查找 metadata，所以使用 targetType: 'file' 和 artifact.path
          const updateResults = await Promise.all([
            params.relatedArtifacts && params.relatedArtifacts.length > 0
              ? this.artifactService.updateRelatedArtifacts(
                  artifact.vault.id,
                  artifact.path,  // 使用文件路径而不是 artifact ID
                  'file',  // 使用 'file' 类型，这样能通过 file:vaultId:filePath 格式找到 metadata
                  params.relatedArtifacts
                )
              : Promise.resolve({ success: true } as any),
            params.relatedCodePaths && params.relatedCodePaths.length > 0
              ? this.artifactService.updateRelatedCodePaths(
                  artifact.vault.id,
                  artifact.path,  // 使用文件路径而不是 artifact ID
                  'file',  // 使用 'file' 类型，这样能通过 file:vaultId:filePath 格式找到 metadata
                  params.relatedCodePaths
                )
              : Promise.resolve({ success: true } as any),
          ]);
          
          // 检查更新结果
          for (let i = 0; i < updateResults.length; i++) {
            const updateResult = updateResults[i];
            if (!updateResult.success) {
              const errorDetails = updateResult.error ? {
                message: updateResult.error.message || String(updateResult.error),
                code: updateResult.error.code,
                stack: updateResult.error.stack,
                fullError: JSON.stringify(updateResult.error, Object.getOwnPropertyNames(updateResult.error))
              } : { message: 'Unknown error' };
              
              const errorMessage = errorDetails.message || 'Unknown error';
              const errorCode = errorDetails.code || 'UNKNOWN';
              this.logger.error(`[WebviewRPC] Failed to update ${i === 0 ? 'relatedArtifacts' : 'relatedCodePaths'}`, {
                artifactId: artifact.id,
                errorMessage,
                errorCode,
                errorStack: errorDetails.stack,
                fullError: errorDetails.fullError,
                updateResult: JSON.stringify(updateResult, Object.getOwnPropertyNames(updateResult))
              });
            } else {
              this.logger.info(`[WebviewRPC] Successfully updated ${i === 0 ? 'relatedArtifacts' : 'relatedCodePaths'}`, {
                artifactId: artifact.id,
                count: i === 0 ? params.relatedArtifacts?.length : params.relatedCodePaths?.length
              });
            }
          }
        } else if (result.success) {
          this.logger.info('[WebviewRPC] No related artifacts or code paths to save', {
            artifactId: result.value.id,
            hasRelatedArtifacts: !!params.relatedArtifacts,
            hasRelatedCodePaths: !!params.relatedCodePaths
          });
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
          path: result.value.path,
          contentLocation: result.value.contentLocation,
          vaultName: result.value.vault.name
        });
        if (!result.value.contentLocation) {
          this.logger.error('[WebviewRPC] document.create: contentLocation is missing!', {
            artifact: result.value
          });
        }
        return {
          id: result.value.id,
          path: result.value.path,
          name: result.value.name,
          title: result.value.title,
          vault: result.value.vault,
          contentLocation: result.value.contentLocation,
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
      subFolderPath?: string; // 子文件夹路径，例如 "domain" 或 "domain/subdomain"
      relatedArtifacts?: string[];
      relatedCodePaths?: string[];
    }) => {
      const result = await this.documentService.createFolder(
        params.vaultId,
        params.folderPath,
        params.folderName,
        params.templateId,
        params.subFolderPath
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
    // 从所有 vault 加载模板（不限制 vault 类型，因为任何 vault 都可以包含模板）
    this.webviewAdapter.registerMethod('template.list', async (params: { vaultId?: string }) => {
      // 直接调用 templateService.getTemplates，它会从所有 vault 或指定 vault 加载模板
      const result = await this.templateService.getTemplates(params.vaultId);
      if (!result.success) {
        this.logger.error(`Failed to get templates: ${result.error.message}`);
        throw new Error(result.error.message);
      }
      return result.value.map((template: Template) => ({
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
      vaultId?: string;
    }) => {
      // 从指定vault获取模板
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
      templateId?: string; // 模板ID，如果提供则使用模板内容（经过Jinja2渲染）
      content?: string; // 可选，如果不提供模板ID则使用此内容
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
        format: params.format,
        templateId: params.templateId
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
          templateId: params.templateId, // 传递模板ID，后端会进行渲染
          content: params.content, // 可选，如果不提供模板ID则使用此内容
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
          path: result.value.path,
          contentLocation: result.value.contentLocation,
          vaultName: result.value.vault.name
        });
        if (!result.value.contentLocation) {
          this.logger.error('[WebviewRPC] artifact.create: contentLocation is missing!', {
            artifact: result.value
          });
        }

        // 如果创建成功且有关联关系，保存关联关系
        // 使用 file:vaultId:filePath 格式查找 metadata，所以使用 targetType: 'file' 和 artifact.path
        if (params.relatedArtifacts || params.relatedCodePaths) {
          this.logger.info('[WebviewRPC] Saving related artifacts and code paths for artifact', {
            artifactId: result.value.id,
            artifactPath: result.value.path,
            relatedArtifacts: params.relatedArtifacts,
            relatedCodePaths: params.relatedCodePaths
          });
          
          await Promise.all([
            params.relatedArtifacts && params.relatedArtifacts.length > 0
              ? this.artifactService.updateRelatedArtifacts(
                  result.value.vault.id,
                  result.value.path,
                  'file',
                  params.relatedArtifacts
                )
              : Promise.resolve({ success: true } as any),
            params.relatedCodePaths && params.relatedCodePaths.length > 0
              ? this.artifactService.updateRelatedCodePaths(
                  result.value.vault.id,
                  result.value.path,
                  'file',
                  params.relatedCodePaths
                )
              : Promise.resolve({ success: true } as any),
          ]);
          
          this.logger.info('[WebviewRPC] Successfully saved related artifacts and code paths for artifact', {
            artifactId: result.value.id,
            artifactPath: result.value.path
          });
        }

        return {
          id: result.value.id,
          path: result.value.path,
          name: result.value.name,
          title: result.value.title,
          vault: result.value.vault,
          viewType: result.value.viewType,
          format: result.value.format,
          contentLocation: result.value.contentLocation,
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

    // AI 命令相关方法
    // 注意：只处理 ai-enhancement 类型的 vault
    this.webviewAdapter.registerMethod('aiCommand.list', async (params: { vaultId?: string; targetType?: string }) => {
      try {
        this.logger.info('[WebviewRPC] aiCommand.list called', { vaultId: params.vaultId, targetType: params.targetType });
        
        // 如果指定了 vaultId，验证 vault 类型
        if (params.vaultId) {
          const vaultResult = await this.vaultService.getVault(params.vaultId);
          if (vaultResult.success && vaultResult.value) {
            // 只处理 ai-enhancement 类型的 vault
            if (vaultResult.value.type !== 'ai-enhancement') {
              this.logger.debug(`Skipping non-ai-enhancement vault: ${vaultResult.value.name} (type: ${vaultResult.value.type})`);
              return [];
            }
          }
        } else {
          // 如果没有指定 vaultId，只返回 ai-enhancement 类型的 vault 的命令
          const vaultsResult = await this.vaultService.listVaults();
          if (vaultsResult.success) {
            const aiEnhancementVaults = vaultsResult.value.filter(v => v.type === 'ai-enhancement');
            if (aiEnhancementVaults.length === 0) {
              return [];
            }
            
            // 合并所有 ai-enhancement vault 的命令
            const allCommands: any[] = [];
            for (const vault of aiEnhancementVaults) {
              try {
                const result = await this.aiCommandService.getCommands(vault.id, params.targetType as any);
                if (result.success) {
                  const commands = result.value.map(cmd => ({
                    id: cmd.id,
                    name: cmd.name,
                    description: cmd.description,
                    targetTypes: cmd.targetTypes,
                    enabled: cmd.enabled,
                    order: cmd.order,
                  }));
                  allCommands.push(...commands);
                }
              } catch (error: any) {
                this.logger.error(`Failed to get commands from vault ${vault.name}:`, error);
              }
            }
            this.logger.info('[WebviewRPC] aiCommand.list returning', { count: allCommands.length, targetType: params.targetType });
            return allCommands;
          }
          return [];
        }
        
        const result = await this.aiCommandService.getCommands(params.vaultId, params.targetType as any);
        if (!result.success) {
          this.logger.error('[WebviewRPC] aiCommand.list failed', { error: result.error.message });
          throw new Error(result.error.message);
        }
        const mapped = result.value.map(cmd => ({
          id: cmd.id,
          name: cmd.name,
          description: cmd.description,
          targetTypes: cmd.targetTypes,
          enabled: cmd.enabled,
          order: cmd.order,
        }));
        this.logger.info('[WebviewRPC] aiCommand.list returning', { count: mapped.length, targetType: params.targetType });
        return mapped;
      } catch (error: any) {
        this.logger.error('[WebviewRPC] aiCommand.list exception', { error: error.message, stack: error.stack });
        throw error;
      }
    });

    this.webviewAdapter.registerMethod('aiCommand.execute', async (params: { commandId: string; vaultId: string; context: CommandExecutionContext }) => {
      try {
        this.logger.info('[WebviewRPC] aiCommand.execute called', { commandId: params.commandId, vaultId: params.vaultId });
        const result = await this.aiCommandService.executeCommand(params.commandId, params.vaultId, params.context);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        return result.value;
      } catch (error: any) {
        this.logger.error('[WebviewRPC] aiCommand.execute exception', { error: error.message, stack: error.stack });
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

