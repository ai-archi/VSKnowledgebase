import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { Artifact } from '../domain/entity/artifact';
import { ArtifactChange } from '../domain/entity/ArtifactChange';
import { ChangeType } from '../domain/types';
import { VaultFileSystemAdapter } from './storage/file/VaultFileSystemAdapter';
import { ArtifactFileSystemAdapter } from './storage/file/ArtifactFileSystemAdapter';
import { ArtifactRepository } from './ArtifactRepository';
import { VaultRepository } from './VaultRepository';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as yaml from 'js-yaml';

/**
 * 变更检测器
 * 检测 Artifact 的变更并记录变更历史
 */
export interface ChangeDetector {
  /**
   * 检测 Artifact 变更
   */
  detectChanges(artifactId: string, oldArtifact: Artifact | null, newArtifact: Artifact | null): Promise<ArtifactChange | null>;

  /**
   * 检测文件系统变更（通过文件哈希）
   */
  detectFileChanges(vaultName: string, artifactPath: string): Promise<ArtifactChange | null>;

  /**
   * 记录变更
   */
  recordChange(change: ArtifactChange): Promise<void>;
}

@injectable()
export class ChangeDetectorImpl implements ChangeDetector {
  private artifactHashes: Map<string, string> = new Map(); // artifactId -> contentHash

  constructor(
    @inject(TYPES.VaultFileSystemAdapter)
    private vaultAdapter: VaultFileSystemAdapter,
    @inject(TYPES.ArtifactFileSystemAdapter)
    private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.ArtifactRepository)
    private artifactRepository: ArtifactRepository,
    @inject(TYPES.VaultRepository)
    private vaultRepository: VaultRepository,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  /**
   * 检测 Artifact 变更
   */
  async detectChanges(
    artifactId: string,
    oldArtifact: Artifact | null,
    newArtifact: Artifact | null
  ): Promise<ArtifactChange | null> {
    // 创建变更
    if (!oldArtifact && newArtifact) {
      return this.createChange(artifactId, 'CREATE', newArtifact, null);
    }

    // 删除变更
    if (oldArtifact && !newArtifact) {
      return this.createChange(artifactId, 'DELETE', null, oldArtifact);
    }

    // 更新变更
    if (oldArtifact && newArtifact) {
      // 检查路径是否变更（重命名或移动）
      if (oldArtifact.path !== newArtifact.path) {
        return this.createChange(artifactId, 'MOVE', newArtifact, oldArtifact);
      }

      // 检查内容是否变更
      const oldHash = oldArtifact.contentHash || this.calculateHash(oldArtifact.content || '');
      const newHash = newArtifact.contentHash || this.calculateHash(newArtifact.content || '');

      if (oldHash !== newHash) {
        return this.createChange(artifactId, 'UPDATE', newArtifact, oldArtifact);
      }
    }

    return null; // 无变更
  }

  /**
   * 检测文件系统变更（通过文件哈希）
   */
  async detectFileChanges(vaultName: string, artifactPath: string): Promise<ArtifactChange | null> {
    try {
      // 通过 vaultName 查找 Vault
      const vaultResult = await this.vaultRepository.findByName(vaultName);
      if (!vaultResult.success || !vaultResult.value) {
        this.logger.warn(`Vault not found: ${vaultName}`);
        return null;
      }

      const vaultId = vaultResult.value.id;
      const fullPath = this.fileAdapter.getArtifactPath(vaultName, artifactPath);
      
      if (!fs.existsSync(fullPath)) {
        // 文件不存在，可能是删除
        // 尝试从 ArtifactRepository 查找对应的 Artifact
        const artifactResult = await this.artifactRepository.findByPath(vaultId, artifactPath);
        if (artifactResult.success && artifactResult.value) {
          // 文件已删除，创建 DELETE 变更
          return this.createChange(artifactResult.value.id, 'DELETE', null, artifactResult.value);
        }
        return null;
      }

      // 读取文件内容并计算哈希
      const content = fs.readFileSync(fullPath, 'utf-8');
      const currentHash = this.calculateHash(content);

      // 通过路径查找 Artifact，获取之前的哈希值
      const artifactResult = await this.artifactRepository.findByPath(vaultId, artifactPath);
      if (!artifactResult.success) {
        this.logger.warn(`Failed to find artifact by path: ${artifactPath}`);
        return null;
      }

      if (!artifactResult.value) {
        // Artifact 不存在，可能是新创建的文件
        // 这里无法确定 artifactId，返回 null
        // 实际应该通过其他方式（如文件监听）触发创建流程
        return null;
      }

      const artifact = artifactResult.value;
      const previousHash = artifact.contentHash || this.artifactHashes.get(artifact.id) || '';

      // 检查哈希是否变更
      if (previousHash && previousHash !== currentHash) {
        // 更新缓存中的哈希值
        this.artifactHashes.set(artifact.id, currentHash);
        
        // 创建 UPDATE 变更
        const updatedArtifact: Artifact = {
          ...artifact,
          contentHash: currentHash,
          updatedAt: new Date().toISOString(),
        };
        return this.createChange(artifact.id, 'UPDATE', updatedArtifact, artifact);
      }

      // 如果之前没有哈希记录，更新缓存
      if (!previousHash) {
        this.artifactHashes.set(artifact.id, currentHash);
      }

      return null; // 无变更
    } catch (error: any) {
      this.logger.error('Failed to detect file changes', error);
      return null;
    }
  }

  /**
   * 记录变更
   */
  async recordChange(change: ArtifactChange): Promise<void> {
    try {
      // 通过 artifactId 查找 Artifact，获取 Vault 信息
      // 需要遍历所有 Vault 查找 Artifact
      const vaultsResult = await this.vaultRepository.findAll();
      if (!vaultsResult.success) {
        this.logger.error('Failed to list vaults for recording change');
        throw new Error('Failed to list vaults');
      }

      let vaultName: string | undefined;
      
      // 遍历所有 Vault 查找 Artifact
      for (const vault of vaultsResult.value) {
        const artifactResult = await this.artifactRepository.findById(vault.id, change.artifactId);
        if (artifactResult.success && artifactResult.value) {
          vaultName = artifactResult.value.vault.name;
          break;
        }
      }

      if (!vaultName) {
        // 如果找不到 Artifact，尝试从变更记录中推断（如果之前有记录）
        // 或者使用默认值（不推荐，但为了兼容性）
        this.logger.warn(`Cannot find vault for artifact: ${change.artifactId}, using first vault as fallback`);
        if (vaultsResult.value.length > 0) {
          vaultName = vaultsResult.value[0].name;
        } else {
          throw new Error('No vaults available to record change');
        }
      }

      // 写入变更记录文件
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

      // 使用 YAML 格式写入
      fs.writeFileSync(changeFilePath, yaml.dump(changeData), 'utf-8');

      this.logger.info(`Change recorded: ${change.changeId} (${change.changeType}) in vault: ${vaultName}`);
    } catch (error: any) {
      this.logger.error('Failed to record change', error);
      throw error;
    }
  }

  /**
   * 创建变更记录
   */
  private createChange(
    artifactId: string,
    changeType: ChangeType,
    newArtifact: Artifact | null,
    oldArtifact: Artifact | null
  ): ArtifactChange {
    const changeId = uuidv4();
    const timestamp = new Date().toISOString();

    let description = '';
    let diffSummary = '';

    switch (changeType) {
      case 'CREATE':
        description = `Created artifact: ${newArtifact?.title || artifactId}`;
        break;
      case 'UPDATE':
        description = `Updated artifact: ${newArtifact?.title || artifactId}`;
        diffSummary = this.generateDiffSummary(oldArtifact, newArtifact);
        break;
      case 'DELETE':
        description = `Deleted artifact: ${oldArtifact?.title || artifactId}`;
        break;
      case 'MOVE':
        description = `Moved artifact: ${oldArtifact?.path} -> ${newArtifact?.path}`;
        break;
      case 'RENAME':
        description = `Renamed artifact: ${oldArtifact?.name} -> ${newArtifact?.name}`;
        break;
    }

    return {
      changeId,
      artifactId,
      changeType,
      description,
      diffSummary,
      timestamp,
      impactedArtifacts: [],
    };
  }

  /**
   * 生成差异摘要
   */
  private generateDiffSummary(oldArtifact: Artifact | null, newArtifact: Artifact | null): string {
    if (!oldArtifact || !newArtifact) {
      return '';
    }

    const changes: string[] = [];

    if (oldArtifact.title !== newArtifact.title) {
      changes.push(`Title: ${oldArtifact.title} -> ${newArtifact.title}`);
    }

    if (oldArtifact.description !== newArtifact.description) {
      changes.push('Description changed');
    }

    if (oldArtifact.status !== newArtifact.status) {
      changes.push(`Status: ${oldArtifact.status} -> ${newArtifact.status}`);
    }

    // 检查标签变更
    const oldTags = oldArtifact.tags || [];
    const newTags = newArtifact.tags || [];
    if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
      changes.push('Tags changed');
    }

    // 检查内容变更
    const oldHash = oldArtifact.contentHash || this.calculateHash(oldArtifact.content || '');
    const newHash = newArtifact.contentHash || this.calculateHash(newArtifact.content || '');
    if (oldHash !== newHash) {
      changes.push('Content changed');
    }

    return changes.join('; ');
  }

  /**
   * 计算内容哈希
   */
  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}


