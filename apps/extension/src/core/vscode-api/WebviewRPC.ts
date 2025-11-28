import * as vscode from 'vscode';
import { Logger } from '../logger/Logger';
import { VaultApplicationService } from '../../modules/shared/application/VaultApplicationService';
import { DocumentApplicationService } from '../../modules/document/application/DocumentApplicationService';
import { TemplateApplicationService } from '../../modules/template/application/TemplateApplicationService';
import { ArtifactFileSystemApplicationService } from '../../modules/shared/application/ArtifactFileSystemApplicationService';
import { ArtifactTreeApplicationService } from '../../modules/shared/application/ArtifactTreeApplicationService';
import { VaultReference } from '../../modules/shared/domain/value_object/VaultReference';
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
    private treeService: ArtifactTreeApplicationService
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
      const items: Array<{
        id?: string;
        path: string;
        name: string;
        title?: string;
        type?: 'file' | 'folder';
        vault?: { id: string; name: string };
      }> = [];

      // 获取要扫描的 vault 列表
      let vaultsToScan: Array<{ id: string; name: string }> = [];
      
      if (params.vaultId) {
        const vaultResult = await this.vaultService.getVault(params.vaultId);
        if (!vaultResult.success || !vaultResult.value) {
          return items;
        }
        vaultsToScan = [{ id: vaultResult.value.id, name: vaultResult.value.name }];
      } else {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          return items;
        }
        vaultsToScan = vaultsResult.value.map(v => ({ id: v.id, name: v.name }));
      }

      // 扫描每个 vault 的 artifacts 目录
      for (const vault of vaultsToScan) {
        const vaultRef: VaultReference = { id: vault.id, name: vault.name };
        
        // 使用 treeService 列出 artifacts 目录下的所有文件和文件夹（递归，不限制文件类型）
        const listResult = await this.treeService.listDirectory(vaultRef, 'artifacts', {
          recursive: true,
          includeHidden: false,
          // 不指定 extensions，返回所有文件类型
        });
        
        if (listResult.success) {
          // 如果有查询条件，进行过滤
          const query = params.query?.trim().toLowerCase();
          
          for (const node of listResult.value) {
            // 构建相对于 artifacts 目录的路径
            const relativePath = node.path.startsWith('artifacts/') 
              ? node.path.substring('artifacts/'.length)
              : node.path;
            
            // 如果有查询条件，检查是否匹配
            if (query) {
              const nameLower = node.name.toLowerCase();
              const pathLower = relativePath.toLowerCase();
              const titleLower = (node.isFile ? node.name.replace(/\.[^/.]+$/, '') : node.name).toLowerCase();
              
              // 检查文件名、路径或标题是否包含查询字符串
              if (!nameLower.includes(query) && 
                  !pathLower.includes(query) && 
                  !titleLower.includes(query)) {
                continue; // 不匹配，跳过
              }
            }
            
            items.push({
              path: relativePath,
              name: node.name,
              title: node.isFile ? node.name.replace(/\.[^/.]+$/, '') : node.name,
              type: node.isDirectory ? 'folder' : 'file',
              vault: { id: vault.id, name: vault.name },
            });
      }
        }
      }

      return items;
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
          // 构建搜索模式（如果有查询条件）
          let searchPattern = '**/*';
          if (params?.query && params.query.trim()) {
            // 使用通配符模式进行文件名搜索
            const query = params.query.trim();
            // 转义特殊字符，但保留 * 和 ?
            const escapedQuery = query.replace(/[.+^${}()|[\]\\]/g, '\\$&');
            searchPattern = `**/*${escapedQuery}*`;
          }

          // 使用 VSCode API 查找文件
          // VSCode 会自动使用 .gitignore 规则进行过滤
          const pattern = new vscode.RelativePattern(folder, searchPattern);
          // 不指定 exclude 模式，让 VSCode 使用 .gitignore
          // 增加文件数量限制到 10000
          const uris = await vscode.workspace.findFiles(pattern, null, 10000);
          
          // 收集所有路径，用于识别文件夹
          const allPaths = new Set<string>();
          const filePaths = new Set<string>();
          
          for (const uri of uris) {
            const relativePath = vscode.workspace.asRelativePath(uri);
            const fileName = uri.fsPath.split(/[/\\]/).pop() || '';
            
            // 不限制文件类型，包含所有文件
              filePaths.add(relativePath);
              items.push({
                path: relativePath,
                name: fileName,
                title: fileName.replace(/\.[^/.]+$/, ''), // 移除扩展名作为标题
                type: 'file',
              });
            
            // 收集所有路径的父目录
            const pathParts = relativePath.split(/[/\\]/);
            for (let i = 1; i < pathParts.length; i++) {
              const dirPath = pathParts.slice(0, i).join('/');
              allPaths.add(dirPath);
            }
          }
          
          // 如果没有查询条件，也列出所有文件夹
          if (!params?.query || !params.query.trim()) {
            // 使用 listDirectory 获取文件夹列表
            try {
              const dirUri = folder.uri;
              const dirEntries = await vscode.workspace.fs.readDirectory(dirUri);
              
              // 递归获取所有子目录
              const scanDirs = async (baseUri: vscode.Uri, basePath = ''): Promise<void> => {
                try {
                  const entries = await vscode.workspace.fs.readDirectory(baseUri);
                  for (const [name, type] of entries) {
                    if (type === vscode.FileType.Directory) {
                      const dirPath = basePath ? `${basePath}/${name}` : name;
                      if (!filePaths.has(dirPath)) {
                        allPaths.add(dirPath);
                        // 递归扫描子目录
                        const subUri = vscode.Uri.joinPath(baseUri, name);
                        await scanDirs(subUri, dirPath);
                      }
                    }
                  }
                } catch (error) {
                  // 忽略无法访问的目录（可能被 .gitignore 排除）
                }
              };
              
              await scanDirs(dirUri);
            } catch (error) {
              // 如果无法读取目录，继续处理文件
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

