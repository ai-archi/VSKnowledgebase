import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import fg from 'fast-glob';
import ignore from 'ignore';
import { ARCHITOOL_PATHS } from '../../../../../core/constants/Paths';
import { WorkspaceFileSystemAdapter, WorkspaceFolder, WorkspaceFileItem, WorkspaceFileSearchOptions } from './WorkspaceFileSystemAdapter';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/errors';

/**
 * 工作区文件系统适配器实现
 * 使用 fast-glob 和 ignore 库实现通用的文件系统操作
 * 仅 getWorkspaceFolders 方法依赖 VSCode API 获取工作区信息
 */
export class WorkspaceFileSystemAdapterImpl implements WorkspaceFileSystemAdapter {
  async getWorkspaceFolders(): Promise<WorkspaceFolder[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return [];
    }

    return workspaceFolders.map(folder => ({
      uri: folder.uri.fsPath,
      name: folder.name,
    }));
  }

  /**
   * 检查路径是否匹配查询字符串
   * 路径（相对于 workspace）包含查询字符串即匹配（不区分大小写）
   */
  private matchesQuery(relativePath: string, query?: string): boolean {
    if (!query || !query.trim()) {
      return true; // 没有查询条件，匹配所有
    }
    const queryLower = query.trim().toLowerCase();
    const pathLower = relativePath.toLowerCase();
    return pathLower.includes(queryLower);
  }

  /**
   * 构建 ignore 实例
   * 如果 options.exclude 已指定，使用它；否则读取 .gitignore
   * 始终排除 archidocs 和 .git 目录
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项
   * @returns ignore 实例
   */
  private async buildIgnoreInstance(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<ReturnType<typeof ignore>> {
    const ig = ignore();

    // 始终排除 archidocs 和 .git 目录
    ig.add(ARCHITOOL_PATHS.WORKSPACE_ROOT_DIR);
    ig.add('.git');
    ig.add('**/.git');
    

    // 如果明确指定了 exclude，添加它
    if (options?.exclude !== undefined && options.exclude) {
      ig.add(options.exclude);
    } else {
      // 否则读取 .gitignore
      try {
        const gitignorePath = path.join(folderUri, '.gitignore');
        if (fs.existsSync(gitignorePath)) {
          const content = fs.readFileSync(gitignorePath, 'utf-8');
          ig.add(content);
        }
      } catch (error) {
        // 读取失败，忽略
      }
    }

    return ig;
  }

  /**
   * 使用 fast-glob 查找文件和文件夹
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项
   * @param itemType 返回类型：'file' | 'folder' | 'both'
   * @returns 文件/文件夹项数组
   */
  private async findItemsWithFastGlob(
    folderUri: string,
    options?: WorkspaceFileSearchOptions,
    itemType: 'file' | 'folder' | 'both' = 'both'
  ): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    try {
      const folder = vscode.workspace.workspaceFolders?.find(f => f.uri.fsPath === folderUri);
      
      if (!folder) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Workspace folder not found: ${folderUri}`
          ),
        };
      }

      const maxResults = options?.maxResults || 10000;
      
      // 构建 ignore 实例
      const ig = await this.buildIgnoreInstance(folderUri, options);

      // 使用 fast-glob 查找所有文件和文件夹
      // 使用 '**' 匹配所有文件和文件夹（包括根目录下的文件）
      const entries = await fg(['**'], {
        cwd: folderUri,
        dot: true,
        onlyFiles: false, // 返回文件和文件夹
        absolute: false, // 返回相对路径
        stats: false,
      });

      // 去重并规范化路径（统一使用 / 分隔符）
      const normalizedEntries = Array.from(new Set(entries.map(e => e.replace(/\\/g, '/'))));

      // 过滤掉被 ignore 的文件和文件夹
      const filtered = normalizedEntries.filter(entry => {
        // 检查是否被 ignore（entry 已经是规范化路径）
        if (ig.ignores(entry)) {
          return false;
        }
        
        // 应用查询过滤
        if (!this.matchesQuery(entry, options?.query)) {
          return false;
        }
        
        return true;
      });

      // 转换为 WorkspaceFileItem 并区分文件和文件夹
      const items: WorkspaceFileItem[] = [];
      const processedPaths = new Set<string>();

      for (const entry of filtered) {
        // 跳过已处理的路径（避免重复）
        if (processedPaths.has(entry)) {
          continue;
        }

        // 检查是文件还是文件夹
        // entry 已经是规范化路径（使用 / 分隔符），但 path.join 需要系统路径格式
        const fullPath = path.join(folderUri, entry);
        let isDirectory: boolean;
        
        try {
          const stat = fs.statSync(fullPath);
          isDirectory = stat.isDirectory();
        } catch (error) {
          // 如果无法访问，跳过
          continue;
        }

        // 根据 itemType 过滤
        if (itemType === 'file' && isDirectory) {
          continue;
        }
        if (itemType === 'folder' && !isDirectory) {
          continue;
        }

        const fileName = path.basename(entry);
        
        items.push({
          path: entry,
          name: fileName,
          type: isDirectory ? 'folder' : 'file',
        });

        processedPaths.add(entry);

        // 应用 maxResults 限制
        if (items.length >= maxResults) {
          break;
        }
      }

      return { success: true, value: items };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find items: ${error.message}`,
          {},
          error
        ),
      };
    }
  }

  async findFiles(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    return this.findItemsWithFastGlob(folderUri, options, 'file');
  }

  async findFolders(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    return this.findItemsWithFastGlob(folderUri, options, 'folder');
  }

  async findFilesAndFolders(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    const result = await this.findItemsWithFastGlob(folderUri, options, 'both');
    
    if (!result.success) {
      return result;
    }

    // 排序：文件夹在前，文件在后，都按路径排序
    result.value.sort((a, b) => {
      if (a.type === 'folder' && b.type === 'file') return -1;
      if (a.type === 'file' && b.type === 'folder') return 1;
      return a.path.localeCompare(b.path);
    });

    return result;
  }
}

