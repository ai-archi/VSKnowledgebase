import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { VaultRepository } from './VaultRepository';
import { Vault, VaultType } from '../domain/entity/vault';
import { Result, VaultError, VaultErrorCode } from '../domain/errors';
import { ConfigManager } from '../../../core/config/ConfigManager';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

@injectable()
export class VaultRepositoryImpl implements VaultRepository {
  private configManager: ConfigManager;
  private vaultsCache: Map<string, Vault> = new Map();

  constructor(@inject(TYPES.ConfigManager) configManager: ConfigManager) {
    this.configManager = configManager;
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
    
    // 获取配置中的 vault（可能包含额外信息如 remote）
    const configVaultsResult = await this.configManager.getVaults();
    const configVaults = configVaultsResult.success ? configVaultsResult.value : [];

    // 合并：以文件系统为主，配置信息为辅
    const vaultMap = new Map<string, Vault>();
    
    // 首先添加文件系统中发现的 vault
    for (const vault of fileSystemVaults) {
      vaultMap.set(vault.id, vault);
    }
    
    // 然后合并配置中的信息（如 remote、description 等）
    for (const configVault of configVaults) {
      const existingVault = vaultMap.get(configVault.id);
      if (existingVault) {
        // 合并配置信息
        vaultMap.set(configVault.id, { ...existingVault, ...configVault });
      } else {
        // 配置中有但文件系统中没有的 vault（可能是远程 vault）
        vaultMap.set(configVault.id, configVault);
      }
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
   */
  private async scanFileSystemVaults(architoolRoot: string): Promise<Vault[]> {
    const vaults: Vault[] = [];
    
    if (!fs.existsSync(architoolRoot)) {
      return vaults;
    }

    const entries = fs.readdirSync(architoolRoot, { withFileTypes: true });
    const systemDirs = ['cache', 'generated-prisma-client'];
    
    for (const entry of entries) {
      // 忽略系统目录和隐藏文件
      if (systemDirs.includes(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      
      // 如果是目录，检查是否是有效的 vault（包含 artifacts 目录）
      if (entry.isDirectory()) {
        const vaultPath = path.join(architoolRoot, entry.name);
        const artifactsPath = path.join(vaultPath, 'artifacts');
        
        if (fs.existsSync(artifactsPath)) {
          // 这是一个有效的 vault，尝试读取 vault.yaml
          const vaultYamlPath = path.join(vaultPath, 'vault.yaml');
          let vault: Vault;
          
          if (fs.existsSync(vaultYamlPath)) {
            // 读取 vault.yaml 文件
            try {
              const yamlContent = fs.readFileSync(vaultYamlPath, 'utf-8');
              const vaultData = yaml.load(yamlContent) as any;
              
              vault = {
                id: vaultData.id || entry.name,
                name: vaultData.name || entry.name,
                type: this.validateVaultType(vaultData.type) || 'document',
                description: vaultData.description,
                selfContained: vaultData.selfContained !== undefined ? vaultData.selfContained : true,
                readOnly: vaultData.readOnly !== undefined ? vaultData.readOnly : false,
              };
            } catch (error) {
              // 如果解析失败，使用默认值
              vault = {
                id: entry.name,
                name: entry.name,
                type: 'document',
                description: undefined,
                selfContained: true,
                readOnly: false,
              };
            }
          } else {
            // 没有 vault.yaml，使用默认值
            vault = {
              id: entry.name,
              name: entry.name,
              type: 'document',
              description: undefined,
              selfContained: true,
              readOnly: false,
            };
          }
          
          vaults.push(vault);
        }
      }
    }

    return vaults;
  }

  /**
   * 验证 Vault 类型
   */
  private validateVaultType(type: any): VaultType | null {
    if (type === 'document' || type === 'assistant' || type === 'task') {
      return type as VaultType;
    }
    return null;
  }

  async save(vault: Vault): Promise<Result<void, VaultError>> {
    await this.configManager.addVault(vault);
    this.vaultsCache.set(vault.id, vault);
    return { success: true, value: undefined };
  }

  async delete(vaultId: string): Promise<Result<void, VaultError>> {
    await this.configManager.removeVault(vaultId);
    this.vaultsCache.delete(vaultId);
    return { success: true, value: undefined };
  }
}



