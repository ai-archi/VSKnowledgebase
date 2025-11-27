import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/types';
import { ArtifactFileSystemApplicationService } from '../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../shared/application/VaultApplicationService';
import { ArtifactLinkRepository } from '../shared/infrastructure/ArtifactLinkRepository';
import { SqliteRuntimeIndex } from '../shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { Artifact } from '../shared/domain/artifact';
import { ArtifactLink } from '../shared/domain/ArtifactLink';
import { Logger } from '../../core/logger/Logger';

/**
 * MCP 工具接口
 * 实现标准知识库 map API
 */
export interface MCPTools {
  /**
   * 列出知识库条目
   */
  listEntries(params: {
    vaultName?: string;
    viewType?: string;
    category?: string;
    limit?: number;
  }): Promise<Artifact[]>;

  /**
   * 获取知识库条目
   */
  getEntry(params: {
    artifactId: string;
  }): Promise<Artifact | null>;

  /**
   * 搜索知识库
   */
  search(params: {
    query: string;
    vaultName?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Artifact[]>;

  /**
   * 创建知识库条目
   */
  createEntry(params: {
    vaultName: string;
    viewType: string;
    category?: string;
    title: string;
    content?: string;
    tags?: string[];
  }): Promise<Artifact>;

  /**
   * 更新知识库条目
   */
  updateEntry(params: {
    artifactId: string;
    title?: string;
    content?: string;
    tags?: string[];
  }): Promise<Artifact>;

  /**
   * 删除知识库条目
   */
  deleteEntry(params: {
    artifactId: string;
  }): Promise<void>;

  /**
   * 列出条目链接
   */
  listLinks(params: {
    artifactId: string;
  }): Promise<ArtifactLink[]>;

  /**
   * 创建条目链接
   */
  createLink(params: {
    sourceArtifactId: string;
    targetType: string;
    targetId?: string;
    targetPath?: string;
    targetUrl?: string;
    linkType: string;
    description?: string;
    strength?: string;
    codeLocation?: any;
  }): Promise<ArtifactLink>;
}

@injectable()
export class MCPToolsImpl implements MCPTools {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
    @inject(TYPES.ArtifactLinkRepository)
    private linkRepository: ArtifactLinkRepository,
    @inject(TYPES.SqliteRuntimeIndex)
    private sqliteIndex: SqliteRuntimeIndex,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async listEntries(params: {
    vaultName?: string;
    viewType?: string;
    category?: string;
    limit?: number;
  }): Promise<Artifact[]> {
    try {
      let vaultId: string | undefined;
      if (params.vaultName) {
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          const vault = vaultsResult.value.find(v => v.name === params.vaultName);
          if (vault) {
            vaultId = vault.id;
          }
        }
      }

      const result = await this.artifactService.listArtifacts(
        vaultId,
        {
          limit: params.limit || 100,
        }
      );

      if (result.success) {
        return result.value;
      } else {
        this.logger.error('Failed to list entries', result.error);
        return [];
      }
    } catch (error: any) {
      this.logger.error('Error listing entries', error);
      return [];
    }
  }

  async getEntry(params: { artifactId: string }): Promise<Artifact | null> {
    try {
      // Get all vaults and search for artifact
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        return null;
      }

      for (const vault of vaultsResult.value) {
        const result = await this.artifactService.getArtifact(vault.id, params.artifactId);
        if (result.success) {
          return result.value;
        }
      }

      return null;
    } catch (error: any) {
      this.logger.error('Error getting entry', error);
      return null;
    }
  }

  async search(params: {
    query: string;
    vaultName?: string;
    tags?: string[];
    limit?: number;
  }): Promise<Artifact[]> {
    try {
      let vaultId: string | undefined;
      if (params.vaultName) {
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          const vault = vaultsResult.value.find(v => v.name === params.vaultName);
          if (vault) {
            vaultId = vault.id;
          }
        }
      }

      // 使用全文搜索
      let artifactIds: string[] = [];
      try {
        artifactIds = await this.sqliteIndex.textSearch(params.query, {
          limit: params.limit ? params.limit * 2 : 100, // 获取更多结果以便后续过滤
        });
        this.logger.debug(`Text search found ${artifactIds.length} artifact IDs`);
      } catch (error: any) {
        this.logger.warn('Text search failed, falling back to basic search', error);
      }

      // 如果全文搜索没有结果，使用基本搜索
      if (artifactIds.length === 0) {
        const result = await this.artifactService.listArtifacts(
          vaultId,
          {
            limit: params.limit || 50,
          }
        );

        if (result.success) {
          // Simple text search in title and description
          let artifacts = result.value.filter(a => {
            const searchLower = params.query.toLowerCase();
            const titleMatch = a.title.toLowerCase().includes(searchLower);
            const descMatch = a.description?.toLowerCase().includes(searchLower);
            return titleMatch || descMatch;
          });

          // Filter by tags if provided
          if (params.tags && params.tags.length > 0) {
            artifacts = artifacts.filter(a => {
              const artifactTags = a.tags || [];
              return params.tags!.some(tag => artifactTags.includes(tag));
            });
          }

          return artifacts;
        } else {
          this.logger.error('Failed to search entries', result.error);
          return [];
        }
      }

      // 使用全文搜索的结果，获取完整的 Artifact 信息
      const artifacts: Artifact[] = [];
      for (const artifactId of artifactIds) {
        // 尝试从所有 vault 中查找 Artifact
        const vaultsResult = await this.vaultService.listVaults();
        if (vaultsResult.success) {
          for (const vault of vaultsResult.value) {
            // 如果指定了 vaultName，只搜索该 vault
            if (params.vaultName && vault.name !== params.vaultName) {
              continue;
            }
            if (vaultId && vault.id !== vaultId) {
              continue;
            }

            const artifactResult = await this.artifactService.getArtifact(vault.id, artifactId);
            if (artifactResult.success && artifactResult.value) {
              const artifact = artifactResult.value;

              // Filter by tags if provided
              if (params.tags && params.tags.length > 0) {
                const artifactTags = artifact.tags || [];
                if (!params.tags.some(tag => artifactTags.includes(tag))) {
                  continue;
                }
              }

              artifacts.push(artifact);
              break; // 找到后跳出循环
            }
          }
        }

        // 如果已达到限制，停止
        if (artifacts.length >= (params.limit || 50)) {
          break;
        }
      }

      return artifacts;
    } catch (error: any) {
      this.logger.error('Error searching entries', error);
      return [];
    }
  }

  async createEntry(params: {
    vaultName: string;
    viewType: string;
    category?: string;
    title: string;
    content?: string;
    tags?: string[];
  }): Promise<Artifact> {
    try {
      // Get vault
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        throw new Error('Failed to list vaults');
      }

      const vault = vaultsResult.value.find(v => v.name === params.vaultName);
      if (!vault) {
        throw new Error(`Vault not found: ${params.vaultName}`);
      }

      if (vault.readOnly) {
        throw new Error(`Cannot create entry in read-only vault: ${params.vaultName}`);
      }

      // Generate path from title
      const path = this.generatePathFromTitle(params.title, params.viewType, params.category);

      const result = await this.artifactService.createArtifact({
        vault: { id: vault.id, name: vault.name },
        viewType: params.viewType as any,
        category: params.category,
        path,
        title: params.title,
        content: params.content || '',
        tags: params.tags,
      });

      if (result.success) {
        return result.value;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error: any) {
      this.logger.error('Error creating entry', error);
      throw error;
    }
  }

  async updateEntry(params: {
    artifactId: string;
    title?: string;
    content?: string;
    tags?: string[];
  }): Promise<Artifact> {
    try {
      const updates: any = {};
      if (params.title !== undefined) {
        updates.title = params.title;
      }
      if (params.content !== undefined) {
        updates.content = params.content;
      }
      if (params.tags !== undefined) {
        updates.tags = params.tags;
      }

      // Get vault ID first
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        throw new Error('Failed to list vaults');
      }

      // Try to find artifact in any vault
      let artifact: Artifact | null = null;
      for (const vault of vaultsResult.value) {
        const getResult = await this.artifactService.getArtifact(vault.id, params.artifactId);
        if (getResult.success) {
          artifact = getResult.value;
          break;
        }
      }

      if (!artifact) {
        throw new Error(`Artifact not found: ${params.artifactId}`);
      }

      const result = await this.artifactService.updateArtifact(params.artifactId, updates);
      if (result.success) {
        return result.value;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error: any) {
      this.logger.error('Error updating entry', error);
      throw error;
    }
  }

  async deleteEntry(params: { artifactId: string }): Promise<void> {
    try {
      // Get vault ID first
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        throw new Error('Failed to list vaults');
      }

      // Try to find artifact in any vault
      let found = false;
      for (const vault of vaultsResult.value) {
        const getResult = await this.artifactService.getArtifact(vault.id, params.artifactId);
        if (getResult.success) {
          const result = await this.artifactService.deleteArtifact(vault.id, params.artifactId);
          if (!result.success) {
            throw new Error(result.error.message);
          }
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error(`Artifact not found: ${params.artifactId}`);
      }
    } catch (error: any) {
      this.logger.error('Error deleting entry', error);
      throw error;
    }
  }

  async listLinks(params: { artifactId: string }): Promise<ArtifactLink[]> {
    try {
      // Find the artifact to get vaultId
      const artifact = await this.findArtifactById(params.artifactId);
      if (!artifact) {
        this.logger.warn(`Artifact not found: ${params.artifactId}`);
        return [];
      }

      const vaultName = artifact.vault.name;
      const result = await this.linkRepository.findBySourceArtifact(params.artifactId, vaultName);
      
      if (result.success) {
        return result.value;
      } else {
        this.logger.error('Error querying links', result.error);
        return [];
      }
    } catch (error: any) {
      this.logger.error('Error listing links', error);
      return [];
    }
  }

  async createLink(params: {
    sourceArtifactId: string;
    targetType: string;
    targetId?: string;
    targetPath?: string;
    targetUrl?: string;
    linkType: string;
    description?: string;
    strength?: string;
    codeLocation?: any;
  }): Promise<ArtifactLink> {
    try {
      // Find the source artifact to get vaultId
      const sourceArtifact = await this.findArtifactById(params.sourceArtifactId);
      if (!sourceArtifact) {
        throw new Error(`Source artifact not found: ${params.sourceArtifactId}`);
      }

      const vaultId = sourceArtifact.vault.id;
      const vaultName = sourceArtifact.vault.name;

      const linkData = {
        sourceArtifactId: params.sourceArtifactId,
        targetType: params.targetType as any,
        targetId: params.targetId,
        targetPath: params.targetPath,
        targetUrl: params.targetUrl,
        linkType: params.linkType as any,
        description: params.description,
        strength: params.strength as any,
        codeLocation: params.codeLocation,
        vaultId,
      };

      const result = await this.linkRepository.create(linkData);
      
      if (result.success) {
        return result.value;
      } else {
        throw new Error(`Failed to create link: ${result.error.message}`);
      }
    } catch (error: any) {
      this.logger.error('Error creating link', error);
      throw error;
    }
  }

  /**
   * 辅助方法：通过 artifactId 查找 Artifact（遍历所有 Vault）
   */
  private async findArtifactById(artifactId: string): Promise<Artifact | null> {
    try {
      const vaultsResult = await this.vaultService.listVaults();
      if (!vaultsResult.success) {
        return null;
      }

      for (const vault of vaultsResult.value) {
        const artifactResult = await this.artifactService.getArtifact(vault.id, artifactId);
        if (artifactResult.success && artifactResult.value) {
          return artifactResult.value;
        }
      }

      return null;
    } catch (error: any) {
      this.logger.error('Error finding artifact by ID', error);
      return null;
    }
  }

  private generatePathFromTitle(title: string, viewType: string, category?: string): string {
    // Convert title to path-friendly format
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const parts: string[] = [];
    if (viewType === 'document') {
      parts.push('documents');
    } else if (viewType === 'design') {
      parts.push('design');
    } else if (viewType === 'development') {
      parts.push('development');
    } else if (viewType === 'test') {
      parts.push('test');
    }

    if (category) {
      parts.push(category);
    }

    parts.push(`${sanitized}.md`);
    return parts.join('/');
  }
}

