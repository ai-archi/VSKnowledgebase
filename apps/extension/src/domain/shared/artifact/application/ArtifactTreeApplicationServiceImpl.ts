import { injectable, inject } from 'inversify';
import { TYPES } from '../../../../infrastructure/di/types';
import {
  ArtifactTreeApplicationService,
  FileTreeNode,
  ReadFileOptions,
  ListDirectoryOptions,
} from './ArtifactTreeApplicationService';
import { Result, ArtifactError, ArtifactErrorCode } from '../errors';
import { VaultReference } from '../../vault/VaultReference';
import { VaultFileSystemAdapter } from '../../../../infrastructure/storage/file/VaultFileSystemAdapter';
import { Logger } from '../../../../core/logger/Logger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Artifact 文件树应用服务实现
 */
@injectable()
export class ArtifactTreeApplicationServiceImpl implements ArtifactTreeApplicationService {
  constructor(
    @inject(TYPES.VaultFileSystemAdapter)
    private vaultAdapter: VaultFileSystemAdapter,
    @inject(TYPES.Logger)
    private logger: Logger
  ) {}

  async readFile(
    vault: VaultReference,
    filePath: string,
    options?: ReadFileOptions
  ): Promise<Result<string, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, filePath);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `File not found: ${filePath}`,
            { vaultId: vault.id, vaultName: vault.name, filePath }
          ),
        };
      }

      const stats = fs.statSync(fullPath);
      if (!stats.isFile()) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Path is not a file: ${filePath}`,
            { vaultId: vault.id, vaultName: vault.name, filePath }
          ),
        };
      }

      const encoding = options?.encoding || 'utf-8';
      const content = fs.readFileSync(fullPath, encoding);
      return { success: true, value: content };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to read file: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, filePath },
          error
        ),
      };
    }
  }

  async writeFile(
    vault: VaultReference,
    filePath: string,
    content: string
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, filePath);
      const dir = path.dirname(fullPath);

      // 确保目录存在
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // 原子写入：先写入临时文件，然后重命名
      const tempPath = `${fullPath}.tmp`;
      fs.writeFileSync(tempPath, content, 'utf-8');
      fs.renameSync(tempPath, fullPath);

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to write file: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, filePath },
          error
        ),
      };
    }
  }

  async exists(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      return { success: true, value: fs.existsSync(fullPath) };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check existence: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  async isDirectory(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      if (!fs.existsSync(fullPath)) {
        return { success: true, value: false };
      }
      const stats = fs.statSync(fullPath);
      return { success: true, value: stats.isDirectory() };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check if directory: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  async isFile(vault: VaultReference, path: string): Promise<Result<boolean, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      if (!fs.existsSync(fullPath)) {
        return { success: true, value: false };
      }
      const stats = fs.statSync(fullPath);
      return { success: true, value: stats.isFile() };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to check if file: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  async listDirectory(
    vault: VaultReference,
    dirPath: string,
    options?: ListDirectoryOptions
  ): Promise<Result<FileTreeNode[], ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, dirPath);
      
      if (!fs.existsSync(fullPath)) {
        return { success: true, value: [] };
      }

      const stats = fs.statSync(fullPath);
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.OPERATION_FAILED,
            `Path is not a directory: ${dirPath}`,
            { vaultId: vault.id, vaultName: vault.name, dirPath }
          ),
        };
      }

      const nodes: FileTreeNode[] = [];
      const includeHidden = options?.includeHidden ?? false;
      const extensions = options?.extensions;
      const recursive = options?.recursive ?? false;

      const scanDirectory = (currentDir: string, relativeBase: string = ''): void => {
        try {
          const entries = fs.readdirSync(currentDir, { withFileTypes: true });

          for (const entry of entries) {
            // 跳过隐藏文件（如果不包含）
            if (!includeHidden && entry.name.startsWith('.')) {
              continue;
            }

            const entryFullPath = path.join(currentDir, entry.name);
            const entryRelativePath = relativeBase
              ? path.join(relativeBase, entry.name)
              : entry.name;

            if (entry.isDirectory()) {
              const node: FileTreeNode = {
                name: entry.name,
                path: entryRelativePath,
                fullPath: entryFullPath,
                isDirectory: true,
                isFile: false,
              };
              nodes.push(node);

              // 如果递归，继续扫描子目录
              if (recursive) {
                scanDirectory(entryFullPath, entryRelativePath);
              }
            } else if (entry.isFile()) {
              const ext = path.extname(entry.name).slice(1); // 去掉点号
              
              // 如果指定了扩展名过滤，检查扩展名
              if (extensions && extensions.length > 0) {
                if (!ext || !extensions.includes(ext.toLowerCase())) {
                  continue;
                }
              }

              const node: FileTreeNode = {
                name: entry.name,
                path: entryRelativePath,
                fullPath: entryFullPath,
                isDirectory: false,
                isFile: true,
                extension: ext || undefined,
              };
              nodes.push(node);
            }
          }
        } catch (error: any) {
          this.logger.warn(`Error scanning directory ${currentDir}:`, error);
        }
      };

      scanDirectory(fullPath, dirPath || '');

      // 排序：目录在前，文件在后，都按名称排序
      nodes.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return { success: true, value: nodes };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to list directory: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, dirPath },
          error
        ),
      };
    }
  }

  async createDirectory(
    vault: VaultReference,
    dirPath: string
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, dirPath);
      
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to create directory: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, dirPath },
          error
        ),
      };
    }
  }

  async delete(
    vault: VaultReference,
    path: string,
    recursive?: boolean
  ): Promise<Result<void, ArtifactError>> {
    try {
      const fullPath = this.getFullPath(vault, path);
      
      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          error: new ArtifactError(
            ArtifactErrorCode.NOT_FOUND,
            `Path not found: ${path}`,
            { vaultId: vault.id, vaultName: vault.name, path }
          ),
        };
      }

      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        if (recursive) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          // 检查目录是否为空
          const entries = fs.readdirSync(fullPath);
          if (entries.length > 0) {
            return {
              success: false,
              error: new ArtifactError(
                ArtifactErrorCode.OPERATION_FAILED,
                `Directory is not empty: ${path}`,
                { vaultId: vault.id, vaultName: vault.name, path }
              ),
            };
          }
          fs.rmdirSync(fullPath);
        }
      } else {
        fs.unlinkSync(fullPath);
      }

      return { success: true, value: undefined };
    } catch (error: any) {
      return {
        success: false,
        error: new ArtifactError(
          ArtifactErrorCode.OPERATION_FAILED,
          `Failed to delete: ${error.message}`,
          { vaultId: vault.id, vaultName: vault.name, path },
          error
        ),
      };
    }
  }

  getFullPath(vault: VaultReference, filePath: string): string {
    const vaultPath = this.vaultAdapter.getVaultPath(vault.name);
    if (!filePath) {
      return vaultPath;
    }
    return path.isAbsolute(filePath) ? filePath : path.join(vaultPath, filePath);
  }
}

