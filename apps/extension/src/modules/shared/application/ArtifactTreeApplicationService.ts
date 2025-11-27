import { Result, ArtifactError } from '../domain/errors';
import { VaultReference } from '../domain/VaultReference';

/**
 * 文件树节点信息
 */
export interface FileTreeNode {
  name: string;
  path: string; // 相对路径
  fullPath: string; // 完整路径
  isDirectory: boolean;
  isFile: boolean;
  extension?: string; // 文件扩展名（不含点号）
}

/**
 * 读取文件选项
 */
export interface ReadFileOptions {
  encoding?: BufferEncoding;
}

/**
 * 列出目录选项
 */
export interface ListDirectoryOptions {
  /**
   * 是否递归列出子目录
   */
  recursive?: boolean;
  /**
   * 文件扩展名过滤（不含点号，如 ['md', 'yml']）
   */
  extensions?: string[];
  /**
   * 是否包含隐藏文件（以.开头的文件）
   */
  includeHidden?: boolean;
}

/**
 * Artifact 文件树应用服务
 * 提供文件树操作的通用逻辑，将文档、设计图、任务、文件夹等都视为工件
 */
export interface ArtifactTreeApplicationService {
  /**
   * 读取文件内容
   * @param vault Vault 引用
   * @param filePath 文件相对路径（相对于 vault 根目录）
   * @param options 读取选项
   */
  readFile(
    vault: VaultReference,
    filePath: string,
    options?: ReadFileOptions
  ): Promise<Result<string, ArtifactError>>;

  /**
   * 写入文件内容
   * @param vault Vault 引用
   * @param filePath 文件相对路径
   * @param content 文件内容
   */
  writeFile(
    vault: VaultReference,
    filePath: string,
    content: string
  ): Promise<Result<void, ArtifactError>>;

  /**
   * 检查文件或目录是否存在
   * @param vault Vault 引用
   * @param path 路径（相对路径）
   */
  exists(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>>;

  /**
   * 检查是否为目录
   * @param vault Vault 引用
   * @param path 路径（相对路径）
   */
  isDirectory(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>>;

  /**
   * 检查是否为文件
   * @param vault Vault 引用
   * @param path 路径（相对路径）
   */
  isFile(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>>;

  /**
   * 列出目录内容
   * @param vault Vault 引用
   * @param dirPath 目录相对路径（相对于 vault 根目录），空字符串表示 vault 根目录
   * @param options 列出选项
   */
  listDirectory(
    vault: VaultReference,
    dirPath: string,
    options?: ListDirectoryOptions
  ): Promise<Result<FileTreeNode[], ArtifactError>>;

  /**
   * 创建目录（递归创建）
   * @param vault Vault 引用
   * @param dirPath 目录相对路径
   */
  createDirectory(
    vault: VaultReference,
    dirPath: string
  ): Promise<Result<void, ArtifactError>>;

  /**
   * 删除文件或目录
   * @param vault Vault 引用
   * @param path 路径（相对路径）
   * @param recursive 如果是目录，是否递归删除
   */
  delete(
    vault: VaultReference,
    path: string,
    recursive?: boolean
  ): Promise<Result<void, ArtifactError>>;

  /**
   * 获取文件或目录的完整路径
   * @param vault Vault 引用
   * @param path 相对路径
   */
  getFullPath(vault: VaultReference, path: string): string;
}

