import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { ArtifactRepository } from './ArtifactRepository';
import { Artifact } from '../domain/entity/artifact';
import { Result, ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { ArtifactFileSystemAdapter } from './storage/file/ArtifactFileSystemAdapter';
import { VaultRepository } from './VaultRepository';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { ArtifactMetadata } from '../domain/ArtifactMetadata';

@injectable()
export class ArtifactRepositoryImpl implements ArtifactRepository {
  constructor(
    @inject(TYPES.ArtifactFileSystemAdapter) private fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.VaultRepository) private vaultRepository: VaultRepository
  ) {}

  async findById(vaultId: string, artifactId: string): Promise<Result<Artifact | null, ArtifactError>> {
    try {
      // 获取 vault 信息
      const vaultResult = await this.vaultRepository.findById(vaultId);
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

      const vaultName = vaultResult.value.name;

      // 扫描 artifacts 目录查找匹配的 artifact
      const artifactsResult = await this.findAll(vaultId);
      if (!artifactsResult.success) {
        return artifactsResult;
      }

      const artifact = artifactsResult.value.find(a => a.id === artifactId);
      return { success: true, value: artifact || null };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find artifact by ID: ${error.message}`,
          { vaultId, artifactId },
          error
        ),
      };
    }
  }

  async findByPath(vaultId: string, artifactPath: string): Promise<Result<Artifact | null, ArtifactError>> {
    try {
      // 获取 vault 信息
      const vaultResult = await this.vaultRepository.findById(vaultId);
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

      const vaultName = vaultResult.value.name;

      // 构建完整的文件路径
      const fullPath = path.join(
        this.fileAdapter.getVaultPath(vaultName),
        'artifacts',
        artifactPath
      );

      if (!fs.existsSync(fullPath)) {
        return { success: true, value: null };
      }

      // 从文件构建 Artifact 对象
      const artifact = await this.buildArtifactFromFile(vaultId, vaultName, artifactPath, fullPath);
      return { success: true, value: artifact };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find artifact by path: ${error.message}`,
          { vaultId, path: artifactPath },
          error
        ),
      };
    }
  }

  async findAll(vaultId?: string): Promise<Result<Artifact[], ArtifactError>> {
    try {
      const artifacts: Artifact[] = [];
      
      // 获取要扫描的 vault 列表
      let vaultsToScan: Array<{ id: string; name: string }> = [];
      
      if (vaultId) {
        const vaultResult = await this.vaultRepository.findById(vaultId);
        if (!vaultResult.success || !vaultResult.value) {
          return { success: true, value: [] };
        }
        vaultsToScan = [{ id: vaultResult.value.id, name: vaultResult.value.name }];
      } else {
        const vaultsResult = await this.vaultRepository.findAll();
        if (!vaultsResult.success) {
          return { success: true, value: [] };
        }
        vaultsToScan = vaultsResult.value.map(v => ({ id: v.id, name: v.name }));
      }

      // 扫描每个 vault 的 artifacts 目录
      for (const vault of vaultsToScan) {
        const vaultArtifacts = await this.scanVaultArtifacts(vault.id, vault.name);
        artifacts.push(...vaultArtifacts);
      }

      return { success: true, value: artifacts };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find all artifacts: ${error.message}`,
          { vaultId },
          error
        ),
      };
    }
  }

  async save(artifact: Artifact): Promise<Result<void, ArtifactError>> {
    try {
      // Artifact 的保存实际上是通过 ArtifactFileSystemAdapter 写入文件
      // 这里主要是更新元数据引用
      // 实际的保存操作应该在应用层完成
      // Repository 层主要负责查询，保存操作由应用层通过 FileAdapter 完成
      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to save artifact: ${error.message}`,
          { artifactId: artifact.id },
          error
        ),
      };
    }
  }

  async delete(vaultId: string, artifactId: string): Promise<Result<void, ArtifactError>> {
    try {
      // 先查找 artifact
      const artifactResult = await this.findById(vaultId, artifactId);
      if (!artifactResult.success) {
        return artifactResult;
      }

      if (!artifactResult.value) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Artifact not found: ${artifactId}`,
            { vaultId, artifactId }
          ),
        };
      }

      const artifact = artifactResult.value;
      const vaultResult = await this.vaultRepository.findById(vaultId);
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

      // 删除文件系统中的文件
      const deleteResult = await this.fileAdapter.deleteArtifact(vaultResult.value.name, artifact.path);
      return deleteResult;
    } catch (error: any) {
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

  /**
   * 扫描指定 vault 的 artifacts 目录
   */
  private async scanVaultArtifacts(vaultId: string, vaultName: string): Promise<Artifact[]> {
    const artifacts: Artifact[] = [];
    const artifactsDir = path.join(
      this.fileAdapter.getVaultPath(vaultName),
      'artifacts'
    );
    
    if (!fs.existsSync(artifactsDir)) {
      return artifacts;
    }

    // 递归扫描 artifacts 目录
    const scanDirectory = (dir: string, basePath: string = ''): void => {
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = basePath ? path.join(basePath, entry.name) : entry.name;
          
          if (entry.isDirectory()) {
            scanDirectory(fullPath, relativePath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).slice(1);
            if (!ext || ext === 'md' || ext === 'yml' || ext === 'yaml') {
              const artifact = this.buildArtifactFromFileSync(vaultId, vaultName, relativePath, fullPath, ext);
              if (artifact) {
                artifacts.push(artifact);
              }
            }
          }
        }
      } catch (error: any) {
        // 忽略扫描错误，继续处理其他文件
      }
    };

    scanDirectory(artifactsDir);
    return artifacts;
  }

  /**
   * 从文件构建 Artifact 对象（同步版本）
   */
  private buildArtifactFromFileSync(
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
        const metadataPath = this.fileAdapter.getMetadataPath(vaultName, metadataId);
        if (fs.existsSync(metadataPath)) {
          const content = fs.readFileSync(metadataPath, 'utf-8');
          metadata = yaml.load(content) as ArtifactMetadata;
          metadataRaw = yaml.load(content) as any;
        }
      } catch (error) {
        // metadata 文件不存在，使用默认值
      }

      // 读取文件统计信息
      const stats = fs.statSync(fullPath);
      const name = path.basename(artifactPath, path.extname(artifactPath));
      
      // 构建 Artifact 对象
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
        title: metadataRaw?.title || metadata?.id || name,
        description: metadataRaw?.description,
        status: 'draft',
        createdAt: metadata?.createdAt || metadataRaw?.createdAt || stats.birthtime.toISOString(),
        updatedAt: metadata?.updatedAt || metadataRaw?.updatedAt || stats.mtime.toISOString(),
        metadataId: metadataIdValue,
        tags: metadata?.tags || metadataRaw?.tags,
      };

      return artifact;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * 从文件构建 Artifact 对象（异步版本）
   */
  private async buildArtifactFromFile(
    vaultId: string,
    vaultName: string,
    artifactPath: string,
    fullPath: string
  ): Promise<Artifact | null> {
    return this.buildArtifactFromFileSync(
      vaultId,
      vaultName,
      artifactPath,
      fullPath,
      path.extname(artifactPath).slice(1) || 'md'
    );
  }

  /**
   * 猜测 metadata ID（基于 artifact 路径）
   */
  private guessMetadataId(artifactPath: string): string {
    return path.basename(artifactPath, path.extname(artifactPath));
  }
}



