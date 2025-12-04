import { inject, injectable } from 'inversify';
import { TYPES } from '../../infrastructure/di/types';
import { ArtifactApplicationService } from '../shared/application/ArtifactApplicationService';
import { VaultApplicationService } from '../shared/application/VaultApplicationService';
import { SqliteRuntimeIndex } from '../shared/infrastructure/storage/sqlite/SqliteRuntimeIndex';
import { Artifact } from '../shared/domain/entity/artifact';
import { Logger } from '../../core/logger/Logger';
import * as fs from 'fs';

/**
 * MCP 工具接口
 * 提供只读的知识库查询和搜索功能
 * 
 * 设计原则：
 * - 只读操作：不提供写操作（创建、更新、删除）
 * - 批量优先：优先支持批量查询，单个查询通过 search 实现
 * - 聚焦核心：只保留 AI 真正需要的功能
 */
export interface MCPTools {
  /**
   * 列出知识库条目
   * @param params 查询参数
   * @param params.vaultName 可选，指定 vault。如果不提供，返回所有 vault 的条目
   * @param params.viewType 可选，类型过滤（document/design/development/test）
   * @param params.category 可选，分类过滤
   * @param params.limit 可选，结果数量限制（默认 20）
   */
  listEntries(params: {
    vaultName?: string;
    viewType?: string;
    category?: string;
    limit?: number;
  }): Promise<Artifact[]>;

  /**
   * 搜索知识库
   * @param params 搜索参数
   * @param params.query 搜索关键词（必需）
   * @param params.vaultName 可选，指定 vault。如果不提供，搜索所有 vault
   * @param params.tags 可选，标签过滤（AND 关系，必须包含所有指定标签）
   * @param params.limit 可选，结果数量限制（默认 50）
   * @param params.includeContent 可选，是否返回完整内容（默认 true）
   * @param params.maxContentSize 可选，最大内容大小（字节），超过则不返回内容（默认 1MB）
   */
  search(params: {
    query: string;
    vaultName?: string;
    tags?: string[];
    limit?: number;
    includeContent?: boolean;
    maxContentSize?: number;
  }): Promise<Artifact[]>;

  /**
   * 根据代码路径获取关联的文档/设计图
   * @param params 查询参数
   * @param params.codePath 代码文件路径（相对于工作区根目录，必需）
   * @param params.includeContent 可选，是否返回完整内容（默认 true）
   * @param params.maxContentSize 可选，最大内容大小（字节），超过则不返回内容（默认 1MB）
   */
  getDocumentsForCode(params: {
    codePath: string;
    includeContent?: boolean;
    maxContentSize?: number;
  }): Promise<Artifact[]>;
}

/**
 * MCP Tools 实现
 * 提供只读的知识库查询和搜索功能
 * 
 * 已移除的写操作方法：
 * - createEntry, updateEntry, deleteEntry (写操作，AI 不需要)
 * - getEntry (单个查询，search 已覆盖)
 * - listLinks, createLink (使用频率低，非核心功能)
 */
@injectable()
export class MCPToolsImpl implements MCPTools {
  constructor(
    @inject(TYPES.ArtifactApplicationService)
    private artifactService: ArtifactApplicationService,
    @inject(TYPES.VaultApplicationService)
    private vaultService: VaultApplicationService,
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
          limit: params.limit || 20,
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

  async search(params: {
    query: string;
    vaultName?: string;
    tags?: string[];
    limit?: number;
    includeContent?: boolean;
    maxContentSize?: number;
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

          // Filter by tags if provided (AND 关系，必须包含所有指定标签)
          if (params.tags && params.tags.length > 0) {
            artifacts = artifacts.filter(a => {
              const artifactTags = a.tags || [];
              return params.tags!.every(tag => artifactTags.includes(tag));
            });
          }

          // 加载内容（如果需要）
          const includeContent = params.includeContent !== false; // 默认 true
          const maxSize = params.maxContentSize || 1024 * 1024; // 默认 1MB

          for (const artifact of artifacts) {
            if (includeContent && artifact.contentLocation) {
              try {
                const stats = fs.statSync(artifact.contentLocation);
                if (stats.size <= maxSize) {
                  const content = fs.readFileSync(artifact.contentLocation, 'utf-8');
                  artifact.body = content;
                } else {
                  artifact.contentSize = stats.size;
                }
              } catch (error) {
                this.logger.warn('Failed to load content', { artifactId: artifact.id, error });
              }
            }
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

              // Filter by tags if provided (AND 关系，必须包含所有指定标签)
              if (params.tags && params.tags.length > 0) {
                const artifactTags = artifact.tags || [];
                if (!params.tags.every(tag => artifactTags.includes(tag))) {
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

      // 加载内容（如果需要）
      const includeContent = params.includeContent !== false; // 默认 true
      const maxSize = params.maxContentSize || 1024 * 1024; // 默认 1MB

      for (const artifact of artifacts) {
        if (includeContent && artifact.contentLocation) {
          try {
            const stats = fs.statSync(artifact.contentLocation);
            if (stats.size <= maxSize) {
              const content = fs.readFileSync(artifact.contentLocation, 'utf-8');
              artifact.body = content;
            } else {
              artifact.contentSize = stats.size;
              // body 字段不设置，表示内容未加载
            }
          } catch (error) {
            this.logger.warn('Failed to load content', { artifactId: artifact.id, error });
            // 继续处理其他结果
          }
        }
      }

      return artifacts;
    } catch (error: any) {
      this.logger.error('Error searching entries', error);
      return [];
    }
  }

  async getDocumentsForCode(params: {
    codePath: string;
    includeContent?: boolean;
    maxContentSize?: number;
  }): Promise<Artifact[]> {
    try {
      const result = await this.artifactService.findArtifactsByCodePath(params.codePath);
      if (result.success) {
        const artifacts = result.value;

        // 加载内容（如果需要）
        const includeContent = params.includeContent !== false; // 默认 true
        const maxSize = params.maxContentSize || 1024 * 1024; // 默认 1MB

        for (const artifact of artifacts) {
          if (includeContent && artifact.contentLocation) {
            try {
              const stats = fs.statSync(artifact.contentLocation);
              if (stats.size <= maxSize) {
                const content = fs.readFileSync(artifact.contentLocation, 'utf-8');
                artifact.body = content;
              } else {
                artifact.contentSize = stats.size;
                // body 字段不设置，表示内容未加载
              }
            } catch (error) {
              this.logger.warn('Failed to load content', { artifactId: artifact.id, error });
              // 继续处理其他结果
            }
          }
        }

        return artifacts;
      } else {
        this.logger.error('Failed to find documents for code', result.error);
        return [];
      }
    } catch (error: any) {
      this.logger.error('Error getting documents for code', error);
      return [];
    }
  }

}

