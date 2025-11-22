import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { VaultApplicationService, AddLocalVaultOpts, AddVaultFromGitOpts } from './VaultApplicationService';
import { Vault } from '../../../domain/shared/vault/Vault';
import { Result, VaultError, VaultErrorCode } from '../../../domain/shared/artifact/errors';
import { VaultRepository } from '../infrastructure/VaultRepository';
import { VaultFileSystemAdapter } from '../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { GitVaultAdapter } from '../../vault/infrastructure/GitVaultAdapter';
import { ArchitoolDirectoryManager } from '../../../core/storage/ArchitoolDirectoryManager';
import { Logger } from '../../../core/logger/Logger';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class VaultApplicationServiceImpl implements VaultApplicationService {
  constructor(
    @inject(TYPES.VaultRepository) private vaultRepo: VaultRepository,
    @inject(TYPES.VaultFileSystemAdapter) private fileAdapter: VaultFileSystemAdapter,
    @inject(TYPES.GitVaultAdapter) private gitAdapter: GitVaultAdapter,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async addLocalVault(opts: AddLocalVaultOpts): Promise<Result<Vault, VaultError>> {
    const vault: Vault = {
      id: opts.name,
      name: opts.name,
      description: opts.description,
      selfContained: true,
      readOnly: false,
    };

    await this.fileAdapter.createVaultDirectory(vault);
    const saveResult = await this.vaultRepo.save(vault);
    if (!saveResult.success) {
      return saveResult;
    }

    return { success: true, value: vault };
  }

  async addVaultFromGit(opts: AddVaultFromGitOpts): Promise<Result<Vault, VaultError>> {
    const vault: Vault = {
      id: opts.name,
      name: opts.name,
      description: opts.description,
      remote: opts.remote,
      selfContained: false,
      readOnly: true,
    };

    // Determine target path for clone
    const targetPath = path.join(this.fileAdapter.getVaultsRoot(), opts.name);
    const cloneResult = await this.gitAdapter.cloneRepository(opts.remote, targetPath);
    if (!cloneResult.success) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.OPERATION_FAILED, cloneResult.error.message),
      };
    }

    await this.fileAdapter.createVaultDirectory(vault);
    const saveResult = await this.vaultRepo.save(vault);
    if (!saveResult.success) {
      return saveResult;
    }

    return { success: true, value: vault };
  }

  async forkGitVault(sourceVaultId: string, newVaultName: string): Promise<Result<Vault, VaultError>> {
    // Get source vault
    const sourceVaultResult = await this.vaultRepo.findById(sourceVaultId);
    if (!sourceVaultResult.success || !sourceVaultResult.value) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.NOT_FOUND, `Source vault not found: ${sourceVaultId}`),
      };
    }

    const sourceVault = sourceVaultResult.value;
    if (!sourceVault.remote) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.OPERATION_FAILED, 'Source vault is not a Git vault'),
      };
    }

    // Create new local vault by copying source vault
    const sourcePath = path.join(this.fileAdapter.getVaultsRoot(), sourceVault.name);
    const targetPath = path.join(this.fileAdapter.getVaultsRoot(), newVaultName);

    try {
      // Copy directory recursively
      await this.copyDirectory(sourcePath, targetPath);

      // Remove .git directory to make it a local vault
      const gitDir = path.join(targetPath, '.git');
      if (fs.existsSync(gitDir)) {
        fs.rmSync(gitDir, { recursive: true, force: true });
      }

      // Create new vault object (local, writable)
      const newVault: Vault = {
        id: newVaultName,
        name: newVaultName,
        description: `Forked from ${sourceVault.name}`,
        selfContained: true,
        readOnly: false,
      };

      // Save new vault
      const saveResult = await this.vaultRepo.save(newVault);
      if (!saveResult.success) {
        // Cleanup on failure
        if (fs.existsSync(targetPath)) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        }
        return saveResult;
      }

      this.logger.info(`Vault forked: ${sourceVault.name} -> ${newVaultName}`);
      return { success: true, value: newVault };
    } catch (error: any) {
      // Cleanup on failure
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      }
      return {
        success: false,
        error: new VaultError(VaultErrorCode.OPERATION_FAILED, `Failed to fork vault: ${error.message}`),
      };
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    // Create destination directory
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        // Skip .git directory when forking
        if (entry.name === '.git') {
          continue;
        }
        await this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  async syncVault(vaultId: string): Promise<Result<void, VaultError>> {
    const vaultResult = await this.vaultRepo.findById(vaultId);
    if (!vaultResult.success || !vaultResult.value) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
      };
    }

    const vault = vaultResult.value;
    if (vault.remote) {
      const vaultPath = path.join(this.fileAdapter.getVaultsRoot(), vault.name);
      const pullResult = await this.gitAdapter.pullRepository(vaultPath);
      if (!pullResult.success) {
        return {
          success: false,
          error: new VaultError(VaultErrorCode.OPERATION_FAILED, pullResult.error.message),
        };
      }
    }

    return { success: true, value: undefined };
  }

  async removeVault(vaultId: string): Promise<Result<void, VaultError>> {
    return this.vaultRepo.delete(vaultId);
  }

  async listVaults(): Promise<Result<Vault[], VaultError>> {
    return this.vaultRepo.findAll();
  }

  async getVault(vaultId: string): Promise<Result<Vault, VaultError>> {
    const result = await this.vaultRepo.findById(vaultId);
    if (!result.success || !result.value) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
      };
    }
    return { success: true, value: result.value };
  }
}


