import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Vault } from '../../domain/shared/vault/Vault';
import { Result, VaultError, VaultErrorCode } from '../../domain/shared/artifact/errors';
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
    const vault = vaultsResult.value.find(v => v.id === vaultId);
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
    const config = await this.getGlobalConfig();
    if (config.workspace?.vaults) {
      config.workspace.vaults = config.workspace.vaults.filter((v: any) => (v.name || v.fsPath) !== vaultId);
      await this.saveGlobalConfig(config);
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


