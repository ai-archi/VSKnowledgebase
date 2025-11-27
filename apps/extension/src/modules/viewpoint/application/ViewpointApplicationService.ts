import { Result } from '../../../core/types/Result';
import { Artifact } from '../../shared/domain/artifact';
import { ArtifactError } from '../../shared/domain/errors';

/**
 * 视点类型
 */
export type ViewpointType = 'tag' | 'code-related';

/**
 * 视点定义
 */
export interface Viewpoint {
  id: string;
  name: string;
  description?: string;
  type: ViewpointType; // 视点类型：tag（标签视点）或 code-related（代码关联视点）
  
  // 标签视点配置（type === 'tag' 时使用）
  requiredTags?: string[]; // 必须包含的标签（AND 关系）
  optionalTags?: string[]; // 可选包含的标签（OR 关系）
  excludedTags?: string[]; // 排除的标签（NOT 关系）
  
  // 代码关联视点配置（type === 'code-related' 时使用）
  codeRelatedConfig?: {
    mode: 'forward' | 'reverse'; // forward: 文档→代码，reverse: 代码→文档
    currentFilePath?: string; // 当前打开的文件路径（响应式更新）
  };
  
  isPredefined: boolean; // 是否为预定义视点
  isDefault?: boolean; // 是否为默认视点（"当前代码关联文档"视点）
}

/**
 * 代码路径树节点
 */
export interface CodePathTreeNode {
  name: string; // 节点名称（文件名或目录名）
  path: string; // 完整路径
  type: 'file' | 'directory';
  children?: CodePathTreeNode[]; // 子节点（仅目录有）
}

/**
 * 代码路径树
 */
export interface CodePathTree {
  root: CodePathTreeNode;
}

/**
 * Artifact 树节点
 */
export interface ArtifactTreeNode {
  viewType: string; // 视图类型（document/design/development/test）
  artifacts: Artifact[]; // 该视图类型下的 Artifact 列表
  children?: ArtifactTreeNode[]; // 子节点（按 category 进一步分类）
}

/**
 * Artifact 树
 */
export interface ArtifactTree {
  root: ArtifactTreeNode;
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

  // ========== 代码关联功能（原 DevelopmentApplicationService） ==========

  /**
   * 获取文档关联的代码路径
   * @param artifactId Artifact ID
   * @returns 代码路径列表（按目录层级组织）
   */
  getRelatedCodePaths(artifactId: string): Promise<Result<string[], ArtifactError>>;

  /**
   * 获取代码文件关联的文档（用于"当前代码关联文档"视点）
   * @param codePath 代码文件路径（相对于工作区根目录）
   * @returns 关联的 Artifact 列表
   */
  getRelatedArtifacts(codePath: string): Promise<Result<Artifact[], ArtifactError>>;

  /**
   * 判断文件是否为 Artifact
   * @param filePath 文件路径
   * @returns 是否为 Artifact
   */
  isArtifactFile(filePath: string): Promise<Result<boolean, ArtifactError>>;

  /**
   * 判断文件是否为代码文件
   * @param filePath 文件路径
   * @returns 是否为代码文件
   */
  isCodeFile(filePath: string): boolean;

  /**
   * 根据文件路径获取 Artifact
   * @param filePath 文件路径
   * @returns Artifact 或 null
   */
  getArtifactByPath(filePath: string): Promise<Result<Artifact | null, ArtifactError>>;

  /**
   * 组织代码路径为树形结构
   * @param codePaths 代码路径列表
   * @returns 树形结构数据
   */
  organizeCodePathsAsTree(codePaths: string[]): CodePathTree;

  /**
   * 组织 Artifact 为树形结构（按 viewType 分类）
   * @param artifacts Artifact 列表
   * @returns 树形结构数据
   */
  organizeArtifactsAsTree(artifacts: Artifact[]): ArtifactTree;
}

