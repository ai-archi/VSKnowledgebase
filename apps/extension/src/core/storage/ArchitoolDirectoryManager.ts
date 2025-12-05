import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger/Logger';

/**
 * .architool 目录管理器
 * 负责创建和管理 .architool 目录结构
 */
export class ArchitoolDirectoryManager {
  private rootPath: string;
  private logger?: Logger;

  constructor(rootPath: string, logger?: Logger) {
    this.rootPath = rootPath;
    this.logger = logger;
  }

  /**
   * 初始化 .architool 目录结构
   */
  async initialize(): Promise<void> {
    // 创建根目录
    if (!fs.existsSync(this.rootPath)) {
      fs.mkdirSync(this.rootPath, { recursive: true });
    }

    // 创建 cache 目录（用于 SQLite）
    const cacheDir = path.join(this.rootPath, 'cache');
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  /**
   * 检查 .architool 目录是否有任何 vault（除了系统目录）
   * @returns 如果没有 vault 返回 true，否则返回 false
   */
  private hasNoVaults(): boolean {
    if (!fs.existsSync(this.rootPath)) {
      return true;
    }

    const entries = fs.readdirSync(this.rootPath, { withFileTypes: true });
    
    // 系统目录和文件，应该被忽略
    const systemDirs = ['cache', 'generated-prisma-client'];
    const systemFiles = ['meta.json', 'architool.yml'];
    
    // 检查是否有 vault 目录
    for (const entry of entries) {
      // 忽略系统目录和隐藏文件
      if (systemDirs.includes(entry.name) || entry.name.startsWith('.')) {
        continue;
      }
      
      // 忽略系统文件
      if (entry.isFile() && systemFiles.includes(entry.name)) {
        continue;
      }
      
      // 如果是目录，可能是 vault
      if (entry.isDirectory()) {
        // 检查是否是有效的 vault（包含 artifacts 目录）
        const artifactsPath = path.join(this.rootPath, entry.name, 'artifacts');
        if (fs.existsSync(artifactsPath)) {
          return false; // 找到了一个 vault
        }
      }
    }

    return true; // 没有找到任何 vault
  }

  /**
   * 如果 .architool 目录没有 vault，则复制 demo-vault 到 .architool 目录
   * @param demoVaultSourcePath demo-vault 源路径
   */
  async initializeDemoVaultIfEmpty(demoVaultSourcePath: string): Promise<void> {
    const demoVaultName = 'demo-vault';
    const targetVaultPath = path.join(this.rootPath, demoVaultName);

    // 如果目标已存在，则不复制
    if (fs.existsSync(targetVaultPath)) {
      this.logger?.info(`Demo vault already exists at: ${targetVaultPath}`);
      return;
    }

    // 如果已经有其他 vault，则不复制
    if (!this.hasNoVaults()) {
      this.logger?.info('Other vaults exist, skipping demo-vault initialization');
      return;
    }

    // 如果源路径不存在，记录警告但不抛出错误
    if (!fs.existsSync(demoVaultSourcePath)) {
      this.logger?.warn(`Demo vault source path does not exist: ${demoVaultSourcePath}`);
      return;
    }

    this.logger?.info(`Copying demo-vault from ${demoVaultSourcePath} to ${targetVaultPath}`);
    
    // 复制整个目录
    await this.copyDirectory(demoVaultSourcePath, targetVaultPath);
    
    this.logger?.info(`Demo vault copied successfully to: ${targetVaultPath}`);
  }

  /**
   * 递归复制目录
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    // 创建目标目录
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    // 读取源目录内容
    const entries = fs.readdirSync(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);

      if (entry.isDirectory()) {
        // 递归复制子目录
        await this.copyDirectory(sourcePath, targetPath);
      } else {
        // 复制文件
        fs.copyFileSync(sourcePath, targetPath);
      }
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
      'templates',
      'tasks',
      'viewpoints',
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


