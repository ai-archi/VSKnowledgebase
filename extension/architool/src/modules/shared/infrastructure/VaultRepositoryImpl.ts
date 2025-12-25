import { injectable, inject, optional } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { VaultRepository } from './VaultRepository';
import { Vault, VaultType } from '../domain/entity/vault';
import { Result, VaultError, VaultErrorCode } from '../domain/errors';
import { ConfigManager } from '../../../core/config/ConfigManager';
import { SecretStorageService } from '../../../core/secret/SecretStorageService';
import { RemoteEndpoint } from '../domain/value_object/RemoteEndpoint';
import { Logger } from '../../../core/logger/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

@injectable()
export class VaultRepositoryImpl implements VaultRepository {
  private configManager: ConfigManager;
  private secretStorage?: SecretStorageService;
  private logger?: Logger;
  private vaultsCache: Map<string, Vault> = new Map();

  constructor(
    @inject(TYPES.ConfigManager) configManager: ConfigManager,
    @inject(TYPES.SecretStorageService) @optional() secretStorage?: SecretStorageService,
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    this.configManager = configManager;
    this.secretStorage = secretStorage;
    this.logger = logger;
  }

  async findById(vaultId: string): Promise<Result<Vault | null, VaultError>> {
    if (this.vaultsCache.has(vaultId)) {
      return { success: true, value: this.vaultsCache.get(vaultId)! };
    }

    // 从所有 vault 中查找（包括文件系统扫描的）
    const allVaultsResult = await this.findAll();
    if (!allVaultsResult.success) {
      return { success: true, value: null };
    }
    
    const vault = allVaultsResult.value.find((v: Vault) => v.id === vaultId);
    return { success: true, value: vault || null };
  }

  async findByName(vaultName: string): Promise<Result<Vault | null, VaultError>> {
    // 从所有 vault 中查找（包括文件系统扫描的）
    const allVaultsResult = await this.findAll();
    if (!allVaultsResult.success) {
      return { success: true, value: null };
    }
    
    const vault = allVaultsResult.value.find((v: Vault) => v.name === vaultName);
    return { success: true, value: vault || null };
  }

  async findAll(): Promise<Result<Vault[], VaultError>> {
    // 扫描文件系统中的 vault 目录（自动发现）
    const architoolRoot = this.configManager.getArchitoolRoot();
    const fileSystemVaults = await this.scanFileSystemVaults(architoolRoot);
    
    // 从 SecretStorage 恢复认证信息
    const vaultMap = new Map<string, Vault>();
    
    for (const vault of fileSystemVaults) {
      // 从 SecretStorage 恢复认证信息
      if (this.secretStorage && vault.remote) {
        const credentials = await this.secretStorage.getVaultCredentials(vault.id);
        if (credentials) {
          vault.remote = {
            ...vault.remote,
            ...credentials,
          };
        }
      }
      vaultMap.set(vault.id, vault);
    }

    const allVaults = Array.from(vaultMap.values());
    
    // 更新缓存
    allVaults.forEach((v: Vault) => {
      this.vaultsCache.set(v.id, v);
    });

    return { success: true, value: allVaults };
  }

  /**
   * 扫描文件系统中的 vault 目录
   * 零配置识别：任何在 archidocs 下的目录都可以被识别为 vault
   */
  private async scanFileSystemVaults(architoolRoot: string): Promise<Vault[]> {
    const vaults: Vault[] = [];
    
    if (!fs.existsSync(architoolRoot)) {
      return vaults;
    }

    const entries = fs.readdirSync(architoolRoot, { withFileTypes: true });
    const systemDirs = ['generated-prisma-client'];
    
    for (const entry of entries) {
      // 忽略系统目录和隐藏文件
      if (systemDirs.includes(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      
      // 如果是目录，识别为 vault（不再要求 artifacts 目录）
      if (entry.isDirectory()) {
        const vaultPath = path.join(architoolRoot, entry.name);
        const vault = await this.loadVaultFromPath(vaultPath, entry.name);
        if (vault) {
          vaults.push(vault);
        }
      }
    }

    return vaults;
  }

  /**
   * 从路径加载 vault 信息
   * 优先从 .metadata/vault.yaml 读取，如果不存在则根据目录结构推断
   */
  private async loadVaultFromPath(vaultPath: string, vaultName: string): Promise<Vault | null> {
    // 尝试从 .metadata/vault.yaml 读取配置
    const metadataVaultYamlPath = path.join(vaultPath, '.metadata', 'vault.yaml');
    
    let vault: Vault | null = null;
    
    // 读取 .metadata/vault.yaml
    if (fs.existsSync(metadataVaultYamlPath)) {
      try {
        const yamlContent = fs.readFileSync(metadataVaultYamlPath, 'utf-8');
        const vaultData = yaml.load(yamlContent) as any;
        
        vault = {
          id: vaultData.id || vaultName,
          name: vaultData.name || vaultName,
          type: this.validateVaultType(vaultData.type) || this.inferVaultType(vaultPath),
          description: vaultData.description,
          remote: vaultData.remote,
          readonly: vaultData.readonly !== undefined ? vaultData.readonly : (vaultData.remote ? true : false), // 如果有 remote 且未明确设置，默认为 true
          createdAt: vaultData.createdAt,
          updatedAt: vaultData.updatedAt,
        };
      } catch (error) {
        // 解析失败，使用推断值
      }
    }
    
    // 如果没有配置文件，根据目录结构推断类型
    if (!vault) {
      const inferredType = this.inferVaultType(vaultPath);
      vault = {
        id: vaultName,
        name: vaultName,
        type: inferredType,
        description: undefined,
      };
    }
    
    return vault;
  }

  /**
   * 根据目录结构推断 vault 类型
   */
  private inferVaultType(vaultPath: string): VaultType {
    // 检查约定目录
    const archiAiEnhancementsPath = path.join(vaultPath, 'archi-ai-enhancements');
    const archiTemplatesPath = path.join(vaultPath, 'archi-templates');
    const archiTasksPath = path.join(vaultPath, 'archi-tasks');
    
    if (fs.existsSync(archiAiEnhancementsPath)) {
      return 'ai-enhancement';
    }
    
    if (fs.existsSync(archiTemplatesPath)) {
      return 'template';
    }
    
    if (fs.existsSync(archiTasksPath)) {
      return 'task';
    }
    
    // 默认为 document 类型
    return 'document';
  }

  /**
   * 验证 Vault 类型
   */
  private validateVaultType(type: any): VaultType | null {
    if (type === 'document' || type === 'ai-enhancement' || type === 'template' || type === 'task') {
      return type as VaultType;
    }
    return null;
  }

  async save(vault: Vault): Promise<Result<void, VaultError>> {
    try {
      // 保存认证信息到 SecretStorage（如果存在）
      if (this.secretStorage && vault.remote) {
        const credentials: {
          username?: string;
          password?: string;
          accessToken?: string;
        } = {};
        
        if (vault.remote.accessToken) {
          credentials.accessToken = vault.remote.accessToken;
        } else if (vault.remote.username && vault.remote.password) {
          credentials.username = vault.remote.username;
          credentials.password = vault.remote.password;
        }
        
        // 只有在有认证信息时才保存
        if (credentials.accessToken || (credentials.username && credentials.password)) {
          await this.secretStorage.storeVaultCredentials(vault.id, credentials);
        }
      }
      
      // 保存 vault.yaml 到 .metadata/vault.yaml
      // 如果 vault.yaml 已存在，则不覆盖它（保留原有内容）
      const architoolRoot = this.configManager.getArchitoolRoot();
      const vaultPath = path.join(architoolRoot, vault.name);
      const metadataDir = path.join(vaultPath, '.metadata');
      const vaultYamlPath = path.join(metadataDir, 'vault.yaml');
      
      // 如果 vault.yaml 已存在，跳过写入，保留原有内容
      if (fs.existsSync(vaultYamlPath)) {
        // vault.yaml 已存在，不覆盖它
        this.vaultsCache.set(vault.id, vault);
        return { success: true, value: undefined };
      }
      
      // 确保 .metadata 目录存在
      if (!fs.existsSync(metadataDir)) {
        fs.mkdirSync(metadataDir, { recursive: true });
      }
      
      // 准备要保存的数据（不包含敏感信息）
      const vaultData: any = {
        name: vault.name,
        type: vault.type,
      };
      
      if (vault.description) {
        vaultData.description = vault.description;
      }
      
      if (vault.remote) {
        vaultData.remote = {
          url: vault.remote.url,
          branch: vault.remote.branch,
          sync: vault.remote.sync,
        };
      }
      
      // 保存 readonly 属性（如果明确设置）
      if (vault.readonly !== undefined) {
        vaultData.readonly = vault.readonly;
      }
      
      if (vault.createdAt) {
        vaultData.createdAt = vault.createdAt;
      }
      
      if (vault.updatedAt) {
        vaultData.updatedAt = vault.updatedAt;
      } else {
        vaultData.updatedAt = new Date().toISOString();
      }
      
      // 写入 YAML 文件
      const yamlContent = yaml.dump(vaultData, { 
        indent: 2,
        lineWidth: -1,
        noRefs: true,
      });
      fs.writeFileSync(vaultYamlPath, yamlContent, 'utf-8');
    
      this.vaultsCache.set(vault.id, vault);
      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new VaultError(
          VaultErrorCode.OPERATION_FAILED,
          `Failed to save vault: ${error.message}`,
          { vaultId: vault.id },
          error
        ),
      };
    }
  }

  async delete(vaultId: string): Promise<Result<void, VaultError>> {
    this.logger?.info(`[VaultRepository] delete called with vaultId: ${vaultId}`);
    
    // 删除 SecretStorage 中的认证信息
    if (this.secretStorage) {
      await this.secretStorage.deleteVaultCredentials(vaultId);
      this.logger?.info(`[VaultRepository] Deleted vault credentials from SecretStorage`);
    }
    
    this.vaultsCache.delete(vaultId);
    this.logger?.info(`[VaultRepository] Deleted vault from cache`);
    
    return { success: true, value: undefined };
  }
}



