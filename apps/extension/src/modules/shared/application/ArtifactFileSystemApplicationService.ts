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

export interface ArtifactFileSystemApplicationService {
  createArtifact(opts: CreateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
  getArtifact(vaultId: string, artifactId: string): Promise<Result<Artifact, ArtifactError>>;
  updateArtifact(artifactId: string, updates: UpdateArtifactOpts): Promise<Result<Artifact, ArtifactError>>;
  updateArtifactContent(vaultId: string, artifactId: string, newContent: string): Promise<Result<void, ArtifactError>>;
  deleteArtifact(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>>;
  listArtifacts(vaultId?: string, options?: QueryOptions): Promise<Result<Artifact[], ArtifactError>>;
  updateArtifactMetadata(artifactId: string, updates: Partial<ArtifactMetadata>): Promise<Result<ArtifactMetadata, ArtifactError>>;
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
    template: any
  ): Promise<Result<void, ArtifactError>>;
}


