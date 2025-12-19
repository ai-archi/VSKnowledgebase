import { injectable, inject } from 'inversify';
import { TYPES } from '../../../infrastructure/di/types';
import { VaultApplicationService, AddLocalVaultOpts, AddVaultFromGitOpts, UpdateVaultOpts } from './VaultApplicationService';
import { Vault } from '../domain/entity/vault';
import { Result, VaultError, VaultErrorCode } from '../domain/errors';
import { RemoteEndpoint } from '../domain/value_object/RemoteEndpoint';
import { VaultRepository } from '../infrastructure/VaultRepository';
import { VaultFileSystemAdapter } from '../infrastructure/storage/file/VaultFileSystemAdapter';
import { GitVaultAdapter } from '../infrastructure/storage/git/GitVaultAdapter';
import { ConfigManager } from '../../../core/config/ConfigManager';
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
    @inject(TYPES.ConfigManager) private configManager: ConfigManager,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async addLocalVault(opts: AddLocalVaultOpts): Promise<Result<Vault, VaultError>> {
    const vault: Vault = {
      id: opts.name,
      name: opts.name,
      type: opts.type || 'document',
      description: opts.description,
      readonly: false, // 本地创建的 vault 默认允许修改
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      type: opts.type || 'document',
      description: opts.description,
      remote: opts.remote,
      readonly: true, // 从 git clone 的 vault 默认不允许修改
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
        type: sourceVault.type || 'document',
        description: `Forked from ${sourceVault.name}`,
        readonly: false, // Fork 的 vault 是本地创建的，允许修改
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
      
      // 更新 remote URL（如果认证信息已更新）
      const updateRemoteResult = await this.updateRemoteUrl(vaultPath, vault.remote);
      if (!updateRemoteResult.success) {
        this.logger.warn(`Failed to update remote URL: ${updateRemoteResult.error.message}`);
      }
      
      // 传递 remote 信息以便正确设置 upstream
      const pullResult = await this.gitAdapter.pullRepository(vaultPath, vault.remote);
      if (!pullResult.success) {
        return {
          success: false,
          error: new VaultError(VaultErrorCode.OPERATION_FAILED, pullResult.error.message),
        };
      }
    }

    return { success: true, value: undefined };
  }

  /**
   * 更新 Git 仓库的 remote URL（包含认证信息）
   */
  private async updateRemoteUrl(vaultPath: string, remote: RemoteEndpoint): Promise<Result<void, VaultError>> {
    const result = await this.gitAdapter.updateRemoteUrl(vaultPath, remote);
    if (!result.success) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.OPERATION_FAILED, result.error.message),
      };
    }
    return { success: true, value: undefined };
  }

  async removeVault(vaultId: string, opts?: { deleteFiles?: boolean }): Promise<Result<void, VaultError>> {
    this.logger.info(`[VaultApplicationService] removeVault called with vaultId: ${vaultId}, deleteFiles: ${opts?.deleteFiles}`);
    
    // 获取 Vault 信息（用于删除文件）
    const vaultResult = await this.vaultRepo.findById(vaultId);
    if (!vaultResult.success || !vaultResult.value) {
      this.logger.error(`[VaultApplicationService] Vault not found: ${vaultId}`);
      return {
        success: false,
        error: new VaultError(VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
      };
    }

    const vault = vaultResult.value;
    this.logger.info(`[VaultApplicationService] Found vault: id=${vault.id}, name=${vault.name}`);

    // 检查 vault 是否在配置中
    // 需要同时匹配 id 和 name，因为 config 中的 name 可能是目录名，而 vault.yaml 中的 name 可能是显示名称
    const configVaultsResult = await this.configManager.getVaults();
    const configVaults = configVaultsResult.success ? configVaultsResult.value : [];
    const vaultInConfig = configVaults.some((v: Vault) => {
      // 匹配 id
      if (v.id === vaultId || v.id === vault.id) {
        return true;
      }
      // 匹配 name（可能是目录名或显示名称）
      if (v.name === vaultId || v.name === vault.name || v.name === vault.id) {
        return true;
      }
      // 匹配 vault 的 id 和 name
      if (v.id === vault.name || v.name === vault.id) {
        return true;
      }
      return false;
    });
    
    // 如果指定了 deleteFiles，使用指定值
    // 否则，如果 vault 在配置中，默认不删除文件（需要用户明确指定）
    // 如果 vault 不在配置中，自动删除文件
    const shouldDeleteFiles = opts?.deleteFiles !== undefined 
      ? opts.deleteFiles 
      : !vaultInConfig; // 如果不在配置中，自动删除文件
    
    if (!vaultInConfig) {
      this.logger.info(`[VaultApplicationService] Vault ${vaultId} only exists in file system. Will automatically delete files.`);
    } else {
      this.logger.info(`[VaultApplicationService] Vault ${vaultId} found in config. deleteFiles=${shouldDeleteFiles}`);
    }

    // 如果指定删除文件（或自动删除），先删除文件目录
    if (shouldDeleteFiles) {
      const vaultPath = this.fileAdapter.getVaultPath(vault.id);
      this.logger.info(`[VaultApplicationService] Attempting to delete vault directory: ${vaultPath}`);
      if (fs.existsSync(vaultPath)) {
        try {
          fs.rmSync(vaultPath, { recursive: true, force: true });
          this.logger.info(`[VaultApplicationService] Vault directory deleted: ${vaultPath}`);
        } catch (error: any) {
          this.logger.error(`[VaultApplicationService] Failed to delete vault directory: ${vaultPath}`, error);
          return {
            success: false,
            error: new VaultError(
              VaultErrorCode.OPERATION_FAILED,
              `Failed to delete vault directory: ${error.message}`,
              { vaultId, vaultPath },
              error
            ),
          };
        }
      } else {
        this.logger.warn(`[VaultApplicationService] Vault directory does not exist: ${vaultPath}`);
      }
    }

    // 从配置中删除 Vault（如果存在）
    this.logger.info(`[VaultApplicationService] Calling vaultRepo.delete with vaultId: ${vaultId}`);
    const deleteResult = await this.vaultRepo.delete(vaultId);
    if (deleteResult.success) {
      this.logger.info(`[VaultApplicationService] Vault deleted successfully: ${vaultId}`);
    } else {
      this.logger.error(`[VaultApplicationService] Failed to delete vault: ${deleteResult.error.message}`);
    }
    return deleteResult;
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

  async updateVault(vaultId: string, opts: UpdateVaultOpts): Promise<Result<Vault, VaultError>> {
    const vaultResult = await this.vaultRepo.findById(vaultId);
    if (!vaultResult.success || !vaultResult.value) {
      return {
        success: false,
        error: new VaultError(VaultErrorCode.NOT_FOUND, `Vault not found: ${vaultId}`),
      };
    }

    const vault = vaultResult.value;
    const updatedVault: Vault = {
      ...vault,
      ...opts,
      updatedAt: new Date().toISOString(),
    };

    const saveResult = await this.vaultRepo.save(updatedVault);
    if (!saveResult.success) {
      return saveResult;
    }

    return { success: true, value: updatedVault };
  }
}


