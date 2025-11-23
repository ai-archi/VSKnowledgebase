import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { MetadataRepository } from './MetadataRepository';
import { ArtifactMetadata } from '../../../domain/shared/artifact/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode } from '../../../domain/shared/artifact/errors';
import { YamlMetadataRepository } from '../../../infrastructure/storage/yaml/YamlMetadataRepository';
import { VaultRepository } from './VaultRepository';
import { ConfigManager } from '../../../core/config/ConfigManager';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

@injectable()
export class MetadataRepositoryImpl implements MetadataRepository {
  private yamlRepos: Map<string, YamlMetadataRepository> = new Map(); // vaultName -> YamlMetadataRepository
  private vaultRepository: VaultRepository;
  private configManager: ConfigManager;
  private metadataCache: Map<string, ArtifactMetadata> = new Map();

  constructor(
    @inject(TYPES.VaultRepository) vaultRepository: VaultRepository,
    @inject(TYPES.ConfigManager) configManager: ConfigManager
  ) {
    this.vaultRepository = vaultRepository;
    this.configManager = configManager;
  }

  /**
   * 获取指定 vault 的 YamlMetadataRepository 实例（带缓存）
   */
  private getYamlRepoForVault(vaultName: string): YamlMetadataRepository {
    if (!this.yamlRepos.has(vaultName)) {
      const architoolRoot = this.configManager.getArchitoolRoot();
      const vaultPath = path.join(architoolRoot, vaultName);
      this.yamlRepos.set(vaultName, new YamlMetadataRepository(vaultPath));
    }
    return this.yamlRepos.get(vaultName)!;
  }

  /**
   * 从 metadataId 推断 vaultName（通过扫描所有 vault）
   */
  private async findVaultForMetadata(metadataId: string): Promise<string | null> {
    const vaultsResult = await this.vaultRepository.findAll();
    if (!vaultsResult.success) {
      return null;
    }

    const architoolRoot = this.configManager.getArchitoolRoot();
    for (const vault of vaultsResult.value) {
      const vaultPath = path.join(architoolRoot, vault.name);
      const metadataPath = path.join(vaultPath, 'metadata', `${metadataId}.metadata.yml`);
      if (fs.existsSync(metadataPath)) {
        return vault.name;
      }
    }

    return null;
  }

  async findById(metadataId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>> {
    if (this.metadataCache.has(metadataId)) {
      return { success: true, value: this.metadataCache.get(metadataId)! };
    }

    // 查找 metadata 所在的 vault
    const vaultName = await this.findVaultForMetadata(metadataId);
    if (!vaultName) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Metadata not found: ${metadataId}`),
      };
    }

    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const result = await yamlRepo.readMetadata(metadataId);
    if (result.success && result.value) {
      this.metadataCache.set(metadataId, result.value);
    }
    return result;
  }

  async findByArtifactId(artifactId: string): Promise<Result<ArtifactMetadata | null, ArtifactError>> {
    try {
      // 检查缓存
      for (const [metadataId, metadata] of this.metadataCache.entries()) {
        if (metadata.artifactId === artifactId) {
          return { success: true, value: metadata };
        }
      }

      // 从所有 vault 扫描元数据文件
      const vaultsResult = await this.vaultRepository.findAll();
      if (!vaultsResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Failed to list vaults: ${vaultsResult.error.message}`,
            { artifactId }
          ),
        };
      }

      const architoolRoot = this.configManager.getArchitoolRoot();
      const metadataFiles: string[] = [];
      for (const vault of vaultsResult.value) {
        const yamlRepo = this.getYamlRepoForVault(vault.name);
        const vaultFiles = await yamlRepo.listMetadataFiles();
        metadataFiles.push(...vaultFiles);
      }
      
      for (const filePath of metadataFiles) {
        try {
          // 从文件路径提取 metadataId 和 vaultName
          const fileName = require('path').basename(filePath, '.metadata.yml');
          // 从文件路径提取 vaultName（路径格式：{architoolRoot}/{vaultName}/metadata/{fileName}.metadata.yml）
          const pathParts = filePath.split(path.sep);
          const architoolRoot = this.configManager.getArchitoolRoot();
          const architoolRootParts = architoolRoot.split(path.sep);
          const vaultNameIndex = architoolRootParts.length;
          if (vaultNameIndex < pathParts.length) {
            const vaultName = pathParts[vaultNameIndex];
            const yamlRepo = this.getYamlRepoForVault(vaultName);
            const result = await yamlRepo.readMetadata(fileName);
          
            if (result.success && result.value && result.value.artifactId === artifactId) {
              // 更新缓存
              this.metadataCache.set(result.value.id, result.value);
              return { success: true, value: result.value };
            }
          }
        } catch (error) {
          // 忽略单个文件的读取错误，继续处理其他文件
          continue;
        }
      }

      return { success: true, value: null };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find metadata by artifact ID: ${error.message}`,
          { artifactId },
          error
        ),
      };
    }
  }

  /**
   * 根据代码路径查询关联的 Artifact（用于 Development 视图反向关联）
   */
  async findByCodePath(codePath: string): Promise<Result<ArtifactMetadata[], ArtifactError>> {
    try {
      const matchingMetadata: ArtifactMetadata[] = [];
      
      // 获取所有 vault
      const vaultsResult = await this.vaultRepository.findAll();
      if (!vaultsResult.success) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Failed to list vaults: ${vaultsResult.error.message}`,
            { codePath }
          ),
        };
      }

      const architoolRoot = this.configManager.getArchitoolRoot();

      // 扫描所有 vault 的元数据文件
      for (const vault of vaultsResult.value) {
        const vaultPath = path.join(architoolRoot, vault.name);
        const metadataDir = path.join(vaultPath, 'metadata');
        
        if (!fs.existsSync(metadataDir)) {
          continue;
        }

        const files = fs.readdirSync(metadataDir);
        const metadataFiles = files.filter(file => file.endsWith('.metadata.yml'));

        for (const fileName of metadataFiles) {
          try {
            const metadataId = path.basename(fileName, '.metadata.yml');
            const metadataPath = path.join(metadataDir, fileName);
            const content = fs.readFileSync(metadataPath, 'utf-8');
            const metadata = yaml.load(content) as ArtifactMetadata;
            
            // 检查 relatedCodePaths 是否包含指定的代码路径
            if (metadata.relatedCodePaths && metadata.relatedCodePaths.includes(codePath)) {
              // 更新缓存
              this.metadataCache.set(metadata.id, metadata);
              matchingMetadata.push(metadata);
            }
          } catch (error) {
            // 忽略单个文件的读取错误，继续处理其他文件
            continue;
          }
        }
      }

      return { success: true, value: matchingMetadata };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to find metadata by code path: ${error.message}`,
          { codePath },
          error
        ),
      };
    }
  }

  async create(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>> {
    // 从 metadata 中获取 vaultName
    const vaultName = metadata.vaultName;
    if (!vaultName) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.INVALID_INPUT,
          'Metadata must have vaultName'
        ),
      };
    }

    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const result = await yamlRepo.writeMetadata(metadata);
    if (result.success) {
      this.metadataCache.set(metadata.id, metadata);
      return { success: true, value: metadata };
    }
    return { success: false, error: result.error };
  }

  async update(metadata: ArtifactMetadata): Promise<Result<ArtifactMetadata, ArtifactError>> {
    // 从 metadata 中获取 vaultName
    const vaultName = metadata.vaultName;
    if (!vaultName) {
      // 如果 metadata 中没有 vaultName，尝试查找
      const foundVaultName = await this.findVaultForMetadata(metadata.id);
      if (!foundVaultName) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Cannot find vault for metadata: ${metadata.id}`
          ),
        };
      }
      const yamlRepo = this.getYamlRepoForVault(foundVaultName);
      const result = await yamlRepo.writeMetadata(metadata);
      if (result.success) {
        this.metadataCache.set(metadata.id, metadata);
        return { success: true, value: metadata };
      }
      return { success: false, error: result.error };
    }

    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const result = await yamlRepo.writeMetadata(metadata);
    if (result.success) {
      this.metadataCache.set(metadata.id, metadata);
      return { success: true, value: metadata };
    }
    return { success: false, error: result.error };
  }

  async delete(metadataId: string): Promise<Result<void, ArtifactError>> {
    // 查找 metadata 所在的 vault
    const vaultName = await this.findVaultForMetadata(metadataId);
    if (!vaultName) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Metadata not found: ${metadataId}`),
      };
    }

    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const result = await yamlRepo.deleteMetadata(metadataId);
    if (result.success) {
      this.metadataCache.delete(metadataId);
    }
    return result;
  }
}


