import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { MetadataRepository, CreateMetadataOptions } from './MetadataRepository';
import { ArtifactMetadata } from '../domain/ArtifactMetadata';
import { Result, ArtifactError, ArtifactErrorCode } from '../domain/errors';
import { YamlMetadataRepository } from './storage/yaml/YamlMetadataRepository';
import { VaultRepository } from './VaultRepository';
import { ConfigManager } from '../../../core/config/ConfigManager';
import { ArtifactFileSystemAdapter } from './storage/file/ArtifactFileSystemAdapter';
import { SqliteRuntimeIndex } from './storage/sqlite/SqliteRuntimeIndex';
import { Logger } from '../../../core/logger/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
// minimatch 5.x 类型定义问题，使用 require 方式
// eslint-disable-next-line @typescript-eslint/no-require-imports
const minimatch: (path: string, pattern: string, options?: { dot?: boolean }) => boolean = require('minimatch');

@injectable()
export class MetadataRepositoryImpl implements MetadataRepository {
  private yamlRepos: Map<string, YamlMetadataRepository> = new Map(); // vaultName -> YamlMetadataRepository
  private vaultRepository: VaultRepository;
  private configManager: ConfigManager;
  private fileAdapter: ArtifactFileSystemAdapter;
  private index: SqliteRuntimeIndex;
  private logger?: Logger;
  private metadataCache: Map<string, ArtifactMetadata> = new Map();

  constructor(
    @inject(TYPES.VaultRepository) vaultRepository: VaultRepository,
    @inject(TYPES.ConfigManager) configManager: ConfigManager,
    @inject(TYPES.ArtifactFileSystemAdapter) fileAdapter: ArtifactFileSystemAdapter,
    @inject(TYPES.SqliteRuntimeIndex) index: SqliteRuntimeIndex,
    @inject(TYPES.Logger) logger?: Logger
  ) {
    this.vaultRepository = vaultRepository;
    this.configManager = configManager;
    this.fileAdapter = fileAdapter;
    this.index = index;
    this.logger = logger;
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
   * 规范化路径（统一使用 / 作为分隔符）
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * 检查代码路径是否匹配关联路径（使用 gitignore 风格的匹配规则）
   * 
   * Gitignore 匹配规则：
   * 1. 精确匹配：路径完全相同
   * 2. 目录匹配：如果关联路径是目录，匹配该目录下的所有文件
   * 3. Glob 模式匹配：支持 *、**、? 等通配符
   * 
   * @param codePath 当前代码文件路径
   * @param relatedCodePath 关联的代码路径（可能是文件或文件夹，支持 glob 模式）
   * @returns 是否匹配
   */
  private matchesCodePath(codePath: string, relatedCodePath: string): boolean {
    // 处理空字符串
    if (!codePath || !relatedCodePath) {
      return false;
    }

    const normalizedCodePath = this.normalizePath(codePath);
    const normalizedRelatedPath = this.normalizePath(relatedCodePath);

    // 1. 精确匹配
    if (normalizedCodePath === normalizedRelatedPath) {
      return true;
    }

    // 2. 如果关联路径包含通配符，使用 minimatch 进行 glob 匹配
    if (normalizedRelatedPath.includes('*') || normalizedRelatedPath.includes('?') || normalizedRelatedPath.includes('[')) {
      // 直接使用 glob 模式匹配
      if (minimatch(normalizedCodePath, normalizedRelatedPath, { dot: true })) {
        return true;
      }
      // 如果模式不以 ** 或 / 结尾，也尝试匹配目录下的所有文件
      if (!normalizedRelatedPath.endsWith('**') && !normalizedRelatedPath.endsWith('/')) {
        const directoryPattern = normalizedRelatedPath + '/**';
        if (minimatch(normalizedCodePath, directoryPattern, { dot: true })) {
          return true;
        }
      }
      return false;
    }

    // 3. 如果关联路径不包含通配符，使用 gitignore 风格的目录匹配
    // 3.1 移除关联路径末尾的 /（如果有）
    const cleanRelatedPath = normalizedRelatedPath.endsWith('/') 
      ? normalizedRelatedPath.slice(0, -1) 
      : normalizedRelatedPath;
    
    // 3.2 匹配关联路径作为目录下的所有文件
    // 例如：relatedCodePath = "iuap-installer-main/api/yonyou_cloud"
    //      codePath = "iuap-installer-main/api/yonyou_cloud/appmanage/get_app_detail.go"
    //      应该匹配，因为 codePath 在 relatedCodePath 目录下
    const prefix = cleanRelatedPath + '/';
    if (normalizedCodePath.startsWith(prefix)) {
      return true;
    }

    return false;
  }

  /**
   * 根据代码路径查询关联的 Artifact（用于 Development 视图反向关联）
   * 支持父文件夹通配符匹配：如果关联到父文件夹，子文件也会被匹配
   */
  async findByCodePath(codePath: string): Promise<Result<ArtifactMetadata[], ArtifactError>> {
    try {
      if (this.logger) {
        this.logger.info('[MetadataRepository] findByCodePath called', { codePath });
      } else {
        console.log('[MetadataRepository] findByCodePath called', { codePath });
      }
      const matchingMetadata: ArtifactMetadata[] = [];
      
      // 获取所有 vault
      const vaultsResult = await this.vaultRepository.findAll();
      if (!vaultsResult.success) {
        this.logger?.warn('[MetadataRepository] Failed to list vaults', vaultsResult.error);
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Failed to list vaults: ${vaultsResult.error.message}`,
            { codePath }
          ),
        };
      }

      this.logger?.info('[MetadataRepository] Found vaults', { count: vaultsResult.value.length });
      const architoolRoot = this.configManager.getArchitoolRoot();
      this.logger?.info('[MetadataRepository] Architool root', { architoolRoot });

      // 扫描所有 vault 的元数据文件
      for (const vault of vaultsResult.value) {
        const vaultPath = path.join(architoolRoot, vault.name);
        const metadataDir = path.join(vaultPath, 'metadata');
        
        if (!fs.existsSync(metadataDir)) {
          this.logger?.debug('[MetadataRepository] Metadata dir not found', { vault: vault.name, metadataDir });
          continue;
        }

        const files = fs.readdirSync(metadataDir);
        const metadataFiles = files.filter(file => file.endsWith('.metadata.yml'));
        this.logger?.info('[MetadataRepository] Scanning vault', { 
          vault: vault.name, 
          metadataFileCount: metadataFiles.length 
        });

        for (const fileName of metadataFiles) {
          try {
            const metadataId = path.basename(fileName, '.metadata.yml');
            const metadataPath = path.join(metadataDir, fileName);
            const content = fs.readFileSync(metadataPath, 'utf-8');
            const metadata = yaml.load(content) as ArtifactMetadata;
            
            // 检查 relatedCodePaths 是否匹配指定的代码路径（支持通配符匹配）
            if (metadata.relatedCodePaths && metadata.relatedCodePaths.length > 0) {
              this.logger?.debug('[MetadataRepository] Checking metadata', {
                metadataId,
                artifactId: metadata.artifactId,
                relatedCodePathsCount: metadata.relatedCodePaths.length,
                relatedCodePaths: metadata.relatedCodePaths
              });

              const isMatched = metadata.relatedCodePaths.some(relatedCodePath => {
                const matched = this.matchesCodePath(codePath, relatedCodePath);
                // 调试日志：记录匹配过程
                if (this.logger) {
                  const normalizedCodePath = this.normalizePath(codePath);
                  const normalizedRelatedPath = this.normalizePath(relatedCodePath);
                  this.logger.info('[MetadataRepository] Path matching', {
                    codePath,
                    relatedCodePath,
                    normalizedCodePath,
                    normalizedRelatedPath,
                    matched,
                    codePathStartsWith: normalizedCodePath.startsWith(normalizedRelatedPath + '/'),
                  });
                }
                return matched;
              });
              
              if (isMatched) {
                this.logger?.info('[MetadataRepository] Path matched!', {
                  metadataId,
                  artifactId: metadata.artifactId,
                  codePath
                });
              // 更新缓存
              this.metadataCache.set(metadata.id, metadata);
              matchingMetadata.push(metadata);
              }
            }
          } catch (error) {
            this.logger?.warn('[MetadataRepository] Error reading metadata file', { fileName, error });
            // 忽略单个文件的读取错误，继续处理其他文件
            continue;
          }
        }
      }

      this.logger?.info('[MetadataRepository] findByCodePath result', { 
        codePath, 
        matchingMetadataCount: matchingMetadata.length,
        matchingMetadataIds: matchingMetadata.map(m => m.id)
      });

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

  async create(metadata: ArtifactMetadata, options?: CreateMetadataOptions): Promise<Result<ArtifactMetadata, ArtifactError>> {
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

    // 持久化到YAML文件（Infrastructure层职责）
    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const writeResult = await yamlRepo.writeMetadata(metadata);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    // 同步到索引（Infrastructure层职责）
    try {
      const metadataPath = this.fileAdapter.getMetadataPath(vaultName, metadata.id);
      await this.index.syncFromYaml(
        metadata,
        metadataPath,
        options?.title,
        options?.description
      );
    } catch (error: any) {
      this.logger?.warn('Failed to sync metadata to index', error);
      // 索引同步失败不影响元数据持久化，只记录警告
    }

    // 更新缓存
    this.metadataCache.set(metadata.id, metadata);
    return { success: true, value: metadata };
  }

  async update(metadata: ArtifactMetadata, options?: CreateMetadataOptions): Promise<Result<ArtifactMetadata, ArtifactError>> {
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
      // 持久化到YAML文件（Infrastructure层职责）
      const yamlRepo = this.getYamlRepoForVault(foundVaultName);
      const writeResult = await yamlRepo.writeMetadata(metadata);
      if (!writeResult.success) {
        return { success: false, error: writeResult.error };
      }

      // 同步到索引（Infrastructure层职责）
      try {
        const metadataPath = this.fileAdapter.getMetadataPath(foundVaultName, metadata.id);
        await this.index.syncFromYaml(
          metadata,
          metadataPath,
          options?.title,
          options?.description
        );
      } catch (error: any) {
        this.logger?.warn('Failed to sync metadata to index', error);
      }

      this.metadataCache.set(metadata.id, metadata);
      return { success: true, value: metadata };
    }

    // 持久化到YAML文件（Infrastructure层职责）
    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const writeResult = await yamlRepo.writeMetadata(metadata);
    if (!writeResult.success) {
      return { success: false, error: writeResult.error };
    }

    // 同步到索引（Infrastructure层职责）
    try {
      const metadataPath = this.fileAdapter.getMetadataPath(vaultName, metadata.id);
      await this.index.syncFromYaml(
        metadata,
        metadataPath,
        options?.title,
        options?.description
      );
    } catch (error: any) {
      this.logger?.warn('Failed to sync metadata to index', error);
    }

    this.metadataCache.set(metadata.id, metadata);
    return { success: true, value: metadata };
  }

  async delete(metadataId: string, artifactId?: string): Promise<Result<void, ArtifactError>> {
    // 查找 metadata 所在的 vault
    const vaultName = await this.findVaultForMetadata(metadataId);
    if (!vaultName) {
      return {
        success: false,
        error: new ArtifactError(ArtifactErrorCode.NOT_FOUND, `Metadata not found: ${metadataId}`),
      };
    }

    // 从YAML文件删除（Infrastructure层职责）
    const yamlRepo = this.getYamlRepoForVault(vaultName);
    const deleteResult = await yamlRepo.deleteMetadata(metadataId);
    if (!deleteResult.success) {
      return deleteResult;
    }

    // 从索引中删除（Infrastructure层职责）
    if (artifactId) {
      try {
        await this.index.removeFromIndex(artifactId);
      } catch (error: any) {
        this.logger?.warn('Failed to remove metadata from index', error);
        // 索引删除失败不影响元数据删除，只记录警告
      }
    }

    this.metadataCache.delete(metadataId);
    return { success: true, value: undefined };
  }
}



