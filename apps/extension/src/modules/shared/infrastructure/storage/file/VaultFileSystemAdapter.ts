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

  getVaultPath(vaultId: string): string {
    return path.join(this.architoolRoot, vaultId);
  }

  async createVaultDirectory(vault: Vault): Promise<void> {
    const vaultPath = this.getVaultPath(vault.id);
    if (!fs.existsSync(vaultPath)) {
      fs.mkdirSync(vaultPath, { recursive: true });
    }

    // 新结构：不再创建固定目录，按需创建
    // 只有在需要时才创建 .metadata 目录和 archi-* 目录
    // 这里只确保 vault 根目录存在即可
  }

  async vaultExists(vaultId: string): Promise<boolean> {
    const vaultPath = this.getVaultPath(vaultId);
    return fs.existsSync(vaultPath);
  }
}
