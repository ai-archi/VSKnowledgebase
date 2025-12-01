import { Result, ArtifactError, QueryOptions } from '../domain/errors';
import { Artifact } from '../domain/entity/artifact';
import { ArtifactMetadata } from '../domain/ArtifactMetadata';
import { ArtifactViewType } from '../domain/types';
import { VaultReference } from '../domain/value_object/VaultReference';

export interface CreateArtifactOpts {
  vault: VaultReference;
  path: string;
  title: string;
  content: string;
  viewType: ArtifactViewType;
  format?: string;
  category?: string;
  tags?: string[];
}

export interface UpdateArtifactOpts {
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  category?: string;
}

/**
 * 文件/文件夹项（用于列表展示）
 */
export interface FileFolderItem {
  path: string;
  name: string;
  title?: string;
  type: 'file' | 'folder';
}

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
 * Artifact 应用服务
 * 统一管理 artifact 相关的所有操作，包括业务逻辑和文件系统操作
 */
export interface ArtifactApplicationService {
  // ========== Artifact 业务操作 ==========
  
  /**
   * 创建 artifact
   */
  createArtifact(opts: CreateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
  
  /**
   * 获取 artifact
   */
  getArtifact(vaultId: string, artifactId: string): Promise<Result<Artifact, ArtifactError>>;
  
  /**
   * 更新 artifact
   */
  updateArtifact(artifactId: string, updates: UpdateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
  
  /**
   * 更新 artifact 内容
   */
  updateArtifactContent(vaultId: string, artifactId: string, newContent: string): Promise<Result<void, ArtifactError>>;
  
  /**
   * 删除 artifact
   */
  deleteArtifact(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>>;
  
  /**
   * 列出 artifacts
   */
  listArtifacts(vaultId?: string, options?: QueryOptions): Promise<Result<Artifact[], ArtifactError>>;
  
  /**
   * 更新 artifact 元数据
   */
  updateArtifactMetadata(artifactId: string, updates: Partial<ArtifactMetadata>): Promise<Result<ArtifactMetadata, ArtifactError>>;
  
  /**
   * 更新关联文档
   * @param vaultId Vault ID
   * @param targetId 目标ID（可以是artifact ID、文件路径或文件夹路径）
   * @param targetType 目标类型：'artifact' | 'file' | 'folder' | 'vault'
   * @param relatedArtifacts 关联的Artifact ID列表
   */
  updateRelatedArtifacts(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault',
    relatedArtifacts: string[]
  ): Promise<Result<ArtifactMetadata, ArtifactError>>;

  /**
   * 更新关联代码路径
   * @param vaultId Vault ID
   * @param targetId 目标ID（可以是artifact ID、文件路径或文件夹路径）
   * @param targetType 目标类型：'artifact' | 'file' | 'folder' | 'vault'
   * @param relatedCodePaths 关联的代码路径列表
   */
  updateRelatedCodePaths(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault',
    relatedCodePaths: string[]
  ): Promise<Result<ArtifactMetadata, ArtifactError>>;

  /**
   * 获取关联文档
   * @param vaultId Vault ID
   * @param targetId 目标ID（可以是artifact ID、文件路径或文件夹路径）
   * @param targetType 目标类型：'artifact' | 'file' | 'folder' | 'vault'
   */
  getRelatedArtifacts(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault'
  ): Promise<Result<string[], ArtifactError>>;

  /**
   * 获取关联代码路径
   * @param vaultId Vault ID
   * @param targetId 目标ID（可以是artifact ID、文件路径或文件夹路径）
   * @param targetType 目标类型：'artifact' | 'file' | 'folder' | 'vault'
   */
  getRelatedCodePaths(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault'
  ): Promise<Result<string[], ArtifactError>>;
  
  /**
   * 列出 vault 中的所有文件和文件夹（不限制文件类型）
   * @param vaultId Vault ID（可选，不指定则列出所有 vault）
   * @param options 查询选项
   */
  listFilesAndFolders(vaultId?: string, options?: QueryOptions): Promise<Result<FileFolderItem[], ArtifactError>>;
  
  /**
   * 根据模板创建文件夹结构
   * @param vault Vault 引用
   * @param basePath 基础路径（相对于 artifacts 目录）
   * @param template 模板内容
   * @returns 创建结果
   */
  createFolderStructureFromTemplate(
    vault: VaultReference,
    basePath: string,
    template: import('../domain/entity/ArtifactTemplate').ArtifactTemplate
  ): Promise<Result<void, ArtifactError>>;

  // ========== 文件系统操作 ==========
  
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
