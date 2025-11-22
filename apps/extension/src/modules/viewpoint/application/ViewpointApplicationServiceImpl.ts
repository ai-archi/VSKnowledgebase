import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { ViewpointApplicationService, Viewpoint } from './ViewpointApplicationService';
import { ArtifactFileSystemApplicationService } from '../../shared/application/ArtifactFileSystemApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * 预定义视点
 */
const PREDEFINED_VIEWPOINTS: Viewpoint[] = [
  {
    id: 'lifecycle',
    name: '生命周期视图',
    description: '按研发生产周期组织文档',
    requiredTags: ['lifecycle'],
    isPredefined: true,
  },
  {
    id: 'architecture',
    name: '架构层次视图',
    description: '按架构层次组织文档',
    requiredTags: ['architecture'],
    isPredefined: true,
  },
  {
    id: 'requirement',
    name: '需求管理视图',
    description: '聚焦需求相关的文档',
    requiredTags: ['type.requirement'],
    isPredefined: true,
  },
  {
    id: 'design',
    name: '设计管理视图',
    description: '聚焦设计相关的文档',
    requiredTags: ['type.design'],
    isPredefined: true,
  },
];

@injectable()
export class ViewpointApplicationServiceImpl implements ViewpointApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.VaultFileSystemAdapter)
    private vaultAdapter: VaultFileSystemAdapter,
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
}

