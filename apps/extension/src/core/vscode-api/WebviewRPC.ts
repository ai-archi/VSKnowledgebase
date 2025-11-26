import * as vscode from 'vscode';
import { Logger } from '../logger/Logger';
import { VaultApplicationService } from '../../modules/shared/application/VaultApplicationService';
import { DocumentApplicationService } from '../../modules/document/application/DocumentApplicationService';
import { TemplateApplicationService } from '../../modules/template/application/TemplateApplicationService';
import { ArtifactFileSystemApplicationService } from '../../modules/shared/application/ArtifactFileSystemApplicationService';
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
    private artifactService: ArtifactFileSystemApplicationService
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

    // Document 相关方法
    this.webviewAdapter.registerMethod('document.list', async (params: { vaultId?: string }) => {
      if (params.vaultId) {
        // 从指定 Vault 获取文档
        const result = await this.documentService.listDocuments(params.vaultId);
        if (!result.success) {
          throw new Error(result.error.message);
        }
        return result.value.map(artifact => ({
          id: artifact.id,
          path: artifact.path,
          name: artifact.name,
          title: artifact.title,
          vault: artifact.vault,
        }));
      } else {
        // 从所有 Vault 获取文档
        const result = await this.artifactService.listArtifacts();
        if (!result.success) {
          throw new Error(result.error.message);
        }
        return result.value.map(artifact => ({
          id: artifact.id,
          path: artifact.path,
          name: artifact.name,
          title: artifact.title,
          vault: artifact.vault,
        }));
      }
    });

    this.webviewAdapter.registerMethod('document.create', async (params: {
      vaultId: string;
      path: string;
      title: string;
      content: string;
    }) => {
      const result = await this.documentService.createDocument(
        params.vaultId,
        params.path,
        params.title,
        params.content
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return {
        id: result.value.id,
        path: result.value.path,
        name: result.value.name,
        title: result.value.title,
        vault: result.value.vault,
      };
    });

    this.webviewAdapter.registerMethod('document.createFolder', async (params: {
      vaultId: string;
      folderPath: string;
      folderName: string;
      template?: any; // 模板内容（structure 类型）
    }) => {
      // 创建文件夹（通过创建一个占位文件）
      const targetFolderPath = params.folderPath === '' 
        ? params.folderName
        : `${params.folderPath}/${params.folderName}`;
      const placeholderPath = `${targetFolderPath}/.keep`;
      
      const result = await this.documentService.createDocument(
        params.vaultId,
        placeholderPath,
        params.folderName,
        `# ${params.folderName}\n\nThis folder contains documents.\n`
      );
      if (!result.success) {
        throw new Error(result.error.message);
      }

      // 如果有模板，根据模板创建目录结构
      if (params.template && params.template.structure) {
        // TODO: 实现根据模板创建目录结构的逻辑
        // 这里需要递归创建目录和文件
        // 暂时只创建主文件夹，模板功能后续实现
        this.logger.info('Template structure creation not yet implemented');
      }

      return {
        id: result.value.id,
        path: result.value.path,
        name: result.value.name,
        title: result.value.title,
        vault: result.value.vault,
        folderPath: targetFolderPath,
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
    this.webviewAdapter.registerMethod('workspace.listFiles', async () => {
      const items: Array<{
        id?: string;
        path: string;
        name: string;
        title?: string;
        type?: 'file' | 'folder';
        vault?: { id: string; name: string };
      }> = [];

      // 获取工作区中的所有文件和文件夹
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        return items;
      }

      // 遍历所有工作区文件夹
      for (const folder of workspaceFolders) {
        try {
          // 使用 VSCode API 查找所有文件和文件夹
          const pattern = new vscode.RelativePattern(folder, '**/*');
          const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 1000);
          
          // 收集所有路径，用于识别文件夹
          const allPaths = new Set<string>();
          const filePaths = new Set<string>();
          
          for (const uri of uris) {
            const relativePath = vscode.workspace.asRelativePath(uri);
            const fileName = uri.fsPath.split(/[/\\]/).pop() || '';
            
            // 只包含常见的文档文件类型
            const ext = uri.fsPath.split('.').pop()?.toLowerCase();
            if (['md', 'txt', 'json', 'yaml', 'yml', 'xml'].includes(ext || '')) {
              filePaths.add(relativePath);
              items.push({
                path: relativePath,
                name: fileName,
                title: fileName.replace(/\.[^/.]+$/, ''), // 移除扩展名作为标题
                type: 'file',
              });
            }
            
            // 收集所有路径的父目录
            const pathParts = relativePath.split(/[/\\]/);
            for (let i = 1; i < pathParts.length; i++) {
              const dirPath = pathParts.slice(0, i).join('/');
              allPaths.add(dirPath);
            }
          }
          
          // 添加文件夹（排除已经是文件的路径）
          for (const dirPath of allPaths) {
            if (!filePaths.has(dirPath)) {
              const dirName = dirPath.split(/[/\\]/).pop() || dirPath;
              items.push({
                path: dirPath,
                name: dirName,
                title: dirName,
                type: 'folder',
              });
            }
          }
        } catch (error: any) {
          this.logger.warn(`Failed to list files in workspace folder: ${folder.uri.fsPath}`, error);
        }
      }

      return items;
    });

    this.logger.info('All Webview RPC methods registered');
  }
}

