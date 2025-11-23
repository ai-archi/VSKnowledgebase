import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import {
  ViewpointApplicationService,
  Viewpoint,
  CodePathTree,
  CodePathTreeNode,
  ArtifactTree,
  ArtifactTreeNode,
} from './ViewpointApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { MetadataRepository } from '../../shared/infrastructure/MetadataRepository';
import { ArtifactRepository } from '../../shared/infrastructure/ArtifactRepository';
import { VaultRepository } from '../../shared/infrastructure/VaultRepository';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { Logger } from '../../../core/logger/Logger';
import { ConfigManager } from '../../../core/config/ConfigManager';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * 代码文件扩展名列表
 */
const CODE_FILE_EXTENSIONS = [
  '.ts', '.tsx', '.js', '.jsx', '.java', '.py', '.go', '.rs', '.cpp', '.c', '.h',
  '.cs', '.php', '.rb', '.swift', '.kt', '.scala', '.clj', '.sh', '.bash',
];

/**
 * 预定义视点
 */
const PREDEFINED_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'current-code-related',
    name: '当前代码关联文档',
    description: '显示与当前打开代码文件关联的所有文档',
    type: 'code-related',
    codeRelatedConfig: {
      mode: 'reverse', // 反向关联：代码 → 文档
    },
    isPredefined: true,
    isDefault: true, // 默认视点
  },
  {
    id: 'lifecycle',
    name: '生命周期视图',
    description: '按研发生产周期组织文档',
    type: 'tag',
    requiredTags: ['lifecycle'],
    isPredefined: true,
  },
  {
    id: 'architecture',
    name: '架构层次视图',
    description: '按架构层次组织文档',
    type: 'tag',
    requiredTags: ['architecture'],
    isPredefined: true,
  },
  {
    id: 'requirement',
    name: '需求管理视图',
    description: '聚焦需求相关的文档',
    type: 'tag',
    requiredTags: ['type.requirement'],
    isPredefined: true,
  },
  {
    id: 'design',
    name: '设计管理视图',
    description: '聚焦设计相关的文档',
    type: 'tag',
    requiredTags: ['type.design'],
    isPredefined: true,
  },
];

@injectable()
export class ViewpointApplicationServiceImpl implements ViewpointApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.MetadataRepository)
    private metadataRepository: MetadataRepository,
    @inject(TYPES.ArtifactRepository)
    private artifactRepository: ArtifactRepository,
    @inject(TYPES.VaultRepository)
    private vaultRepository: VaultRepository,
    @inject(TYPES.VaultFileSystemAdapter)
    private vaultAdapter: VaultFileSystemAdapter,
    @inject(TYPES.ConfigManager)
    private configManager: ConfigManager,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  /**
   * 获取所有预定义视点
   */
  getPredefinedViewpoints(): Viewpoint[] {
    return PREDEFINED_VIEWPOINTS;
  }

  /**
   * 获取自定义视点
   */
  async getCustomViewpoints(vaultId?: string): Promise<Result<Viewpoint[], ArtifactError>> {
    try {
      const viewpoints: Viewpoint[] = [];

      if (vaultId) {
        // 从指定 Vault 加载
        const vaultName = vaultId; // 简化处理，假设 vaultId 就是 vaultName
        const viewpointsDir = path.join(this.vaultAdapter.getVaultPath(vaultName), 'viewpoints');
        if (fs.existsSync(viewpointsDir)) {
          const files = fs.readdirSync(viewpointsDir);
          for (const file of files) {
            if (file.endsWith('.yml')) {
              const filePath = path.join(viewpointsDir, file);
              const content = fs.readFileSync(filePath, 'utf-8');
              const viewpoint = yaml.load(content) as Viewpoint;
              viewpoints.push(viewpoint);
            }
          }
        }
      } else {
        // 从所有 Vault 加载
        const vaultsRoot = this.vaultAdapter.getVaultsRoot();
        if (fs.existsSync(vaultsRoot)) {
          const vaults = fs.readdirSync(vaultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const vaultName of vaults) {
            const viewpointsDir = path.join(vaultsRoot, vaultName, 'viewpoints');
            if (fs.existsSync(viewpointsDir)) {
              const files = fs.readdirSync(viewpointsDir);
              for (const file of files) {
                if (file.endsWith('.yml')) {
                  const filePath = path.join(viewpointsDir, file);
                  const content = fs.readFileSync(filePath, 'utf-8');
                  const viewpoint = yaml.load(content) as Viewpoint;
                  viewpoints.push(viewpoint);
                }
              }
            }
          }
        }
      }

      return { success: true, value: viewpoints };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get custom viewpoints: ${error.message}`,
          { vaultId },
          error
        ),
      };
    }
  }

  /**
   * 根据视点筛选 Artifact
   */
  async filterArtifactsByViewpoint(
    viewpoint: Viewpoint,
    vaultId?: string
  ): Promise<Result<Artifact[], ArtifactError>> {
    try {
      // 代码关联视点特殊处理
      if (viewpoint.type === 'code-related' && viewpoint.codeRelatedConfig) {
        const currentFilePath = viewpoint.codeRelatedConfig.currentFilePath;
        if (currentFilePath && viewpoint.codeRelatedConfig.mode === 'reverse') {
          // 反向关联：代码 → 文档
          return await this.getRelatedArtifacts(currentFilePath);
        } else if (currentFilePath && viewpoint.codeRelatedConfig.mode === 'forward') {
          // 正向关联：文档 → 代码（需要先判断是否为 Artifact）
          const isArtifactResult = await this.isArtifactFile(currentFilePath);
          if (isArtifactResult.success && isArtifactResult.value) {
            const artifactResult = await this.getArtifactByPath(currentFilePath);
            if (artifactResult.success && artifactResult.value) {
              const codePathsResult = await this.getRelatedCodePaths(artifactResult.value.id);
              // 正向关联返回空列表，因为代码路径不是 Artifact
              return { success: true, value: [] };
            }
          }
          return { success: true, value: [] };
        }
        return { success: true, value: [] };
      }

      // 标签视点处理
      const artifactsResult = await this.artifactService.listArtifacts(vaultId);
      if (!artifactsResult.success) {
        return artifactsResult;
      }

      const matchedArtifacts = artifactsResult.value.filter(artifact =>
        this.matchesViewpoint(artifact, viewpoint)
      );

      return { success: true, value: matchedArtifacts };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to filter artifacts by viewpoint: ${error.message}`,
          { viewpoint: viewpoint.id, vaultId },
          error
        ),
      };
    }
  }

  /**
   * 检查 Artifact 是否匹配视点
   */
  matchesViewpoint(artifact: Artifact, viewpoint: Viewpoint): boolean {
    // 代码关联视点不在此处匹配，由 filterArtifactsByViewpoint 处理
    if (viewpoint.type === 'code-related') {
      return false; // 代码关联视点需要特殊处理
    }

    const artifactTags = artifact.tags || [];

    // 如果没有标签，直接排除
    if (artifactTags.length === 0) {
      return false;
    }

    // 检查必须包含的标签（AND 关系）
    if (viewpoint.requiredTags && viewpoint.requiredTags.length > 0) {
      const hasAllRequired = viewpoint.requiredTags.every(tag => artifactTags.includes(tag));
      if (!hasAllRequired) {
        return false;
      }
    }

    // 检查可选标签（OR 关系）
    if (viewpoint.optionalTags && viewpoint.optionalTags.length > 0) {
      const hasAnyOptional = viewpoint.optionalTags.some(tag => artifactTags.includes(tag));
      if (!hasAnyOptional) {
        return false;
      }
    }

    // 检查排除的标签（NOT 关系）
    if (viewpoint.excludedTags && viewpoint.excludedTags.length > 0) {
      const hasExcluded = viewpoint.excludedTags.some(tag => artifactTags.includes(tag));
      if (hasExcluded) {
        return false;
      }
    }

    return true;
  }

  /**
   * 创建自定义视点
   */
  async createViewpoint(
    vaultId: string,
    viewpoint: Omit<Viewpoint, 'id' | 'isPredefined'>
  ): Promise<Result<Viewpoint, ArtifactError>> {
    try {
      const viewpointId = uuidv4();
      const fullViewpoint: Viewpoint = {
        ...viewpoint,
        id: viewpointId,
        isPredefined: false,
      };

      const vaultName = vaultId; // 简化处理
      const viewpointsDir = path.join(this.vaultAdapter.getVaultPath(vaultName), 'viewpoints');
      if (!fs.existsSync(viewpointsDir)) {
        fs.mkdirSync(viewpointsDir, { recursive: true });
      }

      const viewpointPath = path.join(viewpointsDir, `${viewpointId}.yml`);
      fs.writeFileSync(viewpointPath, yaml.dump(fullViewpoint), 'utf-8');

      return { success: true, value: fullViewpoint };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create viewpoint: ${error.message}`,
          { vaultId, viewpoint },
          error
        ),
      };
    }
  }

  /**
   * 更新视点
   */
  async updateViewpoint(
    vaultId: string,
    viewpointId: string,
    updates: Partial<Viewpoint>
  ): Promise<Result<Viewpoint, ArtifactError>> {
    try {
      const vaultName = vaultId;
      const viewpointPath = path.join(
        this.vaultAdapter.getVaultPath(vaultName),
        'viewpoints',
        `${viewpointId}.yml`
      );

      if (!fs.existsSync(viewpointPath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Viewpoint not found: ${viewpointId}`, { viewpointId }),
        };
      }

      const content = fs.readFileSync(viewpointPath, 'utf-8');
      const existingViewpoint = yaml.load(content) as Viewpoint;

      const updatedViewpoint: Viewpoint = {
        ...existingViewpoint,
        ...updates,
        id: viewpointId, // 确保 ID 不变
        isPredefined: existingViewpoint.isPredefined, // 确保 isPredefined 不变
      };

      fs.writeFileSync(viewpointPath, yaml.dump(updatedViewpoint), 'utf-8');

      return { success: true, value: updatedViewpoint };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update viewpoint: ${error.message}`,
          { vaultId, viewpointId, updates },
          error
        ),
      };
    }
  }

  /**
   * 删除视点
   */
  async deleteViewpoint(vaultId: string, viewpointId: string): Promise<Result<void, ArtifactError>> {
    try {
      const vaultName = vaultId;
      const viewpointPath = path.join(
        this.vaultAdapter.getVaultPath(vaultName),
        'viewpoints',
        `${viewpointId}.yml`
      );

      if (!fs.existsSync(viewpointPath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Viewpoint not found: ${viewpointId}`, { viewpointId }),
        };
      }

      fs.unlinkSync(viewpointPath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete viewpoint: ${error.message}`,
          { vaultId, viewpointId },
          error
        ),
      };
    }
  }

  // ========== 代码关联功能实现 ==========

  /**
   * 获取文档关联的代码路径
   */
  async getRelatedCodePaths(artifactId: string): Promise<Result<string[], ArtifactError>> {
    try {
      const metadataResult = await this.metadataRepository.findByArtifactId(artifactId);
      if (!metadataResult.success) {
        return {
          success: false,
          error: metadataResult.error,
        };
      }

      if (!metadataResult.value) {
        return { success: true, value: [] };
      }

      const codePaths = metadataResult.value.relatedCodePaths || [];
      return { success: true, value: codePaths };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get related code paths: ${error.message}`,
          { artifactId },
          error
        ),
      };
    }
  }

  /**
   * 获取代码文件关联的文档
   */
  async getRelatedArtifacts(codePath: string): Promise<Result<Artifact[], ArtifactError>> {
    try {
      // 规范化代码路径（相对于工作区根目录）
      const normalizedCodePath = this.normalizeCodePath(codePath);

      // 通过 MetadataRepository 查询关联的元数据
      const metadataResult = await this.metadataRepository.findByCodePath(normalizedCodePath);
      if (!metadataResult.success) {
        return {
          success: false,
          error: metadataResult.error,
        };
      }

      // 根据元数据获取对应的 Artifact
      const artifacts: Artifact[] = [];
      for (const metadata of metadataResult.value) {
        // 需要根据 artifactId 查找 Artifact
        // 由于 ArtifactRepository 需要 vaultId，我们需要遍历所有 vault
        const vaultsResult = await this.vaultRepository.findAll();
        if (vaultsResult.success) {
          for (const vault of vaultsResult.value) {
            const artifactResult = await this.artifactRepository.findById(vault.id, metadata.artifactId);
            if (artifactResult.success && artifactResult.value) {
              artifacts.push(artifactResult.value);
              break; // 找到后跳出循环
            }
          }
        }
      }

      return { success: true, value: artifacts };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get related artifacts: ${error.message}`,
          { codePath },
          error
        ),
      };
    }
  }

  /**
   * 判断文件是否为 Artifact
   */
  async isArtifactFile(filePath: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const artifactResult = await this.getArtifactByPath(filePath);
      return { success: true, value: artifactResult.success && artifactResult.value !== null };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check if file is artifact: ${error.message}`,
          { filePath },
          error
        ),
      };
    }
  }

  /**
   * 判断文件是否为代码文件
   */
  isCodeFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return CODE_FILE_EXTENSIONS.includes(ext);
  }

  /**
   * 根据文件路径获取 Artifact
   */
  async getArtifactByPath(filePath: string): Promise<Result<Artifact | null, ArtifactError>> {
    try {
      const architoolRoot = this.configManager.getArchitoolRoot();
      
      // 检查文件路径是否在 .architool 目录下
      if (!filePath.includes(architoolRoot)) {
        return { success: true, value: null };
      }

      // 提取相对路径（相对于 .architool 根目录）
      const relativePath = path.relative(architoolRoot, filePath);
      const parts = relativePath.split(path.sep);

      // 路径格式：{vault-name}/artifacts/{artifact-path}
      if (parts.length < 3 || parts[1] !== 'artifacts') {
        return { success: true, value: null };
      }

      const vaultName = parts[0];
      const artifactPath = parts.slice(2).join(path.sep);

      // 查找 Vault
      const vaultsResult = await this.vaultRepository.findAll();
      if (!vaultsResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Failed to list vaults: ${vaultsResult.error.message}`,
            { filePath }
          ),
        };
      }

      const vault = vaultsResult.value.find(v => v.name === vaultName);
      if (!vault) {
        return { success: true, value: null };
      }

      // 通过路径查找 Artifact
      const artifactResult = await this.artifactRepository.findByPath(vault.id, artifactPath);
      if (!artifactResult.success) {
        return {
          success: false,
          error: artifactResult.error,
        };
      }

      return { success: true, value: artifactResult.value };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get artifact by path: ${error.message}`,
          { filePath },
          error
        ),
      };
    }
  }

  /**
   * 组织代码路径为树形结构
   */
  organizeCodePathsAsTree(codePaths: string[]): CodePathTree {
    const root: CodePathTreeNode = {
      name: 'root',
      path: '',
      type: 'directory',
      children: [],
    };

    for (const codePath of codePaths) {
      const parts = codePath.split(path.sep).filter(p => p.length > 0);
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join(path.sep);

        if (!current.children) {
          current.children = [];
        }

        let child = current.children.find(c => c.name === part);
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'directory',
            children: isLast ? undefined : [],
          };
          current.children.push(child);
        }

        current = child;
      }
    }

    return { root };
  }

  /**
   * 组织 Artifact 为树形结构（按 viewType 分类）
   */
  organizeArtifactsAsTree(artifacts: Artifact[]): ArtifactTree {
    const root: ArtifactTreeNode = {
      viewType: 'root',
      artifacts: [],
      children: [],
    };

    // 按 viewType 分组
    const byViewType = new Map<string, Artifact[]>();
    for (const artifact of artifacts) {
      const viewType = artifact.viewType || 'document';
      if (!byViewType.has(viewType)) {
        byViewType.set(viewType, []);
      }
      byViewType.get(viewType)!.push(artifact);
    }

    // 创建树节点
    for (const [viewType, viewTypeArtifacts] of byViewType.entries()) {
      const node: ArtifactTreeNode = {
        viewType,
        artifacts: viewTypeArtifacts,
      };
      if (!root.children) {
        root.children = [];
      }
      root.children.push(node);
    }

    return { root };
  }

  /**
   * 规范化代码路径（相对于工作区根目录）
   */
  private normalizeCodePath(codePath: string): string {
    // 如果路径是绝对路径，需要转换为相对路径
    // 这里简化处理，假设传入的路径已经是相对路径或可以使用的路径
    return path.normalize(codePath).replace(/\\/g, '/');
  }
}

