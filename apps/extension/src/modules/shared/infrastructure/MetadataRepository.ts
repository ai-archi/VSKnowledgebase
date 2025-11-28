import { ArtifactMetadata } from '../domain/ArtifactMetadata';
import { Result, ArtifactError } from '../domain/errors';

export interface CreateMetadataOptions {
  title?: string;
  description?: string;
}

export interface MetadataRepository {
  findById(metadataId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
  findByArtifactId(artifactId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>>;
  findByCodePath(codePath: string): Promise<Result<ArtifactMetadata[], ArtifactError>>;
  /**
   * 创建元数据并持久化到文件系统，同时同步到索引
   * @param metadata 元数据对象
   * @param options 可选的artifact信息（用于索引同步）
   */
  create(metadata: ArtifactMetadata, options?: CreateMetadataOptions): Promise<Result<ArtifactMetadata, ArtifactError>>;
  /**
   * 更新元数据并同步到索引
   * @param metadata 元数据对象
   * @param options 可选的artifact信息（用于索引同步）
   */
  update(metadata: ArtifactMetadata, options?: CreateMetadataOptions): Promise<Result<ArtifactMetadata, ArtifactError>>;
  /**
   * 删除元数据并从索引中移除
   * @param metadataId 元数据ID
   * @param artifactId 可选的Artifact ID（用于从索引中删除）
   */
  delete(metadataId: string, artifactId?: string): Promise<Result<void, ArtifactError>>;
}


