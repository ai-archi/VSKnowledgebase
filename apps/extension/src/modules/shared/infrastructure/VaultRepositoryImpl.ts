import { VaultRepository } from './VaultRepository';
import { Vault } from '../../../domain/shared/vault/Vault';
import { Result, VaultError, VaultErrorCode } from '../../../domain/shared/artifact/errors';
import { ConfigManager } from '../../../core/config/ConfigManager';

export class VaultRepositoryImpl implements VaultRepository {
  private configManager: ConfigManager;
  private vaultsCache: Map<string, Vault> = new Map();

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async findById(vaultId: string): Promise<Result<Vault | null, VaultError>> {
    if (this.vaultsCache.has(vaultId)) {
      return { success: true, value: this.vaultsCache.get(vaultId)! };
    }

    const vaultsResult = await this.configManager.getVaults();
    if (!vaultsResult.success) {
      return vaultsResult;
    }
    const vault = vaultsResult.value.find((v: Vault) => v.id === vaultId);

    if (vault) {
      this.vaultsCache.set(vaultId, vault);
      return { success: true, value: vault };
    }

    return { success: true, value: null };
  }

  async findByName(vaultName: string): Promise<Result<Vault | null, VaultError>> {
    const vaultsResult = await this.configManager.getVaults();
    if (!vaultsResult.success) {
      return vaultsResult;
    }
    const vault = vaultsResult.value.find((v: Vault) => v.name === vaultName);

    if (vault) {
      this.vaultsCache.set(vault.id, vault);
      return { success: true, value: vault };
    }

    return { success: true, value: null };
  }

  async findAll(): Promise<Result<Vault[], VaultError>> {
    const vaultsResult = await this.configManager.getVaults();
    if (!vaultsResult.success) {
      return vaultsResult;
    }

    vaultsResult.value.forEach((v: Vault) => {
      this.vaultsCache.set(v.id, v);
    });

    return { success: true, value: vaultsResult.value };
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


