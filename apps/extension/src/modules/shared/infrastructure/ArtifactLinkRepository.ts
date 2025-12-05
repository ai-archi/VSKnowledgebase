import { ArtifactLink } from '../domain/entity/ArtifactLink';
import { Result } from '../../../core/types/Result';
import { ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { VaultFileSystemAdapter } from './storage/file/VaultFileSystemAdapter';
import { MetadataRepository } from './MetadataRepository';
import { VaultRepository } from './VaultRepository';
import { ArtifactRelationship } from '../domain/value_object/ArtifactRelationship';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ArtifactLink 存储库接口
 */
export interface ArtifactLinkRepository {
  /**
   * 根据链接 ID 查找链接
   */
  findById(linkId: string, vaultName: string): Promise<Result<ArtifactLink | null, ArtifactError>>;

  /**
   * 根据源 Artifact ID 查找所有链接
   */
  findBySourceArtifact(sourceArtifactId: string, vaultName: string): Promise<Result<ArtifactLink[], ArtifactError>>;

  /**
   * 根据目标查找链接
   */
  findByTarget(
    targetType: string,
    targetId: string | undefined,
    targetPath: string | undefined,
    vaultName: string
  ): Promise<Result<ArtifactLink[], ArtifactError>>;

  /**
   * 创建链接
   */
  create(link: Omit<ArtifactLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<ArtifactLink, ArtifactError>>;

  /**
   * 更新链接
   */
  update(link: ArtifactLink): Promise<Result<ArtifactLink, ArtifactError>>;

  /**
   * 删除链接
   */
  delete(linkId: string, vaultName: string): Promise<Result<void, ArtifactError>>;

  /**
   * 查询链接
   */
  query(query: {
    vaultName?: string;
    sourceArtifactId?: string;
    targetType?: string;
    linkType?: string;
    limit?: number;
  }): Promise<Result<ArtifactLink[], ArtifactError>>;
}

/**
 * ArtifactLink 存储库实现
 * 从 ArtifactMetadata 的 relationships 字段读取链接信息
 * 替代原有的独立 links 目录存储方式
 */
export class ArtifactLinkRepositoryImpl implements ArtifactLinkRepository {
  constructor(
    private vaultAdapter: VaultFileSystemAdapter,
    private metadataRepo: MetadataRepository,
    private vaultRepo: VaultRepository
  ) {}

  /**
   * 将 ArtifactRelationship 转换为 ArtifactLink
   */
  private relationshipToLink(
    relationship: ArtifactRelationship,
    sourceArtifactId: string,
    vaultId: string
  ): ArtifactLink {
    return {
      id: relationship.id || uuidv4(),
      sourceArtifactId,
      targetType: relationship.targetType,
      targetId: relationship.targetId,
      targetPath: relationship.targetPath,
      targetUrl: relationship.targetUrl,
      linkType: relationship.linkType,
      description: relationship.description,
      strength: relationship.strength,
      codeLocation: relationship.codeLocation,
      vaultId,
      createdAt: relationship.createdAt || new Date().toISOString(),
      updatedAt: relationship.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * 将 ArtifactLink 转换为 ArtifactRelationship
   */
  private linkToRelationship(link: ArtifactLink): ArtifactRelationship {
    return {
      id: link.id,
      targetType: link.targetType,
      targetId: link.targetId,
      targetPath: link.targetPath,
      targetUrl: link.targetUrl,
      linkType: link.linkType,
      description: link.description,
      strength: link.strength,
      codeLocation: link.codeLocation,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
    };
  }

  /**
   * 从所有 metadata 中收集 relationships 并转换为 ArtifactLink
   */
  private async collectLinksFromMetadata(
    vaultName?: string,
    filter?: (link: ArtifactLink) => boolean
  ): Promise<ArtifactLink[]> {
    const links: ArtifactLink[] = [];
    
    try {
      const vaultsResult = await this.vaultRepo.findAll();
      if (!vaultsResult.success) {
        return links;
      }

      const vaults = vaultName
        ? vaultsResult.value.filter(v => v.name === vaultName)
        : vaultsResult.value;

      for (const vault of vaults) {
        const vaultPath = this.vaultAdapter.getVaultPath(vault.name);
        const metadataDir = path.join(vaultPath, 'metadata');
        
        if (!fs.existsSync(metadataDir)) {
          continue;
        }

        const metadataFiles = fs.readdirSync(metadataDir)
          .filter((file: string) => file.endsWith('.metadata.yml'));

        for (const file of metadataFiles) {
          const metadataId = file.replace('.metadata.yml', '');
          const metadataResult = await this.metadataRepo.findById(metadataId);
          
          if (!metadataResult.success || !metadataResult.value) {
            continue;
          }

          const metadata = metadataResult.value;
          if (metadata.relationships) {
            for (const relationship of metadata.relationships) {
              const link = this.relationshipToLink(
                relationship,
                metadata.artifactId,
                metadata.vaultId
              );
              
              if (!filter || filter(link)) {
                links.push(link);
              }
            }
          }
        }
      }
    } catch (error) {
      // 忽略错误，返回已收集的链接
    }

    return links;
  }

  /**
   * 根据链接 ID 查找链接
   */
  async findById(linkId: string, vaultName: string): Promise<Result<ArtifactLink | null, ArtifactError>> {
    try {
      const links = await this.collectLinksFromMetadata(vaultName, link => link.id === linkId);
      return { success: true, value: links.length > 0 ? links[0] : null };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find link by ID: ${error.message}`,
          { linkId, vaultName },
          error
        ),
      };
    }
  }

  /**
   * 根据源 Artifact ID 查找所有链接
   */
  async findBySourceArtifact(
    sourceArtifactId: string,
    vaultName: string
  ): Promise<Result<ArtifactLink[], ArtifactError>> {
    try {
      // 先找到对应的 metadata
      const metadataResult = await this.metadataRepo.findByArtifactId(sourceArtifactId);
      if (!metadataResult.success || !metadataResult.value) {
        return { success: true, value: [] };
      }

      const metadata = metadataResult.value;
      if (!metadata.relationships || metadata.relationships.length === 0) {
        return { success: true, value: [] };
      }

      const links = metadata.relationships.map(rel =>
        this.relationshipToLink(rel, sourceArtifactId, metadata.vaultId)
      );

      return { success: true, value: links };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find links by source artifact: ${error.message}`,
          { sourceArtifactId, vaultName },
          error
        ),
      };
    }
  }

  /**
   * 根据目标查找链接
   */
  async findByTarget(
    targetType: string,
    targetId: string | undefined,
    targetPath: string | undefined,
    vaultName: string
  ): Promise<Result<ArtifactLink[], ArtifactError>> {
    try {
      const links = await this.collectLinksFromMetadata(vaultName, link => {
        if (link.targetType !== targetType) {
          return false;
        }
        if (targetId && link.targetId !== targetId) {
          return false;
        }
        if (targetPath && link.targetPath !== targetPath) {
          return false;
        }
        return true;
      });

      return { success: true, value: links };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find links by target: ${error.message}`,
          { targetType, targetId, targetPath, vaultName },
          error
        ),
      };
    }
  }

  /**
   * 创建链接
   */
  async create(link: Omit<ArtifactLink, 'id' | 'createdAt' | 'updatedAt'>): Promise<Result<ArtifactLink, ArtifactError>> {
    try {
      const linkId = uuidv4();
      const now = new Date().toISOString();

      const fullLink: ArtifactLink = {
        ...link,
        id: linkId,
        createdAt: now,
        updatedAt: now,
      };

      // 找到源 Artifact 的 metadata
      const metadataResult = await this.metadataRepo.findByArtifactId(link.sourceArtifactId);
      if (!metadataResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Source artifact metadata not found: ${link.sourceArtifactId}`,
            { sourceArtifactId: link.sourceArtifactId }
          ),
        };
      }

      // 获取或创建 metadata
      let metadata = metadataResult.value;
      if (!metadata) {
        // 如果 metadata 不存在，需要先创建（这里简化处理，实际应该通过 ArtifactApplicationService）
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Source artifact metadata not found: ${link.sourceArtifactId}. Please create metadata first.`,
            { sourceArtifactId: link.sourceArtifactId }
          ),
        };
      }

      // 添加 relationship 到 metadata
      const relationship = this.linkToRelationship(fullLink);
      if (!metadata.relationships) {
        metadata.relationships = [];
      }
      metadata.relationships.push(relationship);
      metadata.updatedAt = now;

      // 更新 metadata
      const updateResult = await this.metadataRepo.update(metadata);
      if (!updateResult.success) {
        return updateResult;
      }

      return { success: true, value: fullLink };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create link: ${error.message}`,
          { link },
          error
        ),
      };
    }
  }

  /**
   * 更新链接
   */
  async update(link: ArtifactLink): Promise<Result<ArtifactLink, ArtifactError>> {
    try {
      // 找到源 Artifact 的 metadata
      const metadataResult = await this.metadataRepo.findByArtifactId(link.sourceArtifactId);
      if (!metadataResult.success || !metadataResult.value) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${link.id}`, { linkId: link.id }),
        };
      }

      const metadata = metadataResult.value;
      if (!metadata.relationships) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${link.id}`, { linkId: link.id }),
        };
      }

      // 查找并更新 relationship
      const index = metadata.relationships.findIndex(rel => rel.id === link.id);
      if (index === -1) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${link.id}`, { linkId: link.id }),
        };
      }

      const updatedLink: ArtifactLink = {
        ...link,
        updatedAt: new Date().toISOString(),
      };

      metadata.relationships[index] = this.linkToRelationship(updatedLink);
      metadata.updatedAt = updatedLink.updatedAt;

      // 更新 metadata
      const updateResult = await this.metadataRepo.update(metadata);
      if (!updateResult.success) {
        return updateResult;
      }

      return { success: true, value: updatedLink };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to update link: ${error.message}`,
          { link },
          error
        ),
      };
    }
  }

  /**
   * 删除链接
   */
  async delete(linkId: string, vaultName: string): Promise<Result<void, ArtifactError>> {
    try {
      // 先找到链接
      const findResult = await this.findById(linkId, vaultName);
      if (!findResult.success || !findResult.value) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${linkId}`, { linkId }),
        };
      }

      const link = findResult.value;

      // 找到源 Artifact 的 metadata
      const metadataResult = await this.metadataRepo.findByArtifactId(link.sourceArtifactId);
      if (!metadataResult.success || !metadataResult.value) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${linkId}`, { linkId }),
        };
      }

      const metadata = metadataResult.value;
      if (!metadata.relationships) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${linkId}`, { linkId }),
        };
      }

      // 删除 relationship
      metadata.relationships = metadata.relationships.filter(rel => rel.id !== linkId);
      metadata.updatedAt = new Date().toISOString();

      // 更新 metadata
      const updateResult = await this.metadataRepo.update(metadata);
      if (!updateResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Failed to delete link: ${updateResult.error.message}`,
            { linkId, vaultName }
          ),
        };
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete link: ${error.message}`,
          { linkId, vaultName },
          error
        ),
      };
    }
  }

  /**
   * 查询链接
   */
  async query(query: {
    vaultName?: string;
    sourceArtifactId?: string;
    targetType?: string;
    linkType?: string;
    limit?: number;
  }): Promise<Result<ArtifactLink[], ArtifactError>> {
    try {
      const links: ArtifactLink[] = [];

      if (query.vaultName) {
        const result = await this.queryVaultLinks(query.vaultName, query);
        if (result.success) {
          links.push(...result.value);
        } else {
          return result;
        }
      } else {
        // 查询所有 Vault
        const vaultsRoot = this.vaultAdapter.getVaultsRoot();
        if (fs.existsSync(vaultsRoot)) {
          const vaults = fs.readdirSync(vaultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const vaultName of vaults) {
            const result = await this.queryVaultLinks(vaultName, query);
            if (result.success) {
              links.push(...result.value);
            }
          }
        }
      }

      // 应用限制
      if (query.limit) {
        return { success: true, value: links.slice(0, query.limit) };
      }

      return { success: true, value: links };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to query links: ${error.message}`,
          { query },
          error
        ),
      };
    }
  }

  /**
   * 查询单个 Vault 的链接
   */
  private async queryVaultLinks(
    vaultName: string,
    query: {
      sourceArtifactId?: string;
      targetType?: string;
      linkType?: string;
    }
  ): Promise<Result<ArtifactLink[], ArtifactError>> {
    try {
      const links = await this.collectLinksFromMetadata(vaultName, link => {
        if (query.sourceArtifactId && link.sourceArtifactId !== query.sourceArtifactId) {
          return false;
        }
        if (query.targetType && link.targetType !== query.targetType) {
          return false;
        }
        if (query.linkType && link.linkType !== query.linkType) {
          return false;
        }
        return true;
      });

      return { success: true, value: links };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to query vault links: ${error.message}`,
          { vaultName, query },
          error
        ),
      };
    }
  }
}


