import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../logger/Logger';
import { ARCHITOOL_PATHS } from '../constants/Paths';

/**
 * archidocs 目录管理器
 * 负责创建和管理工作区根目录下的 archidocs 目录结构
 */
export class ArchitoolDirectoryManager {
  private rootPath: string;
  private logger?: Logger;

  constructor(rootPath: string, logger?: Logger) {
    this.rootPath = rootPath;
    this.logger = logger;
  }

  /**
   * 初始化 archidocs 目录结构
   */
  async initialize(): Promise<void> {
    // 创建根目录
    if (!fs.existsSync(this.rootPath)) {
      fs.mkdirSync(this.rootPath, { recursive: true });
    }

    // 创建 mcp-server 目录（用于 IPC 端点、注册表和 MCP Server 脚本）
    const mcpServerDir = path.join(os.homedir(), ARCHITOOL_PATHS.USER_HOME_DIR, ARCHITOOL_PATHS.MCP_SERVER_DIR);
    if (!fs.existsSync(mcpServerDir)) {
      fs.mkdirSync(mcpServerDir, { recursive: true });
    }
  }

  /**
   * 检查 archidocs 目录是否有任何 vault（除了系统目录）
   * @returns 如果没有 vault 返回 true，否则返回 false
   */
  private hasNoVaults(): boolean {
    if (!fs.existsSync(this.rootPath)) {
      return true;
    }

    const entries = fs.readdirSync(this.rootPath, { withFileTypes: true });
    
    // 系统目录和文件，应该被忽略
    const systemDirs = ['generated-prisma-client'];
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
   * 如果 archidocs 目录没有 vault，则复制 demo-vaults 下的所有 vault 到 archidocs 目录
   * @param demoVaultsSourcePath demo-vaults 源路径
   */
  async initializeDemoVaultsIfEmpty(demoVaultsSourcePath: string): Promise<void> {
    // 如果已经有其他 vault，则不复制
    if (!this.hasNoVaults()) {
      this.logger?.info('Other vaults exist, skipping demo-vaults initialization');
      return;
    }

    // 如果源路径不存在，记录警告但不抛出错误
    if (!fs.existsSync(demoVaultsSourcePath)) {
      this.logger?.warn(`Demo vaults source path does not exist: ${demoVaultsSourcePath}`);
      return;
    }

    // 读取 demo-vaults 目录下的所有子目录
    const entries = fs.readdirSync(demoVaultsSourcePath, { withFileTypes: true });
    const vaultDirs = entries.filter(entry => entry.isDirectory() && entry.name.startsWith('demo-vault-'));

    if (vaultDirs.length === 0) {
      this.logger?.warn(`No demo vaults found in ${demoVaultsSourcePath}`);
      return;
    }

    this.logger?.info(`Found ${vaultDirs.length} demo vaults to copy`);

    // 复制每个 vault
    for (const vaultDir of vaultDirs) {
      const sourceVaultPath = path.join(demoVaultsSourcePath, vaultDir.name);
      const targetVaultPath = path.join(this.rootPath, vaultDir.name);

      // 如果目标已存在，则跳过
      if (fs.existsSync(targetVaultPath)) {
        this.logger?.info(`Demo vault ${vaultDir.name} already exists at: ${targetVaultPath}`);
        continue;
      }

      this.logger?.info(`Copying demo vault ${vaultDir.name} from ${sourceVaultPath} to ${targetVaultPath}`);
    
      try {
    // 复制整个目录
        await this.copyDirectory(sourceVaultPath, targetVaultPath);
        this.logger?.info(`Demo vault ${vaultDir.name} copied successfully to: ${targetVaultPath}`);
      } catch (error: any) {
        this.logger?.error(`Failed to copy demo vault ${vaultDir.name}:`, error);
        // 继续复制其他 vault，不中断
      }
    }
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

  /**
   * 复制 MCP Server 到固定位置
   * @param mcpServerSourcePath MCP Server 源路径（扩展安装目录中的路径）
   */
  async copyMCPServer(mcpServerSourcePath: string): Promise<void> {
    const mcpServerTargetDir = path.join(os.homedir(), ARCHITOOL_PATHS.USER_HOME_DIR, ARCHITOOL_PATHS.MCP_SERVER_DIR);
    const mcpServerTargetPath = path.join(mcpServerTargetDir, ARCHITOOL_PATHS.MCP_SERVER_SCRIPT);

    // 如果目标文件已存在且是最新的，跳过复制
    if (fs.existsSync(mcpServerTargetPath) && fs.existsSync(mcpServerSourcePath)) {
      const sourceStat = fs.statSync(mcpServerSourcePath);
      const targetStat = fs.statSync(mcpServerTargetPath);
      
      // 如果目标文件更新或相同，跳过复制
      if (targetStat.mtime >= sourceStat.mtime) {
        this.logger?.info('MCP Server is up to date, skipping copy');
        return;
      }
    }

    // 确保目标目录存在
    if (!fs.existsSync(mcpServerTargetDir)) {
      fs.mkdirSync(mcpServerTargetDir, { recursive: true });
    }

    // 复制文件
    if (fs.existsSync(mcpServerSourcePath)) {
      fs.copyFileSync(mcpServerSourcePath, mcpServerTargetPath);
      
      // 确保文件可执行（Unix/Linux/macOS）
      if (process.platform !== 'win32') {
        try {
          fs.chmodSync(mcpServerTargetPath, 0o755);
        } catch (error: any) {
          this.logger?.warn('Failed to set executable permission', error);
        }
      }
      
      this.logger?.info(`MCP Server copied to ${mcpServerTargetPath}`);
    } else {
      this.logger?.warn(`MCP Server source not found: ${mcpServerSourcePath}`);
    }
  }

  /**
   * 获取 MCP Server 目标路径（固定位置）
   */
  getMCPServerPath(): string {
    return path.join(os.homedir(), ARCHITOOL_PATHS.USER_HOME_DIR, ARCHITOOL_PATHS.MCP_SERVER_DIR, ARCHITOOL_PATHS.MCP_SERVER_SCRIPT);
  }
}
