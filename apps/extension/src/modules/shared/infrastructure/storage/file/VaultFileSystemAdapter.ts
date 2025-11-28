import * as fs from 'fs';
import * as path from 'path';
import { Vault } from '../../../domain/entity/vault';

export class VaultFileSystemAdapter {
  private architoolRoot: string;

  constructor(architoolRoot: string) {
    this.architoolRoot = architoolRoot;
  }

  getVaultsRoot(): string {
    return this.architoolRoot;
  }

  getVaultPath(vaultName: string): string {
    return path.join(this.architoolRoot, vaultName);
  }

  async createVaultDirectory(vault: Vault): Promise<void> {
    const vaultPath = this.getVaultPath(vault.name);
    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true });
    }

    // 创建完整的 Vault 目录结构（包括子目录）
    const subDirs = [
      'artifacts',
      'metadata',
      'links',
      'templates',
      'tasks',
      'viewpoints',
      'changes',
    ];

    for (const dir of subDirs) {
      const dirPath = path.join(vaultPath, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  async vaultExists(vaultName: string): Promise<boolean> {
    const vaultPath = this.getVaultPath(vaultName);
    return fs.existsSync(vaultPath);
  }
}
