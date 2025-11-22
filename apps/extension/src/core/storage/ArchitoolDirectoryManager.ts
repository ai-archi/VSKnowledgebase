import * as fs from 'fs';
import * as path from 'path';

/**
 * .architool 目录管理器
 * 负责创建和管理 .architool 目录结构
 */
export class ArchitoolDirectoryManager {
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
  }

  /**
   * 初始化 .architool 目录结构
   */
  async initialize(): Promise<void> {
    // 创建根目录
    if (!fs.existsSync(this.rootPath)) {
      fs.mkdirSync(this.rootPath, { recursive: true });
    }

    // 创建 cache 目录（用于 DuckDB）
    const cacheDir = path.join(this.rootPath, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * 初始化 Vault 目录结构
   */
  async initializeVault(vaultName: string): Promise<void> {
    const vaultDir = path.join(this.rootPath, vaultName);
    if (!fs.existsSync(vaultDir)) {
      fs.mkdirSync(vaultDir, { recursive: true });
    }

    // 创建子目录
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
      const dirPath = path.join(vaultDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }
  }

  /**
   * 获取 Vault 路径
   */
  getVaultPath(vaultName: string): string {
    return path.join(this.rootPath, vaultName);
  }

  /**
   * 获取 Artifact 目录路径
   */
  getArtifactsPath(vaultName: string): string {
    return path.join(this.rootPath, vaultName, 'artifacts');
  }

  /**
   * 获取元数据目录路径
   */
  getMetadataPath(vaultName: string): string {
    return path.join(this.rootPath, vaultName, 'metadata');
  }
}


