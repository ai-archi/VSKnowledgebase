import { Vault } from '../../../domain/shared/vault/Vault';
export declare class VaultFileSystemAdapter {
    private architoolRoot;
    constructor(architoolRoot: string);
    getVaultsRoot(): string;
    getVaultPath(vaultName: string): string;
    createVaultDirectory(vault: Vault): Promise<void>;
    vaultExists(vaultName: string): Promise<boolean>;
}
//# sourceMappingURL=VaultFileSystemAdapter.d.ts.map