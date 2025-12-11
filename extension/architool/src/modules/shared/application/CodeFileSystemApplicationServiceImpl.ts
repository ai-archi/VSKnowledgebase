import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { CodeFileSystemApplicationService, WorkspaceFileItem, WorkspaceFileQueryOptions } from './CodeFileSystemApplicationService';
import { WorkspaceFileSystemAdapter } from '../infrastructure/storage/file/WorkspaceFileSystemAdapter';
import { Result, ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { Logger } from '../../../core/logger/Logger';

/**
 * 代码文件系统应用服务实现
 */
@injectable()
export class CodeFileSystemApplicationServiceImpl implements CodeFileSystemApplicationService {
  constructor(
    @inject(TYPES.WorkspaceFileSystemAdapter)
    private workspaceAdapter: WorkspaceFileSystemAdapter,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async listWorkspaceFiles(options?: WorkspaceFileQueryOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>> {
    try {
      this.logger.info(`[CodeFileSystemApplicationService] listWorkspaceFiles called`, { query: options?.query });
      const items: WorkspaceFileItem[] = [];

      // 获取工作区文件夹列表（通过适配器）
      const workspaceFolders = await this.workspaceAdapter.getWorkspaceFolders();
      if (workspaceFolders.length === 0) {
        return { success: true, value: items };
      }

      // 直接传递查询字符串给适配器，由适配器统一处理搜索逻辑
      const query = options?.query?.trim();

      // 遍历所有工作区文件夹
      for (const folder of workspaceFolders) {
        try {
          // 使用适配器查找文件和文件夹（自动应用 .gitignore）
          // 适配器会处理查询字符串，匹配路径包含该字符串的文件/文件夹
          const result = await this.workspaceAdapter.findFilesAndFolders(folder.uri, {
            query: query,
            exclude: undefined, // undefined 表示使用 .gitignore
            maxResults: options?.limit || 10000,
          });

          if (result.success) {
            // 添加标题字段（从文件名中提取）
            const itemsWithTitle = result.value.map(item => ({
              ...item,
              title: item.type === 'file' 
                ? item.name.replace(/\.[^/.]+$/, '') // 移除扩展名作为标题
                : item.name,
            }));
            items.push(...itemsWithTitle);
          } else {
            this.logger.warn(`Failed to list files in workspace folder: ${folder.uri}`, result.error);
          }
        } catch (error: any) {
          this.logger.warn(`Failed to list files in workspace folder: ${folder.uri}`, error);
        }
      }

      this.logger.info(`Found ${items.length} workspace files`);
      return { success: true, value: items };
    } catch (error: any) {
      this.logger.error('Failed to list workspace files', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to list workspace files: ${error.message}`,
          {},
          error
        ),
      };
    }
  }
}

