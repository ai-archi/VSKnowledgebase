"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultRepositoryImpl = void 0;
class VaultRepositoryImpl {
    constructor(configManager) {
        this.vaultsCache = new Map();
        this.configManager = configManager;
    }
    async findById(vaultId) {
        if (this.vaultsCache.has(vaultId)) {
            return { success: true, value: this.vaultsCache.get(vaultId) };
        }
        const vaultsResult = await this.configManager.getVaults();
        if (!vaultsResult.success) {
            return vaultsResult;
        }
        const vault = vaultsResult.value.find((v) => v.id === vaultId);
        if (vault) {
            this.vaultsCache.set(vaultId, vault);
            return { success: true, value: vault };
        }
        return { success: true, value: null };
    }
    async findByName(vaultName) {
        const vaultsResult = await this.configManager.getVaults();
        if (!vaultsResult.success) {
            return vaultsResult;
        }
        const vault = vaultsResult.value.find((v) => v.name === vaultName);
        if (vault) {
            this.vaultsCache.set(vault.id, vault);
            return { success: true, value: vault };
        }
        return { success: true, value: null };
    }
    async findAll() {
        const vaultsResult = await this.configManager.getVaults();
        if (!vaultsResult.success) {
            return vaultsResult;
        }
        vaultsResult.value.forEach((v) => {
            this.vaultsCache.set(v.id, v);
        });
        return { success: true, value: vaultsResult.value };
    }
    async save(vault) {
        await this.configManager.addVault(vault);
        this.vaultsCache.set(vault.id, vault);
        return { success: true, value: undefined };
    }
    async delete(vaultId) {
        await this.configManager.removeVault(vaultId);
        this.vaultsCache.delete(vaultId);
        return { success: true, value: undefined };
    }
}
exports.VaultRepositoryImpl = VaultRepositoryImpl;
//# sourceMappingURL=VaultRepositoryImpl.js.map