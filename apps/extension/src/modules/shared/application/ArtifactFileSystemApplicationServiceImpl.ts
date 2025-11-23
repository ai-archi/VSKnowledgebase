import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { ArtifactFileSystemApplicationService, CreateArtifactOpts, UpdateArtifactOpts } from './ArtifactFileSystemApplicationService';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode, QueryOptions } from '../../../domain/shared/artifact/errors';
import { ArtifactValidator } from '../../../domain/shared/artifact/ArtifactValidator';
import { ArtifactFileSystemAdapter } from '../../../infrastructure/storage/file/ArtifactFileSystemAdapter';
import { DuckDbRuntimeIndex } from '../../../infrastructure/storage/duckdb/DuckDbRuntimeIndex';
import { MetadataRepository } from '../infrastructure/MetadataRepository';
import { VaultApplicationService } from './VaultApplicationService';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

@injectable()
export class ArtifactFileSystemApplicationServiceImpl implements ArtifactFileSystemApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemAdapter) private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.DuckDbRuntimeIndex) private index: DuckDbRuntimeIndex,
    @inject(TYPES.MetadataRepository) private metadataRepo: MetadataRepository,
    @inject(TYPES.VaultApplicationService) private vaultService: VaultApplicationService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createArtifact(opts: CreateArtifactOpts): Promise<Result<Artifact, ArtifactError>> {
    const artifactId = uuidv4();
    const metadataId = uuidv4();
    const now = new Date().toISOString();

    const artifact: Artifact = {
      id: artifactId,
      vault: opts.vault,
      nodeType: 'FILE',
      path: opts.path,
      name: path.basename(opts.path, path.extname(opts.path)),
      format: opts.format || 'md',
      contentLocation: this.fileAdapter.getArtifactPath(opts.vault.name, opts.path),
      viewType: opts.viewType,
      category: opts.category,
      title: opts.title,
      description: '',
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      metadataId,
      tags: opts.tags,
    };

    const validationResult = ArtifactValidator.validate(artifact);
    if (!validationResult.success) {
      return validationResult;
    }

    const writeResult = await this.fileAdapter.writeArtifact(
      opts.vault.name,
      opts.path,
      opts.content
    );
    if (!writeResult.success) {
      return writeResult;
    }

    const metadata: ArtifactMetadata = {
      id: metadataId,
      artifactId,
      vaultId: opts.vault.id,
      vaultName: opts.vault.name,
      type: opts.viewType,
      category: opts.category,
      tags: opts.tags || [],
      createdAt: now,
      updatedAt: now,
    };

    const metadataResult = await this.metadataRepo.create(metadata);
    if (!metadataResult.success) {
      return metadataResult;
    }

    try {
      const metadataPath = this.fileAdapter.getMetadataPath(opts.vault.name, metadataId);
      await this.index.syncFromYaml(metadata, metadataPath, artifact.title, artifact.description);
    } catch (error: any) {
      this.logger.warn('Failed to sync to index', error);
    }

    return { success: true, value: artifact };
  }

  async getArtifact(vaultId: string, artifactId: string): Promise<Result<Artifact, ArtifactError>> {
    try {
      // artifactId 可能是 artifact ID 或 path
      // 先尝试从 listArtifacts 中查找
      const artifactsResult = await this.listArtifacts(vaultId);
      if (!artifactsResult.success) {
        return artifactsResult;
      }

      // 尝试通过 ID 或 path 匹配
      const artifact = artifactsResult.value.find(
        a => a.id === artifactId || a.path === artifactId
      );

      if (!artifact) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Artifact not found: ${artifactId}`),
        };
      }

      return { success: true, value: artifact };
    } catch (error: any) {
      this.logger.error('Failed to get artifact', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get artifact: ${error.message}`,
          { vaultId, artifactId },
          error
        ),
      };
    }
  }

  async updateArtifact(artifactId: string, updates: UpdateArtifactOpts): Promise<Result<Artifact, ArtifactError>> {
    try {
      // 先获取 artifact（需要 vaultId）
      // artifactId 可能是 artifact ID 或 path
      // 需要先找到 artifact 以获取 vaultId
      const allArtifactsResult = await this.listArtifacts();
      if (!allArtifactsResult.success) {
        return allArtifactsResult;
      }

      const artifact = allArtifactsResult.value.find(
        a => a.id === artifactId || a.path === artifactId
      );

      if (!artifact) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Artifact not found: ${artifactId}`,
            { artifactId }
          ),
        };
      }

      const vaultId = artifact.vault.id;
      const vaultName = artifact.vault.name;

      // 检查 Vault 是否为只读
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${vaultId}`,
            { vaultId }
          ),
        };
      }

      if (vaultResult.value.readOnly) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.VAULT_READ_ONLY,
            `Cannot update artifact in read-only vault: ${vaultName}`,
            { vaultId, vaultName }
          ),
        };
      }

      // 更新 Artifact 属性
      const updatedArtifact: Artifact = {
        ...artifact,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // 如果更新了内容，需要写入文件
      if (updates.content !== undefined) {
        const writeResult = await this.fileAdapter.writeArtifact(
          vaultName,
          artifact.path,
          updates.content
        );
        if (!writeResult.success) {
          return writeResult;
        }
      }

      // 如果更新了元数据相关字段，需要更新元数据文件
      if (updates.title || updates.description || updates.tags || updates.category) {
        if (artifact.metadataId) {
          const metadataResult = await this.metadataRepo.findById(artifact.metadataId);
          if (metadataResult.success && metadataResult.value) {
            const metadata = metadataResult.value;
            const updatedMetadata: ArtifactMetadata = {
              ...metadata,
              ...(updates.title && { type: metadata.type }), // 保持 type
              ...(updates.tags && { tags: updates.tags }),
              updatedAt: new Date().toISOString(),
            };
            await this.metadataRepo.update(updatedMetadata);
          }
        }
      }

      this.logger.info('Artifact updated', { artifactId: updatedArtifact.id });
      return { success: true, value: updatedArtifact };
    } catch (error: any) {
      this.logger.error('Failed to update artifact', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update artifact: ${error.message}`,
          { artifactId },
          error
        ),
      };
    }
  }

  async updateArtifactContent(vaultId: string, artifactId: string, newContent: string): Promise<Result<void, ArtifactError>> {
    try {
      // 获取 artifact
      const artifactResult = await this.getArtifact(vaultId, artifactId);
      if (!artifactResult.success) {
        return artifactResult;
      }

      const artifact = artifactResult.value;
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${vaultId}`,
            { vaultId }
          ),
        };
      }

      if (vaultResult.value.readOnly) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.VAULT_READ_ONLY,
            `Cannot update artifact content in read-only vault: ${vaultResult.value.name}`,
            { vaultId }
          ),
        };
      }

      // 写入新内容
      const writeResult = await this.fileAdapter.writeArtifact(
        vaultResult.value.name,
        artifact.path,
        newContent
      );

      if (!writeResult.success) {
        return writeResult;
      }

      // 更新 artifact 的 updatedAt（通过更新元数据）
      if (artifact.metadataId) {
        const metadataResult = await this.metadataRepo.findById(artifact.metadataId);
        if (metadataResult.success && metadataResult.value) {
          const updatedMetadata: ArtifactMetadata = {
            ...metadataResult.value,
            updatedAt: new Date().toISOString(),
          };
          await this.metadataRepo.update(updatedMetadata);
        }
      }

      this.logger.info('Artifact content updated', { artifactId });
      return { success: true, value: undefined };
    } catch (error: any) {
      this.logger.error('Failed to update artifact content', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update artifact content: ${error.message}`,
          { vaultId, artifactId },
          error
        ),
      };
    }
  }

  async deleteArtifact(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>> {
    try {
      // artifactId 可能是 artifact ID 或 path
      // 先尝试通过 path 获取 artifact（如果 artifactId 是 path）
      const artifactResult = await this.getArtifact(vaultId, artifactId);
      
      if (!artifactResult.success) {
        return {
          success: false,
          error: artifactResult.error,
        };
      }

      const artifact = artifactResult.value;
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
        };
      }

      const vaultName = vaultResult.value.name;

      // 删除文件系统中的文件
      const deleteFileResult = await this.fileAdapter.deleteArtifact(vaultName, artifact.path);
      if (!deleteFileResult.success) {
        return deleteFileResult;
      }

      // 删除 metadata 文件（如果存在）
      if (artifact.metadataId) {
        const metadataResult = await this.metadataRepo.delete(artifact.metadataId);
        if (!metadataResult.success) {
          // metadata 删除失败不影响主流程，只记录日志
          this.logger.warn(`Failed to delete metadata: ${artifact.metadataId}`, metadataResult.error);
        }
      }

      // 从索引中删除
      try {
        await this.index.removeFromIndex(artifact.id);
      } catch (error: any) {
        // 索引删除失败不影响主流程，只记录日志
        this.logger.warn(`Failed to delete artifact from index: ${artifact.id}`, error);
      }

      this.logger.info(`Artifact deleted: ${artifact.path} (${artifact.id})`);
      return { success: true, value: undefined };
    } catch (error: any) {
      this.logger.error('Failed to delete artifact', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete artifact: ${error.message}`,
          { vaultId, artifactId },
          error
        ),
      };
    }
  }

  async listArtifacts(vaultId?: string, options?: QueryOptions): Promise<Result<Artifact[], ArtifactError>> {
    try {
      this.logger.info(`listArtifacts called with vaultId: ${vaultId || 'undefined'}`);
      const artifacts: Artifact[] = [];
      
      // 获取要扫描的 vault 列表
      let vaultsToScan: Array<{ id: string; name: string }> = [];
      
      if (vaultId) {
        // 只扫描指定的 vault
        this.logger.info(`Getting vault by id: ${vaultId}`);
        const vaultResult = await this.vaultService.getVault(vaultId);
        if (!vaultResult.success || !vaultResult.value) {
          this.logger.warn(`Vault not found: ${vaultId}`);
          return { success: true, value: [] };
        }
        this.logger.info(`Found vault: ${vaultResult.value.name} (${vaultResult.value.id})`);
        vaultsToScan = [{ id: vaultResult.value.id, name: vaultResult.value.name }];
      } else {
        // 扫描所有 vault
        this.logger.info('Listing all vaults');
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          this.logger.warn('Failed to list vaults');
          return { success: true, value: [] };
        }
        this.logger.info(`Found ${vaultsResult.value.length} vaults`);
        vaultsToScan = vaultsResult.value.map(v => ({ id: v.id, name: v.name }));
      }

      // 扫描每个 vault 的 artifacts 目录
      for (const vault of vaultsToScan) {
        this.logger.info(`Scanning artifacts for vault: ${vault.name} (${vault.id})`);
        const vaultArtifacts = await this.scanVaultArtifacts(vault.id, vault.name);
        this.logger.info(`Found ${vaultArtifacts.length} artifacts in vault ${vault.name}`);
        artifacts.push(...vaultArtifacts);
      }

      // 应用查询选项（如果有）
      let filteredArtifacts = artifacts;
      if (options) {
        // 按 viewType 过滤
        if (options.viewType) {
          filteredArtifacts = filteredArtifacts.filter(a => a.viewType === options.viewType);
        }

        // 按 category 过滤
        if (options.category) {
          filteredArtifacts = filteredArtifacts.filter(a => a.category === options.category);
        }

        // 按 tags 过滤（必须包含所有指定标签，AND 关系）
        if (options.tags && options.tags.length > 0) {
          filteredArtifacts = filteredArtifacts.filter(a => {
            const artifactTags = a.tags || [];
            return options.tags!.every(tag => artifactTags.includes(tag));
          });
        }

        // 按 status 过滤
        if (options.status) {
          filteredArtifacts = filteredArtifacts.filter(a => a.status === options.status);
        }

        // 通用 filter 对象过滤（支持自定义过滤条件）
        if (options.filter) {
          for (const [key, value] of Object.entries(options.filter)) {
            filteredArtifacts = filteredArtifacts.filter((a: any) => {
              const artifactValue = (a as any)[key];
              if (Array.isArray(value)) {
                // 如果 filter 值是数组，检查 artifact 值是否在数组中
                return Array.isArray(artifactValue)
                  ? artifactValue.some((v: any) => value.includes(v))
                  : value.includes(artifactValue);
              }
              return artifactValue === value;
            });
          }
        }

        // 排序
        if (options.sortBy) {
          const sortOrder = options.sortOrder || 'asc';
          filteredArtifacts.sort((a, b) => {
            const aValue = (a as any)[options.sortBy!];
            const bValue = (b as any)[options.sortBy!];
            
            if (aValue === undefined && bValue === undefined) return 0;
            if (aValue === undefined) return 1;
            if (bValue === undefined) return -1;
            
            const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            return sortOrder === 'asc' ? comparison : -comparison;
          });
        }

        // 分页
        if (options.offset !== undefined) {
          filteredArtifacts = filteredArtifacts.slice(options.offset);
        }
        if (options.limit !== undefined) {
          filteredArtifacts = filteredArtifacts.slice(0, options.limit);
        }
      }

      this.logger.info(`Total artifacts found: ${filteredArtifacts.length}`);
      return { success: true, value: filteredArtifacts };
    } catch (error: any) {
      this.logger.error('Failed to list artifacts', error);
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to list artifacts: ${error.message}`, {}, error),
      };
    }
  }

  /**
   * 扫描指定 vault 的 artifacts 目录
   */
  private async scanVaultArtifacts(vaultId: string, vaultName: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    // getArtifactPath 会返回 {architoolRoot}/{vaultName}/artifacts/{artifactPath}
    // 如果 artifactPath 为空，我们需要直接获取 artifacts 目录
    // 但是 getArtifactPath 会添加 'artifacts' 子目录，所以传入空字符串应该可以
    const artifactsDir = this.fileAdapter.getArtifactPath(vaultName, '');
    this.logger.info(`Scanning artifacts directory: ${artifactsDir}`);
    this.logger.info(`Artifacts directory exists: ${fs.existsSync(artifactsDir)}`);
    
    if (!fs.existsSync(artifactsDir)) {
      this.logger.warn(`Artifacts directory does not exist: ${artifactsDir}`);
      return artifacts;
    }

    // 递归扫描 artifacts 目录
    const scanDirectory = (dir: string, basePath: string = ''): void => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        this.logger.info(`Scanning directory: ${dir}, found ${entries.length} entries`);
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
          
          if (entry.isDirectory()) {
            // 递归扫描子目录
            this.logger.info(`Found subdirectory: ${entry.name}`);
            scanDirectory(fullPath, relativePath);
          } else if (entry.isFile()) {
            // 处理文件
            const ext = path.extname(entry.name).slice(1); // 去掉点号
            this.logger.info(`Found file: ${entry.name}, extension: ${ext}`);
            if (!ext || ext === 'md' || ext === 'yml' || ext === 'yaml') {
              // 只处理支持的格式
              this.logger.info(`Processing artifact file: ${relativePath}`);
              const artifact = this.buildArtifactFromFile(
                vaultId,
                vaultName,
                relativePath,
                fullPath,
                ext
              );
              if (artifact) {
                this.logger.info(`Built artifact: ${artifact.title} (${artifact.id})`);
                artifacts.push(artifact);
              } else {
                this.logger.warn(`Failed to build artifact from file: ${relativePath}`);
              }
            } else {
              this.logger.info(`Skipping file with unsupported extension: ${entry.name}`);
            }
          }
        }
      } catch (error: any) {
        this.logger.error(`Error scanning directory ${dir}:`, error);
      }
    };

    scanDirectory(artifactsDir);
    this.logger.info(`Finished scanning vault ${vaultName}, found ${artifacts.length} artifacts`);
    return artifacts;
  }

  /**
   * 从文件构建 Artifact 对象
   */
  private buildArtifactFromFile(
    vaultId: string,
    vaultName: string,
    artifactPath: string,
    fullPath: string,
    format: string
  ): Artifact | null {
    try {
      // 尝试读取 metadata
      const metadataId = this.guessMetadataId(artifactPath);
      let metadata: ArtifactMetadata | null = null;
      let metadataRaw: any = null;
      
      try {
        const metadataResult = this.readMetadataFile(vaultName, metadataId);
        if (metadataResult) {
          metadata = metadataResult;
          // 读取原始 metadata 以获取额外字段（如 title, path, viewType, description）
          metadataRaw = this.readMetadataFileRaw(vaultName, metadataId);
        }
      } catch (error) {
        // metadata 文件不存在，使用默认值
      }

      // 读取文件统计信息
      const stats = fs.statSync(fullPath);
      const name = path.basename(artifactPath, path.extname(artifactPath));
      
      // 构建 Artifact 对象
      // metadata 文件中的 id 可能是 artifact ID，也可能是 metadata ID
      // 如果 metadata 有 artifactId 字段，使用它；否则使用 metadata 的 id 或 metadataId
      const artifactId = metadata?.artifactId || metadataRaw?.id || metadataId;
      const metadataIdValue = metadata?.id || metadataId;
      
      const artifact: Artifact = {
        id: artifactId,
        vault: {
          id: vaultId,
          name: vaultName,
        },
        nodeType: 'FILE',
        path: artifactPath,
        name: name,
        format: format || 'md',
        contentLocation: fullPath,
        viewType: (metadataRaw?.viewType || metadata?.type as any) || 'document',
        category: metadata?.category || metadataRaw?.category,
        title: metadataRaw?.title || metadata?.id || name, // 优先使用 metadata 的 title
        description: metadataRaw?.description,
        status: 'draft',
        createdAt: metadata?.createdAt || metadataRaw?.createdAt || stats.birthtime.toISOString(),
        updatedAt: metadata?.updatedAt || metadataRaw?.updatedAt || stats.mtime.toISOString(),
        metadataId: metadataIdValue,
        tags: metadata?.tags || metadataRaw?.tags,
      };

      return artifact;
    } catch (error: any) {
      this.logger.warn(`Failed to build artifact from file: ${fullPath}`, error);
      return null;
    }
  }

  /**
   * 猜测 metadata ID（基于 artifact 路径）
   */
  private guessMetadataId(artifactPath: string): string {
    // 使用文件路径的 basename（去掉扩展名）作为 metadata ID
    return path.basename(artifactPath, path.extname(artifactPath));
  }

  /**
   * 读取 metadata 文件（返回 ArtifactMetadata 类型）
   */
  private readMetadataFile(vaultName: string, metadataId: string): ArtifactMetadata | null {
    try {
      const metadataPath = this.fileAdapter.getMetadataPath(vaultName, metadataId);
      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = yaml.load(content) as ArtifactMetadata;
      return metadata;
    } catch (error: any) {
      this.logger.warn(`Failed to read metadata file: ${metadataId}`, error);
      return null;
    }
  }

  /**
   * 读取 metadata 文件（返回原始对象，包含所有字段）
   */
  private readMetadataFileRaw(vaultName: string, metadataId: string): any | null {
    try {
      const metadataPath = this.fileAdapter.getMetadataPath(vaultName, metadataId);
      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = yaml.load(content) as any;
      return metadata;
    } catch (error: any) {
      this.logger.warn(`Failed to read metadata file raw: ${metadataId}`, error);
      return null;
    }
  }

  async updateArtifactMetadata(artifactId: string, updates: Partial<ArtifactMetadata>): Promise<Result<ArtifactMetadata, ArtifactError>> {
    try {
      // 获取 artifact
      const allArtifactsResult = await this.listArtifacts();
      if (!allArtifactsResult.success) {
        return {
          success: false,
          error: allArtifactsResult.error,
        };
      }

      const artifact = allArtifactsResult.value.find(
        a => a.id === artifactId || a.path === artifactId
      );

      if (!artifact) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Artifact not found: ${artifactId}`,
            { artifactId }
          ),
        };
      }

      if (!artifact.metadataId) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Artifact has no metadata: ${artifactId}`,
            { artifactId }
          ),
        };
      }

      // 检查 Vault 是否为只读
      const vaultResult = await this.vaultService.getVault(artifact.vault.id);
      if (!vaultResult.success || !vaultResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Vault not found: ${artifact.vault.id}`,
            { vaultId: artifact.vault.id }
          ),
        };
      }

      if (vaultResult.value.readOnly) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.VAULT_READ_ONLY,
            `Cannot update metadata in read-only vault: ${artifact.vault.name}`,
            { vaultId: artifact.vault.id }
          ),
        };
      }

      // 获取现有元数据
      const metadataResult = await this.metadataRepo.findById(artifact.metadataId);
      if (!metadataResult.success || !metadataResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Metadata not found: ${artifact.metadataId}`,
            { metadataId: artifact.metadataId }
          ),
        };
      }

      // 更新元数据
      const updatedMetadata: ArtifactMetadata = {
        ...metadataResult.value,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const updateResult = await this.metadataRepo.update(updatedMetadata);
      if (!updateResult.success) {
        return updateResult;
      }

      this.logger.info('Artifact metadata updated', { artifactId, metadataId: artifact.metadataId });
      return { success: true, value: updatedMetadata };
    } catch (error: any) {
      this.logger.error('Failed to update artifact metadata', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update artifact metadata: ${error.message}`,
          { artifactId },
          error
        ),
      };
    }
  }
}


