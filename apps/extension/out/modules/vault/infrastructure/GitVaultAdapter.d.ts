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
}
export declare class GitVaultAdapterImpl implements GitVaultAdapter {
    cloneRepository(remote: RemoteEndpoint, targetPath: string): Promise<Result<void, VaultError>>;
    pullRepository(vaultPath: string): Promise<Result<void, VaultError>>;
    pushRepository(vaultPath: string): Promise<Result<void, VaultError>>;
    getRemoteUrl(vaultPath: string): Promise<Result<string, VaultError>>;
    getCurrentBranch(vaultPath: string): Promise<Result<string, VaultError>>;
}
//# sourceMappingURL=GitVaultAdapter.d.ts.map