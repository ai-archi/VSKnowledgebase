import { Vault } from '../domain/vault';
import { Result, VaultError } from '../domain/errors';

export interface VaultRepository {
  findById(vaultId: string): Promise<Result<Vault | null, VaultError>>;
  findByName(vaultName: string): Promise<Result<Vault | null, VaultError>>;
  findAll(): Promise<Result<Vault[], VaultError>>;
  save(vault: Vault): Promise<Result<void, VaultError>>;
  delete(vaultId: string): Promise<Result<void, VaultError>>;
}


