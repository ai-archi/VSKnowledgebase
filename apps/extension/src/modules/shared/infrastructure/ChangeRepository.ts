import { ArtifactChange } from '../../../domain/shared/artifact/ArtifactChange';
import { Result } from '../../../core/types/Result';
import { ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

/**
 * 变更记录存储库
 */
export interface ChangeRepository {
  /**
   * 保存变更记录
   */
  save(change: ArtifactChange, vaultName: string): Promise<Result<void, ArtifactError>>;

  /**
   * 根据 Artifact ID 查询变更记录
   */
  findByArtifact(artifactId: string, vaultName: string): Promise<Result<ArtifactChange[], ArtifactError>>;

  /**
   * 查询变更记录
   */
  query(query: {
    vaultName?: string;
    artifactId?: string;
    changeType?: string;
    limit?: number;
  }): Promise<Result<ArtifactChange[], ArtifactError>>;

}

export class ChangeRepositoryImpl implements ChangeRepository {
  constructor(
    private vaultAdapter: VaultFileSystemAdapter
  ) {}

  async save(change: ArtifactChange, vaultName: string): Promise<Result<void, ArtifactError>> {
    try {
      const changeDir = path.join(this.vaultAdapter.getVaultsRoot(), vaultName, 'changes');
      if (!fs.existsSync(changeDir)) {
        fs.mkdirSync(changeDir, { recursive: true });
      }

      const changeFilePath = path.join(changeDir, `${change.changeId}.yml`);
      const changeData = {
        changeId: change.changeId,
        artifactId: change.artifactId,
        changeType: change.changeType,
        description: change.description,
        diffSummary: change.diffSummary,
        author: change.author,
        timestamp: change.timestamp,
        impactedArtifacts: change.impactedArtifacts || [],
        gitCommitHash: change.gitCommitHash,
      };

      fs.writeFileSync(changeFilePath, yaml.dump(changeData), 'utf-8');
      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to save change: ${error.message}`),
      };
    }
  }

  async findByArtifact(artifactId: string, vaultName: string): Promise<Result<ArtifactChange[], ArtifactError>> {
    try {
      const changeDir = path.join(this.vaultAdapter.getVaultsRoot(), vaultName, 'changes');
      if (!fs.existsSync(changeDir)) {
        return { success: true, value: [] };
      }

      const changes: ArtifactChange[] = [];
      const files = fs.readdirSync(changeDir);

      for (const file of files) {
        if (!file.endsWith('.yml')) {
          continue;
        }

        const filePath = path.join(changeDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const changeData = yaml.load(content) as any;

        if (changeData.artifactId === artifactId) {
          changes.push(changeData as ArtifactChange);
        }
      }

      // 按时间戳排序（最新的在前）
      changes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      return { success: true, value: changes };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to query changes: ${error.message}`),
      };
    }
  }

  async query(query: {
    vaultName?: string;
    artifactId?: string;
    changeType?: string;
    limit?: number;
  }): Promise<Result<ArtifactChange[], ArtifactError>> {
    try {
      const changes: ArtifactChange[] = [];

      // 如果指定了 vaultName，只查询该 Vault
      if (query.vaultName) {
        const result = await this.queryVaultChanges(query.vaultName, query);
        if (result.success) {
          changes.push(...result.value);
        }
      } else {
        // 查询所有 Vault
        const vaultsRoot = this.vaultAdapter.getVaultsRoot();
        if (fs.existsSync(vaultsRoot)) {
          const vaults = fs.readdirSync(vaultsRoot, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);

          for (const vaultName of vaults) {
            const result = await this.queryVaultChanges(vaultName, query);
            if (result.success) {
              changes.push(...result.value);
            }
          }
        }
      }

      // 按时间戳排序（最新的在前）
      changes.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

      // 应用限制
      if (query.limit) {
        return { success: true, value: changes.slice(0, query.limit) };
      }

      return { success: true, value: changes };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to query changes: ${error.message}`),
      };
    }
  }

  private async queryVaultChanges(
    vaultName: string,
    query: {
      artifactId?: string;
      changeType?: string;
      limit?: number;
    }
  ): Promise<Result<ArtifactChange[], ArtifactError>> {
    try {
      const changeDir = path.join(this.vaultAdapter.getVaultsRoot(), vaultName, 'changes');
      if (!fs.existsSync(changeDir)) {
        return { success: true, value: [] };
      }

      const changes: ArtifactChange[] = [];
      const files = fs.readdirSync(changeDir);

      for (const file of files) {
        if (!file.endsWith('.yml')) {
          continue;
        }

        const filePath = path.join(changeDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const changeData = yaml.load(content) as any;

        // 应用过滤条件
        if (query.artifactId && changeData.artifactId !== query.artifactId) {
          continue;
        }

        if (query.changeType && changeData.changeType !== query.changeType) {
          continue;
        }

        changes.push(changeData as ArtifactChange);
      }

      return { success: true, value: changes };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.OPERATION_FAILED, `Failed to query vault changes: ${error.message}`),
      };
    }
  }
}


