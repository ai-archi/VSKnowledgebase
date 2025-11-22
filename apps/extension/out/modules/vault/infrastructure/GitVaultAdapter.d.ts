import { RemoteEndpoint } from '../../../domain/shared/vault/RemoteEndpoint';
import { Result } from '../../../core/types/Result';
export interface VaultError {
    code: string;
    message: string;
}
export interface GitVaultAdapter {
    cloneRepository(remote: RemoteEndpoint, targetPath: string): Promise<Result<void, VaultError>>;
    pullRepository(vaultPath: string): Promise<Result<void, VaultError>>;
    pushRepository(vaultPath: string): Promise<Result<void, VaultError>>;
    getRemoteUrl(vaultPath: string): Promise<Result<string, VaultError>>;
    getCurrentBranch(vaultPath: string): Promise<Result<string, VaultError>>;
    isGitRepository(vaultPath: string): Promise<boolean>;
    checkoutBranch(vaultPath: string, branch: string): Promise<Result<void, VaultError>>;
}
export declare class GitVaultAdapterImpl implements GitVaultAdapter {
    private getGitInstance;
    cloneRepository(remote: RemoteEndpoint, targetPath: string): Promise<Result<void, VaultError>>;
    pullRepository(vaultPath: string): Promise<Result<void, VaultError>>;
    pushRepository(vaultPath: string): Promise<Result<void, VaultError>>;
    getRemoteUrl(vaultPath: string): Promise<Result<string, VaultError>>;
    getCurrentBranch(vaultPath: string): Promise<Result<string, VaultError>>;
    isGitRepository(vaultPath: string): Promise<boolean>;
    checkoutBranch(vaultPath: string, branch: string): Promise<Result<void, VaultError>>;
}
//# sourceMappingURL=GitVaultAdapter.d.ts.map