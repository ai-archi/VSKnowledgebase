import { Result, VaultError } from '../domain/errors';
import { Vault, VaultType } from '../domain/entity/vault';
import { RemoteEndpoint } from '../domain/value_object/RemoteEndpoint';

export interface AddLocalVaultOpts {
  name: string;
  fsPath: string;
  description?: string;
  type?: VaultType; // Vault 类型，默认为 'document'
}

export interface AddVaultFromGitOpts {
  name: string;
  remote: RemoteEndpoint;
  description?: string;
  type?: VaultType; // Vault 类型，默认为 'document'
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


