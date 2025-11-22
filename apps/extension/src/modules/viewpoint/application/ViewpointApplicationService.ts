import { Result } from '../../../core/types/Result';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactError } from '../../../domain/shared/artifact/errors';

/**
 * 视点定义
 */
export interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  requiredTags?: string[]; // 必须包含的标签（AND 关系）
  optionalTags?: string[]; // 可选包含的标签（OR 关系）
  excludedTags?: string[]; // 排除的标签（NOT 关系）
  isPredefined: boolean; // 是否为预定义视点
}

/**
 * 视点应用服务接口
 */
export interface ViewpointApplicationService {
  /**
   * 获取所有预定义视点
   */
  getPredefinedViewpoints(): Viewpoint[];

  /**
   * 获取自定义视点
   */
  getCustomViewpoints(vaultId?: string): Promise<Result<Viewpoint[], ArtifactError>>;

  /**
   * 根据视点筛选 Artifact
   */
  filterArtifactsByViewpoint(
    viewpoint: Viewpoint,
    vaultId?: string
  ): Promise<Result<Artifact[], ArtifactError>>;

  /**
   * 检查 Artifact 是否匹配视点
   */
  matchesViewpoint(artifact: Artifact, viewpoint: Viewpoint): boolean;

  /**
   * 创建自定义视点
   */
  createViewpoint(vaultId: string, viewpoint: Omit<Viewpoint, 'id' | 'isPredefined'>): Promise<Result<Viewpoint, ArtifactError>>;

  /**
   * 更新视点
   */
  updateViewpoint(vaultId: string, viewpointId: string, updates: Partial<Viewpoint>): Promise<Result<Viewpoint, ArtifactError>>;

  /**
   * 删除视点
   */
  deleteViewpoint(vaultId: string, viewpointId: string): Promise<Result<void, ArtifactError>>;
}

