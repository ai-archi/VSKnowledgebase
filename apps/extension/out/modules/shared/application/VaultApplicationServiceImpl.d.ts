import { VaultApplicationService, AddLocalVaultOpts, AddVaultFromGitOpts } from './VaultApplicationService';
import { Vault } from '../../../domain/shared/vault/Vault';
import { Result, VaultError } from '../../../domain/shared/artifact/errors';
import { VaultRepository } from '../infrastructure/VaultRepository';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { GitVaultAdapter } from '../../vault/infrastructure/GitVaultAdapter';
import { Logger } from '../../../core/logger/Logger';
export declare class VaultApplicationServiceImpl implements VaultApplicationService {
    private vaultRepo;
    private fileAdapter;
    private gitAdapter;
    private logger;
    constructor(vaultRepo: VaultRepository, fileAdapter: VaultFileSystemAdapter, gitAdapter: GitVaultAdapter, logger: Logger);
    addLocalVault(opts: AddLocalVaultOpts): Promise<Result<Vault, VaultError>>;
    addVaultFromGit(opts: AddVaultFromGitOpts): Promise<Result<Vault, VaultError>>;
    forkGitVault(sourceVaultId: string, newVaultName: string): Promise<Result<Vault, VaultError>>;
    private copyDirectory;
    syncVault(vaultId: string): Promise<Result<void, VaultError>>;
    removeVault(vaultId: string): Promise<Result<void, VaultError>>;
    listVaults(): Promise<Result<Vault[], VaultError>>;
    getVault(vaultId: string): Promise<Result<Vault, VaultError>>;
}
//# sourceMappingURL=VaultApplicationServiceImpl.d.ts.map