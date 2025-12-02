import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import {
  ArtifactApplicationService,
  CreateArtifactOpts,
  UpdateArtifactOpts,
  FileFolderItem,
  FileTreeNode,
  ReadFileOptions,
  ListDirectoryOptions,
} from './ArtifactApplicationService';
import { Artifact } from '../domain/entity/artifact';
import { ArtifactMetadata } from '../domain/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode, QueryOptions } from '../domain/errors';
import { ArtifactValidator } from '../domain/ArtifactValidator';
import { ArtifactFileSystemAdapter } from '../infrastructure/storage/file/ArtifactFileSystemAdapter';
import { VaultFileSystemAdapter } from '../infrastructure/storage/file/VaultFileSystemAdapter';
import { SqliteRuntimeIndex } from '../infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { MetadataRepository } from '../infrastructure/MetadataRepository';
import { ArtifactRepository } from '../infrastructure/ArtifactRepository';
import { VaultApplicationService } from './VaultApplicationService';
import { VaultReference } from '../domain/value_object/VaultReference';
import { Logger } from '../../../core/logger/Logger';
import { TemplateStructureDomainServiceImpl, TemplateStructureItem } from '../domain/services/TemplateStructureDomainService';
import { FileOperationDomainService } from '../domain/services/FileOperationDomainService';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

@injectable()
export class ArtifactApplicationServiceImpl implements ArtifactApplicationService {
  constructor(
    @inject(TYPES.ArtifactFileSystemAdapter) private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.VaultFileSystemAdapter) private vaultAdapter: VaultFileSystemAdapter,
    @inject(TYPES.SqliteRuntimeIndex) private index: SqliteRuntimeIndex,
    @inject(TYPES.MetadataRepository) private metadataRepo: MetadataRepository,
    @inject(TYPES.ArtifactRepository) private artifactRepository: ArtifactRepository,
    @inject(TYPES.VaultApplicationService) private vaultService: VaultApplicationService,
    @inject(TYPES.FileOperationDomainService) private fileOperationService: FileOperationDomainService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  // ========== Artifact 业务操作 ==========

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

    // 确定文件内容：优先使用模板ID，然后使用content，最后使用默认模板
    let fileContent = opts.content;
    
    // 如果有模板ID，直接读取模板文件并进行Jinja2渲染
    if (opts.templateId && !fileContent) {
      const templateContentResult = await this.getTemplateContentAndRender(
        opts.vault,
        opts.templateId,
        opts.title,
        opts.viewType
      );
      if (templateContentResult.success) {
        fileContent = templateContentResult.value;
        this.logger.info('[ArtifactApplicationService] Template rendered', {
          templateId: opts.templateId,
          contentLength: fileContent.length
        });
      } else {
        this.logger.warn('[ArtifactApplicationService] Failed to load template', {
          templateId: opts.templateId,
          error: templateContentResult.error?.message
        });
      }
    }
    
    // 如果没有模板ID或模板获取失败，且没有提供content，尝试从默认模板获取
    if (!fileContent) {
      // 尝试从模板获取内容（通过领域服务，用于 archimate 等设计图）
      const architoolRoot = this.fileAdapter.getArtifactRoot();
      const templateContent = this.fileOperationService.getDesignTemplateContent(
        opts.viewType,
        opts.format,
        opts.templateViewType,
        opts.title,
        architoolRoot
      );
      if (templateContent) {
        fileContent = templateContent;
      } else {
        // 如果没有模板，使用默认内容
        fileContent = this.fileOperationService.generateDefaultContent(opts.title, opts.format || 'md');
      }
    }

    const writeResult = await this.fileAdapter.writeArtifact(
      opts.vault.name,
      opts.path,
      fileContent
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

    // Repository负责完整的持久化流程（包括文件持久化和索引同步）
    const metadataResult = await this.metadataRepo.create(metadata, {
      title: artifact.title,
      description: artifact.description,
    });
    if (!metadataResult.success) {
      return metadataResult;
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

      if (artifact) {
        return { success: true, value: artifact };
      }

      // 如果在 listArtifacts 中找不到，尝试通过 Repository 的 findByPath 查找
      // 这可以找到那些没有被索引的文件
      const findByPathResult = await this.artifactRepository.findByPath(vaultId, artifactId);
      if (findByPathResult.success && findByPathResult.value) {
        return { success: true, value: findByPathResult.value };
      }

      // 如果还是找不到，返回错误
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Artifact not found: ${artifactId}`),
      };
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
      const vaultResult = await this.vaultService.getVault(vaultId);
      if (!vaultResult.success) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
        };
      }

      const vaultName = vaultResult.value.name;
      let artifactPath: string;
      let artifact: Artifact | null = null;
      let metadataId: string | undefined;

      // artifactId 可能是 artifact ID 或 path
      // 先尝试通过 getArtifact 获取 artifact（可能通过 ID 或 path）
      const artifactResult = await this.getArtifact(vaultId, artifactId);
      
      if (artifactResult.success && artifactResult.value) {
        // 找到了 artifact
        artifact = artifactResult.value;
        artifactPath = artifact.path;
        metadataId = artifact.metadataId;
      } else {
        // 如果找不到 artifact，假设 artifactId 就是 path，直接使用
        artifactPath = artifactId;
        this.logger.info(`Artifact not found in index, treating as path: ${artifactPath}`);
        
        // 尝试通过 Repository 的 findByPath 查找（可能找到未索引的文件）
        const findByPathResult = await this.artifactRepository.findByPath(vaultId, artifactPath);
        if (findByPathResult.success && findByPathResult.value) {
          artifact = findByPathResult.value;
          metadataId = artifact?.metadataId;
        }
      }

      // 删除文件系统中的文件（无论是否找到 artifact 记录）
      const deleteFileResult = await this.fileAdapter.deleteArtifact(vaultName, artifactPath);
      if (!deleteFileResult.success) {
        return deleteFileResult;
      }

      // 如果找到了 artifact 记录，删除 metadata 文件（如果存在）
      if (artifact && metadataId) {
        const metadataResult = await this.metadataRepo.delete(metadataId, artifact.id);
        if (!metadataResult.success) {
          // metadata 删除失败不影响主流程，只记录日志
          this.logger.warn(`Failed to delete metadata: ${metadataId}`, metadataResult.error);
        }
      }

      this.logger.info(`Artifact deleted: ${artifactPath}${artifact ? ` (${artifact.id})` : ''}`);
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
        // 按 query 字符串过滤（文件名/路径模糊搜索）
        if (options.query && options.query.trim()) {
          const query = options.query.trim().toLowerCase();
          filteredArtifacts = filteredArtifacts.filter(a => {
            const nameLower = a.name.toLowerCase();
            const pathLower = a.path.toLowerCase();
            const titleLower = (a.title || '').toLowerCase();
            
            // 检查文件名、路径或标题是否包含查询字符串
            return nameLower.includes(query) || 
                   pathLower.includes(query) || 
                   titleLower.includes(query);
          });
        }

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

  async listFilesAndFolders(vaultId?: string, options?: QueryOptions): Promise<Result<FileFolderItem[], ArtifactError>> {
    try {
      this.logger.info(`[BREAKPOINT] listFilesAndFolders called with vaultId: ${vaultId || 'undefined'}, options:`, options);
      const items: FileFolderItem[] = [];

      // 获取要扫描的 vault 列表
      let vaultsToScan: Array<{ id: string; name: string }> = [];
      
      if (vaultId) {
        const vaultResult = await this.vaultService.getVault(vaultId);
        if (!vaultResult.success || !vaultResult.value) {
          return { success: true, value: [] };
        }
        vaultsToScan = [{ id: vaultResult.value.id, name: vaultResult.value.name }];
      } else {
        const vaultsResult = await this.vaultService.listVaults();
        if (!vaultsResult.success) {
          return { success: true, value: [] };
        }
        vaultsToScan = vaultsResult.value.map(v => ({ id: v.id, name: v.name }));
      }

      // 扫描每个 vault 的 artifacts 目录
      for (const vault of vaultsToScan) {
        const vaultRef: VaultReference = { id: vault.id, name: vault.name };
        
        // 使用 listDirectory 列出 artifacts 目录下的所有文件和文件夹（递归，不限制文件类型）
        const listResult = await this.listDirectory(vaultRef, 'artifacts', {
          recursive: true,
          includeHidden: false,
          // 不指定 extensions，返回所有文件类型
        });
        
        if (listResult.success) {
          const query = options?.query?.trim().toLowerCase();
          
          for (const node of listResult.value) {
            // listDirectory 返回的路径是相对于 vault 根目录的（包含 'artifacts/' 前缀）
            // 去掉 'artifacts/' 前缀以得到相对于 artifacts 目录的路径
            const relativePath = node.path.replace(/^artifacts\//, '');
            
            // 如果有查询条件，进行过滤
            if (query) {
              const nameLower = node.name.toLowerCase();
              const pathLower = relativePath.toLowerCase();
              const titleLower = (node.isFile ? node.name.replace(/\.[^/.]+$/, '') : node.name).toLowerCase();
              
              if (!nameLower.includes(query) && 
                  !pathLower.includes(query) && 
                  !titleLower.includes(query)) {
                continue;
              }
            }
            
            items.push({
              path: relativePath,
              name: node.name,
              title: node.isFile ? node.name.replace(/\.[^/.]+$/, '') : node.name,
              type: node.isDirectory ? 'folder' : 'file',
            });
          }
        }
      }

      this.logger.info(`Total files and folders found: ${items.length}`);
      return { success: true, value: items };
    } catch (error: any) {
      this.logger.error('Failed to list files and folders', error);
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to list files and folders: ${error.message}`, {}, error),
      };
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

  /**
   * 获取或创建metadata（用于vault、folder、file）
   */
  private async getOrCreateMetadata(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault'
  ): Promise<Result<ArtifactMetadata, ArtifactError>> {
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

    const vault = vaultResult.value;

    // 如果是artifact，直接获取metadata
    if (targetType === 'artifact') {
      const artifactResult = await this.getArtifact(vaultId, targetId);
      if (!artifactResult.success) {
        return {
          success: false,
          error: artifactResult.error,
        };
      }

      const artifact = artifactResult.value;
      if (!artifact.metadataId) {
        // 创建metadata
        const metadataId = uuidv4();
        const now = new Date().toISOString();
        const metadata: ArtifactMetadata = {
          id: metadataId,
          artifactId: artifact.id,
          vaultId: vault.id,
          vaultName: vault.name,
          type: artifact.viewType,
          category: artifact.category,
          tags: artifact.tags || [],
          createdAt: now,
          updatedAt: now,
        };
        const createResult = await this.metadataRepo.create(metadata, {
          title: artifact.title,
          description: artifact.description,
        });
        if (!createResult.success) {
          return createResult;
        }
        return { success: true, value: createResult.value };
      }

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
      return { success: true, value: metadataResult.value };
    }

    // 对于file、folder、vault，使用特殊的artifactId格式来查找或创建metadata
    // 格式：${targetType}:${vaultId}:${targetId}
    const specialArtifactId = `${targetType}:${vaultId}:${targetId}`;
    
    // 先尝试查找
    const existingMetadataResult = await this.metadataRepo.findByArtifactId(specialArtifactId);
    if (existingMetadataResult.success && existingMetadataResult.value) {
      const metadata = existingMetadataResult.value;
      // 验证是否是我们要找的metadata
      if (metadata.vaultId === vaultId && metadata.properties?.targetType === targetType) {
        return { success: true, value: metadata };
      }
    }

    // 如果不存在，创建新的metadata
    const metadataId = uuidv4();
    const now = new Date().toISOString();
    const metadata: ArtifactMetadata = {
      id: metadataId,
      artifactId: specialArtifactId, // 使用特殊格式的artifactId
      vaultId: vault.id,
      vaultName: vault.name,
      createdAt: now,
      updatedAt: now,
      properties: {
        targetType,
        targetId,
      },
    };
    const createResult = await this.metadataRepo.create(metadata);
    if (!createResult.success) {
      return createResult;
    }
    return { success: true, value: createResult.value };
  }

  async updateRelatedArtifacts(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault',
    relatedArtifacts: string[]
  ): Promise<Result<ArtifactMetadata, ArtifactError>> {
    try {
      // 验证关联文档ID
      const uniqueIds = new Set(relatedArtifacts);
      if (uniqueIds.size !== relatedArtifacts.length) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.INVALID_INPUT,
            '关联文档ID列表中存在重复项',
            { relatedArtifacts }
          ),
        };
      }

      // 获取或创建metadata
      const metadataResult = await this.getOrCreateMetadata(vaultId, targetId, targetType);
      if (!metadataResult.success) {
        return metadataResult;
      }

      const metadata = metadataResult.value;

      // 更新关联文档
      const updatedMetadata: ArtifactMetadata = {
        ...metadata,
        relatedArtifacts: relatedArtifacts.length > 0 ? relatedArtifacts : undefined,
        updatedAt: new Date().toISOString(),
      };

      const updateResult = await this.metadataRepo.update(updatedMetadata);
      if (!updateResult.success) {
        return updateResult;
      }

      return { success: true, value: updateResult.value };
    } catch (error: any) {
      this.logger.error('Failed to update related artifacts', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update related artifacts: ${error.message}`,
          { vaultId, targetId, targetType },
          error
        ),
      };
    }
  }

  async updateRelatedCodePaths(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault',
    relatedCodePaths: string[]
  ): Promise<Result<ArtifactMetadata, ArtifactError>> {
    try {
      // 验证关联代码路径
      const uniquePaths = new Set(relatedCodePaths);
      if (uniquePaths.size !== relatedCodePaths.length) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.INVALID_INPUT,
            '关联代码路径列表中存在重复项',
            { relatedCodePaths }
          ),
        };
      }

      // 获取或创建metadata
      const metadataResult = await this.getOrCreateMetadata(vaultId, targetId, targetType);
      if (!metadataResult.success) {
        return metadataResult;
      }

      const metadata = metadataResult.value;

      // 更新关联代码路径
      const updatedMetadata: ArtifactMetadata = {
        ...metadata,
        relatedCodePaths: relatedCodePaths.length > 0 ? relatedCodePaths : undefined,
        updatedAt: new Date().toISOString(),
      };

      const updateResult = await this.metadataRepo.update(updatedMetadata);
      if (!updateResult.success) {
        return updateResult;
      }

      return { success: true, value: updateResult.value };
    } catch (error: any) {
      this.logger.error('Failed to update related code paths', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update related code paths: ${error.message}`,
          { vaultId, targetId, targetType },
          error
        ),
      };
    }
  }

  /**
   * 查找metadata（不创建，仅用于查询）
   */
  private async findMetadata(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault'
  ): Promise<Result<ArtifactMetadata | null, ArtifactError>> {
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

    // 如果是artifact，直接获取metadata
    if (targetType === 'artifact') {
      const artifactResult = await this.getArtifact(vaultId, targetId);
      if (!artifactResult.success) {
        return { success: true, value: null };
      }

      const artifact = artifactResult.value;
      if (!artifact.metadataId) {
        return { success: true, value: null };
      }

      const metadataResult = await this.metadataRepo.findById(artifact.metadataId);
      if (!metadataResult.success || !metadataResult.value) {
        return { success: true, value: null };
      }
      return { success: true, value: metadataResult.value };
    }

    // 对于file、folder、vault，使用特殊的artifactId格式来查找
    const specialArtifactId = `${targetType}:${vaultId}:${targetId}`;
    const existingMetadataResult = await this.metadataRepo.findByArtifactId(specialArtifactId);
    if (existingMetadataResult.success && existingMetadataResult.value) {
      const metadata = existingMetadataResult.value;
      // 验证是否是我们要找的metadata
      if (metadata.vaultId === vaultId && metadata.properties?.targetType === targetType) {
        return { success: true, value: metadata };
      }
    }

    return { success: true, value: null };
  }

  async getRelatedArtifacts(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault'
  ): Promise<Result<string[], ArtifactError>> {
    try {
      const metadataResult = await this.findMetadata(vaultId, targetId, targetType);
      if (!metadataResult.success) {
        return {
          success: false,
          error: metadataResult.error,
        };
      }

      if (!metadataResult.value) {
        return {
          success: true,
          value: [], // 如果metadata不存在，返回空数组
        };
      }

      const metadata = metadataResult.value;
      return {
        success: true,
        value: metadata.relatedArtifacts || [],
      };
    } catch (error: any) {
      this.logger.error('Failed to get related artifacts', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get related artifacts: ${error.message}`,
          { vaultId, targetId, targetType },
          error
        ),
      };
    }
  }

  async getRelatedCodePaths(
    vaultId: string,
    targetId: string,
    targetType: 'artifact' | 'file' | 'folder' | 'vault'
  ): Promise<Result<string[], ArtifactError>> {
    try {
      const metadataResult = await this.findMetadata(vaultId, targetId, targetType);
      if (!metadataResult.success) {
        return {
          success: false,
          error: metadataResult.error,
        };
      }

      if (!metadataResult.value) {
        return {
          success: true,
          value: [], // 如果metadata不存在，返回空数组
        };
      }

      const metadata = metadataResult.value;
      return {
        success: true,
        value: metadata.relatedCodePaths || [],
      };
    } catch (error: any) {
      this.logger.error('Failed to get related code paths', error);
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get related code paths: ${error.message}`,
          { vaultId, targetId, targetType },
          error
        ),
      };
    }
  }

  async createFolderStructureFromTemplate(
    vault: VaultReference,
    basePath: string,
    artifactTemplate: import('../domain/entity/ArtifactTemplate').ArtifactTemplate
  ): Promise<Result<void, ArtifactError>> {
    try {
      if (!artifactTemplate || !artifactTemplate.isValid()) {
        const errorMessage = 'Template structure is empty or invalid. Please check the template file format.';
        this.logger.error(errorMessage, { 
          vaultId: vault.id, 
          basePath
        });
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            errorMessage,
            { vaultId: vault.id, basePath }
          ),
        };
      }

      // 从 ArtifactTemplate 对象获取已应用变量的结构项
      const structureItems = artifactTemplate.structure;

      this.logger.info('Creating folder structure from ArtifactTemplate', {
        vaultId: vault.id,
        basePath,
        itemCount: structureItems.length,
        firstItem: structureItems[0] ? {
          type: structureItems[0].type,
          name: structureItems[0].name
        } : null
      });

      // 递归创建结构项（变量已在 ArtifactTemplate 中应用）
      for (const item of structureItems) {
        const itemResult = await this.createStructureItem(vault, basePath, item, artifactTemplate.variables);
        if (!itemResult.success) {
          return itemResult;
        }
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      this.logger.error('Failed to create folder structure from template', {
        error: error.message,
        stack: error.stack,
        vaultId: vault.id,
        basePath
      });
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create folder structure from template: ${error.message}`,
          { vaultId: vault.id, basePath },
          error
        ),
      };
    }
  }

  // ========== 文件系统操作 ==========

  async readFile(
    vault: VaultReference,
    filePath: string,
    options?: ReadFileOptions
  ): Promise<Result<string, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `File not found: ${filePath}`,
            { vaultId: vault.id, vaultName: vault.name, filePath }
          ),
        };
      }

      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Path is not a file: ${filePath}`,
            { vaultId: vault.id, vaultName: vault.name, filePath }
          ),
        };
      }

      const encoding = options?.encoding || 'utf-8';
      const content = fs.readFileSync(fullPath, encoding);
      return { success: true, value: content };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to read file: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, filePath },
          error
        ),
      };
    }
  }

  async writeFile(
    vault: VaultReference,
    filePath: string,
    content: string
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, filePath);
      const dir = path.dirname(fullPath);

      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 原子写入：先写入临时文件，然后重命名
      const tempPath = `${fullPath}.tmp`;
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, fullPath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to write file: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, filePath },
          error
        ),
      };
    }
  }

  async exists(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      // 使用异步操作，不阻塞事件循环
      try {
        await fs.promises.access(fullPath);
        return { success: true, value: true };
      } catch {
        return { success: true, value: false };
      }
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check existence: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  async isDirectory(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      // 使用异步操作，不阻塞事件循环
      // 直接使用 stat，如果文件不存在会抛出 ENOENT 错误
      try {
        const stats = await fs.promises.stat(fullPath);
        return { success: true, value: stats.isDirectory() };
      } catch (error: any) {
        // 如果文件不存在，返回 false
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { success: true, value: false };
        }
        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check if directory: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  async isFile(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      // 使用异步操作，不阻塞事件循环
      // 直接使用 stat，如果文件不存在会抛出 ENOENT 错误
      try {
        const stats = await fs.promises.stat(fullPath);
        return { success: true, value: stats.isFile() };
      } catch (error: any) {
        // 如果文件不存在，返回 false
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return { success: true, value: false };
        }
        throw error;
      }
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check if file: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  async listDirectory(
    vault: VaultReference,
    dirPath: string,
    options?: ListDirectoryOptions
  ): Promise<Result<FileTreeNode[], ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, dirPath);
      
      // 使用异步操作检查路径是否存在
      try {
        const stats = await fs.promises.stat(fullPath);
        if (!stats.isDirectory()) {
          return {
            success: false,
            error: new ArtifactError(
              ArtifactErrorCode.OPERATION_FAILED,
              `Path is not a directory: ${dirPath}`,
              { vaultId: vault.id, vaultName: vault.name, dirPath }
            ),
          };
        }
      } catch (error: any) {
        // 路径不存在，返回空数组
        if (error.code === 'ENOENT') {
          return { success: true, value: [] };
        }
        throw error;
      }

      const nodes: FileTreeNode[] = [];
      const includeHidden = options?.includeHidden ?? false;
      const extensions = options?.extensions;
      const recursive = options?.recursive ?? false;

      // 使用异步递归扫描目录
      const scanDirectory = async (currentDir: string, relativeBase = ''): Promise<void> => {
        try {
          // 使用异步 readdir，不阻塞事件循环
          const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

          // 批量处理条目，减少循环开销
          for (const entry of entries) {
            // 跳过隐藏文件（如果不包含）
            if (!includeHidden && entry.name.startsWith('.')) {
              continue;
            }

            const entryFullPath = path.join(currentDir, entry.name);
            const entryRelativePath = relativeBase
              ? path.join(relativeBase, entry.name)
              : entry.name;

            if (entry.isDirectory()) {
              const node: FileTreeNode = {
                name: entry.name,
                path: entryRelativePath,
                fullPath: entryFullPath,
                isDirectory: true,
                isFile: false,
              };
              nodes.push(node);

              // 如果递归，继续扫描子目录
              if (recursive) {
                await scanDirectory(entryFullPath, entryRelativePath);
              }
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).slice(1); // 去掉点号
              
              // 如果指定了扩展名过滤，检查扩展名
              if (extensions && extensions.length > 0) {
                if (!ext || !extensions.includes(ext.toLowerCase())) {
                  continue;
                }
              }

              const node: FileTreeNode = {
                name: entry.name,
                path: entryRelativePath,
                fullPath: entryFullPath,
                isDirectory: false,
                isFile: true,
                extension: ext || undefined,
              };
              nodes.push(node);
            }
          }
        } catch (error: any) {
          this.logger.warn(`Error scanning directory ${currentDir}:`, error);
        }
      };

      await scanDirectory(fullPath, dirPath || '');

      // 排序：目录在前，文件在后，都按名称排序
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, value: nodes };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to list directory: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, dirPath },
          error
        ),
      };
    }
  }

  async createDirectory(
    vault: VaultReference,
    dirPath: string
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, dirPath);
      
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create directory: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, dirPath },
          error
        ),
      };
    }
  }

  async delete(
    vault: VaultReference,
    path: string,
    recursive?: boolean
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Path not found: ${path}`,
            { vaultId: vault.id, vaultName: vault.name, path }
          ),
        };
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        if (recursive) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          // 检查目录是否为空
          const entries = fs.readdirSync(fullPath);
          if (entries.length > 0) {
            return {
              success: false,
              error: new ArtifactError(
                ArtifactErrorCode.OPERATION_FAILED,
                `Directory is not empty: ${path}`,
                { vaultId: vault.id, vaultName: vault.name, path }
              ),
            };
          }
          fs.rmdirSync(fullPath);
        }
      } else {
        fs.unlinkSync(fullPath);
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  getFullPath(vault: VaultReference, filePath: string): string {
    const vaultPath = this.vaultAdapter.getVaultPath(vault.name);
    if (!filePath) {
      return vaultPath;
    }
    return path.isAbsolute(filePath) ? filePath : path.join(vaultPath, filePath);
  }

  // ========== 私有辅助方法 ==========

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
    const scanDirectory = (dir: string, basePath = ''): void => {
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

  /**
   * 创建结构项（目录或文件）
   */
  private async createStructureItem(
    vault: VaultReference,
    basePath: string,
    item: TemplateStructureItem,
    variables?: { [key: string]: string }
  ): Promise<Result<void, ArtifactError>> {
    const itemName = item.name;
    const itemPath = path.join(basePath, itemName);

    if (item.type === 'directory') {
      // 创建目录
      const createDirResult = await this.createDirectory(vault, itemPath);
      if (!createDirResult.success) {
        return createDirResult;
      }

      // 递归处理子项（子项已经在外部替换过变量，这里直接使用）
      if (item.children && Array.isArray(item.children)) {
        for (const child of item.children) {
          const childResult = await this.createStructureItem(vault, itemPath, child, variables);
          if (!childResult.success) {
            return childResult;
          }
        }
      }

      return { success: true, value: undefined };
    } else if (item.type === 'file') {
      // 创建文件
      let fileContent = '';

      // 如果有模板文件，读取模板内容
      if (item.template) {
        const templatePath = item.template;
        // 模板路径可能是相对路径（相对于 vault 根目录）或绝对路径
        const templateFullPath = templatePath.startsWith('/') || templatePath.startsWith('templates/')
          ? templatePath
          : `templates/content/${templatePath}`;

        const readResult = await this.readFile(vault, templateFullPath);
        if (readResult.success) {
          fileContent = readResult.value;
          // 在文件内容中也替换变量（使用类似 Jinja2 的模板语法）
          if (variables) {
            const templateStructureService = new TemplateStructureDomainServiceImpl();
            fileContent = templateStructureService.renderTemplate(fileContent, variables);
          }
        } else {
          // 如果读取模板失败，记录错误并返回失败
          const errorMessage = `Failed to read template file: ${templateFullPath}`;
          this.logger.error(errorMessage, { vaultId: vault.id, templatePath: item.template });
          return {
            success: false,
            error: new ArtifactError(
              ArtifactErrorCode.OPERATION_FAILED,
              errorMessage,
              { vaultId: vault.id, templatePath: item.template }
            ),
          };
        }
      }

      // 写入文件
      const writeResult = await this.writeFile(vault, itemPath, fileContent);
      if (!writeResult.success) {
        return writeResult;
      }

      return { success: true, value: undefined };
    } else {
      this.logger.warn(`Unknown structure item type: ${item.type}, skipping`);
      return { success: true, value: undefined };
    }
  }

  /**
   * 获取模板内容并进行Jinja2渲染
   * 直接读取模板文件，不依赖TemplateApplicationService，避免循环依赖
   * templateId格式：<vault名称>/templates/content/my-template.md 或 templates/content/my-template.md
   */
  private async getTemplateContentAndRender(
    vault: VaultReference,
    templateId: string,
    title: string,
    viewType?: string
  ): Promise<Result<string, ArtifactError>> {
    try {
      let templateContent: string | null = null;
      let templatePath: string | null = null;

      // templateId应该是路径格式：<vault名称>/templates/content/my-template.md 或 templates/content/my-template.md
      let actualPath = templateId;
      
      // 如果包含vault名称前缀，提取路径部分
      if (templateId.startsWith(`${vault.name}/`)) {
        actualPath = templateId.substring(vault.name.length + 1);
      }
      
      // 直接读取模板文件
      const readResult = await this.readFile(vault, actualPath);
      if (readResult.success) {
        templateContent = readResult.value;
        templatePath = actualPath;
        this.logger.info('[ArtifactApplicationService] Template found by path', {
          templateId,
          actualPath,
          templatePath
        });
      } else {
        // 如果读取失败，记录错误
        this.logger.warn('[ArtifactApplicationService] Template file not found', {
          templateId,
          actualPath,
          vaultId: vault.id,
          vaultName: vault.name
        });
      }

      if (!templateContent) {
        // 如果所有方法都失败，返回错误
        this.logger.warn('[ArtifactApplicationService] Template not found', {
          templateId,
          vaultId: vault.id,
          viewType
        });
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Template file not found: ${templateId}`,
            { templateId, vaultId: vault.id }
          ),
        };
      }

      this.logger.info('[ArtifactApplicationService] Template found and will render', {
        templateId,
        templatePath,
        contentLength: templateContent.length
      });

      // 准备变量映射
      const variables: Record<string, string> = {
        fileName: title,
        title: title,
        diagramName: title, // 设计图也使用此变量
      };

      // 使用 Jinja2 渲染模板内容
      const templateStructureService = new TemplateStructureDomainServiceImpl();
      const renderedContent = templateStructureService.renderTemplate(templateContent, variables);

      this.logger.info('[ArtifactApplicationService] Template rendered', {
        templateId,
        renderedLength: renderedContent.length
      });

      return { success: true, value: renderedContent };
    } catch (error: any) {
      this.logger.error('[ArtifactApplicationService] Failed to get and render template', {
        templateId,
        vaultId: vault.id,
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to get template content: ${error.message}`,
          { templateId, vaultId: vault.id },
          error
        ),
      };
    }
  }

}

