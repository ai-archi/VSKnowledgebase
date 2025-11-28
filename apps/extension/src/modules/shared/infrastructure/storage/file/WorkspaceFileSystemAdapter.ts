import { Result, ArtifactError } from '../../../domain/errors';

/**
 * 工作区文件夹信息
 */
export interface WorkspaceFolder {
  uri: string;
  name: string;
}

/**
 * 工作区文件项
 */
export interface WorkspaceFileItem {
  path: string;
  name: string;
  type: 'file' | 'folder';
}

/**
 * 工作区文件搜索选项
 */
export interface WorkspaceFileSearchOptions {
  /**
   * 查询字符串，用于路径模糊搜索
   * 如果指定，只返回相对于 workspace 的路径包含此字符串的文件/文件夹
   * 不区分大小写
   */
  query?: string;
  /**
   * 排除模式（glob pattern）
   * 例如排除 node_modules 使用双星号斜杠 node_modules 斜杠双星号
   * 如果不指定，将使用 .gitignore 规则
   */
  exclude?: string;
  /**
   * 最大结果数量
   */
  maxResults?: number;
}

/**
 * 工作区文件系统适配器接口
 * 抽象工作区文件系统操作，支持不同的 IDE（VSCode、IDEA 等）
 */
export interface WorkspaceFileSystemAdapter {
  /**
   * 获取工作区文件夹列表
   */
  getWorkspaceFolders(): Promise<WorkspaceFolder[]>;

  /**
   * 搜索工作区文件（仅返回文件，不包含文件夹）
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项（支持按路径过滤）
   */
  findFiles(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>>;

  /**
   * 搜索工作区文件夹（仅返回文件夹，不包含文件）
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项（支持按路径过滤）
   */
  findFolders(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>>;

  /**
   * 搜索工作区文件和文件夹（返回文件和文件夹）
   * @param folderUri 工作区文件夹 URI
   * @param options 搜索选项（支持按路径过滤）
   */
  findFilesAndFolders(folderUri: string, options?: WorkspaceFileSearchOptions): Promise<Result<WorkspaceFileItem[], ArtifactError>>;
}

