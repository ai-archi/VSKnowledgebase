import { Result, VaultError } from '../../../domain/shared/artifact/errors';
import { Vault } from '../../../domain/shared/vault/Vault';
import { RemoteEndpoint } from '../../../domain/shared/vault/RemoteEndpoint';

export interface AddLocalVaultOpts {
  name: string;
  fsPath: string;
  description?: string;
}

export interface AddVaultFromGitOpts {
  name: string;
  remote: RemoteEndpoint;
  description?: string;
}

export interface RemoveVaultOpts {
  deleteFiles?: boolean; // 是否删除本地文件
}

export interface VaultApplicationService {
  addLocalVault(opts: AddLocalVaultOpts): Promise<Result<Vault, VaultError>>;
  addVaultFromGit(opts: AddVaultFromGitOpts): Promise<Result<Vault, VaultError>>;
  forkGitVault(sourceVaultId: string, newVaultName: string): Promise<Result<Vault, VaultError>>;
  syncVault(vaultId: string): Promise<Result<void, VaultError>>;
  removeVault(vaultId: string, opts?: RemoveVaultOpts): Promise<Result<void, VaultError>>;
  listVaults(): Promise<Result<Vault[], VaultError>>;
  getVault(vaultId: string): Promise<Result<Vault, VaultError>>;
}


