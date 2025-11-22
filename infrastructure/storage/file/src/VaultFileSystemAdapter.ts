import * as fs from 'fs';
import * as path from 'path';
import { Vault } from '@architool/domain-shared-vault';
import { Result, VaultError, VaultErrorCode } from '@architool/domain-shared-artifact';

/**
 * Vault 文件系统适配器
 * 提供 Vault 的文件系统操作
 */
export class VaultFileSystemAdapter {
  private architoolRoot: string;

  constructor(architoolRoot: string) {
    this.architoolRoot = architoolRoot;
  }

  /**
   * 初始化 Vault 目录结构
   */
  async initializeVault(vaultName: string): Promise<Result<void, VaultError>> {
    try {
      const vaultPath = path.join(this.architoolRoot, vaultName);

      // 创建 Vault 目录
      if (!fs.existsSync(vaultPath)) {
        fs.mkdirSync(vaultPath, { recursive: true });
      }

      // 创建子目录
      const subdirs = [
        'artifacts',
        'metadata',
        'links',
        'templates',
        'tasks',
        'viewpoints',
        'changes',
      ];

      for (const subdir of subdirs) {
        const subdirPath = path.join(vaultPath, subdir);
        if (!fs.existsSync(subdirPath)) {
          fs.mkdirSync(subdirPath, { recursive: true });
        }
      }

      // 创建 Vault 配置文件
      const configPath = path.join(vaultPath, 'architool.yml');
      if (!fs.existsSync(configPath)) {
        // eslint-disable-next-line global-require, @typescript-eslint/no-require-imports
        const yaml = require('js-yaml');
        const config = {
          version: 5,
          workspace: {
            vaults: [
              {
                fsPath: '.',
                selfContained: true,
                name: vaultName,
              },
            ],
          },
        };
        fs.writeFileSync(configPath, yaml.dump(config), 'utf-8');
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new VaultError(
          VaultErrorCode.INVALID_CONFIG,
          `Failed to initialize vault: ${error.message}`,
          { vaultName },
          error
        ),
      };
    }
  }

  /**
   * 获取 Vault 路径
   */
  getVaultPath(vaultName: string): string {
    return path.join(this.architoolRoot, vaultName);
  }

  /**
   * 检查 Vault 是否存在
   */
  vaultExists(vaultName: string): boolean {
    const vaultPath = this.getVaultPath(vaultName);
    return fs.existsSync(vaultPath);
  }

  /**
   * 删除 Vault 目录
   */
  async deleteVault(vaultName: string, deleteFiles: boolean = false): Promise<Result<void, VaultError>> {
    try {
      const vaultPath = this.getVaultPath(vaultName);

      if (!fs.existsSync(vaultPath)) {
        return {
          success: false,
          error: new VaultError(
            VaultErrorCode.NOT_FOUND,
            `Vault not found: ${vaultName}`,
            { vaultName }
          ),
        };
      }

      if (deleteFiles) {
        fs.rmSync(vaultPath, { recursive: true, force: true });
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new VaultError(
          VaultErrorCode.INVALID_CONFIG,
          `Failed to delete vault: ${error.message}`,
          { vaultName },
          error
        ),
      };
    }
  }
}

