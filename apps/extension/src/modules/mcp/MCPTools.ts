import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/types';
import { ArtifactFileSystemApplicationService } from '../shared/application/ArtifactFileSystemApplicationService';
import { VaultApplicationService } from '../shared/application/VaultApplicationService';
import { Artifact } from '../../domain/shared/artifact/Artifact';
import { ArtifactLink } from '../../domain/shared/artifact/ArtifactLink';
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
    linkType: string;
    description?: string;
  }): Promise<ArtifactLink>;
}

@injectable()
export class MCPToolsImpl implements MCPTools {
  constructor(
    @inject(TYPES.ArtifactFileSystemApplicationService)
    private artifactService: ArtifactFileSystemApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
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

      // For now, use listArtifacts and filter by query
      // TODO: Implement proper search with vector search
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
      // TODO: Implement ArtifactLinkRepository query
      // For now, return empty array
      this.logger.warn('listLinks not yet fully implemented');
      return [];
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
    linkType: string;
    description?: string;
  }): Promise<ArtifactLink> {
    try {
      // TODO: Implement ArtifactLinkRepository create
      // For now, throw error
      throw new Error('createLink not yet fully implemented');
    } catch (error: any) {
      this.logger.error('Error creating link', error);
      throw error;
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

