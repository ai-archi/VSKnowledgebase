import { Result, ArtifactError } from '../domain/errors';

/**
 * 工作区文件项
 */
export interface WorkspaceFileItem {
  path: string;
  name: string;
  title?: string;
  type: 'file' | 'folder';
}

/**
 * 工作区文件查询选项
 */
export interface WorkspaceFileQueryOptions {
  /**
   * 查询字符串，用于文件名/路径模糊搜索
   */
  query?: string;
  /**
   * 文件数量限制
   */
  limit?: number;
}

/**
 * 代码文件系统应用服务
 * 负责处理工作区代码文件的搜索、列表等操作
 */
export interface CodeFileSystemApplicationService {
  /**
   * 列出工作区中的文件和文件夹
   * @param options 查询选项
   */
  listWorkspaceFiles(options?: WorkspaceFileQueryOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>>;
}

