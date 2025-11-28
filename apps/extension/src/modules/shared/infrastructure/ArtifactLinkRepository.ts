import { ArtifactLink } from '../domain/entity/ArtifactLink';
import { Result } from '../../../core/types/Result';
import { ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { VaultFileSystemAdapter } from './storage/file/VaultFileSystemAdapter';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { v4 as uuidv4 } from 'uuid';

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
 * 使用 YAML 文件存储链接信息
 */
export class ArtifactLinkRepositoryImpl implements ArtifactLinkRepository {
  constructor(private vaultAdapter: VaultFileSystemAdapter) {}

  /**
   * 获取链接文件路径
   */
  private getLinkPath(linkId: string, vaultName: string): string {
    const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
    return path.join(vaultPath, 'links', `${linkId}.yml`);
  }

  /**
   * 根据链接 ID 查找链接
   */
  async findById(linkId: string, vaultName: string): Promise<Result<ArtifactLink | null, ArtifactError>> {
    try {
      const linkPath = this.getLinkPath(linkId, vaultName);
      if (!fs.existsSync(linkPath)) {
        return { success: true, value: null };
      }

      const content = fs.readFileSync(linkPath, 'utf-8');
      const link = yaml.load(content) as ArtifactLink;

      return { success: true, value: link };
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
      const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
      const linksDir = path.join(vaultPath, 'links');

      if (!fs.existsSync(linksDir)) {
        return { success: true, value: [] };
      }

      const links: ArtifactLink[] = [];
      const files = fs.readdirSync(linksDir);

      for (const file of files) {
        if (!file.endsWith('.yml')) {
          continue;
        }

        const filePath = path.join(linksDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const link = yaml.load(content) as ArtifactLink;

        if (link.sourceArtifactId === sourceArtifactId) {
          links.push(link);
        }
      }

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
      const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
      const linksDir = path.join(vaultPath, 'links');

      if (!fs.existsSync(linksDir)) {
        return { success: true, value: [] };
      }

      const links: ArtifactLink[] = [];
      const files = fs.readdirSync(linksDir);

      for (const file of files) {
        if (!file.endsWith('.yml')) {
          continue;
        }

        const filePath = path.join(linksDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const link = yaml.load(content) as ArtifactLink;

        if (link.targetType !== targetType) {
          continue;
        }

        if (targetId && link.targetId !== targetId) {
          continue;
        }

        if (targetPath && link.targetPath !== targetPath) {
          continue;
        }

        links.push(link);
      }

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

      // 获取 Vault 名称（从 vaultId 或通过其他方式）
      // 这里假设 vaultId 就是 vaultName，或者需要通过 VaultRepository 查找
      const vaultName = link.vaultId; // 简化处理，实际可能需要查找

      const linkPath = this.getLinkPath(linkId, vaultName);
      const linkDir = path.dirname(linkPath);

      if (!fs.existsSync(linkDir)) {
        fs.mkdirSync(linkDir, { recursive: true });
      }

      fs.writeFileSync(linkPath, yaml.dump(fullLink), 'utf-8');

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
      const vaultName = link.vaultId; // 简化处理
      const linkPath = this.getLinkPath(link.id, vaultName);

      if (!fs.existsSync(linkPath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${link.id}`, { linkId: link.id }),
        };
      }

      const updatedLink: ArtifactLink = {
        ...link,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(linkPath, yaml.dump(updatedLink), 'utf-8');

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
      const linkPath = this.getLinkPath(linkId, vaultName);

      if (!fs.existsSync(linkPath)) {
        return {
          success: false,
          error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Link not found: ${linkId}`, { linkId }),
        };
      }

      fs.unlinkSync(linkPath);

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
      const vaultPath = this.vaultAdapter.getVaultPath(vaultName);
      const linksDir = path.join(vaultPath, 'links');

      if (!fs.existsSync(linksDir)) {
        return { success: true, value: [] };
      }

      const links: ArtifactLink[] = [];
      const files = fs.readdirSync(linksDir);

      for (const file of files) {
        if (!file.endsWith('.yml')) {
          continue;
        }

        const filePath = path.join(linksDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const link = yaml.load(content) as ArtifactLink;

        // 应用过滤条件
        if (query.sourceArtifactId && link.sourceArtifactId !== query.sourceArtifactId) {
          continue;
        }

        if (query.targetType && link.targetType !== query.targetType) {
          continue;
        }

        if (query.linkType && link.linkType !== query.linkType) {
          continue;
        }

        links.push(link);
      }

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


