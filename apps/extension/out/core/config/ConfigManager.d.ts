import { Vault } from '../../domain/shared/vault/Vault';
import { Result, VaultError } from '../../domain/shared/artifact/errors';
import { Logger } from '../logger/Logger';
export declare class ConfigManager {
    readonly architoolRoot: string;
    private configPath;
    private logger?;
    constructor(architoolRoot: string, logger?: Logger);
    getArchitoolRoot(): string;
    saveGlobalConfig(config: any): Promise<void>;
    getGlobalConfig(): Promise<any>;
    getVaults(): Promise<Result<Vault[], VaultError>>;
    getVault(vaultId: string): Promise<Result<Vault, VaultError>>;
    addVault(vault: Vault): Promise<void>;
    removeVault(vaultId: string): Promise<void>;
    private getDefaultConfig;
}
//# sourceMappingURL=ConfigManager.d.ts.map