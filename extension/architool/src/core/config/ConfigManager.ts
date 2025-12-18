import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Vault } from '../../modules/shared/domain/entity/vault';
import { Result, VaultError, VaultErrorCode } from '../../modules/shared/domain/errors';
import { Logger } from '../logger/Logger';

export class ConfigManager {
  public readonly architoolRoot: string;
  private configPath: string;
  private logger?: Logger;

  constructor(architoolRoot: string, logger?: Logger) {
    this.architoolRoot = architoolRoot;
    this.configPath = path.join(architoolRoot, 'architool.yml');
    this.logger = logger;
  }

  getArchitoolRoot(): string {
    return this.architoolRoot;
  }

  async saveGlobalConfig(config: any): Promise<void> {
    if (!fs.existsSync(this.architoolRoot)) {
      fs.mkdirSync(this.architoolRoot, { recursive: true });
    }
    fs.writeFileSync(this.configPath, yaml.dump(config), 'utf-8');
  }

  async getGlobalConfig(): Promise<any> {
    if (!fs.existsSync(this.configPath)) {
      return this.getDefaultConfig();
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      return yaml.load(content);
    } catch (error: any) {
      this.logger?.error('Failed to load global config:', error);
      return this.getDefaultConfig();
    }
  }

  async getVaults(): Promise<Result<Vault[], VaultError>> {
    const config = await this.getGlobalConfig();
    const vaults = config.workspace?.vaults || [];

    return {
      success: true,
      value: vaults.map((v: any) => ({
        id: v.name || v.fsPath,
        name: v.name || v.fsPath,
        description: v.description,
        remote: v.remote,
        selfContained: v.selfContained ?? true,
        readOnly: !!v.remote,
      }))
    };
  }

  async getVault(vaultId: string): Promise<Result<Vault, VaultError>> {
    const vaultsResult = await this.getVaults();
    if (!vaultsResult.success) {
      return vaultsResult;
    }
    const vault = vaultsResult.value.find((v: Vault) => v.id === vaultId);
    if (!vault) {
      return { success: false, error: new VaultError(VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`) };
    }
    return { success: true, value: vault };
  }

  async addVault(vault: Vault): Promise<void> {
    const config = await this.getGlobalConfig();
    if (!config.workspace) {
      config.workspace = {};
    }
    if (!config.workspace.vaults) {
      config.workspace.vaults = [];
    }
    config.workspace.vaults.push({
      name: vault.name,
      fsPath: path.join(this.architoolRoot, vault.name),
      description: vault.description,
      remote: vault.remote,
    });
    await this.saveGlobalConfig(config);
  }

  async removeVault(vaultId: string): Promise<void> {
    this.logger?.info(`[ConfigManager] removeVault called with vaultId: ${vaultId}`);
    const config = await this.getGlobalConfig();
    const beforeCount = config.workspace?.vaults?.length || 0;
    this.logger?.info(`[ConfigManager] Before removal: ${beforeCount} vaults in config`);
    
    if (!config.workspace) {
      config.workspace = {};
    }
    if (!config.workspace.vaults) {
      config.workspace.vaults = [];
    }
    
    // 记录所有 vault 信息用于调试
    config.workspace.vaults.forEach((v: any, index: number) => {
      this.logger?.info(`[ConfigManager] Vault ${index}: name=${v.name}, fsPath=${v.fsPath}`);
    });
    
    let removed = false;
    config.workspace.vaults = config.workspace.vaults.filter((v: any) => {
      // 优先比较 name
      if (v.name === vaultId) {
        this.logger?.info(`[ConfigManager] Matched vault by name: ${v.name}`);
        removed = true;
        return false; // 匹配，需要删除
      }
      // 比较 fsPath（可能是完整路径）
      if (v.fsPath === vaultId) {
        this.logger?.info(`[ConfigManager] Matched vault by fsPath: ${v.fsPath}`);
        removed = true;
        return false; // 匹配，需要删除
      }
      // 从 fsPath 中提取目录名来比较
      if (v.fsPath) {
        const fsPathDirName = path.basename(v.fsPath);
        if (fsPathDirName === vaultId) {
          this.logger?.info(`[ConfigManager] Matched vault by fsPath basename: ${fsPathDirName}`);
          removed = true;
          return false; // 匹配，需要删除
        }
      }
      // 都不匹配，保留
      return true;
    });
    
    const afterCount = config.workspace.vaults.length;
    this.logger?.info(`[ConfigManager] After removal: ${afterCount} vaults in config (removed ${beforeCount - afterCount})`);
    
    if (removed || beforeCount !== afterCount) {
      await this.saveGlobalConfig(config);
      this.logger?.info(`[ConfigManager] Config saved successfully`);
    } else {
      this.logger?.warn(`[ConfigManager] No matching vault found in config for vaultId: ${vaultId}. Vault may only exist in file system.`);
    }
  }

  private getDefaultConfig(): any {
    return {
      workspace: {
        vaults: [],
      },
    };
  }
}


