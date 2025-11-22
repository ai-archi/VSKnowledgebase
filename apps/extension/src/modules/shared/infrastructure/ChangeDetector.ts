import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { Artifact } from '../../../domain/shared/artifact/Artifact';
import { ArtifactChange, ChangeType } from '../../../domain/shared/artifact/ArtifactChange';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { ArtifactFileSystemAdapter } from '../../../infrastructure/storage/file/ArtifactFileSystemAdapter';
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
      const oldHash = oldArtifact.contentHash || this.calculateHash(oldArtifact.body || '');
      const newHash = newArtifact.contentHash || this.calculateHash(newArtifact.body || '');

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
      const fullPath = this.fileAdapter.getArtifactPath(vaultName, artifactPath);
      
      if (!fs.existsSync(fullPath)) {
        // 文件不存在，可能是删除
        return null; // 需要从索引中查找对应的 artifactId
      }

      // 读取文件内容并计算哈希
      const content = fs.readFileSync(fullPath, 'utf-8');
      const currentHash = this.calculateHash(content);

      // 检查是否有之前的哈希记录
      // TODO: 需要从索引或缓存中获取 artifactId 和之前的哈希
      // 这里简化处理，仅返回 null
      return null;
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
      // 获取 Vault 名称（从 artifactId 或 change 中获取）
      // TODO: 需要从 ArtifactRepository 获取完整的 Artifact 信息
      const vaultName = 'default'; // 临时值

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

      this.logger.info(`Change recorded: ${change.changeId} (${change.changeType})`);
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
    const oldHash = oldArtifact.contentHash || this.calculateHash(oldArtifact.body || '');
    const newHash = newArtifact.contentHash || this.calculateHash(newArtifact.body || '');
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

